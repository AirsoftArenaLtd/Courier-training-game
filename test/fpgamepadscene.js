/* Scene-local fake-pad integration, original cab/action guards and real motor checks. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={Phaser:{Scene:class{}},URLSearchParams,location:{search:''},document:{hidden:false}};c.window=c;vm.createContext(c);
for(const f of ['firstperson','fpmission','fpcab','fpaccess','fpgamepad','fpgamepadscene'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+f+'.js','utf8'),c);
const O=c.OTR;O.registerScene=C=>c.Scene=C;vm.runInContext(fs.readFileSync(__dirname+'/../src/scenes/FirstPersonScene.js','utf8'),c);
let settings={};O.fpAccess.settings=()=>settings;
const button=(p,n,value=1)=>{p.buttons[n].value=value;p.buttons[n].pressed=value>.5;};
function fixture(){
 settings={};const p={id:'fixture',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))},events=[],m=O.fpMission.create('campaign',1);m.mode='cab';m.paused=false;m.touch=()=>{};O.workday={report:(type,detail)=>events.push({type,...detail})};
 const s={model:m,held:{},area:'route',panel:null,loading:false,external:false,transitioning:false,hubMotion:O.fp.create(),actions:[],highlights:0,
  handheld:{isOpen:false,aiming:false,device:{current:{}},index:0,scan(){this.isOpen=this.aiming=true;},choose(){this.device.current={};},close(){this.isOpen=false;},home(){this.aiming=false;this.device.current={};}},
  closePanel(){this.panel=null;this.held={};},showPause(){this.panel={index:0,choices:[{},{}]};},choose(i){this.choice=i;this.closePanel();},highlight(){this.highlights++;},showScanner(){this.handheld.isOpen=true;},interact(){this.actions.push('interact');},showParcel(){},
  cabAction(id){this.actions.push(id);O.fpCab.act(this.model,id);},inputAction:c.Scene.prototype.inputAction
 };
 O.fpAccess.deviceFocus=()=>{};O.fpAccess.focus=()=>s.actions.push('focus');const g=O.fpGamepadScene.create(s,()=>[p]);g.tick();g.tick();return {s,p,g,m,events};
}
test('fractional triggers drive the actual motor and keyboard braking retains priority without held-key mutation',()=>{
 const {s,p,g,m}=fixture();m.van.hand=false;s.held={KeyW:true};const keys=s.held;button(p,7,.5);let controls=g.tick();assert.equal(controls.forward,1);assert.equal(s.held,keys);assert.deepEqual(s.held,{KeyW:true});O.fp.drive(m,controls,.05);assert.ok(m.van.speed>0);const speed=m.van.speed;s.held.KeyS=true;O.fp.drive(m,g.tick(),.05);assert.ok(m.van.speed<speed);assert.deepEqual(s.held,{KeyW:true,KeyS:true});s.held={};button(p,6,.4);assert.ok(g.tick().back>0&&g.controls.back<1);
});
test('analogue steering is fractional, keyboard steering overrides it and walking scales continuously',()=>{
 const {s,p,g,m}=fixture();p.axes[0]=.59;let controls=g.tick();O.fp.drive(m,controls,1);assert.ok(Math.abs(m.van.steer-.29)<1e-9);s.held.KeyA=true;controls=g.tick();assert.equal(controls.left,true);assert.equal(controls.right,false);
 s.held={};m.mode='walk';g.tick();p.axes[0]=0;p.axes[1]=0;g.tick();g.tick();p.axes[1]=-.59;controls=g.tick();const walking=O.fp.create();walking.paused=false;walking.player={x:5,z:-10,yaw:0,pitch:0};const z=walking.player.z;for(let n=0;n<20;n++)walking.step(controls,.05);assert.ok(Math.abs(z-walking.player.z-1.25)<1e-9);
});
test('gamepad gear edges use the actual stopped-cab guard and emit each source observation once',()=>{
 const {p,g,m,events}=fixture();m.van.gear=1;m.van.speed=2;button(p,2);g.tick();assert.equal(m.van.gear,1);assert.equal(events.filter(e=>e.type==='drive.gear'&&!e.ok).length,1);for(let n=0;n<20;n++)g.tick();assert.equal(events.length,1);button(p,2,0);g.tick();m.van.speed=0;button(p,2);g.tick();assert.equal(m.van.gear,-1);assert.equal(events.filter(e=>e.type==='drive.gear'&&e.ok).length,1);
});
test('D-pad navigation never toggles cab controls, and held throttle cannot escape a modal or focus transition',()=>{
 const {s,p,g,m}=fixture();s.showPause();g.tick();g.tick();button(p,13);g.tick();assert.equal(s.panel.index,1);assert.equal(m.van.hand,true);button(p,13,0);g.tick();button(p,7);g.tick();s.closePanel();assert.equal(g.tick().forward,false);button(p,7,0);g.tick();button(p,7);assert.equal(g.tick().forward,1);g.suspend();assert.equal(g.tick().forward,false);g.resume();assert.equal(g.tick().forward,false);button(p,7,0);g.tick();button(p,7);assert.equal(g.tick().forward,1);
});
test('handheld choice changes rearm input and aiming keeps scan hold separate from mouse and keyboard',()=>{
 const {s,p,g}=fixture();s.handheld.isOpen=true;g.tick();g.tick();button(p,0);const old=s.handheld.device.current;g.tick();assert.notEqual(s.handheld.device.current,old);assert.equal(g.scanHeld,false);button(p,0,0);g.tick();s.handheld.aiming=true;g.tick();g.tick();button(p,0);g.tick();assert.equal(g.scanHeld,true);assert.equal(s.handheld.trigger,undefined);assert.deepEqual(s.held,{});g.tick();assert.equal(g.scanHeld,true);button(p,0,0);g.tick();assert.equal(g.scanHeld,false);
});
test('keyboard look overrides the corresponding analogue axis and cab look stays within its existing limits',()=>{
 const {s,p,g,m}=fixture();p.axes[2]=1;p.axes[3]=-.59;g.tick();O.fpAccess.look(s,{},.05,g.look);assert.ok(m.van.look>0);assert.ok(m.player.pitch<0);const look=m.van.look;O.fpAccess.look(s,{ArrowLeft:true},.05,g.look);assert.ok(m.van.look<look);for(let n=0;n<200;n++)O.fpAccess.look(s,{},.05,g.look);assert.equal(m.van.look,1.5);assert.equal(m.player.pitch,-1.05);
});
test('disconnect and in-place settings changes clear stale commands and keep the keyboard path available',()=>{
 const {s,p,g}=fixture();button(p,7);assert.equal(g.tick().forward,1);p.connected=false;assert.equal(g.tick().forward,false);s.held.KeyW=true;assert.equal(g.tick().forward,true);assert.deepEqual(s.held,{KeyW:true});s.held={};p.connected=true;g.tick();button(p,7,0);g.tick();settings.gamepad={buttons:{throttle:4}};button(p,4);assert.equal(g.tick().forward,false);button(p,4,0);g.tick();button(p,4);assert.equal(g.tick().forward,1);
});
test('the live merge reuses one controls object for long sessions and does not change snapshots itself',()=>{
 const {s,p,g,m}=fixture(),controls=g.controls,before=JSON.stringify(m.snapshot()),held=s.held;p.axes[0]=.59;for(let n=0;n<10000;n++){assert.equal(g.tick(),controls);assert.equal(g.controls.forward,0);assert.ok(Math.abs(g.controls.right-.5)<1e-9);}assert.equal(s.held,held);assert.equal(JSON.stringify(m.snapshot()),before);g.dispose();assert.equal(g.controller.frame.active,false);
});
test('losing pointer lock keeps gamepad menus usable; window blur suspends until focus and shutdown releases listeners',()=>{
 const {s,p,g}=fixture();g.dispose();const windowEvents=new Map(),documentEvents=new Map(),canvasEvents=new Map(),canvas={addEventListener:(n,f)=>canvasEvents.set(n,f),removeEventListener:n=>canvasEvents.delete(n)};
 c.addEventListener=(n,f)=>windowEvents.set(n,f);c.removeEventListener=n=>windowEvents.delete(n);c.document.addEventListener=(n,f)=>documentEvents.set(n,f);c.document.removeEventListener=n=>documentEvents.delete(n);c.document.pointerLockElement=canvas;c.navigator={getGamepads:()=>[p]};const old=O.fpAccess.syncKeys;O.fpAccess.syncKeys=()=>{};let shutdown;
 try{s.sys={game:{canvas}};s.checkpoint=()=>{};s.releaseMouse=()=>{};s.events={once:(n,f)=>{if(n==='shutdown')shutdown=f;}};c.Scene.prototype.installInput.call(s);s.gamepad.tick();s.gamepad.tick();c.document.pointerLockElement=null;documentEvents.get('pointerlockchange')();assert.ok(s.panel);s.gamepad.tick();s.gamepad.tick();button(p,13);s.gamepad.tick();assert.equal(s.panel.index,1);button(p,13,0);s.gamepad.tick();windowEvents.get('blur')();assert.equal(s.gamepad.tick().forward,false);windowEvents.get('focus')();s.gamepad.tick();s.gamepad.tick();button(p,12);s.gamepad.tick();assert.equal(s.panel.index,0);shutdown();assert.equal(s.gamepad,null);assert.equal(windowEvents.size,0);assert.equal(documentEvents.size,0);assert.equal(canvasEvents.size,0);}finally{O.fpAccess.syncKeys=old;}
});
