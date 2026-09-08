import fs from 'node:fs/promises';
import {bbox, area, simplify} from '@turf/turf';

const source = 'https://geoportal.dane.gov.co/mparcgis/rest/services/MGN2024/Serv_CapasMGN_2024/FeatureServer/317';
const root = new URL('../public/data/', import.meta.url);
const features = [];
for (let offset = 0; ; offset += 100) {
  const query = new URLSearchParams({where:'1=1',outFields:'mpio_cdpmp,mpio_cnmbr,dpto_cnmbr',returnGeometry:'true',outSR:'4326',maxAllowableOffset:'0.00005',geometryPrecision:'6',f:'geojson',orderByFields:'OBJECTID',resultOffset:String(offset),resultRecordCount:'100'});
  const response = await fetch(`${source}/query?${query}`, {signal:AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error(`DANE HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.features) || data.error) throw new Error('Invalid DANE response');
  for (const f of data.features) {
    if (!f.geometry || !['Polygon','MultiPolygon'].includes(f.geometry.type) || !(area(f)>0)) throw new Error('Missing municipal polygon');
    f.bbox = bbox(f);
    features.push(f);
  }
  console.log(`Verified ${features.length} polygons`);
  if (data.features.length < 100 && !data.exceededTransferLimit) break;
}
if (features.length < 1100 || new Set(features.map(f=>f.properties.mpio_cdpmp)).size !== features.length) throw new Error('Incomplete or duplicated municipalities');
const groups = Map.groupBy(features, f=>f.properties.mpio_cdpmp.slice(0,2));
await fs.mkdir(new URL('municipal/',root),{recursive:true});
for (const [code,items] of groups) await fs.writeFile(new URL(`municipal/${code}.geojson`,root),JSON.stringify({type:'FeatureCollection',features:items}));
const index={source,year:2024,retrievedAt:new Date().toISOString(),toleranceDegrees:0.00005,count:features.length,departments:[...groups].map(([code,items])=>({code,bbox:bbox({type:'FeatureCollection',features:items})}))};
await fs.writeFile(new URL('municipal/index.json',root),JSON.stringify(index,null,2));
const display={type:'FeatureCollection',features:features.map(f=>simplify(f,{tolerance:0.002,highQuality:true}))};
await fs.writeFile(new URL('dane-municipal-display.geojson',root),JSON.stringify(display));
const registry=JSON.parse(await fs.readFile(new URL('studio-sources.json',root),'utf8'));
registry.retrievedAt=index.retrievedAt;
registry.dane={url:source,year:2024,municipalities:features.length,displayToleranceDegrees:0.002,backupToleranceDegrees:index.toleranceDegrees};
await fs.writeFile(new URL('studio-sources.json',root),JSON.stringify(registry,null,2));
console.log(`Ready: ${features.length} verified polygons in ${groups.size} departments`);
