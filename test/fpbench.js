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
  const theme=process.env.QA_THEME?JSON.parse(process.env.QA_THEME):null,fallback=process.env.QA_FALLBACK==='1';
  if(theme)report.companyTheme=theme.companyName||'custom';if(fallback)report.assetFailure='missing-model-files';
  if(theme||fallback){await p.setRequestInterception(true);p.on('request',r=>{
    if(fallback&&/\.glb(?:[?#]|$)/i.test(r.url()))r.respond({status:404,contentType:'text/plain',body:'Missing model fixture.'});
    else if(theme&&r.url().endsWith('/data/theme.js'))r.respond({status:200,contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'../data/theme.js'),'utf8')+'\nObject.assign(OTR_DATA.theme,'+JSON.stringify(theme)+');'});
    else r.continue();
  });}
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
  if(process.env.QA_NAV==='1'){report.navigationFixture=true;await p.evaluate(()=>{const create=OTR.fpMission.create;OTR.fpMission.create=function(kind,seed,plan){return create.call(this,kind,seed,kind==='campaign'&&plan?OTR.fpNav.prepare(OTR.fpSigns.prepare(plan)):plan);};});}
  if(process.env.QA_TRAFFIC==='1')await p.evaluate(()=>{const create=OTR.fpMission.create;OTR.fpMission.create=function(kind,seed,plan){return create.call(this,kind,seed,kind==='campaign'&&plan?OTR.fpTraffic.prepare(plan):plan);};});
  if(process.env.QA_DAMAGE==='1'){report.damageFixture=true;await p.evaluate(()=>{const create=OTR.fpMission.create;OTR.fpMission.create=function(kind,seed,plan){return create.call(this,kind,seed,kind==='campaign'&&plan?OTR.fpDamageFlow.prepare(plan):plan);};});}
  if(process.env.QA_STOPS==='1'){
   report.deliveryFixture=true;await p.evaluate(()=>{
    const create=OTR.fpMission.create,doors=OTR.fpDoors.configure;
    OTR.fpMission.create=function(kind,seed,plan){return create.call(this,kind,seed,kind==='campaign'&&plan?OTR.fpStopFlow.prepare(plan):plan);};
    OTR.fpDoors.configure=function(m,saved){doors.call(this,m,saved);OTR.fpStopFlow.configure(m,m.deliveryStops);};
   });
  }
  if(process.env.QA_WALKAROUND==='1'){report.walkaroundFixture=true;await p.evaluate(()=>{const create=OTR.fpMission.create;OTR.fpMission.create=function(kind,seed,plan){return create.call(this,kind,seed,kind==='campaign'&&plan?OTR.fpWalkaroundFlow.prepare(OTR.fpDamageFlow.prepare(plan)):plan);};});}
  if(process.env.QA_SOUND==='1'){await p.keyboard.press('Shift');await p.waitForFunction(()=>OTR.audio.ctx&&OTR.audio.ctx.state==='running');report.audioContext='running';}
  report.accessibility=(process.env.QA_A11Y||'').split(',').filter(Boolean);
  await p.evaluate(options=>{const s=OTR.game.scene.getScene('FirstPersonScene'),a=OTR.a11y.settings();a.colour=options.includes('colour');a.large=options.includes('large');a.reducedMotion=options.includes('reduced');OTR.a11y.applyColour(s);if(a.large){s.objective.setFontSize(23);s.hint.setFontSize(22);if(s.navText){s.navText.setFontSize(21);s.soundCue.setFontSize(21);s.controls.setFontSize(22);s.help.setFontSize(22);}}},report.accessibility);
  report.renderer=await p.evaluate(()=>{const gl=OTR.game.renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return {name:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),width:gl.drawingBufferWidth,height:gl.drawingBufferHeight};});
  report.actualQuality=await p.evaluate(()=>OTR.gfx.level());
  report.assets=await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').assetBank?.stats||null);
  const inventory=async()=>p.evaluate(()=>{const s=OTR.game.scene.getScene(window.otrBenchmarkScene||'FirstPersonScene'),geometries=new Set(),materials=new Set(),arrays=new Set();let geometryBytes=0,instanceBytes=0,meshes=0,instances=0,shadowCasters=0;
   s.view.world.traverse(o=>{if(!o.isMesh)return;meshes++;if(o.castShadow)shadowCasters++;if(o.isInstancedMesh){instances+=o.count;instanceBytes+=o.instanceMatrix.array.byteLength+(o.instanceColor?o.instanceColor.array.byteLength:0);}if(o.material)materials.add(o.material);if(o.geometry&&!geometries.has(o.geometry)){geometries.add(o.geometry);for(const a of [...Object.values(o.geometry.attributes),o.geometry.index].filter(Boolean)){const array=a.array||a.data&&a.data.array;if(array&&!arrays.has(array)){arrays.add(array);geometryBytes+=array.byteLength;}}}});
   return {meshes,instances,geometries:geometries.size,materials:materials.size,geometryBytes,instanceBytes,shadowCasters};});
  const textures=async()=>p.evaluate(()=>{const seen=new Set();let count=0,rgbaBytes=0;for(const texture of Object.values(OTR.game.textures.list))for(const source of texture.source||[]){const key=source.glTexture||source;if(seen.has(key))continue;seen.add(key);count++;const image=source.image,w=image&&(image.naturalWidth||image.videoWidth||image.width)||source.width,h=image&&(image.naturalHeight||image.videoHeight||image.height)||source.height;rgbaBytes+=w*h*4;}return {count,baseLevelRGBABytes:rgbaBytes,withMipmapsUpperBytes:Math.ceil(rgbaBytes*4/3)};});
  const sample=async name=>{
   if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(name))return;
   await wait(1500);
   const value=await p.evaluate(()=>new Promise(resolve=>{const frames=[],keys=['calls','triangles','textures','geometries','attachmentBytes'],peak={calls:0,triangles:0,textures:0,geometries:0,attachmentBytes:0};let prev=performance.now(),start=prev;const onFrame=()=>{const now=performance.now();frames.push(now-prev);prev=now;
    const d=OTR.game.scene.getScene(window.otrBenchmarkScene||'FirstPersonScene').view.diagnostics;
    if(d)for(const key of keys)peak[key]=Math.max(peak[key],d[key]);
    if(now-start<10000)return;
    OTR.game.events.off('step',onFrame);frames.sort((a,b)=>a-b);const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,worst=frames.slice(Math.floor(frames.length*.99));
    resolve({frames:frames.length,avgFPS:+(1000/mean(frames)).toFixed(2),low1FPS:+(1000/mean(worst)).toFixed(2),p99ms:+frames[Math.floor(frames.length*.99)].toFixed(2),maxMs:+frames[frames.length-1].toFixed(2),peak,target:d&&{width:d.targetWidth,height:d.targetHeight},contextLost:OTR.game.renderer.gl.isContextLost()});};OTR.game.events.on('step',onFrame);}));
   value.phaserTextures=await textures();value.worldProfile=await inventory();value.mirrorViews=await p.evaluate(()=>{const v=OTR.game.scene.getScene(window.otrBenchmarkScene||'FirstPersonScene').view.mirror;return {updates:v.updates,cells:v.cameras&&v.cameras.length,physical:!!v.physical,rearCamera:!!v.rearCamera,reversing:!!v.rearOn};});value.camera=await p.evaluate(()=>{const s=OTR.game.scene.getScene(window.otrBenchmarkScene||'FirstPersonScene');return {fov:s.view.camera.fov,pose:s.model&&s.model.cameraMotion||null};});
   if(['damagebridge','damageoverhang','damagereverseclearance'].includes(name))value.clearanceAlert=await p.evaluate(()=>{const s=OTR.game.scene.getScene(window.otrBenchmarkScene||'FirstPersonScene'),b=s.soundCue.getBounds();return {text:s.soundCue.text,visible:s.soundCue.visible&&s.soundCue.alpha>0,reverse:s.view.mirror.rearOn,bounds:{x:b.x,y:b.y,right:b.right,bottom:b.bottom}};});
   console.log(TAG+' '+GFX+' '+name+' '+JSON.stringify(value));report.prototype[name]=value;if(process.env.QA_SHOTS==='1')await p.screenshot({path:path.join(OUT,`${TAG}-${GFX}-${name}.png`)});
  };
  const lookAtTarget=async id=>p.evaluate(id=>{const s=OTR.game.scene.getScene('FirstPersonScene');if(!OTR.fpMirrors)return false;s.target=null;for(let n=0;n<32;n++)if(OTR.fpAccess.focus(s)===id){s.notice='';s.refresh();return true;}throw Error('Benchmark target is unreachable: '+id);},id);
  const probeMirror=async(index,name)=>{
   if(process.env.QA_MIRROR_PROBE!=='1'||process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(name))return;
   await p.evaluate(i=>{const s=OTR.game.scene.getScene('FirstPersonScene'),cam=s.view.mirror.cameras[i],d=cam.getWorldDirection(new THREE.Vector3()),o=new THREE.Mesh(new THREE.BoxGeometry(.35,.35,.35),new THREE.MeshBasicMaterial({color:0xff0000}));o.position.copy(cam.position).addScaledVector(d,.8);s.view.world.add(o);s.__qualityMarker=o;s.reticle.clear();},index);
   const pixel=()=>p.evaluate(i=>new Promise((resolve,reject)=>{const s=OTR.game.scene.getScene('FirstPersonScene'),before=s.view.mirror.updates[i],done=()=>{if(s.view.mirror.updates[i]<before+2)return;clearTimeout(timer);s.game.events.off('postrender',done);const gl=s.game.renderer.gl,bytes=new Uint8Array(4);gl.readPixels(640,360,1,1,gl.RGBA,gl.UNSIGNED_BYTE,bytes);resolve([...bytes]);},timer=setTimeout(()=>{s.game.events.off('postrender',done);reject(Error('Mirror pixel probe timed out.'));},30000);s.game.events.on('postrender',done);}),index);
   try{const red=await pixel();await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').__qualityMarker.material.color.setHex(0x0000ff));const blue=await pixel();(report.mirrorProof||(report.mirrorProof={}))[name]={index,red,blue};if(!(red[0]>180&&red[0]>blue[0]+100&&blue[2]>150&&blue[0]<80))throw Error('The physical mirror does not show live reflected pixels: '+name);}
   finally{await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),o=s.__qualityMarker;o.removeFromParent();o.geometry.dispose();o.material.dispose();delete s.__qualityMarker;s.refresh();});await pixel();}
  };
  report.prototype={};
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());await sample('hub');
  if(process.env.QA_HUB_ONLY!=='1'){
  if(await p.evaluate(()=>!!OTR.fpGuide)){await p.evaluate(()=>OTR.fpGuide.open(OTR.game.scene.getScene('FirstPersonScene')));await sample('guide');await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());}
  if(await p.evaluate(()=>!!OTR.fpSound)){await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').workdaySound.menu());await sample('soundsettings');await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());}
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').launch('campaign'));
  await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model&&!s.transitioning;});
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());await sample('depot');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.mode='cab';s.model.paused=false;s.sync();});await sample('cab');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');if(!OTR.fpMirrors){s.__mirrorBench=()=>s.model.mirrorAt=s.model.elapsed;s.events.on('update',s.__mirrorBench);}});await lookAtTarget('mirror-left');await probeMirror(0,'mirror');await sample('mirror');
  if(await lookAtTarget('mirror-right')){await probeMirror(1,'mirrorRight');await sample('mirrorRight');}if(await lookAtTarget('mirror-interior')){await probeMirror(2,'mirrorInterior');await sample('mirrorInterior');}
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
  if(process.env.QA_ACTORS==='1'&&await p.evaluate(()=>!!OTR.fpActors))for(const kind of ['van','cargo','cargoextra','resident','wave','mirror']){
   await p.evaluate(kind=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const extra=kind==='cargoextra',seed=extra?2:7,plan=OTR.fpRoute.plan(extra?18:1,seed);plan.timeOfDay='midday';const m=OTR.fpMission.create('campaign',seed,extra?OTR.fpLater.prepare(plan):plan);OTR.fpDay.configure(m);OTR.fpDriving.configure(m);if(extra)OTR.fpLoadout.configure(m,'extra');OTR.fpDoors.configure(m);m.phase='route';m.departed=m.repaired=true;m.paused=false;m.step=()=>{};m.mode='walk';m.cargoOpen=kind.startsWith('cargo');for(const p of m.parcels)p.location='slot'+(p.anomaly?5:p.stop);if(extra){Object.assign(m.van,m.stops[3].park);m.stops.forEach(s=>s.contacted=true);OTR.fpDoors.sync(m);for(const [name,z] of [['bus',-18],['siren',14]]){const point=OTR.fp.local(m.van,0,z);Object.assign(m.driving[name],{state:name==='bus'?'flashing':'passing',x:point.x,z:point.z,yaw:m.van.yaw});}OTR.fpDriving.syncActors(m);}s.model=m;s.rebuildWorld();
    const v=m.van;if(kind==='resident'||kind==='wave'){const id=m._doorSpecs.findIndex(a=>a.present&&!a.dog),stop=m.stops[id];Object.assign(v,stop.park);Object.assign(m.player,{x:stop.x-stop.side*2.7,z:stop.z,yaw:stop.side*Math.PI/2,pitch:.04});s.sync();stop.contacted=true;OTR.fpDoors.sync(m);s.sync();m.elapsed=kind==='wave'?1.3:4;}
    else if(kind==='mirror')Object.assign(m.player,{x:v.x-1.6,z:v.z-.5,yaw:Math.atan2(.38,1.8),pitch:-.25});
    else{const back=kind.startsWith('cargo'),point=back?OTR.fp.local(v,0,4.5):{x:v.x+5,z:v.z-6};Object.assign(m.player,{...point,yaw:back?v.yaw:Math.atan2(-5,-6),pitch:0});}
    s.__actorBench=()=>{m.elapsed+=.016;};s.events.on('update',s.__actorBench);s.sync();s.refresh();
   },kind);await sample('actors'+kind);await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.events.off('update',s.__actorBench);});
  }
  if(process.env.QA_NAV==='1')for(const kind of ['full','line','reroute','blocked','double']){
   await p.evaluate(kind=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const plan=OTR.fpLater.prepare(OTR.fpRoute.plan(4,7));plan.timeOfDay='midday';const m=OTR.fpMission.create('campaign',7,plan);OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);OTR.fpLoadout.configure(m,'extra');m.stops.forEach(s=>s.contacted=true);OTR.fpDoors.sync(m);for(const p of m.parcels)p.location='slot'+(p.anomaly?5:p.stop);m.phase='route';m.departed=m.secured=m.repaired=true;OTR.fpLater.depart(m);m.paused=false;m.mode='cab';m.step=()=>{};m.workdayRules={satnav:kind==='line'?'line':'full'};Object.assign(m.van,{gear:1,hand:true,belt:true,look:0});s.notice='';s.target=null;
    if(kind==='reroute'){OTR.fpNav.route(m);Object.assign(m.van,{x:135,z:-57.25,speed:3});m.elapsed=1;OTR.fpNav.tick(m,{...m.van});m.van.speed=0;}
    if(kind==='blocked'||kind==='double'){const o=OTR.fpNav.obstacles(m).find(o=>o.id===(kind==='blocked'?'blocked-drive':'double-parked'));m.mode='walk';Object.assign(m.player,{x:o.x-5,z:o.z+7,yaw:Math.atan2(5,7),pitch:.04});}
    s.model=m;s.rebuildWorld();s.sync();s.refresh();s.hud.navAt=-1000;OTR.fpHud.navigation(s);
   },kind);await sample('nav'+kind);
  }
  if(process.env.QA_SIGNS==='1'&&await p.evaluate(()=>!!OTR.fpSigns))for(const kind of ['junction','number','oneway','peak']){
   await p.evaluate(kind=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const peak=kind==='peak',day=peak?21:kind==='oneway'?3:1,seed=peak?10:7,plan=OTR.fpRoute.plan(day,seed);plan.timeOfDay=peak?'dusk':'midday';const m=OTR.fpMission.create('campaign',seed,OTR.fpSigns.prepare(day>1?OTR.fpLater.prepare(plan):plan));OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);if(peak)OTR.fpLoadout.configure(m,'extra');m.phase='route';m.departed=m.secured=m.repaired=true;m.paused=false;m.step=()=>{};m.mode=peak||kind==='number'?'walk':'cab';m.van.wipers=true;Object.assign(m.van,{gear:1,hand:true,belt:true});
    for(const p of m.parcels)p.location='slot'+(p.anomaly?5:p.stop);if(peak){m.cargoOpen=true;Object.assign(m.van,m.stops[1].park);m.stops.forEach(s=>s.contacted=true);OTR.fpDoors.sync(m);const p=OTR.fp.local(m.van,0,4.5);Object.assign(m.player,{...p,yaw:m.van.yaw,pitch:0});for(const [name,z] of [['bus',-18],['siren',14]]){const p=OTR.fp.local(m.van,0,z);Object.assign(m.driving[name],{state:name==='bus'?'flashing':'passing',x:p.x,z:p.z,yaw:m.van.yaw});}OTR.fpDriving.syncActors(m);}
    else if(kind==='number'){const stop=m.stops[0];Object.assign(m.van,stop.park);Object.assign(m.player,{x:stop.x-stop.side*4,z:stop.z,yaw:stop.side*Math.PI/2,pitch:0});}
    else if(kind==='oneway'){const sign=OTR.fpSigns.catalog(m).regulatory.find(s=>s.kind==='oneway');Object.assign(m.van,{x:sign.from-5,z:sign.roadZ+2.5,yaw:Math.PI/2,look:-.65});}
    else{const j=m.junctions[0];Object.assign(m.van,{x:j.x+2.5,z:j.z+17,yaw:0,look:0});}
    s.model=m;s.area='route';s.rebuildWorld();s.sync();s.refresh();
   },kind);await sample('signs'+kind);
  }
  if(process.env.QA_DAMAGE==='1')for(const kind of ['front','rear','left','right','cargo','bridge','overhang','mirror','reverseclearance']){
   const proof=await p.evaluate(kind=>{
    const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const plan=OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(OTR.fpRoute.plan(4,7))));plan.timeOfDay='midday';
    const m=OTR.fpMission.create('campaign',7,plan);OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);OTR.fpLoadout.configure(m,'extra');
    for(const zone of OTR.fpDamage.zones)OTR.fpDamage.contact(m.damage,zone,'solid',8);
    OTR.fpDamage.shift(m.damage,0,{secured:false,count:6,lateral:8,braking:8});for(const p of m.parcels)p.location='slot'+(p.anomaly?5:p.stop);
    m.phase='route';m.departed=m.secured=true;OTR.fpLater.depart(m);m.paused=false;m.step=()=>{};m.events[m.briefKey]=true;m.workdayRules={satnav:'full',damage:true};
    Object.assign(m.van,{x:2.84,z:8,yaw:0,speed:0,gear:1,belt:true,hand:true,look:0});m.mode='walk';
    const pose=kind==='front'?[0,-7,Math.PI]:kind==='left'?[-6,0,Math.PI/2]:kind==='right'?[6,0,-Math.PI/2]:[0,7,0],point=OTR.fp.local(m.van,pose[0],pose[1]);Object.assign(m.player,{...point,yaw:pose[2],pitch:-.08});
    if(kind==='cargo')m.cargoOpen=true;
    if(kind==='bridge'||kind==='overhang'){const b=m._damageClearances[kind==='bridge'?0:1];Object.assign(m.van,{x:b.x+2.5,z:b.z+12,yaw:0});m.mode='cab';}
    if(kind==='reverseclearance'){const b=m._damageClearances[0];Object.assign(m.van,{x:b.x,z:b.z+12,yaw:Math.PI,gear:-1});m.mode='cab';}
    if(kind==='mirror')m.mode='cab';s.model=m;s.area='route';s.notice='';s.target=null;s.rebuildWorld();s.sync();s.refresh();
    return {marker:m.routePlan.damage,valid:OTR.fpDamage.valid(m.damage),zones:m.damage.added.filter(Boolean).length,clearances:m._damageClearances.length,instances:s.art.damage.entries.length,shift:m.damage.loadX};
   },kind);report.damageProof=report.damageProof||{};report.damageProof['damage'+kind]=proof;
   if(kind==='mirror')await lookAtTarget('mirror-left');await sample('damage'+kind);
  }
  if(process.env.QA_STOPS==='1')for(const kind of ['intercom','gate','reception','lockeropen','lockerclosed','retention','stresscab']){
   const view='stops'+kind;if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(view))continue;
   report.deliveryProof=report.deliveryProof||{};report.deliveryProof[view]=await p.evaluate(kind=>{
    const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();let m,id;
    for(let seed=kind==='stresscab'?10:1;seed<=100;seed++){
     let plan=OTR.fpLater.prepare(OTR.fpStopFlow.prepare(OTR.fpRoute.plan(kind==='stresscab'?21:3,seed),true));plan.timeOfDay=kind==='stresscab'?'night':'midday';
     m=OTR.fpMission.create('campaign',seed,OTR.fpStopFlow.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(plan))));OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);
     id=kind==='stresscab'?3:m._deliverySpecs.findIndex((a,i)=>kind==='gate'?a.gated:kind==='retention'?!m._doorSpecs[i].present&&m._doorSpecs[i].signature:a.protocol&&a.protocol.kind===(kind.startsWith('locker')?'locker':kind));if(id>=0)break;
    }
    if(id<0)throw Error('No richer-stop benchmark fixture: '+kind);
    const stop=m.stops[id],point=OTR.fpStopFlow.point(m,id),parcel=m.parcels[id];Object.assign(m.van,stop.park,{speed:0,hand:true,belt:true,wipers:true,gear:kind==='stresscab'?-1:1,look:kind==='stresscab'?.55:0});
    m.phase='route';m.departed=m.secured=m.repaired=true;OTR.fpLater.depart(m);m.mode=kind==='stresscab'?'cab':'walk';m.paused=false;m.activeStop=id;m.elapsed=4;m.step=()=>{};m.stops.forEach(st=>st.contacted=true);OTR.fpDoors.sync(m);
    for(const p of m.parcels)p.location='slot'+p.stop;
    Object.assign(m.player,{x:point.x-stop.side*2.1,z:point.z,yaw:stop.side*Math.PI/2,pitch:.1});
    if(kind.startsWith('locker')){
     Object.assign(parcel,{location:'held',loaded:true,scanned:true,stopScanned:true});m.heldId=parcel.id;const a=m._deliverySpecs[id].protocol;
     OTR.fpStopFlow.act(m,id,'locker.open',a.compartment);OTR.fpStopFlow.act(m,id,'locker.scan',parcel.id);OTR.fpStopFlow.act(m,id,'locker.deposit');if(kind==='lockerclosed'){OTR.fpStopFlow.act(m,id,'locker.close');OTR.fpStopFlow.act(m,id,'locker.photo');}
    }
    if(kind==='stresscab'){if(m.damage)for(const zone of OTR.fpDamage.zones)OTR.fpDamage.contact(m.damage,zone,'solid',8);OTR.fpLoadout.configure(m,'extra');for(const p of m.parcels)p.location='slot'+(p.anomaly?5:p.stop);m.cargoOpen=true;for(const [name,z] of [['bus',-18],['siren',14]]){const at=OTR.fp.local(m.van,0,z);Object.assign(m.driving[name],{state:name==='bus'?'flashing':'passing',x:at.x,z:at.z,yaw:m.van.yaw});}OTR.fpDriving.syncActors(m);}
    s.model=m;s.area='route';s.notice='';s.target=null;s.rebuildWorld();s.sync();s.refresh();
    return {marker:m.routePlan.deliveries,source:'native-later-authorized',later:m.routePlan.later===1,lockerStop:m.routePlan.lockerStop,damageZones:m.damage?m.damage.added.filter(Boolean).length:0,physicalTarget:s.art.interactions.some(o=>o.userData.interaction==='visit'+id),parts:s.art.deliveryArt.parts.length,protocol:m._deliverySpecs[id].protocol&&m._deliverySpecs[id].protocol.kind,gated:m._deliverySpecs[id].gated,deposited:OTR.fpStopFlow.inLocker(m,parcel)};
   },kind);await sample(view);
  }
  if(process.env.QA_WALKAROUND==='1')for(const kind of (process.env.QA_CARGO_PROBE==='1'?['cargo','rear']:['front','roof','record','summary','guidepre','guidepost'])){
   const proof=await p.evaluate(kind=>{
    const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const plan=OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(OTR.fpStopFlow.prepare(OTR.fpRoute.plan(4,8),true))));plan.timeOfDay='midday';
    const m=OTR.fpMission.create('campaign',8,plan);OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);OTR.fpLoadout.configure(m,'extra');
    m.mode='walk';m.paused=true;m.step=()=>{};m.events[m.briefKey]=true;m.workdayRules={satnav:'full',damage:true};
    for(const p of m.parcels)p.location=p.anomaly?'aside':'slot'+p.stop;
    if(['record','summary','guidepost'].includes(kind)){
     m.preparation();m.phase='return';m.stops.forEach(t=>{t.resolved=true;t.outcome='exception';OTR.fpLater.arrive(m,t.id);});m.parcels.forEach(p=>{p.location=p.anomaly?'aside':'returned';p.returnRequired=!p.anomaly;});
     for(const zone of OTR.fpDamage.zones){OTR.fpDamage.release(m.damage);OTR.fpDamage.contact(m.damage,zone,'solid',8);}
    }
    const zone=kind==='front'?'front':kind==='cargo'||kind==='rear'?'rear':kind==='record'?'mirror':'roof',t=OTR.fpWalkaroundFlow.target(zone),point=OTR.fp.local(m.van,t.x+(['front','rear'].includes(zone)?0:-.85),t.z+(zone==='front'?-.85:zone==='rear'?.85:0));Object.assign(m.player,point);
    const target=OTR.fpWalkaroundFlow.point(m,zone);m.player.yaw=Math.atan2(target.x-m.player.x,-(target.z-m.player.z));m.player.pitch=Math.atan2(1.65-target.y,Math.hypot(target.x-m.player.x,target.z-m.player.z));
    s.model=m;s.area='route';s.notice='';s.target='wear-'+zone;s.rebuildWorld();s.sync();s.refresh();
    if(kind==='cargo'||kind==='rear'){
     if(kind==='cargo')Object.assign(m.player,OTR.fp.local(m.van,0,4));
     const object=kind==='cargo'?s.art.interactions.find(o=>o.userData.interaction==='cargo'&&o.position.x===0):s.art.walkaroundTargets.find(o=>o.userData.interaction==='wear-rear'),at=object.getWorldPosition(new THREE.Vector3());
     m.player.yaw=Math.atan2(at.x-m.player.x,-(at.z-m.player.z));m.player.pitch=Math.atan2(1.65-at.y,Math.hypot(at.x-m.player.x,at.z-m.player.z));s.sync();s.target=s.aimTarget();s.refresh();
     if(s.target!==(kind==='cargo'?'cargo':'wear-rear'))throw Error('The cargo and rear inspection targets overlap.');
    }
    if(kind==='record'){OTR.fpWalkaroundFlow.inspect(m,zone);OTR.fpWalkaroundUI.describe(s,zone,1);}
    if(kind==='summary')OTR.fpWalkaroundUI.records(s,4);
    if(kind==='guidepre'||kind==='guidepost')OTR.fpGuide.steps(s,kind==='guidepre'?7:8,()=>s.closePanel());
    return {marker:m.routePlan.walkaround,valid:OTR.fpWalkaround.valid(m.walkaround,m.damage),targets:s.art.walkaroundTargets.length,proxyOnly:s.art.walkaroundTargets.every(o=>o.layers.mask===2),physicalPick:kind==='cargo'||kind==='rear'?s.aimTarget():null,kind};
   },kind);report.walkaroundProof=report.walkaroundProof||{};report.walkaroundProof['walk'+kind]=proof;await sample('walk'+kind);
  }
  if(process.env.QA_TRAFFIC==='1'&&await p.evaluate(()=>!!OTR.fpTraffic))for(const kind of ['signal','green','cyclist','mirror','school','peak']){
   await p.evaluate(kind=>{
    const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();
    const peak=kind==='peak',day=peak?21:4,seed=peak?10:7,plan=OTR.fpTraffic.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(OTR.fpRoute.plan(day,seed)))));
    const m=OTR.fpMission.create('campaign',seed,plan);OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);OTR.fpLoadout.configure(m,'extra');
    m.phase='route';m.departed=m.secured=m.repaired=true;m.paused=false;m.events[m.briefKey]=true;m.step=()=>{};m.mode=kind==='cyclist'||kind==='school'||peak?'walk':'cab';
    for(const p of m.parcels)p.location='slot'+(p.anomaly?5:p.stop);Object.assign(m.van,{speed:0,hand:true,belt:true,gear:1,look:0,wipers:true});
    if(kind==='signal'||kind==='green'){
     const j=OTR.fpTraffic.layout(m).find(j=>j.kind==='signal');m.elapsed=((kind==='green'?0:23)-j.offset+54)%54;
     Object.assign(m.van,{x:j.x+1.7,z:j.z+m.town.road/2+13,yaw:0});
    }else if(kind==='school'){
     const h=m.crossing;h.state='crossing';h.x=m.town.school.x-2;Object.assign(m.van,{x:m.town.school.x+1.7,z:h.z+8,yaw:0});
     Object.assign(m.player,{x:h.x-5,z:h.z+6,yaw:Math.atan2(5,6),pitch:.05});
    }else{
     Object.assign(m.van,peak?m.stops[1].park:{x:2.84,z:-18,yaw:0});m.elapsed=10;
     const c=m.trafficControl.cyclist,p=OTR.fp.local(m.van,2,1.2);Object.assign(c,{state:'beside',x:p.x,z:p.z,yaw:m.van.yaw,leg:m.leg,at:10});
     if(peak){m.cargoOpen=true;m.stops.forEach(stop=>stop.contacted=true);OTR.fpDoors.sync(m);const p=OTR.fp.local(m.van,0,4.5);Object.assign(m.player,{...p,yaw:m.van.yaw,pitch:0});Object.assign(m.crossing,{state:'crossing',x:m.van.x+3,z:m.van.z-5});}
     else Object.assign(m.player,{x:c.x+4,z:c.z+3,yaw:Math.atan2(-4,3),pitch:.08});
    }
    for(const [name,z] of [['bus',-18],['siren',14]]){const p=OTR.fp.local(m.van,0,z);Object.assign(m.driving[name],{state:name==='bus'?'flashing':'passing',x:p.x,z:p.z,yaw:m.van.yaw});}
    OTR.fpDriving.syncActors(m);OTR.fpTraffic.syncSolids(m);s.model=m;s.area='route';s.rebuildWorld();s.sync();s.refresh();
   },kind);report.trafficFixture=await p.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return m.routePlan.traffic===1&&m.routePlan.navigation===1&&!!m.trafficControl&&!!m.navigation;});if(kind==='mirror')await lookAtTarget('mirror-right');await sample('traffic'+kind);
  }
  if(process.env.QA_RADIO==='1')for(const kind of ['radiocaption','radiopriority','radiocheckin','nightoff','nighton','nightglare','nightreduced']){
   if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(kind))continue;
   await p.evaluate(kind=>{
    const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();
    let plan=OTR.fpStopFlow.prepare(OTR.fpRoute.plan(kind==='radiocheckin'?5:6,9),true);
    plan=OTR.fpRadio.prepare(OTR.fpDamageFlow.prepare(OTR.fpTraffic.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(plan))))));
    const m=OTR.fpMission.create('campaign',9,plan);OTR.fpDay.configure(m);OTR.fpDoors.configure(m);OTR.fpStopFlow.configure(m);OTR.fpLoadout.configure(m);OTR.fpDriving.configure(m);
    OTR.fp.applyDriveRules(m);m.workdayRules.night=true;m.mode='cab';m.phase='route';m.departed=m.repaired=m.secured=true;m.events[m.briefKey]=true;OTR.fpLater.depart(m);OTR.fpWalkaroundFlow.depart(m);m.paused=false;m.step=(_c,dt)=>m.elapsed+=Math.min(.05,dt);
    Object.assign(m.van,{x:2.84,z:-18,yaw:0,look:0,speed:0,hand:true,belt:true,headlights:kind!=='nightoff'});m.player.pitch=0;
    if(kind.startsWith('radio')){m.radio.travel=20;m.radio.sent=true;if(kind!=='radiocaption'){OTR.fpRadio.read(m);OTR.fpRadio.accept(m);}}
    if(kind==='nightglare'||kind==='nightreduced'){Object.assign(m.traffic[0],{...OTR.fp.local(m.van,-3,-20),yaw:Math.PI});Object.assign(m.traffic[1],{x:m.van.x+40,z:m.van.z+20});}
    s.__radioReduced=OTR.a11y.settings().reducedMotion;if(kind==='nightreduced')OTR.a11y.settings().reducedMotion=true;
    s.model=m;s.area='route';s.rebuildWorld();s.sync();s.refresh();if(kind==='radiopriority'||kind==='radiocheckin')OTR.fpRadioUI.open(s);
   },kind);
   await sample(kind);
   report.radioFixture=true;report.radioProof=report.radioProof||{};report.radioProof[kind]=await p.evaluate(()=>{
    const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,call=OTR.fpRadio.descriptor(m);
    return {marker:m.routePlan.radio,kind:call.kind,valid:!!OTR.fpMission.restore(m.snapshot()),context:OTR.fpNav.context(m),caption:s.soundCaption,headlights:m.van.headlights,far:s.view.world.fog.far,glare:s.art.weatherEffects.uniforms.headlightGlow.value.z,reduced:OTR.fpAccess.reduced(),radio:m.radio};
   });
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();OTR.a11y.settings().reducedMotion=s.__radioReduced;});
  }
  if(process.env.QA_AMBIENT==='1')for(const kind of ['ambientwalk','ambientcab','ambientmirror','ambientnight','ambientbench']){
   if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(kind))continue;
   const proof=await p.evaluate(kind=>{
    const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();
    let plan=OTR.fpStopFlow.prepare(OTR.fpRoute.plan(6,7),true);plan=OTR.fpRadio.prepare(OTR.fpWalkaroundFlow.prepare(OTR.fpDamageFlow.prepare(OTR.fpTraffic.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(plan)))))));
    const m=OTR.fpMission.create('campaign',7,plan);OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);OTR.fpStopFlow.configure(m);OTR.fpLoadout.configure(m,'extra');
    m.phase='route';m.departed=m.repaired=m.secured=true;m.events[m.briefKey]=true;OTR.fpLater.depart(m);OTR.fpWalkaroundFlow.depart(m);m.paused=false;m.step=(_c,dt)=>m.elapsed+=Math.min(.05,dt);m.routePlan.timeOfDay=kind==='ambientnight'?'night':'midday';
    for(const parcel of m.parcels)parcel.location='slot'+(parcel.anomaly?5:parcel.stop);for(const zone of OTR.fpDamage.zones)OTR.fpDamage.contact(m.damage,zone,'solid',8);
    Object.assign(m.van,{speed:0,hand:true,belt:true,gear:1,look:0,headlights:true});s.model=m;s.area='route';s.rebuildWorld();const a=s.art.ambient;if(!a)throw Error('No ambient route placement');
    const sites=a.selection.sites,candidates=sites.filter(p=>{const lot=m.town.lots.find(l=>l.id===p.lotId),road=m.town.xs.reduce((x,y)=>Math.abs(x-p.x)<Math.abs(y-p.x)?x:y);s.art.townArt.select(kind==='ambientwalk'?lot.x-lot.side*(lot.w/2+1):road+2,p.z+(kind==='ambientwalk'?3:12));return s.art.townArt.ambientAllowed;});
    if(!candidates.length)throw Error('No ambient site with room after safety geometry');const site=candidates.find(p=>candidates.some(q=>q!==p&&(p.x-q.x)**2+(p.z-q.z)**2<30*30))||candidates[0],lot=m.town.lots.find(l=>l.id===site.lotId),road=m.town.xs.reduce((x,y)=>Math.abs(x-site.x)<Math.abs(y-site.x)?x:y);
    const bench=s.art.townArt.choices.find(c=>c.use==='town-bench');
    if(kind==='ambientwalk'||kind==='ambientbench'){
     const target=kind==='ambientbench'&&bench?bench:site,targetLot=kind==='ambientbench'&&bench?m.town.lots.find(l=>l.id===bench.lotId):lot,x=targetLot.x-targetLot.side*(targetLot.w/2+1),z=target.z+3;m.mode='walk';Object.assign(m.player,{x,z,yaw:Math.atan2(target.x-x,z-target.z),pitch:.04});
    }else{m.mode='cab';Object.assign(m.van,{x:road+2,z:site.z+12,yaw:0,look:Math.atan2(site.x-road-2,12)});m.player.pitch=.02;}
    s.sync();s.refresh();return {sites:sites.length,selected:a.selection.slots.filter(x=>x.visible).length,limit:a.selection.slots.length,sourcePeople:a.people.filter(Boolean).length,reserved:a.reserved,bench:!!bench,solid:sites.every(p=>m.blocked(p.x,p.z)),restoreValid:!!OTR.fpMission.restore(m.snapshot())};
   },kind);
   if(kind==='ambientmirror')await lookAtTarget(await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.art.ambient.selection.slots[0].site.x<s.model.van.x?'mirror-left':'mirror-right';}));
   (report.ambientProof||(report.ambientProof={}))[kind]=proof;report.ambientFixture=true;await sample(kind);
  }
  }
  if(process.env.QA_MODULES==='1')for(const kind of ['depot','street','doorstep','cab','cabreverse','cabhandheld']){
   const name='module'+kind;if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(name))continue;
   await p.evaluate(require('./tools/fp-scenario-fixture'),{piece:kind.startsWith('cab')?'cab':kind,autoFinish:false});
   await p.waitForFunction(()=>OTR.game.scene.isActive('FirstPersonScenarioScene')&&!OTR.game.scene.getScene('FirstPersonScenarioScene').loading,{timeout:120000});
   await p.evaluate(kind=>{
    const s=OTR.game.scene.getScene('FirstPersonScenarioScene');window.otrBenchmarkScene='FirstPersonScenarioScene';s.keyboardMode=true;OTR.fpScenario.begin(s.scenarioSession);s.closePanel();
    s.moduleBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
    if(kind==='cabreverse')s.model.selectGear(-1);if(kind==='cabhandheld')s.showScanner();s.sync();s.refresh();
   },kind);await sample(name);
   const proof=await p.evaluate(()=>{
    const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=s.model,r=s.scenarioSession,b=m.bounds,before=s.moduleBefore;
    return {source:'module-controller-fixture',id:r.id,piece:r.definition.piece,phase:r.phase,reverse:!!s.art.rear?.inView,handheld:!!s.handheld.isOpen,
     bounded:m.blocked(b.x0-1,b.z0)&&m.blocked(b.x1+1,b.z1),checkpointUnchanged:before.checkpoint===JSON.stringify(OTR.fpStore.read()),eventsUnchanged:before.events===JSON.stringify(OTR.workday.events),workdayUnchanged:before.workday===JSON.stringify(OTR.save.data.workday||null)};
   });(report.moduleProof||(report.moduleProof={}))[name]=proof;report.moduleFixture=true;
  }
  if(process.env.QA_CUSTOMERS==='1')for(const name of ['customerstreet','customerreply','customerphone','customerreception','customerdog','customerquestion','customerhistory','customertimed']){
   if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(name))continue;
   await p.evaluate(require('./tools/fp-customer-fixture'),{view:name});await p.waitForFunction(()=>OTR.game.scene.isActive('FirstPersonScenarioScene')&&!OTR.game.scene.getScene('FirstPersonScenarioScene').loading,{timeout:180000});
   await p.evaluate(name=>{
    const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=scene.scenarioSession,m=scene.model,s=m.customerTalk,K=OTR.fpCustomerTalk,S=OTR.fpCustomerStage,A=OTR.fpCustomerScenario;window.otrBenchmarkScene='FirstPersonScenarioScene';scene.keyboardMode=true;OTR.fpScenario.begin(r);scene.closePanel();
    scene.customerBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
    if(name==='customerdog'||name==='customertimed'){K.enter(s,'n4');S.apply(m.customerStage,s);K.enter(s,'n5');S.apply(m.customerStage,s);Object.assign(m.player,{x:11,z:-42.6});}
    else K.enter(s,name==='customerphone'?'n3_call':name==='customerquestion'||name==='customerhistory'?'n4_left':name==='customerreception'?'n1':name==='customerreply'?'n1':'n0');
    S.apply(m.customerStage,s);S.step(m.customerStage,0,true);const t=m.customerStage.target;m.player.yaw=Math.atan2(t.x-m.player.x,-(t.z-m.player.z));m.player.pitch=Math.atan2(1.65-t.y,Math.hypot(t.x-m.player.x,t.z-m.player.z));scene.sync();
    if(name==='customerreply'||name==='customertimed'){K.advance(s);A.present(scene);}
    if(name==='customerquestion')A.present(scene);
    if(name==='customerhistory')A.history(scene);
    // Static resource fixture: no decisions or deadlines elapse while the renderer is sampled.
    if(scene.panel)scene.panel.customer=false;m.paused=true;scene.sync();scene.refresh();
   },name);await sample(name);
   const proof=await p.evaluate(()=>{const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=scene.model,s=m.customerTalk,r=scene.scenarioSession,before=scene.customerBefore,a=scene.art.customer;return {source:'customer-static-render-fixture',id:r.id,piece:r.definition.piece,phase:r.phase,conversation:s.phase,target:a.target.userData.interaction,importedPeople:a.people.filter(p=>p.actor).length,importedBuildings:a.imports.length,actorCount:m.customerStage.actors.length,batches:a.batches.length,handheld:scene.handheld.isOpen,panel:!!scene.panel,canonical:s.content===OTR.registry.content(r.scenario),bounded:m.blocked(m.bounds.x0-1,m.bounds.z0),checkpointUnchanged:before.checkpoint===JSON.stringify(OTR.fpStore.read()),eventsUnchanged:before.events===JSON.stringify(OTR.workday.events),workdayUnchanged:before.workday===JSON.stringify(OTR.save.data.workday||null)};});(report.customerProof||(report.customerProof={}))[name]=proof;report.customerFixture=true;
  }
  if(process.env.QA_CUSTOMER_STOPS==='1')for(const name of ['doorstepcab','doorstepreverse','doorstepcargo','doorstepheavy','doorstepcustomer','doorstepreply','doorstepsignature','doorsteptag','doorstepphoto','doorstepreport','doorstepfinding']){
   if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(name))continue;
   await p.evaluate(require('./tools/fp-customerstop-fixture'));await p.waitForFunction(()=>OTR.game.scene.isActive('FirstPersonScenarioScene')&&!OTR.game.scene.getScene('FirstPersonScenarioScene').loading,{timeout:180000});
   await p.evaluate(name=>{
    const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=scene.scenarioSession,m=scene.model,K=OTR.fpCustomerStop,A=OTR.fpCustomerStopScenario;window.otrBenchmarkScene='FirstPersonScenarioScene';scene.keyboardMode=true;OTR.fpScenario.begin(r);scene.closePanel();
    scene.doorstepBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
    const d=m.customerStop;d.index=['doorstepcustomer','doorstepsignature'].includes(name)?1:['doorsteptag','doorstepphoto'].includes(name)?2:0;K.prepare(d);A.configure(r,m);K.begin(d);scene.rebuildWorld();
    if(name==='doorstepreverse')m.van.gear=-1;
    if(name!=='doorstepcab'&&name!=='doorstepreverse'){m.mode='walk';K.exit(d,name!=='doorstepfinding');Object.assign(m.player,{x:11,z:-42.8,yaw:0,pitch:.1});}
    if(name==='doorstepcargo'){m.cargoOpen=true;Object.assign(m.player,{x:1.7,z:-38.2,yaw:0,pitch:.15});}
    if(['doorstepheavy','doorstepreply','doorstepsignature','doorstepphoto','doorstepreport','doorstepfinding'].includes(name)){K.take(d,'p1');K.scan(d,'p1',true);if(d.index===0)K.heavy(d,name==='doorstepfinding'?'carry':'truck');}
    if(name==='doorstepheavy')Object.assign(m.player,{x:5,z:-40,yaw:0,pitch:.3});
    if(name==='doorstepcustomer'||name==='doorstepsignature'||name==='doorstepreply'){d.state.answered=true;m.customerStage.actors[0].visible=true;Object.assign(m.player,{x:12.05,z:-42.7,yaw:0,pitch:.1});}
    if(name==='doorstepreply'){K.startTalk(d);m.customerTalk=d.talk;OTR.fpCustomerTalk.advance(d.talk);OTR.fpCustomerTalk.advance(d.talk);OTR.fpCustomerScenario.present(scene,d.talk.choices.findIndex(ch=>ch.grade==='good'));}
    if(name==='doorstepsignature'){K.requestSignature(d,'recipient');A.signature(scene);scene.handheld.signatureToken=null;}
    if(name==='doorsteptag'){K.exception(d,'NA');K.printTag(d);K.attachTag(d);Object.assign(m.player,{x:11.7,z:-43.2,yaw:0,pitch:.22});}
    if(name==='doorstepphoto'){d.photoPending=true;d.photoMode=true;Object.assign(m.player,{x:11,z:-42.5,yaw:0,pitch:.5});}
    if(name==='doorstepreport'||name==='doorstepfinding'){d.state.answered=true;K.requestSignature(d,'recipient');K.signed(d);K.recordSigner(d,name==='doorstepfinding'?'Occupant':d.def.answer.name);K.enter(d,name!=='doorstepfinding');m.mode='cab';m.van.look=0;m.player.pitch=0;K.evaluate(d);let page=0;if(name==='doorstepfinding'){const findings=d.log.takeaways(d.def.id);let longest=0;for(let i=1;i<findings.length;i++)if(findings[i].text.length>findings[longest].text.length)longest=i;page=longest+1;}A.report(scene,page);}
    m.customerStage.time=100;if(scene.panel)scene.panel.customer=false;m.paused=true;scene.sync();scene.refresh();
   },name);await sample(name);
   const proof=await p.evaluate(()=>{const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=scene.model,r=scene.scenarioSession,d=m.customerStop,a=scene.art.customerStop,before=scene.doorstepBefore;return {source:'doorstep-static-render-fixture',id:r.id,piece:r.definition.piece,phase:r.phase,stop:d.index,mode:m.mode,importedPerson:!!a.human,importedBuildings:a.imports.length,fontLettering:a.fontLettering,parcels:a.parcels.length,handheld:scene.handheld.isOpen,panel:!!scene.panel,reverse:!!scene.art.rear?.inView,canonical:d.content===OTR.registry.content(r.scenario),bounded:m.blocked(m.bounds.x0-1,m.bounds.z0),checkpointUnchanged:before.checkpoint===JSON.stringify(OTR.fpStore.read()),eventsUnchanged:before.events===JSON.stringify(OTR.workday.events),workdayUnchanged:before.workday===JSON.stringify(OTR.save.data.workday||null)};});(report.doorstepProof||(report.doorstepProof={}))[name]=proof;report.doorstepFixture=true;
  }
  if(process.env.QA_CUSTOMER_PROTOCOLS==='1')for(const name of ['protocolintercom','protocolreception','protocolsignature','protocollockeropen','protocollockerclosed','protocolcamera','protocolstatus','protocolreport']){
   if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(name))continue;
   await p.evaluate(name=>{
    const kind=name.includes('reception')||name==='protocolsignature'?'reception':name.includes('locker')||name==='protocolcamera'||name==='protocolstatus'?'locker':'intercom',id='m3-'+kind;
    if(!OTR.registry.get(id))OTR.registry.modules().find(m=>m.id==='m3').scenarios.push({id,title:'Customer protocol practice',icon:'ic_box',scene3d:'customer-protocol',dataKey:'stopSets.m3_doorsteps',optional:true,categories:['service','safety','efficiency'],blurb:'Complete the customer protocol and return to the parked van.'});
    OTR.academy.assessing=null;OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:id});OTR.game.scene.stop('FirstPersonScene');
   },name);await p.waitForFunction(()=>OTR.game.scene.isActive('FirstPersonScenarioScene')&&!OTR.game.scene.getScene('FirstPersonScenarioScene').loading,{timeout:180000});
   await p.evaluate(name=>{
    const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=scene.scenarioSession,m=scene.model,d=m.customerStop,p=d.protocol,K=OTR.fpCustomerStop,P=OTR.fpCustomerProtocol,A=OTR.fpCustomerProtocolScenario;window.otrBenchmarkScene='FirstPersonScenarioScene';scene.keyboardMode=true;OTR.fpScenario.begin(r);P.begin(d);scene.closePanel();
    scene.protocolBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
    K.take(d,'p1');K.scan(d,'p1',true);K.exit(d,true);m.mode='walk';Object.assign(m.player,{x:p.spec.kind==='intercom'?9.12:p.spec.kind==='reception'?12.05:9.25,z:-41.9,yaw:0,pitch:.22});
    if(name==='protocolintercom')A.contact(scene,'12');
    if(name==='protocolreception'||name==='protocolsignature'){P.action(d,'identify',{role:'reception',name:p.spec.receptionist});if(name==='protocolsignature'){A.signature(scene);scene.handheld.signatureToken=null;}else A.reception(scene);}
    if(p.spec.kind==='locker'){P.action(d,'open','B12');P.action(d,'scan','p1');P.action(d,'deposit');if(name!=='protocollockeropen')P.action(d,'close');}
    if(name==='protocolcamera')p.photoMode=true;
    if(name==='protocolstatus')A.handheld(r,scene);
    if(name==='protocolreport'){P.action(d,'call',{button:'13',purpose:'delivery'});P.action(d,'call',{button:'12',purpose:'delivery'});for(let n=0;n<41;n++)P.step(d,.05);P.action(d,'open');P.handOver(d);K.enter(d,true);m.mode='cab';P.evaluate(d);A.report(scene,1);}
    if(scene.panel)scene.panel.customer=false;m.paused=true;m.customerStage.time=100;scene.sync();scene.refresh();
   },name);await sample(name);
   const proof=await p.evaluate(name=>{const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=scene.model,r=scene.scenarioSession,d=m.customerStop,a=scene.art.customerStop,b=scene.protocolBefore;return {source:'customer-protocol-resource-pose',name,id:r.id,kind:d.protocol.spec.kind,registered:OTR.fpScenario.definitions.has(r.scenario.scene3d),mode:m.mode,par:d.def.par,basePar:OTR_DATA.stopSets.m3_doorsteps.stops[1].par,sequence:d.protocol.sequence,targets:a.protocol.targets.length,batches:a.meshes.length,parcels:a.parcels.length,importedPerson:!!a.human,importedBuildings:a.imports.length,fontLettering:a.fontLettering,bounded:m.blocked(m.bounds.x0-1,m.bounds.z0),handheld:scene.handheld.isOpen,panel:!!scene.panel,checkpointUnchanged:b.checkpoint===JSON.stringify(OTR.fpStore.read()),eventsUnchanged:b.events===JSON.stringify(OTR.workday.events),workdayUnchanged:b.workday===JSON.stringify(OTR.save.data.workday||null)};},name);(report.protocolProof||(report.protocolProof={}))[name]=proof;report.protocolFixture=true;
  }
  if(process.env.QA_PROBLEMS==='1')for(const name of ['problemaddress','problemrecipient','problemrecovery','problemcargo','problemdamaged','problemisolation','problemstormcab','problemgate','problemflood','problemreply','problemhandheld','problemcontrols']){
   if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(name))continue;
   await p.evaluate(require('./tools/fp-problem-fixture'),{view:name});await p.waitForFunction(()=>OTR.game.scene.isActive('FirstPersonScenarioScene')&&!OTR.game.scene.getScene('FirstPersonScenarioScene').loading,{timeout:180000});
   await p.evaluate(require('./tools/fp-problem-pose'),name);await sample(name);
   const proof=await p.evaluate(()=>{const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=scene.model,r=scene.scenarioSession,before=scene.problemBefore,a=scene.art.customer,iso=new THREE.Vector3(m.problemStage.isolation.x,.225,m.problemStage.isolation.z).project(scene.view.camera);return {isolationProjected:!!m.problemStage.isolated&&Math.abs(iso.x)<.9&&Math.abs(iso.y)<.9&&iso.z>=-1&&iso.z<=1,source:'problem-static-render-fixture',id:r.id,piece:r.definition.piece,phase:r.phase,site:m.problemStage.site,canonical:m.customerTalk.content===OTR.registry.content(r.scenario),mode:m.mode,people:a.people.filter(p=>p.actor).length,buildings:a.imports.length,actors:m.problemStage.actors.length,visiblePeople:a.people.filter(p=>p.actor?p.actor.mesh.visible:p.state.visible&&p.state.site===m.problemStage.site).map(p=>p.state.key),siteNumber:m.problemStage.addresses.find(p=>p.site===m.problemStage.site)?.number||null,assetDoors:a.entrances.filter(p=>p.assetDoor).length,mountedPlaques:a.plates.length,lettering:a.words.count,font:a.words.font,handheld:scene.handheld.isOpen,panel:!!scene.panel,bounded:m.blocked(m.bounds.x0-1,m.bounds.z0),checkpointUnchanged:before.checkpoint===JSON.stringify(OTR.fpStore.read()),eventsUnchanged:before.events===JSON.stringify(OTR.workday.events),workdayUnchanged:before.workday===JSON.stringify(OTR.save.data.workday||null)};});(report.problemProof||(report.problemProof={}))[name]=proof;report.problemFixture=true;
  }
  if(process.env.QA_PROBLEM_ROUTES==='1')for(const name of ['closurecab','closuremirror','closurebarrier','closureturn','closurebay','closuredevice','closurecontrols','closurereverse']){
   if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(name))continue;
   await p.evaluate(require('./tools/fp-problem-route-pose'),{name,stage:'launch'});
   await p.waitForFunction(()=>OTR.game.scene.isActive('FirstPersonScenarioScene')&&!OTR.game.scene.getScene('FirstPersonScenarioScene').loading,{timeout:180000});
   await p.evaluate(require('./tools/fp-problem-route-pose'),{name,stage:'pose'});await sample(name);
   const proof=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=s.model,r=s.scenarioSession,before=s.closureBefore;return {source:'closure-static-resource-pose',id:r.id,registered:OTR.fpScenario.definitions.has(r.scenario.scene3d),phase:r.phase,mode:m.mode,bounded:m.blocked(m.bounds.x0-1,m.bounds.z0),solidClosure:m.solids.includes(m.roadworks),gates:m.roadProblem.state.route.points.length,mountedSigns:s.art.signs.entries.filter(e=>e.sign.kind==='roadworks').length,floatingClosure:s.art.labels.some(l=>l.text==='This street is closed.'),fontLettering:!!s.art.signLettering.atlas,handheld:s.handheld.isOpen,panel:!!s.panel,reverse:m.van.gear===-1,checkpointUnchanged:before.checkpoint===JSON.stringify(OTR.fpStore.read()),eventsUnchanged:before.events===JSON.stringify(OTR.workday.events),workdayUnchanged:before.workday===JSON.stringify(OTR.save.data.workday||null)};});
   (report.closureProof||(report.closureProof={}))[name]=proof;report.closureFixture=true;
  }
  if(process.env.QA_PROBLEM_BLOCKED==='1')for(const name of ['blockedcab','blockednotice','blockedcar','blockedcard','blockedcargo','blockeddevice','blockedcontrols','blockedgate']){
   if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(name))continue;
   await p.evaluate(require('./tools/fp-problem-blocked-pose'),{name,stage:'launch'});
   await p.waitForFunction(()=>OTR.game.scene.isActive('FirstPersonScenarioScene')&&!OTR.game.scene.getScene('FirstPersonScenarioScene').loading,{timeout:180000});
   await p.evaluate(require('./tools/fp-problem-blocked-pose'),{name,stage:'pose'});await sample(name);
   const proof=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=s.model,r=s.scenarioSession,b=m.blockedProblem,before=s.blockedBefore;return {source:'blocked-static-resource-pose',id:r.id,registered:OTR.fpScenario.definitions.has(r.scenario.scene3d),phase:r.phase,mode:m.mode,bounded:m.blocked(m.bounds.x0-1,m.bounds.z0),solidCar:m.solids.includes(b.car),solidHolder:m.solids.includes(b.holder),mountedSigns:s.art.signs.entries.filter(e=>['blocked-access','attempt-card'].includes(e.sign.kind)).length,floatingAddress:s.art.labels.some(l=>l.address),fontLettering:!!s.art.signLettering.atlas,handheld:s.handheld.isOpen,panel:!!s.panel,cargo:m.cargoOpen,cardLeft:!!s.art.blockedProblem.paperEntry.visible,locked:b.state.locked,gate:!!b.gate&&m.solids.includes(b.gate),checkpointUnchanged:before.checkpoint===JSON.stringify(OTR.fpStore.read()),eventsUnchanged:before.events===JSON.stringify(OTR.workday.events),workdayUnchanged:before.workday===JSON.stringify(OTR.save.data.workday||null)};});
   (report.blockedProof||(report.blockedProof={}))[name]=proof;report.blockedFixture=true;
  }
  if(process.env.QA_SCANNER_STOPS==='1')for(const name of ['scannercab','scannerreverse','scannercargo','scannerplanter','scannerphoto','scannersignature','scannerreception','scannerclosed','scannerrefusal','scanneridvalid','scanneridunder','scanneridexpired','scannerhandheld','scannercontrols']){
   if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(name))continue;
   await p.evaluate(require('./tools/fp-scanner-fixture'),{view:name});await p.waitForFunction(()=>OTR.game.scene.isActive('FirstPersonScenarioScene')&&!OTR.game.scene.getScene('FirstPersonScenarioScene').loading,{timeout:180000});
   await p.evaluate(require('./tools/fp-scanner-pose'),name);await sample(name);
   const proof=await p.evaluate(()=>{const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=scene.model,run=scene.scenarioSession,d=m.customerStop,a=scene.art.customerStop,before=scene.scannerBefore;return {source:'scanner-static-render-fixture',id:run.id,index:d.index,piece:run.definition.piece,phase:run.phase,mode:m.mode,building:a.imports.length,person:!!a.human,assetDoor:a.assetDoor,lettering:a.words.count,font:a.words.font,canonical:d.content===OTR.registry.content(run.scenario),bounded:m.blocked(m.bounds.x0-1,m.bounds.z0),spot:d.state.spot,photo:d.photo,photoPreview:d.photoPreview?{width:scene.textures.get(d.photoPreview).getSourceImage().width,height:scene.textures.get(d.photoPreview).getSourceImage().height,visible:!!scene.scannerPhotoView?.visible}:null,frameClear:!scene.moduleGoal?.visible&&!scene.moduleClock?.visible,identity:!!d.identity,idField:scene.scannerIdentity?.page??null,handheld:scene.handheld.isOpen,panel:!!scene.panel,checkpointUnchanged:before.checkpoint===JSON.stringify(OTR.fpStore.read()),eventsUnchanged:before.events===JSON.stringify(OTR.workday.events),workdayUnchanged:before.workday===JSON.stringify(OTR.save.data.workday||null)};});(report.scannerProof||(report.scannerProof={}))[name]=proof;report.scannerFixture=true;
  }
  report.phaserTextures=await textures();
  report.phaserTexturesPeak=Object.values(report.prototype).reduce((a,v)=>v.phaserTextures.withMipmapsUpperBytes>a.withMipmapsUpperBytes?v.phaserTextures:a,report.phaserTextures);
  report.missingViews=(process.env.QA_VIEWS||'').split(',').filter(name=>name&&!Object.hasOwn(report.prototype,name));
  report.errors=errors;fs.writeFileSync(path.join(OUT,`bench-${TAG}-${GFX}.json`),JSON.stringify(report,null,2));
  if(report.missingViews.length)throw Error('Requested benchmark views were not sampled: '+report.missingViews.join(', '));
  if(Object.values(report.prototype).some(sample=>sample.contextLost))throw Error('Shared WebGL context was lost');
  if(GFX==='low'&&Object.values(report.prototype).some(s=>s.peak.calls>64||s.peak.triangles>2500||s.peak.textures>2||s.peak.attachmentBytes>4*1024*1024))throw Error('Low graphics exceeded the documented 1280x720 3D resource budget');
  if(GFX==='low'&&report.phaserTexturesPeak.withMipmapsUpperBytes>4*1024*1024)throw Error('Low graphics exceeded the documented Phaser texture estimate');
  const floor=Number(process.env.QA_FPS_FLOOR)||0;
  if(floor&&Object.values(report.prototype).some(s=>s.avgFPS<floor||s.low1FPS<floor))throw Error('Frame-rate floor failed; see the saved renderer and sample results');
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
