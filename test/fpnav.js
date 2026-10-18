/* Road paths use real generated towns, restrictions and checkpoint versions, without a renderer. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={THREE:require('../lib/three.min.js')};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/town.js','data/m3_doorsteps.js','data/m8_stops.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fplater.js','src/core/fproute.js','src/core/fpsigns.js','src/core/fpday.js','src/core/fpdoors.js','src/core/fpnav.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.save={data:{townSeed:1}};
const model=(day=1,seed=7,signed=true,nav=false)=>{let p=O.fpLater.prepare(O.fpRoute.plan(day,seed));if(signed)p=O.fpSigns.prepare(p);if(nav)p=O.fpNav.prepare(p);const m=O.fpMission.create('campaign',seed,p);O.fpDay.configure(m);O.fpDoors.configure(m);return m;};
const plain=p=>JSON.parse(JSON.stringify(p));
const legal=(m,path)=>{const g=O.fpSigns.enabled(m)?O.fpSigns.runtime(m).oneway:null;for(let i=1;i<path.points.length;i++)assert.ok(O.fpNav.allowed(m,path.points[i-1],path.points[i],g),'Illegal route edge '+JSON.stringify(path.points.slice(i-1,i+1)));};
test('straight street paths have the exact distance and preserve their endpoints',()=>{
 const m=model(),a={x:0,z:0},b={x:0,z:-10},p=O.fpNav.path(m,a,b);assert.equal(p.distance,10);assert.deepEqual(plain(p.points),[a,b]);legal(m,p);
});
test('a real road closure produces a detour with van clearance, in either direction',()=>{
 const m=model(3),r=m.roadworks,a={x:r.x,z:r.z+10},b={x:r.x,z:r.z-10};for(const [from,to] of [[a,b],[b,a]]){const p=O.fpNav.path(m,from,to);assert.ok(p&&p.distance>20);assert.ok(p.points.some(v=>v.x!==r.x));legal(m,p);}
});
test('the signed one-way segment has a direct eastbound route and a legal westbound detour',()=>{
 const m=model(3),g=O.fpSigns.runtime(m).oneway,a={x:g.from+15,z:g.roadZ},b={x:g.from+30,z:g.roadZ};const east=O.fpNav.path(m,a,b),west=O.fpNav.path(m,b,a);assert.equal(east.distance,15);assert.ok(west.distance>15);legal(m,east);legal(m,west);
});
test('older checkpoints keep a direct two-way path on the same peripheral street',()=>{
 const m=model(3,7,false),g=O.fpSigns.runtime(model(3)).oneway,a={x:g.from+30,z:g.roadZ},b={x:g.from+15,z:g.roadZ},restored=O.fpMission.restore(m.snapshot());assert.ok(restored);assert.equal(O.fpNav.path(restored,a,b).distance,15);
});
test('every delivery curb is reachable without changing generated missions or checkpoints',()=>{
 for(let day=1;day<=15;day++)for(let seed=1;seed<=5;seed++){const m=model(day,seed),before=JSON.stringify(m.snapshot());for(const stop of m.stops){const p=O.fpNav.path(m,m.van,stop.park);assert.ok(p,'No path to '+stop.address+' on '+day+'/'+seed);legal(m,p);}assert.equal(JSON.stringify(m.snapshot()),before);}
});
test('paths are deterministic, remain inside the town and reject invalid off-road destinations',()=>{
 const m=model(3),a=m.van,b=m.stops[0].park,p=O.fpNav.path(m,a,b);assert.equal(JSON.stringify(p),JSON.stringify(O.fpNav.path(m,a,b)));assert.ok(p.points.every(v=>O.fpNav.valid(m,v)));assert.equal(O.fpNav.path(m,a,{x:Infinity,z:0}),null);assert.equal(O.fpNav.path(m,a,{x:m.bounds.x1+1,z:0}),null);const lot=m.town.lots[0];assert.equal(O.fpNav.path(m,a,{x:lot.x,z:lot.z}),null);
});
test('a zero-length route has one point and no movement requirement',()=>{
 const m=model(),p=O.fpNav.path(m,m.van,m.van);assert.equal(p.distance,0);assert.equal(p.points.length,1);
});

const ready=(day=4,seed=7)=>{const m=model(day,seed,true,true);m.phase='route';m.departed=true;m.paused=false;m.mode='cab';m.van.gear=1;m.van.speed=3;O.fpLater.depart(m);return m;};
const tick=(m,seconds=0)=>{m.elapsed+=seconds;O.fpNav.tick(m,{...m.van});};
test('new days have solid reused obstacles, reachable stops and stable restored layout',()=>{
 assert.deepEqual(plain(O.fpNav.obstacles(model(1,7,true,true))),[]);
 for(let seed=1;seed<=30;seed++){const m=ready(4,seed),obs=O.fpNav.obstacles(m);assert.equal(obs.length,2);assert.ok(obs.some(o=>o.id==='blocked-drive'));assert.ok(obs.some(o=>o.id==='double-parked'));
  for(const o of obs)assert.ok(m.solids.includes(o));
  for(const stop of m.stops){const p=O.fpNav.path(m,m.van,stop.park);assert.ok(p,'reachable curb');legal(m,p);assert.equal(m.blocked(stop.x-stop.side*1.5,stop.z),false,'door approach');assert.equal(O.fp.vanBox({...stop.park},obs[0]),false,'curb remains clear');}
  const restored=O.fpMission.restore(m.snapshot());assert.ok(restored);assert.deepEqual(plain(restored.solids),plain(m.solids));
 }
});
test('a double-parked car diverts the planned street edge in both directions',()=>{
 const m=ready(),r=O.fpNav.obstacles(m).find(o=>o.id==='double-parked'),a={x:r.roadX,z:r.z+12},b={x:r.roadX,z:r.z-12};for(const [from,to] of [[a,b],[b,a]]){const p=O.fpNav.path(m,from,to);assert.ok(p&&p.distance>24);legal(m,p);}
});
test('route projection and physical street names give whole left/right turn instructions',()=>{
 const m=ready();const source=O.fpSigns.runtime(m).catalog.streets;
 for(const [points,word] of [[[{x:0,z:8},{x:0,z:-12.25},{x:45,z:-12.25}],'right'],[[{x:45,z:8},{x:45,z:-12.25},{x:0,z:-12.25}],'left']]){
  O.fpNav.routes=new WeakMap();const original=O.fpNav.route;O.fpNav.route=()=>({points,distance:65.25});Object.assign(m.van,points[0],{yaw:0});const text=O.fpNav.instruction(m);assert.match(text,new RegExp('^In 70 feet, turn '+word+' onto '));assert.ok(source.some(s=>text.endsWith(s.name+'.')));O.fpNav.route=original;
 }
 const r={points:[{x:0,z:0},{x:0,z:-20},{x:45,z:-20}]};assert.equal(O.fpNav.project(r,{x:2,z:-10}).along,10);
});
const miss=m=>{O.fpNav.route(m);Object.assign(m.van,{x:135,z:-57.25});tick(m,1);assert.ok(m.navigation.pending);return m.navigation.pending;};
test('a wrong turn waits thirty seconds, reports once and keeps its original place and stop',()=>{
 const m=ready();O.workday.begin();const p=plain(miss(m));assert.equal(O.workday.events.length,0);tick(m,29.9);assert.equal(O.workday.events.length,0);tick(m,.1);assert.equal(O.workday.events.length,1);const e=O.workday.events[0];assert.equal(e.type,'drive.route');assert.equal(e.key,0);assert.equal(e.stop,1);assert.equal(e.ok,false);assert.deepEqual(plain(e.where),{x:135,z:-57.2,mph:7});tick(m,60);assert.equal(O.workday.events.length,1);
});
test('following eight meters of the reroute within thirty seconds clears the mistake',()=>{
 const m=ready();O.workday.begin();miss(m);const r=O.fpNav.route(m),a=r.points[0],b=r.points[1],d=Math.hypot(b.x-a.x,b.z-a.z);Object.assign(m.van,{x:a.x+(b.x-a.x)*9/d,z:a.z+(b.z-a.z)*9/d,yaw:Math.atan2(b.x-a.x,-(b.z-a.z))});tick(m,5);assert.equal(m.navigation.pending,null);tick(m,40);assert.equal(O.workday.events.length,0);
});
test('pending reroutes survive a checkpoint without extending grace or emitting while restoring',()=>{
 const m=ready();O.workday.begin();miss(m);tick(m,20);const before=plain(m.snapshot()),r=O.fpMission.restore(before);assert.ok(r);assert.deepEqual(plain(r.snapshot()),before);assert.deepEqual(plain(O.workday.events),[]);r.paused=false;tick(r,10);assert.equal(O.workday.events.length,1);assert.equal(O.workday.events[0].key,0);
 for(const change of [n=>n.pending.at=Infinity,n=>n.pending.leg=99,n=>n.origin.x=9999,n=>n.progress=-1,n=>delete n.pending]){const raw=plain(before);change(raw.navigation);assert.equal(O.fpMission.restore(raw),null);}
});
test('off aids never grade an invisible route, and reverse or menus do not create mistakes',()=>{
 const m=ready();O.workday.begin();m.workdayRules={satnav:'off'};Object.assign(m.van,{x:135,z:-57.25});tick(m,60);assert.equal(m.navigation.pending,null);assert.deepEqual(plain(O.workday.events),[]);assert.match(O.fpNav.instruction(m),/turned navigation off/);
 m.workdayRules.satnav='full';m.van.gear=-1;tick(m,2);assert.equal(m.navigation.pending,null);m.van.gear=1;m.paused=true;tick(m,2);assert.equal(m.navigation.pending,null);
});
test('route cache is bounded per mission and unchanged frames never repeat graph searches',()=>{
 const m=ready(),r=O.fpNav.route(m);for(let i=0;i<1000;i++){Object.assign(m.van,{x:2.84,z:8-i*.001});assert.equal(O.fpNav.route(m),r);}assert.equal(O.fpNav.routes instanceof WeakMap,true);m.activeStop=1;assert.notEqual(O.fpNav.route(m),r);assert.equal(m.navigation.context,'0','display does not mutate saved state');
});

test('backtracking while in reverse replans before drive resumes without a wrong-turn penalty',()=>{
 const m=ready();O.workday.begin();m.navigation.progress=40;m.van.gear=-1;tick(m,1);m.van.gear=1;tick(m,1);assert.equal(m.navigation.pending,null);assert.equal(O.workday.events.length,0);assert.ok(m.navigation.progress<40);
});
test('turning aids on after an off-aid checkpoint starts from the current position',()=>{
 const m=ready();m.workdayRules={satnav:'off'};tick(m,1);Object.assign(m.van,{x:135,z:-57.25});const r=O.fpMission.restore(m.snapshot());assert.ok(r);r.paused=false;r.workdayRules={satnav:'full'};O.workday.begin();tick(r,1);assert.equal(r.navigation.pending,null);assert.deepEqual(plain(r.navigation.origin),{x:135,z:-57.25});assert.equal(O.workday.events.length,0);
});
test('a checkpoint taken in reverse preserves the next navigation transition exactly',()=>{
 const m=ready();m.navigation.progress=40;m.van.gear=-1;tick(m,1);assert.equal(m.navigation.reversing,true);const r=O.fpMission.restore(m.snapshot());assert.ok(r);r.paused=false;m.van.gear=r.van.gear=1;tick(m,1);tick(r,1);assert.deepEqual(plain(r.navigation),plain(m.navigation));
});
