/* Physical cab, safe drivetrain selection, scoring identity and legacy checkpoint compatibility. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/workday_events.js','src/core/theme.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpworld.js','src/core/fpaccess.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,C=O.fpCab,F=O.fp,M=O.fpMission,W=O.workday,make=()=>{const m=M.create('campaign',7);m.mode='cab';m.paused=false;m.solids=[];return m;};
const events=()=>W.events.filter(e=>e.type==='drive.gear');test.beforeEach(()=>W.begin());
test('each selected shifter position confirms its state without asking for the same shift',()=>{
 const m=make();for(const [id,gear] of Object.entries(C.gears)){
  m.van.gear=gear;assert.equal(C.hint(id,m,'O'),{2:'Park is selected.','-1':'Reverse is selected.',0:'Neutral is selected.',1:'Drive is selected.'}[gear]);
  for(const [other,value] of Object.entries(C.gears))if(value!==gear)assert.match(C.hint(other,m,'O'),/^Press O to select/);
 }assert.equal(events().length,0);
});
test('Park holds the van with the parking brake released; Neutral has no engine force or creep',()=>{
 const m=make();m.van.hand=false;assert.equal(C.act(m,'cab-park'),'');for(let i=0;i<50;i++)F.drive(m,{forward:true},.05);assert.equal(m.van.speed,0);
 assert.equal(C.act(m,'cab-neutral'),'');for(let i=0;i<50;i++)F.drive(m,{forward:true},.05);assert.equal(m.van.speed,0);
 m.van.speed=3;F.drive(m,{forward:true},.05);assert.ok(m.van.speed>2&&m.van.speed<3,'Neutral coasts rather than holding');
 assert.deepEqual([...events()].map(e=>e.ok),[true,true]);
});
test('Drive, Reverse and the existing shortcut use the same selected drivetrain',()=>{
 const m=make();m.van.hand=false;assert.equal(m.shiftGear(),true);assert.equal(m.van.gear,-1);F.drive(m,{},.05);assert.ok(m.van.speed<0);
 m.van.speed=0;assert.equal(m.shiftGear(),true);assert.equal(m.van.gear,1);F.drive(m,{forward:true},.05);assert.ok(m.van.speed>0);
 m.van.speed=0;C.act(m,'cab-park');m.shiftGear();assert.equal(m.van.gear,1);assert.equal(events().length,4);
});
test('unsafe direction attempts report the approved mistake without defeating the stopped-only interlock',()=>{
 const m=make();m.van.speed=2;const where={x:m.van.x,z:m.van.z};assert.equal(m.selectGear(-1),false);assert.equal(m.van.gear,1);assert.equal(m.van.speed,2);
 const e=events()[0];assert.equal(e.ok,false);assert.equal(e.stop,1);assert.equal(e.where.x,where.x);assert.equal(e.where.z,where.z);assert.ok(e.where.mph>2);
 m.van.speed=.5;assert.equal(m.selectGear(-1),false);assert.equal(events().length,1,'a rejected slow attempt did not change gear');
 assert.equal(m.selectGear(2),false);assert.equal(events().length,1);assert.equal(m.selectGear(1),true);assert.equal(events().length,1);
});
test('shift keys stay unique after a checkpoint reload, and selecting the same gear reports nothing',()=>{
 const m=make();C.act(m,'cab-reverse');C.act(m,'cab-neutral');const snapshot=m.snapshot(),r=M.restore(snapshot);assert.ok(r);assert.deepEqual(r.snapshot(),snapshot);
 C.act(r,'cab-park');C.act(r,'cab-park');assert.equal(events().length,3);assert.equal(new Set(events().map(e=>e.key)).size,3);assert.equal(r.van.shifts,3);
});
test('cargo practice can change gear without adding reports to a suspended campaign',()=>{
 const m=M.create('practice',7);m.mode='cab';assert.equal(C.act(m,'cab-reverse'),'');assert.equal(m.van.gear,-1);assert.equal(events().length,0);
 m.mode='walk';assert.ok(M.restore(m.snapshot()));
});
test('physical toggles change the saved controls, use visible positions as well as colour, and touch the mission',()=>{
 const m=make(),before=m.revision;for(const id of ['cab-handbrake','cab-belt','cab-headlights','cab-wipers','cab-signal-left'])assert.equal(C.act(m,id),'');
 assert.equal(m.van.hand,false);assert.equal(m.van.belt,true);assert.equal(m.van.headlights,true);assert.equal(m.van.wipers,true);assert.equal(m.signal,-1);assert.ok(m.revision>before);
 C.act(m,'cab-signal-left');assert.equal(m.signal,0);C.act(m,'cab-signal-right');assert.equal(m.signal,1);C.act(m,'cab-signal-right');assert.equal(m.signal,0);
 const r=M.restore(m.snapshot());assert.ok(r);assert.equal(r.van.headlights,true);assert.equal(r.van.wipers,true);
 m.mode='walk';assert.equal(C.act(m,'cab-headlights'),null);assert.equal(m.selectGear(0),false);assert.equal(C.act(m,'unrelated'),null);
});
test('legacy checkpoints still load and new optional fields and Park/Neutral are strictly validated',()=>{
 const m=make();assert.ok(M.restore(m.snapshot()));for(const gear of [2,-1,0,1]){m.van.gear=gear;assert.ok(M.restore(m.snapshot()));assert.equal(C.gearName(gear),{2:'P','-1':'R',0:'N',1:'D'}[gear]);}
 for(const [key,value] of [['gear',3],['headlights','true'],['wipers',1],['shifts',-1],['shifts',.5]]){const s=m.snapshot();s.van[key]=value;assert.equal(M.restore(s),null,key);}
 assert.equal(events().length,0);
});
function scene(high){
 O.gfx={high:()=>high};O.a11y={settings:()=>({reducedMotion:true}),physical:k=>k,label:k=>k};
 const m=make(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180),world=new THREE.Scene();world.add(camera);
 const s={model:m,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},message(){},time:{now:0}};
 s.art=O.fpWorld.build(s,m);s.sync=()=>s.art.sync(m,null,'route');s.sync();return s;
}
test('every physical control is raycastable in both presets, independent of the exterior entry target',()=>{
 for(const high of [false,true]){const s=scene(high),ids=[...Object.keys(C.gears),'cab-handbrake','cab-belt','cab-signal-left','cab-signal-right','cab-headlights','cab-wipers','cab-exit'];
 for(const id of ids){const target=s.art.interactions.find(o=>o.userData.interaction===id);assert.ok(target,id);s.sync();const p=target.getWorldPosition(new THREE.Vector3()),eye=s.view.camera.position;s.model.van.look=Math.atan2(p.x-eye.x,-(p.z-eye.z))-s.model.van.yaw;s.model.player.pitch=Math.atan2(eye.y-p.y,Math.hypot(p.x-eye.x,p.z-eye.z));s.sync();assert.equal(s.art.pick(),id,id);}
 s.art.dispose();assert.equal(s.view.world.children.length,1);}
});
test('keyboard target selection reaches every cab control without moving the van or requiring pointer lock',()=>{
 const s=scene(false),pos=[s.model.van.x,s.model.van.z,s.model.van.yaw],seen=new Set();for(let i=0;i<20;i++){const id=O.fpAccess.focus(s);assert.ok(id);seen.add(id);}
 assert.equal(seen.size,11,[...seen].join());assert.deepEqual([s.model.van.x,s.model.van.z,s.model.van.yaw],pos);s.art.dispose();
});
test('speed, RPM, wheel and physical switch indicators follow the mission while cosmetic reduced motion stays stable',()=>{
 const s=scene(false),a=s.art.cab,before=a.batch.instanceMatrix.array.slice();Object.assign(s.model.van,{speed:8,steer:.2,belt:true,headlights:true,wipers:true,hand:false});s.model.motion={rpm:2400,pitch:0,roll:0};s.model.signal=1;s.sync();
 assert.ok(Math.abs(a.wheel.rotation.z+.6)<1e-9);assert.ok(Math.abs(a.gauges.material.uniforms.speed.value-8/17.8816)<1e-9);assert.equal(a.gauges.material.uniforms.rpm.value,.6);assert.notDeepEqual(a.batch.instanceMatrix.array,before);
 assert.equal(s.view.camera.fov,76);assert.equal(s.model.snapshot().cameraMotion,undefined);s.art.dispose();
});
test('instrument backlighting follows the real headlights without a texture, timer or mission write',()=>{
 for(const high of [false,true]){
  const s=scene(high),face=s.art.cab.gauges,uniforms=face.material.uniforms;
  assert.equal(face.geometry.index.count,6);assert.equal(face.material.map,undefined);
  for(const on of [false,true,false]){
   s.model.van.headlights=on;const before=JSON.stringify(s.model.snapshot());s.sync();
   assert.equal(uniforms.lit.value,on?1:0);assert.equal(JSON.stringify(s.model.snapshot()),before);
   s.model.elapsed+=20;s.sync();assert.equal(uniforms.lit.value,on?1:0);
  }
  let disposed=0;face.material.addEventListener('dispose',()=>disposed++);s.art.dispose();assert.equal(disposed,1);
 }
});
test('the High instrument hood stays above the dial face from the seated eye',()=>{
 const s=scene(true),a=s.art.cab,h=a.hood;assert.ok(h);
 for(const pitch of [0,.18,.35]){
  s.model.player.pitch=pitch;s.sync();
  const lip=new THREE.Vector3(0,h.y-h.h/2,h.z+h.d/2).applyMatrix4(a.root.matrixWorld).project(s.view.camera);
  const top=new THREE.Vector3(0,a.gauges.position.y+a.gauges.scale.y/2,a.gauges.position.z).applyMatrix4(a.root.matrixWorld).project(s.view.camera);
  assert.ok(lip.y>top.y,'The hood clips the top of the instrument face at pitch '+pitch);
 }
 s.art.dispose();
});
test('the seated driver can see the centre of the road 23 metres ahead over the instrument cluster',()=>{
 for(const high of [false,true]){const s=scene(high),v=s.model.van,p=F.local(v,0,-23),point=new THREE.Vector3(p.x,.04,p.z),camera=s.view.camera;s.view.world.updateMatrixWorld(true);camera.updateMatrixWorld(true);const ray=new THREE.Raycaster(camera.position,point.clone().sub(camera.position).normalize(),0,camera.position.distanceTo(point));const hits=ray.intersectObject(s.art.cab.root,true).filter(h=>h.object.visible&&h.object.layers.test(camera.layers));assert.equal(hits.length,0,JSON.stringify({high,eye:camera.position.toArray(),road:point.toArray(),face:s.art.cab.gauges.position.toArray(),hit:hits[0]&&{name:hits[0].object.name,type:hits[0].object.type,point:hits[0].point.toArray()}}));s.art.dispose();}
});
