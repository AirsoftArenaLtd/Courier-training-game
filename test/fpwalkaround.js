/* Existing/new damage records, honest reporting, phase boundaries and exact bounded restores. No renderer. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={console};c.window=c;vm.createContext(c);
for(const f of ['data/workday_events.js','src/core/scorelog.js','src/core/workday.js','src/core/fpdamage.js','src/core/fpwalkaround.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const D=c.OTR.fpDamage,F=c.OTR.fpWalkaround,plain=x=>JSON.parse(JSON.stringify(x)),fresh=()=>D.create(7,4);
const hit=(d,zone,level=1)=>{D.release(d);D.contact(d,zone,'solid',[0,.5,3,8][level]);assert.equal(D.valid(d),true);};
const record=(s,d,phase,zone)=>{const seen=F.inspect(s,d,phase,zone);assert.ok(seen);assert.equal(F.record(s,d,phase,zone,seen.level).correct,true);};
const existing=zone=>{for(let seed=1;seed<100;seed++){const d=D.create(seed,4);if(d.baseline[D.zones.indexOf(zone)])return d;}throw Error('Missing fixture');};

test('the initial record is small, independent and bounded to seven zones',()=>{
 const d=fresh(),s=F.create(d),r=F.restore(plain(s),d);assert.equal(F.valid(s,d),true);assert.deepEqual(plain(r),plain(s));
 r.pre[0]=2;assert.equal(s.pre[0],-1);assert.equal(d.baseline[0],0);assert.ok(JSON.stringify(s).length<240);
 assert.throws(()=>F.create({...d,day:0}),/Invalid walkaround damage/);
});
test('each visible condition has a whole sentence without saving translated text',()=>{
 assert.equal(F.descriptions.length,4);for(const t of F.descriptions)assert.match(t,/^[A-Z].+\.$/);
 const d=fresh(),s=F.create(d);assert.equal(F.inspect(s,d,'pretrip','front').description,F.descriptions[0]);
 assert.ok(!JSON.stringify(s).includes('visible'));
});
test('all seven existing zones can be inspected and recorded without blaming the trainee',()=>{
 for(const zone of F.zones){const d=existing(zone),s=F.create(d);record(s,d,'pretrip',zone);
  const reports=F.depart(s,d);assert.deepEqual(plain(reports),[{type:'inspect.damage',key:zone,ok:true}]);
  assert.equal(F.finish(s,d).length,0);assert.equal(d.added.some(Boolean),false);
 }
});
test('missing existing wear is assessed at departure and not before',()=>{
 const d=existing('roof'),s=F.create(d);assert.equal(s.departed,false);assert.equal(s.preSeen,0);
 const reports=F.depart(s,d);assert.deepEqual(plain(reports),[{type:'inspect.damage',key:'roof',ok:false}]);
 assert.equal(F.depart(s,d).length,0);assert.equal(F.inspect(s,d,'pretrip','roof'),null);
});
test('clear areas create no extra inspection points or player damage reports',()=>{
 const d=fresh(),s=F.create(d);for(const zone of F.zones)record(s,d,'pretrip',zone);
 assert.equal(F.depart(s,d).length,0);for(const zone of F.zones)record(s,d,'posttrip',zone);
 assert.equal(F.finish(s,d).length,0);
});
test('records require an inspection in the matching phase and invalid inputs do not mutate state',()=>{
 const d=fresh(),s=F.create(d),before=JSON.stringify(s);
 for(const [phase,zone,level] of [['pretrip','front',1],['posttrip','front',0],['pretrip','engine',1],['pretrip','front',4],['pretrip','front',NaN],['other','front',0]])assert.equal(F.record(s,d,phase,zone,level),null);
 assert.equal(F.inspect(s,d,'posttrip','front'),null);assert.equal(F.finish(s,d).length,0);assert.equal(JSON.stringify(s),before);
});
test('all seven caused zones report their visible condition exactly once',()=>{
 const d=fresh(),s=F.create(d);F.depart(s,d);for(const [i,zone] of F.zones.entries()){hit(d,zone,1+i%3);record(s,d,'posttrip',zone);}
 const events=F.finish(s,d);assert.equal(events.length,7);assert.ok(events.every(e=>e.type==='trip.damage-report'&&e.ok));
 assert.deepEqual(plain(events.map(e=>e.key)),plain(F.zones));assert.equal(F.finish(s,d).length,0);
 assert.equal(F.record(s,d,'posttrip','front',1),null);assert.equal(F.inspect(s,d,'posttrip','front'),null);
});
test('every unreported caused zone is assessed at finish with the approved critical type',()=>{
 const d=fresh(),s=F.create(d);F.depart(s,d);hit(d,'front');hit(d,'mirror',2);
 const events=F.finish(s,d);assert.deepEqual(plain(events),[{type:'trip.damage-report',key:'front',ok:false},{type:'trip.damage-report',key:'mirror',ok:false}]);
 assert.equal(c.OTR_DATA.workdayEvents['trip.damage-report'].critical,true);
});
test('a real condition can be corrected before closing the trip without an invented penalty',()=>{
 const d=fresh(),s=F.create(d);F.depart(s,d);hit(d,'left',2);F.inspect(s,d,'posttrip','left');
 assert.deepEqual(plain(F.record(s,d,'posttrip','left',1)),{correct:false,event:null});record(s,d,'posttrip','left');
 assert.equal(F.finish(s,d)[0].ok,true);
});
test('a fabricated damage report is penalized once and survives correction and restore',()=>{
 const d=fresh(),s=F.create(d);F.depart(s,d);F.inspect(s,d,'posttrip','right');
 const first=F.record(s,d,'posttrip','right',2);assert.deepEqual(plain(first.event),{type:'trip.damage-false',key:'right',ok:false});
 const r=F.restore(plain(s),d);assert.ok(r);assert.equal(F.record(r,d,'posttrip','right',3).event,null);
 assert.equal(F.record(r,d,'posttrip','right',0).correct,true);assert.ok(r.falseMask);assert.equal(F.finish(r,d).length,0);
});
test('naming a clear zone does not satisfy a different damaged zone',()=>{
 const d=fresh(),s=F.create(d);F.depart(s,d);hit(d,'rear',3);F.inspect(s,d,'posttrip','front');
 assert.equal(F.record(s,d,'posttrip','front',3).event.type,'trip.damage-false');
 assert.deepEqual(plain(F.finish(s,d)),[{type:'trip.damage-report',key:'rear',ok:false}]);
});
test('a new or worsened impact after inspection requires another inspection and record',()=>{
 const d=fresh(),s=F.create(d);F.depart(s,d);hit(d,'front',1);record(s,d,'posttrip','front');hit(d,'front',2);
 assert.equal(F.record(s,d,'posttrip','front',2),null);const r=F.restore(plain(s),d);assert.ok(r);assert.equal(F.finish(r,d)[0].ok,false);
 record(s,d,'posttrip','front');assert.equal(F.finish(s,d)[0].ok,true);
});
test('a pre-existing mark is separate from a later impact in that same zone',()=>{
 const d=existing('rear'),s=F.create(d);record(s,d,'pretrip','rear');assert.equal(F.depart(s,d)[0].ok,true);
 record(s,d,'posttrip','rear');hit(d,'rear',1);const r=F.restore(plain(s),d);assert.equal(F.finish(r,d)[0].ok,false);
 record(s,d,'posttrip','rear');assert.equal(F.finish(s,d)[0].ok,true);
});
test('the first three days and trainer damage-off have no new actions or reports',()=>{
 for(const d of [D.create(7,1),D.create(7,2),D.create(7,3),D.create(7,8,false)]){
  const s=F.create(d);assert.equal(F.inspect(s,d,'pretrip','front'),null);assert.equal(F.record(s,d,'pretrip','front',0),null);
  assert.equal(F.depart(s,d).length,0);assert.equal(F.inspect(s,d,'posttrip','front'),null);assert.equal(F.finish(s,d).length,0);assert.equal(F.valid(s,d),true);
 }
 const d=fresh(),s=F.create(d);record(s,d,'pretrip','front');D.setEnabled(d,false);assert.ok(F.restore(plain(s),d));
 F.depart(s,d);F.finish(s,d);D.setEnabled(d,true);assert.equal(F.finish(s,d).length,0);
});
test('corrupt, out-of-order and foreign-day checkpoints are rejected',()=>{
 const d=fresh(),s=F.create(d);
 for(const alter of [r=>r.extra=true,r=>delete r.pre,r=>r.day++,r=>r.version=2,r=>r.preSeen=128,r=>r.preSeen=.5,r=>r.pre[0]=4,r=>r.pre[0]=1,r=>r.postSeen=1,r=>r.finished=true,r=>r.falseMask=1,r=>r.pre.push(0),r=>r.post='none',r=>r.observed[0]=0]){
  const r=plain(s);alter(r);assert.equal(F.restore(r,d),null);
 }
 F.depart(s,d);F.inspect(s,d,'posttrip','front');const future=plain(s);future.observed[0]=1;assert.equal(F.restore(future,d),null);
});
test('thousands of repeat actions keep bounded state and one false-report identity per zone',()=>{
 const d=fresh(),s=F.create(d);F.depart(s,d);const events=[];
 for(let i=0;i<5000;i++){const zone=F.zones[i%7];F.inspect(s,d,'posttrip',zone);const r=F.record(s,d,'posttrip',zone,1+i%3);if(r.event)events.push(r.event);}
 assert.equal(events.length,7);assert.equal(F.valid(s,d),true);assert.ok(JSON.stringify(s).length<240);
});
test('real workday reporting preserves keys, criticals, replay and score deduplication',()=>{
 const d=existing('left'),s=F.create(d),W=c.OTR.workday;W.begin();record(s,d,'pretrip','left');const events=[...F.depart(s,d)];
 hit(d,'front',2);F.inspect(s,d,'posttrip','right');events.push(F.record(s,d,'posttrip','right',1).event,...F.finish(s,d));
 for(const {type,...detail} of events){assert.ok(c.OTR_DATA.workdayEvents[type]);W.report(type,detail);W.report(type,detail);}
 assert.equal(W.events.length,3);assert.ok(W.log.criticals().length>0);assert.ok(W.events.every(e=>e.where==null&&e.stop==null));
 const saved=plain(W.events),score=W.log.score();W.restore({events:saved});assert.deepEqual(plain(W.events),saved);assert.equal(W.log.score(),score);
 const r=F.restore(plain(s),d);assert.ok(r);assert.equal(F.depart(r,d).length,0);assert.equal(F.finish(r,d).length,0);
});
test('two hundred seeded checkpoints preserve every action and final grade without aliases',()=>{
 for(let seed=1;seed<=200;seed++){
  const d=D.create(seed,4+seed%5);let s=F.create(d);const checkpoint=()=>{const before=plain(s);s=F.restore(before,d);assert.ok(s);assert.deepEqual(plain(s),before);};
  for(const zone of F.zones){record(s,d,'pretrip',zone);checkpoint();}const pre=F.depart(s,d);checkpoint();assert.ok(pre.every(e=>e.ok));
  for(let i=0;i<7;i++)if((seed+i)%3===0){hit(d,F.zones[i],1+i%3);record(s,d,'posttrip',F.zones[i]);checkpoint();}
  const post=F.finish(s,d);checkpoint();assert.ok(post.every(e=>e.ok));assert.equal(F.finish(s,d).length,0);
 }
});
