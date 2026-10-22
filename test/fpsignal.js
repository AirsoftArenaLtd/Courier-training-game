/* Real physical indicator, maneuver, report and checkpoint integration; no score calculation here. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/workday_events.js','src/core/theme.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcab.js','src/core/fpsignal.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpdriving.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,S=O.fpSignal,D=O.fpDriving,W=O.workday;
function make(kind='campaign'){const m=O.fpMission.create(kind,7);D.configure(m);m.phase='route';m.departed=true;m.mode='cab';m.paused=false;m.van.belt=true;return m;}
function advance(m,t){m.elapsed+=t;D.tick(m,.01);}
const signals=()=>W.events.filter(e=>e.type==='drive.signal');
const use=(m,side)=>O.fpCab.act(m,'cab-signal-'+(side===-1?'left':'right'));
test.beforeEach(()=>W.begin());
test('a physical left signal needs the whole three-second lead before a pull-out',()=>{
 for(const lead of [0,2.999,3,3.001]){W.begin();const m=make();use(m,-1);advance(m,lead);m.van.hand=false;m.van.speed=1;D.tick(m,.01);assert.equal(signals().length,1);assert.equal(signals()[0].ok,lead>=3);assert.equal(signals()[0].key,'0:1');assert.equal(signals()[0].stop,1);}
});
test('no signal or the wrong direction fails, with a real place only on the wrong report',()=>{
 for(const side of [0,1,-1]){W.begin();const m=make();if(side)use(m,side);advance(m,3);m.van.hand=false;m.van.speed=1;D.tick(m,.01);const e=signals()[0];assert.equal(e.ok,side===-1);assert.equal(!!e.where,side!==-1);if(e.where){assert.equal(e.where.x,m.van.x);assert.equal(e.where.z,m.van.z);}}
});
test('canceling or changing the indicator restarts its lead time, with no allocated clock per tick',()=>{
 const m=make();use(m,-1);advance(m,3);const clock=m.driving.signalClock;use(m,-1);advance(m,1);use(m,-1);advance(m,2.99);assert.equal(S.ready(m,-1),false);advance(m,.01);assert.equal(S.ready(m,-1),true);use(m,1);assert.equal(S.ready(m,1),false);advance(m,3);assert.equal(S.ready(m,1),true);assert.equal(m.driving.signalClock,clock);
});
test('direct legacy state changes are observed on the next game tick without backdating evidence',()=>{
 const m=make();D.tick(m,.01);m.signal=-1;advance(m,20);assert.equal(S.ready(m,-1),false);advance(m,3);assert.equal(S.ready(m,-1),true);
});
test('turns capture the matching three-second signal before steering, never a late correction',()=>{
 for(const side of [-1,1])for(const late of [false,true]){W.begin();const m=make();m.driving.mirrorDone=true;m.van.hand=false;m.van.speed=2;if(!late){use(m,side);advance(m,3);}m.van.steer=side*.2;D.tick(m,.01);if(late){use(m,side);advance(m,3);}m.van.yaw=side*.08;D.tick(m,.01);assert.equal(signals().length,1);assert.equal(signals()[0].ok,!late);D.tick(m,.01);assert.equal(signals().length,1);}
});
test('lane changes trigger at lateral movement, and an abandoned steering twitch is not a maneuver',()=>{
 const m=make();m.driving.mirrorDone=true;m.van.hand=false;m.van.speed=2;use(m,-1);advance(m,3);m.van.steer=-.1;D.tick(m,.01);m.van.x-=.59;D.tick(m,.01);assert.equal(signals().length,0);m.van.steer=0;D.tick(m,.01);m.van.steer=-.1;D.tick(m,.01);m.van.x-=.61;D.tick(m,.01);assert.equal(signals().length,1);assert.equal(signals()[0].ok,true);
});
test('a held pull-out is reported once, and a new stopped maneuver receives another short key',()=>{
 const m=make();use(m,-1);advance(m,3);m.van.hand=false;m.van.speed=1;for(let n=0;n<20;n++)D.tick(m,.01);assert.deepEqual(Array.from(signals(),e=>e.key),['0:1']);m.van.speed=0;m.van.hand=true;D.tick(m,.01);m.van.hand=false;m.van.speed=1;D.tick(m,.01);assert.deepEqual(Array.from(signals(),e=>e.key),['0:1','0:2']);
});
test('a checkpoint preserves partial signal time and captured turn evidence without replaying reports',()=>{
 let m=make();use(m,-1);advance(m,2);m=O.fpMission.restore(m.snapshot());assert.ok(m);m.paused=false;advance(m,1);assert.equal(S.ready(m,-1),true);m.driving.mirrorDone=true;m.van.hand=false;m.van.speed=2;m.van.steer=-.1;D.tick(m,.01);m=O.fpMission.restore(m.snapshot());assert.ok(m);m.paused=false;m.van.yaw-=.08;D.tick(m,.01);assert.equal(signals().length,1);assert.equal(signals()[0].ok,true);m=O.fpMission.restore(m.snapshot());assert.ok(m);m.paused=false;D.tick(m,.01);assert.equal(signals().length,1);
});
test('an old checkpoint resumes a current turn without a retrospective signal check',()=>{
 let m=make();m.driving.mirrorDone=true;m.van.hand=false;m.van.speed=2;m.van.steer=-.1;D.tick(m,.01);const raw=m.snapshot();delete raw.driving.signalClock;delete raw.driving.signalTurn;m=O.fpMission.restore(raw);assert.ok(m);m.paused=false;m.van.yaw-=.08;D.tick(m,.01);assert.equal(signals().length,0);
});
test('invalid clocks and captured turn states are rejected by the real mission restore',()=>{
 const m=make();use(m,-1);advance(m,3);
 for(const clock of [[-1,4,0],[-1,-1,0],[-1,NaN,0],[2,0,0],[-1,0,-1],[-1,0,1.5],[-1,0,0,9]]){const raw=m.snapshot();raw.driving.signalClock=clock;assert.equal(O.fpMission.restore(raw),null);}
 for(const turn of [[2,0,true],[-1,4,true],[-1,0,1],[-1,0,true,0]]){const raw=m.snapshot();raw.driving.signalTurn=turn;assert.equal(O.fpMission.restore(raw),null);}
});
test('parking practice keeps its local feedback but never adds a course signal report',()=>{
 const m=make('parking');use(m,-1);advance(m,3);m.van.hand=false;m.van.speed=1;D.tick(m,.01);assert.equal(signals().length,0);assert.ok(m.logs.some(l=>l.id==='driver:drive.signal:0:1'));
});
