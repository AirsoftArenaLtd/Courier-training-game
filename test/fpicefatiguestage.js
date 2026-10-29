/* Actual mission motor, weather events, world rays and menu guards. CPU parking poses are explicit fixtures. */
const test=require('node:test'),assert=require('node:assert/strict'),{O,fixture}=require('./tools/fp-ice-fatigue-context')(),K=O.fpIceFatigue,A=O.fpIceFatigueStage,U=O.fpIceFatigueUI;
const input=o=>({forward:0,back:0,left:0,right:0,careful:false,...o});
function parked(scene){const m=scene.model,a=m.iceFatigue;Object.assign(m.van,{x:a.park.x,z:a.park.z,yaw:a.kind==='ice'?0:Math.PI,speed:0,gear:2,hand:true});m.step(input(),.05);}
test('both optional models retain the real road/cab and restore their own starts after scenario-shell setup',()=>{
 for(const kind of ['ice','fatigue']){const s=fixture(kind),m=s.model,a=m.iceFatigue;assert.equal(m.trainingArea,null);assert.equal(m.mode,'cab');assert.equal(m.van.z,a.start.z);assert.equal(m.van.gear,2);assert.equal(m.traffic.length,0);assert.equal(m.parcels.length,0);assert.equal(m.driving.bus.state,'done');assert.equal(A.attach(s.scenarioSession),false);assert.equal(A.ready(m),false);}
});
test('the actual motor reaches both curbside bays at five input rates without a pose or clock shortcut',()=>{
 const decide=require('./tools/fp-wellness-road-input');
 for(const kind of ['ice','fatigue'])for(const hz of [20,30,60,120,144]){
  const scene=fixture(kind),m=scene.model,a=m.iceFatigue;O.fpCab.act(m,'cab-belt');O.fpCab.act(m,'cab-drive');O.fpCab.act(m,'cab-handbrake');let parked=false;
  for(let n=0;n<hz*160;n++){
   const next=decide({van:m.van,park:a.park,kind});if(next.done){O.fpCab.act(m,'cab-handbrake');O.fpCab.act(m,'cab-park');for(let k=0;k<20;k++)m.step(input(),1/hz);parked=true;break;}
   m.step(input({forward:+next.keys.includes('KeyW'),back:+next.keys.includes('KeyS'),left:+next.keys.includes('KeyA'),right:+next.keys.includes('KeyD')}),1/hz);
   if(kind==='fatigue'&&a.state.prompted&&!scene.scenarioSession.fatigueWarned){U.tick(scene.scenarioSession,scene);scene.panel.choices[0].action();}
  }
  assert.equal(parked,true,kind+' '+hz);assert.equal(K.safePark(m,a.park),true,JSON.stringify({kind,hz,van:m.van}));assert.equal(m.events['contact:0'],undefined);assert.ok(Math.abs(m.elapsed-a.state.time)<1e-7);
  if(kind==='ice')assert.equal(a.state.weather,true);else assert.ok(a.state.parkedAt-a.state.promptAt<=60);
 }
});
test('a parked relocation cannot invent an ice-weather observation; a real safe motor drive does supply it',()=>{
 const noDrive=fixture('ice');parked(noDrive);assert.equal(noDrive.model.iceFatigue.state.weather,null);assert.equal(noDrive.model.iceFatigue.arrived,false);
 const s=fixture('ice'),m=s.model,a=m.iceFatigue;Object.assign(m.van,{gear:1,hand:false,belt:true});
 for(let n=0;n<1200&&m.routeDay.distance<18;n++){const mph=Math.abs(m.van.speed)*2.2369362921;m.step(input({forward:mph<5?1:0,back:mph>6?1:0}),.025);}
 assert.ok(m.routeDay.distance>=18);assert.equal(a.state.weather,null);assert.equal(m.routeDay.weather,'ice');assert.equal(m.traction,.35);
 parked(s);assert.equal(a.arrived,true);assert.equal(a.state.weather,true);assert.equal(m.routeDay.distance,0);assert.equal(A.ready(m),false,'the actual approach is still unfinished');
});
test('unsafe real driving reaches the catalogue weather sink once and cannot be repaired by later parking',()=>{
 const s=fixture('ice'),m=s.model,a=m.iceFatigue;Object.assign(m.van,{gear:1,hand:false,belt:true});for(let n=0;n<800&&a.state.weather!==false;n++)m.step(input({forward:1}),.025);
 assert.equal(a.state.weather,false);parked(s);assert.equal(a.state.weather,false);const result=A.result(s.scenarioSession,'timeout');assert.equal(result.score,0);assert.equal(result.log.items[0].type,'drive.weather');assert.equal(result.log.items[0].critical,false);
});
test('the visible handrail is solid, has an actual ray target, and its mounted notice is readable from the public path',()=>{
 for(const high of [false,true]){const s=fixture('ice',{world:true,high}),m=s.model;try{
  const a=s.art.wellnessRoad;assert.ok(a);assert.equal(a.targets.length,2);assert.equal(a.words.mesh.count,a.words.entries.length);assert.ok(a.words.count>0&&a.words.count<=256);assert.equal(m.blocked(7.7,-39.65),true);assert.equal(m.blocked(m.iceFatigue.notice.x,m.iceFatigue.notice.z),true);
  Object.assign(m.player,{x:6.2,z:-37.1,yaw:0,pitch:.05});m.mode='walk';s.sync();assert.equal(s.art.pick(),'wellness-road-notice');
  Object.assign(m.player,{x:6.3,z:-40.25,yaw:Math.atan2(1.4,-.6),pitch:Math.atan2(.67,Math.hypot(1.4,.6))});s.sync();assert.equal(s.art.pick(),'wellness-handrail');s.target='wellness-handrail';assert.equal(U.interact(s.scenarioSession,s,s.target),true);assert.equal(m.iceFatigue.state.holdingRail,true);s.closePanel();
  Object.assign(m.player,{x:7.7,z:-40.25,yaw:Math.PI,pitch:0});for(let n=0;n<40;n++)m.step(input({forward:1,careful:true}),.05);assert.ok(m.player.z<=-39.94,'the actual 0.24 m foot capsule stays outside the rail');
 }finally{s.art.dispose();}}
});
test('physical and panel guards reject remote/stale rail actions and repeated completion',()=>{
 const s=fixture('ice'),m=s.model;U.interact(s.scenarioSession,s,'wellness-handrail');assert.equal(m.iceFatigue.state.holdingRail,false);assert.match(s.panel.body,/Move close/);const close=s.panel.choices[0].action;s.closePanel();s.showPanel('Other','Other',[]);close();assert.equal(s.panel.title,'Other');
 s.scenarioSession.phase='finished';assert.equal(A.report(s.scenarioSession,'drive.weather',{ok:true}),false);
});
test('the complete vehicle footprint stays on the public road and ice completion still requires its legal parking',()=>{
 const scene=fixture('ice'),m=scene.model,a=m.iceFatigue;assert.equal(m.driveAllowed({x:4.1,z:-34,yaw:0}),true);assert.equal(m.driveAllowed({x:5,z:-34,yaw:0}),false);assert.equal(m.driveAllowed({x:4.1,z:-34,yaw:Math.PI/2}),false);
 Object.assign(m.van,{x:4.1,z:-34,yaw:Math.PI/2,gear:1,hand:false,belt:true});for(let n=0;n<100;n++)m.step(input({forward:1}),.025);assert.ok(m.van.x<5.5,'the real motor cannot drive onto the pedestrian approach');
 parked(scene);O.fpIceFatigue.weather(a.state,'drive.weather',{ok:true});m.mode='walk';Object.assign(m.player,{x:5.8,z:-41.35,yaw:Math.PI/2});a.state.oldX=m.player.x;a.state.oldZ=m.player.z;
 for(let n=0;n<80&&!K.iceReady(a.state,m);n++)m.step(input({forward:1,careful:true}),.05);assert.equal(A.ready(m),true);m.van.x=0;assert.equal(A.ready(m),false);const result=A.result(scene.scenarioSession,'complete');assert.equal(result.score,0);assert.equal(result.stats.completed,false);
});
test('fatigue warnings and actual rest time pause with the mission and never add time to it',()=>{
 const s=fixture('fatigue'),m=s.model,a=m.iceFatigue;parked(s);const step=seconds=>{for(let left=seconds;left>1e-8;left-=.05)m.step(input(),Math.min(.05,left));};step(30);assert.equal(a.state.prompted,true);const t=m.elapsed;U.tick(s.scenarioSession,s);assert.equal(m.paused,true);step(40);assert.equal(m.elapsed,t);const close=s.panel.choices[0].action;close();assert.equal(m.paused,false);
 assert.equal(K.startBreak(a.state,m),true);step(29.95);assert.equal(a.state.breakComplete,false);step(.05);assert.equal(K.endBreak(a.state,m),true);assert.equal(A.ready(m),true);assert.ok(Math.abs(m.elapsed-a.state.time)<1e-7);assert.ok(m.elapsed<61);const result=A.result(s.scenarioSession,'complete');assert.equal(result.ratios.safety,1);assert.equal(result.ratios.efficiency,1);const frozen=m.elapsed;m.step(input({forward:1}),.05);assert.equal(m.elapsed,frozen);
});
