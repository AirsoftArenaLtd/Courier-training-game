/* Keyboard-only route. Position fixtures skip travel; every interaction and menu uses real keys. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
const day=Number(process.env.QA_DAY)||1,tag=day>1?'c18':'c12';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let p,checks=0;const errors=[],report={};
 try{
  p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));
  if(process.env.QA_NO_AUDIO==='1'){await p.evaluateOnNewDocument(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});report.audioUnavailable=true;}
  const base=process.env.QA_BASE||'http://127.0.0.1:8302';await p.goto(base+'/first-person.html?gfx=low');
  await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);
  const press=async key=>{await p.keyboard.press(key);await wait(200);};
  const pick=async label=>{
   const item=await p.evaluate(label=>{const s=OTR.game.scene.getScene('FirstPersonScene'),h=s.handheld,opts=s.panel?s.panel.choices:h.device.current.options;return {index:opts.findIndex(o=>o.label===label),current:s.panel?s.panel.index:h.index,labels:opts.map(o=>o.label)};},label);
   assert.ok(item.index>=0,'Missing choice '+label+' in '+item.labels);for(let i=0;i<(item.index-item.current+item.labels.length)%item.labels.length;i++)await press('ArrowDown');await press('Enter');checks++;
  };
  await p.evaluate(day=>{OTR.save.data.route.days=day-1;},day);
  await pick('Enter the hub');await press('h');await pick('Start workday');await p.waitForFunction(()=>!OTR.game.scene.getScene('FirstPersonScene').transitioning);await pick('Begin preparation');
  // The standalone lab normally suppresses course writes; use normal storage in this isolated browser context.
  await p.evaluate(()=>{OTR.save.ephemeral=false;window.spoken=[];speechSynthesis.speak=u=>window.spoken.push(u.text);speechSynthesis.cancel=()=>{};});
  await press('h');await pick('Settings');await pick('Accessibility');await pick('Turn reduced motion on');await pick('Turn narration on');await pick('3D controls');
  await pick('Next page');await pick('Next page');
  const interactLabel=await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').panel.choices[0].label);await pick(interactLabel);await press('o');
  assert.equal(await p.evaluate(()=>OTR.a11y.settings().keys.KeyE),'KeyO');checks++;
  await pick('Back');await pick('Back');await pick('Back');await pick('Continue');
  await p.evaluate(()=>{const a=OTR.a11y.settings();Object.assign(a.keys,{KeyW:'KeyI',KeyP:'KeyN',Tab:'KeyU',Space:'KeyL'});OTR.a11y.save();});
  // Arrow look changes orientation, and a remapped movement key moves without requiring a pointer lock.
  const before=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');Object.assign(s.model.player,{x:2.84,z:14.5,yaw:0,pitch:0});s.sync();return {...s.model.player};});
  await p.keyboard.down('ArrowRight');await wait(350);await p.keyboard.up('ArrowRight');
  const looked=await p.evaluate(()=>({...OTR.game.scene.getScene('FirstPersonScene').model.player}));assert.equal(looked.x,before.x);assert.equal(looked.z,before.z);assert.ok(looked.yaw>before.yaw);checks+=3;
  await p.keyboard.down('w');await wait(200);await p.keyboard.up('w');assert.deepEqual(await p.evaluate(()=>{const a=OTR.game.scene.getScene('FirstPersonScene').model.player;return [a.x,a.z];}),[looked.x,looked.z]);checks++;
  await p.keyboard.down('i');await wait(300);await p.keyboard.up('i');assert.notEqual(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.player.z),looked.z);checks++;
  const at=async id=>{
   await p.evaluate(id=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,point=m.point(id);Object.assign(m.player,{x:point.x,z:point.z,yaw:0,pitch:0});
    if(id.startsWith('parcel')&&m.parcel(id).location==='depot')m.player.x-=1.6;
    else if(id.startsWith('gate'))m.player.x-=m.stop(id.slice(4)).side*1.2;
    else if(id.startsWith('door'))m.player.x-=m.stop(id.slice(4)).side*1.5;
    else if(id==='dispatch'||id==='returns')m.player.x-=1.6;
    else if(id.startsWith('slot')||(id.startsWith('parcel')&&m.parcel(id).location.startsWith('slot'))){m.player.x-=Math.sin(m.van.yaw)*.65;m.player.z+=Math.cos(m.van.yaw)*.65;}
    else if(id==='cargo'||id==='secure'){const d=id==='cargo'?1.25:.65;m.player.x-=Math.sin(m.van.yaw)*d;m.player.z+=Math.cos(m.van.yaw)*d;}
    else if(id==='tyres'||id==='driver'){m.player.x-=Math.cos(m.van.yaw)*1.1;m.player.z-=Math.sin(m.van.yaw)*1.1;}
    else if(id==='lights'){m.player.x+=Math.sin(m.van.yaw)*1.2;m.player.z-=Math.cos(m.van.yaw)*1.2;}
    else m.player.z+=.65;s.target=null;s.sync();},id);await wait(50);
  };
  const target=async id=>{for(let n=0;n<15;n++){await press('n');if(await p.evaluate(id=>OTR.game.scene.getScene('FirstPersonScene').target===id,id))return;}throw Error('Keyboard could not select '+id);};
  const use=async id=>{await at(id);await target(id);await press('o');checks++;};
  const scan=async()=>{
   if(!await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.aiming)){await press('u');await pick('Scan package');}
   await p.keyboard.down('l');await p.waitForFunction(()=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld;return h.isOpen&&!h.aiming;},{timeout:15000});await p.keyboard.up('l');
   assert.match(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.device.current.title),/SCAN|RETURN/);checks++;await press('u');
  };
  await use('dispatch');for(let n=0;n<45&&!await p.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return !!m.events[m.briefKey];});n++)await press('Enter');
  assert.equal(await p.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return !!m.events[m.briefKey];}),true);checks++;await p.evaluate(()=>OTR.workday.begin());
  if(day>1){await use('dispatch');await pick('View the workday plan');await pick('View the stop windows');assert.match(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').panel.root.list.filter(o=>o.type==='Text').map(o=>o.text).join(' ')),/minutes after leaving/);checks++;await pick('Back');}
  for(let i=0;i<5;i++){await use('parcel'+i);await scan();if(!i)await use('cargo');await use('slot'+i);}
  await use('secure');await use('cargo');
  for(const id of ['tyres','lights']){await use(id);const repair=await p.evaluate(id=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return m.fault===id&&!m.repaired;},id);await pick(repair?'Request repair':'Mark serviceable');}
  await use('driver');await press('b');await press('m');await press('l');await p.keyboard.down('i');await wait(400);await p.keyboard.up('i');
  assert.ok(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.van.speed>0));checks++;await p.keyboard.down('s');await wait(900);await p.keyboard.up('s');await press('l');await press('o');
  assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.mode),'walk');checks++;
  for(let i=0;i<5;i++){
   await p.evaluate(i=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;Object.assign(m.van,m.stops[i].park,{speed:0,hand:true});m.activeStop=i;m.mode='walk';s.sync();},i);
   await use('cargo');await use('parcel'+i);
   if(await p.evaluate(i=>OTR.game.scene.getScene('FirstPersonScene').model._doorSpecs[i].dog,i)){await use('gate'+i);await pick('Call the owner to secure the dog');}
   await at('door'+i);await scan();await target('door'+i);await press('o');if(!await p.evaluate(i=>OTR.game.scene.getScene('FirstPersonScene').model.stops[i].contacted,i))await pick('Knock / ring');await pick('Record on handheld');
   const spec=await p.evaluate(i=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return {...m._doorSpecs[i],valid:OTR.fpDoors.validID(m,i),expected:OTR.fpDoors.expected(m,i)};},i);
   if(spec.adult||spec.difficult||spec.signature&&spec.present){
    await pick('Delivery checks');
    if(spec.adult){await pick('Check the photo ID');await pick(spec.valid?'Accept the photo ID':'Decline the photo ID and retain the parcel');}
    if(spec.difficult){await pick('Speak with the customer');await pick('Acknowledge the problem and offer a clear next step');}
    if(spec.signature&&spec.present&&spec.expected==='handover'){await pick('Capture the signature');await pick('Record '+spec.person);await p.waitForFunction(i=>!!OTR.game.scene.getScene('FirstPersonScene').model.doorsteps.stops[i].signatureName,{timeout:15000},i);await pick('Back');}
    await pick('Record the delivery outcome');
   }
   await pick({handover:'Hand to resident',safeplace:'Leave in porch box',exception:'Record a delivery exception'}[spec.expected]);await press('u');
   const outcome=await p.evaluate(i=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return {resolved:m.stops[i].resolved,good:m.logs.find(e=>e.id==='outcome:'+i)?.outcome,retained:!!m.heldId};},i);assert.equal(outcome.resolved,true);assert.equal(outcome.good,'good');checks+=2;
   if(outcome.retained)await use('slot'+i);await use('secure');await use('cargo');console.log('keyboard stop '+(i+1));
  }
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');Object.assign(s.model.van,{x:2.84,z:8,yaw:0,speed:0,hand:true});s.sync();});await use('cargo');
  for(const id of await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.parcels.filter(p=>p.returnRequired).map(p=>p.id))){await use(id);await use('returns');await scan();}
  await use('dispatch');await pick('Finish workday');assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.phase),'debrief');checks++;
  report.keyboard=await p.evaluate(()=>({day:OTR.game.scene.getScene('FirstPersonScene').model.routePlan.day,weather:OTR.game.scene.getScene('FirstPersonScene').model.routeDay.weather,later:OTR.game.scene.getScene('FirstPersonScene').model.routeDay.later||null,seed:OTR.game.scene.getScene('FirstPersonScene').model.seed,keys:OTR.a11y.settings().keys,pointerLock:!!document.pointerLockElement,narrated:window.spoken.length}));assert.equal(report.keyboard.pointerLock,false);assert.ok(report.keyboard.narrated>20);checks+=2;if(day>1){assert.equal(report.keyboard.day,day);assert.equal(report.keyboard.weather,['fog','rain','ice'][(day-2)%3]);assert.ok(report.keyboard.later.departAt!==null&&report.keyboard.later.arrivals.every(a=>a!==null));checks+=3;}
  await p.screenshot({path:path.join(OUT,tag+'-keyboard-day.png')});
  report.motion=await p.evaluate(()=>{
   const s=OTR.game.scene.getScene('FirstPersonScene');s.closePanel();const m=OTR.fpMission.create('campaign',7,OTR.fpRoute.plan(2,7));OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);s.model=m;s.rebuildWorld();m.mode='cab';m.phase='route';m.paused=false;m.step=()=>{};
   const x=m.town.xs[0]+2,z=m.town.zs[1]+25;Object.assign(m.van,{x,z,yaw:0,speed:0,hand:true});Object.assign(m.driving.bus,{state:'flashing',x,z:z-18,yaw:0});Object.assign(m.driving.siren,{state:'passing',x:x-1,z:z+14,yaw:0});OTR.fpDriving.syncActors(m);
   const sample=(reduced,time)=>{OTR.a11y.settings().reducedMotion=reduced;m.elapsed=time;m.mirrorAt=time;s.sync();return {rain:Array.from(s.art.weatherDrops.instanceMatrix.array),bus:s.art.busLamps.visible,emergency:s.art.emergencyLamps.children.map(o=>o.material.color.getHex()),camera:s.view.camera.position.toArray()};};
   const result={moving:[sample(false,.1),sample(false,.6)],reduced:[sample(true,.1),sample(true,.6)]};OTR.a11y.settings().colour=true;OTR.a11y.applyColour(s);return result;
  });
  assert.notDeepEqual(report.motion.moving[0].rain,report.motion.moving[1].rain);assert.notEqual(report.motion.moving[0].bus,report.motion.moving[1].bus);assert.deepEqual(report.motion.reduced[0],report.motion.reduced[1]);checks+=3;
  // Keep the report compact; the equality assertions above compare every instance and lamp.
  report.motion={weatherMoves:true,normalBusChanges:true,reducedWeatherAndLightsStayStill:true,cameraStaysStill:true};
  await wait(300);await p.screenshot({path:path.join(OUT,'c12-colour-mirror.png')});
  // Real shared-context pixels prove the main view and a sampled physical mirror receive the matrix exactly once.
  report.filter=await p.evaluate(async()=>{
   const s=OTR.game.scene.getScene('FirstPersonScene'),v=s.view,gl=OTR.game.renderer.gl;s.handheld.close();s.closePanel();s.sync=()=>{};s.refresh=()=>{};s.model.paused=true;
   for(const o of s.children.list)if(o.type!=='Extern')o.setVisible(false);for(const o of v.world.children)o.visible=false;v.world.background.setHex(0xff0000);v.world.fog=null;
   const physical=s.art.mirrors;physical.root.visible=true;physical.frames.visible=false;if(physical.mounts!==physical.frames)physical.mounts.visible=false;
   const eye=physical.root.localToWorld(new THREE.Vector3(-.45,2.05,-1.85)),point=physical.targets[0].getWorldPosition(new THREE.Vector3());v.camera.position.copy(eye);v.camera.lookAt(point);v.camera.updateMatrixWorld(true);
   v.mirror.on=true;v.mirror.before=()=>physical.root.visible=false;v.mirror.after=()=>physical.root.visible=true;
   const sample=async colour=>{OTR.a11y.settings().colour=colour;OTR.a11y.applyColour(s);const before=v.mirror.updates[0];return new Promise(resolve=>{const done=()=>{if(v.mirror.updates[0]<before+2)return;s.game.events.off('postrender',done);const read=(x,y)=>{const b=new Uint8Array(4);gl.readPixels(x,720-y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,b);return Array.from(b);};resolve({main:read(50,360),mirror:read(640,360),...v.diagnostics});};s.game.events.on('postrender',done);});};
   return {off:await sample(false),on:await sample(true)};
  });
  for(const view of ['main','mirror']){const off=report.filter.off[view],on=report.filter.on[view];assert.ok(off[0]>230,JSON.stringify(report.filter));assert.ok(off[1]<5);assert.ok(Math.abs(on[1]-(off[0]*.163+off[1]*.725+off[2]*.112))<4,JSON.stringify(report.filter));assert.ok(Math.abs(on[2]-(off[0]*.455-off[1]*.645+off[2]*1.191))<4,JSON.stringify(report.filter));checks+=4;}
  assert.equal(report.filter.on.textures,2);assert.equal(report.filter.on.calls,report.filter.off.calls);checks+=2;
  fs.writeFileSync(path.join(OUT,tag+'-accessibility.json'),JSON.stringify(report,null,2));
  // Recreate the scene, retaining the actual saved remaps, then exercise large Tamil controls.
  await p.reload();await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);
  await p.addScriptTag({url:base+'/data/i18n/ta.js'});await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');window.layoutToken=s.loadingToken;OTR.i18n.use('ta');OTR.a11y.settings().large=true;OTR.a11y.save();s.scene.restart();});
  await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.loadingToken!==window.layoutToken&&!s.loading;});await press('h');await pick('Settings');await pick('Accessibility');await pick('3D controls');
  report.layout=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),bad=[];for(const o of s.panel.root.list)if(o.type==='Text'){const b=o.getBounds();if(b.x<100||b.right>1180||b.y<90||b.bottom>635||parseFloat(o.style.fontSize)*Math.min(o.scaleX,o.scaleY)<17)bad.push(o.text);}return {bad,objectiveFont:parseFloat(s.objective.style.fontSize),key:OTR.a11y.settings().keys.KeyE};});assert.deepEqual(report.layout.bad,[]);assert.equal(report.layout.objectiveFont,23);assert.equal(report.layout.key,'KeyO');checks+=3;
  await p.screenshot({path:path.join(OUT,'c12-controls-ta-large.png')});assert.deepEqual(errors,[]);checks++;
  report.checks=checks;report.errors=errors;fs.writeFileSync(path.join(OUT,tag+'-accessibility.json'),JSON.stringify(report,null,2));console.log(checks+' keyboard accessibility checks passed');
 }catch(e){if(p)await p.screenshot({path:path.join(OUT,'c12-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
