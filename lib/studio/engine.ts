import {area, bbox, booleanValid, intersect, featureCollection, kinks, union, booleanIntersects} from '@turf/turf';
import type {Feature, FeatureCollection, Polygon, MultiPolygon} from 'geojson';
import type {Analysis,Area,Layer,MunicipalHit,Project,Scenario} from './types';
import {norm} from './types';
export function validateArea(value:unknown):Area {
  const f=value as Area;
  if(!f || f.type!=='Feature'||!['Polygon','MultiPolygon'].includes(f.geometry?.type)) throw new Error('El area debe ser un Polygon o MultiPolygon GeoJSON.');
  const coords=f.geometry.coordinates.flat(f.geometry.type==='Polygon'?1:2) as number[][];
  if(coords.length>10000) throw new Error('El area supera 10.000 vertices. Simplifica la geometria antes de analizar.');
  if(coords.some(p=>p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])||Math.abs(p[0])>180||Math.abs(p[1])>85)) throw new Error('Coordenadas invalidas: usa WGS84 (longitud, latitud).');
  if(!booleanValid(f)||kinks(f).features.length>0||area(f)<1) throw new Error('Poligono invalido: revisa cruces entre bordes, anillos y superficie.');
  if(area(f)>2e10) throw new Error('Divide el estudio en areas de menos de 20.000 km2 para conservar el detalle municipal.');
  return f;
}
export function mergeAreas(collection:FeatureCollection):Area {
  if(!collection.features.length) throw new Error('Dibuja al menos un poligono.');
  const polygons=collection.features.map(validateArea);
  const result=polygons.length===1?polygons[0]:union(featureCollection(polygons));
  if(!result)throw new Error('No fue posible unir las areas.');
  return validateArea(result);
}
export function intersectMunicipalities(aoi:Area,boundaries:FeatureCollection,rows:Record<string,unknown>[]):Pick<Analysis,'areaHa'|'municipalities'|'coveredPct'|'overlaps'> {
  const total=area(aoi),hits:MunicipalHit[]=[],features:Feature[]=[];
  const indexed=new Map(rows.map(r=>[norm(r.departamento)+'|'+norm(r.municipio),r]));
  for(const f of boundaries.features){
    if(!f.geometry||!['Polygon','MultiPolygon'].includes(f.geometry.type))throw new Error('La cartografia municipal contiene elementos sin poligono.');
    const ab=bbox(aoi),fb=f.bbox??bbox(f);if(fb[0]>ab[2]||fb[2]<ab[0]||fb[1]>ab[3]||fb[3]<ab[1])continue;
    const cut=intersect(featureCollection([aoi,f as Feature<Polygon|MultiPolygon>]));
    if(!cut)continue;
    const size=area(cut);if(size<0.01)continue;
    const p=f.properties??{},name=String(p.mpio_cnmbr),department=String(p.dpto_cnmbr),code=String(p.mpio_cdpmp);
    const data=indexed.get(norm(department)+'|'+norm(name));
    hits.push({code,name,department,areaHa:size/10000,share:size/total*100,data:data as MunicipalHit['data']??null});
    features.push({...cut,properties:{code,name,share:size/total*100}});
  }
  hits.sort((a,b)=>b.areaHa-a.areaHa);
  return {areaHa:total/10000,municipalities:hits,coveredPct:Math.min(100,hits.reduce((s,h)=>s+h.share,0)),overlaps:featureCollection(features)};
}
export function weightedMetric(hits:MunicipalHit[],key:string){
  let sum=0,weight=0;
  for(const h of hits){const v=h.data?.[key];if(typeof v==='number'&&Number.isFinite(v)){sum+=v*h.areaHa;weight+=h.areaHa;}}
  return {value:weight?sum/weight:null,coverage:hits.length?weight/hits.reduce((s,h)=>s+h.areaHa,0)*100:0};
}
export function scoreProject(project:Pick<Project,'analysis'|'technology'|'scenario'>&{capacity?:number|null}){
  const a=project.analysis;if(!a)return null;
  const solar=a.resource?.solar,wind=a.resource?.wind;
  const clamp=(n:number)=>Math.min(100,Math.max(0,n));
  const solarScore=solar==null?null:clamp((solar-3)/3.5*100),windScore=wind==null?null:clamp((wind-2)/10*100);
  const resource=project.technology==='BESS'?null:project.technology==='Eolica'?windScore:project.technology==='Hibrida'?(solarScore!==null&&windScore!==null?(solarScore+windScore)/2:null):solarScore;
  // Con transformadores EPM se mide desde el area al transformador con cupo mas cercano; para mas de 5 MW, fuera de EPM o sin cupo cercano, se usa el promedio municipal.
  const transformer=a.connection?.nearestWithCapacity&&!(project.capacity!=null&&project.capacity>5)?a.connection.nearestWithCapacity:null;
  const grid=transformer?{value:transformer.km,coverage:100}:weightedMetric(a.municipalities,'distancia_subestacion_km'),roads=weightedMetric(a.municipalities,'distancia_via_t1_km');
  const metrics=[{key:'resource',label:project.technology==='BESS'?'No aplica (BESS)':project.technology==='Hibrida'?'Solar + viento':project.technology==='Eolica'?'Viento a 50 m':'Recurso solar',score:resource,coverage:resource==null?0:100},{key:'grid',label:transformer?'Transformador con cupo (EPM)':'Proximidad a red (municipal)',score:grid.value==null?null:clamp(100-grid.value),coverage:grid.coverage},{key:'roads',label:'Acceso vial',score:roads.value==null?null:clamp(100-roads.value),coverage:roads.coverage}];
  let sum=0,weights=0,configured=0,coveredWeights=0;
  for(const m of metrics){if(project.technology==='BESS'&&m.key==='resource')continue;const w=project.scenario[m.key as keyof Omit<Scenario,'name'>];configured+=w;if(m.score!==null){sum+=m.score*w;weights+=w;coveredWeights+=w*m.coverage/100;}}
  return {score:weights?sum/weights:null,coverage:configured?coveredWeights/configured*100:0,metrics,decision:'Prefactibilidad integral pendiente'};
}
export function layerIntersections(aoi:Area,layers:Layer[]){return layers.map(l=>({id:l.id,name:l.name,role:l.role,count:l.features.features.filter(f=>{try{return booleanIntersects(aoi,f);}catch{return false;}}).length}));}
export {bbox};
