/* Direct original-scorer comparisons, bounded cues, pause/reduced-motion behavior and isolated module records. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE,TownDriveScene:class{}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m1_hazards.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpsignlettering.js','src/core/fpscenario.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.registerScene=()=>{};O.audio={play(){},stopLoop(){}};O.ui={modal(){}};
vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/m1/HazardScene.js','utf8'),c);const old=vm.runInContext('HazardScene.prototype',c);
for(const f of ['src/core/fphazardlesson.js','src/core/fphazardlessonworld.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const A=O.fpHazardLesson,C=c.OTR_DATA.hazardClips,clean=x=>JSON.parse(JSON.stringify(x));
const scenario={id:'m1-spot',scene:'HazardScene',scene3d:'hazard-road-clips',categories:['safety']};O.registry={get:()=>scenario,content:()=>C};O.gfx={high:()=>false};
const fresh=()=>{const r=O.fpScenario.create(scenario.id);O.fpScenario.model(r);O.fpScenario.begin(r);r.model.paused=false;return r;};
test('all five original clips retain their content and fresh per-run state without new checkpoint fields',()=>{
 const before=JSON.stringify(C),r=fresh(),s=r.model.hazardLesson;assert.equal(s.content,C);assert.equal(C.clips.length,5);assert.equal(r.model.snapshot().hazardLesson,undefined);assert.notEqual(s,fresh().model.hazardLesson);
 for(let i=0;i<5;i++){A.reset(r.model,i);assert.equal(s.clip,C.clips[i]);assert.equal(s.flags.length,0);assert.ok(s.cueZ>r.model.bounds.z0+10);assert.ok(s.cueZ<r.model.bounds.z1);}
 assert.equal(JSON.stringify(C),before);
});
test('100 actual 2D score-clip comparisons preserve inclusive timing, first valid response, early misses and spam',()=>{
 const items=log=>clean(log.items.map(({at,...i})=>i));
 for(let index=0;index<C.clips.length;index++)for(let sample=0;sample<20;sample++){
  const r=fresh(),s=r.model.hazardLesson;A.reset(r.model,index);const at=s.clip.at,W=C.window;
  const cases=[[],[at-.001],[at],[at+.001],[at+W-.001],[at+W],[at+W+.001],[at-1,at+2],[at+4,at+1],[at-2,at-1],[at+1,at+2,at+3,at+4,at+5,at+5],[at,at,at,at,at,at,at]];
  const flags=sample<cases.length?cases[sample]:Array.from({length:sample-10},(_,i)=>at+(i-1)*.71);
  for(const time of flags){s.time=time;assert.equal(A.flag(r),true);}
  const reference=Object.assign(Object.create(old),{content:C,run:{flags},clip:s.clip,results:[],log:new O.ScoreLog(),flagPill:{setVisible(){}}});old.scoreClip.call(reference);const actual=A.record(r);
  assert.deepEqual(clean(actual),clean(reference.results[0]));assert.deepEqual(items(r.log),items(reference.log));const n=r.log.items.length;A.record(r);assert.equal(r.log.items.length,n);
 }
});
test('scripted scene time freezes during menus and the ordinary driving controls do not change the clip',()=>{
 const r=fresh(),m=r.model,s=m.hazardLesson;m.paused=true;const z=m.van.z;m.step({forward:true,left:true},10);assert.equal(s.time,0);assert.equal(m.van.z,z);assert.equal(A.flag(r),false);
 m.paused=false;m.step({forward:true,left:true},10);assert.equal(s.time,.05);assert.equal(m.van.steer,0);assert.equal(m.van.x,1.7);assert.equal(m.van.gear,1);assert.equal(A.flag(r),true);s.ended=true;assert.equal(A.flag(r),false);
});
test('all five early responses produce the original 2500-point same-id safety result exactly once',()=>{
 const r=fresh(),s=r.model.hazardLesson;for(let i=0;i<5;i++){s.time=s.clip.at;A.flag(r);s.ended=true;A.record(r);assert.equal(A.next(r),true);}
 const result=A.result(r);assert.equal(result.score,2500);assert.equal(result.ratios.safety,1);assert.deepEqual(Object.keys(result.ratios),['safety']);assert.equal(s.results.length,5);
 let original;O.flow={complete(scene,id,result){original={id,result};}};const reference={finished:false,scenarioId:scenario.id,content:C,results:s.results,log:r.log};old.endDrill.call(reference);assert.equal(original.id,scenario.id);assert.equal(original.result.score,result.score);assert.deepEqual(clean(original.result.ratios),clean(result.ratios));
 const count=r.log.items.length;A.result(r);assert.equal(r.log.items.length,count);assert.equal(A.next(r),false);
});
test('press storage is bounded while too many responses still invalidate the whole clip',()=>{
 const r=fresh(),s=r.model.hazardLesson;s.time=s.clip.at;for(let i=0;i<1000;i++)A.flag(r);assert.equal(s.presses,1000);assert.equal(s.flags.length,C.maxFlags+1);assert.equal(A.record(r).pts,0);assert.equal(s.results[0].tooMany,true);
});
test('reduced motion keeps the camera still with identical cue states and response windows',()=>{
 for(let index=0;index<5;index++){
  const a=fresh(),b=fresh();b.model.hazardLesson.reduced=true;A.reset(a.model,index);A.reset(b.model,index);const stable=b.model.van.z;
  for(const offset of [-.1,0,1.3,2.8,4.9]){const t=C.clips[index].at+offset;a.model.hazardLesson.time=b.model.hazardLesson.time=t;A.pose(a.model);A.pose(b.model);assert.equal(b.model.van.z,stable);for(const key of ['carX','carZ','personX','personZ','personVisible','ballX','ballVisible','doorAngle','lamps','phone'])assert.equal(a.model.hazardLesson[key],b.model.hazardLesson[key]);}
  A.flag(a);A.flag(b);assert.equal(A.record(a).pts,A.record(b).pts);
 }
});
test('expiring clips retain all five safety checks without a workday report or free completion marks',()=>{
 const r=fresh();O.workday={report(){throw Error('Workday leak');}};assert.equal(r.model.moduleReport('drive.contact',{key:'observation'}),false);
 const result=A.result(r);assert.equal(result.score,0);assert.equal(result.ratios.safety,0);assert.equal(result.log.items.length,5);assert.equal(r.model.snapshot().hazardLesson,undefined);
});
test('all five procedural fallback cue pools stay within the Low budget and dispose with the world',()=>{
 const r=fresh(),m=r.model,world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(76,16/9,.08,180);world.add(camera);
 const scene={view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},art=O.fpWorld.build(scene,m);assert.ok(art.hazardLessonArt);
 for(let i=0;i<5;i++)for(const offset of [-.1,0,1.5,3]){A.reset(m,i);m.hazardLesson.time=m.hazardLesson.clip.at+offset;A.pose(m);art.sync(m,null,'route');let calls=0,triangles=0;
  world.traverse(o=>{if(!o.isMesh||!o.visible||!o.layers.test(camera.layers))return;for(let p=o.parent;p;p=p.parent)if(!p.visible)return;calls++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});assert.ok(calls<=64,`${i}: ${calls}`);assert.ok(triangles<=2500,`${i}: ${triangles}`);
 }
 assert.ok(art.hazardLessonArt.ink.count>0);art.dispose();assert.equal(world.children.length,1);
});

test('every fallback clue has an unobstructed windshield sightline before, during and after development',()=>{
 const proof=require('./tools/fp-hazard-lesson-proof'),r=fresh(),m=r.model,world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(76,16/9,.08,180);world.add(camera);
 const scene={view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},model:m,scenarioSession:r},art=O.fpWorld.build(scene,m);scene.art=art;
 O.game={scene:{getScene:()=>scene}};O.fpStore={read:()=>null};O.workday={events:[]};O.save={data:{}};c.hazardLessonBenchmarkBefore={checkpoint:'null',events:'[]',workday:'null'};
 for(const reduced of [false,true])for(let index=0;index<5;index++)for(const stage of ['before','clue','after']){
  m.hazardLesson.reduced=reduced;A.reset(m,index);m.hazardLesson.time=m.hazardLesson.clip.at+{before:-.1,clue:.15,after:1.8}[stage];A.pose(m);art.sync(m,null,'route');world.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const p=vm.runInContext('('+proof.toString()+')('+JSON.stringify(stage)+')',c);assert.equal(p.cue.visible,true,JSON.stringify(p));assert.equal(p.cue.clear,true,JSON.stringify(p));assert.ok(Math.abs(p.cue.x)<1&&Math.abs(p.cue.y)<1&&Math.abs(p.cue.z)<1,JSON.stringify(p));
 }
 art.dispose();
});
