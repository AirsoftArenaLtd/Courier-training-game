/* Ten-second memory clips: real report definitions, timing, interpolation, isolation and bounded storage. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);
for(const p of ['data/workday_events.js','src/core/scorelog.js','src/core/workday.js','src/core/fpreplay.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+p,'utf8'),c);
const R=c.OTR.fpReplay,W=c.OTR.workday,plain=o=>JSON.parse(JSON.stringify(o));
function fixture(){
 W.begin();let snapshots=0;
 const m={kind:'campaign',seed:7,routePlan:{day:4},elapsed:0,paused:false,mode:'cab',phase:'route',activeStop:0,signal:0,
 van:{x:0,z:0,yaw:0,look:0,speed:2,steer:0,gear:1,headlights:false,wipers:false,belt:true,hand:false},motion:{pitch:0,roll:0,heave:0},
 player:{x:0,z:0,yaw:0,pitch:0},traffic:[{x:2,z:0,yaw:0,speed:3},{x:-2,z:-40,yaw:Math.PI,speed:3}],crossing:{x:4,z:-20,clock:0,state:'waiting'},trafficControl:{cyclist:{x:3,z:0,yaw:0,state:'waiting'}}};
 m.snapshot=()=>{snapshots++;return plain({...m,snapshot:undefined});};
 const camera={position:{x:0,y:2,z:-1},rotation:{x:0,y:0,z:0},fov:68},r=new R.Recorder(),identity='day-4';r.bind(m,W.events,identity);
 const frame=(t,hidden=false)=>{m.elapsed=t;m.van.z=-2*t;camera.position.z=m.van.z-1;r.frame(m,camera,W.events,identity,hidden);};
 const mistake=(type='drive.lights',key='leg-0',ok=false)=>W.report(type,{key,ok,stop:1,where:{x:m.van.x,z:m.van.z,mph:5}});
 return {m,camera,r,frame,mistake,identity,snapshots:()=>snapshots,finish:()=>r.finish({id:identity,day:4})};
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,a+' != '+b);
test('a long drive retains exactly the ten seconds before the mistake in fixed buffers',()=>{
 const x=fixture(),bytes=x.r.bytes;for(let i=0;i<=6000;i++)x.frame(i/60);x.mistake();x.frame(100);const clip=x.finish();assert.ok(clip);near(clip.start,90);near(clip.end,100);assert.ok(clip.count<=R.CAPACITY+1);assert.equal(x.r.bytes,bytes);assert.ok(bytes<250000);assert.equal(x.snapshots(),1);
 const model=JSON.parse(clip.context),cam=plain(x.camera);near(R.sample(clip,90,model,cam),90);near(model.van.z,-180);near(cam.position.z,-181);R.sample(clip,95.125,model,cam);near(model.van.z,-190.25);R.sample(clip,150,model,cam);near(model.van.z,-200);
});
test('a short recording admits its actual duration and can show a mistake before its first timed sample',()=>{
 const x=fixture();x.m.paused=true;x.mistake();x.frame(0);const clip=x.finish();assert.equal(clip.count,1);assert.equal(clip.start,clip.end);const m=JSON.parse(clip.context),cam=plain(x.camera);R.sample(clip,999,m,cam);assert.equal(m.van.z,0);assert.equal(cam.position.z,-1);
});
test('correct checks, bonuses, unknown types and old restored reports do not invent a clip',()=>{
 const x=fixture();x.mistake('drive.lights','good',true);W.report('load.missort-caught',{key:'bonus'});W.events.push({type:'unknown.replay-test',ok:false});x.r.frame(x.m,x.camera,W.events,x.identity);assert.equal(x.snapshots(),0);assert.equal(x.finish(),null);
 const y=fixture();y.mistake();y.r.bind(y.m,W.events,y.identity);y.frame(1);assert.equal(y.finish(),null);
});
test('newest genuine wrong check or penalty wins; success afterwards does not replace it',()=>{
 const x=fixture();x.frame(0);x.frame(.1);x.mistake('drive.lights');x.mistake('drive.contact','car');x.mistake('drive.lights','right',true);x.frame(.2);const clip=x.finish();assert.equal(clip.mistake.type,'drive.contact');assert.equal(x.snapshots(),1);assert.ok(clip.mistake.label);assert.ok(clip.mistake.lesson);
});
test('a paused decision can freeze its endpoint without filling the ring with duplicate times',()=>{
 const x=fixture();for(let i=0;i<50;i++)x.frame(i*.1);const count=x.r.count;x.m.paused=true;for(let i=0;i<1000;i++)x.frame(4.9);assert.equal(x.r.count,count);x.mistake();x.frame(4.9);const clip=x.finish();assert.equal(clip.end,4.9);assert.equal(clip.count,count);assert.equal(new Set(Array.from({length:clip.count},(_,i)=>clip.frames[i*R.STRIDE])).size,clip.count);
});
test('continued clean driving cannot overwrite the frozen last mistake',()=>{
 const x=fixture();for(let i=0;i<100;i++)x.frame(i*.1);x.mistake();x.frame(10);const end=x.r.latest.end,context=x.r.latest.context;for(let i=101;i<300;i++)x.frame(i*.1);const clip=x.finish();assert.equal(clip.end,end);assert.equal(clip.context,context);const m=JSON.parse(clip.context);R.sample(clip,clip.end,m,plain(x.camera));near(m.van.z,-20);
});
test('the off-cadence mistake endpoint does not shorten future ten-second history',()=>{
 const x=fixture();for(let i=0;i<=1000;i++){x.frame(i*.01);if(i%7===0){x.mistake('drive.lights','n'+i);x.frame(i*.01);}}x.mistake('drive.lights','last');x.frame(10);const clip=x.finish();near(clip.start,0);near(clip.end,10);assert.ok(clip.count<=R.CAPACITY+1);
});
test('hiding, a long simulation gap, a rewind and a teleport never interpolate invented travel',()=>{
 for(const change of ['hidden','gap','rewind','teleport']){const x=fixture();for(let i=0;i<50;i++)x.frame(i*.1);let t=5;if(change==='hidden'){x.frame(5,true);t=5.1;}if(change==='gap')t=20;if(change==='rewind')t=1;if(change==='teleport')x.m.van.x=100;x.mistake();x.frame(t);const clip=x.finish();assert.equal(clip.start,t,change);assert.equal(clip.end,t,change);}
});
test('a new mission or score stream cannot attach an earlier recording to new reports',()=>{
 const x=fixture();x.frame(0);x.mistake();x.frame(.1);const m={...x.m};x.r.frame(m,x.camera,W.events,'different-day');assert.equal(x.r.latest,null);assert.equal(x.r.finish({id:'different-day',day:4}),null);
 const y=fixture();y.frame(0);y.mistake();y.r.frame(y.m,y.camera,W.events.slice(),y.identity);assert.equal(y.r.latest,null);
});
test('record identity and day must match and completed recorders stop accepting new reports',()=>{
 for(const rec of [{id:'other',day:4},{id:'day-4',day:5},{day:4},null]){const x=fixture();x.frame(0);x.mistake();x.frame(.1);assert.equal(x.r.finish(rec),null);}
 const x=fixture();x.frame(0);x.mistake();x.frame(.1);const clip=x.finish();assert.equal(R.matches(clip,{id:'day-4',day:4}),true);assert.equal(R.matches(clip,{id:'older',day:4}),false);x.mistake('drive.contact','later');x.frame(.2);assert.equal(x.r.latest.end,.1);
});
test('replaying a captured turn takes the short angle path and switches discrete controls at the recorded instant',()=>{
 const x=fixture();x.m.van.yaw=x.camera.rotation.y=Math.PI-.1;x.frame(0);x.m.van.yaw=x.camera.rotation.y=-Math.PI+.1;x.m.van.gear=-1;x.m.van.headlights=true;x.m.trafficControl.cyclist.state='beside';x.mistake();x.frame(.1);const clip=x.finish(),m=JSON.parse(clip.context),camera=plain(x.camera);R.sample(clip,.05,m,camera);near(Math.abs(m.van.yaw),Math.PI);near(Math.abs(camera.rotation.y),Math.PI);assert.equal(m.van.gear,1);assert.equal(m.van.headlights,false);assert.equal(m.trafficControl.cyclist.state,'waiting');R.sample(clip,.1,m,camera);assert.equal(m.van.gear,-1);assert.equal(m.van.headlights,true);assert.equal(m.trafficControl.cyclist.state,'beside');assert.equal(m.paused,true);
});
test('the rendered traffic and crossing follow their recorded poses without running live AI',()=>{
 const x=fixture();x.frame(0);x.m.traffic[0].x=4;x.m.crossing.x=6;x.m.crossing.state='crossing';x.m.trafficControl.cyclist.x=5;x.mistake();x.frame(.1);const clip=x.finish(),m=JSON.parse(clip.context);m.step=()=>assert.fail('live simulation must not run');R.sample(clip,.05,m,plain(x.camera));near(m.traffic[0].x,3);near(m.crossing.x,5);near(m.trafficControl.cyclist.x,4);assert.equal(m.crossing.state,'waiting');
});
test('recording and playback preserve the live score, mission and save data byte for byte',()=>{
 const x=fixture();x.frame(0);x.mistake();const beforeEvents=JSON.stringify(W.events),beforeMission=JSON.stringify(x.m),score=W.log.score();x.r.frame(x.m,x.camera,W.events,x.identity);const clip=x.finish();assert.equal(JSON.stringify(x.m),beforeMission);const model=JSON.parse(clip.context);for(let i=0;i<100;i++)R.sample(clip,i,model,plain(x.camera));assert.equal(JSON.stringify(W.events),beforeEvents);assert.equal(W.log.score(),score);assert.equal(JSON.stringify(x.m),beforeMission);
});
test('a newer unrecordable mistake cannot present the earlier mistake as the latest one',()=>{
 const x=fixture();x.frame(0);x.mistake();x.frame(.1);const end=x.r.latest.end;x.camera.position.x=NaN;x.mistake('drive.contact','invalid');x.frame(.2);assert.equal(x.r.latest,null);assert.equal(x.r.count,0);
});
test('an oversized context fails closed without retaining an older clip under a newer mistake',()=>{
 const x=fixture();x.frame(0);x.mistake();x.frame(.1);x.m.snapshot=()=>({oversized:'x'.repeat(R.MAX_CONTEXT)});x.mistake('drive.contact','large');x.frame(.2);assert.equal(x.finish(),null);
});

test('a failed optional snapshot cannot interrupt the live workday or retain a stale replay',()=>{
 const x=fixture();x.frame(0);x.m.snapshot=()=>{throw Error('snapshot fixture failure');};x.mistake();assert.doesNotThrow(()=>x.frame(.1));assert.equal(x.finish(),null);
});
test('an invalid seek returns to the recorded start without non-finite camera or van positions',()=>{
 const x=fixture();x.frame(0);x.mistake();x.frame(.1);const clip=x.finish(),m=JSON.parse(clip.context),camera=plain(x.camera);R.sample(clip,NaN,m,camera);assert.equal(m.elapsed,clip.start);assert.ok(Number.isFinite(m.van.z));assert.ok(Number.isFinite(camera.position.z));
});

test('reduced motion keeps replay paused, supports manual stepping and pauses immediately when enabled',()=>{
 const x=fixture();for(let i=0;i<=20;i++)x.frame(i*.1);x.mistake();x.frame(2);const clip=x.finish(),p=new R.Player(clip,true);assert.equal(p.play(),false);for(let i=0;i<100;i++)p.advance(.1);assert.equal(p.time,clip.start);near(p.step(.5),clip.start+.5);p.motion(false);assert.equal(p.paused,true);assert.equal(p.play(),true);near(p.advance(.05),clip.start+.55);p.motion(true);assert.equal(p.paused,true);near(p.advance(.1),clip.start+.55);
});
test('a hidden tab pauses playback and a late frame cannot jump across the recorded mistake',()=>{
 const x=fixture();for(let i=0;i<=20;i++)x.frame(i*.1);x.mistake();x.frame(2);const clip=x.finish(),p=new R.Player(clip);assert.equal(p.paused,true);p.play();near(p.advance(10),clip.start+.1);const time=p.time;p.advance(.1,true);assert.equal(p.time,time);assert.equal(p.paused,true);p.advance(.1,false);assert.equal(p.time,time);
});
test('replay ends paused, can be replayed again, and seek never escapes its actual interval',()=>{
 const x=fixture();x.frame(0);x.mistake();x.frame(.1);const clip=x.finish(),p=new R.Player(clip);p.play();p.advance(.1);assert.equal(p.time,clip.end);assert.equal(p.paused,true);assert.equal(p.play(),true);assert.equal(p.time,clip.start);assert.equal(p.seek(100),clip.end);assert.equal(p.paused,true);assert.equal(p.step(-100),clip.start);assert.equal(p.seek(NaN),clip.start);
});
test('a single recorded frame offers a still image without starting artificial motion',()=>{
 const x=fixture();x.m.paused=true;x.mistake();x.frame(0);const p=new R.Player(x.finish());assert.equal(p.play(),false);p.step(.5);p.advance(10);assert.equal(p.time,0);assert.equal(p.paused,true);
});

test('the finished record day stays distinct from the route difficulty day',()=>{
 const x=fixture();x.m.routePlan.day=17;x.r.bind(x.m,W.events,x.identity,2);x.frame(0);x.mistake();x.frame(.1);const clip=x.r.finish({id:x.identity,day:2});assert.ok(clip);assert.equal(clip.day,2);assert.equal(clip.routeDay,17);assert.equal(R.matches(clip,{id:x.identity,day:2}),true);
});
