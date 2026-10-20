/* Actual motor contacts, original days, owned mission restore and trainer rules. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={URLSearchParams};c.window=c;c.location={search:''};c.addEventListener=()=>{};c.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};vm.createContext(c);
for(const file of ['data/theme.js','data/config.js','data/town.js','data/m3_doorsteps.js','data/m8_stops.js','data/workday_events.js',
 'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js',
 'src/core/scorelog.js','src/core/scoring.js','src/core/save.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fpsigns.js','src/core/fpnav.js','src/core/fplater.js',
 'src/core/fpday.js','src/core/fpdoors.js','src/core/fpdriving.js','src/core/fpdamage.js','src/core/fpdamageflow.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);
const O=c.OTR,M=O.fpMission,F=O.fpDamageFlow,D=O.fpDamage,W=O.workday,plain=x=>JSON.parse(JSON.stringify(x));O.save.data=O.save.defaults();O.save.data.townSeed=1;
function make(day=4,seed=7,marked=true){
 let plan=O.fpLater.prepare(O.fpRoute.plan(day,seed));if(marked)plan=F.prepare(plan);
 const m=M.create('campaign',seed,plan);O.fpDay.configure(m);O.fpDoors.configure(m);O.fpDriving.configure(m);
 m.mode='cab';m.paused=false;m.phase='route';m.departed=true;m.secured=true;m.crossing.state='resolved';m.events[m.briefKey]=true;
 Object.assign(m.van,{x:2.84,z:-15,yaw:0,speed:3,gear:1,hand:false,belt:true});for(const t of m.traffic){t.x=10000;t.z=10000;}O.fpLater.depart(m);
 return m;
}
const addWall=m=>{const b={x:m.van.x,z:m.van.z-2.77,w:6,d:.1,h:2.8};m.solids.push(b);return b;};
const damage=()=>W.events.filter(e=>e.type.startsWith('van.damage-'));
function resume(m){const raw=plain(m.snapshot()),before=plain(W.events),r=M.restore(raw);assert.ok(r);assert.deepEqual(plain(r.snapshot()),raw);assert.deepEqual(plain(W.events),before);r.paused=false;return r;}
test.beforeEach(()=>{W.begin();delete O.academy;});
test('a real motor impact reports the located severity and place once, replacing the generic contact',()=>{
 const m=make();addWall(m);m.step({forward:true},.0125);assert.equal(m.motion.contact,true);assert.ok(m.motion.contactNormalSpeed>2.5);
 assert.equal(damage().length,1);assert.equal(damage()[0].type,'van.damage-dent');assert.equal(damage()[0].key,'front:solid-1');assert.equal(damage()[0].stop,1);
 assert.equal(damage()[0].where.x,2.8);assert.equal(damage()[0].where.z,-15);assert.ok(damage()[0].where.mph>6);assert.equal(W.events.filter(e=>e.type==='drive.contact').length,0);
});
test('holding the accelerator into a wall cannot create repeated impact episodes',()=>{
 const m=make();addWall(m);for(let i=0;i<800;i++)m.step({forward:true},.0125);
 assert.equal(damage().length,1);assert.equal(m.damage.serial,1);assert.equal(m.damage.added[0],2);assert.equal(D.valid(m.damage),true);
});
test('a checkpoint held against a physical wall preserves future damage and event identity',()=>{
 const m=make(),wall=addWall(m);m.step({forward:true},.0125);const r=resume(m);r.solids.push({...wall});
 for(let i=0;i<200;i++){m.step({forward:true},.0125);r.step({forward:true},.0125);}
 assert.deepEqual(plain(r.damage),plain(m.damage));assert.deepEqual(plain(r.van),plain(m.van));assert.equal(damage().length,1);
});
test('separating from a wall ends the contact so a later impact gets a new key',()=>{
 const m=make(),wall=addWall(m);m.step({forward:true},.0125);m.van.z+=1;m.van.speed=0;m.van.hand=true;m.step({},.0125);assert.equal(m.damage.source,0);
 wall.z=m.van.z-2.77;m.van.speed=3;m.van.hand=false;m.step({forward:true},.0125);
 assert.equal(damage().length,2);assert.equal(damage()[1].key,'front:solid-2');
});
test('trainer damage-off produces no new damage and enabling it does not query the academy per frame',()=>{
 const m=make();let calls=0;O.academy={workdayRules:()=>{calls++;return {assists:'off',damage:false};}};O.fp.applyDriveRules(m);assert.equal(m.damage.enabled,false);
 addWall(m);m.step({forward:true},.0125);assert.equal(damage().length,0);assert.equal(calls,1);assert.equal(m.damage.added.some(Boolean),false);
 O.academy.workdayRules=()=>{calls++;return {assists:'off',damage:true};};O.fp.applyDriveRules(m);assert.equal(m.damage.enabled,true);assert.equal(calls,2);
});
test('first days and unmarked old days have no new owned damage state or changed collision grading',()=>{
 for(const day of [1,2,3]){const m=make(day);assert.equal(m.damage,undefined);assert.equal(Object.hasOwn(m.snapshot(),'damage'),false);resume(m);}
 const m=make(4,7,false);addWall(m);m.step({forward:true},.0125);assert.equal(m.damage,undefined);assert.equal(damage().length,0);assert.equal(W.events.filter(e=>e.type==='drive.contact').length,1);
});
test('starting wear restores without a damage penalty and cannot be rewritten by a checkpoint',()=>{
 const m=make(4,4);assert.ok(m.damage.baseline.some(Boolean));assert.equal(damage().length,0);resume(m);assert.equal(damage().length,0);
 const raw=m.snapshot();raw.damage.baseline[0]=3;assert.equal(M.restore(raw),null);
});
test('marked checkpoints require valid owned damage state; unmarked checkpoints reject injected state',()=>{
 const m=make(),raw=m.snapshot();delete raw.damage;assert.equal(M.restore(raw),null);
 for(const edit of [s=>s.version=2,s=>s.day=5,s=>s.serial=-1,s=>s.added[0]=99,s=>s.loadX=99]){const bad=m.snapshot();edit(bad.damage);assert.equal(M.restore(bad),null);}
 const old=make(4,7,false).snapshot();old.damage=null;assert.equal(M.restore(old),null);
 assert.throws(()=>M.create('campaign',7,{...O.fpRoute.plan(1,7),damage:1}),/Invalid damage version/);
});
test('actual hard braking shifts loose cargo once, without changing parcel or shelf identity',()=>{
 const m=make(5);m.secured=false;for(const p of m.parcels)p.location='slot'+p.stop;
 const before=m.parcels.map(p=>[p.id,p.location]);m.van.speed=8;m.step({back:true},.0125);
 assert.equal(W.events.filter(e=>e.type==='load.shift').length,1);assert.equal(m.damage.loadZ,-3);assert.deepEqual(m.parcels.map(p=>[p.id,p.location]),before);
 const r=resume(m);r.van.speed=8;r.step({back:true},.0125);assert.equal(W.events.filter(e=>e.type==='load.shift').length,1);
});
test('ordinary traffic contact uses the front zone and severity, never a second generic grade',()=>{
 const m=make();m.traffic[0].x=m.van.x;m.traffic[0].z=m.van.z-3;m.traffic[0].speed=0;
 m.step({forward:true},.0125);assert.equal(damage().length,1);assert.equal(damage()[0].key,'front:traffic-1');assert.equal(W.events.filter(e=>e.type==='drive.contact').length,0);
});
test('a glancing side contact uses the swinging corner speed instead of the full forward speed',()=>{
 const m=make();m.van.steer=.3;m.solids.push({x:m.van.x+1.131,z:m.van.z,w:.1,d:40,h:3});
 m.step({forward:true,right:true},.0125);assert.equal(m.motion.contact,true);assert.ok(m.motion.contactNormalSpeed>1&&m.motion.contactNormalSpeed<2.5);
 assert.equal(damage().length,1);assert.equal(damage()[0].type,'van.damage-scuff');assert.equal(damage()[0].key,'right:solid-1');
});
test('an actual reverse impact locates rear damage and preserves its once-only contact identity',()=>{
 const m=make();m.van.speed=-1.5;m.van.gear=-1;m.solids.push({x:m.van.x,z:m.van.z+2.755,w:6,d:.1,h:3});
 m.step({forward:true},.0125);assert.equal(damage().length,1);assert.equal(damage()[0].key,'rear:solid-1');assert.equal(damage()[0].type,'van.damage-scuff');
});
test('a busy day of real adapter reports keeps SCORM 1.2 scores and criticals inside its limit',()=>{
 const m=make();
 for(let i=0;i<40;i++){D.release(m.damage);F.fire(m,D.contact(m.damage,D.zones[i%7],D.sources[i%3],[.5,3,8][i%3]),3);}
 for(let leg=0;leg<8;leg++)F.fire(m,D.shift(m.damage,leg,{secured:false,count:5,lateral:8,braking:8}),8);
 F.fire(m,D.clearance(m.damage,0,true),0);F.fire(m,D.clearance(m.damage,1,false),3);
 const data=O.save.defaults();data.workday={current:{id:'damage-day',day:4,events:plain(W.events)},last:null};
 const packed=O.save.fit(JSON.stringify(data),O.save.SCORM12_LIMIT),decoded=O.save.unpackDay(JSON.parse(packed).workday.current),replay=W.replay(decoded.events);
 const criticals=log=>log.criticals().map(x=>[x.cat,x.label,x.got]);
 assert.ok(packed.length<=4000);assert.equal(replay.log.score(),W.log.score());assert.deepEqual(plain(criticals(replay.log)),plain(criticals(W.log)));
 assert.deepEqual(plain(decoded.events.map(e=>[e.type,e.key,e.ok]).sort()),plain(W.events.map(e=>[e.type,e.key,e.ok]).sort()));
 const rawTotal=log=>log.items.reduce((n,i)=>n+i.got,0);assert.equal(rawTotal(replay.log),rawTotal(W.log));
 assert.equal(decoded.events.length,50);assert.ok(JSON.stringify(m.damage).length<400);
 const out=__dirname+'/out/fp-review';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/c34-flow-save.json',JSON.stringify({events:50,scormCharacters:packed.length,ownedCharacters:JSON.stringify(m.damage).length,score:W.log.score(),rawAward:rawTotal(W.log),criticals:W.log.criticals().length},null,2)+'\n');
});
test('both signed low clearances leave all generated delivery curbs reachable on a real detour',()=>{
 for(let seed=1;seed<=30;seed++){
  const plan=F.prepare(O.fpNav.prepare(O.fpSigns.prepare(O.fpLater.prepare(O.fpRoute.plan(4,seed))))),m=M.create('campaign',seed,plan);
  O.fpDay.configure(m);O.fpDoors.configure(m);O.fpDriving.configure(m);const bridges=m._damageClearances;assert.equal(bridges.length,2,'seed '+seed);
  for(const stop of m.stops){const p=O.fpNav.path(m,m.van,stop.park);assert.ok(p,'reachable '+seed+'/'+stop.id);
   for(let i=1;i<p.points.length;i++)assert.equal(O.fpNav.allowed(m,p.points[i-1],p.points[i],null),true,'safe path edge');}
  for(const b of bridges){assert.ok(b.posts.every(p=>m.solids.includes(p)));const a={x:b.x,z:b.z+12},end={x:b.x,z:b.z-12};
   assert.equal(O.fpNav.allowed(m,a,end,null),false);const p=O.fpNav.path(m,a,end);assert.ok(p&&p.distance>24,'a real alternate street');}
  assert.deepEqual(plain(resume(m)._damageClearances),plain(bridges));
 }
});
test('an overhead collision stops the van and grades roof damage and clearance only once',()=>{
 const m=make(),b=m._damageClearances[0];Object.assign(m.van,{x:b.x,z:b.z+2.92,yaw:0,speed:3});
 m.step({forward:true},.0125);assert.equal(m.motion.contactBox,b);assert.equal(m.van.speed,0);assert.equal(damage()[0].key,'roof:clearance-1');
 const checks=()=>W.events.filter(e=>e.type==='drive.clearance');assert.equal(checks().length,1);assert.equal(checks()[0].ok,false);
 for(let i=0;i<50;i++)m.step({forward:true},.025);assert.equal(checks().length,1);assert.equal(damage().length,1);assert.equal(D.valid(m.damage),true);
 assert.equal(m.blocked(b.x+3,b.z),false,'a pedestrian can walk below the beam beside the stopped van');
});
test('stopping before a low clearance succeeds without damage, including after resume',()=>{
 const m=make(),b=m._damageClearances[0];Object.assign(m.van,{x:b.x,z:b.z+10,yaw:0,speed:0,hand:true});
 assert.match(F.warning(m),/8 feet 10 inches/);m.step({},.025);assert.equal(damage().length,0);assert.equal(W.events.filter(e=>e.type==='drive.clearance'&&e.ok).length,1);
 const r=resume(m);r.step({},.025);assert.equal(W.events.filter(e=>e.type==='drive.clearance').length,1);
});
test('damage-off cannot introduce a clearance penalty through the old generic contact grade',()=>{
 const m=make(),b=m._damageClearances[0];m.workdayRules={damage:false};F.applyRules(m);
 Object.assign(m.van,{x:b.x,z:b.z+2.92,yaw:0,speed:3});m.step({forward:true},.0125);
 assert.equal(m.van.speed,0);assert.equal(damage().length,0);assert.equal(W.events.some(e=>['drive.clearance','drive.contact'].includes(e.type)),false);
});
test('moving off after a safe halt cannot hide a later clearance strike, even after restore',()=>{
 const m=make(),b=m._damageClearances[0];Object.assign(m.van,{x:b.x,z:b.z+10,yaw:0,speed:0,hand:true});m.step({},.0125);
 const r=resume(m);Object.assign(r.van,{x:b.x,z:b.z+2.92,yaw:0,speed:3,hand:false});r.step({forward:true},.0125);
 const events=W.events.filter(e=>e.type==='drive.clearance');assert.equal(events.length,2);assert.equal(events[0].ok,true);assert.equal(events[1].ok,false);assert.equal(events[1].key,'clearance-0-strike');
 assert.ok(r.damage.added[4]);for(let i=0;i<30;i++)r.step({forward:true},.0125);assert.equal(W.events.filter(e=>e.type==='drive.clearance').length,2);
 const data=O.save.defaults();data.workday={current:{id:'stop-then-strike',day:4,events:plain(W.events)},last:null};const packed=O.save.fit(JSON.stringify(data),4000),decoded=O.save.unpackDay(JSON.parse(packed).workday.current);
 assert.equal(W.replay(decoded.events).log.score(),W.log.score());assert.deepEqual(plain(decoded.events.filter(e=>e.type==='drive.clearance').map(e=>[e.key,e.ok])),plain(events.map(e=>[e.key,e.ok])));
});
test('an observed approach followed by a safe detour keeps its identity through a checkpoint',()=>{
 const m=make(),b=m._damageClearances[0];Object.assign(m.van,{x:b.x,z:b.z+15,yaw:0,speed:2});m.step({},.025);
 assert.ok(m.damage.clearanceSeen&1);assert.equal(W.events.filter(e=>e.type==='drive.clearance').length,0);
 const r=resume(m);Object.assign(r.van,{x:b.x+30,z:b.z+15,speed:0,hand:true});r.step({},.025);
 const e=W.events.find(e=>e.type==='drive.clearance');assert.ok(e&&e.ok);assert.equal(e.key,'clearance-0');assert.equal(damage().length,0);
});
test('a reverse approach warns and grades a safe halt before a later roof strike',()=>{
 const m=make(),b=m._damageClearances[0];Object.assign(m.van,{x:b.x,z:b.z+10,yaw:Math.PI,gear:-1,speed:0,hand:true});
 assert.match(F.warning(m),/clearance/);m.step({},.0125);assert.equal(W.events.filter(e=>e.type==='drive.clearance'&&e.ok).length,1);
 Object.assign(m.van,{z:b.z+2.91,speed:-1.5,hand:false});m.step({forward:true},.0125);
 const e=W.events.filter(e=>e.type==='drive.clearance');assert.equal(e.length,2);assert.equal(e[1].ok,false);assert.equal(e[1].key,'clearance-0-strike');assert.ok(m.damage.added[4]);
});

test('a perpendicular traffic impact uses its actual body for the located zone and one contact episode',()=>{
 const m=make(),car=m.traffic[0];Object.assign(car,{x:m.van.x+2.6,z:m.van.z-3.6,yaw:Math.PI/2,speed:0});
 m.step({forward:true},.0125);assert.equal(damage().length,1);assert.equal(damage()[0].key,'front:traffic-1');
 assert.equal(F.nearContact(m),true,'the van remains near the actual side-on car body after collision rollback');
 for(let i=0;i<40;i++)m.step({forward:true},.0125);
 assert.equal(m.damage.source,2);assert.equal(m.damage.serial,1);
 m.van.speed=3;m.van.hand=false;m.step({forward:true},.0125);assert.equal(damage().length,1,'holding at the same car cannot repeat the penalty');
 m.van.z+=3;m.van.speed=0;m.van.hand=true;m.step({},.0125);assert.equal(m.damage.source,0);
 assert.ok(M.restore(plain(m.snapshot())));
});

test('a successful clearance check keeps its key without an unused map place; a strike retains its place',()=>{
 const m=make();F.fire(m,D.clearance(m.damage,0,true),0);
 const passed=W.events.find(e=>e.type==='drive.clearance');assert.equal(passed.ok,true);assert.equal(passed.where,undefined);assert.equal(passed.key,'clearance-0');
 F.fire(m,D.clearance(m.damage,0,false),3);const failed=W.events.find(e=>e.type==='drive.clearance'&&!e.ok);
 assert.equal(failed.key,'clearance-0-strike');assert.equal(failed.where.x,2.8);assert.equal(failed.where.z,-15);assert.ok(failed.where.mph>6);
});
