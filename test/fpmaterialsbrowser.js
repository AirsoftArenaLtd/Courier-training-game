/* Native decoded surface pixels on actual roads, lawns, paths and facades; review camera poses are fixtures. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const base=process.env.QA_BASE||'http://127.0.0.1:8354',tag=process.env.QA_TAG||'c49-materials',report={runs:[],errors:[],checks:0,fixture:'Stationary day-one midday world, actual route surfaces and decoded uploaded images. Camera poses are fixtures; toggling the atlas strength changes no mission or report.'};let p;
 const b=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const mode of (process.env.QA_MODES||'high,missing-asphalt,low').split(',')){
   console.log('materials '+mode);p=await b.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/.test(m.text()))report.errors.push(m.text());});const requests=[];
   await p.setRequestInterception(true);p.on('request',async r=>{if(/\.jpg$/.test(r.url()))requests.push(new URL(r.url()).pathname);if(mode==='missing-asphalt'&&r.url().includes('asphalt_pit_lane_diff'))await r.respond({status:404,body:''});else await r.continue();});
   await p.goto(base+'/first-person.html?gfx='+(mode==='low'?'low':'high'));await p.waitForFunction(()=>window.OTR?.game?.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:90000});
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.closePanel();OTR.a11y.settings().reducedMotion=true;const plan=OTR.fpRoute.plan(1,7);plan.timeOfDay='midday';s.model=OTR.fpMission.create('campaign',7,plan);s.model.step=()=>{};s.area='route';s.rebuildWorld();s.model.paused=true;s.model.heldId=null;s.closePanel(false);s.model.mode='walk';s.sync();s.refresh();});
   const info=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),a=s.art.surfaces;return {stats:s.assetBank.stats,models:s.assetBank.models.size,images:s.assetBank.textures.size,atlas:a&&{width:a.atlas.image.width,height:a.atlas.image.height,bytes:a.bytes,available:a.available},snapshot:JSON.stringify(s.model.snapshot()),events:JSON.stringify(OTR.workday.events)};});
   assert.equal(info.models,mode==="low"?14:18,"High adds B-1's desk and C-51's people and bench");assert.equal(info.images,mode==='low'?0:mode==='high'?5:4);assert.equal(info.stats.failed,mode==='missing-asphalt'?1:0);assert.equal(requests.length,mode==='low'?0:5);report.checks+=4;
   const run={mode,...info,requests,surfaces:[]};report.runs.push(run);if(mode==='low'){assert.equal(info.atlas,null);report.checks++;await p.close();continue;}
   assert.equal(info.atlas.width,2048);assert.equal(info.atlas.height,1024);assert.equal(info.atlas.bytes,8388608);report.checks+=3;
   const pixels=()=>p.evaluate(()=>new Promise(resolve=>{const game=OTR.game,start=game.loop.frame,read=()=>{if(game.loop.frame<start+2)return;game.events.off('postrender',read);const gl=game.renderer.gl,data=new Uint8Array(64*64*4);gl.readPixels(608,328,64,64,gl.RGBA,gl.UNSIGNED_BYTE,data);resolve(Array.from(data));};game.events.on('postrender',read);}));
   for(const kind of [1,2,3,4,5]){
    const pose=await p.evaluate(({kind,missing})=>{
     const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,T=THREE,stop=m.stops[kind===4?1:0],side=stop.side||1,candidates=[];
     if(kind===1)candidates.push({x:m.town.xs[0]+2.5,z:(m.town.zs[0]+m.town.zs[1])/2,y:0});
     else if(kind===2)candidates.push({x:9,z:5,y:0});
     else if(kind===3)for(const l of m.town.lots)for(const sign of [-1,1])candidates.push({x:l.x-(l.side||1)*l.w*.44,z:l.z+sign*l.d*.38,y:0});
     else candidates.push({x:stop.x,z:stop.z-2,y:1.65,wall:true,side});
     for(const c of candidates){const dx=c.wall?-c.side*2:0,dz=c.wall?0:2;Object.assign(m.player,{x:c.x+dx,z:c.z+dz,yaw:Math.atan2(-dx,dz),pitch:Math.atan2(1.65-c.y,Math.hypot(dx,dz))});s.sync();s.refresh();const objects=[];s.view.world.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(!p.visible)return;objects.push(o);});const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(),s.view.camera);const hit=ray.intersectObjects(objects,false)[0],ids=hit?.object.geometry.getAttribute('otrSurfaceKind'),actual=ids&&hit.instanceId!==undefined?ids.getX(hit.instanceId):0;
      if(actual===(missing&&kind===1?0:kind))return {player:{...m.player},actual,object:hit.object.name,point:hit.point.toArray()};
     }throw Error('No actual rendered surface for kind '+kind);
    },{kind,missing:mode==='missing-asphalt'});
    const before=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return {snapshot:JSON.stringify(s.model.snapshot()),events:JSON.stringify(OTR.workday.events),strength:s.art.surfaces.strength.value};});
    const on=await pixels();await p.screenshot({path:path.join(OUT,`${tag}-${mode}-${kind}-on.png`)});await p.evaluate(()=>{OTR.game.scene.getScene('FirstPersonScene').art.surfaces.strength.value=0;});const off=await pixels();await p.screenshot({path:path.join(OUT,`${tag}-${mode}-${kind}-off.png`)});
    let changed=0,total=0;for(let i=0;i<on.length;i+=4){const delta=Math.max(...[0,1,2].map(c=>Math.abs(on[i+c]-off[i+c])));if(delta>2)changed++;total+=delta;}const fraction=changed/(on.length/4);if(mode==='missing-asphalt'&&kind===1)assert.equal(changed,0,'the missing asphalt retains its palette');else assert.ok(fraction>.1,JSON.stringify({mode,kind,changed,fraction,pose}));report.checks++;
    const after=await p.evaluate(strength=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.art.surfaces.strength.value=strength;return {snapshot:JSON.stringify(s.model.snapshot()),events:JSON.stringify(OTR.workday.events)};},before.strength);assert.equal(after.snapshot,before.snapshot);assert.equal(after.events,before.events);report.checks+=2;run.surfaces.push({kind,pose,changed,fraction,totalDelta:total});console.log(mode+' surface '+kind+' '+changed+' changed pixels');
   }
   assert.equal(await p.evaluate(()=>OTR.game.renderer.gl.isContextLost()),false);report.checks++;await p.close();p=null;
  }
  assert.deepEqual(report.errors,[]);report.checks++;report.complete=true;console.log(report.checks+' material browser checks passed');
 }catch(e){report.failure=e.stack;if(p)await p.screenshot({path:path.join(OUT,tag+'-failure.png')}).catch(()=>{});throw e;}finally{fs.writeFileSync(path.join(OUT,tag+'.json'),JSON.stringify(report,null,2));await b.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
