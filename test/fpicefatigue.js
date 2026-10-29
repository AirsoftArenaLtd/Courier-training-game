/* Real walking motor and fixed-time local policy boundaries; no rendered/native acceptance. */
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(){
 const c={};c.window=c;vm.createContext(c);
 for(const f of ['data/workday_events.js','src/core/firstperson.js','src/core/scorelog.js','src/core/fpicefatigue.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
 const O=c.OTR,K=O.fpIceFatigue;O.util={clamp01:n=>Math.max(0,Math.min(1,n))};O.workday={report(){throw Error('Wrote into a saved workday');}};
 const m=O.fp.create();m.solids=[];m.paused=false;Object.assign(m.player,{x:5,z:5,yaw:0});Object.assign(m.van,{x:0,z:0,gear:2,hand:true,speed:0});
 return {O,K,m,events:c.OTR_DATA.workdayEvents,log:new O.ScoreLog('wellness')};
}
const iceSpec={start:{x:6,z:4.5,w:4,d:2},goal:{x:6,z:-2.5,w:4,d:1.5},ice:{x:6,z:1,w:5,d:6},grit:{x:5,z:1,w:1,d:6},rail:{x:7,z:1,w:1,d:8}};
function walkIce(c,{careful=true,hz=60,rail=false}={}){
 const {K,m,s}=c;if(rail)assert.equal(K.rail(s,m,true),true);
 for(let n=0;n<2000&&!K.iceReady(s,m);n++){
  m.step({forward:1,back:0,left:0,right:0,careful},1/hz);K.observeIce(s,m,1/hz);
 }
 assert.equal(K.iceReady(s,m),true);return K.iceResult(s,m);
}
function advance(c,seconds,hz=60){
 let left=seconds;while(left>1e-8){const dt=Math.min(.05,1/hz,left);c.K.observeFatigue(c.s,c.m,dt);left-=dt;}
}
function fatigue(){const c=fixture();c.s=c.K.fatigue(c.log,{promptAt:30,breakSeconds:30,park:{x:0,z:0,w:8,d:8}});return c;}
test('careful actual walking across the gritted route passes at four input rates with the catalogue weather check',()=>{
 for(const hz of [30,60,120,144]){
  const c=fixture();c.s=c.K.ice(c.log,c.m,iceSpec);c.K.weather(c.s,'drive.weather',{ok:true});const result=walkIce(c,{hz});
  assert.equal(result.ratios.safety,1);assert.equal(result.score,600);assert.equal(c.log.criticals().length,0);assert.equal(c.s.slipped,false);
  assert.equal(c.log.items[0].label,c.events['drive.weather'].label);assert.equal(c.log.items[0].lesson,c.events['drive.weather'].lesson);assert.equal(c.log.items[0].type,'drive.weather');
  assert.equal(c.K.iceResult(c.s,c.m),result);assert.equal(c.log.items.length,3);
 }
});
test('fast motor movement onto ice fails immediately, remains failed after careful recovery, and is not critical',()=>{
 const c=fixture();c.m.player.x=7;c.s=c.K.ice(c.log,c.m,iceSpec);c.K.weather(c.s,'drive.weather',{ok:true});
 while(!c.s.slipped){c.m.step({forward:1,back:0,left:0,right:0,careful:false},.05);c.K.observeIce(c.s,c.m,.05);}
 const slip=c.s.slipAt;assert.ok(slip>0);const result=walkIce(c);assert.ok(result.ratios.safety<1);assert.equal(c.s.slipAt,slip);assert.equal(c.log.criticals().length,0);
});
test('normal motor pace on the gritted strip does not count as running on bare ice',()=>{
 const c=fixture();c.s=c.K.ice(c.log,c.m,iceSpec);c.K.weather(c.s,'drive.weather',{ok:true});const result=walkIce(c,{careful:false});assert.equal(c.s.slipped,false);assert.equal(result.ratios.safety,1);
});
test('a physical handrail can replace the gritted route, but a remote request or merely standing still cannot',()=>{
 const c=fixture();c.m.player.x=7;c.s=c.K.ice(c.log,c.m,iceSpec);c.K.weather(c.s,'drive.weather',{ok:true});const result=walkIce(c,{rail:true});assert.equal(result.ratios.safety,1);assert.equal(c.s.gritDistance,0);assert.ok(c.s.railDistance>=1);
 const d=fixture();d.s=d.K.ice(d.log,d.m,iceSpec);assert.equal(d.K.rail(d.s,d.m,true),false);for(let n=0;n<300;n++)d.K.observeIce(d.s,d.m,.05);assert.equal(d.K.iceReady(d.s,d.m),false);assert.equal(d.s.distance,0);
});
test('unsafe weather cannot be diluted by later reports, and unfinished ice traversal scores zero',()=>{
 const c=fixture();c.s=c.K.ice(c.log,c.m,iceSpec);assert.equal(c.K.weather(c.s,'drive.contact',{ok:true}),false);c.K.weather(c.s,'drive.weather',{ok:false});c.K.weather(c.s,'drive.weather',{ok:true});assert.equal(c.s.weather,false);
 const result=c.K.iceResult(c.s,c.m,'timeout');assert.equal(result.score,0);assert.equal(result.ratios.safety,0);assert.equal(c.K.weather(c.s,'drive.weather',{ok:true}),false);
});
test('the fatigue prompt uses fixed active scenario time and pauses stop both warning and break clocks',()=>{
 const c=fatigue();advance(c,29.95);assert.equal(c.s.prompted,false);c.m.paused=true;advance(c,200);assert.equal(c.s.prompted,false);c.m.paused=false;advance(c,.05);assert.equal(c.s.prompted,true);assert.ok(Math.abs(c.s.parkedAt-30)<1e-7);
 assert.equal(c.K.startBreak(c.s,c.m),true);advance(c,10);c.m.paused=true;advance(c,100);assert.ok(Math.abs(c.s.restSeconds-10)<1e-7);c.m.paused=false;advance(c,20);assert.equal(c.K.endBreak(c.s,c.m),true);const result=c.K.fatigueResult(c.s,c.m);assert.equal(result.ratios.safety,1);assert.equal(result.ratios.efficiency,1);
});
test('safe parking requires the whole turned van, P, the parking brake and a stopped motor',()=>{
 const c=fatigue(),{K,m,s}=c;assert.equal(K.safePark(m,s.park),true);
 for(const change of [{x:3},{speed:.02},{gear:1},{hand:false},{yaw:Math.PI/4,x:1.5},{x:NaN}]){
  const old={...m.van};Object.assign(m.van,change);assert.equal(K.safePark(m,s.park),false);Object.assign(m.van,old);
 }
 advance(c,30);m.van.x=3;assert.equal(K.startBreak(s,m),false);assert.equal(s.breakComplete,false);
});
test('parking at the sixty-second boundary passes and parking after it fails without a critical',()=>{
 for(const delay of [60,60.05]){
  const c=fatigue();c.m.van.x=20;advance(c,30+delay-.05);c.m.van.x=0;advance(c,.05);assert.equal(c.K.startBreak(c.s,c.m),true);advance(c,30);assert.equal(c.K.endBreak(c.s,c.m),true);const result=c.K.fatigueResult(c.s,c.m);assert.equal(result.ratios.safety,delay===60?1:0);assert.equal(c.log.criticals().length,0);if(delay>60)assert.equal(c.log.items[0].severity,'major');
 }
});
test('still driving after 120 seconds is a sticky major failure even after a completed break',()=>{
 const c=fatigue();c.m.van.x=20;c.m.van.speed=2;advance(c,150);assert.equal(c.s.lateDriving,true);Object.assign(c.m.van,{x:0,speed:0});advance(c,.05);c.K.startBreak(c.s,c.m);advance(c,30);c.K.endBreak(c.s,c.m);const result=c.K.fatigueResult(c.s,c.m);assert.equal(result.ratios.safety,0);assert.equal(c.log.items[0].severity,'major');assert.equal(c.log.items[0].critical,false);
});
test('break duration includes both boundaries; a short, interrupted or overlong break cannot be repaired for full credit',()=>{
 for(const duration of [29.95,30,60,60.05]){
  const c=fatigue();advance(c,30);c.K.startBreak(c.s,c.m);advance(c,duration);const ended=c.K.endBreak(c.s,c.m);assert.equal(ended,duration>=30);
  if(!ended){assert.equal(c.K.fatigueReady(c.s,c.m),false);c.K.startBreak(c.s,c.m);advance(c,30);c.K.endBreak(c.s,c.m);}
  const result=c.K.fatigueResult(c.s,c.m);assert.equal(result.ratios.efficiency,duration>=30&&duration<=60?1:0);assert.equal(c.log.criticals().length,0);assert.equal(c.K.fatigueResult(c.s,c.m),result);assert.equal(c.log.items.length,2);
 }
 const c=fatigue();advance(c,30);c.K.startBreak(c.s,c.m);advance(c,5);c.m.van.hand=false;advance(c,.05);assert.equal(c.s.resting,false);assert.equal(c.s.efficiencyFailed,true);
});
test('invalid time and inactive observations cannot advance or finish a fatigue attempt',()=>{
 const c=fatigue();for(const dt of [NaN,Infinity,-1,0])assert.equal(c.K.observeFatigue(c.s,c.m,dt),false);c.K.observeFatigue(c.s,c.m,.05,false);assert.equal(c.s.time,0);assert.equal(c.K.startBreak(c.s,c.m),false);const result=c.K.fatigueResult(c.s,c.m,'timeout');assert.equal(result.score,0);assert.equal(result.ratios.safety,0);assert.equal(result.ratios.efficiency,0);
});
