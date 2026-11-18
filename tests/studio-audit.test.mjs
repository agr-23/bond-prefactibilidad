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
test('prior consultation: ethnic territory intersection and distance degrade per layer',async()=>{
 const poly=name=>({type:'FeatureCollection',features:[{type:'Feature',properties:{NOMBRE:name,PUEBLO:'Nasa'},geometry:{type:'Polygon',coordinates:[[[-76.3,2.58],[-76.1,2.58],[-76.1,2.78],[-76.3,2.78],[-76.3,2.58]]]}}]});
 const previous=globalThis.fetch;
 globalThis.fetch=async(url)=>{
  if(url.includes('Resguardo_Indigena'))return Response.json(poly('Resguardo Indígena de Guambia'));
  if(url.includes('Consejo_Comunitario'))return new Response('',{status:503});
  return Response.json({type:'FeatureCollection',features:[]});
 };
 try{
  const inside=await sources.priorConsultation(square(-76.25,2.68,-76.24,2.69));
  const res=inside.layers.find(l=>l.key==='resguardo');
  assert.equal(res.intersects,true);assert.equal(res.nearestKm,0);assert.match(res.nearestName,/Guambia/);
  const con=inside.layers.find(l=>l.key==='consejo');
  assert.equal(con.status,'error');assert.equal(con.intersects,false);
  const outside=await sources.priorConsultation(square(-74.0,5.0,-73.99,5.01));
  assert.equal(outside.layers.find(l=>l.key==='resguardo').intersects,false);
 }finally{globalThis.fetch=previous;}
});
test('water resources: esri line distance, polygon inside, and per-layer degradation',async()=>{
 const esriLine={features:[{geometry:{paths:[[[-75.90,6.52],[-75.90,6.55]]]}}]};
 const esriPoly={features:[{geometry:{rings:[[[-75.95,6.45],[-75.80,6.45],[-75.80,6.60],[-75.95,6.60],[-75.95,6.45]]]}}]};
 const previous=globalThis.fetch;
 globalThis.fetch=async(url)=>{
  if(url.includes('/2/query'))return Response.json(esriLine);       // drenaje (linea)
  if(url.includes('/1/query'))return Response.json(esriPoly);       // cuerpo de agua (poligono que cubre el area)
  if(url.includes('/4/query'))return new Response('',{status:502}); // humedal falla
  return Response.json({features:[]});
 };
 try{
  const r=await sources.waterResources(square(-75.88,6.515,-75.87,6.525));
  const dren=r.layers.find(l=>l.key==='drenaje');
  assert.equal(dren.status,'ok');assert.ok(dren.nearestKm>0&&dren.nearestKm<5);
  const cuerpo=r.layers.find(l=>l.key==='cuerpo');
  assert.equal(cuerpo.intersects,true);assert.equal(cuerpo.nearestKm,0);
  const hum=r.layers.find(l=>l.key==='humedal');
  assert.equal(hum.status,'error');
 }finally{globalThis.fetch=previous;}
});
test('water resources: retries IGAC before degrading a layer',async()=>{
 const previous=globalThis.fetch;let drenCalls=0;
 globalThis.fetch=async(url)=>{
  if(url.includes('/2/query')){drenCalls++;return drenCalls<2?new Response('',{status:502}):Response.json({features:[{geometry:{paths:[[[-75.90,6.52],[-75.90,6.55]]]}}]});}
  return Response.json({features:[]});
 };
 try{const r=await sources.waterResources(square(-75.88,6.515,-75.87,6.525));assert.equal(r.layers.find(l=>l.key==='drenaje').status,'ok');assert.ok(drenCalls>=2);}finally{globalThis.fetch=previous;}
});
test('peasant reserve: intersection and degradation via the shared overlay helper',async()=>{
 const poly={type:'FeatureCollection',features:[{type:'Feature',properties:{NOMBRE_ZON:'Cabrera'},geometry:{type:'Polygon',coordinates:[[[-74.5,3.9],[-74.4,3.9],[-74.4,4.0],[-74.5,4.0],[-74.5,3.9]]]}}]};
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>Response.json(poly);
 try{
  const inside=await sources.peasantReserve(square(-74.48,3.95,-74.47,3.96));
  const l=inside.layers[0];assert.equal(l.intersects,true);assert.match(l.nearestName,/Cabrera/);
 }finally{globalThis.fetch=previous;}
 const p2=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:500});
 try{const r=await sources.peasantReserve(square(-74.0,5.0,-73.99,5.01));assert.equal(r.layers[0].status,'error');}finally{globalThis.fetch=p2;}
});
test('mining titles: nearest active title inside, and no personal data is stored',async()=>{
 const wfs={type:'FeatureCollection',features:[
  {type:'Feature',properties:{ESTADO:'Activo',ETAPA:'Explotación',MINERALES:'MINERAL DE ORO, MINERAL DE PLATA',MUNICIPIOS:'REMEDIOS',CODIGO_EXPEDIENTE:'H6336005',NOMBRE_DE_TITULAR:'Fulano de Tal',NUMERO_IDENTIFICACION:'123456'},geometry:{type:'Polygon',coordinates:[[[-74.72,7.00],[-74.66,7.00],[-74.66,7.06],[-74.72,7.06],[-74.72,7.00]]]}},
  {type:'Feature',properties:{ESTADO:'Terminado',ETAPA:'Exploración',MINERALES:'CARBÓN',MUNICIPIOS:'SEGOVIA',CODIGO_EXPEDIENTE:'X1'},geometry:{type:'Polygon',coordinates:[[[-74.60,7.20],[-74.58,7.20],[-74.58,7.22],[-74.60,7.22],[-74.60,7.20]]]}},
 ]};
 const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json(wfs);
 try{
  const r=await sources.miningTitles(square(-74.70,7.02,-74.68,7.04));
  assert.equal(r.insideActive,true);assert.equal(r.nearest.inside,true);assert.equal(r.nearest.km,0);
  assert.match(r.nearest.minerals,/Oro/);assert.equal(r.nearest.estado,'Activo');
  // sin datos del titular en la salida
  const serialized=JSON.stringify(r);
  assert.ok(!serialized.includes('Fulano')&&!serialized.includes('123456')&&!/TITULAR/i.test(serialized));
 }finally{globalThis.fetch=previous;}
});
test('mining titles: a service error degrades to a thrown error for the route to catch',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:503});
 try{await assert.rejects(()=>sources.miningTitles(square(-74.70,7.02,-74.68,7.04)),/ANM/);}finally{globalThis.fetch=previous;}
});
const sinAsset={fields:['name','lat','lon','kv','p95_2026','p95_2027','p100_2026','p100_2027'],source:'UPME',retrievedAt:'2026-11-11',coverage:'427 de 598',substations:[['Aguablanca 115',3.4095,-76.4854,115,68.99,2.66,2.57,1.23],['Bacata 500',4.7988,-74.1781,500,0.1,0.08,0.05,0.04]]};
test('SIN capacity: nearest substation and its indicative MW; far areas report no SIN nearby',async()=>{
 const asset=async p=>{assert.ok(p.includes('sin-subestaciones'));return sinAsset;};
 const near=await sources.sinCapacity(square(-76.49,3.40,-76.47,3.42),asset);
 assert.equal(near.nearest.name,'Aguablanca 115');assert.ok(near.nearest.km<2);assert.equal(near.nearest.p95_2027,2.66);
 const far=await sources.sinCapacity(square(-69.94,-4.21,-69.92,-4.19),asset);
 assert.equal(far.nearest,null);
});
test('solar atlas: parses PVOUT, converts GHI to daily, nulls missing values',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({annual:{data:{PVOUT_csi:1556.2,GHI:1935,DNI:1387.1,OPTA:7,TEMP:20.1,ELE:1488}}});
 try{
  const r=await sources.solarAtlas(square(-75.58,6.24,-75.57,6.25));
  assert.equal(r.pvout,1556.2);assert.ok(Math.abs(r.ghiDaily-1935/365)<1e-9);assert.equal(r.optimalTilt,7);
 }finally{globalThis.fetch=previous;}
 const p2=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:500});
 try{await assert.rejects(()=>sources.solarAtlas(square(-75.58,6.24,-75.57,6.25)),/Global Solar Atlas/);}finally{globalThis.fetch=p2;}
});
