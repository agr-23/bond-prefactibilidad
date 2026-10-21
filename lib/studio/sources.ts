import {bbox, pointOnFeature, point, pointToPolygonDistance} from '@turf/turf';
import type {FeatureCollection} from 'geojson';
import type {Area,Connection,Resource,Transformer} from './types';
export const DANE='https://geoportal.dane.gov.co/mparcgis/rest/services/MGN2024/Serv_CapasMGN_2024/FeatureServer/317';
export const NASA='https://power.larc.nasa.gov/api/temporal/climatology/point';
export const ETER='https://maps.epm.com.co/arcgis/rest/services/CREG030/Semaforo_Transformador/MapServer/0';
const SEMAFORO:Record<string,string>={V:'Verde',A:'Amarillo',N:'Naranja',R:'Rojo'};
export async function sourceJson(url:string){
 const name=new URL(url).hostname.includes('dane.gov.co')?'DANE':'NASA POWER';
 const r=await fetch(url,{signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error(`${name}: fuente temporalmente no disponible (${r.status}).`);
 const length=Number(r.headers.get('content-length')??0);if(length>35_000_000)throw new Error('La fuente supera el limite de consulta. Reduce el area.');
 const data=await r.json() as any;
 if(data.error)throw new Error(`${name}: la fuente no pudo resolver esta consulta.`);
 return data;
}
export function validBoundaries(data:any):data is FeatureCollection {
 return data?.type==='FeatureCollection' && Array.isArray(data.features) && !data.exceededTransferLimit && data.features.every((f:any)=>f.geometry && ['Polygon','MultiPolygon'].includes(f.geometry.type) && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length && /^\d{5}$/.test(f.properties?.mpio_cdpmp));
}
async function liveBoundaries(aoi:Area):Promise<FeatureCollection>{
 const b=bbox(aoi);
 const params=new URLSearchParams({geometry:JSON.stringify({xmin:b[0],ymin:b[1],xmax:b[2],ymax:b[3],spatialReference:{wkid:4326}}),geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects',where:'1=1',f:'json',returnCountOnly:'true'});
 const count=await sourceJson(`${DANE}/query?${params}`);
 if(!Number.isInteger(count.count)||count.count<0)throw new Error('DANE devolvio un conteo invalido.');
 if(count.count>80)throw new Error('El area incluye mas de 80 municipios candidatos. Divide el estudio en subareas.');
 params.delete('returnCountOnly');params.set('f','geojson');params.set('outFields','mpio_cdpmp,mpio_cnmbr,dpto_cnmbr');params.set('returnGeometry','true');params.set('outSR','4326');
 const data=await sourceJson(`${DANE}/query?${params}`);
 if(!validBoundaries(data)||data.features.length!==count.count)throw new Error('DANE devolvio una respuesta incompleta o sin poligonos.');
 return data;
}
export async function municipalBoundaries(aoi:Area,assetJson:(path:string)=>Promise<any>){
 try{return {boundaries:await liveBoundaries(aoi),mode:'live' as const,detail:'Geometria vectorial DANE MGN 2024 consultada sin simplificacion.',warning:null};}
 catch(error){
  const index=await assetJson('/data/municipal/index.json'),box=bbox(aoi);
  const touches=(b:number[])=>b[0]<=box[2]&&b[2]>=box[0]&&b[1]<=box[3]&&b[3]>=box[1];
  const features:FeatureCollection['features']=[];
  for(const dept of index.departments.filter((d:any)=>touches(d.bbox))){
   const data=await assetJson(`/data/municipal/${dept.code}.geojson`);
   if(!validBoundaries(data))throw new Error('El respaldo municipal no contiene poligonos validos.');
   features.push(...data.features.filter(f=>touches(f.bbox??bbox(f))));
  }
  if(features.length>80)throw new Error('El area incluye mas de 80 municipios candidatos. Divide el estudio en subareas.');
  const detail=`Respaldo DANE MGN 2024 descargado ${index.retrievedAt}. Generalizacion ${index.toleranceDegrees} grados (aprox. 6 m); superficies y fronteras aproximadas.`;
  return {boundaries:{type:'FeatureCollection',features} as FeatureCollection,mode:'backup' as const,detail,warning:`${error instanceof Error?error.message:'DANE no disponible.'} Se uso el respaldo municipal. Los cruces cercanos a fronteras requieren confirmar con cartografia detallada. ${detail}`};
 }
}
export async function resourcesAt(aoi:Area):Promise<Resource>{
 const c=pointOnFeature(aoi).geometry.coordinates;
 const params=new URLSearchParams({parameters:'ALLSKY_SFC_SW_DWN,WS50M,T2M',community:'RE',longitude:c[0].toFixed(5),latitude:c[1].toFixed(5),format:'JSON'});
 const url=`${NASA}?${params}`,d=await sourceJson(url),p=d.properties?.parameter;
 if(!p)throw new Error('NASA POWER no devolvio parametros para este punto.');
 const valid=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v!==d.header?.fill_value&&v>-900?v:null;
 const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
 return {solar:valid(p.ALLSKY_SFC_SW_DWN?.ANN),wind:valid(p.WS50M?.ANN),temperature:valid(p.T2M?.ANN),months:months.map(month=>({month,solar:valid(p.ALLSKY_SFC_SW_DWN?.[month]),wind:valid(p.WS50M?.[month])})),coordinates:c,url,period:d.header?.range??`${d.header?.start??'inicio no informado'} - ${d.header?.end??'fin no informado'}`,retrievedAt:new Date().toISOString(),units:Object.fromEntries(Object.entries(d.parameters??{}).map(([k,v]:any)=>[k,v.units]))};
}
// Transformadores de distribucion de EPM mas cercanos al area, desde el asset publicado en
// public/data/transformadores (ver scripts/generar-transformadores-epm.mjs). null si el area esta fuera de la red de EPM.
export async function nearestTransformers(aoi:Area,assetJson:(path:string)=>Promise<any>,count=5):Promise<Connection|null>{
 const index=await assetJson('/data/transformadores/index.json');
 if(!Array.isArray(index?.cells)||!Array.isArray(index?.fields))throw new Error('El indice de transformadores EPM no es valido.');
 const b=bbox(aoi),pad=0.25,box=[b[0]-pad,b[1]-pad,b[2]+pad,b[3]+pad];
 const cells=index.cells.filter((c:any)=>c.bbox[0]<=box[2]&&c.bbox[2]>=box[0]&&c.bbox[1]<=box[3]&&c.bbox[3]>=box[1]);
 if(!cells.length)return null;
 const col=(name:string)=>{const i=index.fields.indexOf(name);if(i<0)throw new Error(`El asset de transformadores no trae el campo ${name}.`);return i;};
 const [LON,LAT,POW,ENE,KVA,MUN,SUB,LVL]=['lon','lat','color_potencia','color_energia','capacidad_kva','municipio','subestacion','nivel_creg'].map(col);
 // Cota inferior de la distancia al area (distancia al recuadro del area), para medir con exactitud solo los candidatos que pueden ganar.
 const lower=(lon:number,lat:number)=>{const dx=Math.max(b[0]-lon,0,lon-b[2]),dy=Math.max(b[1]-lat,0,lat-b[3]);return 0.99*Math.hypot(dx*111.32*Math.cos(lat*Math.PI/180),dy*110.57);};
 const candidates:{r:any[];lb:number}[]=[];
 for(const c of cells){const shard=await assetJson(`/data/transformadores/${c.key}.json`);for(const r of shard?.records??[]){const lon=r[LON],lat=r[LAT];if(!(lon>=box[0]&&lon<=box[2]&&lat>=box[1]&&lat<=box[3]))continue;candidates.push({r,lb:lower(lon,lat)});}}
 candidates.sort((x,y)=>x.lb-y.lb);
 const best:Transformer[]=[];let green:Transformer|null=null;
 for(const {r,lb} of candidates){
  const kth=best.length<count?Infinity:best[count-1].km;
  if(lb>kth&&green&&lb>green.km)break;
  const km=Math.max(0,pointToPolygonDistance(point([r[LON],r[LAT]]),aoi,{units:'kilometers'}));
  const level=Number(r[LVL]);
  const t:Transformer={lon:r[LON],lat:r[LAT],km,power:SEMAFORO[r[POW]]??'Sin dato',energy:SEMAFORO[r[ENE]]??'Sin dato',kva:typeof r[KVA]==='number'?r[KVA]:null,municipality:String(r[MUN]??''),substation:String(r[SUB]??''),level:r[LVL]==null||r[LVL]===''||!Number.isFinite(level)?null:level};
  if(km<kth){best.push(t);best.sort((x,y)=>x.km-y.km);best.length=Math.min(best.length,count);}
  if(t.power==='Verde'&&(!green||km<green.km))green=t;
 }
 return {transformers:best,nearestWithCapacity:green,source:index.source,retrievedAt:index.retrievedAt};
}
