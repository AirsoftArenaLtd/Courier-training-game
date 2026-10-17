#!/usr/bin/env node
/* Unmodified ?bench=1 plus raw-frame samples of the first-person prototype. Run one browser at a time. */
const fs=require('node:fs'),path=require('node:path'),pp=require('puppeteer-core');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8302',GFX=process.env.QA_GFX||'high',TAG=process.env.QA_TAG||'current';
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'];
 if(process.env.QA_NATIVE_GPU!=='1')args.push('--use-angle=swiftshader','--enable-unsafe-swiftshader');
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args});
 const errors=[];let report={tag:TAG,quality:GFX,textureDimensions:"intrinsic image/canvas"};
 try{
  const p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));
  if(process.env.QA_THEME){const theme=JSON.parse(process.env.QA_THEME);report.companyTheme=theme.companyName||'custom';await p.setRequestInterception(true);p.on('request',r=>{if(r.url().endsWith('/data/theme.js'))r.respond({status:200,contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'../data/theme.js'),'utf8')+'\nObject.assign(OTR_DATA.theme,'+JSON.stringify(theme)+');'});else r.continue();});}
  if(process.env.QA_PROTOTYPE_ONLY!=='1'){
  await p.goto(BASE+'/index.html?bench=1&gfx='+GFX);
  const end=Date.now()+360000;let last=-1;
  while(Date.now()<end){const result=await p.evaluate(()=>{const s=window.OTR&&OTR.game&&OTR.game.scene.getScene('BenchScene');return s?{count:s.results.length,done:!!s.report}:{};});
   if(result.count!==last){last=result.count;console.log(TAG+' '+GFX+' benchmark screens: '+last);}
   if(result.done)break;await wait(1000);
  }
  report.bench=await p.evaluate(()=>{const s=OTR.game.scene.getScene('BenchScene');if(!s.report)throw Error('Benchmark did not finish');return {gpu:s.gpu(),results:s.results,report:s.report};});
  if(report.bench.results.some(r=>r.avg<=0||r.low<=0))throw Error('Benchmark screen has no measured frames');
  await p.screenshot({path:path.join(OUT,`bench-${TAG}-${GFX}.png`)});
  }
  await p.goto(BASE+'/first-person.html?gfx='+GFX);
  await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:30000});
  if(process.env.QA_SOUND==='1'){await p.keyboard.press('Shift');await p.waitForFunction(()=>OTR.audio.ctx&&OTR.audio.ctx.state==='running');report.audioContext='running';}
  report.accessibility=(process.env.QA_A11Y||'').split(',').filter(Boolean);
  await p.evaluate(options=>{const s=OTR.game.scene.getScene('FirstPersonScene'),a=OTR.a11y.settings();a.colour=options.includes('colour');a.large=options.includes('large');a.reducedMotion=options.includes('reduced');OTR.a11y.applyColour(s);if(a.large){s.objective.setFontSize(23);s.hint.setFontSize(OTR.a11y.size(18));}},report.accessibility);
  report.renderer=await p.evaluate(()=>{const gl=OTR.game.renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return {name:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),width:gl.drawingBufferWidth,height:gl.drawingBufferHeight};});
  report.actualQuality=await p.evaluate(()=>OTR.gfx.level());
  report.assets=await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').assetBank?.stats||null);
  const inventory=async()=>p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),geometries=new Set(),materials=new Set(),arrays=new Set();let geometryBytes=0,instanceBytes=0,meshes=0,instances=0,shadowCasters=0;
   s.view.world.traverse(o=>{if(!o.isMesh)return;meshes++;if(o.castShadow)shadowCasters++;if(o.isInstancedMesh){instances+=o.count;instanceBytes+=o.instanceMatrix.array.byteLength+(o.instanceColor?o.instanceColor.array.byteLength:0);}if(o.material)materials.add(o.material);if(o.geometry&&!geometries.has(o.geometry)){geometries.add(o.geometry);for(const a of [...Object.values(o.geometry.attributes),o.geometry.index].filter(Boolean)){const array=a.array||a.data&&a.data.array;if(array&&!arrays.has(array)){arrays.add(array);geometryBytes+=array.byteLength;}}}});
   return {meshes,instances,geometries:geometries.size,materials:materials.size,geometryBytes,instanceBytes,shadowCasters};});
  const textures=async()=>p.evaluate(()=>{const seen=new Set();let count=0,rgbaBytes=0;for(const texture of Object.values(OTR.game.textures.list))for(const source of texture.source||[]){const key=source.glTexture||source;if(seen.has(key))continue;seen.add(key);count++;const image=source.image,w=image&&(image.naturalWidth||image.videoWidth||image.width)||source.width,h=image&&(image.naturalHeight||image.videoHeight||image.height)||source.height;rgbaBytes+=w*h*4;}return {count,baseLevelRGBABytes:rgbaBytes,withMipmapsUpperBytes:Math.ceil(rgbaBytes*4/3)};});
  const sample=async name=>{
   if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(name))return;
   await wait(1500);
   const value=await p.evaluate(()=>new Promise(resolve=>{const frames=[],keys=['calls','triangles','textures','geometries','attachmentBytes'],peak={calls:0,triangles:0,textures:0,geometries:0,attachmentBytes:0};let prev=performance.now(),start=prev;const onFrame=()=>{const now=performance.now();frames.push(now-prev);prev=now;
    const d=OTR.game.scene.getScene('FirstPersonScene').view.diagnostics;
    if(d)for(const key of keys)peak[key]=Math.max(peak[key],d[key]);
    if(now-start<10000)return;
    OTR.game.events.off('step',onFrame);frames.sort((a,b)=>a-b);const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,worst=frames.slice(Math.floor(frames.length*.99));
    resolve({frames:frames.length,avgFPS:+(1000/mean(frames)).toFixed(2),low1FPS:+(1000/mean(worst)).toFixed(2),p99ms:+frames[Math.floor(frames.length*.99)].toFixed(2),maxMs:+frames[frames.length-1].toFixed(2),peak,target:d&&{width:d.targetWidth,height:d.targetHeight},contextLost:OTR.game.renderer.gl.isContextLost()});};OTR.game.events.on('step',onFrame);}));
   value.phaserTextures=await textures();value.worldProfile=await inventory();value.mirrorViews=await p.evaluate(()=>{const v=OTR.game.scene.getScene('FirstPersonScene').view.mirror;return {updates:v.updates,cells:v.cameras&&v.cameras.length,physical:!!v.physical,rearCamera:!!v.rearCamera,reversing:!!v.rearOn};});value.camera=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return {fov:s.view.camera.fov,pose:s.model&&s.model.cameraMotion||null};});console.log(TAG+' '+GFX+' '+name+' '+JSON.stringify(value));report.prototype[name]=value;if(process.env.QA_SHOTS==='1')await p.screenshot({path:path.join(OUT,`${TAG}-${GFX}-${name}.png`)});
  };
  const lookAtTarget=async id=>p.evaluate(id=>{const s=OTR.game.scene.getScene('FirstPersonScene');if(!OTR.fpMirrors)return false;s.target=null;for(let n=0;n<32;n++)if(OTR.fpAccess.focus(s)===id){s.notice='';s.refresh();return true;}throw Error('Benchmark target is unreachable: '+id);},id);
  report.prototype={};
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());await sample('hub');
  if(await p.evaluate(()=>!!OTR.fpGuide)){await p.evaluate(()=>OTR.fpGuide.open(OTR.game.scene.getScene('FirstPersonScene')));await sample('guide');await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());}
  if(await p.evaluate(()=>!!OTR.fpSound)){await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').workdaySound.menu());await sample('soundsettings');await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());}
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').launch('campaign'));
  await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model&&!s.transitioning;});
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());await sample('depot');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.mode='cab';s.model.paused=false;s.sync();});await sample('cab');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');if(!OTR.fpMirrors){s.__mirrorBench=()=>s.model.mirrorAt=s.model.elapsed;s.events.on('update',s.__mirrorBench);}});await lookAtTarget('mirror-left');await sample('mirror');
  if(await lookAtTarget('mirror-right'))await sample('mirrorRight');if(await lookAtTarget('mirror-interior'))await sample('mirrorInterior');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');if(s.__mirrorBench)s.events.off('update',s.__mirrorBench);s.model.van.look=0;s.model.player.pitch=0;s.model.mode='walk';s.showScanner();});await sample('handheld');
  const hasAim=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');if(!s.handheld)return false;
   const p=s.model.parcels[0];p.location='held';s.model.heldId=p.id;s.handheld.scan();return true;});
  if(hasAim)await sample('barcodeAim');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.model.mode='cab';Object.assign(s.model.van,s.model.stops[0].park||{x:4,z:-42,yaw:0},{speed:0,hand:true});s.sync();});await sample('firstStop');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.mode='walk';const stop=s.model.stops[0];Object.assign(s.model.player,{x:stop.x-(stop.side||1)*1.5,z:stop.z,yaw:(stop.side||1)*Math.PI/2,pitch:0});s.sync();});await sample('doorstep');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.phase='return';Object.assign(s.model.van,{x:4,z:8,yaw:0,speed:0,hand:true});Object.assign(s.model.player,{x:12.2,z:5,yaw:-Math.PI/2,pitch:0});s.sync();});await sample('returns');
  for(let i=0;i<5;i++){
   await p.evaluate(i=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;if(!m.stops[i])return;m.mode='cab';m.phase='route';Object.assign(m.van,m.stops[i].park||{x:4,z:m.stops[i].z,yaw:0},{speed:0,hand:true});s.sync();},i);
   if(i>0)await sample('stop'+(i+1));
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');if(!OTR.fpMirrors){s.__mirrorBench=()=>s.model.mirrorAt=s.model.elapsed;s.events.on('update',s.__mirrorBench);}});
   await lookAtTarget('mirror-left');await sample('stop'+(i+1)+'Mirror');
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');if(s.__mirrorBench)s.events.off('update',s.__mirrorBench);s.model.van.look=0;s.model.player.pitch=0;s.model.mirrorAt=-100;});
  }
  if(await p.evaluate(()=>!!OTR.game.scene.getScene('FirstPersonScene').model.driving)){
   for(const look of ['front','mirror','walk']){
    await p.evaluate(look=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;m.paused=false;m.step=()=>{};m.phase='route';m.mode=look==='walk'?'walk':'cab';m.elapsed=0;
     const x=m.town.xs[0]+2,z=m.town.zs[1]+25;Object.assign(m.van,{x,z,yaw:0,speed:0,hand:true});Object.assign(m.player,{x:x-2,z:z+8,yaw:0,pitch:0});
     Object.assign(m.driving.bus,{state:'flashing',x,z:z-18,yaw:0});Object.assign(m.driving.siren,{state:'passing',x:x-1,z:z+14,yaw:0});OTR.fpDriving.syncActors(m);m.mirrorAt=look==='mirror'?0:-100;s.sync();},look);
    if(look==='mirror')await lookAtTarget('mirror-left');await sample('hazards'+look);
   }
  }
  if(await p.evaluate(()=>!!OTR.fpDay))for(const day of [2,6,4,3]){
   const weather=await p.evaluate(day=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const m=OTR.fpMission.create('campaign',7,OTR.fpRoute.plan(day,7));OTR.fpDay.configure(m);if(OTR.fpLoadout)OTR.fpLoadout.configure(m,'extra');
    if(OTR.fpDoors){OTR.fpDoors.configure(m);m.stops.forEach(stop=>stop.contacted=true);OTR.fpDoors.sync(m);}
    if(OTR.fpDriving){OTR.fpDriving.configure(m);const x=m.town.xs[0]+2,z=m.town.zs[1]+25;Object.assign(m.driving.bus,{state:'flashing',x,z:z-18,yaw:0});Object.assign(m.driving.siren,{state:'passing',x:x-1,z:z+14,yaw:0});OTR.fpDriving.syncActors(m);}
    s.model=m;s.rebuildWorld();m.mode='cab';m.paused=false;m.step=()=>{};Object.assign(m.van,{x:m.town.xs[0]+2,z:m.town.zs[1]+25,yaw:0,speed:0,hand:true});s.__weatherMirror=()=>{m.mirrorAt=m.elapsed;m.elapsed+=.016;};s.events.on('update',s.__weatherMirror);s.sync();return m.routeDay.weather;},day);
   await lookAtTarget('mirror-left');await sample('weather'+weather+'Mirror');await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.events.off('update',s.__weatherMirror);});
  }
  if(await p.evaluate(()=>!!OTR.fpDoors))for(const look of ['gate','hazard','mirror','signature','id']){
   await p.evaluate(look=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();let m,id;
    for(let seed=1;seed<100;seed++){
     m=OTR.fpMission.create('campaign',seed,OTR.fpRoute.plan(4,seed));OTR.fpDay.configure(m);OTR.fpLoadout.configure(m,'extra');OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);
     id=m._doorSpecs.findIndex(a=>look==='gate'||look==='mirror'?a.dog:look==='hazard'?!!a.hazard:look==='id'?a.adult:a.signature&&a.present&&!a.dog&&!a.wrong);if(id>=0)break;
    }if(id<0)throw Error('No doorstep benchmark fixture');
    const stop=m.stops[id],p=m.parcels[id];m.stops.forEach(a=>a.contacted=true);OTR.fpDoors.sync(m);m.activeStop=id;m.phase='route';m.departed=true;m.events[m.briefKey]=true;m.mode=look==='mirror'?'cab':'walk';m.paused=false;m.step=()=>{};
    Object.assign(m.van,stop.park,{speed:0,hand:true});Object.assign(m.player,{x:stop.x-stop.side*(look==='gate'?3.8:3.2),z:stop.z,yaw:stop.side*Math.PI/2,pitch:look==='hazard'?.5:.1});
    Object.assign(m.driving.bus,{state:'flashing',x:m.van.x,z:m.van.z-18,yaw:0});Object.assign(m.driving.siren,{state:'passing',x:m.van.x-1,z:m.van.z+14,yaw:0});OTR.fpDriving.syncActors(m);
    s.model=m;s.rebuildWorld();m.mirrorAt=look==='mirror'?m.elapsed:-100;s.sync();
    if(look==='signature'){
     Object.assign(m.player,{x:stop.x-stop.side*1.5,z:stop.z});Object.assign(p,{location:'held',loaded:true,scanned:true,stopScanned:true});m.heldId=p.id;
     // Keep the existing live signature widget visible through the measurement, including its ink texture.
     s.handheld.show({title:'SIGNATURE',lines:['The recipient signs below.'],widget:{type:'signature',onDone:()=>{}},options:[{label:'Cancel',onPick:()=>s.handheld.close()}]});
    }else if(look==='id'){Object.assign(m.player,{x:stop.x-stop.side*1.5,z:stop.z});s.showIdentity(id);}
   },look);if(look==='mirror')await lookAtTarget('mirror-left');await sample('door'+look);
  }
  if(await p.evaluate(()=>!!OTR.fpLater))for(const look of ['fog','fogmirror','fogreverse','rainmirror','icemirror','plan','stress','stressbrake','stressturn','stressturnleft','stressreverse','stresscab','mirrorpeak','rearpeak']){
   if(look==='stresscab'&&!await p.evaluate(()=>!!OTR.fpCab))continue;
   await p.evaluate(look=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();
    const stress=look.startsWith('stress')||look==='mirrorpeak'||look==='rearpeak',day=look==='rearpeak'?21:look==='mirrorpeak'?6:stress?18:look==='icemirror'?4:look==='rainmirror'?3:2,seed=look==='rearpeak'?10:look==='mirrorpeak'?9:stress?2:7,m=OTR.fpMission.create('campaign',seed,OTR.fpLater.prepare(OTR.fpRoute.plan(day,seed)));
    OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);const r=m.roadworks,reverse=look==='fogreverse';
    m.mode='cab';m.phase='route';m.departed=true;OTR.fpLater.depart(m);m.paused=false;m.events[m.briefKey]=true;m.step=()=>{};
    Object.assign(m.van,{x:r.x+(reverse?-1.7:1.7),z:r.z+(reverse?-10:10),yaw:reverse?Math.PI:0,speed:0,hand:true,belt:true});
    m.stops.forEach(a=>a.contacted=true);OTR.fpDoors.sync(m);if(stress){OTR.fpLoadout.configure(m,'extra');for(const p of m.parcels)p.location='slot'+(p.anomaly?5:p.stop);Object.assign(m.van,m.stops[look==='rearpeak'?1:look==='mirrorpeak'?0:look==='stresscab'?3:4].park);for(const [name,z] of [['bus',-18],['siren',14]]){const at=OTR.fp.local(m.van,0,z);Object.assign(m.driving[name],{state:name==='bus'?'flashing':'passing',x:at.x,z:at.z,yaw:m.van.yaw});}OTR.fpDriving.syncActors(m);}
    if(look==='rearpeak')m.van.gear=-1;
    if(look==='stressbrake')OTR.fp.suspension(m,1,-6,4);
    if(look==='stressturn'||look==='stressturnleft'||look==='stressreverse'){
      const reverse=look==='stressreverse',side=look==='stressturnleft'?-1:1;m.driveAssist=0;Object.assign(m.van,{speed:reverse?-2:8,steer:side*.16,hand:false,gear:reverse?-1:1});OTR.fp.suspension(m,1,0,reverse?-.5:side*4);m.motion.roll=reverse?-.003:side*.025;
    }
    s.model=m;s.rebuildWorld();m.mirrorAt=look.includes('mirror')||stress?m.elapsed:-100;s.sync();s.refresh();
    if(look==='stresscab'){s.target=null;let found=false;for(let n=0;n<11;n++)if(OTR.fpAccess.focus(s)==='cab-headlights'){found=true;break;}if(!found)throw Error('Cab benchmark target is unreachable');}
    if(look==='plan')OTR.fpLater.open(s);
   },look);if(look.includes('mirror')&&look!=='mirrorpeak')await lookAtTarget('mirror-left');if(look==='mirrorpeak')await lookAtTarget('cab-wipers');if(look==='rearpeak')await lookAtTarget('cab-camera');await sample('later'+look);
  }
  if(await p.evaluate(()=>!!OTR.fpRear))for(const seed of [1,2,3]){
   const spot=await p.evaluate(seed=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const m=OTR.fpMission.create('parking',seed);m.van.gear=-1;m.van.z=-53;m.van.steer=.3;m.step=()=>{};m.paused=false;s.model=m;s.rebuildWorld();s.sync();s.refresh();return m.parkingSpot;},seed);
   await lookAtTarget('cab-camera');await sample('rear-'+spot);
  }
  if(await p.evaluate(()=>!!OTR.game.scene.getScene('FirstPersonScene').assetBank?.models.has('town-garage'))){
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const m=OTR.fpMission.create('campaign',7,OTR.fpRoute.plan(1,7));s.model=m;s.rebuildWorld();m.mode='walk';m.paused=true;
    const lot=m.town.lots.filter(l=>!m.stops.some(st=>st.lotId===l.id)).sort((a,b)=>(a.x-4)**2+(a.z-8)**2-((b.x-4)**2+(b.z-8)**2))[0],x=m.town.xs.reduce((a,b)=>Math.abs(a-lot.x)<Math.abs(b-lot.x)?a:b),z=lot.z+3;
    Object.assign(m.player,{x,z,yaw:Math.atan2(lot.x-x,-(lot.z-z)),pitch:Math.atan2(1.65-lot.h*.4,Math.hypot(lot.x-x,lot.z-z))});s.sync();s.refresh();
   });await sample('assets');
  }
  if(process.env.QA_LIGHTING==='1'&&await p.evaluate(()=>!!OTR.fpLighting))for(const preset of ['morning','midday','dusk','night','nightreverse']){
   if(preset==='nightreverse'&&!await p.evaluate(()=>!!OTR.fpRear))continue;
   await p.evaluate(preset=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const m=OTR.fpMission.create('campaign',9,OTR.fpLater.prepare(OTR.fpRoute.plan(6,9)));m.routePlan.timeOfDay=preset==='nightreverse'?'night':preset;
    OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpLoadout.configure(m,'extra');OTR.fpDoors.configure(m);m.stops.forEach(a=>a.contacted=true);OTR.fpDoors.sync(m);for(const p of m.parcels)p.location='slot'+(p.anomaly?5:p.stop);
    m.mode='cab';m.phase='route';m.departed=m.repaired=true;m.paused=false;m.events[m.briefKey]=true;m.step=(_controls,dt)=>m.elapsed+=Math.min(.05,dt);Object.assign(m.van,m.stops[0].park,{speed:0,hand:true,belt:true,headlights:preset==='night'||preset==='nightreverse',gear:preset==='nightreverse'?-1:1});
    for(const [name,z] of [['bus',-18],['siren',14]]){const at=OTR.fp.local(m.van,0,z);Object.assign(m.driving[name],{state:name==='bus'?'flashing':'passing',x:at.x,z:at.z,yaw:m.van.yaw});}OTR.fpDriving.syncActors(m);s.model=m;s.rebuildWorld();s.sync();s.refresh();
   },preset);await lookAtTarget(preset==='nightreverse'?'cab-camera':'cab-wipers');await sample('lighting'+preset);
  }
  if(process.env.QA_WEATHER==='1'&&await p.evaluate(()=>!!OTR.fpWeather))for(const spec of ['rain','rainnight','rainreverse','storm','fog','snow','ice','snowwalk','icewalk']){
   await p.evaluate(spec=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const weather=spec.startsWith('rain')?'rain':spec.startsWith('snow')?'snow':spec.startsWith('ice')?'ice':spec;let plan=OTR.fpRoute.plan(6,9);if(weather==='rain')plan=OTR.fpLater.prepare(plan);else plan.weather=weather;plan.timeOfDay=spec==='rainnight'?'night':'midday';
    const m=OTR.fpMission.create('campaign',9,plan);OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpLoadout.configure(m,'extra');OTR.fpDoors.configure(m);m.stops.forEach(a=>a.contacted=true);OTR.fpDoors.sync(m);for(const p of m.parcels)p.location='slot'+(p.anomaly?5:p.stop);
    const walk=spec.endsWith('walk'),reverse=spec==='rainreverse';m.mode=walk?'walk':'cab';m.phase='route';m.departed=m.secured=m.repaired=true;m.events[m.briefKey]=true;m.paused=false;m.step=(_controls,dt)=>m.elapsed+=Math.min(.05,dt);Object.assign(m.van,m.stops[0].park,{speed:weather==='rain'?(reverse?-2:4):0,hand:true,belt:true,wipers:true,headlights:true,gear:reverse?-1:1});Object.assign(m.player,{x:m.van.x-2,z:m.van.z+7,yaw:0,pitch:.1});
    for(const [name,z] of [['bus',-18],['siren',14]]){const at=OTR.fp.local(m.van,0,z);Object.assign(m.driving[name],{state:name==='bus'?'flashing':'passing',x:at.x,z:at.z,yaw:m.van.yaw});}OTR.fpDriving.syncActors(m);s.model=m;s.rebuildWorld();s.sync();s.refresh();
   },spec);if(!spec.endsWith('walk'))await lookAtTarget(spec==='rainreverse'?'cab-camera':'cab-wipers');await sample('visibleweather'+spec);
  }
  if(process.env.QA_TOWN==='1'&&await p.evaluate(()=>!!OTR.fpTown))for(const kind of ['house','road','parked-car','cab','reverse']){
   await p.evaluate(kind=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const plan=OTR.fpRoute.plan(1,7);plan.timeOfDay='midday';const m=OTR.fpMission.create('campaign',7,plan);OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);m.stops.forEach(a=>a.contacted=true);OTR.fpDoors.sync(m);for(const p of m.parcels)p.location='slot'+p.stop;
    m.phase='route';m.departed=m.repaired=true;m.paused=false;m.step=()=>{};m.mode=kind==='cab'||kind==='reverse'?'cab':'walk';Object.assign(m.van,m.stops[0].park,{hand:true,belt:true,gear:kind==='reverse'?-1:1});s.model=m;s.rebuildWorld();
    if(m.mode==='walk'){const c=s.art.townArt.choices.find(c=>c.use==='town-'+kind),x=m.town.xs.reduce((a,b)=>Math.abs(a-c.x)<Math.abs(b-c.x)?a:b),z=c.z+3,d=Math.hypot(c.x-x,c.z-z);Object.assign(m.player,{x,z,yaw:Math.atan2(c.x-x,-(c.z-z)),pitch:Math.atan2(1.65-c.height*.4,d)});}s.sync();s.refresh();
   },kind);if(kind==='reverse')await lookAtTarget('cab-camera');await sample('town'+kind);
  }
  if(process.env.QA_ACTORS==='1'&&await p.evaluate(()=>!!OTR.fpActors))for(const kind of ['van','cargo','resident','wave','mirror']){
   await p.evaluate(kind=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const plan=OTR.fpRoute.plan(1,7);plan.timeOfDay='midday';const m=OTR.fpMission.create('campaign',7,plan);OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);m.phase='route';m.departed=m.repaired=true;m.paused=false;m.step=()=>{};m.mode='walk';m.cargoOpen=kind==='cargo';for(const p of m.parcels)p.location='slot'+p.stop;s.model=m;s.rebuildWorld();
    const v=m.van;if(kind==='resident'||kind==='wave'){const id=m._doorSpecs.findIndex(a=>a.present&&!a.dog),stop=m.stops[id];Object.assign(v,stop.park);Object.assign(m.player,{x:stop.x-stop.side*2.7,z:stop.z,yaw:stop.side*Math.PI/2,pitch:.04});s.sync();stop.contacted=true;OTR.fpDoors.sync(m);s.sync();m.elapsed=kind==='wave'?1.3:4;}
    else if(kind==='mirror')Object.assign(m.player,{x:v.x-1.6,z:v.z-.5,yaw:Math.atan2(.38,1.8),pitch:-.25});
    else{const back=kind==='cargo';Object.assign(m.player,{x:v.x+(back?0:5),z:v.z+(back?4.5:-6),yaw:back?v.yaw:Math.atan2(-5,-6),pitch:0});}
    s.__actorBench=()=>{m.elapsed+=.016;};s.events.on('update',s.__actorBench);s.sync();s.refresh();
   },kind);await sample('actors'+kind);await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.events.off('update',s.__actorBench);});
  }
  report.phaserTextures=await textures();
  report.phaserTexturesPeak=Object.values(report.prototype).reduce((a,v)=>v.phaserTextures.withMipmapsUpperBytes>a.withMipmapsUpperBytes?v.phaserTextures:a,report.phaserTextures);
  report.errors=errors;fs.writeFileSync(path.join(OUT,`bench-${TAG}-${GFX}.json`),JSON.stringify(report,null,2));
  if(Object.values(report.prototype).some(sample=>sample.contextLost))throw Error('Shared WebGL context was lost');
  if(GFX==='low'&&Object.values(report.prototype).some(s=>s.peak.calls>64||s.peak.triangles>2500||s.peak.textures>2||s.peak.attachmentBytes>4*1024*1024))throw Error('Low graphics exceeded the documented 1280x720 3D resource budget');
  if(GFX==='low'&&report.phaserTexturesPeak.withMipmapsUpperBytes>4*1024*1024)throw Error('Low graphics exceeded the documented Phaser texture estimate');
  const floor=Number(process.env.QA_FPS_FLOOR)||0;
  if(floor&&Object.values(report.prototype).some(s=>s.avgFPS<floor||s.low1FPS<floor))throw Error('Frame-rate floor failed; see the saved renderer and sample results');
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
