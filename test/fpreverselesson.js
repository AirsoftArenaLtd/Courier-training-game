/* Actual motor/rear-camera rules and isolated optional-module scoring; no renderer/native-key acceptance. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function context(){
 const c={};c.window=c;vm.createContext(c);
 for(const f of ['data/workday_events.js','src/core/scorelog.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fpdriving.js','src/core/fpreverselesson.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
 c.OTR.util={clamp01:n=>Math.max(0,Math.min(1,n))};c.OTR.workday={report(){throw Error('A module wrote into the suspended workday');}};
 const O=c.OTR,K=O.fpReverseLesson,m=K.model(),run={phase:'active',model:m,log:new O.ScoreLog()};
 m.moduleReport=(type,detail)=>K.report(run,type,detail);K.attach(run);m.paused=false;
 return {c,O,K,m,run,plain:v=>JSON.parse(JSON.stringify(v))};
}
function stop(m){m.van.hand=true;for(let n=0;n<300&&Math.abs(m.van.speed)>.0001;n++)m.step({},.0125);m.step({},.0125);}
function checkPath(O,m){m.mode='walk';m.van.gear=2;m.van.hand=true;Object.assign(m.player,{x:0,z:m.van.z+4,yaw:Math.PI});const text=O.fpDriving.checkGoal(m);m.mode='cab';return text;}
function look(O,m,index=0){const s=O.fpMirrors.specs[index],dx=s.x+.45,dz=s.z+1.45;m.van.look=Math.atan2(dx,-dz);m.player.pitch=Math.atan2(2.05-s.y,Math.hypot(dx,dz));for(let n=0;n<40;n++)m.step({},.0125);assert.equal(O.fpMirrors.recent(m,index),true);}
test('the bounded car crosses outside the physical bay walls and waits for real reverse movement',()=>{
 const {K,m}=context();assert.equal(m.kind,'campaign');assert.equal(m.parkingSpot,'tight-drive');assert.equal(m.workdayRules.walkaround,'required');assert.equal(m.traffic.length,1);
 for(const wall of m.parkingWalls)assert.ok(wall.z-wall.d/2>-58+1,'car lane does not cut a wall');
 for(let n=0;n<80;n++)m.step({},.05);assert.equal(m.reverseLesson.crossing,'waiting');
 m.van.gear=-1;m.van.hand=false;for(let n=0;n<20;n++)m.step({forward:true},.0125);assert.equal(m.reverseLesson.crossing,'crossing');
 stop(m);const x=m.traffic[0].x;m.paused=true;for(let n=0;n<80;n++)m.step({forward:true},.05);assert.equal(m.traffic[0].x,x);
 m.paused=false;for(let n=0;n<300;n++)m.step({},.05);assert.equal(m.reverseLesson.crossing,'clear');assert.equal(m.traffic[0].x,8);assert.ok(m.traffic[0].x+1.8<m.bounds.x1);assert.equal(K.ready(m),false);
});
test('a real required path check and backing manoeuvre produce the unchanged workday wording locally',()=>{
 const {c,O,K,m,run}=context();assert.match(checkPath(O,m),/path is clear/);
 look(O,m);
 m.van.gear=-1;m.van.hand=false;for(let n=0;n<20;n++)m.step({forward:true},.0125);stop(m);
 for(const type of ['drive.backing-walkaround','drive.backing','drive.mirrors']){
  const item=m.reverseLesson.checks.get(type);assert.ok(item,type);assert.equal(item.good,true,type);assert.equal(item.label,c.OTR_DATA.workdayEvents[type].label);assert.equal(item.lesson,c.OTR_DATA.workdayEvents[type].lesson);
 }
 assert.equal(run.log.items.length,3);assert.equal(K.result(run).score,0,'an unfinished physical exercise cannot pass');
});
test('traffic contact from the actual motor is a local critical and cannot be repaired by later good observations',()=>{
 const {K,m,run}=context();m.van.gear=-1;m.van.hand=false;m.traffic[0].x=0;m.traffic[0].z=m.van.z+3;m.reverseLesson.crossing='clear';
 for(let n=0;n<150;n++)m.step({forward:true},.0125);
 const contact=run.log.items.find(i=>i.type==='drive.contact');assert.ok(contact);assert.equal(contact.critical,true);
 K.report(run,'drive.backing',{key:'later',ok:true});assert.equal(m.reverseLesson.checks.get('drive.backing').good,false);
 const length=run.log.items.length;for(let n=0;n<20;n++)K.report(run,'drive.contact',{key:'extra'+n});assert.equal(run.log.items.length,length);
});
test('missing required checks fail and late safe manoeuvres never dilute an earlier mistake',()=>{
 const {K,m,run}=context();K.report(run,'drive.mirrors',{key:'first',ok:true});K.report(run,'drive.mirrors',{key:'second',ok:false});K.report(run,'drive.mirrors',{key:'third',ok:true});assert.equal(m.reverseLesson.checks.get('drive.mirrors').got,0);
 const a=K.result(run,'timeout');assert.equal(a.score,0);assert.equal(a.ratios.safety,0);assert.equal(run.log.items.length,3);assert.equal(K.result(run),a);assert.equal(K.report(run,'drive.contact',{key:'late'}),false);
});
test('event floods stay bounded and cannot finish an overflowed exercise',()=>{
 const {K,m,run}=context();for(let n=0;n<200;n++)K.report(run,'drive.mirrors',{key:n,ok:true});assert.equal(m.reverseLesson.seen.size,64);assert.equal(m.reverseLesson.overflow,true);assert.equal(run.log.items.length,1);assert.equal(K.ready(m),false);assert.equal(K.result(run).ratios.safety,0);
});
test('a slow physical reverse, stop for the crossing car, renewed checks and final parking earn the source checks',()=>{
 const {O,K,m,run}=context();checkPath(O,m);look(O,m);m.van.gear=-1;m.van.hand=false;
 for(let n=0;n<500&&m.van.z<-64.4;n++)m.step({forward:m.van.speed>-.8,back:m.van.speed<=-.8},.0125);
 stop(m);assert.equal(run.log.criticals().length,0);while(m.reverseLesson.crossing!=='clear')m.step({},.05);
 checkPath(O,m);look(O,m);look(O,m,1);m.van.gear=-1;m.van.hand=false;
 for(let n=0;n<2500&&m.van.z<-53.15;n++)m.step({forward:m.van.speed>-.8,back:m.van.speed<=-.8},.0125);
 stop(m);assert.equal(K.ready(m),true);const result=K.result(run);assert.equal(result.score,600);assert.equal(result.ratios.safety,1);assert.equal(result.log.criticals().length,0);assert.equal(result.log.items.length,3);
});
test('even a very slow static-wall reverse contact is critical, below the ordinary HUD contact threshold',()=>{
 const {m,run}=context();m.solids.push({x:0,z:m.van.z+2.82,w:1,d:.1,h:1});m.van.gear=-1;m.van.hand=false;
 for(let n=0;n<250;n++)m.step({forward:m.van.speed>-.25,back:m.van.speed<=-.25},.0125);
 const contact=run.log.items.find(i=>i.type==='drive.contact');assert.ok(contact);assert.equal(contact.critical,true);assert.equal(run.log.items.filter(i=>i.type==='drive.contact').length,1);assert.equal(m.reverseLesson.checks.get('drive.backing').good,false);
});
test('a model created before session binding never emits to the suspended workday',()=>{
 const {K}=context(),m=K.model();m.paused=false;m.van.gear=-1;m.van.hand=false;
 for(let n=0;n<250;n++)m.step({forward:true},.0125);
 assert.ok(m.van.z>-65);
});
test('the existing five-mph backing limit records its exact failure without inventing a contact critical',()=>{
 const {c,O,m,run}=context();m.van.gear=-1;m.van.hand=false;m.van.speed=-5.01/2.2369362921;m.step({},.0125);stop(m);
 const item=run.log.items.find(i=>i.type==='drive.backing');assert.ok(item);assert.equal(item.good,false);assert.equal(item.label,c.OTR_DATA.workdayEvents['drive.backing'].fail);assert.equal(item.critical,false);assert.equal(run.log.items.some(i=>i.type==='drive.contact'),false);assert.equal(O.fpRear.requiresWalk(m),true);
});
test('the crossing car waits for a stopped van instead of creating an unavoidable NPC contact',()=>{
 const {m,run}=context();m.van.z=-60.5;m.reverseLesson.crossing='crossing';
 for(let n=0;n<300;n++)m.step({},.05);
 assert.equal(m.reverseLesson.crossing,'crossing');assert.ok(m.traffic[0].x<-2.8);assert.equal(run.log.items.some(i=>i.type==='drive.contact'),false);
 m.van.z=-65;for(let n=0;n<300;n++)m.step({},.05);assert.equal(m.reverseLesson.crossing,'clear');
});
