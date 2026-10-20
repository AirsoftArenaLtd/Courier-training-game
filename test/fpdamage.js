/* Damage state, approved report vocabulary and future checkpoint contract. No renderer. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);
for(const file of ['data/workday_events.js','src/core/scorelog.js','src/core/workday.js','src/core/fpdamage.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);
const D=c.OTR.fpDamage,plain=x=>JSON.parse(JSON.stringify(x)),fresh=()=>D.create(7,4);
test('starting wear is deterministic, separate from new damage and never reports',()=>{
 const a=D.create(4,4),b=D.create(4,4);assert.deepEqual(plain(a),plain(b));assert.ok(a.baseline.some(Boolean));
 assert.equal(a.added.some(Boolean),false);assert.equal(a.serial,0);assert.equal(a.clearance,0);assert.equal(D.valid(a),true);
 const zone=D.zones[a.baseline.findIndex(Boolean)];assert.equal(D.level(a,zone),a.baseline[D.zones.indexOf(zone)]);
});
test('the first three days and trainer damage-off cannot cause damage, clearance grades or load shifts',()=>{
 for(const s of [D.create(7,1),D.create(7,2),D.create(7,3),D.create(7,12,false)]){
  const before=JSON.stringify(s);assert.equal(D.contact(s,'front','solid',8),null);assert.equal(D.clearance(s,0,false),null);
  assert.equal(D.shift(s,0,{lateral:10,braking:8,count:5,secured:false}),null);assert.equal(JSON.stringify(s),before);assert.equal(D.valid(s),true);
 }
});
test('a located impact chooses the approved severity without moving existing wear into player damage',()=>{
 for(const [speed,type] of [[.5,'scuff'],[3,'dent'],[8,'major']])for(const zone of D.zones){
  const s=fresh(),baseline=JSON.stringify(s.baseline),event=D.contact(s,zone,'solid',speed);
  assert.equal(event.type,'van.damage-'+type);assert.equal(event.key,zone+':solid-1');assert.equal(event.ok,false);
  assert.equal(JSON.stringify(s.baseline),baseline);assert.ok(s.added[D.zones.indexOf(zone)]>0);assert.equal(D.valid(s),true);
 }
});
test('a held contact reports once per affected zone, including after restoring mid-contact',()=>{
 const s=fresh(),first=D.contact(s,'left','traffic',3),r=D.restore(plain(s));assert.ok(r);
 for(let i=0;i<1000;i++)assert.equal(D.contact(r,'left','traffic',3),null);
 assert.equal(D.contact(r,'mirror','traffic',3).key,'mirror:traffic-1');assert.equal(r.serial,1);
 D.release(r);const next=D.contact(r,'left','traffic',3);assert.notEqual(next.key,first.key);assert.equal(next.key,'left:traffic-2');
});
test('released contacts and different physical causes keep their own event identities',()=>{
 const s=fresh(),a=D.contact(s,'roof','clearance',3),b=D.contact(s,'front','solid',3);
 assert.equal(a.key,'roof:clearance-1');assert.equal(b.key,'front:solid-2');D.release(s);assert.equal(D.valid(s),true);
});
test('restored state is independent and reproduces the same later impact and load transition',()=>{
 const s=fresh();D.contact(s,'front','solid',3);D.release(s);const r=D.restore(plain(s));
 assert.notEqual(r.baseline,s.baseline);assert.notEqual(r.added,s.added);
 const actions=x=>[D.contact(x,'rear','traffic',8),D.shift(x,2,{lateral:-7,braking:7,count:5,secured:true}),D.clearance(x,1,true)];
 assert.deepEqual(plain(actions(r)),plain(actions(s)));assert.deepEqual(plain(r),plain(s));
});
test('parking-speed touches and malformed impact inputs leave the checkpoint unchanged',()=>{
 const s=fresh(),before=JSON.stringify(s);
 for(const [zone,cause,speed] of [['front','solid',.1],['unknown','solid',8],['roof','unknown',8],['rear','traffic',NaN],['left','solid',Infinity],['wheel','solid',-1],['right','solid',81]])assert.equal(D.contact(s,zone,cause,speed),null);
 assert.equal(JSON.stringify(s),before);
});
test('clearance checks retain stop/detour success or strike failure once through a checkpoint',()=>{
 const s=fresh();assert.equal(D.clearance(s,0,true).ok,true);assert.equal(D.clearance(s,1,false).ok,false);
 const r=D.restore(plain(s));assert.equal(r.clearanceFailed,2);assert.equal(D.clearance(r,0,true),null);assert.equal(D.clearance(r,1,true),null);
 const strike=D.clearance(r,0,false);assert.equal(strike.key,'clearance-0-strike');assert.equal(strike.ok,false);assert.equal(D.clearance(r,0,false),null);assert.equal(D.valid(r),true);
 for(const id of [-1,2,NaN])assert.equal(D.clearance(s,id,false),null);assert.equal(D.clearance(s,1,'yes'),null);
});
test('secured cargo shifts less and requires a harder turn or brake than unsecured cargo',()=>{
 const loose=fresh(),secure=fresh(),moderate={lateral:4,braking:0,count:5};
 assert.equal(D.shift(loose,0,{...moderate,secured:false}).type,'load.shift');assert.equal(D.shift(secure,0,{...moderate,secured:true}),null);
 D.shift(secure,0,{lateral:7,braking:0,count:5,secured:true});assert.equal(loose.loadX,3);assert.equal(secure.loadX,1);
});
test('load shift is once per leg and never creates an event for an empty or gently driven van',()=>{
 const s=fresh();for(const input of [{lateral:2,braking:1,count:5,secured:false},{lateral:10,braking:10,count:0,secured:false}])assert.equal(D.shift(s,0,input),null);
 const input={lateral:-8,braking:8,count:6,secured:false};assert.equal(D.shift(s,0,input).key,'load-0');
 for(let i=0;i<1000;i++)assert.equal(D.shift(s,0,input),null);
 const r=D.restore(plain(s));assert.equal(D.shift(r,0,input),null);assert.equal(D.shift(r,1,input).key,'load-1');assert.equal(r.loadX,-3);assert.equal(r.loadZ,-3);
});
test('changing trainer permission preserves old damage and prevents new reports',()=>{
 const s=fresh();D.contact(s,'front','solid',3);const wear=JSON.stringify(s.added);assert.equal(D.setEnabled(s,false),false);
 assert.equal(D.contact(s,'rear','traffic',8),null);assert.equal(JSON.stringify(s.added),wear);assert.equal(s.source,0);assert.equal(D.valid(s),true);
 assert.equal(D.setEnabled(s,true),true);assert.ok(D.contact(s,'rear','traffic',8));assert.equal(D.setEnabled(D.create(1,1),true),false);
});
test('malformed, sparse, extra and contradictory checkpoint fields are rejected',()=>{
 const base=plain(fresh());const changes=[s=>s.version=2,s=>s.day=0,s=>s.enabled='yes',s=>s.baseline=[0],s=>s.added[0]=4,s=>s.added[1]=null,s=>s.serial=-1,s=>s.source=1,s=>s.contactMask=128,s=>s.clearanceFailed=1,s=>s.shiftMask=256,s=>s.loadX=1,s=>s.loadZ=1,s=>s.extra=true,s=>delete s.day,s=>s.baseline=Array(7)];
 for(const change of changes){const s=plain(base);change(s);assert.equal(D.valid(s),false);assert.equal(D.restore(s),null);}
 for(const raw of [null,[],{},'state'])assert.equal(D.restore(raw),null);
});
test('long repeated driving keeps a bounded state and fresh collision keys after restore',()=>{
 const s=fresh();let key;
 for(let i=0;i<10000;i++){D.release(s);key=D.contact(s,D.zones[i%7],D.sources[i%3],8).key;D.shift(s,i%8,{lateral:i%2?9:-9,braking:9,count:6,secured:false});}
 assert.equal(D.valid(s),true);assert.ok(JSON.stringify(s).length<400);const r=D.restore(plain(s));D.release(r);
 assert.notEqual(D.contact(r,'front','solid',8).key,key);assert.equal(r.serial,10001);
});
test('only approved event types cross the real workday contract, preserving keys, place and retry identity',()=>{
 const W=c.OTR.workday;W.begin();const s=D.create(4,4);assert.equal(W.events.length,0);
 const events=[];for(const speed of [.5,3,8]){D.release(s);events.push(D.contact(s,'front','solid',speed));}
 events.push(D.clearance(s,0,true),D.clearance(s,1,false),D.shift(s,0,{lateral:8,braking:0,count:5,secured:false}));
 for(const event of events){assert.ok(c.OTR_DATA.workdayEvents[event.type]);const {type,...detail}=event;
  W.report(type,{...detail,stop:3,where:{x:17,z:-42,mph:4}});W.report(type,{...detail,stop:3,where:{x:17,z:-42,mph:4}});
 }
 assert.equal(W.events.length,6);assert.ok(W.events.every(e=>e.stop===3&&e.where.x===17&&e.where.z===-42));
 const before=plain(W.events),score=W.log.score();W.restore({events:before});assert.deepEqual(plain(W.events),before);assert.equal(W.log.score(),score);
 assert.ok(W.log.criticals().length>0,'the approved major-damage type keeps its critical flag');
});
