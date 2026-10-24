/* Physical M5 rays, voluntary walking, handheld callbacks and original results across all nine stops. */
const test=require('node:test'),assert=require('node:assert/strict'),{c,O,THREE,F,K,A,fixture,aim,use,walk,talk}=require('./tools/fp-scanner-context')();
function option(scene,text){const op=scene.handheld.page.options.find(o=>o.label===text);assert.ok(op,text);op.onPick();}
function load(scene){use(scene,'cab-exit');scene.panel.choices[0].action();walk(scene,-.2,-38.3);walk(scene,1.7,-38.2);use(scene,'cargo');use(scene,'customer-stop-parcel-p1');scene.panel.choices[0].action();A.handheld(scene.scenarioSession,scene);option(scene,'Scan the carried packages.');scene.closePanel();use(scene,'cargo');}
function arrive(scene){walk(scene,6.8,-38.2);walk(scene,12,-42.9);use(scene,'customer-stop-door');scene.panel.choices[0].action();for(let n=0;n<125;n++)scene.scenarioSession.definition.tick(scene.scenarioSession,scene,.05,true);scene.sync();if(scene.model.customerStop.def.answer){use(scene,'customer-stop-person');talk(scene);}}
function tag(scene,code){A.exceptions(scene,c.OTR_DATA.handheld.exceptions.findIndex(e=>e.id===code));option(scene,`Record exception ${code}.`);const d=scene.model.customerStop;if(d.state.exDef.doorTag){scene.panel.choices[0].action();scene.closePanel();use(scene,'customer-stop-door');scene.panel.choices[0].action();assert.equal(d.state.tagAttached,true);}}
function sign(scene){const d=scene.model.customerStop;assert.equal(scene.handheld.page.widget.type,'signature');scene.handheld.page.widget.onDone();A.names(scene,K.names(d).indexOf(d.def.answer.name));scene.panel.choices[0].action();}
function returnToVan(scene){walk(scene,7.3,-42);walk(scene,3.7,-42);walk(scene,3.7,-46);walk(scene,-.2,-46);walk(scene,-.2,-43.7);use(scene,'driver');scene.panel.choices[0].action();assert.equal(scene.model.customerStop.phase,'report');scene.panel.choices.at(-1).action();}
test('all nine stops use real door/cargo/person rays and the handheld without altering the suspended workday',()=>{
 O.workday.begin();O.workday.report('brief.read',{key:'real-day'});const before=JSON.stringify(O.workday.events),results=[];
 for(const id of ['m5-pod','m5-exceptions','m5-adult']){const scene=fixture(id),run=scene.scenarioSession;try{for(let index=0;index<3;index++){
  const d=scene.model.customerStop;assert.equal(d.index,index);load(scene);arrive(scene);const exp=d.def.expected;
  if(id==='m5-adult'){A.delivery(scene);option(scene,A.labels.recipient);assert.ok(d.identity);const choice=d.identity.order.indexOf(exp.id);A.identity(scene,choice,2);scene.handheld.page.options[0].onPick();assert.equal(d.state.idResult,exp.id);if(exp.id==='ok')sign(scene);else{assert.equal(d.state.outcome,null);assert.deepEqual(Array.from(d.state.carrying),['p1']);tag(scene,'ID');}}
  else if(exp.outcome==='exception')tag(scene,exp.code);
  else if(exp.types[0]==='left'){
    walk(scene,14.8,-43.5);A.spots(scene);scene.handheld.page.options[0].onPick();assert.equal(d.state.spot,'planter');assert.deepEqual(Array.from(d.state.carrying),[]);scene.sync();let good=false;
    for(const x of [14.8,15.3,14.4])for(const z of [-44.6,-44.7]){if(good)break;walk(scene,x,z);const p=scene.art.customerStop.parcels.find(b=>b.data.id==='p1'),player=scene.model.player,camera=scene.view.camera;player.yaw=Math.atan2(12.8-player.x,-(-44.7-player.z));player.pitch=.8;scene.sync();const ph=scene.art.customerStop.photo(camera);if(ph.grade==='good')good=true;}
    assert.equal(good,true,'a real side view can show the parcel behind the planter and the doorstep');A.capturePhoto(scene);option(scene,'Use this photo for the delivery.');
  }else{A.delivery(scene,exp.types[0]==='reception'?2:0);scene.handheld.page.options[0].onPick();sign(scene);}
  returnToVan(scene);
 }
 assert.equal(run.phase,'finished');assert.equal(scene.completed.id,id);assert.equal(scene.completed.result.log.criticals().length,0);for(const ratio of Object.values(scene.completed.result.ratios))assert.equal(ratio,1);results.push({id,score:scene.completed.result.score});
 }finally{scene.art.dispose();}}
 assert.equal(JSON.stringify(O.workday.events),before);console.log(JSON.stringify({physicalGoodResults:results}));
});
test('distant delivery and stale ID actions cannot hand over or move a package',()=>{
 const scene=fixture('m5-adult');try{load(scene);A.delivery(scene);scene.handheld.page.options[0].onPick();assert.equal(scene.model.customerStop.identity,null);assert.ok(scene.panel.body.includes('Walk up'));arrive(scene);A.delivery(scene);scene.handheld.page.options[0].onPick();const d=scene.model.customerStop,pending=d.identity;A.identity(scene,pending.order.indexOf('ok'));const stale=scene.handheld.page.options[0].onPick;O.fpScannerStop.cancelIdentity(d);stale();assert.equal(d.state.outcome,null);assert.equal(d.state.idResult,null);assert.equal(d.signature,null);}finally{scene.art.dispose();}
});
test('placement requires approaching that actual location; the parcel remains placed across photo menus and retakes',()=>{
 const scene=fixture();try{load(scene);A.spots(scene);scene.handheld.page.options[0].onPick();const d=scene.model.customerStop;assert.equal(d.photoPending,false);assert.deepEqual(Array.from(d.state.carrying),['p1']);walk(scene,14.8,-43.5);A.spots(scene);scene.handheld.page.options[0].onPick();assert.equal(d.photoPending,true);A.handheld(scene.scenarioSession,scene);option(scene,'Resume framing the photo.');A.capturePhoto(scene);option(scene,'Retake the delivery photo.');assert.equal(d.photoMode,true);assert.equal(d.state.retakes,1);assert.deepEqual(Array.from(d.state.delivered),['p1']);assert.deepEqual(Array.from(d.state.carrying),[]);A.enter(scene);assert.equal(d.state.inVan,false);assert.equal(d.state.outcome,null);}finally{scene.art.dispose();}
});
