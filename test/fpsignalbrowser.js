/* Real remapped cab stalk, game-time lead, driving keys and checkpoint reload; travel poses are fixtures. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const quality=process.env.QA_GFX||'low',tag=process.env.QA_TAG||'b138-'+quality,base=process.env.QA_BASE||'http://127.0.0.1:8355';
 const report={quality,runs:[],checks:0,errors:[],fixture:'Campaign and road poses are fixtures. Stalk selection, remapped action/shortcut, elapsed lead, acceleration and checkpoint reload use real scene/input paths. No shared save-capacity acceptance is claimed.'};let p;
 const b=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  p=await b.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>report.errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/.test(m.text()))report.errors.push(m.text());});
  const ready=()=>p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:90000});
  const frames=async(n=2)=>{const at=await p.evaluate(()=>OTR.game.loop.frame);await p.waitForFunction(({at,n})=>OTR.game.loop.frame>=at+n,{timeout:60000},{at,n});};
  const press=async key=>{await p.keyboard.press(key);await frames();};
  const state=()=>p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;return {elapsed:m.elapsed,clock:m.driving.signalClock,signal:m.signal,speed:m.van.speed,mode:m.mode,target:s.target,events:OTR.workday.events.filter(e=>e.type==='drive.signal').map(e=>({key:e.key,ok:e.ok,stop:e.stop,where:e.where})),paused:m.paused};});
  const focus=async id=>{for(let n=0;n<40;n++){await press('p');if((await state()).target===id){assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').art.pick()),id);report.checks++;return;}}throw Error('Cannot focus '+id);};
  const gameLead=async time=>p.waitForFunction(time=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return m.elapsed-m.driving.signalClock[1]>=time;},{timeout:120000},time);
  const drive=async()=>{await press('v');await press('Space');await p.keyboard.down('w');await p.waitForFunction(()=>OTR.game.scene.getScene('FirstPersonScene').model.van.speed>.4,{timeout:90000});await p.keyboard.up('w');await frames();};
  const launch=async()=>{await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.keyboardMode=true;s.closePanel();s.progress.welcomed=true;s.launch('campaign');});await p.waitForFunction(()=>!OTR.game.scene.getScene('FirstPersonScene').transitioning,{timeout:90000});await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());};
  for(const lang of (process.env.QA_LANGS||'en,ta').split(','))for(const size of (process.env.QA_SIZES||'normal,large').split(',')){
   console.log('signal '+quality+' '+lang+' '+size);await p.goto(base+'/first-person.html?gfx='+quality);await ready();await p.addScriptTag({url:base+'/data/i18n/ta.js'});
   await p.evaluate(({lang,size})=>{const s=OTR.game.scene.getScene('FirstPersonScene');OTR.i18n.use(lang);OTR.theme.font=lang==='ta'?'"Noto Sans Tamil", "Noto Sans", sans-serif':'"Noto Sans", sans-serif';Object.assign(OTR.a11y.settings(),{large:size==='large',colour:true,reducedMotion:true,narrate:true,keys:{KeyE:'KeyO',KeyQ:'KeyT'}});OTR.a11y.save();s.progress.campaign=null;s.progress.sequence=9;},{lang,size});
   await launch();await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;m.mode='cab';m.phase='route';m.departed=m.repaired=m.secured=true;m.events[m.briefKey]=true;OTR.fpLater.depart(m);OTR.fpWalkaroundFlow.depart(m);m.paused=false;Object.assign(m.van,{x:2.84,z:-18,yaw:0,speed:0,gear:1,hand:true,belt:true,look:0});m.player.pitch=0;OTR.workday.begin();s.sync();s.refresh();});await frames();
   await focus('cab-signal-left');await press('o');let a=await state();assert.equal(a.signal,-1);assert.equal(a.mode,'cab');assert.equal(a.events.length,0);report.checks+=3;
   const layout=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),h=s.hint,r=h.getBounds(),source=OTR.i18n.src.get(h)||h.text;return {text:h.text,source,want:OTR.i18n.t(`The left signal is on. Signal for at least three seconds before moving. Press ${OTR.fpAccess.key('KeyE')} to cancel it.`),x:r.x,right:r.right,y:r.y,bottom:r.bottom,font:parseFloat(h.style.fontSize)*h.scaleY,pointerLock:!!document.pointerLockElement};});
   assert.equal(layout.text,layout.want);assert.ok(layout.x>=0&&layout.right<=1280&&layout.y>=0&&layout.bottom<=720,JSON.stringify(layout));assert.ok(layout.font>=18);assert.equal(layout.pointerLock,false);report.checks+=4;
   const run={lang,size,layout};report.runs.push(run);await p.screenshot({path:path.join(OUT,`${tag}-${lang}-${size}-signal.png`)});
   if(lang==='en'&&size==='normal'){
    await gameLead(1.5);const saved=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.paused=true;s.checkpoint();return {elapsed:s.progress.campaign.elapsed,clock:s.progress.campaign.driving.signalClock};});
    await p.reload();await ready();await launch();a=await state();assert.deepEqual(a.clock,saved.clock);assert.equal(a.events.length,0);report.checks+=2;run.reload={saved,restored:a};await p.evaluate(()=>{OTR.game.scene.getScene('FirstPersonScene').model.paused=false;});
   }
   await gameLead(3);await drive();a=await state();assert.equal(a.events.length,1);assert.equal(a.events[0].ok,true);assert.equal(a.events[0].key,'0:1');assert.equal(a.events[0].where,undefined);report.checks+=4;run.right=a;
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;Object.assign(m.van,{x:2.84,z:-18,yaw:0,speed:0,hand:true});m.driving.mirrorDone=false;s.sync();});await frames();
   await press('t');assert.equal((await state()).signal,0);report.checks++;await drive();a=await state();assert.equal(a.events.length,2);assert.equal(a.events[1].ok,false);assert.equal(a.events[1].key,'0:2');assert.ok(a.events[1].where&&Number.isFinite(a.events[1].where.x));report.checks+=4;run.wrong=a;
   await frames(4);assert.equal((await state()).events.length,2);report.checks++;
  }
  assert.deepEqual(report.errors,[]);assert.equal(await p.evaluate(()=>OTR.game.renderer.gl.isContextLost()),false);report.checks+=2;report.complete=true;console.log(report.checks+' '+quality+' native signal checks passed');
 }catch(e){report.failure=e.stack;if(p)await p.screenshot({path:path.join(OUT,tag+'-failure.png')}).catch(()=>{});throw e;}finally{fs.writeFileSync(path.join(OUT,tag+'-signal.json'),JSON.stringify(report,null,2));await b.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
