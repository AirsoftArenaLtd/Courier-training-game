/* C-20: real keyboard driving, a recorded manoeuvre, and rendered suspension. Travel starts from a fixture. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let recording,checks=0;const errors=[],report={fixture:'Day one, seed seven, loaded van at the depot. Gear, brakes, throttle and steering use real keys.'};
 try{
  const p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));
  await p.goto((process.env.QA_BASE||'http://127.0.0.1:8302')+'/first-person.html?gfx=low');
  await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.closePanel();s.launch('campaign');});
  await p.waitForFunction(()=>!OTR.game.scene.getScene('FirstPersonScene').transitioning);
  await p.evaluate(()=>{
   const s=OTR.game.scene.getScene('FirstPersonScene'),m=OTR.fpMission.create('campaign',7,OTR.fpRoute.plan(1,7));
   OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);s.closePanel();s.model=m;s.rebuildWorld();
   m.mode='cab';m.phase='route';m.departed=true;m.secured=true;m.paused=false;m.events[m.briefKey]=true;
   for(const parcel of m.parcels){parcel.location='slot'+parcel.stop;parcel.loaded=true;parcel.scanned=true;}
   Object.assign(m.van,{x:2.84,z:8,yaw:0,speed:0,hand:true,belt:false});s.sync();s.refresh();
  });
  const state=()=>p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;return {van:{...m.van},motion:{...m.motion},time:m.elapsed,contextLost:OTR.game.renderer.gl.isContextLost()};});
  const advance=async seconds=>{await p.evaluate(()=>{window.motorStart=OTR.game.scene.getScene('FirstPersonScene').model.elapsed;});await p.waitForFunction(seconds=>OTR.game.scene.getScene('FirstPersonScene').model.elapsed-window.motorStart>=seconds,{timeout:30000},seconds);};
  if(process.env.QA_CLIP==='1')recording=await p.screencast({path:path.join(OUT,'c20-manoeuvre.webm'),fps:15,quality:35});
  await p.keyboard.press('b');await p.keyboard.down('s');await p.keyboard.press('r');await p.keyboard.press('Space');await advance(.3);
  let a=await state();assert.equal(a.van.gear,-1);assert.equal(a.van.hand,false);assert.equal(a.van.belt,true);assert.equal(a.van.speed,0);checks+=4;
  await p.keyboard.up('s');await advance(3);a=await state();assert.ok(a.van.speed<-.3&&a.van.speed>-.36);assert.ok(a.van.z>8.7);checks+=2;report.creep=a;
  await p.keyboard.down('d');await p.keyboard.down('w');await advance(1.8);await p.keyboard.up('w');await p.keyboard.up('d');
  a=await state();assert.ok(a.van.yaw<-.15,JSON.stringify(a));assert.ok(a.van.x<report.creep.van.x-.05,JSON.stringify(a));assert.ok(a.van.speed>=-1.7&&a.van.speed< -1.6);assert.equal(a.motion.contact,false);checks+=4;report.reverse=a;
  await p.screenshot({path:path.join(OUT,'c20-reverse.png')});
  await p.keyboard.down('s');await advance(1);a=await state();assert.equal(a.van.speed,0);checks++;
  await p.keyboard.press('r');a=await state();assert.equal(a.van.gear,1);checks++;
  await p.keyboard.up('s');await p.keyboard.down('w');await advance(2);await p.keyboard.up('w');a=await state();assert.ok(a.van.speed>3);checks++;report.forward=a;
  await p.keyboard.down('s');await advance(.15);a=await state();assert.ok(a.motion.pitch<-.01);assert.ok(a.motion.frontLoad>a.motion.rearLoad);checks+=2;report.brake=a;
  await advance(1.2);await p.keyboard.press('Space');await p.keyboard.up('s');a=await state();assert.equal(a.van.speed,0);assert.equal(a.van.hand,true);checks+=2;
  if(recording){await recording.stop();recording=null;}
  // A fixed observer shows the actual suspension pose; the driving camera remains unchanged until C-21.
  report.body=await p.evaluate(()=>{
   const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;m.paused=true;m.mode='walk';OTR.fp.suspension(m,1,-6,4);
   const observer=OTR.fp.local(m.van,-5,8);Object.assign(m.player,observer,{yaw:0,pitch:0});s.sync();
   s.view.camera.position.set(observer.x,3,observer.z);s.view.camera.lookAt(m.van.x,1.5,m.van.z);s.view.camera.updateMatrixWorld(true);
   s.sync=()=>{};return {pitch:s.art.chassis.rotation.x,roll:s.art.chassis.rotation.z,tyres:s.art.van.rotation.x};
  });
  assert.ok(report.body.pitch<-.03);assert.ok(report.body.roll>.015);assert.equal(report.body.tyres,0);checks+=3;
  await p.screenshot({path:path.join(OUT,'c20-brake-dive.png')});
  report.reduced=await p.evaluate(()=>{
   const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,a=OTR.a11y.settings();Object.assign(a,{reducedMotion:true,large:true,colour:true});
   OTR.a11y.applyColour(s);m.mode='cab';m.van.hand=true;
   s.art.sync(m,null,'route');s.objective.setFontSize(23);s.refresh();
   return {pitch:s.art.chassis.rotation.x,roll:s.art.chassis.rotation.z,speed:m.van.speed,font:parseFloat(s.objective.style.fontSize),pointerLock:!!document.pointerLockElement};
  });
  assert.equal(report.reduced.pitch,0);assert.equal(report.reduced.roll,0);assert.equal(report.reduced.speed,0);assert.equal(report.reduced.pointerLock,false);assert.ok(report.reduced.font>=23);checks+=5;
  await p.screenshot({path:path.join(OUT,'c20-accessible-cab.png')});
  assert.deepEqual(errors,[]);assert.equal((await state()).contextLost,false);checks+=2;report.checks=checks;report.errors=errors;
  fs.writeFileSync(path.join(OUT,'c20-dynamics.json'),JSON.stringify(report,null,2));console.log(checks+' dynamics browser checks passed');
 }finally{if(recording)await recording.stop();await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
