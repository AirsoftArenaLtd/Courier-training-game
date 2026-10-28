/* Actual mission/nav/vehicle geometry; not a native keyboard or rendered resource acceptance claim. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/town.js','data/m3_doorsteps.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fpday.js','src/core/fpdoors.js','src/core/fpnav.js','src/core/fpstops.js','src/core/fpproblemprotocol.js','src/core/fpproblemroute.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,R=O.fpProblemRoute,P=O.fpProblemProtocol;
function fixture(){const m=R.model(),run={model:m};R.attach(run);m.paused=false;return {m,run,s:m.roadProblem};}
test('the actual navigation graph takes a bounded detour around the solid closure toward a real delivery curb',()=>{
 const {m,s}=fixture(),r=O.fpNav.route(m);assert.ok(m.solids.includes(m.roadworks));assert.equal(m.blocked(m.roadworks.x,m.roadworks.z),true);assert.ok(r.points.length>4&&r.points.length<=16);assert.ok(r.distance>Math.hypot(m.van.x-s.goal.x,m.van.z-s.goal.z)+50);assert.ok(r.points.some(p=>Math.abs(p.x-m.roadworks.x)>m.town.road));for(let i=1;i<r.points.length;i++)assert.equal(O.fpNav.allowed(m,r.points[i-1],r.points[i]),true);for(const p of r.points)assert.equal(O.fpNav.valid(m,p),true);assert.equal(m.stops.length,1);assert.equal(m.parcels.length,0);assert.equal(s.goal.x,m.stops[0].park.x);assert.equal(s.state.route.radius,4.25,'checkpoint width includes the actual right-hand and curb lanes');
});
test('scenario-shell setup restores the real model bounds and start before deriving its route',()=>{
 const m=R.model(),run={model:m};m.bounds={x0:-19,x1:19,z0:-54,z1:22};m.trainingArea={key:'street'};Object.assign(m.van,{x:1.7,z:-20});assert.equal(R.attach(run),true);assert.equal(m.trainingArea,null);assert.equal(m.bounds.x1,m.roadProblem.bounds.x1);assert.equal(m.van.x,m.roadProblem.start.x);assert.equal(run.log,m.roadProblem.state.log);assert.equal(R.attach(run),false);
});
test('normal driving in the right-hand lane enters the first route gate without crossing the center line',()=>{
 const {m,s}=fixture(),x=m.van.x;Object.assign(m.van,{gear:1,hand:false,belt:true});for(let i=0;i<60;i++)m.step({forward:true},.025);assert.ok(m.van.speed>.3);assert.ok(Math.abs(m.van.x-x)<.001);assert.equal(s.state.route.next,1);assert.ok(Math.abs(m.van.x-m.town.xs[1])>2.5,'the real lane offset exceeds a too-narrow 2.5 m checkpoint');
});
test('the vehicle motor cannot drive through the closure and reports its catalogue contact to the isolated log',()=>{
 O.workday.begin();O.workday.report('brief.read',{key:'suspended'});const before=JSON.stringify(O.workday.events),{m,s}=fixture();Object.assign(m.van,{gear:1,hand:false,belt:true});
 for(let i=0;i<1600;i++)m.step({forward:true},.025);assert.ok(m.van.z<m.roadworks.z-2.7,'the body remains before the barrier');assert.equal(s.state.log.items.filter(i=>i.type==='drive.contact').length,1);assert.equal(s.state.log.criticals().length,1);assert.equal(s.state.route.next< s.state.route.points.length,true);assert.equal(JSON.stringify(O.workday.events),before);assert.equal(R.ready(m),false);
});
test('the whole van must be parked in the destination bay, aligned with traffic; a relocation never finishes the route',()=>{
 const {m,s,run}=fixture();Object.assign(m.van,{...s.goal,speed:0,hand:true,gear:2});assert.equal(R.parking(m),true);assert.equal(R.ready(m),false);assert.equal(R.result(run),null);
 for(const pose of [{x:s.goal.x+.3},{z:s.goal.z+2},{yaw:Math.PI/2},{yaw:Math.PI},{speed:.2},{hand:false}]){Object.assign(m.van,{...s.goal,speed:0,hand:true,gear:2},pose);assert.equal(R.parking(m),false,JSON.stringify(pose));}
});
test('paused and finished models stay still, and unfinished results preserve actual contact observations with zero stars',()=>{
 const {m,s,run}=fixture();m.paused=true;const before=JSON.stringify([m.van,s.state.elapsed,s.state.route]);m.step({forward:true},.05);assert.equal(JSON.stringify([m.van,s.state.elapsed,s.state.route]),before);P.observe(s.state,'drive.contact',{key:'actual'});const result=R.result(run,'timeout');assert.equal(result.score,0);assert.deepEqual(JSON.parse(JSON.stringify(result.ratios)),{safety:0,efficiency:0});assert.equal(result.log.criticals().length,1);m.paused=false;const frozen=JSON.stringify([m.van,s.state.elapsed]);m.step({forward:true},.05);assert.equal(JSON.stringify([m.van,s.state.elapsed]),frozen);
});
