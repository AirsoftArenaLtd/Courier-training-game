/* The brake hold uses focused real time, survives slow rendering, and cancels without leaked callbacks. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{EventEmitter}=require('node:events');
function harness(){
  let now=0,done=0,released=0;const c={document:{hidden:false},performance:{now:()=>now}};c.window=c;vm.createContext(c);
  vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fppretripui.js','utf8'),c);
  const root=new EventEmitter(),scene={events:new EventEmitter(),game:{events:new EventEmitter(),hasFocus:true},panel:{root}};
  c.OTR.fpPretripUI.brakeHold(scene,()=>done++,()=>released++);
  return {c,scene,root,at(ms){now=ms;scene.events.emit('update');},counts(){return {done,released,updates:scene.events.listenerCount('update'),blur:scene.game.events.listenerCount('blur')};}};
}
test('three focused seconds are measured independently of smoothed render deltas',()=>{
  const h=harness();h.at(2999);assert.equal(h.counts().done,0);h.at(3000);assert.deepEqual(h.counts(),{done:1,released:0,updates:0,blur:0});h.at(9000);assert.equal(h.counts().done,1);
});
test('a stalled High frame completes only after the full real hold',()=>{
  const h=harness();h.at(20);h.at(3400);assert.equal(h.counts().done,1);
});
test('releasing, leaving the panel or losing focus never performs the brake test',()=>{
  for(const reason of ['destroy','replaced','blur','hidden','focus']){
    const h=harness();h.at(1000);
    if(reason==='destroy')h.root.emit('destroy');
    if(reason==='replaced')h.scene.panel={root:new EventEmitter()};
    if(reason==='blur')h.scene.game.events.emit('blur');
    if(reason==='hidden')h.c.document.hidden=true;
    if(reason==='focus')h.scene.game.hasFocus=false;
    h.at(4000);const n=h.counts();assert.equal(n.done,0,reason);assert.equal(n.updates,0,reason);assert.equal(n.blur,0,reason);assert.equal(n.released,['blur','hidden','focus'].includes(reason)?1:0,reason);
  }
});
