/* Real-key camera feel, physical dashboard anchoring, accessibility and approved trainer rules on resume. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 let recording,checks=0;const errors=[],report={fixture:'First workday, seed ten, loaded van at the depot. Travel setup is a fixture; driving and looking use real keys.'};
 try{
  const p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));
  await p.goto((process.env.QA_BASE||'http://127.0.0.1:8302')+'/first-person.html?gfx=low');
  const ready=()=>p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:30000});await ready();
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.keyboardMode=true;s.closePanel();s.progress.sequence=9;s.progress.campaign=null;s.launch('campaign');});
  await p.waitForFunction(()=>!OTR.game.scene.getScene('FirstPersonScene').transitioning);
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.closePanel();m.mode='cab';m.phase='route';m.departed=true;m.secured=true;m.events[m.briefKey]=true;for(const p of m.parcels)Object.assign(p,{location:'slot'+p.stop,zone:'slot'+p.stop,loaded:true,scanned:true});Object.assign(m.van,{x:2.84,z:8,yaw:0,speed:0,hand:true,belt:true});s.sync();});
  const state=()=>p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;return {van:{...m.van},pose:{...m.cameraMotion},motion:{...m.motion},fov:s.view.camera.fov,assist:m.driveAssist,dash:s.view.camera.getObjectByName('cab-dashboard').matrixWorld.toArray()};});
  const advance=async seconds=>{await p.evaluate(()=>window.cameraStart=OTR.game.scene.getScene('FirstPersonScene').model.elapsed);await p.waitForFunction(seconds=>OTR.game.scene.getScene('FirstPersonScene').model.elapsed-window.cameraStart>=seconds,{timeout:30000},seconds);};
  const initial=await state();assert.equal(initial.assist,1);assert.equal(initial.fov,68);checks+=2;
  if(process.env.QA_CLIP==='1')recording=await p.screencast({path:path.join(OUT,'c21-camera.webm'),fps:15,quality:35});
  await p.keyboard.press('Space');await p.keyboard.down('w');await advance(1.3);await p.keyboard.down('d');await advance(.55);await p.keyboard.up('w');await p.keyboard.up('d');
  const turn=await state();assert.ok(turn.van.speed>2);assert.ok(turn.van.yaw>.05);assert.ok(turn.fov>68.05&&turn.fov<=70);assert.ok(turn.pose.bodyRoll>0);assert.ok(Math.abs(turn.pose.yaw-turn.van.yaw)<.15);checks+=5;report.turn=turn;
  await p.screenshot({path:path.join(OUT,'c21-turn.png')});
  await p.keyboard.down('s');await advance(.25);const brake=await state();assert.ok(brake.pose.bodyPitch<-.01);assert.ok(brake.pose.y<2.04);checks+=2;report.brake=brake;
  await p.screenshot({path:path.join(OUT,'c21-brake.png')});await advance(1);await p.keyboard.up('s');await p.keyboard.press('Space');await advance(2);
  const beforeLook=await state();await p.keyboard.down('ArrowLeft');await advance(.35);await p.keyboard.up('ArrowLeft');const looked=await state();assert.ok(Math.abs(looked.van.look)>.1);assert.ok(Math.abs(looked.pose.yaw-beforeLook.pose.yaw)>.1);
  for(let i=0;i<16;i++)assert.ok(Math.abs(looked.dash[i]-beforeLook.dash[i])<.001);checks+=3;report.look=looked;
  await p.screenshot({path:path.join(OUT,'c21-look.png')});await p.keyboard.press('v');
  if(recording){await recording.stop();recording=null;}
  report.reduced=await p.evaluate(()=>{
   const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,a=OTR.a11y.settings();Object.assign(a,{large:true,colour:true,reducedMotion:true});OTR.a11y.applyColour(s);s.objective.setFontSize(23);m.step=()=>{};m.paused=false;m.van.speed=6;m.van.steer=.15;OTR.fp.suspension(m,1,-6,4);
   const snapshot=JSON.stringify(m.snapshot());s.sync();const sample=()=>({position:s.view.camera.position.toArray(),rotation:s.view.camera.rotation.toArray(),fov:s.view.camera.fov,chassis:s.art.chassis.rotation.toArray(),font:parseFloat(s.objective.style.fontSize)});const first=sample();s.sync();const second=sample();
   return {first,second,sameSavedState:snapshot===JSON.stringify(m.snapshot()),pointerLock:!!document.pointerLockElement};
  });
  assert.deepEqual(report.reduced.first,report.reduced.second);assert.equal(report.reduced.first.fov,68);assert.equal(report.reduced.first.chassis[0],0);assert.equal(report.reduced.first.chassis[2],0);assert.ok(report.reduced.first.font>=23);assert.equal(report.reduced.sameSavedState,true);assert.equal(report.reduced.pointerLock,false);checks+=7;
  await p.screenshot({path:path.join(OUT,'c21-reduced-large.png')});
  report.resume=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;Object.assign(m.van,{speed:0,steer:0,hand:true});OTR.save.ephemeral=false;OTR.a11y.save();const rules=OTR.academy.merge({workday:{assists:'off'}});localStorage.setItem('otr_academy',JSON.stringify(rules));s.checkpoint();return {seed:m.seed,day:m.routePlan.day,savedAssist:m.snapshot().driveAssist,savedCamera:m.snapshot().cameraMotion};});
  assert.equal(report.resume.seed,10);assert.equal(report.resume.savedAssist,undefined);assert.equal(report.resume.savedCamera,undefined);checks+=3;
  await p.reload();await ready();await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.keyboardMode=true;s.closePanel();s.launch('campaign');});await p.waitForFunction(()=>!OTR.game.scene.getScene('FirstPersonScene').transitioning);
  const resumed=await state();assert.equal(resumed.assist,0);assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.seed),10);assert.equal(await p.evaluate(()=>OTR.a11y.settings().reducedMotion),true);checks+=3;report.resume.assistAfterReload=resumed.assist;
  report.levels=await p.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model,result=[];for(const assists of ['full','light','off']){OTR.academy.settings=OTR.academy.merge({workday:{assists}});OTR.fp.applyDriveRules(m);result.push(m.driveAssist);}return result;});assert.deepEqual(report.levels,[1,.5,0]);checks++;
  assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>OTR.game.renderer.gl.isContextLost()),false);checks+=2;report.checks=checks;report.errors=errors;
  fs.writeFileSync(path.join(OUT,'c21-camera.json'),JSON.stringify(report,null,2));console.log(checks+' camera browser checks passed');
 }finally{if(recording)await recording.stop();await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
