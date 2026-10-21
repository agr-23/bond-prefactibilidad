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
export const MINAMBIENTE='https://geo.minambiente.gov.co/server/rest/services/OTL';
// Codigos de uab_categoria de OTL_Area_Protegida (dominio del servicio) a etiqueta legible.
const AP_CATEGORIA:Record<number,string>={3:'Via Parque (PNN)',4:'Parque Natural Regional',5:'Area Natural Unica (PNN)',6:'Distrito de Manejo Integrado',7:'Reserva Natural de la Sociedad Civil',8:'Reserva Forestal Protectora',9:'Santuario de Flora (PNN)',10:'Reserva Natural (PNN)',11:'Distrito de Conservacion de Suelos',12:'Area de Recreacion',13:'Santuario de Flora y Fauna (PNN)',14:'Parque Nacional (PNN)',15:'Santuario de Fauna (PNN)'};
const ENV_LAYERS=[
 {key:'paramo',label:'Paramo',service:'OTL_Paramo',fields:'uab_nombre_paramo',name:(p:any)=>p.uab_nombre_paramo?`Paramo ${p.uab_nombre_paramo}`:'Paramo'},
 {key:'protegida',label:'Area protegida (RUNAP)',service:'OTL_Area_Protegida',fields:'uab_nombre_area_protegida,uab_categoria',name:(p:any)=>[p.uab_nombre_area_protegida,AP_CATEGORIA[p.uab_categoria]].filter(Boolean).join(' - ')||'Area protegida'},
 {key:'ramsar',label:'Humedal Ramsar',service:'OTL_Humedal_RAMSAR',fields:'etiqueta',name:(p:any)=>p.etiqueta?`Humedal ${p.etiqueta}`:'Humedal Ramsar'},
 {key:'ley2',label:'Reserva Forestal de Ley 2.a',service:'OTL_Reserva_Forestal_Ley_2da',fields:'uab_tipo',name:()=>'Reserva Forestal de Ley 2.a de 1959'},
] as const;
async function envLayer(aoi:Area,box:number[],cfg:(typeof ENV_LAYERS)[number],point:(f:Area)=>any){
 const {booleanIntersects,pointToPolygonDistance}=await import('@turf/turf');
 const params=new URLSearchParams({geometry:JSON.stringify({xmin:box[0],ymin:box[1],xmax:box[2],ymax:box[3],spatialReference:{wkid:4326}}),geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',where:'1=1',outFields:cfg.fields,returnGeometry:'true',f:'geojson'});
 const r=await fetch(`${MINAMBIENTE}/${cfg.service}/MapServer/0/query?${params}`,{signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error(`MinAmbiente (${cfg.label}) no disponible (${r.status}).`);
 const data=await r.json() as any;
 if(data.error)throw new Error(`MinAmbiente (${cfg.label}) no resolvio la consulta.`);
 if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error(`MinAmbiente (${cfg.label}) devolvio una respuesta inesperada.`);
 const pt=point(aoi);let intersects=false,nearestName:string|null=null,nearestKm:number|null=null;
 for(const f of data.features){
  if(!f.geometry)continue;
  const touch=booleanIntersects(aoi,f);
  const km=touch?0:pointToPolygonDistance(pt,f,{units:'kilometers'});
  if(touch)intersects=true;
  if(nearestKm===null||km<nearestKm){nearestKm=km;nearestName=cfg.name(f.properties??{});}
 }
 return {key:cfg.key,label:cfg.label,status:'ok' as const,intersects,nearestName,nearestKm};
}
// Restricciones ambientales cercanas al area (MinAmbiente). Degrada por capa: si una fuente falla, esa capa queda en error y las demas siguen.
export async function environmentalConstraints(aoi:Area):Promise<import('./types').Environment>{
 const {bbox,pointOnFeature}=await import('@turf/turf');
 const b=bbox(aoi),deg=0.2,box=[b[0]-deg,b[1]-deg,b[2]+deg,b[3]+deg];
 const point=(f:Area)=>pointOnFeature(f);
 const results=await Promise.allSettled(ENV_LAYERS.map(cfg=>envLayer(aoi,box,cfg,point)));
 const layers=results.map((res,i)=>res.status==='fulfilled'?res.value:{key:ENV_LAYERS[i].key,label:ENV_LAYERS[i].label,status:'error' as const,intersects:false,nearestName:null,nearestKm:null,note:res.reason instanceof Error?res.reason.message:'Consulta fallida.'});
 return {layers,bufferKm:Math.round(deg*111),source:'MinAmbiente (OTL): paramos, areas protegidas RUNAP, humedales Ramsar y reservas de Ley 2.a',retrievedAt:new Date().toISOString().slice(0,10)};
}
export const OVERPASS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
export const OSRM='https://router.project-osrm.org';
const OSM_UA='BOND-prefactibilidad/1.0 (prefactibilidad energetica; +https://github.com/agr-23/bond-prefactibilidad)';
const HIGHWAY_LABEL:Record<string,string>={motorway:'Autopista',trunk:'Vía principal (troncal)',primary:'Vía primaria',secondary:'Vía secundaria',tertiary:'Vía terciaria',unclassified:'Vía rural',residential:'Vía urbana',track:'Trocha o camino'};
const MAJOR=new Set(['motorway','trunk','primary','secondary']);
function surfaceLabel(s:string|undefined):string|null{if(!s)return null;if(/(^|;)(paved|asphalt|concrete|chipseal|paving_stones)/.test(s))return 'Pavimentada';if(/(unpaved|gravel|dirt|ground|earth|sand|fine_gravel|compacted)/.test(s))return 'Sin pavimentar';return s;}
// Acceso vial desde un punto representativo del area, con OpenStreetMap (Overpass) y OSRM.
// Servidores publicos con limite de uso; para produccion conviene Overpass/OSRM propios o un proveedor con clave.
export async function roadAccess(aoi:Area,radiusM=8000):Promise<import('./types').RoadAccess|null>{
 const {pointOnFeature,lineString,pointToLineDistance,distance,point}=await import('@turf/turf');
 const c=pointOnFeature(aoi).geometry.coordinates,lon=c[0],lat=c[1];
 const query=`[out:json][timeout:25];way(around:${radiusM},${lat},${lon})[highway~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|track)$"];out tags geom 200;`;
 let data:any=null,lastError='';
 for(const endpoint of OVERPASS){
  try{
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':OSM_UA,'Accept':'application/json'},body:'data='+encodeURIComponent(query),signal:AbortSignal.timeout(15000)});
   if(!r.ok){lastError=`${r.status}`;continue;}
   data=JSON.parse(await r.text());break;
  }catch(e){lastError=e instanceof Error?e.message:'error';}
 }
 if(!data)throw new Error(`OpenStreetMap (Overpass) no disponible (${lastError}).`);
 const ways=(data.elements??[]).filter((w:any)=>Array.isArray(w.geometry)&&w.geometry.length>1);
 if(!ways.length)return null;
 const here=point([lon,lat]);
 const measured=ways.map((w:any)=>{const line=lineString(w.geometry.map((p:any)=>[p.lon,p.lat]));const km=pointToLineDistance(here,line,{units:'kilometers'});const type=w.tags?.highway as string;return {type,typeLabel:HIGHWAY_LABEL[type]??type,name:w.tags?.name||w.tags?.ref||'Sin nombre',surface:surfaceLabel(w.tags?.surface),km,geometry:w.geometry as {lat:number;lon:number}[]};}).sort((a:any,b:any)=>a.km-b.km);
 const strip=(m:any)=>({type:m.type,typeLabel:m.typeLabel,name:m.name,surface:m.surface,km:m.km});
 const nearest=strip(measured[0]);
 const majorHit=measured.find((m:any)=>MAJOR.has(m.type))??null;
 const nearestMajor=majorHit?strip(majorHit):null;
 let route:{km:number;min:number}|null=null;
 // Ruta en carro hasta el vertice mas cercano de la via principal (o la via mas cercana si no hay principal).
 const target=majorHit??measured[0];
 const dest=target.geometry.reduce((best:any,p:any)=>{const d=distance(here,point([p.lon,p.lat]),{units:'kilometers'});return !best||d<best.d?{d,p}:best;},null as any).p;
 try{
  const rr=await fetch(`${OSRM}/route/v1/driving/${lon},${lat};${dest.lon},${dest.lat}?overview=false&alternatives=false`,{headers:{'User-Agent':OSM_UA},signal:AbortSignal.timeout(15000)});
  if(rr.ok){const rd=await rr.json() as any;const rt=rd.routes?.[0];if(rd.code==='Ok'&&rt)route={km:rt.distance/1000,min:rt.duration/60};}
 }catch{/* la ruta es opcional; se conservan las distancias de Overpass */}
 return {nearest,nearestMajor,route,source:'OpenStreetMap (Overpass) y ruta OSRM',retrievedAt:new Date().toISOString().slice(0,10)};
}
