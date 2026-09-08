import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const require=createRequire(process.argv[2]+'/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:960},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base='http://localhost:5174';
let id;
try{
 await page.goto(base);await page.getByText('1.121 municipios',{exact:true}).waitFor();await page.getByRole('button',{name:'Nuevo proyecto',exact:true}).click();
 await page.getByRole('textbox',{name:'Nombre',exact:true}).fill('Auditoria temporal BOND');
 await page.getByRole('button',{name:'Crear proyecto',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 id=await page.getByLabel('Proyecto activo').inputValue();
 console.log('PASS project creation');
 await page.getByRole('button',{name:'Cargar geometría',exact:true}).click();
 const geometry={type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[-75.1,7.7],[-74.9,7.7],[-74.9,7.9],[-75.1,7.9],[-75.1,7.7]]]}};
 await page.locator('input[type=file]').setInputFiles({name:'area-auditoria.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify(geometry))});
 await page.getByRole('button',{name:'Limpiar y validar',exact:true}).click();
 await page.getByRole('button',{name:'Usar como área',exact:true}).click();
 await page.getByRole('button',{name:'Analizar área',exact:true}).click();
 await page.getByRole('heading',{name:'Municipios intersectados',exact:true}).waitFor({timeout:100000});
 const response=await page.request.get(base+'/api/studio');const state=await response.json();
 const project=state.projects.find(p=>p.id===id);
 if(!project?.analysis?.municipalities.length)throw new Error('Analysis has no municipalities');
 console.log(JSON.stringify({analysis:'PASS',municipalities:project.analysis.municipalities.map(m=>({name:m.name,share:m.share})),boundaryMode:project.analysis.boundaryMode,resource:project.analysis.resource?{solar:project.analysis.resource.solar,wind:project.analysis.resource.wind}:null,warnings:project.analysis.warnings}));
 await fs.mkdir('work/audit',{recursive:true});
 await page.screenshot({path:'work/audit/desktop.png',fullPage:true});
 for(const name of ['PDF','Excel']){
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();const file=await downloaded;await file.saveAs(`work/audit/${file.suggestedFilename()}`);console.log('PASS '+name+' download');
 }
 await page.getByRole('button',{name:'Asistente',exact:true}).click();
 await page.getByRole('button',{name:'¿Qué municipios cruza?',exact:true}).click();
 await page.locator('.chat-message.assistant').waitFor();console.log('PASS assistant data query');
 await page.getByRole('button',{name:'Datos y capas',exact:true}).click();
 await page.getByRole('button',{name:'Comparador',exact:true}).click();
 await page.getByRole('button',{name:'Informes',exact:true}).first().click();
 await page.getByRole('button',{name:'Mapa',exact:true}).first().click();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'work/audit/mobile.png',fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
 if(overflow)throw new Error('Mobile horizontal overflow');
 console.log('PASS mobile width and navigation');
 await page.setViewportSize({width:1440,height:960});
 await page.getByRole('button',{name:'Análisis',exact:true}).click();
 await page.getByRole('button',{name:'Dibujar polígono',exact:true}).click();
 await page.locator('.draw-hint').waitFor();
 const canvas=await page.locator('.territory-canvas').boundingBox();
 for(const [x,y] of [[.35,.3],[.5,.3],[.5,.45],[.35,.45]]){await page.mouse.move(canvas.x+canvas.width*x,canvas.y+canvas.height*y,{steps:5});await page.mouse.down();await page.mouse.up();}
 await page.keyboard.press('Enter');
 await page.getByText('Área sin guardar',{exact:true}).waitFor();
 console.log('PASS drawing marks geometry as unsaved and invalidates displayed results');
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('PASS no browser errors');
}catch(e){await fs.mkdir('work/audit',{recursive:true});await page.screenshot({path:'work/audit/failure.png',fullPage:true});console.log(await page.locator('body').innerText());throw e;}finally{
 if(id)await page.request.post(base+'/api/studio',{headers:{origin:base},data:{op:'delete',kind:'project',id}});
 await browser.close();
}
