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
 const errors=[];let report={tag:TAG,quality:GFX};
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
  report.accessibility=(process.env.QA_A11Y||'').split(',').filter(Boolean);
  await p.evaluate(options=>{const s=OTR.game.scene.getScene('FirstPersonScene'),a=OTR.a11y.settings();a.colour=options.includes('colour');a.large=options.includes('large');a.reducedMotion=options.includes('reduced');OTR.a11y.applyColour(s);if(a.large){s.objective.setFontSize(23);s.hint.setFontSize(OTR.a11y.size(18));}},report.accessibility);
  report.renderer=await p.evaluate(()=>{const gl=OTR.game.renderer.gl,e=gl.getExtension('WEBGL_debug_renderer_info');return {name:e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),width:gl.drawingBufferWidth,height:gl.drawingBufferHeight};});
  const textures=async()=>p.evaluate(()=>{const seen=new Set();let count=0,rgbaBytes=0;for(const texture of Object.values(OTR.game.textures.list))for(const source of texture.source||[]){const key=source.glTexture||source;if(seen.has(key))continue;seen.add(key);count++;rgbaBytes+=source.width*source.height*4;}return {count,baseLevelRGBABytes:rgbaBytes,withMipmapsUpperBytes:Math.ceil(rgbaBytes*4/3)};});
  const sample=async name=>{
   if(process.env.QA_VIEWS&&!process.env.QA_VIEWS.split(',').includes(name))return;
   await wait(1500);
   const value=await p.evaluate(()=>new Promise(resolve=>{const frames=[],keys=['calls','triangles','textures','geometries','attachmentBytes'],peak={calls:0,triangles:0,textures:0,geometries:0,attachmentBytes:0};let prev=performance.now(),start=prev;const onFrame=()=>{const now=performance.now();frames.push(now-prev);prev=now;
    const d=OTR.game.scene.getScene('FirstPersonScene').view.diagnostics;
    if(d)for(const key of keys)peak[key]=Math.max(peak[key],d[key]);
    if(now-start<10000)return;
    OTR.game.events.off('step',onFrame);frames.sort((a,b)=>a-b);const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,worst=frames.slice(Math.floor(frames.length*.99));
    resolve({frames:frames.length,avgFPS:+(1000/mean(frames)).toFixed(2),low1FPS:+(1000/mean(worst)).toFixed(2),p99ms:+frames[Math.floor(frames.length*.99)].toFixed(2),maxMs:+frames[frames.length-1].toFixed(2),peak,target:d&&{width:d.targetWidth,height:d.targetHeight},contextLost:OTR.game.renderer.gl.isContextLost()});};OTR.game.events.on('step',onFrame);}));
   value.phaserTextures=await textures();console.log(TAG+' '+GFX+' '+name+' '+JSON.stringify(value));report.prototype[name]=value;
  };
  report.prototype={};
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());await sample('hub');
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').launch('campaign'));
  await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model&&!s.transitioning;});
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());await sample('depot');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.mode='cab';s.model.paused=false;s.sync();});await sample('cab');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.__mirrorBench=()=>s.model.mirrorAt=s.model.elapsed;s.events.on('update',s.__mirrorBench);});await sample('mirror');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.events.off('update',s.__mirrorBench);s.model.mode='walk';s.showScanner();});await sample('handheld');
  const hasAim=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');if(!s.handheld)return false;
   const p=s.model.parcels[0];p.location='held';s.model.heldId=p.id;s.handheld.scan();return true;});
  if(hasAim)await sample('barcodeAim');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.model.mode='cab';Object.assign(s.model.van,s.model.stops[0].park||{x:4,z:-42,yaw:0},{speed:0,hand:true});s.sync();});await sample('firstStop');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.mode='walk';const stop=s.model.stops[0];Object.assign(s.model.player,{x:stop.x-(stop.side||1)*1.5,z:stop.z,yaw:(stop.side||1)*Math.PI/2,pitch:0});s.sync();});await sample('doorstep');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.phase='return';Object.assign(s.model.van,{x:4,z:8,yaw:0,speed:0,hand:true});Object.assign(s.model.player,{x:12.2,z:5,yaw:-Math.PI/2,pitch:0});s.sync();});await sample('returns');
  for(let i=0;i<5;i++){
   await p.evaluate(i=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;if(!m.stops[i])return;m.mode='cab';m.phase='route';Object.assign(m.van,m.stops[i].park||{x:4,z:m.stops[i].z,yaw:0},{speed:0,hand:true});s.sync();},i);
   if(i>0)await sample('stop'+(i+1));
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.__mirrorBench=()=>s.model.mirrorAt=s.model.elapsed;s.events.on('update',s.__mirrorBench);});
   await sample('stop'+(i+1)+'Mirror');
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.events.off('update',s.__mirrorBench);s.model.mirrorAt=-100;});
  }
  if(await p.evaluate(()=>!!OTR.game.scene.getScene('FirstPersonScene').model.driving)){
   for(const look of ['front','mirror','walk']){
    await p.evaluate(look=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;m.paused=false;m.step=()=>{};m.phase='route';m.mode=look==='walk'?'walk':'cab';m.elapsed=0;
     const x=m.town.xs[0]+2,z=m.town.zs[1]+25;Object.assign(m.van,{x,z,yaw:0,speed:0,hand:true});Object.assign(m.player,{x:x-2,z:z+8,yaw:0,pitch:0});
     Object.assign(m.driving.bus,{state:'flashing',x,z:z-18,yaw:0});Object.assign(m.driving.siren,{state:'passing',x:x-1,z:z+14,yaw:0});OTR.fpDriving.syncActors(m);m.mirrorAt=look==='mirror'?0:-100;s.sync();},look);
    await sample('hazards'+look);
   }
  }
  if(await p.evaluate(()=>!!OTR.fpDay))for(const day of [2,6,4,3]){
   const weather=await p.evaluate(day=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const m=OTR.fpMission.create('campaign',7,OTR.fpRoute.plan(day,7));OTR.fpDay.configure(m);if(OTR.fpLoadout)OTR.fpLoadout.configure(m,'extra');
    if(OTR.fpDoors){OTR.fpDoors.configure(m);m.stops.forEach(stop=>stop.contacted=true);OTR.fpDoors.sync(m);}
    if(OTR.fpDriving){OTR.fpDriving.configure(m);const x=m.town.xs[0]+2,z=m.town.zs[1]+25;Object.assign(m.driving.bus,{state:'flashing',x,z:z-18,yaw:0});Object.assign(m.driving.siren,{state:'passing',x:x-1,z:z+14,yaw:0});OTR.fpDriving.syncActors(m);}
    s.model=m;s.rebuildWorld();m.mode='cab';m.paused=false;m.step=()=>{};Object.assign(m.van,{x:m.town.xs[0]+2,z:m.town.zs[1]+25,yaw:0,speed:0,hand:true});s.__weatherMirror=()=>{m.mirrorAt=m.elapsed;m.elapsed+=.016;};s.events.on('update',s.__weatherMirror);s.sync();return m.routeDay.weather;},day);
   await sample('weather'+weather+'Mirror');await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.events.off('update',s.__weatherMirror);});
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
   },look);await sample('door'+look);
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
