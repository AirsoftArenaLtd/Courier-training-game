/* The static locked-access pose must construct an actual locked model despite frozen definitions. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('resource launch selects real locked/unsafe models without assigning into a frozen scenario definition',()=>{
 const {c,O}=require('./tools/fp-problem-blocked-context')();let started=null;O.game={scene:{start(key,data){started={key,data};},stop(){}}};c.module={exports:{}};
 vm.runInContext(fs.readFileSync('test/tools/fp-problem-blocked-pose.js','utf8'),c);const pose=c.module.exports;
 for(const [name,locked] of [['blockedgate',true],['blockedcab',false]]){
  assert.ok(Object.isFrozen(O.fpScenario.definitions.get('blocked-drive')));pose({name,stage:'launch'});assert.equal(started.key,'FirstPersonScenarioScene');assert.equal(started.data.scenarioId,'m4-blocked');
  const run=O.fpScenario.create(started.data.scenarioId),m=O.fpScenario.model(run),b=m.blockedProblem;assert.equal(b.state.locked,locked);assert.equal(b.state.unsafe,!locked);
  if(locked){assert.ok(m.solids.includes(b.gate));assert.equal(m.blocked(b.gate.x,b.gate.z),true);}else assert.equal(b.gate,null);
  assert.equal(b.state.exception,null);assert.equal(b.state.sequence.card,false);assert.equal(b.state.log.items.length,0);
 }
});
