/* Preserve module-isolation checks across the prototype's legitimate shutdown save. */
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fixture=require('./tools/fp-wellness-road-fixture');
function run(oldKey,writeDuringModule=false){
 const order=[],saved={checkpoint:0},events=[],workday={current:null},old={sys:{settings:{key:oldKey}},releaseMouse(){order.push('release');}},context={window:{},OTR_DATA:{},OTR:{registry:{get:()=>({})},academy:{assessing:null},fpStore:{read:()=>{order.push('read');return saved;}},workday:{events},save:{data:{workday}},game:{scene:{getScene:()=>({scenarioSession:{}}),getScenes:()=>[old],stop:key=>{order.push('stop:'+key);saved.checkpoint++;},start:()=>{order.push('start');if(writeDuringModule)saved.checkpoint++;}}}}};
 vm.runInNewContext('('+fixture.toString()+')("ice")',context);return {context,order,saved};
}
test('prototype shutdown checkpoint precedes the module isolation baseline',()=>{
 const {context:c,order,saved}=run('FirstPersonScene');assert.deepEqual(order,['release','stop:FirstPersonScene','read','start']);assert.equal(c.window.otrWellnessRoadBefore.checkpoint,JSON.stringify(saved));assert.equal(saved.checkpoint,1);
});
test('module restart retains the baseline and a module write still fails isolation',()=>{
 for(const old of ['FirstPersonScene','FirstPersonScenarioScene']){
  const {context:c,order,saved}=run(old,true);assert.notEqual(c.window.otrWellnessRoadBefore.checkpoint,JSON.stringify(saved));assert.equal(order.filter(x=>x.startsWith('stop:')).length,old==='FirstPersonScene'?1:0);assert.equal(c.window.otrWellnessRoadBefore.events,JSON.stringify(c.OTR.workday.events));assert.equal(c.window.otrWellnessRoadBefore.workday,JSON.stringify(c.OTR.save.data.workday));
 }
});
