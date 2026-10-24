/* Resource fixtures must retain the authored arrival before showing the person at either address. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/modules.js','data/m4_dialogues.js','data/m4_recover.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js','src/core/fpcustomertalk.js','src/core/fpproblemstage.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,K=O.fpCustomerTalk,S=O.fpProblemStage;
test('recovery and recipient captures show the original person at the correct physical address',()=>{
 const outside={workday:{day:4},events:[{type:'brief.read'}],checkpoint:{version:1}},before=JSON.stringify(outside);
 O.fpStore={read:()=>outside.checkpoint};O.workday={events:outside.events};O.save={data:{workday:outside.workday}};O.fpScenario={begin:r=>{r.phase='active';}};
 for(const [view,id,node,person,site,number] of [['problemrecovery','m4-recover','n2','pat','house','214'],['problemrecipient','m4-address','n4','jo','other','421']]){
  const spec=c.OTR_DATA.modules.find(m=>m.id==='m4').scenarios.find(s=>s.id===id),talk=K.create(c.OTR_DATA.dialogues[spec.dataKey.split('.')[1]],spec.categories),stage=S.create(id,talk.content);
  const localLog=JSON.stringify(talk.log.toJSON()),scene={scenarioSession:{phase:'brief'},model:{customerTalk:talk,problemStage:stage,van:{},player:{}},view:{camera:{position:{x:0,y:1.7,z:0}}},closePanel(){},sync(){},refresh(){}};
  O.game={scene:{getScene:()=>scene}};vm.runInContext('('+require('./tools/fp-problem-pose').toString()+')('+JSON.stringify(view)+')',c);
  assert.equal(talk.nodeId,node);assert.equal(stage.site,site);assert.equal(stage.target.kind,'person');assert.equal(stage.actors.find(a=>a.key===person).visible,true);assert.equal(stage.addresses.find(a=>a.site===site).number,number);assert.equal(scene.model.mode,'walk');assert.equal(scene.model.paused,true);assert.equal(scene.scenarioSession.phase,'active');assert.equal(JSON.stringify(talk.log.toJSON()),localLog);
 }
 assert.equal(JSON.stringify(outside),before);
});
