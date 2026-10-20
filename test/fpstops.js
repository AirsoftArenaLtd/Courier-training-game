/* Richer delivery choices, including unsafe order, recovery and mid-stop resumes. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);
for(const f of ['data/workday_events.js','src/core/fpstops.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const S=c.OTR.fpStops;
c.OTR.workday={report(){throw Error('The protocol must not report or score before the scene completes the delivery.');}};
const specs={
 intercom:{kind:'intercom',parcel:'P-1',button:'4B',available:true},
 reception:{kind:'reception',parcel:'P-2',recipient:'Ravi Shah',receptionist:'Mina Patel',signature:false},
 locker:{kind:'locker',parcel:'P-3',compartment:'12'},
 reattempt:{kind:'reattempt',parcel:'P-4',day:3,nextDay:4,slot:'afternoon',reason:'absent'}
};
const fixture=kind=>{const a={...specs[kind]},s=S.create(a);return {a,s,act:(action,value,t=0)=>S.act(s,a,action,value,t)};};
const roundtrip=(s,a,t=0)=>S.restore(JSON.parse(JSON.stringify(s)),a,t);
const done=(s,ok=true)=>{const a=S.assessment(s);assert.equal(a.complete,true);assert.equal(a.ok,ok);assert.equal(c.OTR_DATA.workdayEvents[a.type].kind,'check');};

test('the right intercom request waits for the buzz without a reaction deadline',()=>{
 const {s,a,act}=fixture('intercom');assert.equal(act('call',{button:'4B',purpose:'delivery'},10),true);
 assert.equal(S.ready(s,a,11.99),false);assert.equal(S.ready(s,a,12),true);
 assert.equal(act('open',null,1200),true);done(s);
});
test('a wrong button, wrong wording or premature opening cannot gain a clean check after retry',()=>{
 for(const wrong of ['button','wording','early']){
  const {s,act}=fixture('intercom');
  if(wrong==='early')assert.equal(act('open',null,0),false);
  else assert.equal(act('call',{button:wrong==='button'?'4A':'4B',purpose:wrong==='wording'?'sales':'delivery'},0),false);
  assert.equal(s.opened,false);assert.equal(act('call',{button:'4B',purpose:'delivery'},1),true);
  assert.equal(act('open',null,3),true);done(s,false);
 }
});
test('an unanswered intercom never opens a gate or fabricates a buzz',()=>{
 const {s,a,act}=fixture('intercom');a.available=false;act('call',{button:'4B',purpose:'delivery'},4);
 assert.equal(S.ready(s,a,100000),false);assert.equal(s.opened,false);assert.equal(S.assessment(s).complete,false);
 assert.ok(roundtrip(s,a,100000));
});
test('a mid-buzz checkpoint keeps the remaining wait and restoring it sends no report',()=>{
 const {s,a,act}=fixture('intercom');act('call',{button:'4B',purpose:'delivery'},10);
 const r=roundtrip(s,a,11);assert.ok(r);assert.equal(S.ready(r,a,11.5),false);assert.equal(S.ready(r,a,12),true);
 assert.equal(S.act(r,a,'open',null,12),true);done(r);
});
test('business reception needs the actual name and signature; the named recipient is a separate route',()=>{
 const f=fixture('reception');assert.equal(f.act('identify',{role:'reception',name:'Mina Patel'}),true);
 assert.equal(f.act('sign','Mina Patel'),true);assert.equal(f.act('handover'),true);done(f.s);
 const g=fixture('reception');g.act('identify',{role:'recipient',name:'Ravi Shah'});g.act('handover');done(g.s);
});
test('a signature service also requires a signature when the named recipient receives it',()=>{
 const {s,a,act}=fixture('reception');a.signature=true;act('identify',{role:'recipient',name:'Ravi Shah'});
 assert.equal(act('handover'),false);assert.equal(s.handed,false);act('sign','Ravi Shah');act('handover');done(s,false);
});
test('an unnamed receptionist or a signature from another person cannot complete reception',()=>{
 const {s,act}=fixture('reception');assert.equal(act('identify',{role:'reception',name:'Occupant'}),false);
 assert.equal(act('handover'),false);assert.equal(s.handed,false);
 act('identify',{role:'reception',name:'Mina Patel'});assert.equal(act('sign','Ravi Shah'),false);assert.equal(s.signed,false);
 act('sign','Mina Patel');act('handover');done(s,false);
});
test('switching from a receptionist to the recipient clears the first signature',()=>{
 const {s,a,act}=fixture('reception');a.signature=true;act('identify',{role:'reception',name:'Mina Patel'});act('sign','Mina Patel');
 act('identify',{role:'recipient',name:'Ravi Shah'});assert.equal(s.signed,false);
 const r=roundtrip(s,a);assert.ok(r);S.act(r,a,'sign','Ravi Shah',0);S.act(r,a,'handover',null,0);done(r);
});
test('a locker drop needs the matching compartment, parcel scan, deposit and closed-door photo',()=>{
 const {s,act}=fixture('locker');for(const [action,value] of [['open','12'],['scan','P-3'],['deposit'],['close'],['photo']])assert.equal(act(action,value),true,action);
 done(s);assert.ok(roundtrip(s,specs.locker));
});
test('wrong locker and wrong parcel scans do not move a parcel; an open-door photo cannot complete it',()=>{
 const {s,act}=fixture('locker');assert.equal(act('open','11'),false);assert.equal(s.open,false);
 act('open','12');assert.equal(act('scan','P-4'),false);assert.equal(s.scanned,false);assert.equal(act('deposit'),false);assert.equal(s.deposited,false);
 act('scan','P-3');act('deposit');assert.equal(act('photo'),false);assert.equal(S.assessment(s).complete,false);
 act('close');act('photo');done(s,false);
});
test('reopening a photographed locker invalidates its photo, including after a reload',()=>{
 const {s,a,act}=fixture('locker');act('open','12');act('scan','P-3');act('deposit');act('close');act('photo');done(s);
 const r=roundtrip(s,a);S.act(r,a,'open','12',0);assert.equal(S.assessment(r).complete,false);
 S.act(r,a,'close',null,0);S.act(r,a,'photo',null,0);done(r);
});
test('closing an empty locker is allowed without claiming a delivery or penalising a cancellation',()=>{
 const {s,act}=fixture('locker');act('open','12');assert.equal(act('close'),true);
 assert.equal(s.open,false);assert.equal(s.failed,false);assert.equal(S.assessment(s).complete,false);
 act('open','12');act('scan','P-3');act('deposit');act('close');act('photo');done(s);
});
test('a failed delivery books the specified next attempt only after a card and retention',()=>{
 for(const order of [['card','retain'],['retain','card']]){
  const {s,act}=fixture('reattempt');order.forEach(action=>act(action,action==='retain'?'absent':undefined));assert.equal(act('book',{day:4,slot:'afternoon'}),true);done(s);
 }
});
test('skipping retention, booking the wrong day or slot cannot earn the reattempt check',()=>{
 for(const variant of ['retention','day','slot']){
  const {s,act}=fixture('reattempt');act('card');if(variant!=='retention')act('retain','absent');
  assert.equal(act('book',{day:variant==='day'?3:4,slot:variant==='slot'?'morning':'afternoon'}),false);
  assert.equal(s.booked,false);act('retain','absent');act('book',{day:4,slot:'afternoon'});done(s,false);
 }
});
test('retention records the actual reason rather than accepting an unrelated exception',()=>{
 const {s,act}=fixture('reattempt');act('card');assert.equal(act('retain','address'),false);assert.equal(s.retained,false);
 act('retain','absent');act('book',{day:4,slot:'afternoon'});done(s,false);
});
test('partial locker and reattempt progress survives JSON checkpoints without side effects',()=>{
 for(const kind of ['locker','reattempt']){
  const {s,a,act}=fixture(kind);if(kind==='locker'){act('open','12');act('scan','P-3');}else act('card');
  const r=roundtrip(s,a);assert.equal(JSON.stringify(r),JSON.stringify(s));assert.equal(S.assessment(r).complete,false);
  assert.ok(JSON.stringify(r).length<250);
 }
});
test('malformed, mismatched and impossible checkpoints are rejected rather than granting progress',()=>{
 for(const kind of Object.keys(specs)){
  const {s,a}=fixture(kind);
  for(const patch of [{version:2},{kind:'unknown'},{parcel:'different'},{failed:1},{unexpected:true}])assert.equal(roundtrip({...s,...patch},a,20),null);
 }
 const i=fixture('intercom');for(const patch of [{callValid:true},{calledAt:21},{calledAt:10},{opened:true}])assert.equal(roundtrip({...i.s,...patch},i.a,20),null);
 const r=fixture('reception');for(const patch of [{signed:true},{handed:true},{role:'anyone'}])assert.equal(roundtrip({...r.s,...patch},r.a),null);
 const l=fixture('locker');for(const patch of [{deposited:true},{photo:true},{scanned:1}])assert.equal(roundtrip({...l.s,...patch},l.a),null);
 const b=fixture('reattempt');assert.equal(roundtrip({...b.s,booked:true},b.a),null);
});
test('bounded specifications, unknown actions and invalid clocks cannot silently complete a stop',()=>{
 for(const spec of [{...specs.intercom,button:''},{...specs.reception,recipient:'x'.repeat(81)},{...specs.locker,parcel:' P-3'},
  {...specs.reattempt,nextDay:3},{...specs.reattempt,nextDay:12},{...specs.reattempt,slot:'anytime'}])assert.throws(()=>S.create(spec),/Invalid richer-stop specification/);
 const {s,act}=fixture('intercom');for(const t of [NaN,Infinity,-1,1e10])assert.equal(act('call',{button:'4B',purpose:'delivery'},t),false);
 assert.equal(act('unknown'),false);assert.equal(s.failed,false);assert.equal(S.assessment(s).complete,false);
});
