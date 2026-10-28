/* Actual shared world/sign batches and picks. CPU geometry fixtures are separate from native gameplay. */
const test=require('node:test'),assert=require('node:assert/strict'),{O,fixture}=require('./tools/fp-problem-blocked-context')();
test('both quality worlds mount the notice and card lettering, hide floating addresses, and keep exact rays',()=>{
 for(const high of [false,true]){const s=fixture({world:true,high}),m=s.model,b=m.blockedProblem;try{
  const a=s.art;assert.ok(a.blockedProblem);assert.equal(a.labels.some(l=>l.address),false);assert.ok(a.signLettering);
  for(const [kind,words] of [['blocked-access',[6,6]],['attempt-card',[8,4]]]){const sign=a.signs.entries.find(e=>e.sign.kind===kind);assert.ok(sign);assert.deepEqual(Array.from(sign.words.lengths),words);assert.ok(O.fpSigns.text(sign.sign));}
  m.mode='walk';for(const [id,p,to] of [['blocked-card',{x:b.card.x-1.4,z:b.card.z},{x:b.card.x,y:b.card.y,z:b.card.z}],['blocked-warning',{x:b.warning.x-1.2,z:b.warning.z},{x:b.warning.x,y:2.3,z:b.warning.z}]]){
   assert.equal(m.blocked(p.x,p.z),false);Object.assign(m.player,p,{yaw:Math.atan2(to.x-p.x,p.z-to.z),pitch:Math.atan2(1.65-to.y,Math.hypot(to.x-p.x,to.z-p.z))});s.sync();assert.equal(a.pick(),id);
  }
  const count=a.route.children.length,entry=a.blockedProblem.paperEntry;assert.equal(entry.visible,false);b.state.sequence.card=true;for(let n=0;n<200;n++)s.sync();assert.equal(a.blockedProblem.paperEntry,entry);assert.equal(entry.visible,true);assert.equal(a.route.children.length,count);
 }finally{s.art.dispose();}}
});
