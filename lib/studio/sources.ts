import {bbox, pointOnFeature} from '@turf/turf';
import type {FeatureCollection} from 'geojson';
import type {Area,Resource} from './types';
export const DANE='https://geoportal.dane.gov.co/mparcgis/rest/services/MGN2024/Serv_CapasMGN_2024/MapServer/317';
export const NASA='https://power.larc.nasa.gov/api/temporal/climatology/point';
export async function sourceJson(url:string){
 const r=await fetch(url,{signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw new Error(`Fuente temporalmente no disponible (${r.status}).`);
 const length=Number(r.headers.get('content-length')??0);if(length>35_000_000)throw new Error('La fuente supera el limite de consulta. Reduce el area.');
 const data=await r.json() as any;
 if(data.error||data.messages?.length)throw new Error('La fuente no pudo resolver esta consulta.');
 return data;
}
export async function municipalBoundaries(aoi:Area):Promise<FeatureCollection>{
 const b=bbox(aoi);
 const params=new URLSearchParams({geometry:JSON.stringify({xmin:b[0],ymin:b[1],xmax:b[2],ymax:b[3],spatialReference:{wkid:4326}}),geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects',where:'1=1',f:'json',returnCountOnly:'true'});
 const count=await sourceJson(`${DANE}/query?${params}`);
 if(count.count>80)throw new Error('El area incluye mas de 80 municipios candidatos. Divide el estudio en subareas.');
 params.delete('returnCountOnly');params.set('f','geojson');params.set('outFields','mpio_cdpmp,mpio_cnmbr,dpto_cnmbr');params.set('returnGeometry','true');params.set('outSR','4326');
 const data=await sourceJson(`${DANE}/query?${params}`);
 if(!Array.isArray(data.features)||data.exceededTransferLimit)throw new Error('La fuente municipal devolvio una respuesta incompleta.');
 return data;
}
export async function resourcesAt(aoi:Area):Promise<Resource>{
 const c=pointOnFeature(aoi).geometry.coordinates;
 const params=new URLSearchParams({parameters:'ALLSKY_SFC_SW_DWN,WS50M,T2M',community:'RE',longitude:c[0].toFixed(5),latitude:c[1].toFixed(5),format:'JSON'});
 const url=`${NASA}?${params}`,d=await sourceJson(url),p=d.properties?.parameter;
 if(!p)throw new Error('NASA POWER no devolvio parametros para este punto.');
 const valid=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v!==d.header?.fill_value&&v>-900?v:null;
 const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
 return {solar:valid(p.ALLSKY_SFC_SW_DWN?.ANN),wind:valid(p.WS50M?.ANN),temperature:valid(p.T2M?.ANN),months:months.map(month=>({month,solar:valid(p.ALLSKY_SFC_SW_DWN?.[month]),wind:valid(p.WS50M?.[month])})),coordinates:c,url,period:`${d.header?.start??'inicio no informado'} - ${d.header?.end??'fin no informado'}`,retrievedAt:new Date().toISOString(),units:Object.fromEntries(Object.entries(d.parameters??{}).map(([k,v]:any)=>[k,v.units]))};
}
