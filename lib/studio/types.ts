import type {Feature, FeatureCollection, Polygon, MultiPolygon} from 'geojson';
export type Area = Feature<Polygon | MultiPolygon>;
export type MetricValue = string | number | null;
export type MunicipalHit = {code:string;name:string;department:string;areaHa:number;share:number;data:Record<string,MetricValue>|null};
export type Resource = {solar:number|null;wind:number|null;temperature:number|null;months:{month:string;solar:number|null;wind:number|null}[];coordinates:number[];url:string;period:string;retrievedAt:string;units:Record<string,string>};
export type Transformer = {lon:number;lat:number;km:number;power:string;energy:string;kva:number|null;municipality:string;substation:string;level:number|null};
// Transformadores de distribucion de EPM (ETER) mas cercanos al area; null fuera de la red de EPM.
export type Connection = {transformers:Transformer[];nearestWithCapacity:Transformer|null;source:string;retrievedAt:string};
// Restricciones ambientales cercanas al area (MinAmbiente). intersects: el area toca la figura; nearestKm: distancia al borde, null si no hay ninguna en el radio consultado.
export type EnvLayer = {key:string;label:string;status:'ok'|'error';intersects:boolean;nearestName:string|null;nearestKm:number|null;note?:string};
export type Environment = {layers:EnvLayer[];bufferKm:number;source:string;retrievedAt:string};
// Acceso vial desde un punto representativo del area (OpenStreetMap + OSRM).
export type Road = {type:string;typeLabel:string;name:string;surface:string|null;km:number};
export type RoadAccess = {nearest:Road;nearestMajor:Road|null;route:{km:number;min:number}|null;source:string;retrievedAt:string};
// Costo de la tierra rural (UPRA, rangos por hectarea). Informativo, no entra al indice.
export type LandMunicipality = {code:string;name:string;dominantRange:string|null;minMillon:number|null;maxMillon:number|null;ha:number};
export type LandPrice = {municipalities:LandMunicipality[];typicalCopM2:number|null;spanCopM2:[number,number]|null;source:string;retrievedAt:string};
// Capa territorial superpuesta (misma forma que EnvLayer): intersects si el area la toca; nearestKm al borde, null si no hay ninguna en el radio.
export type OverlayLayer = {key:string;label:string;status:'ok'|'error';intersects:boolean;nearestName:string|null;nearestKm:number|null;note?:string};
export type Overlay = {layers:OverlayLayer[];bufferKm:number;source:string;retrievedAt:string};
export type Analysis = {version:string;boundaryMode?:'live'|'backup';createdAt:string;areaHa:number;municipalities:MunicipalHit[];coveredPct:number;overlaps:FeatureCollection;resource:Resource|null;connection?:Connection|null;environment?:Environment|null;roads?:RoadAccess|null;land?:LandPrice|null;priorConsultation?:Overlay|null;water?:Overlay|null;peasantReserve?:Overlay|null;warnings:string[];sources:{label:string;url:string;detail:string}[];layerHits:{id:string;name:string;count:number;role:string}[]};
export type Scenario = {name:string;resource:number;grid:number;roads:number};
export const defaultScenario:Scenario={name:'Balanceado',resource:50,grid:30,roads:20};
export type Project={id:string;name:string;technology:string;capacity:number|null;geometry:Area|null;analysis:Analysis|null;scenario:Scenario;createdAt:string;updatedAt:string;revision:number};
export type Layer={id:string;name:string;kind:string;role:'context'|'restriction';color:string;features:FeatureCollection;count:number;createdAt:string;notes:string[];originalName:string;visible?:boolean};
export type ChatMessage={role:'user'|'assistant';text:string;mode?:string};
export const emptyFeatures=():FeatureCollection=>({type:'FeatureCollection',features:[]});
export const norm=(s:unknown)=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export const format=(n:number|null|undefined,decimals=1)=>n==null?'Sin dato':n.toLocaleString('es-CO',{maximumFractionDigits:decimals});
