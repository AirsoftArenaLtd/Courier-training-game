/* Physical sign/bay, real scenario dispatch and isolated completion; no native acceptance claim. */
const test=require('node:test'),assert=require('node:assert/strict'),{c,O,fixture}=require('./tools/fp-problem-route-context')();
test('both qualities use mounted closure lettering and the real destination without a floating closure notice',()=>{
 for(const high of [false,true]){const scene=fixture({high});try{
  const {art,model:m}=scene,works=art.signs.entries.filter(e=>e.sign.kind==='roadworks');assert.equal(works.length,2);assert.ok(art.signLettering);assert.equal(art.labels.some(l=>l.text==='This street is closed.'),false);assert.equal(m.trainingArea,null);assert.equal(m.stops[0].park.x,m.roadProblem.bay.x);
  for(const e of works){assert.deepEqual(Array.from(e.words.lengths),[4,6]);assert.equal(O.fpSigns.text(e.sign),'The street is closed. Follow another cross street.');}
  const roots=art.route.children.length;for(let n=0;n<200;n++)scene.sync();assert.equal(art.route.children.length,roots,'steady frames never add scenery');
 }finally{scene.art.dispose();}}
});
test('the finish key and mounted device share a physical completion gate; unrelated workday targets are consumed',()=>{
 const scene=fixture(),run=scene.scenarioSession,d=run.definition;try{
  assert.equal(d.key(run,scene,'KeyF'),true);assert.match(scene.panel.body,/whole van/);assert.equal(run.phase,'active');assert.equal(d.key(run,scene,'KeyR'),false);scene.closePanel();
  assert.equal(d.interact(run,scene,'dispatch'),true);assert.equal(d.interact(run,scene,'visit0'),true);assert.equal(d.interact(run,scene,'cab-handbrake'),false);assert.equal(d.interact(run,scene,'mirror-left'),false);
  d.handheld(run,scene);assert.equal(scene.handheld.page.options[0].label,'Finish the diversion.');scene.handheld.page.options[0].onPick();assert.match(scene.panel.body,/sat nav/);assert.equal(run.phase,'active');
 }finally{scene.art.dispose();}
});
test('all controls remain reachable with remapped keys and a short page at a time',()=>{
 const scene=fixture(),run=scene.scenarioSession;try{
  O.fpAccess.key=k=>({KeyP:'O',KeyE:'U',KeyF:'T'}[k]||k);run.definition.controls(run,scene);assert.match(scene.panel.body,/O.*U/);
  for(let n=0;n<3;n++){assert.equal(scene.panel.choices.length,2);assert.ok(scene.panel.body.length<440);scene.panel.choices[0].action();}
  scene.panel.back();assert.equal(scene.panel,null);
 }finally{scene.art.dispose();}
});
test('the actual scenario shell keeps contact criticals and unfinished ratios local, freezing later reports',()=>{
 const scene=fixture(),run=scene.scenarioSession;try{
  O.workday.begin();O.workday.report('brief.read',{key:'saved'});const before=JSON.stringify(O.workday.events);O.fpMission.emit(scene.model,'drive.contact',{key:'barrier'});assert.equal(run.log.criticals().length,1);
  const r=run.definition.result(run,'timeout');assert.equal(r.score,0);assert.equal(r.ratios.safety,0);assert.equal(r.ratios.efficiency,0);assert.equal(r.log.criticals().length,1);assert.equal(JSON.stringify(O.workday.events),before);assert.equal(run.definition.result(run,'timeout'),r);
 }finally{scene.art.dispose();}
});
test('the real vehicle motor can follow every detour gate and park the whole body without a contact',()=>{
 const scene=fixture(),m=scene.model,r=m.roadProblem.state.route,g=m.roadProblem.goal;try{
  Object.assign(m.van,{hand:false,belt:true,gear:1});let parked=false;
  for(let n=0;n<5000;n++){
   const v=m.van,p=r.points[r.next]||g,last=r.next>=5,dx=(last?g:p).x-v.x,dz=(last?g:p).z-v.z,want=last?Math.atan(dx*.55):Math.atan2(dx,-dz),diff=Math.atan2(Math.sin(want-v.yaw),Math.cos(want-v.yaw)),stop=last&&v.z<g.z-.5;
   m.step({forward:!stop&&v.speed<1.5,back:stop||v.speed>1.8,left:diff<-.025,right:diff>.025},.05);assert.equal(m.motion.contact,false);
   if(stop&&v.speed<.1){v.hand=true;parked=true;break;}
  }
  assert.ok(parked);assert.equal(O.fpProblemRoute.ready(m),true);const result=scene.scenarioSession.definition.result(scene.scenarioSession,'complete');assert.equal(result.score,400);assert.equal(result.ratios.safety,1);assert.equal(result.ratios.efficiency,1);assert.equal(result.log.criticals().length,0);
 }finally{scene.art.dispose();}
});
