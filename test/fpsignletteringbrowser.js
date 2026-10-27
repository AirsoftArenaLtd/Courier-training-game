/* Actual face pixels on all lettered signs, with the material pack present and absent. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const base=process.env.QA_BASE||'http://127.0.0.1:8356',tag=process.env.QA_TAG||'c50-ink',report={checks:0,runs:[],errors:[],fixture:'Stationary route. Camera approaches are fixtures; on/off changes only the lettering uniform. Actual sign geometry and centre-ray shape are required.'};let p;
 const b=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const mode of (process.env.QA_MODES||'low,high,missing-images').split(',')){
   p=await b.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))report.errors.push(m.text());});
   const requests=[];await p.setRequestInterception(true);p.on('request',async r=>{if(/\.jpg$/.test(r.url())){requests.push(r.url());if(mode==='missing-images'){await r.respond({status:404,body:''});return;}}await r.continue();});
   await p.goto(base+'/first-person.html?gfx='+(mode==='low'?'low':'high'));await p.waitForFunction(()=>window.OTR?.game?.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:90000});
   const info=await p.evaluate(()=>{
    const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.closePanel();OTR.a11y.settings().reducedMotion=true;
    const plan=OTR.fpSigns.prepare(OTR.fpLater.prepare(OTR.fpRoute.plan(3,7)));plan.timeOfDay='midday';s.model=OTR.fpMission.create('campaign',7,plan);s.model.mode='walk';s.model.step=()=>{};s.area='route';s.rebuildWorld();s.sync();s.refresh();
    s.game.events.on('prerender',()=>{s.reticle.setVisible(false);s.labels.forEach(x=>x.object.setVisible(false));if(s.art.weatherDrops)s.art.weatherDrops.visible=false;});
    const a=s.art.signLettering;return {atlas:!!a.atlas,borrowed:a.borrowed,images:s.assetBank.textures.size,atlasSize:a.atlas?[a.atlas.image.width,a.atlas.image.height]:null};
   });
   assert.equal(info.atlas,mode!=='low');assert.equal(info.borrowed,mode==='high');assert.equal(info.images,mode==='high'?5:0);assert.equal(requests.length,mode==='low'?0:5);report.checks+=4;
   const run={mode,...info,signs:[]};report.runs.push(run);
   const pixels=()=>p.evaluate(()=>new Promise(resolve=>{const g=OTR.game,start=g.loop.frame,read=()=>{if(g.loop.frame<start+2)return;g.events.off('postrender',read);const gl=g.renderer.gl,data=new Uint8Array(192*160*4);gl.readPixels(544,280,192,160,gl.RGBA,gl.UNSIGNED_BYTE,data);resolve([...data]);};g.events.on('postrender',read);}));
   for(const kind of ['stop','street','number','giveway','speed','school','roadworks','oneway']){
    const proof=await p.evaluate(kind=>{
     const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,T=THREE,e=s.art.signs.entries.find(e=>e.sign.kind===kind);if(!e)throw Error('Missing sign '+kind);
     const bottom=kind==='number'?0:kind==='street'?.83:.62,point=new T.Vector3(0,0,.5-(bottom+1)/2).applyMatrix4(e.matrix),ray=new T.Raycaster();let found=false;
     for(const distance of [4,6,8]){for(const side of [0,-2,2,-4,4]){
      const x=e.x+e.normal.x*distance+e.normal.z*side,z=e.z+e.normal.z*distance-e.normal.x*side;if(m.blocked(x,z))continue;
      Object.assign(m.player,{x,z,yaw:Math.atan2(point.x-x,-(point.z-z)),pitch:Math.atan2(1.65-point.y,Math.hypot(point.x-x,point.z-z))});s.art.resetCamera();s.sync();
      const objects=[];s.view.world.traverse(o=>{if(!o.isMesh)return;for(let q=o;q;q=q.parent)if(!q.visible)return;objects.push(o);});ray.setFromCamera(new T.Vector2(),s.view.camera);const hit=ray.intersectObjects(objects,false)[0],shape=hit?.object.geometry.getAttribute('otrSignShape');
      if(e.mainVisible&&shape&&hit.instanceId!==undefined&&shape.getX(hit.instanceId)===e.shape){found=true;break;}
     }if(found)break;}
     if(!found)throw Error('No actual face approach for '+kind);s.refresh();s.art.signLettering.strength.value=1;
     return {kind,lines:OTR.fpSignLettering.lines(e.sign),shape:e.shape,player:{...m.player},snapshot:JSON.stringify(m.snapshot()),events:JSON.stringify(OTR.workday.events)};
    },kind);
    const on=await pixels();await p.screenshot({path:path.join(OUT,`${tag}-${mode}-${kind}.png`)});await p.evaluate(()=>{OTR.game.scene.getScene('FirstPersonScene').art.signLettering.strength.value=0;});const off=await pixels(),steady=await pixels();
    let changed=0;for(let i=0;i<on.length;i+=4)if(Math.max(...[0,1,2].map(c=>Math.abs(on[i+c]-off[i+c])))>5)changed++;
    assert.ok(changed>12,JSON.stringify({mode,kind,changed,proof}));assert.deepEqual(steady,off,'the control image must stay still without the lettering');report.checks+=2;
    const after=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.art.signLettering.strength.value=1;return {snapshot:JSON.stringify(s.model.snapshot()),events:JSON.stringify(OTR.workday.events),textures:s.view.diagnostics.textures,contextLost:s.game.renderer.gl.isContextLost()};});
    assert.equal(after.snapshot,proof.snapshot);assert.equal(after.events,proof.events);assert.ok(after.textures<=(mode==='low'?2:4));assert.equal(after.contextLost,false);report.checks+=4;
    delete proof.snapshot;delete proof.events;run.signs.push({...proof,changed,textures:after.textures});console.log(mode+' '+kind+': '+changed+' actual ink pixels');
   }
   await p.close();p=null;
  }
  assert.deepEqual(report.errors,[]);report.checks++;report.complete=true;console.log(report.checks+' physical lettering checks passed');
 }catch(e){report.failure=e.stack;if(p)await p.screenshot({path:path.join(OUT,tag+'-failure.png')}).catch(()=>{});throw e;}finally{fs.writeFileSync(path.join(OUT,tag+'.json'),JSON.stringify(report,null,2));await b.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
