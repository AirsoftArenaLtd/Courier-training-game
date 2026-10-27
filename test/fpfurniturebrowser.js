/* Actual uploaded desk pixels and original station actions. Camera positions are declared render fixtures. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8398',OUT=path.join(__dirname,'out/fp-review'),TAG=process.env.QA_TAG||'b1-furniture';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={scope:'Static camera fixtures; actual model pixels, raycasts, keyboard station actions and original panel bounds. No trainee journey or Intel FPS acceptance.',cases:[],errors:[]};let checks=0;
 const save=()=>fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify({...report,checks},null,2));
 try{
  for(const lang of ['en','ta'])for(const large of [false,true]){
   const page=await browser.newPage();await page.setViewport({width:1280,height:720});await page.evaluateOnNewDocument(()=>localStorage.clear());page.on('pageerror',e=>report.errors.push(e.message));
   await page.goto(BASE+'/first-person.html?gfx=high&lang='+lang,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.OTR?.game?.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:180000});
   if(lang==='ta')await page.addScriptTag({url:BASE+'/data/i18n/ta.js'});
   await page.evaluate(({lang,large})=>{OTR.i18n.use(lang);Object.assign(OTR.a11y.settings(),{large,reducedMotion:true});const s=OTR.game.scene.getScene('FirstPersonScene');s.closePanel();s.refresh();},{lang,large});
   const result={lang,large,stations:[]};
   for(const id of ['hub-day','hub-practice','hub-record']){
    const before=await page.evaluate(id=>{const s=OTR.game.scene.getScene('FirstPersonScene'),target=s.art.interactions.find(o=>o.userData.interaction===id),v=target.position;s.closePanel();Object.assign(s.hubMotion.player,{x:v.x,z:v.z+2.4,yaw:0,pitch:Math.atan2(1.65-v.y,2.4)});s.sync();s.refresh();return {pick:s.art.pick(),frame:OTR.game.loop.frame,events:JSON.stringify(OTR.workday.events),checkpoint:JSON.stringify(OTR.fpStore.read()),desks:!!s.art.hub.getObjectByName('asset:hub-desk')};},id);
    assert.equal(before.pick,id);assert.equal(before.desks,true);checks+=2;
    await page.waitForFunction(frame=>OTR.game.loop.frame>frame+2,{},before.frame);
    const pixels=await page.evaluate(async()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),group=s.art.hub.getObjectByName('asset:hub-desk'),gl=OTR.game.renderer.gl,w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,read=()=>new Promise(resolve=>OTR.game.events.once('postrender',()=>{const p=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,p);resolve(p);}));const before=await read();group.visible=false;try{const after=await read();let changed=0;for(let n=0;n<before.length;n+=4)if(Math.abs(before[n]-after[n])+Math.abs(before[n+1]-after[n+1])+Math.abs(before[n+2]-after[n+2])>10)changed++;return {changed,error:gl.getError()};}finally{group.visible=true;}});
    assert.ok(pixels.changed>1000,'The uploaded desk must contribute visible pixels: '+pixels.changed);assert.equal(pixels.error,0);checks+=2;
    await page.screenshot({path:path.join(OUT,`${TAG}-${lang}-${large?'large':'normal'}-${id}.png`)});
    const after=await page.evaluate(()=>({events:JSON.stringify(OTR.workday.events),checkpoint:JSON.stringify(OTR.fpStore.read())}));assert.equal(after.events,before.events);assert.equal(after.checkpoint,before.checkpoint);checks+=2;
    result.stations.push({id,changedPixels:pixels.changed});
   }
   // From the actual last station fixture, the real interaction key opens its original debrief.
   await page.keyboard.press('KeyE');await page.waitForFunction(()=>!!OTR.game.scene.getScene('FirstPersonScene').panel,{timeout:180000});
   const panel=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.panel.root.list.filter(o=>o.type==='Text'&&o.visible).map(o=>{const b=o.getBounds();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,size:parseFloat(o.style.fontSize)};});});assert.ok(panel.length>0);for(const b of panel){assert.ok(b.x>=0&&b.y>=0&&b.right<=1280&&b.bottom<=720,JSON.stringify(b));checks++;}
   await page.screenshot({path:path.join(OUT,`${TAG}-${lang}-${large?'large':'normal'}-debrief.png`)});result.panel=panel;report.cases.push(result);save();await page.close();
  }
  assert.deepEqual(report.errors,[]);checks++;report.complete=true;save();console.log(checks+' furniture pixel/ray/action checks passed.');
 }catch(error){report.failure=error.stack;save();throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
