/* Isolated module sessions, physical report routing, bounded set-pieces and unchanged academy result identities. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/workday_events.js','src/core/theme.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpdriving.js','src/core/fpsignal.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpworld.js','src/core/fpscenario.js','src/core/fphud.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,F=O.fpScenario,M=O.fpMission;let completed=[],abandoned=0;
const scenario={id:'m1-pretrip',scene:'PreTripScene',scene3d:'test-cab',default3d:false,categories:['safety','efficiency'],blurb:'Inspect the van before driving.'};
const base={piece:'cab',goal:'Check the parking brake.',seconds:2,result:r=>({score:100,ratios:{safety:1,efficiency:1},log:r.log})};
O.registry={get:id=>id===scenario.id?scenario:null,content:()=>({starThresholds:[.5,.7,.9]})};
O.academy={assessing:null,coaching(){return !this.assessing;},abandon(){abandoned++;this.assessing=null;}};
O.flow={complete:(scene,id,result)=>completed.push({scene,id,result})};
const start=()=>{const r=F.create(scenario.id);F.begin(r);return r;};
test.beforeEach(()=>{F.definitions.clear();F.register('test-cab',base);O.academy.assessing=null;completed=[];abandoned=0;O.workday.begin();});
test('readiness, trainer choice and actual WebGL availability resolve to the same scenario id',()=>{
 assert.equal(F.resolve(scenario).scene,'PreTripScene');assert.equal(F.resolve(scenario,{choice:'3d'}).scene,'FirstPersonScenarioScene');
 assert.equal(F.resolve({...scenario,default3d:true},{choice:'2d'}).scene,'PreTripScene');
 assert.equal(F.resolve({...scenario,default3d:true},{webgl:false}).scene,'PreTripScene');
 assert.equal(F.resolve({...scenario,scene3d:'missing',default3d:true}).scene,'PreTripScene');
 for(const choice of ['auto','2d','3d'])assert.equal(F.resolve(scenario,{choice}).data.scenarioId,scenario.id);
 const only={...scenario,scene:undefined};assert.equal(F.resolve(only).presentation,'3d');assert.equal(F.resolve(only,{webgl:false}).presentation,'unavailable');
 assert.equal(F.resolve(null).presentation,'unavailable');assert.throws(()=>F.resolve(scenario,{choice:'maybe'}));
});
test('data identities, content, thresholds and registries are never rewritten by the runner',()=>{
 const before=JSON.stringify(scenario),r=F.create(scenario.id);assert.equal(r.id,scenario.id);assert.equal(r.scenario,scenario);assert.equal(r.content.starThresholds.length,3);assert.equal(JSON.stringify(scenario),before);
 assert.throws(()=>F.register('test-cab',base));assert.throws(()=>F.register('bad',{...base,piece:'whole-city'}));assert.throws(()=>F.create('missing'));
});
test('the clock starts after the brief and stops during pause, loading and handheld use',()=>{
 const r=F.create(scenario.id);F.advance(r,1);assert.equal(r.elapsed,0);assert.equal(F.begin(r),true);assert.equal(F.begin(r),false);
 F.advance(r,.05,false);assert.equal(r.elapsed,0);F.advance(r,-1);assert.equal(r.elapsed,0);
 for(let i=0;i<39;i++)assert.equal(F.advance(r,.05),false);assert.equal(F.advance(r,.05),true);assert.ok(r.remaining<1e-8);
});
test('practice and assessment hide coaching independently and quitting never refunds an attempt',()=>{
 const practice=start();assert.equal(F.coaching(practice),true);F.abandon(practice);assert.equal(abandoned,0);
 O.academy.assessing=scenario.id;const r=start();assert.equal(r.assessment,true);assert.equal(F.coaching(r),false);F.abandon(r);F.abandon(r);assert.equal(abandoned,1);assert.equal(r.phase,'abandoned');
});
test('assessed physical signal state is readable without giving the three-second rule',()=>{
 c.Phaser={Scene:class{}};O.registerScene=()=>{};
 for(const file of ['FirstPersonScene','FirstPersonScenarioScene'])vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/'+file+'.js','utf8'),c);
 const hint=vm.runInContext('FirstPersonScenarioScene.prototype.controlHint',c),m=M.create('campaign',7);m.signal=-1;
 const r={assessment:true},scene={scenarioSession:r};assert.equal(hint.call(scene,'cab-signal-left',m,'O'),'The left signal is on.');assert.equal(hint.call(scene,'cab-signal-right',m,'O'),'The right signal is off.');
 r.assessment=false;assert.match(hint.call(scene,'cab-signal-left',m,'O'),/three seconds/);
});
test('assessment captions omit live driving coaching while practice retains it',()=>{
 const m=M.create('campaign',7);m.mode='cab';m.van.belt=false;const r={assessment:true},scene={model:m,scenarioSession:r};
 assert.equal(O.fpHud.alert(scene),'');r.assessment=false;assert.equal(O.fpHud.alert(scene),'Fasten the seatbelt before moving.');
 r.model=m;m.trainingArea={key:'cab'};m.moduleGoal='Select neutral at the shifter.';assert.equal(O.fpHud.screenHint(m),m.moduleGoal);
});
test('completion delivers the adapter scale, log and same scenario id exactly once',()=>{
 const r=start(),scene={};r.log.check('safety',2,2,'The parking brake is set.');F.advance(r,.05);
 assert.equal(F.finish(r,scene),true);assert.equal(F.finish(r,scene),false);assert.equal(F.abandon(r),false);assert.equal(completed.length,1);assert.equal(completed[0].id,scenario.id);assert.equal(completed[0].result.score,100);assert.equal(completed[0].result.log,r.log);assert.equal(r.phase,'finished');
});
test('timeouts use the scenario result policy and invalid results never reach records',()=>{
 F.register('timeout',{...base,result:(r,reason)=>({score:reason==='timeout'?20:100,ratios:{safety:0},untested:['efficiency']})});const old=scenario.scene3d;scenario.scene3d='timeout';
 try{const r=start();F.finish(r,{},'timeout');assert.equal(completed[0].result.score,20);assert.deepEqual(Array.from(completed[0].result.untested),['efficiency']);}
 finally{scenario.scene3d=old;}
 F.register('invalid',{...base,result:()=>({score:Infinity,ratios:{safety:1}})});scenario.scene3d='invalid';try{assert.throws(()=>F.finish(start(),{}));assert.equal(completed.length,1);}finally{scenario.scene3d=old;}
});
test('the real mission, gear, signal and driving controllers cannot report into a suspended workday',()=>{
 const seen=[];F.definitions.set('test-cab',{...base,report:(r,type,detail)=>seen.push({type,detail})});
 O.workday.report('brief.read',{key:'saved'});const before=JSON.stringify(O.workday.events),r=start(),m=F.model(r);m.paused=false;
 m.report('inspect:tyres','safety','good');O.fpCab.act(m,'cab-reverse');O.fpDriving.configure(m);O.fpDriving.fire(m,'drive.mirrors','local',true,'Checked the mirrors.');O.fpSignal.report(m,false);O.fpDay.fire(m,'drive.weather','local',false,'The weather check failed.');
 assert.equal(JSON.stringify(O.workday.events),before);assert.ok(seen.some(e=>e.type==='inspect.tires'));assert.ok(seen.some(e=>e.type==='drive.gear'));assert.ok(seen.some(e=>e.type==='drive.signal'));assert.ok(seen.some(e=>e.type==='drive.mirrors'));
});
test('repeated physical reports are deduplicated locally and are ignored outside an active session',()=>{
 let count=0;F.definitions.set('test-cab',{...base,report:()=>count++});const r=F.create(scenario.id);F.report(r,'inspect.tires',{key:'a'});assert.equal(count,0);F.begin(r);
 F.report(r,'inspect.tires',{key:'a'});F.report(r,'inspect.tires',{key:'a'});F.report(r,'inspect.lights',{key:'a'});assert.equal(count,2);F.abandon(r);F.report(r,'inspect.tires',{key:'b'});assert.equal(count,2);
});
test('all four set-pieces have physical boundaries and no module field enters a checkpoint',()=>{
 for(const piece of Object.keys(F.pieces)){
  F.definitions.set('test-cab',{...base,piece});const m=F.model(start()),b=m.bounds;
  assert.ok(m.blocked(b.x0-1,b.z0));assert.ok(m.blocked(b.x1+1,b.z1));assert.ok(m.player.x>=b.x0&&m.player.x<=b.x1);assert.ok(m.player.z>=b.z0&&m.player.z<=b.z1);
    const snapshot=m.snapshot();assert.equal(snapshot.moduleReport,undefined);assert.equal(snapshot.trainingArea,undefined);assert.equal(snapshot.moduleGoal,undefined);assert.ok(typeof m.moduleReport==='function');assert.equal(m.traffic.length,0);
 }
});
test('normal workday reports still use the existing scoring contract and resume without a module sink',()=>{
 const m=M.create('campaign',7);m.report('inspect:tyres','safety','good');assert.equal(O.workday.events[0].type,'inspect.tires');const restored=M.restore(m.snapshot());assert.ok(restored);assert.equal(restored.moduleReport,undefined);assert.deepEqual(restored.snapshot(),m.snapshot());
});
test('bounded depot, street, doorstep and cab builds retain reachable targets under Low geometry limits',()=>{
 O.gfx={high:()=>false};
 for(const piece of Object.keys(F.pieces)){
  F.definitions.set('test-cab',{...base,piece});const r=start(),m=F.model(r),world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(76,16/9,.08,180);world.add(camera);const scene={view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},art=O.fpWorld.build(scene,m);art.sync(m,null,'route');
  const ids=art.interactions.map(o=>o.userData.interaction);if(piece==='doorstep')assert.ok(ids.includes('door0'));if(piece==='depot')assert.ok(ids.includes('dispatch'));if(piece==='cab')assert.ok(ids.includes('cab-reverse'));
  let triangles=0,calls=0;world.traverse(o=>{if(!o.isMesh||!o.visible)return;let p=o.parent;while(p){if(!p.visible)return;p=p.parent;}calls++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});assert.ok(triangles<2500,piece+': '+triangles);assert.ok(calls<64,piece+': '+calls);art.dispose();assert.equal(world.children.length,1);
 }
});
test('an explicit null log preserves legacy ratio results; omitted logs still use the session log',()=>{
 for(const explicit of [true,false]){
  F.definitions.set('test-cab',{...base,result:()=>({score:100,ratios:{safety:1},...(explicit?{log:null}:{})})});
  const r=start();assert.equal(F.finish(r,{}),true);assert.equal(completed.at(-1).result.log,explicit?null:r.log);
 }
});

test('module decision clocks can run in their own panels while ordinary panels keep their clocks paused',()=>{
 c.Phaser=c.Phaser||{Scene:class{}};O.registerScene=()=>{};
 if(vm.runInContext('typeof FirstPersonScenarioScene',c)==='undefined')for(const f of ['FirstPersonScene','FirstPersonScenarioScene'])vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/'+f+'.js','utf8'),c);
 const parent=vm.runInContext('FirstPersonScene.prototype',c),proto=vm.runInContext('FirstPersonScenarioScene.prototype',c),old=parent.update;parent.update=()=>{};let ticks=0,timeouts=0,finishes=0;
 try{
  F.definitions.set('test-cab',{...base,clockActive:(r,s,active)=>active||!!s.panel?.customer,tick:(r,s,dt,active)=>{if(active){assert.equal(dt,.05);ticks++;}},timeout:r=>{timeouts++;r.phase='timed-out';}});
  const r=start(),scene={scenarioSession:r,model:{paused:true},panel:{customer:true},finishScenario(){finishes++;}};proto.update.call(scene,50,50);assert.equal(r.elapsed,.05);assert.equal(ticks,1);
  scene.panel={};proto.update.call(scene,100,50);assert.equal(r.elapsed,.05);assert.equal(ticks,1);scene.panel={customer:true};r.elapsed=1.99;proto.update.call(scene,150,50);assert.equal(timeouts,1);assert.equal(finishes,0);proto.update.call(scene,200,50);assert.equal(timeouts,1);
  let paused=0;proto.showGoal.call({showPause(){paused++;}});assert.equal(paused,1);
 }finally{parent.update=old;}
});
