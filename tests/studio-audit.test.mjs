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
