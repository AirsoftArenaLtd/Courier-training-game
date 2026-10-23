/* Physical inspection/test gates and direct scoring equivalence with the existing 2D pre-trip exercise. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE,BaseScenarioScene:class{}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m1_pretrip.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js',
 'src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpscenario.js','src/core/fppretrip.js','src/core/fppretripworld.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,A=O.fpPretrip,C=c.OTR_DATA.pretrip,definition=O.fpScenario.definitions.get('pretrip-van');
O.registerScene=()=>{};vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/m1/PreTripScene.js','utf8'),c);const oldSignOff=vm.runInContext('PreTripScene.prototype.signOff',c);
const scenario={id:'m1-pretrip',scene:'PreTripScene',scene3d:'pretrip-van',categories:['safety','efficiency']};O.registry={get:()=>scenario,content:()=>C};O.gfx={high:()=>false};
const fresh=()=>{const r=O.fpScenario.create(scenario.id);O.fpScenario.model(r);return r;};
function beside(m,id){const a=A.locations[id],view=a[3];m.mode=view==='cab'?'cab':'walk';const p=O.fp.local(m.van,view==='driver'?-2.2:view==='passenger'?2.2:a[0],view==='front'?-3.7:view==='rear'?3.7:a[2]);Object.assign(m.player,p);}
test('all 21 original items have a physical target and run state is fresh without modifying content',()=>{
 const before=JSON.stringify(C),r=fresh(),other=fresh();assert.equal(C.items.length,21);assert.equal(Object.keys(A.locations).length,21);assert.notEqual(r.model.pretripLesson,other.model.pretripLesson);
 assert.ok(r.model.pretripLesson.defects.size>=3&&r.model.pretripLesson.defects.size<=5);assert.equal(JSON.stringify(C),before);assert.equal(r.model.snapshot().pretripLesson,undefined);
 for(const it of C.items){beside(r.model,it.id);assert.equal(A.canInspect(r.model,it.id),true,it.id);}
});
test('remote, moving, wrong-side and carrying inspections cannot be recorded',()=>{
 const m=fresh().model;beside(m,'tire_front');assert.equal(A.inspect(m,'tire_front'),true);m.player.x=m.van.x+2.2;assert.equal(A.canInspect(m,'tire_front'),false);
 beside(m,'tire_front');m.van.speed=.5;assert.equal(A.mark(m,'tire_front','flag'),false);m.van.speed=0;m.heldId='parcel0';assert.equal(A.inspect(m,'tire_front'),false);m.heldId=null;m.player.z-=10;assert.equal(A.inspect(m,'tire_front'),false);
});
test('inner and outer tread readings follow the actual defect and do not disclose a verdict',()=>{
 const m=fresh().model,s=m.pretripLesson;s.defects=new Set(['tire_front_p']);beside(m,'tire_front_p');assert.equal(A.mark(m,'tire_front_p','flag'),false);A.inspect(m,'tire_front_p');assert.equal(A.canJudge(m,'tire_front_p'),false);
 assert.equal(A.measure(m,'tire_front_p'),1);assert.equal(A.measure(m,'tire_front_p',true),7);assert.equal(A.canJudge(m,'tire_front_p'),true);assert.equal(A.mark(m,'tire_front_p','flag'),true);
 beside(m,'tire_rear');s.defects.add('tire_rear');A.inspect(m,'tire_rear');assert.equal(A.measure(m,'tire_rear'),7,'a sidewall gouge keeps its deep tread');
});
test('lamps require the actual headlights or right stalk, with no remote switch shortcut in the record',()=>{
 const m=fresh().model;beside(m,'headlight_l');A.inspect(m,'headlight_l');assert.equal(A.canJudge(m,'headlight_l'),false);m.van.headlights=true;assert.equal(A.canJudge(m,'headlight_l'),true);
 beside(m,'signal_r');A.inspect(m,'signal_r');assert.equal(A.canJudge(m,'signal_r'),false);m.signal=-1;assert.equal(A.canJudge(m,'signal_r'),false);m.signal=1;assert.equal(A.canJudge(m,'signal_r'),true);
});
test('mechanical tests gate verdicts, a sinking brake needs its full hold and revisiting retests it',()=>{
 const m=fresh().model;beside(m,'brake_pedal');A.inspect(m,'brake_pedal');assert.equal(A.canJudge(m,'brake_pedal'),false);assert.equal(A.press(m,'brake_pedal',2.99),false);assert.equal(A.press(m,'brake_pedal',3),true);assert.equal(A.mark(m,'brake_pedal','pass'),true);A.inspect(m,'brake_pedal');assert.equal(A.canJudge(m,'brake_pedal'),false);
 beside(m,'horn');A.inspect(m,'horn');assert.equal(A.press(m,'horn'),true);assert.equal(A.mark(m,'horn','other'),false);assert.equal(A.mark(m,'horn','pass'),true);
});
test('the actual 2D scorer and 3D adapter agree across defects, false flags and time boundaries',()=>{
 const clean=log=>JSON.parse(JSON.stringify(log.items.map(({at,...item})=>item)));
 for(const elapsed of [20,220,221,308,309,396,397,880])for(const caught of [0,2,4])for(const falseCount of [0,1,5]){
  const r=fresh(),s=r.model.pretripLesson;s.defects=new Set(C.items.slice(0,4).map(it=>it.id));s.marks={};
  C.items.forEach((it,i)=>s.marks[it.id]=i<4?(i<caught?'flag':'pass'):(i<4+falseCount?'flag':'pass'));r.elapsed=elapsed;
  const reference={running:true,content:C,defects:Object.fromEntries([...s.defects].map(id=>[id,true])),marks:s.marks,elapsed,log:new O.ScoreLog(),report(){}};oldSignOff.call(reference);
  const result=A.result(r);assert.equal(result.score,reference.log.score());assert.deepEqual(JSON.parse(JSON.stringify(result.ratios)),JSON.parse(JSON.stringify(reference.log.ratios(scenario.categories))));assert.deepEqual(clean(result.log),clean(reference.log));
  const n=r.log.items.length;A.result(r);assert.equal(r.log.items.length,n);
 }
});
test('unfinished inspections cannot sign off and timeout keeps unrecorded defects critical',()=>{
 const r=fresh();assert.equal(A.complete(r.model),false);r.elapsed=880;const result=A.result(r);assert.equal(result.ratios.safety,0);assert.equal(result.ratios.efficiency,0);assert.ok(result.log.criticals().length);assert.equal(result.stats.missed.length,r.model.pretripLesson.defects.size);
});
test('inspection proxies and cab equipment fit the bounded Low world and clean up without new textures',()=>{
 const r=fresh(),m=r.model,world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(76,16/9,.08,180);world.add(camera);
 const scene={view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},art=O.fpWorld.build(scene,m);art.sync(m,null,'route');assert.equal(art.pretripArt.targets.length,21);
 let calls=0,triangles=0;world.traverse(o=>{if(!o.isMesh||!o.visible||!o.layers.test(camera.layers))return;for(let p=o.parent;p;p=p.parent)if(!p.visible)return;calls++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});assert.ok(calls<64);assert.ok(triangles<2500);art.dispose();assert.equal(world.children.length,1);
});
