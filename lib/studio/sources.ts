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
export const UPRA='https://www.datos.gov.co/resource/rttb-pk7n.json';
// Codigos de cod_precio que no son un precio (cuerpo de agua, no suelo, zona urbana, sin valor).
const NO_PRICE=new Set(['CA','NS','ZU','SI']);
function parseRange(label:string):[number,number|null]|null{
 const nums=(label.match(/\d+(?:[.,]\d+)?/g)??[]).map(n=>Number(n.replace(',','.')));
 if(/menor/i.test(label))return [0,nums[0]??null];
 if(nums.length>=2)return [nums[0],nums[1]];
 if(nums.length===1)return [nums[0],null];
 return null;
}
// Costo de la tierra rural (UPRA) para los municipios del area. Informativo; solo 13 departamentos tienen mapa. null si ninguno tiene dato.
export async function landPrice(municipalities:{code:string;name:string;share:number}[]):Promise<import('./types').LandPrice|null>{
 const codes=[...new Set(municipalities.map(m=>m.code).filter(c=>/^\d{5}$/.test(c)))];
 if(!codes.length)return null;
 const inList=codes.map(c=>`'${c}'`).join(',');
 const params=new URLSearchParams({'$select':'cod_dane_m,municipio,rango_prec,cod_precio,sum(area_ha) as ha','$where':`cod_dane_m in(${inList})`,'$group':'cod_dane_m,municipio,rango_prec,cod_precio','$limit':'2000'});
 const r=await fetch(`${UPRA}?${params}`,{headers:{'User-Agent':'BOND-prefactibilidad/1.0'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error(`UPRA (datos.gov.co) no disponible (${r.status}).`);
 const rows=await r.json() as any;
 if(!Array.isArray(rows))throw new Error('UPRA devolvió una respuesta inesperada.');
 const byCode=new Map<string,any[]>();
 for(const row of rows){const code=String(row.cod_dane_m);if(!byCode.has(code))byCode.set(code,[]);byCode.get(code)!.push(row);}
 const out:import('./types').LandMunicipality[]=[];
 for(const m of municipalities){
  const rowsFor=byCode.get(m.code);if(!rowsFor)continue;
  const priced=rowsFor.filter(x=>!NO_PRICE.has(String(x.cod_precio).replace('.','')));
  if(!priced.length){out.push({code:m.code,name:m.name,dominantRange:null,minMillon:null,maxMillon:null,ha:0});continue;}
  const withHa=priced.map(x=>({ha:Number(x.ha)||0,label:String(x.rango_prec),range:parseRange(String(x.rango_prec))})).filter(x=>x.range);
  if(!withHa.length){out.push({code:m.code,name:m.name,dominantRange:null,minMillon:null,maxMillon:null,ha:0});continue;}
  const dominant=withHa.reduce((a,b)=>b.ha>a.ha?b:a);
  const mins=withHa.map(x=>x.range![0]),maxs=withHa.map(x=>x.range![1]??x.range![0]);
  out.push({code:m.code,name:m.name,dominantRange:dominant.label,minMillon:Math.min(...mins),maxMillon:Math.max(...maxs),ha:Math.round(withHa.reduce((s,x)=>s+x.ha,0))});
 }
 const priced=out.filter(m=>m.dominantRange);
 if(!priced.length)return null;
 // Valor tipico ponderado por la participacion del municipio en el area, usando el punto medio del rango dominante (millones/ha -> $/m2 = millones*100).
 let wsum=0,wtot=0;
 for(const m of priced){const share=municipalities.find(x=>x.code===m.code)?.share??0;const r=parseRange(m.dominantRange!);if(!r)continue;const mid=r[1]!=null?(r[0]+r[1])/2:r[0];wsum+=mid*100*share;wtot+=share;}
 const typicalCopM2=wtot?Math.round(wsum/wtot):null;
 const spanLo=Math.min(...priced.map(m=>m.minMillon!))*100,spanHi=Math.max(...priced.map(m=>m.maxMillon!))*100;
 return {municipalities:out,typicalCopM2,spanCopM2:[Math.round(spanLo),Math.round(spanHi)],source:'UPRA, precios comerciales de tierra rural agropecuaria (datos.gov.co)',retrievedAt:new Date().toISOString().slice(0,10)};
}
export const ANT='https://geoportal.ant.gov.co/servidor/rest/services/DatosAbiertos';
// Consulta generica de una capa ArcGIS de poligonos por interseccion y distancia al borde desde un punto representativo.
async function overlayLayer(aoi:Area,box:number[],cfg:{key:string;label:string;query:string;fields:string;name:(p:any)=>string},point:(f:Area)=>any){
 const {booleanIntersects,pointToPolygonDistance}=await import('@turf/turf');
 const params=new URLSearchParams({geometry:JSON.stringify({xmin:box[0],ymin:box[1],xmax:box[2],ymax:box[3],spatialReference:{wkid:4326}}),geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',where:'1=1',outFields:cfg.fields,returnGeometry:'true',f:'geojson'});
 const r=await fetch(`${cfg.query}?${params}`,{signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error(`${cfg.label}: fuente no disponible (${r.status}).`);
 const data=await r.json() as any;
 if(data.error)throw new Error(`${cfg.label}: no resolvio la consulta.`);
 if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error(`${cfg.label}: respuesta inesperada.`);
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
const titlecase=(s:unknown)=>String(s??'').toLowerCase().replace(/(^|[\s(])([\p{L}])/gu,(_,a,b)=>a+b.toUpperCase()).trim();
const CONSULTA_LAYERS=[
 {key:'resguardo',label:'Resguardo indigena',query:`${ANT}/Resguardo_Indigena_Formalizado/MapServer/0/query`,fields:'NOMBRE,PUEBLO,MUNICIPIO',name:(p:any)=>`${titlecase(p.NOMBRE)||'Resguardo indigena'}${p.PUEBLO?` (${titlecase(p.PUEBLO)})`:''}`},
 {key:'consejo',label:'Consejo comunitario (comunidades negras)',query:`${ANT}/Consejo_Comunitario_Titulado/MapServer/0/query`,fields:'NOMBRE,MUNICIPIO',name:(p:any)=>titlecase(p.NOMBRE)||'Consejo comunitario'},
] as const;
// Territorios etnicos que disparan consulta previa (ANT, Datos Abiertos): resguardos indigenas y consejos comunitarios.
// Si el area intersecta alguno, es una senal fuerte de que el proyecto requiere consulta previa.
export async function priorConsultation(aoi:Area):Promise<import('./types').Overlay>{
 const {bbox,pointOnFeature}=await import('@turf/turf');
 const b=bbox(aoi),deg=0.2,box=[b[0]-deg,b[1]-deg,b[2]+deg,b[3]+deg];
 const point=(f:Area)=>pointOnFeature(f);
 const results=await Promise.allSettled(CONSULTA_LAYERS.map(cfg=>overlayLayer(aoi,box,cfg,point)));
 const layers=results.map((res,i)=>res.status==='fulfilled'?res.value:{key:CONSULTA_LAYERS[i].key,label:CONSULTA_LAYERS[i].label,status:'error' as const,intersects:false,nearestName:null,nearestKm:null,note:res.reason instanceof Error?res.reason.message:'Consulta fallida.'});
 return {layers,bufferKm:Math.round(deg*111),source:'ANT (Datos Abiertos): resguardos indigenas y consejos comunitarios formalizados',retrievedAt:new Date().toISOString().slice(0,10)};
}
export const IGAC_AGUA='https://mapas.igac.gov.co/server/rest/services/Dato_Fundamental_Cuerpos_de_Agua_500k/MapServer';
const AGUA_LAYERS=[
 {key:'drenaje',id:2,label:'Drenaje (rio o quebrada)',kind:'line' as const},
 {key:'cuerpo',id:1,label:'Cuerpo de agua',kind:'poly' as const},
 {key:'humedal',id:4,label:'Humedal',kind:'poly' as const},
];
async function waterLayer(aoi:Area,box:number[],cfg:(typeof AGUA_LAYERS)[number],pt:any){
 const {booleanIntersects,pointToPolygonDistance,pointToLineDistance,lineString}=await import('@turf/turf');
 // La hidrografia de IGAC solo responde en JSON de Esri, no en GeoJSON; se convierte la geometria para turf.
 const params=new URLSearchParams({geometry:JSON.stringify({xmin:box[0],ymin:box[1],xmax:box[2],ymax:box[3],spatialReference:{wkid:4326}}),geometryType:'esriGeometryEnvelope',inSR:'4326',outSR:'4326',spatialRel:'esriSpatialRelIntersects',where:'1=1',returnGeometry:'true',f:'json'});
 // El servidor de IGAC se satura y responde 502 o se cuelga; se reintenta un par de veces antes de degradar.
 let data:any=null,last='';
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(`${IGAC_AGUA}/${cfg.id}/query?${params}`,{signal:AbortSignal.timeout(12000)});
   if(!r.ok){last=`no disponible (${r.status})`;continue;}
   const body=await r.json() as any;
   if(body.error){last='no resolvio la consulta';continue;}
   if(!Array.isArray(body.features)){last='respuesta inesperada';continue;}
   data=body;break;
  }catch(e){last=e instanceof Error&&e.name==='TimeoutError'?'sin respuesta a tiempo':'error de red';}
 }
 if(!data)throw new Error(`IGAC (${cfg.label}) ${last}.`);
 let intersects=false,nearestKm:number|null=null;
 for(const f of data.features){
  const g=f.geometry;if(!g)continue;
  if(cfg.kind==='line'){
   for(const path of g.paths??[]){if(path.length<2)continue;const km=pointToLineDistance(pt,lineString(path),{units:'kilometers'});if(nearestKm===null||km<nearestKm)nearestKm=km;}
  }else{
   const poly={type:'Feature' as const,properties:{},geometry:{type:'MultiPolygon' as const,coordinates:(g.rings??[]).map((ring:number[][])=>[ring])}};
   if(!poly.geometry.coordinates.length)continue;
   const touch=booleanIntersects(aoi,poly);const km=touch?0:pointToPolygonDistance(pt,poly,{units:'kilometers'});
   if(touch)intersects=true;if(nearestKm===null||km<nearestKm)nearestKm=km;
  }
 }
 return {key:cfg.key,label:cfg.label,status:'ok' as const,intersects,nearestName:null,nearestKm};
}
// Recursos hidricos cercanos al area (IGAC, cuerpos de agua 500k): drenajes, cuerpos de agua y humedales.
// Sirve para la ronda hidrica (franja de exclusion a lado y lado del cauce).
export async function waterResources(aoi:Area):Promise<import('./types').Overlay>{
 const {bbox,pointOnFeature}=await import('@turf/turf');
 const b=bbox(aoi),deg=0.2,box=[b[0]-deg,b[1]-deg,b[2]+deg,b[3]+deg];
 const pt=pointOnFeature(aoi);
 const results=await Promise.allSettled(AGUA_LAYERS.map(cfg=>waterLayer(aoi,box,cfg,pt)));
 const layers=results.map((res,i)=>res.status==='fulfilled'?res.value:{key:AGUA_LAYERS[i].key,label:AGUA_LAYERS[i].label,status:'error' as const,intersects:false,nearestName:null,nearestKm:null,note:res.reason instanceof Error?res.reason.message:'Consulta fallida.'});
 return {layers,bufferKm:Math.round(deg*111),source:'IGAC, hidrografia (cuerpos de agua 500k): drenajes, cuerpos de agua y humedales',retrievedAt:new Date().toISOString().slice(0,10)};
}
const ZRC_LAYERS=[
 {key:'zrc',label:'Zona de reserva campesina',query:`${ANT}/Zonas_de_Reserva_Campesina_Constituida/MapServer/0/query`,fields:'NOMBRE_ZON,DEPARTAMENTO',name:(p:any)=>titlecase(p.NOMBRE_ZON)||'Zona de reserva campesina'},
 {key:'tca',label:'Territorio campesino agroalimentario',query:`${ANT}/Territorios_Campesinos_Agroalimentarios/MapServer/0/query`,fields:'TECAM,DEPARTAMENTO',name:(p:any)=>titlecase(p.TECAM)||'Territorio campesino agroalimentario'},
] as const;
// Figuras campesinas de ordenamiento del suelo rural (ANT, Datos Abiertos): zonas de reserva campesina y territorios campesinos agroalimentarios. Condicionan el uso del suelo.
export async function peasantReserve(aoi:Area):Promise<import('./types').Overlay>{
 const {bbox,pointOnFeature}=await import('@turf/turf');
 const b=bbox(aoi),deg=0.2,box=[b[0]-deg,b[1]-deg,b[2]+deg,b[3]+deg];
 const point=(f:Area)=>pointOnFeature(f);
 const results=await Promise.allSettled(ZRC_LAYERS.map(cfg=>overlayLayer(aoi,box,cfg,point)));
 const layers=results.map((res,i)=>res.status==='fulfilled'?res.value:{key:ZRC_LAYERS[i].key,label:ZRC_LAYERS[i].label,status:'error' as const,intersects:false,nearestName:null,nearestKm:null,note:res.reason instanceof Error?res.reason.message:'Consulta fallida.'});
 return {layers,bufferKm:Math.round(deg*111),source:'ANT (Datos Abiertos): zonas de reserva campesina y territorios campesinos agroalimentarios',retrievedAt:new Date().toISOString().slice(0,10)};
}
export const ANM='https://geo.anm.gov.co/webgis/services/ANM/ServiciosGeograficosANM/MapServer/WFSServer';
// Resume la lista larga de MINERALES a unas pocas palabras clave reconocibles.
function mineralSummary(raw:string):string{
 const up=String(raw??'').toUpperCase();
 const keys=['ORO','PLATA','PLATINO','CARBÓN','CARBON','CALIZA','ARCILLA','CALCÁREO','NÍQUEL','NIQUEL','COBRE','HIERRO','ESMERALDA','MÁRMOL','MARMOL','YESO','SAL','FOSFATO','MATERIALES DE CONSTRUCCIÓN','ARENA','GRAVA','ROCA','CUARZO','FELDESPATO'];
 const found=[...new Set(keys.filter(k=>up.includes(k)).map(k=>titlecase(k.replace('CARBON','Carbón').replace('NIQUEL','Níquel').replace('MARMOL','Mármol'))))];
 return found.slice(0,3).join(', ')||'Mineral no especificado';
}
// Titulos mineros de la ANM cercanos al area (WFS publico). No se consultan ni se guardan datos del titular (nombre, cedula): solo estado, etapa, mineral y municipio.
export async function miningTitles(aoi:Area):Promise<import('./types').Mining>{
 const {bbox,booleanIntersects,pointOnFeature,pointToPolygonDistance}=await import('@turf/turf');
 const b=bbox(aoi),deg=0.2,box=[b[0]-deg,b[1]-deg,b[2]+deg,b[3]+deg];
 // El WFS de la ANM usa el recuadro en orden lon,lat con EPSG:4326 (no urn).
 const params=new URLSearchParams({SERVICE:'WFS',VERSION:'2.0.0',REQUEST:'GetFeature',typeNames:'ANM_ServiciosGeograficosANM:Titulo_Minero',outputFormat:'GEOJSON',srsName:'EPSG:4326',count:'500',bbox:`${box[0]},${box[1]},${box[2]},${box[3]},EPSG:4326`});
 const r=await fetch(`${ANM}?${params}`,{signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error(`ANM (titulos mineros) no disponible (${r.status}).`);
 const data=await r.json() as any;
 if(!Array.isArray(data.features))throw new Error('ANM (titulos mineros) devolvio una respuesta inesperada.');
 const pt=pointOnFeature(aoi);
 let nearest:import('./types').MiningTitle|null=null,insideActive=false;
 for(const f of data.features){
  if(!f.geometry)continue;
  const inside=booleanIntersects(aoi,f);
  const km=inside?0:pointToPolygonDistance(pt,f,{units:'kilometers'});
  const p=f.properties??{};
  const estado=String(p.ESTADO??'').trim()||'Sin dato';
  if(inside&&/activ/i.test(estado))insideActive=true;
  if(nearest===null||km<nearest.km){
   // Solo campos no personales; el nombre y la identificacion del titular se ignoran.
   nearest={estado,etapa:String(p.ETAPA??'').trim()||'Sin dato',minerals:mineralSummary(p.MINERALES),municipality:titlecase(p.MUNICIPIOS)||'',code:String(p.CODIGO_EXPEDIENTE??'').trim(),km,inside};
  }
 }
 return {nearest,insideActive,count:data.features.length,source:'ANM, catastro minero (titulos mineros), WFS publico',retrievedAt:new Date().toISOString().slice(0,10)};
}
export const UPME_SIN='https://app.upme.gov.co/Tablero_Capacidad_Barra_26_27/Tablero_Capacidad_Barra_26_27.html';
// Capacidad indicativa de conexion de generacion al SIN (UPME): subestacion de transmision mas cercana y su cupo en MW.
// Complementa la conexion de EPM (distribucion, Antioquia): esta es transmision nacional, para proyectos grandes.
// Valores indicativos de la UPME (no son asignacion ni concepto de viabilidad). Ubicacion de subestaciones por cruce con OpenStreetMap.
export async function sinCapacity(aoi:Area,assetJson:(path:string)=>Promise<any>):Promise<import('./types').SinConnection>{
 const {pointOnFeature,distance,point}=await import('@turf/turf');
 const asset=await assetJson('/data/sin-subestaciones.json');
 const rows=asset?.substations;
 if(!Array.isArray(rows))throw new Error('El asset de capacidad del SIN no es valido.');
 const c=pointOnFeature(aoi).geometry.coordinates,here=point([c[0],c[1]]);
 let nearest:import('./types').SinSubstation|null=null;
 for(const r of rows){
  const [name,lat,lon,kv,p95_2026,p95_2027,p100_2026,p100_2027]=r;
  const km=distance(here,point([lon,lat]),{units:'kilometers'});
  if(nearest===null||km<nearest.km)nearest={name,km,kv:kv??null,p95_2026,p95_2027,p100_2026,p100_2027};
 }
 // Mas alla de ~80 km no hay red del SIN cerca (zonas no interconectadas o lejos de una subestacion ubicada).
 if(nearest&&nearest.km>80)nearest=null;
 return {nearest,source:asset.source,retrievedAt:asset.retrievedAt,coverage:asset.coverage};
}
