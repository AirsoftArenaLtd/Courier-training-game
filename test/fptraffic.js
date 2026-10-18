/* Traffic safety decisions, independent of rendering and scoring. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const c = {}; c.window = c; vm.createContext(c);
vm.runInContext(fs.readFileSync(__dirname + '/../src/core/fptraffic.js', 'utf8'), c);
const T = c.OTR.fpTraffic;
const actor = (x = 0, z = 0, yaw = 0) => ({ x, z, yaw, w: 1.8, d: 4.5 });

test('signals have separate amber and all-red clearance intervals before changing priority', () => {
  const expected = [
    [0, 'green', 'red', false], [15.999, 'green', 'red', false],
    [16, 'amber', 'red', false], [19, 'red', 'red', false],
    [21, 'red', 'green', false], [37, 'red', 'amber', false],
    [40, 'red', 'red', false], [42, 'red', 'red', true],
    [52, 'red', 'red', false], [54, 'green', 'red', false]
  ];
  for (const [at, ns, ew, walk] of expected) {
    const p = T.signal(at); assert.equal(p.ns, ns, 'north/south at ' + at);
    assert.equal(p.ew, ew, 'east/west at ' + at); assert.equal(p.walk, walk);
  }
});
test('neither an opposing green nor a simultaneous walk permission occurs across a day', () => {
  for (let ms = 0; ms < 86400000; ms += 73) {
    const p = T.signal(ms / 1000, 13);
    assert.ok(p.ns === 'red' || p.ew === 'red');
    if (p.walk) { assert.equal(p.ns, 'red'); assert.equal(p.ew, 'red'); }
  }
});
test('signal offsets and checkpoints reproduce the same phase without accumulated timer drift', () => {
  for (const offset of [-108, -53, 0, 13, 53, 108]) {
    for (const elapsed of [0, 15.5, 16, 19, 21, 42, 52, 5399.25]) {
      const saved = JSON.parse(JSON.stringify({ elapsed, offset }));
      assert.equal(T.signal(saved.elapsed, saved.offset), T.signal(elapsed, offset));
      assert.equal(T.signal(elapsed + T.cycle * 100, offset), T.signal(elapsed, offset));
    }
  }
  for (const bad of [NaN, Infinity, -1]) {
    const p = T.signal(bad); assert.equal(p.ns, 'red'); assert.equal(p.ew, 'red'); assert.equal(p.walk, false);
  }
  assert.equal(T.signal(1, NaN).ns, 'red');
});
test('both directions on each street read the matching axis', () => {
  for (const yaw of [0, Math.PI, -Math.PI, Math.PI * 2]) assert.equal(T.aspect(T.signal(0), yaw), 'green');
  for (const yaw of [Math.PI / 2, -Math.PI / 2]) assert.equal(T.aspect(T.signal(0), yaw), 'red');
  assert.equal(T.aspect(T.signal(21), Math.PI / 2), 'green'); assert.equal(T.aspect(null, 0), 'red');
  assert.equal(T.aspect(T.signal(0), NaN), 'red');
});
test('a pedestrian starts only with a walk phase and a physically clear crossing', () => {
  for (const at of [0, 16, 19, 21, 37, 40, 52]) assert.equal(T.mayCross(T.signal(at), true), false);
  assert.equal(T.mayCross(T.signal(42), true), true); assert.equal(T.mayCross(T.signal(42), false), false);
  assert.equal(T.mayCross({ ns: 'green', ew: 'red', walk: true }, true), false);
});
test('stopping envelope retains a buffer and reduces speed smoothly toward the line', () => {
  assert.equal(T.stoppingSpeed(100, 6), 6); assert.equal(T.stoppingSpeed(1.5, 6), 0);
  assert.equal(T.stoppingSpeed(-2, 6), 0); assert.equal(T.stoppingSpeed(6.5, 20), 5);
  let last = 0;
  for (let distance = 0; distance < 100; distance += .1) {
    const speed = T.stoppingSpeed(distance, 8); assert.ok(speed >= last && speed <= 8); last = speed;
  }
  for (const args of [[NaN, 6], [10, Infinity], [10, 6, 0], [10, 6, 2.5, -1]]) assert.equal(T.stoppingSpeed(...args), 0);
});
test('clearance subtracts the actual vehicle bodies on all four headings', () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const a = actor(5, 7, yaw), b = actor(5 + Math.sin(yaw) * 10, 7 - Math.cos(yaw) * 10, yaw);
    assert.ok(Math.abs(T.clearance(a, b) - 5.5) < 1e-10);
    b.d = 5.4; assert.ok(Math.abs(T.clearance(a, b) - 5.05) < 1e-10);
  }
});
test('adjacent lanes and vehicles completely behind are ignored, but overlapping bodies stop traffic', () => {
  const a = actor(); assert.equal(T.clearance(a, actor(3.4, -10, Math.PI)), Infinity);
  assert.equal(T.clearance(a, actor(0, 10)), Infinity); assert.equal(T.clearance(a, actor(0, 2)), 0);
  assert.equal(T.targetSpeed(a, [a, actor(0, 2)], 6), 0);
});
test('cross traffic and a walker use their projected footprint, rather than only their centres', () => {
  const a = actor(); assert.equal(T.clearance(a, actor(2.5, -8, Math.PI / 2)), 4.85);
  assert.ok(Math.abs(T.clearance(a, { x: 0, z: -4, w: .6, d: .6 }) - 1.45) < 1e-10);
  assert.equal(T.clearance(a, { x: NaN, z: -4 }), 0);
});
test('following target respects body clearance and the taught three-second time gap', () => {
  const a = actor(); assert.equal(T.targetSpeed(a, [], 8), 8);
  assert.equal(T.targetSpeed(a, [actor(0, -18)], 8), 4);
  assert.equal(T.targetSpeed(a, [actor(0, -18), actor(0, -9)], 8), 1);
  assert.equal(T.targetSpeed(a, [actor(0, -4)], 8), 0);
  assert.equal(T.targetSpeed(a, [actor(3.4, -4)], 8), 8);
});
test('bounded acceleration and braking converge without overshoot or negative motion', () => {
  assert.equal(T.speed(0, 6, .5), .55); assert.equal(T.speed(6, 0, .5), 4.6);
  assert.equal(T.speed(5.99, 6, .5), 6); assert.equal(T.speed(.01, 0, .5), 0);
  assert.equal(T.speed(0, 6, NaN), 0); assert.equal(T.speed(6, 0, -1), 0);
  let speed = 0; for (let i = 0; i < 1000; i++) speed = T.speed(speed, 6, .0125); assert.equal(speed, 6);
  for (let i = 0; i < 1000; i++) speed = T.speed(speed, 0, .0125); assert.equal(speed, 0);
});
test('controller calls keep shared descriptors bounded and do not mutate input vehicles', () => {
  const a = Object.freeze(actor()), b = Object.freeze(actor(0, -14));
  const before = JSON.stringify([a, b]);
  for (let i = 0; i < 10000; i++) {
    assert.ok(T.phases.includes(T.signal(i / 60))); T.targetSpeed(a, [a, b], 8);
  }
  assert.equal(JSON.stringify([a, b]), before); assert.equal(T.phases.length, 8);
  assert.ok(Object.isFrozen(T.phases)); assert.ok(T.phases.every(Object.isFrozen));
});

for (const file of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js',
  'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js',
  'src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js',
  'src/core/fpsigns.js','src/core/fpdriving.js','src/core/fpmirrors.js']) vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'), c);
const M=c.OTR.fpMission, R=c.OTR.fpRoute, W=c.OTR.workday;
c.OTR.save={data:{townSeed:1}};
const plain=o=>JSON.parse(JSON.stringify(o));
function make(day=4, seed=7) {
  W.begin(); const m=M.create('campaign',seed,T.prepare(c.OTR.fpSigns.prepare(R.plan(day,seed))));
  m.paused=false; m.phase='route'; m.mode='cab'; m.departed=m.secured=true;
  m.van.belt=true; m.traffic.forEach((car,i)=>{car.x=-1.7;car.z=m.bounds.z0+4+i*8;car.speed=0;});
  return m;
}
const reports=type=>W.events.filter(e=>e.type===type);
function signalApproach(m,time,distance=4,speed=0) {
  const control=T.layout(m).find(j=>j.kind==='signal'), j=m.junctions[control.index];
  m.elapsed=time-control.offset; if(m.elapsed<0)m.elapsed+=T.cycle;
  Object.assign(m.van,{x:j.x+1.7,z:j.z+m.town.road/2+2.7+distance,yaw:0,speed,gear:1});
  R.tick(m,{x:m.van.x,z:m.van.z+.1});return {control,j};
}
function enterSignal(m){const old={x:m.van.x,z:m.van.z};m.van.z-=1;R.tick(m,old);}

test('only new plans opt in; old checkpoints and practice keep their obligations',()=>{
  const old=M.create('campaign',7,c.OTR.fpSigns.prepare(R.plan(4,7)));
  assert.equal(T.enabled(old),false); assert.equal(old.trafficControl,undefined); assert.ok(M.restore(old.snapshot()));
  assert.equal(T.enabled(M.create('practice',7)),false);
  const day=make(1);assert.equal(T.layout(day).filter(j=>j.kind!=='stop').length,0);
  const m=make();assert.equal(T.layout(m).filter(j=>j.kind==='signal').length,3);
  assert.equal(T.layout(m).filter(j=>j.kind==='giveway').length,1);
  assert.equal(m.solids.length,old.solids.length+2);
});
test('a signal replaces both old stop obligations; entering on red reports once with its real approach',()=>{
  const m=make(),{control}=signalApproach(m,23,.6,3);enterSignal(m);enterSignal(m);
  const list=reports('drive.red-light');assert.equal(list.length,1);assert.equal(list[0].ok,false);
  assert.equal(list[0].key,control.id+':n');assert.equal(list[0].stop,1);assert.equal(list[0].where.x,m.van.x);
  assert.equal(reports('drive.sign-stop').length,0);assert.equal(reports('drive.stop-line').length,0);
});
test('stopping at red earns credit only after entering on green; green-only and amber approaches emit nothing',()=>{
  const m=make();signalApproach(m,23,2,0);assert.equal(reports('drive.red-light').length,0);
  signalApproach(m,0,.6,1);enterSignal(m);assert.equal(reports('drive.red-light').length,1);assert.equal(reports('drive.red-light')[0].ok,true);
  for(const phase of [0,17]) {const n=make();signalApproach(n,phase,.6,1);enterSignal(n);assert.equal(reports('drive.red-light').length,0);}
});
test('a creeping red approach does not earn a stop credit, and reverse does not create an approach',()=>{
  const m=make();signalApproach(m,23,4,1);signalApproach(m,0,.6,1);enterSignal(m);assert.equal(reports('drive.red-light').length,0);
  signalApproach(m,23,.6,-1);m.van.gear=-1;enterSignal(m);assert.equal(reports('drive.red-light').length,0);
});
test('a mid-red checkpoint retains its obligation and emits nothing during restoration',()=>{
  const m=make();signalApproach(m,23,2,0);const saved=plain(m.snapshot()),r=M.restore(saved);
  assert.ok(r);assert.deepEqual(plain(r.snapshot()),saved);assert.equal(reports('drive.red-light').length,0);
  r.paused=false;signalApproach(r,0,.6,1);enterSignal(r);assert.equal(reports('drive.red-light')[0].ok,true);
  const malformed=plain(saved);malformed.trafficControl.cyclist.at=1e6;assert.equal(M.restore(malformed),null);
  const missing=plain(saved);delete missing.trafficControl;assert.equal(M.restore(missing),null);
});
test('minor junction approaches yield to cross traffic; the priority road has no invented stop requirement',()=>{
  for(const blocked of [false,true]) {
    const m=make(),j=T.layout(m).find(j=>j.kind==='giveway'),half=m.town.road/2;
    Object.assign(m.van,{x:j.x-half-2.7-.6,z:j.z+1.7,yaw:Math.PI/2,speed:2});
    if(blocked)Object.assign(m.traffic[0],{x:j.x+1.7,z:j.z+half+8,yaw:0,speed:4});
    const old={x:m.van.x,z:m.van.z};m.van.x+=1;R.tick(m,old);
    assert.equal(reports('drive.sign-giveway').length,1);assert.equal(reports('drive.sign-giveway')[0].ok,!blocked);
    assert.equal(reports('drive.sign-stop').length,0);
  }
  const m=make(),j=T.layout(m).find(j=>j.kind==='giveway');
  Object.assign(m.van,{x:j.x+1.7,z:j.z+m.town.road/2+3.3,yaw:0,speed:2});enterSignal(m);
  assert.equal(reports('drive.sign-giveway').length,0);assert.equal(reports('drive.sign-stop').length,0);
});
test('a car brakes behind a red line and resumes on green, with no skipped line or abrupt speed jump',()=>{
  const m=make(),j=T.layout(m).find(j=>j.kind==='signal'),car=m.traffic[0],half=m.town.road/2;
  Object.assign(m.van,{x:0,z:20});Object.assign(car,{x:j.x+1.7,z:j.z+half+18,yaw:0,speed:4});
  m.elapsed=23-j.offset;if(m.elapsed<0)m.elapsed+=54;
  let last=car.speed;for(let i=0;i<700;i++){T.carStep(m,car,.0125);assert.ok(last-car.speed<=2.8*.0125+1e-9);last=car.speed;}
  assert.ok(car.z-2.25>j.z+half+.25);assert.ok(car.speed<.05);
  m.elapsed=(54-j.offset)%54;const before=car.z;for(let i=0;i<400;i++)T.carStep(m,car,.0125);
  assert.ok(car.z<before-2);
});
test('cars never step through a walker or the van, including a sudden obstacle',()=>{
  const m=make(),car=m.traffic[0];m.mode='walk';Object.assign(car,{x:1.7,z:-20,yaw:0,speed:4});
  Object.assign(m.player,{x:1.7,z:-25});Object.assign(m.van,{x:40,z:-80});
  for(let i=0;i<600;i++)T.carStep(m,car,.0125);
  assert.ok(car.z>m.player.z+2.5);assert.equal(car.speed,0);
  Object.assign(m.player,{x:30,z:-25});Object.assign(m.van,{x:1.7,z:car.z-3,yaw:0});
  car.speed=4;const before=car.z;T.carStep(m,car,.05);assert.equal(car.z,before);assert.equal(car.speed,0);
});
test('children wait on the curb for moving traffic, then cross in front of a stationary van',()=>{
  const m=make(),h=m.crossing;Object.assign(m.van,{x:m.town.school.x+1.7,z:h.z+16,speed:6});
  T.crossingStep(m,3);assert.equal(h.state,'developing');const curb=h.x;
  Object.assign(m.van,{z:h.z+8,speed:0});T.crossingStep(m,.1);assert.equal(h.state,'crossing');assert.ok(h.x>curb);
  for(let i=0;i<200;i++)T.crossingStep(m,.1);
  assert.equal(h.state,'resolved');assert.equal(reports('drive.pedestrian').length,1);assert.equal(reports('drive.pedestrian')[0].ok,true);
  const n=make(1);const original=n.crossing.x;T.crossingStep(n,20);assert.equal(n.crossing.x,original);
});
test('a cyclist appears beside the real van, remains solid and a turn across it fails once',()=>{
  const m=make();Object.assign(m.van,{x:2.84,z:-18,yaw:0,speed:.5,steer:0});
  T.cyclistStep(m,.0125);T.syncSolids(m);const b=m.trafficControl.cyclist;
  assert.equal(b.state,'beside');assert.equal(m._trafficSolids.cyclist.x,b.x);assert.ok(b.x>m.van.x);
  m.van.yaw=.1;T.after(m);T.after(m);assert.equal(reports('drive.cyclist').length,1);assert.equal(reports('drive.cyclist')[0].ok,false);
});
test('the cyclist check requires an actual recent mirror look and waiting until the bicycle is clear',()=>{
  for(const checked of [false,true]) {
    const m=make();Object.assign(m.van,{x:2.84,z:-18,yaw:0,speed:0});m.elapsed=10;T.cyclistStep(m,.0125);
    if(checked)m.van.mirrors=[-100,10,-100,-1,0];
    for(let i=0;i<40;i++){m.elapsed+=.1;T.cyclistStep(m,.1);}assert.equal(m.trafficControl.cyclist.state,'clear');
    assert.equal(reports('drive.cyclist').length,0,'straight driving does not manufacture a turn grade');
    m.van.yaw=.1;m.van.speed=.5;T.after(m);assert.equal(reports('drive.cyclist')[0].ok,checked);
  }
});
test('a live cyclist and a waiting car restore exactly without repeating their reports',()=>{
  const m=make();Object.assign(m.van,{x:2.84,z:-18,yaw:0,speed:0});m.elapsed=10;T.cyclistStep(m,.1);T.syncSolids(m);
  // The production traffic positions stay inside the world, unlike the isolated tests' moved cars.
  Object.assign(m.traffic[0],{x:46.7,z:-20});Object.assign(m.traffic[1],{x:20,z:m.town.zs[1]+1.7});
  const r=M.restore(m.snapshot());assert.ok(r);assert.deepEqual(plain(r.snapshot()),plain(m.snapshot()));
  assert.equal(r._trafficSolids.cyclist.x,r.trafficControl.cyclist.x);assert.equal(W.events.length,0);
});
test('traffic does not recycle into view or drift beyond the world while its return point is occupied',()=>{
 const m=make(),car=m.traffic[0];m.mode='cab';Object.assign(car,{x:46.7,z:m.bounds.z0+2,yaw:0,speed:4});
 Object.assign(m.van,{x:46.7,z:m.bounds.z1-7,yaw:0});T.carStep(m,car,.05);
 assert.ok(car.z<m.bounds.z0+3);assert.equal(car.speed,0);
 Object.assign(m.van,{x:100,z:(m.bounds.z0+m.bounds.z1)/2});T.carStep(m,car,.05);assert.equal(car.z,m.bounds.z1-3);
});
test('the cyclist also brakes for a red light and never rides through a solid obstruction',()=>{
 const m=make(),j=T.layout(m).find(j=>j.kind==='signal'),bike=m._trafficBodies.cyclist;Object.assign(m.van,{x:0,z:20});
 Object.assign(bike,{x:j.x+4,z:j.z+m.town.road/2+15,yaw:0,speed:3.2,wait:0,junction:-1});
 m.elapsed=(23-j.offset+54)%54;for(let i=0;i<600;i++)T.carStep(m,bike,.0125);
 assert.ok(bike.z-.95>j.z+m.town.road/2+.25);assert.ok(bike.speed<.05);
 const block={x:bike.x,z:bike.z-3,w:1,d:.5};m.solids.push(block);m.elapsed=(54-j.offset)%54;
 for(let i=0;i<400;i++)T.carStep(m,bike,.0125);assert.ok(bike.z-.95>block.z+.25);
});
test('east-west traffic keeps its full physical length for walking and real motor contacts',()=>{
 const m=make(),j=T.layout(m).find(j=>j.kind==='signal'),car=m.traffic[0];
 Object.assign(car,{x:j.x,z:j.z+1.7,yaw:Math.PI/2,speed:0});
 assert.equal(m.blocked(car.x+1.6,car.z,.1),true);
 m.tickTraffic=()=>{};Object.assign(m.van,{x:car.x+5.3,z:car.z,yaw:-Math.PI/2,speed:1,hand:false,gear:1});
 for(let i=0;i<80;i++)m.step({forward:true},.025);
 assert.ok(reports('drive.contact').length);assert.ok(m.van.x>car.x+2.7+1.8-.1);
});
test('the motor stops before children and reports the crossing conflict once without a duplicate contact grade',()=>{
 const m=make(),h=m.crossing;h.state='crossing';h.x=m.town.school.x+1.7;T.syncSolids(m);m.tickTraffic=()=>{};
 Object.assign(m.van,{x:h.x,z:h.z+6,yaw:0,speed:2,hand:false,gear:1});
 for(let i=0;i<80;i++)m.step({forward:true},.025);
 assert.ok(m.van.z-2.7>=h.z+1.1);assert.equal(reports('drive.pedestrian').length,1);assert.equal(reports('drive.pedestrian')[0].ok,false);
 assert.equal(reports('drive.contact').length,0);
});
test('children also wait when a trainee is standing in their walking path',()=>{
 const m=make(),h=m.crossing;h.state='crossing';h.x=m.town.school.x-1;Object.assign(m.van,{x:0,z:20});m.mode='walk';
 Object.assign(m.player,{x:h.x+.1,z:h.z+.4});const before=h.x;T.crossingStep(m,.1);assert.equal(h.x,before);
});
