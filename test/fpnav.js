/* Road paths use real generated towns, restrictions and checkpoint versions, without a renderer. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={THREE:require('../lib/three.min.js')};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/town.js','data/m3_doorsteps.js','data/m8_stops.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fplater.js','src/core/fproute.js','src/core/fpsigns.js','src/core/fpday.js','src/core/fpdoors.js','src/core/fpnav.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.save={data:{townSeed:1}};
const model=(day=1,seed=7,signed=true)=>{let p=O.fpLater.prepare(O.fpRoute.plan(day,seed));if(signed)p=O.fpSigns.prepare(p);const m=O.fpMission.create('campaign',seed,p);O.fpDay.configure(m);O.fpDoors.configure(m);return m;};
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
