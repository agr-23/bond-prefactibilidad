import {env} from 'cloudflare:workers';
import type {Project,Layer} from './types';
export const runtime=()=>env as typeof env & { GROQ_API_KEY?: string; GROQ_MODEL?: string; AI_PROVIDER?: string };
export function identity(request:Request){
 const url=new URL(request.url);
 if(process.env.NODE_ENV==='development'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))return 'local-development';
 const id=request.headers.get('oai-authenticated-user-id');
 if(!id)throw new HttpError(401,'Inicia sesion para acceder a tus proyectos.');
 return id;
}
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export async function body(request:Request){
 if(Number(request.headers.get('content-length')??0)>5_000_000)throw new HttpError(413,'Solicitud demasiado grande.');
 const text=await request.text();if(text.length>5_000_000)throw new HttpError(413,'Solicitud demasiado grande.');
 try{return JSON.parse(text);}catch{throw new HttpError(400,'JSON invalido.');}
}
export function checkOrigin(request:Request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)throw new HttpError(403,'Origen de solicitud no permitido.');
}
type RecordRow={id:string;owner:string;kind:string;object_key:string;revision:number;created_at:string;updated_at:string};
export async function listRecords<T>(owner:string,kind:string):Promise<T[]>{
 const {DB,BUCKET}=runtime();if(!DB||!BUCKET)throw new HttpError(503,'El almacenamiento no esta disponible.');
 const r=await DB.prepare('SELECT * FROM studio_records WHERE owner=? AND kind=? ORDER BY updated_at DESC LIMIT 200').bind(owner,kind).all();
 const values:T[]=[];
 for(const row of r.results as RecordRow[]){const o=await BUCKET.get(row.object_key);if(o)values.push({...await o.json<Record<string,unknown>>(),revision:row.revision} as T);}
 return values;
}
export async function getRecord<T>(owner:string,id:string,kind:string):Promise<T>{
 const {DB,BUCKET}=runtime();
 const row=await DB.prepare('SELECT * FROM studio_records WHERE owner=? AND id=? AND kind=?').bind(owner,id,kind).first() as RecordRow|null;
 if(!row)throw new HttpError(404,'Registro no encontrado.');
 const object=await BUCKET.get(row.object_key);if(!object)throw new HttpError(503,'No se pudo recuperar el archivo guardado.');
 return {...await object.json<Record<string,unknown>>(),revision:row.revision} as T;
}
export async function saveRecord(owner:string,kind:string,value:Project|Layer,expectedRevision?:number){
 const {DB,BUCKET}=runtime();const now=new Date().toISOString(),key=`${owner}/${kind}/${value.id}/${crypto.randomUUID()}.json`;
 const revision=expectedRevision===undefined?1:expectedRevision+1;
 const data={...value,revision,updatedAt:now};
 const serialized=JSON.stringify(data),bytes=new TextEncoder().encode(serialized).length;
 if(bytes>4_000_000)throw new HttpError(413,'El resultado normalizado supera 4 MB. Divide la capa o el area de estudio.');
 await BUCKET.put(key,serialized,{httpMetadata:{contentType:'application/json'}});
 try{
  if(expectedRevision===undefined){const r=await DB.prepare('INSERT INTO studio_records (id,owner,kind,name,object_key,byte_size,revision,created_at,updated_at) SELECT ?,?,?,?,?,?,1,?,? WHERE (SELECT COALESCE(SUM(byte_size),0) FROM studio_records WHERE owner=?) + ? <= 16000000 AND (SELECT COUNT(*) FROM studio_records WHERE owner=?) < 200').bind(value.id,owner,kind,value.name,key,bytes,now,now,owner,bytes,owner).run();if(r.meta.changes!==1)throw new HttpError(413,'Limite del espacio: 16 MB de datos normalizados o 200 registros. Exporta y retira capas sin uso.');}
  else {const r=await DB.prepare('UPDATE studio_records SET name=?,object_key=?,byte_size=?,revision=revision+1,updated_at=? WHERE id=? AND owner=? AND kind=? AND revision=? AND (SELECT COALESCE(SUM(byte_size),0) FROM studio_records WHERE owner=? AND id<>?) + ? <= 16000000').bind(value.name,key,bytes,now,value.id,owner,kind,expectedRevision,owner,value.id,bytes).run();if(r.meta.changes!==1)throw new HttpError(409,'El proyecto cambio en otra sesion o el espacio supera 16 MB. Recarga y revisa las capas antes de guardar.');}
 }catch(e){await BUCKET.delete(key);throw e;}
 return data;
}
export async function deleteRecord(owner:string,id:string,kind:string){
 const {DB}=runtime();await DB.prepare('DELETE FROM studio_records WHERE id=? AND owner=? AND kind=?').bind(id,owner,kind).run();
 // Immutable objects remain available for recovery; removing the index hides the record.
}
