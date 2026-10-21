import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {polygon,featureCollection,area} from '@turf/turf';

await fs.mkdir('work/audit-tests',{recursive:true});
for(const file of ['engine','sources','types']){
 const source=await fs.readFile(`lib/studio/${file}.ts`,'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replaceAll("'./types'","'./types.mjs'");
 await fs.writeFile(`work/audit-tests/${file}.mjs`,output);
}
const engine=await import('../work/audit-tests/engine.mjs');
const sources=await import('../work/audit-tests/sources.mjs');
const square=(x1,y1,x2,y2,properties={})=>polygon([[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]]],properties);
const aoi=square(-75,6,-74.98,6.02);
const asset=async path=>JSON.parse(await fs.readFile(`public${path}`,'utf8'));

test('published municipal catalog has 1121 actual nonempty polygons',async()=>{
 const d=await asset('/data/dane-municipal-display.geojson');
 assert.equal(d.features.length,1121);assert.ok(sources.validBoundaries(d));
 assert.ok(d.features.every(f=>area(f)>0));
});
test('rejects the old null-geometry catalog',()=>{
 assert.equal(sources.validBoundaries({type:'FeatureCollection',features:[{type:'Feature',geometry:null,properties:{mpio_cdpmp:'05001'}}]}),false);
});
test('polygon crossing two municipalities uses area shares and area-weighted metrics',()=>{
 const boundaries=featureCollection([square(-75,6,-74.99,6.02,{mpio_cdpmp:'00001',mpio_cnmbr:'Uno',dpto_cnmbr:'Test'}),square(-74.99,6,-74.98,6.02,{mpio_cdpmp:'00002',mpio_cnmbr:'Dos',dpto_cnmbr:'Test'})]);
 const r=engine.intersectMunicipalities(aoi,boundaries,[{municipio:'Uno',departamento:'Test',metric:10},{municipio:'Dos',departamento:'Test',metric:30}]);
 assert.equal(r.municipalities.length,2);assert.ok(Math.abs(r.coveredPct-100)<0.001);
 assert.ok(r.municipalities.every(m=>Math.abs(m.share-50)<0.001));
 assert.ok(Math.abs(engine.weightedMetric(r.municipalities,'metric').value-20)<0.001);
});
test('self crossing polygon is rejected',()=>assert.throws(()=>engine.validateArea(polygon([[[-75,6],[-74.9,6.1],[-75,6.1],[-74.9,6],[-75,6]]]))));
test('DANE 403 preserves municipal analysis through a labeled verified backup',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:403});
 try{const r=await sources.municipalBoundaries(aoi,asset);assert.equal(r.mode,'backup');assert.match(r.warning,/403/);assert.ok(r.boundaries.features.length);const result=engine.intersectMunicipalities(aoi,r.boundaries,[]);assert.ok(result.municipalities.length);assert.ok(result.coveredPct>99);}
 finally{globalThis.fetch=previous;}
});
test('successful DANE response without geometries falls back instead of crashing',async()=>{
 const previous=globalThis.fetch;let n=0;globalThis.fetch=async()=>Response.json(n++===0?{count:1}:{type:'FeatureCollection',features:[{geometry:null}]});
 try{assert.equal((await sources.municipalBoundaries(aoi,asset)).mode,'backup');}finally{globalThis.fetch=previous;}
});
test('BESS excludes inapplicable resource weights from evidence coverage',()=>{
 const p={technology:'BESS',scenario:{name:'Test',resource:50,grid:30,roads:20},analysis:{municipalities:[{areaHa:1,data:{distancia_subestacion_km:10,distancia_via_t1_km:20}}]}};
 assert.equal(engine.scoreProject(p).coverage,100);
});
test('NASA missing values remain null, not invented reference values',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({header:{fill_value:-999,start:2001,end:2020},properties:{parameter:{ALLSKY_SFC_SW_DWN:{ANN:-999},WS50M:{ANN:4}}},messages:['Informational message']});
 try{const r=await sources.resourcesAt(aoi);assert.equal(r.solar,null);assert.equal(r.wind,4);}finally{globalThis.fetch=previous;}
});
test('EPM transformers: nearest five with semaphore inside the EPM network',async()=>{
 const r=await sources.nearestTransformers(square(-75.60,6.20,-75.58,6.22),asset);
 assert.ok(r);assert.equal(r.transformers.length,5);
 assert.ok(r.transformers.every((t,i,all)=>t.km>=0&&(i===0||all[i-1].km<=t.km)));
 assert.ok(r.transformers.every(t=>['Verde','Amarillo','Naranja','Rojo','Sin dato'].includes(t.power)));
 assert.equal(r.nearestWithCapacity?.power,'Verde');
});
test('EPM transformers: area outside the EPM network returns null, not an empty measurement',async()=>{
 assert.equal(await sources.nearestTransformers(square(-74.10,4.60,-74.08,4.62),asset),null);
});
test('grid metric uses the nearest transformer with capacity, and the municipal average above 5 MW',()=>{
 const analysis={municipalities:[{areaHa:1,data:{distancia_subestacion_km:40,distancia_via_t1_km:20}}],connection:{transformers:[],nearestWithCapacity:{km:2},source:'t',retrievedAt:'t'}};
 const grid=p=>engine.scoreProject(p).metrics.find(m=>m.key==='grid');
 const base={technology:'Solar FV',scenario:{name:'Test',resource:0,grid:100,roads:0},analysis};
 assert.equal(grid({...base,capacity:1}).score,98);
 assert.equal(grid({...base,capacity:20}).score,60);
 assert.equal(grid({...base,analysis:{...analysis,connection:null}}).score,60);
});
test('environmental constraints: intersection, distance and per-layer degradation',async()=>{
 const box=f=>({type:'FeatureCollection',features:[{type:'Feature',properties:f.props,geometry:{type:'Polygon',coordinates:[[[-75.3,5.6],[-75.1,5.6],[-75.1,5.8],[-75.3,5.8],[-75.3,5.6]]]}}]});
 const previous=globalThis.fetch;
 globalThis.fetch=async(url)=>{
  if(url.includes('OTL_Paramo'))return Response.json(box({props:{uab_nombre_paramo:'Sonsón'}}));
  if(url.includes('OTL_Humedal_RAMSAR'))return new Response('',{status:503});
  return Response.json({type:'FeatureCollection',features:[]});
 };
 try{
  const inside=await sources.environmentalConstraints(square(-75.25,5.68,-75.24,5.69));
  const paramo=inside.layers.find(l=>l.key==='paramo');
  assert.equal(paramo.intersects,true);assert.equal(paramo.nearestKm,0);assert.match(paramo.nearestName,/Sonsón/);
  const ramsar=inside.layers.find(l=>l.key==='ramsar');
  assert.equal(ramsar.status,'error');assert.equal(ramsar.intersects,false);
  const ley2=inside.layers.find(l=>l.key==='ley2');
  assert.equal(ley2.status,'ok');assert.equal(ley2.nearestKm,null);
  const outside=await sources.environmentalConstraints(square(-75.0,5.0,-74.99,5.01));
  assert.equal(outside.layers.find(l=>l.key==='paramo').intersects,false);
  assert.ok(outside.layers.find(l=>l.key==='paramo').nearestKm>0);
 }finally{globalThis.fetch=previous;}
});
const overpassFixture=await fs.readFile('tests/fixtures-overpass.json','utf8');
test('road access: nearest road, major road, surface and car route from real Overpass data',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async(url)=>String(url).includes('interpreter')?new Response(overpassFixture,{status:200}):Response.json({code:'Ok',routes:[{distance:22900,duration:3120}]});
 try{
  const r=await sources.roadAccess(square(-75.872,6.518,-75.868,6.522));
  assert.ok(r.nearest.km<1);assert.ok(r.nearest.typeLabel);
  assert.equal(r.nearestMajor.type,'trunk');
  assert.ok(Math.abs(r.route.km-22.9)<0.01&&Math.abs(r.route.min-52)<0.1);
 }finally{globalThis.fetch=previous;}
});
test('road access: fails over to the next Overpass endpoint when the first is saturated',async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url)=>{if(String(url).includes('interpreter')){calls++;return calls===1?new Response('server busy',{status:504}):new Response(overpassFixture,{status:200});}return Response.json({code:'Ok',routes:[{distance:1000,duration:120}]});};
 try{const r=await sources.roadAccess(square(-75.872,6.518,-75.868,6.522));assert.ok(r.nearest);assert.ok(calls>=2);}finally{globalThis.fetch=previous;}
});
test('road access: a failed route keeps the Overpass distances',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async(url)=>String(url).includes('interpreter')?new Response(overpassFixture,{status:200}):new Response('',{status:500});
 try{const r=await sources.roadAccess(square(-75.872,6.518,-75.868,6.522));assert.equal(r.route,null);assert.ok(r.nearest.km<1);}finally{globalThis.fetch=previous;}
});
test('road access: all Overpass endpoints down throws, so the route degrades to the municipal average',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async(url)=>String(url).includes('interpreter')?new Response('busy',{status:504}):Response.json({code:'Ok',routes:[]});
 try{await assert.rejects(()=>sources.roadAccess(square(-75.872,6.518,-75.868,6.522)),/Overpass/);}finally{globalThis.fetch=previous;}
});
test('land price: dominant range, excludes non-price codes, weights the typical value by area share',async()=>{
 const soda=[
  {cod_dane_m:'05264',municipio:'Entrerrios',rango_prec:'Mayor a 50 - hasta 60',cod_precio:'12',ha:'13072'},
  {cod_dane_m:'05264',municipio:'Entrerrios',rango_prec:'Mayor a 5 - hasta 8',cod_precio:'5',ha:'3220'},
  {cod_dane_m:'05264',municipio:'Entrerrios',rango_prec:'CA',cod_precio:'CA',ha:'552'},
  {cod_dane_m:'05861',municipio:'Venecia',rango_prec:'Mayor a 70 - hasta 80',cod_precio:'14',ha:'5015'},
 ];
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>Response.json(soda);
 try{
  const r=await sources.landPrice([{code:'05264',name:'Entrerrios',share:60},{code:'05861',name:'Venecia',share:40}]);
  const e=r.municipalities.find(m=>m.code==='05264');
  assert.equal(e.dominantRange,'Mayor a 50 - hasta 60');assert.equal(e.minMillon,5);assert.equal(e.maxMillon,60);
  // 55*100*0.6 + 75*100*0.4 = 3300 + 3000 = 6300
  assert.equal(r.typicalCopM2,6300);
  assert.deepEqual(r.spanCopM2,[500,8000]);
 }finally{globalThis.fetch=previous;}
});
test('land price: municipalities without UPRA coverage return null, not a fabricated value',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json([]);
 try{assert.equal(await sources.landPrice([{code:'91001',name:'Leticia',share:100}]),null);}finally{globalThis.fetch=previous;}
});
test('land price: a datos.gov.co error degrades to a thrown error, caught by the route',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:500});
 try{await assert.rejects(()=>sources.landPrice([{code:'05264',name:'Entrerrios',share:100}]),/UPRA/);}finally{globalThis.fetch=previous;}
});
