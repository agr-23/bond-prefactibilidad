import Papa from 'papaparse';
import {point,pointOnFeature,coordEach,booleanValid,featureCollection,polygon} from '@turf/turf';
import proj4 from 'proj4';
import type {FeatureCollection,Feature} from 'geojson';
import {norm} from './types';
export type Mapping={latitude:string;longitude:string;municipality:string;department:string;code:string;crs:string};
export type ImportPreview={name:string;rows:Record<string,unknown>[];headers:string[];collection:FeatureCollection|null;notes:string[];sheets?:string[]};
export function suggestMapping(headers:string[]):Mapping{
 const pick=(options:string[])=>headers.find(h=>options.includes(norm(h)))??'';
 return {latitude:pick(['LAT','LATITUDE','LATITUD','LATDEG','F2LATITUDDEG','Y']),longitude:pick(['LON','LONGITUDE','LONGITUD','LONDEG','F2LONGITUDDEG','X']),municipality:pick(['MUNICIPIO','MUNICIPALITY','F1MUNICIPIO','MPIOCNMBR']),department:pick(['DEPARTAMENTO','DEPARTMENT','F1DEPARTAMENTO','DPTOCNMBR']),code:pick(['DIVIPOLA','CODIGODANE','CODIGOMUNICIPIO','MPIOCDPMP']),crs:'EPSG:4326'};
}
function cleanCell(v:unknown):unknown{
 if(v==null)return null;
 if(typeof v!=='string')return v;
 const s=v.trim();if(['','na','n/a','nan','null','sin dato','no esta','sin informacion'].includes(s.toLowerCase()))return null;
 return s;
}
export function parseNumber(v:unknown):number|null{
 if(typeof v==='number')return Number.isFinite(v)?v:null;
 if(typeof v!=='string')return null;
 const s=v.trim();if(!/^[+-]?\d+(?:[.,]\d+)?$/.test(s))return null;
 const n=Number(s.replace(',','.'));return Number.isFinite(n)?n:null;
}
export async function readImport(file:File,sheetName?:string):Promise<ImportPreview>{
 if(file.size>20_000_000)throw new Error('El archivo supera 20 MB. Divide la carga.');
 const ext=file.name.split('.').pop()?.toLowerCase(),notes:string[]=[];
 let rows:Record<string,unknown>[]=[],collection:FeatureCollection|null=null,sheets:string[]|undefined;
 if(['csv','tsv','txt'].includes(ext??'')){
  const parsed=Papa.parse<Record<string,unknown>>(await file.text(),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim().replace(/^\uFEFF/,''),transform:v=>cleanCell(v)});
  if(parsed.errors.some(e=>e.type==='Quotes'||e.type==='FieldMismatch'))throw new Error('CSV con comillas o numero de columnas inconsistente. Revisa el separador y las filas.');
  if(parsed.errors.length)notes.push(`${parsed.errors.length} advertencias de estructura CSV; revisa la vista previa.`);
  rows=parsed.data;notes.push(`Separador detectado: ${JSON.stringify(parsed.meta.delimiter)}. Espacios y marcadores vacios normalizados.`);
 }else if(ext==='xlsx'){
  const {Workbook}=await import('exceljs');const workbook=new Workbook();await workbook.xlsx.load(await file.arrayBuffer() as any);sheets=workbook.worksheets.map(s=>s.name);const sheet=sheetName?workbook.getWorksheet(sheetName):workbook.worksheets[0];if(!sheet)throw new Error('Hoja no encontrada.');
  const cell=(c:any)=>{const v=c.value;if(v?.formula)return v.result??null;if(v?.richText)return v.richText.map((r:any)=>r.text).join('');if(v&&typeof v==='object'&&v.text)return v.text;return cleanCell(v);};
  const headers:string[]=[];sheet.getRow(1).eachCell({includeEmpty:true},(c,col)=>headers[col-1]=String(cell(c)??`columna_${col}`));
  if(new Set(headers).size!==headers.length)throw new Error('Hay encabezados duplicados en Excel. Renombralos antes de importar.');
  sheet.eachRow((r,n)=>{if(n===1)return;rows.push(Object.fromEntries(headers.map((h,i)=>[h,cell(r.getCell(i+1))])));});notes.push(`Hoja: ${sheet.name}. Se importan valores calculados disponibles, sin ejecutar formulas.`);
 }else if(['json','geojson'].includes(ext??'')){
  const j=JSON.parse(await file.text());if(j.type==='FeatureCollection')collection=j;else if(j.type==='Feature')collection=featureCollection([j]);else if(j.type&&j.coordinates)collection=featureCollection([{type:'Feature',geometry:j,properties:{}}]);else if(Array.isArray(j))rows=j;else throw new Error('JSON debe contener GeoJSON o una lista de registros.');
 }else if(ext==='kml'){
  const {kml}=await import('@tmcw/togeojson');const xml=new DOMParser().parseFromString(await file.text(),'text/xml');if(xml.querySelector('parsererror'))throw new Error('KML invalido.');collection=kml(xml) as FeatureCollection;
 }else if(ext==='zip'){
  const {default:shp}=await import('shpjs');const result=await shp(await file.arrayBuffer());collection=Array.isArray(result)?featureCollection(result.flatMap((r:any)=>r.features)):result;notes.push('Shapefile convertido a WGS84 usando el archivo .prj cuando esta disponible.');
 }else if(ext==='tif'||ext==='tiff'){
  const {fromArrayBuffer}=await import('geotiff');const tif=await fromArrayBuffer(await file.arrayBuffer());const img=await tif.getImage();const box=img.getBoundingBox(),keys=img.getGeoKeys(),epsg=keys.ProjectedCSTypeGeoKey??keys.GeographicTypeGeoKey;
  if(![4326,3857].includes(epsg))throw new Error('GeoTIFF: reproyecta a EPSG:4326 o EPSG:3857 antes de cargarlo.');
  const values=await img.readRasters({width:32,height:32,samples:[0],interleave:true}),nodata=img.getGDALNoData();const features:Feature[]=[];
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const value=Number(values[y*32+x]);if(!Number.isFinite(value)||value===nodata)continue;const left=box[0]+x*(box[2]-box[0])/32,right=box[0]+(x+1)*(box[2]-box[0])/32,top=box[3]-y*(box[3]-box[1])/32,bottom=box[3]-(y+1)*(box[3]-box[1])/32;const ring=[[left,top],[right,top],[right,bottom],[left,bottom],[left,top]].map(p=>epsg===4326?p:proj4('EPSG:3857','EPSG:4326',p));features.push(polygon([ring],{value,band:1,sample:'32x32'}));}
  collection=featureCollection(features);notes.push('Vista muestreada de la banda 1 en 32 x 32 celdas. El original conserva la resolucion completa; no usar esta vista para medidas de detalle.');
 }else throw new Error('Formato no compatible. Usa CSV, TSV, XLSX, GeoJSON, KML, Shapefile ZIP o GeoTIFF.');
 if(rows.length>10000)throw new Error('La carga supera 10.000 registros. Divide el archivo.');
 return {name:file.name,rows,headers:rows.length?Object.keys(rows[0]):[],collection,notes,sheets};
}
export function normalizeImport(preview:ImportPreview,mapping:Mapping,municipalities:FeatureCollection){
 const notes=[...preview.notes];let rejected=0,duplicates=0;const seen=new Set<string>();let features:Feature[]=[];
 const byCode=new Map(municipalities.features.map(f=>[String(f.properties?.mpio_cdpmp),f]));
 const byName=new Map(municipalities.features.map(f=>[norm(f.properties?.dpto_cnmbr)+'|'+norm(f.properties?.mpio_cnmbr),f]));
 if(preview.collection){if(!Array.isArray(preview.collection.features))throw new Error('GeoJSON sin lista de elementos.');features=preview.collection.features;}
 else for(const raw of preview.rows){
  const row=Object.fromEntries(Object.entries(raw).filter(([k])=>!['__proto__','constructor','prototype'].includes(k)).map(([k,v])=>[k,cleanCell(v)]));
  const key=JSON.stringify(row);if(seen.has(key)){duplicates++;continue;}seen.add(key);
  if(mapping.longitude&&mapping.latitude){
   const x=parseNumber(row[mapping.longitude]),y=parseNumber(row[mapping.latitude]);if(x===null||y===null){rejected++;continue;}
   let c=[x,y];try{if(mapping.crs!=='EPSG:4326')c=proj4(mapping.crs,'EPSG:4326',c);}catch{throw new Error('Sistema de referencia no reconocido. Usa EPSG:4326, EPSG:3857 o una definicion PROJ.');}
   if(Math.abs(c[0])>180||Math.abs(c[1])>85){rejected++;continue;}features.push(point(c,row));
  }else{
   const code=mapping.code?String(row[mapping.code]??'').replace(/\.0$/,'').padStart(5,'0'):'';
   const named=byName.get(norm(row[mapping.department])+'|'+norm(row[mapping.municipality]));
   const f=code?byCode.get(code):named;if(!f||(code&&named&&String(f.properties?.mpio_cdpmp)!==String(named.properties?.mpio_cdpmp))){rejected++;continue;}
   features.push({...f,properties:{...row,bond_georeference:'Municipal (DANE MGN 2024, visualizacion generalizada)',bond_code:f.properties?.mpio_cdpmp}});
  }
 }
 const valid:Feature[]=[];
 for(const f of features){try{if(!f.geometry||!booleanValid(f))throw new Error();coordEach(f,c=>{if(!Number.isFinite(c[0])||!Number.isFinite(c[1])||Math.abs(c[0])>180||Math.abs(c[1])>85)throw new Error();});valid.push(f);}catch{rejected++;}}
 if(valid.length>10000)throw new Error('Mas de 10.000 geometrías: divide la carga.');
 notes.push(`${duplicates} duplicados exactos retirados. ${rejected} registros sin georreferencia valida excluidos.`);
 if(!preview.collection)notes.push(mapping.latitude&&mapping.longitude?`Coordenadas ${mapping.longitude} / ${mapping.latitude}, ${mapping.crs}; convertidas a WGS84 para el mapa.`:'Georreferencia municipal por DIVIPOLA o departamento + municipio. No equivale a una ubicacion predial. Codigos que contradicen el nombre se excluyen.');
 if(!valid.length)throw new Error('Ningun registro tiene georreferencia valida. Revisa el mapeo de columnas, codigos o departamento + municipio.');
 return {features:featureCollection(valid),notes,rejected,duplicates};
}
