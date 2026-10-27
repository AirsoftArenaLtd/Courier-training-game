/* Lifecycle tests use the actual mission state and owned scene input handlers; browser coverage forces real GL loss. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{EventEmitter}=require('node:events');
const c={Promise,console,Phaser:{Scene:class{}},URLSearchParams,location:{search:'',reload(){}}};c.window=c;vm.createContext(c);
for(const file of ['firstperson','fpmission','fpcontext'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+file+'.js','utf8'),c);
c.OTR.registerScene=C=>c.Scene=C;vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/FirstPersonScene.js','utf8'),c);
class Target{constructor(){this.handlers=new Map();}addEventListener(n,f){if(!this.handlers.has(n))this.handlers.set(n,new Set());this.handlers.get(n).add(f);}removeEventListener(n,f){this.handlers.get(n)?.delete(f);}emit(n,e={}){for(const f of this.handlers.get(n)||[])f(e);}}
function fixture(){
 const canvas=new Target(),events=new EventEmitter(),model=c.OTR.fpMission.create('campaign',1),nodes=[];
 const focus={isConnected:true,focus(){this.focused=true;}};
 const element=tag=>({tag,style:{},setAttribute(n,v){this[n]=v;},append(...children){this.children=children;},focus(){},remove(){this.removed=true;}});
 c.document={createElement:element,activeElement:focus,hidden:false,hasFocus:()=>true,body:{append:o=>nodes.push(o)}};
 let active=true,paused=false,lost=false,checkpoints=0,pauses=0,resumes=0,restores=0,lighting=0,gamepadPauses=0,gamepadResumes=0;
 const s={sys:{game:{canvas,renderer:{gl:{isContextLost:()=>lost}}},isActive:()=>active,isPaused:()=>paused,pause(){active=false;paused=true;pauses++;},resume(){active=true;paused=false;resumes++;}},
  model,hubMotion:c.OTR.fp.create(),held:{KeyW:true},pointerStart:{x:1,y:2},handheld:{isOpen:false,trigger:true},progress:{},loading:false,external:false,transitioning:false,events,
  gamepad:{suspend(){gamepadPauses++;},resume(){gamepadResumes++;}},tweens:{getDelta(force){assert.equal(force,true);s.discardedTweenGap=true;}},checkpoint(){checkpoints++;},releaseMouse(){},showPause(){s.panel={choices:[]};model.paused=true;},view:{restore(){restores++;}},art:{lighting:{restore(){lighting++;}}}};
 s.glRecovery=c.OTR.fpContext.attach(s);
 const lose=()=>{lost=true;let prevented=false;canvas.emit('webglcontextlost',{preventDefault(){prevented=true;}});assert.equal(prevented,true);};
 const restore=async()=>{lost=false;canvas.emit('webglcontextrestored');await Promise.resolve();};
 return {s,model,canvas,nodes,focus,lose,restore,setInactive(){active=false;paused=true;},counts:()=>({checkpoints,pauses,resumes,restores,lighting,gamepadPauses,gamepadResumes})};
}
test('loss pauses once, clears held/scan input, and does not alter mission, cargo or observations',async()=>{
 const f=fixture(),before=JSON.stringify(f.model.snapshot());f.lose();f.lose();assert.equal(f.s.glRecovery.lost,true);assert.equal(JSON.stringify(f.model.snapshot()),before);assert.equal(Object.keys(f.s.held).length,0);assert.equal(f.s.pointerStart,null);assert.equal(f.s.handheld.trigger,false);assert.equal(f.counts().checkpoints,1);assert.equal(f.counts().pauses,1);assert.equal(f.nodes.length,1);assert.equal(f.nodes[0].role,'alert');await f.restore();assert.equal(f.s.glRecovery.lost,false);assert.ok(f.s.panel);assert.equal(f.counts().resumes,1);assert.equal(f.counts().restores,1);assert.equal(f.counts().lighting,1);assert.equal(f.s.discardedTweenGap,true);assert.ok(f.nodes[0].removed);assert.ok(f.focus.focused);
});
test('restoration is deferred until later renderer listeners finish and resolves waiting loaders once',async()=>{
 const f=fixture();f.s.loading=true;f.lose();let ready=false;const promise=f.s.glRecovery.ready().then(v=>ready=v);assert.equal(ready,false);const observed=[];f.canvas.addEventListener('webglcontextrestored',()=>observed.push(f.counts().restores));await f.restore();assert.deepEqual(observed,[0]);await promise;assert.equal(ready,true);assert.equal(f.counts().restores,1);assert.equal(f.s.panel,undefined);assert.equal(f.s.glRecovery.restores,1);await f.restore();assert.equal(f.s.glRecovery.restores,1);
});
test('an already paused external scene is not resumed and its panel identity and selection survive',async()=>{
 const f=fixture();f.setInactive();const panel={index:3};f.s.panel=panel;f.s.external=true;f.lose();await f.restore();assert.equal(f.s.panel,panel);assert.equal(f.s.panel.index,3);assert.equal(f.counts().resumes,0);assert.equal(f.counts().pauses,0);
});
test('handheld and transition state are preserved instead of replaced by a new pause menu',async()=>{
 for(const kind of ['handheld','transition']){const f=fixture();if(kind==='handheld')f.s.handheld.isOpen=true;else f.s.transitioning=true;const hh=f.s.handheld;f.lose();await f.restore();assert.equal(f.s.panel,undefined);assert.equal(f.s.handheld,hh);assert.equal(f.counts().resumes,1);}
});
test('shutdown while lost resolves waiting work false, removes listeners and ignores late restore',async()=>{
 const f=fixture();f.lose();const ready=f.s.glRecovery.ready();f.s.events.emit('shutdown');assert.equal(await ready,false);assert.equal(f.canvas.handlers.get('webglcontextlost').size,0);assert.equal(f.canvas.handlers.get('webglcontextrestored').size,0);await f.restore();assert.equal(f.counts().resumes,0);assert.equal(await f.s.glRecovery.ready(),false);assert.ok(f.nodes[0].removed);
});
test('a second loss before the restoration microtask never resumes a still-lost context',async()=>{
 const f=fixture();f.lose();f.canvas.emit('webglcontextrestored');await Promise.resolve();assert.equal(f.s.glRecovery.lost,true);assert.equal(f.counts().resumes,0);await f.restore();assert.equal(f.counts().resumes,1);f.lose();await f.restore();assert.equal(f.s.glRecovery.restores,2);assert.equal(f.nodes.length,2);assert.ok(f.nodes.every(n=>n.removed));
});
test('owned raw key actions reject lost-context events and repeats cannot rearm a cleared accelerator',()=>{
 const f=fixture(),s=f.s,w=new Target(),doc=new Target();c.addEventListener=w.addEventListener.bind(w);c.removeEventListener=w.removeEventListener.bind(w);Object.assign(c.document,{addEventListener:doc.addEventListener.bind(doc),removeEventListener:doc.removeEventListener.bind(doc)});c.OTR.fpAccess={syncKeys(){}};s.time={now:0};s.loading=false;s.area='route';s.capture=()=>{};c.Scene.prototype.installInput.call(s);
 const key=(code,repeat=false)=>({code,repeat,preventDefault(){}});f.lose();const gear=f.model.van.gear;w.emit('keydown',key('KeyR'));w.emit('keydown',key('KeyW'));assert.equal(f.model.van.gear,gear);assert.equal(Object.keys(s.held).length,0);s.glRecovery.lost=false;w.emit('keydown',key('KeyW',true));assert.equal(s.held.KeyW,undefined);w.emit('keydown',key('KeyW'));assert.equal(s.held.KeyW,true);w.emit('keyup',key('KeyW'));assert.equal(s.held.KeyW,undefined);s.events.emit('shutdown');assert.ok([...w.handlers.values()].every(h=>h.size===0));
});
test('a remapping prompt cannot consume or save a keyboard choice while the display is lost',()=>{
 const handlers=new Map(),ctx={};ctx.window=ctx;ctx.addEventListener=(n,f)=>handlers.set(n,f);ctx.removeEventListener=n=>handlers.delete(n);vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fpaccess.js','utf8'),ctx);
 let writes=0,prevented=0;const settings={keys:{}};ctx.OTR.a11y={settings:()=>settings,physical:k=>k,label:k=>k,ACTIONS:[],save(){writes++;}};
 const scene={glRecovery:{lost:true},events:{once(){}},showPanel(){}};ctx.OTR.fpAccess.rebind(scene,'KeyW','Move forward',0);
 handlers.get('keydown')({code:'KeyX',preventDefault(){prevented++;},stopImmediatePropagation(){}});
 assert.equal(writes,0);assert.deepEqual(settings.keys,{});assert.equal(prevented,0);assert.equal(ctx.OTR.a11y.capturing,true);
 scene.glRecovery.lost=false;handlers.get('keydown')({code:'Escape',preventDefault(){},stopImmediatePropagation(){}});assert.equal(ctx.OTR.a11y.capturing,false);assert.equal(handlers.size,0);
});
