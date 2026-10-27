/* Scene-shell and actual-world integration; these fixtures are not native-key gameplay evidence. */
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {c,O,entry,fixture}=require('./tools/fp-reverse-context')();
test('the optional adapter restores its physical start and bound while preserving the registry and workday',()=>{
 O.workday.begin();O.workday.report('brief.read',{key:'suspended'});const outside=JSON.stringify(O.workday.events),registry=JSON.stringify(entry),scene=fixture();
 try{const {model:m,scenarioSession:r}=scene;assert.equal(m.mode,'cab');assert.equal(m.van.z,-65);assert.equal(m.bounds.z0,-72);assert.equal(m.bounds.z1,-45);assert.equal(m.trainingArea.key,'street');assert.equal(m.traffic.length,1);assert.equal(typeof r.definition.goalControl,'function');
  O.fpMission.emit(m,'drive.contact',{key:'local'});assert.equal(r.log.criticals().length,1);assert.equal(JSON.stringify(O.workday.events),outside);assert.equal(JSON.stringify(entry),registry);assert.equal(O.fpScenario.resolve(entry,{webgl:false}).presentation,'unavailable');
 }finally{scene.art.dispose();}
});
test('the real module shell opens the physical path control and remote, stale or abandoned confirmations cannot record it',()=>{
 const scene=fixture();try{const m=scene.model,r=scene.scenarioSession,goal=vm.runInContext('FirstPersonScenarioScene.prototype.showGoal',c);goal.call(scene);scene.panel.choices[0].action();assert.equal(O.fpRear.checked(m),false);
  assert.equal(m.exit(),true);Object.assign(m.player,{x:0,z:m.van.z+4,yaw:Math.PI});goal.call(scene);const stale=scene.panel.choices[0].action;scene.closePanel();stale();assert.equal(O.fpRear.checked(m),false);
  goal.call(scene);scene.panel.choices[0].action();assert.equal(O.fpRear.checked(m),true);m.driving.goalClear=false;goal.call(scene);const late=scene.panel.choices[0].action;O.fpScenario.abandon(r);late();assert.equal(O.fpRear.checked(m),false);
 }finally{scene.art.dispose();}
});
test('controls and handheld pause the actual moving car and clocks, with replaced callbacks inert',()=>{
 const scene=fixture();try{const m=scene.model,r=scene.scenarioSession;m.reverseLesson.crossing='crossing';m.step({},.05);O.fpReverseScenario.controls(r,scene);const next=scene.panel.choices[0].action,before=JSON.stringify([m.elapsed,m.traffic[0].x,r.elapsed]);
  for(let n=0;n<50;n++){m.step({forward:true},.05);O.fpScenario.advance(r,.05,false);}assert.equal(JSON.stringify([m.elapsed,m.traffic[0].x,r.elapsed]),before);scene.closePanel();next();assert.equal(scene.panel,null);
  O.fpReverseScenario.handheld(r,scene);const old=scene.handheld.page.options[0].onPick;O.fpReverseScenario.handheld(r,scene);old();assert.equal(scene.panel,null);assert.equal(scene.handheld.isOpen,true);scene.handheld.page.options[1].onPick();assert.equal(scene.handheld.isOpen,false);
 }finally{scene.art.dispose();}
});
test('assessments hide path coaching, timeout fails through the local result once, and generic modules keep their menu',()=>{
 const scene=fixture({assessment:true});let completed=0;O.flow.complete=()=>completed++;
 try{O.fpReverseScenario.path(scene.scenarioSession,scene);assert.equal(scene.panel.body,'Confirm your observation of the reversing path.');scene.closePanel();assert.equal(scene.finishScenario('timeout'),true);assert.equal(scene.scenarioSession.result.score,0);assert.equal(scene.scenarioSession.result.ratios.safety,0);assert.equal(scene.finishScenario(),false);assert.equal(completed,1);
  let pauses=0;vm.runInContext('FirstPersonScenarioScene.prototype.showGoal',c).call({scenarioSession:{definition:{}},showPause(){pauses++;}});assert.equal(pauses,1);
 }finally{scene.art.dispose();}
});
test('the real Low yard renders one car and three matching walls, with no floating bay instruction or per-frame pools',()=>{
 const scene=fixture();try{const m=scene.model,children=scene.art.route.children.length,arrays=[];scene.art.route.traverse(o=>{if(o.isInstancedMesh)arrays.push(o.instanceMatrix.array);});
  assert.equal(scene.art.labels.some(l=>l.text==='Reverse into the marked bay and set the parking brake.'),false);assert.equal(m.parkingWalls.length,3);const box=m.reverseLesson.carBox;
  for(let n=0;n<200;n++){m.step({},.05);scene.sync();}assert.equal(scene.art.route.children.length,children);assert.equal(m.reverseLesson.carBox,box);const after=[];scene.art.route.traverse(o=>{if(o.isInstancedMesh)after.push(o.instanceMatrix.array);});assert.equal(after.length,arrays.length);for(let n=0;n<arrays.length;n++)assert.equal(after[n],arrays[n]);
  for(const w of m.parkingWalls)assert.ok(scene.art.occluders.some(o=>Math.abs(o.position.x-w.x)<1e-8&&Math.abs(o.position.z-w.z)<1e-8));
 }finally{scene.art.dispose();}
});
const {install,local}=require('./tools/fpassets-context'),assetLoader=install(c);
test('the loaded Low/High sedan follows its one source actor, fits the exact collision box and keeps private instance buffers stable',async()=>{
 for(const high of [false,true]){O.gfx={high:()=>high};const bank=await assetLoader.preload({high,fetch:local}),scene=fixture({bank});try{
  const car=scene.art.cars[0],imported=car.children.find(o=>o.name==='asset:town-parked-car'),source=bank.models.get('town-parked-car');assert.ok(imported);assert.equal(car.userData.reverseSedan,true);assert.equal(scene.art.cars.length,1);const arrays=imported.userData.batches.map(b=>b.mesh.instanceMatrix.array),sourcePositions=source.parts[0].geometry.attributes.position.array,sourceCopy=sourcePositions.slice(),children=car.children.length;
  let disposed=false;source.parts[0].geometry.addEventListener('dispose',()=>{disposed=true;});
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const x of [-8,-2,0,4,8]){Object.assign(scene.model.traffic[0],{x,yaw});scene.sync();const b=new c.THREE.Box3().setFromObject(imported),size=b.getSize(new c.THREE.Vector3());assert.ok(Math.abs((b.min.x+b.max.x)/2-x)<1e-6);assert.ok(Math.abs((b.min.z+b.max.z)/2+58)<1e-6);assert.ok(Math.abs(b.min.y)<1e-6);assert.ok(Math.abs(size.y-1.4)<1e-6);assert.ok(Math.abs(size.x-(Math.abs(Math.cos(yaw))>.7?1.8:3.6))<1e-6);assert.ok(Math.abs(size.z-(Math.abs(Math.cos(yaw))>.7?3.6:1.8))<1e-6);assert.equal(car.children.length,children);for(let n=0;n<arrays.length;n++)assert.equal(imported.userData.batches[n].mesh.instanceMatrix.array,arrays[n]);}
  assert.deepEqual(sourcePositions,sourceCopy);scene.view.mirror.before();scene.view.mirror.after();assert.deepEqual(sourcePositions,sourceCopy);scene.art.dispose();assert.equal(disposed,false,'Private world disposal does not destroy the shared source geometry');
 }finally{if(scene.art.route.parent)scene.art.dispose();bank.dispose();}}
 O.gfx={high:()=>false};
});
test('the imported sedan headlights face the direction the real crossing car travels',async()=>{
 O.gfx={high:()=>true};const bank=await assetLoader.preload({high:true,fetch:local}),scene=fixture({bank});try{const mesh=scene.art.cars[0].children.find(o=>o.name==='asset:town-parked-car').children[0],a=mesh.geometry.attributes.position,col=mesh.geometry.attributes.color,matrix=new c.THREE.Matrix4(),point=new c.THREE.Vector3();mesh.getMatrixAt(0,matrix);let lamps=0;for(let n=0;n<a.count;n++)if(col.getX(n)>.7&&col.getY(n)>.6&&col.getZ(n)<.2){point.fromBufferAttribute(a,n).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);assert.ok(point.x>scene.model.traffic[0].x);lamps++;}assert.ok(lamps>0,'Actual yellow front-lamp vertices were checked');}finally{scene.art.dispose();bank.dispose();O.gfx={high:()=>false};}
});
test('a missing sedan keeps the bounded procedural fallback and never changes the motor actor',async()=>{
 const bank=await assetLoader.preload({high:false,fetch:local}),source=bank.models.get('town-parked-car');bank.models.delete('town-parked-car');const scene=fixture({bank});try{assert.equal(scene.art.cars[0].userData.reverseSedan,false);assert.equal(scene.art.cars.length,1);assert.equal(scene.model.traffic.length,1);assert.equal(scene.art.cars[0].children.some(o=>o.name==='asset:town-parked-car'),false);}finally{scene.art.dispose();bank.models.set('town-parked-car',source);bank.dispose();}
});
