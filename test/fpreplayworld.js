/* Detached replay with the real mission checkpoint and CPU world; no WebGL pixels or frame-rate claim. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE,document:{hidden:false}};c.window=c;vm.createContext(c);
for(const p of ['data/workday_events.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fplighting.js','src/core/fpweather.js','src/core/fpbranding.js','src/core/fpworld.js','src/core/fpreplay.js','src/core/fpreplayui.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+p,'utf8'),c);
const O=c.OTR;O.gfx={high:()=>false};
function world(model){const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.background=new THREE.Color();world.fog=new THREE.Fog(0,65,165);world.add(camera);const s={model,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}};s.art=O.fpWorld.build(s,model);return s;}
test('real mission snapshots replay in a separate world without changing the source, scoring or checkpoint',()=>{
 O.workday.begin();const m=O.fpMission.create('campaign',7);Object.assign(m,{phase:'route',mode:'cab',departed:true,paused:false});Object.assign(m.van,{speed:2,hand:false,belt:true});
 m.workdayRules={night:false};m.driveAssist=.4;O.fp.suspension(m,0);Object.assign(m.motion,{pitch:.01,roll:.005,rpm:1840});
 const live=world(m),r=new O.fpReplay.Recorder();r.bind(m,O.workday.events,'world-day');
 for(let i=0;i<=60;i++){m.elapsed=i/20;m.van.z=-2*m.elapsed;live.art.sync(m,null,'route');if(i===60)O.workday.report('drive.contact',{key:0,where:{x:m.van.x,z:m.van.z,mph:5}});r.frame(m,live.view.camera,O.workday.events,'world-day');}
 const clip=r.finish({id:'world-day',day:1}),detached=O.fpReplay.restore(clip);assert.ok(detached,'the captured actual checkpoint restores');assert.equal(detached.workdayRules.night,false);assert.equal(detached.driveAssist,.4);
 const before=JSON.stringify(m.snapshot()),events=JSON.stringify(O.workday.events),score=O.workday.log.score(),sourceCamera=live.view.camera.matrixWorld.clone(),replay=world(detached);
 try{
  for(let i=0;i<200;i++){const t=(i%61)/20;O.fpReplay.sample(clip,t,detached,replay.view.camera);replay.art.sync(detached,null,'route');O.fpReplay.sample(clip,t,detached,replay.view.camera);assert.equal(detached.paused,true);assert.equal(detached.elapsed,t);assert.equal(detached.motion.pitch,.01);assert.equal(detached.motion.rpm,1840);assert.ok(replay.view.camera.position.toArray().every(Number.isFinite));}
  assert.equal(JSON.stringify(m.snapshot()),before);assert.equal(JSON.stringify(O.workday.events),events);assert.equal(O.workday.log.score(),score);assert.ok(live.view.camera.matrixWorld.equals(sourceCamera));
 }finally{replay.art.dispose();live.art.dispose();}
 assert.equal(replay.view.world.children.length,1);assert.equal(live.view.world.children.length,1);
});

test('the live adapter binds the actual record day and publishes only after its matching completion',()=>{
 O.workday.detach();O.workday.begin();O.workday.current={id:'calendar-day',day:9};const m=O.fpMission.create('campaign',3);m.paused=false;const scene={hubWorkday:true,model:m,area:'route',view:{camera:new THREE.PerspectiveCamera()}};O.fpReplayUI.bind(scene);assert.ok(scene.replayRecorder);assert.equal(O.fpReplayUI.clip,null);O.fpReplayUI.capture(scene);O.workday.report('drive.lights',{key:0,ok:false});m.elapsed=.1;O.fpReplayUI.capture(scene);assert.equal(O.fpReplayUI.clip,null);const events=JSON.stringify(O.workday.events),before=JSON.stringify(m.snapshot());O.fpReplayUI.complete(scene,{id:'calendar-day',day:9});assert.equal(O.fpReplayUI.clip.day,9);assert.equal(O.fpReplayUI.clip.routeDay,1);assert.equal(O.fpReplayUI.clip.recordId,'calendar-day');assert.equal(JSON.stringify(O.workday.events),events);assert.equal(JSON.stringify(m.snapshot()),before);O.workday.current={id:'next-day',day:10};O.fpReplayUI.bind(scene);assert.equal(O.fpReplayUI.clip,null);O.workday.detach();
});
test('the standalone prototype and cargo practice do not allocate a workday recording',()=>{
 O.workday.detach();O.workday.begin();O.workday.current={id:'prototype',day:1};const s={hubWorkday:false,model:O.fpMission.create('campaign',1)};O.fpReplayUI.bind(s);assert.equal(s.replayRecorder,null);s.hubWorkday=true;s.model.kind='practice';O.fpReplayUI.bind(s);assert.equal(s.replayRecorder,null);O.workday.detach();
});
test('an older review cannot expose another record even when it has the same plan',()=>{
 const old=O.fpReplayUI.button;let made=0,starts=0,backData;O.fpReplayUI.button=(_s,_x,_y,_w,_t,action)=>{made++;return {press:action};};O.fpReplayUI.clip={recordId:'finished'};const scene={replayLeaving:true,sys:{settings:{key:'ResultsScene'}},d:{},scene:{start(_key,data){starts++;backData=data.backData;}}};
 const stops=[{stop:1,delivered:true}];O.fpReplayUI.recordStops=stops;
 try{assert.equal(O.fpReplayUI.entry(scene,{plan:{stops:JSON.parse(JSON.stringify(stops))}}),null);assert.equal(O.fpReplayUI.entry(scene,{}),null);assert.equal(made,0);const first=O.fpReplayUI.entry(scene,{plan:{stops}});first.press();first.press();assert.equal(starts,1);assert.equal(backData.again,true);const again=O.fpReplayUI.entry(scene,{plan:{stops}});again.press();assert.equal(starts,2);scene.sys.settings.key='DriveReviewScene';scene.pinObjs=[{ring:{visible:false}},{ring:{visible:true}}];O.fpReplayUI.entry(scene,{plan:{stops}}).press();assert.equal(backData.select,1);}finally{O.fpReplayUI.button=old;O.fpReplayUI.clip=O.fpReplayUI.recordStops=null;}
});

test('replay releases completed UI canvases while preserving borrowed references and loaded assets',()=>{
 const make=(tagName='CANVAS')=>({source:[{image:{tagName}}]});
 const list={rays:make(),results_bg:make(),panel_used:make(),gfx_unused:make(),company_bg:make('IMG'),atlas:make()};
 const textures={list,exists:key=>!!list[key],remove:key=>{delete list[key];}};
 const scene={textures,game:{scene:{scenes:[{children:{list:[{list:[{texture:{key:'panel_used'}}]}]}}]}}};
 assert.equal(O.fpReplayUI.releasePreviousUI(scene),3);assert.ok(list.panel_used);assert.ok(list.company_bg);assert.ok(list.atlas);assert.equal(list.rays,undefined);assert.equal(list.results_bg,undefined);assert.equal(list.gfx_unused,undefined);
});
