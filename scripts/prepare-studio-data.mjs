import fs from 'node:fs/promises';
const root = new URL('../public/data/', import.meta.url);
export const dane = 'https://geoportal.dane.gov.co/mparcgis/rest/services/MGN2024/Serv_CapasMGN_2024/FeatureServer/317';
async function readJson(url) {
  const r = await fetch(url, {signal: AbortSignal.timeout(120000)});
  if (!r.ok) throw new Error(`${r.status}: ${url}`);
  const j = await r.json();
  if(j.error) throw new Error(JSON.stringify(j.error));
  return j;
}
const query = new URLSearchParams({where:'1=1',outFields:'mpio_cdpmp,mpio_cnmbr,dpto_cnmbr',returnGeometry:'true',outSR:'4326',maxAllowableOffset:'0.002',f:'geojson'});
const boundaries = await readJson(`${dane}/query?${query}`);
if(boundaries.exceededTransferLimit || boundaries.features?.length < 1100 || boundaries.features.some(f=>!f.geometry?.coordinates?.length)) throw new Error('Incomplete municipal boundary download');
await fs.writeFile(new URL('dane-municipal-display.geojson', root), JSON.stringify(boundaries));
console.log(`DANE: ${boundaries.features.length} boundaries (display only, 0.002 degree generalization).`);
const locations = [['Riohacha',-72.91,11.54],['Valledupar',-73.25,10.46],['Barranquilla',-74.80,10.98],['Medellin',-75.57,6.24],['Bogota',-74.08,4.61],['Cali',-76.53,3.45],['Villavicencio',-73.63,4.14],['Leticia',-69.94,-4.21]];
const features=[];
for(const [name,lon,lat] of locations){
  const url=`https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN,WS50M,T2M&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
  try {
    const d=await readJson(url);
    features.push({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{name,solar:d.properties.parameter.ALLSKY_SFC_SW_DWN.ANN,wind:d.properties.parameter.WS50M.ANN,temperature:d.properties.parameter.T2M.ANN,parameters:d.parameters,header:d.header,source:url,retrievedAt:new Date().toISOString()}});
    console.log(`NASA: ${name}`);
  }catch(e){console.log(`NASA ${name}: ${e.message}`);}
}
await fs.writeFile(new URL('nasa-reference.geojson',root),JSON.stringify({type:'FeatureCollection',features}));
await fs.writeFile(new URL('studio-sources.json',root),JSON.stringify({retrievedAt:new Date().toISOString(),dane:{url:dane,year:2024,municipalities:boundaries.features.length,displayToleranceDegrees:0.002},nasa:{url:'https://power.larc.nasa.gov/',referencePoints:features.length}},null,2));
