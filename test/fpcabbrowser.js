/* Real keyboard target selection and action keys, including larger/Tamil layouts and a saved-control reload. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const b=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let recording,p,checks=0;const errors=[],report={layouts:[],fixture:'First workday, seed ten, a loaded stationary van at the depot. Targets and control actions use real keys.'};
 try{
  p=await b.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));
  const base=process.env.QA_BASE||'http://127.0.0.1:8302';await p.goto(base+'/first-person.html?gfx=low');
  const ready=()=>p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:30000});await ready();await p.addScriptTag({url:base+'/data/i18n/ta.js'});
  const state=()=>p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return {van:{...s.model.van},mode:s.model.mode,signal:s.model.signal,events:OTR.workday.events.filter(e=>e.type==='drive.gear'),target:s.target};});
  const focus=async id=>{for(let i=0;i<32;i++){await p.keyboard.press('p');await wait(130);if((await state()).target===id){assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').art.pick()),id);checks++;return;}}throw Error('Keyboard cannot reach '+id);};
  const use=async id=>{await focus(id);await p.keyboard.press('e');await wait(130);assert.equal((await state()).mode,'cab',id+' must not exit the cab');checks++;};
  for(const [lang,large] of [['en',false],['en',true],['ta',false],['ta',true]]){console.log('cab layout '+lang+' large='+large);
   await p.evaluate(({lang,large})=>{const s=OTR.game.scene.getScene('FirstPersonScene');window.cabToken=s.loadingToken;OTR.i18n.use(lang);OTR.theme.font=lang==='ta'?'"Noto Sans Tamil", "Noto Sans", sans-serif':'"Noto Sans", sans-serif';Object.assign(OTR.a11y.settings(),{large,colour:true,reducedMotion:large});s.scene.restart();},{lang,large});
   await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return !s.loading&&s.loadingToken!==window.cabToken;});
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.keyboardMode=true;s.closePanel();s.progress.sequence=9;s.progress.campaign=null;s.progress.welcomed=true;s.launch('campaign');});await p.waitForFunction(()=>!OTR.game.scene.getScene('FirstPersonScene').transitioning);
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.closePanel();m.mode='cab';m.phase='route';m.departed=true;m.secured=true;m.events[m.briefKey]=true;m.player.pitch=.3;for(const p of m.parcels)Object.assign(p,{location:'slot'+p.stop,loaded:true,scanned:true});OTR.workday.begin();s.sync();s.refresh();});await wait(300);
   await p.waitForFunction(()=>OTR.game.scene.getScene('FirstPersonScene').labels.filter(a=>a.label.gear&&a.object.visible).length===4,{timeout:10000});
   const overview=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.labels.filter(a=>a.label.gear&&a.object.visible).map(a=>a.object.text);});assert.deepEqual(overview,['P','R','N','D']);checks++;
   await p.screenshot({path:path.join(OUT,`c22-cab-${lang}-${large?'large':'normal'}.png`)});
   if(lang==='en'&&!large&&process.env.QA_CLIP==='1')recording=await p.screencast({path:path.join(OUT,'c22-controls.webm'),fps:12,quality:30});
   for(const [id,gear] of [['cab-park',2],['cab-neutral',0],['cab-reverse',-1],['cab-drive',1]]){await use(id);assert.equal((await state()).van.gear,gear);checks++;}
   let s=await state();assert.equal(s.events.length,4);assert.ok(s.events.every(e=>e.ok));assert.equal(new Set(s.events.map(e=>e.key)).size,4);checks+=3;
   for(const [id,field] of [['cab-belt','belt'],['cab-headlights','headlights'],['cab-wipers','wipers']]){await use(id);assert.equal((await state()).van[field],true);checks++;}
   await use('cab-signal-left');assert.equal((await state()).signal,-1);await use('cab-signal-right');assert.equal((await state()).signal,1);checks+=2;
   await use('cab-handbrake');assert.equal((await state()).van.hand,false);await p.keyboard.press('Space');assert.equal((await state()).van.hand,true);checks+=2;
   await p.keyboard.press('r');assert.equal((await state()).van.gear,-1);await p.keyboard.press('r');assert.equal((await state()).van.gear,1);checks+=2;
   await p.keyboard.press('l');await p.keyboard.press('k');s=await state();assert.equal(s.van.headlights,false);assert.equal(s.van.wipers,false);checks+=2;
   const audit=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),h=s.hint,r=h.getBounds();return {font:parseFloat(h.style.fontSize),scale:h.scaleY,bounds:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},fov:s.view.camera.fov,pointerLock:!!document.pointerLockElement,reticle:s.reticle.visible,gearLabels:s.labels.filter(a=>a.label.gear).map(a=>({text:a.object.text,font:parseFloat(a.object.style.fontSize)*a.object.scaleY}))};});
   assert.ok(audit.font*audit.scale>=18);assert.ok(audit.bounds.x>=0&&audit.bounds.right<=1280&&audit.bounds.y>=0&&audit.bounds.bottom<=720);assert.equal(audit.pointerLock,false);assert.equal(audit.reticle,true);if(large)assert.equal(audit.fov,76);checks+=large?5:4;report.layouts.push({lang,large,audit});
   if(recording){await recording.stop();recording=null;}
   if(lang==='en'&&!large){
    await use('cab-headlights');await use('cab-wipers');await use('cab-park');const before=await state();await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').checkpoint());
    await p.reload();await ready();await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.keyboardMode=true;s.closePanel();s.launch('campaign');});await p.waitForFunction(()=>!OTR.game.scene.getScene('FirstPersonScene').transitioning);await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());
    let after=await state();for(const field of ['gear','shifts','headlights','wipers','belt','hand'])assert.equal(after.van[field],before.van[field],field);checks+=6;
    await use('cab-neutral');after=await state();assert.equal(after.van.shifts,before.van.shifts+1);assert.ok(!before.events.some(e=>e.key===after.events[after.events.length-1].key));checks+=2;report.reload={before,after};
   }
   await focus('cab-exit');await p.keyboard.press('e');assert.equal((await state()).mode,'walk');checks++;
  }
  assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>OTR.game.renderer.gl.isContextLost()),false);checks+=2;report.checks=checks;report.errors=errors;fs.writeFileSync(path.join(OUT,'c22-cab.json'),JSON.stringify(report,null,2));console.log(checks+' physical cab browser checks passed');
 }catch(e){if(p){await p.screenshot({path:path.join(OUT,'c22-failure.png')}).catch(()=>{});console.error(await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return {area:s.area,mode:s.model?.mode,panel:!!s.panel,external:s.external,paused:s.model?.paused,gear:s.labels?.filter(a=>a.label.gear).map(a=>({text:a.object.text,visible:a.object.visible,point:a.label.point.toArray()}))};}).catch(()=>({})));}throw e;}finally{if(recording)await recording.stop();await b.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
