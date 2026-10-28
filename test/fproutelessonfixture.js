/* A module baseline starts after the preceding scene's own asynchronous workday save and shutdown. */
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fixture=require('./tools/fp-route-lesson-fixture'),{EventEmitter}=require('node:events');
test('both a workday and a repeated module finish shutdown before a new isolation baseline is captured',async()=>{
 for(const key of ['FirstPersonScene','FirstPersonScenarioScene']){
  let saved=0,events=0,started=false;const old={sys:{settings:{key}},events:new EventEmitter(),closePanel(){},releaseMouse(){}};
  const c={OTR:{game:{scene:{getScenes:()=>[old],stop(id){assert.equal(id,key);setImmediate(()=>{saved=1;events=1;old.events.emit('shutdown');});},start(id,data){assert.equal(saved,1);assert.equal(id,'FirstPersonScenarioScene');assert.equal(data.scenarioId,'m1-route');started=true;}}},fpStore:{read:()=>({saved})},workday:{get events(){return {events};}},save:{data:{workday:{suspended:true}}},registry:{get:()=>({})},academy:{assessing:null}}};c.window=c;vm.createContext(c);
  const before=await vm.runInContext('('+fixture.toString()+')()',c);assert.equal(started,true);assert.equal(before.checkpoint,JSON.stringify({saved:1}));assert.equal(before.events,JSON.stringify({events:1}));assert.equal(before.workday,JSON.stringify({suspended:true}));
 }
});
test('an empty prior scene list can start the registered module without manufacturing a checkpoint',async()=>{
 let started=false;const c={OTR:{game:{scene:{getScenes:()=>[],stop(){throw Error('No old scene');},start(){started=true;}}},fpStore:{read:()=>null},workday:{events:[]},save:{data:{}},registry:{get:()=>({})},academy:{assessing:null}}};c.window=c;vm.createContext(c);
 const before=await vm.runInContext('('+fixture.toString()+')()',c);assert.equal(started,true);assert.equal(before.checkpoint,'null');assert.equal(before.workday,'null');
});
