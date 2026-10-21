/* Detached replay with the real mission checkpoint and CPU world; no WebGL pixels or frame-rate claim. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const p of ['data/workday_events.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fplighting.js','src/core/fpweather.js','src/core/fpbranding.js','src/core/fpworld.js','src/core/fpreplay.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+p,'utf8'),c);
const O=c.OTR;O.gfx={high:()=>false};
function world(model){const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.background=new THREE.Color();world.fog=new THREE.Fog(0,65,165);world.add(camera);const s={model,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}};s.art=O.fpWorld.build(s,model);return s;}
test('real mission snapshots replay in a separate world without changing the source, scoring or checkpoint',()=>{
 O.workday.begin();const m=O.fpMission.create('campaign',7);Object.assign(m,{phase:'route',mode:'cab',departed:true,paused:false});Object.assign(m.van,{speed:2,hand:false,belt:true});
 const live=world(m),r=new O.fpReplay.Recorder();r.bind(m,O.workday.events,'world-day');
 for(let i=0;i<=60;i++){m.elapsed=i/20;m.van.z=-2*m.elapsed;live.art.sync(m,null,'route');if(i===60)O.workday.report('drive.contact',{key:0,where:{x:m.van.x,z:m.van.z,mph:5}});r.frame(m,live.view.camera,O.workday.events,'world-day');}
 const clip=r.finish({id:'world-day',day:1}),detached=O.fpMission.restore(JSON.parse(clip.context));assert.ok(detached,'the captured actual checkpoint restores');
 const before=JSON.stringify(m.snapshot()),events=JSON.stringify(O.workday.events),score=O.workday.log.score(),sourceCamera=live.view.camera.matrixWorld.clone(),replay=world(detached);
 try{
  for(let i=0;i<200;i++){const t=(i%61)/20;O.fpReplay.sample(clip,t,detached,replay.view.camera);replay.art.sync(detached,null,'route');O.fpReplay.sample(clip,t,detached,replay.view.camera);assert.equal(detached.paused,true);assert.equal(detached.elapsed,t);assert.ok(replay.view.camera.position.toArray().every(Number.isFinite));}
  assert.equal(JSON.stringify(m.snapshot()),before);assert.equal(JSON.stringify(O.workday.events),events);assert.equal(O.workday.log.score(),score);assert.ok(live.view.camera.matrixWorld.equals(sourceCamera));
 }finally{replay.art.dispose();live.art.dispose();}
 assert.equal(replay.view.world.children.length,1);assert.equal(live.view.world.children.length,1);
});
