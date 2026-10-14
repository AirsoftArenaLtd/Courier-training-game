/* Real 3D scene lifecycle through the shared workday API; completion uses a finished mission fixture. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[];let checks=0;
 try{
  for(const lang of ['en','ta'])for(const large of [false,true]){
   const p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));
   await p.evaluateOnNewDocument(()=>localStorage.clear());
   await p.goto((process.env.QA_BASE||'http://127.0.0.1:8302')+'/index.html?workday3d=1&gfx=low&lang='+lang);
   const active=async key=>{await p.waitForFunction(key=>window.OTR&&OTR.game&&OTR.game.scene.isActive(key),{},key);await new Promise(r=>setTimeout(r,650));};
   const ready=async()=>{await active('FirstPersonScene');await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model&&!s.loading&&!s.transitioning;});};
   await active('TitleScene');
   await p.evaluate(large=>{OTR.save.createProfile('Hooks test');OTR.a11y.settings().large=large;OTR.fx.transition(OTR.game.scene.getScene('TitleScene'),'HubScene');},large);await active('HubScene');
   await p.evaluate(()=>{const progress=OTR.fpStore.read(),old=OTR.fpMission.create('campaign',999);old.elapsed=999;progress.campaign=old.snapshot();OTR.fpStore.write(progress);OTR.workday.start(OTR.game.scene.getScene('HubScene'));});
   await ready();
   assert.ok(await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.hubWorkday&&s.area==='route'&&s.model.elapsed<10&&s.model.seed!==999;}));checks++;
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.closePanel();s.model.elapsed=123;s.model.player.x=-8;OTR.workday.report('brief.read',{key:s.model.seed});s.showPause();});
   await p.screenshot({path:path.join(OUT,`hooks-${lang}-${large?'large':'normal'}-pause.png`)});
   await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').toHub());await active('HubScene');
   assert.equal(await p.evaluate(()=>OTR.fpStore.read().campaign.player.x),-8);checks++;
   await p.evaluate(()=>OTR.workday.resume(OTR.game.scene.getScene('HubScene')));await ready();
   assert.ok(await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model.elapsed>=123&&s.model.player.x===-8&&OTR.workday.events.some(e=>e.type==='brief.read');}));checks++;
   await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').leavePrototype());await active('HubScene');
   await p.evaluate(()=>OTR.workday.resume(OTR.game.scene.getScene('HubScene')));await ready();
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.closePanel();m.events[m.briefKey]=true;m.stops.forEach(stop=>{stop.resolved=true;stop.outcome='handover';});m.phase='return';Object.assign(m.player,{x:-12,z:11});s.showDispatch();s.panel.choices[0].action();});
   await active('ResultsScene');assert.equal(await p.evaluate(()=>OTR.fpStore.read().campaign),null);checks++;
   await p.screenshot({path:path.join(OUT,`hooks-${lang}-${large?'large':'normal'}-results.png`)});
   await p.close();
  }
  assert.deepEqual(errors,[]);console.log(`${checks} real 3D workday lifecycle checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
