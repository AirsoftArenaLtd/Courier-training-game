/* Fake-pad lifecycle and analogue input checks; this slice is not yet scene-loaded. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fpgamepad.js','utf8'),c);const G=c.OTR.fpGamepad,A=G.actions;
const pad=(id='one')=>({id,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))});
const press=(p,n,value=1)=>{p.buttons[n].value=value;p.buttons[n].pressed=value>.5;};
test('connecting with a held accelerator or action cannot move or trigger until neutral',()=>{
 const p=pad(),g=G.create(()=>[p]);press(p,7);press(p,0);assert.equal(g.poll().active,false);assert.equal(g.frame.throttle,0);assert.equal(g.frame.pressed,0);press(p,7,0);press(p,0,0);g.poll();press(p,7);press(p,0);assert.equal(g.poll().throttle,1);assert.ok(g.frame.pressed&A.interact);assert.equal(g.poll().pressed,0);press(p,0,0);assert.ok(g.poll().released&A.interact);
});
test('drift stays neutral, fractional steering/movement/look/triggers stay analogue and bounded',()=>{
 const p=pad(),g=G.create(()=>[p]);p.axes=[.1,-.1,0,0];g.poll();assert.equal(g.poll().steer,0);p.axes=[.59,-.59,.59,-.59];press(p,7,.525);press(p,6,.2875);const f=g.poll();for(const name of ['steer','moveX','moveY','lookX'])assert.ok(Math.abs(f[name]-.5)<1e-9,name);assert.ok(Math.abs(f.lookY+.5)<1e-9);assert.ok(Math.abs(f.throttle-.5)<1e-9);assert.ok(Math.abs(f.brake-.25)<1e-9);p.axes=[4,-4,NaN,Infinity];press(p,7,5);assert.equal(g.poll().steer,1);assert.equal(g.frame.moveY,1);assert.equal(g.frame.lookX,0);assert.equal(g.frame.lookY,0);assert.equal(g.frame.throttle,1);
});
test('focus loss, modal reset and reconnect each require a fresh neutral state',()=>{
 const p=pad(),g=G.create(()=>[p]);g.poll();press(p,2);assert.ok(g.poll().pressed&A.gear);assert.equal(g.poll(false).pressed,0);assert.equal(g.poll().active,false);press(p,2,0);g.poll();press(p,2);assert.ok(g.poll().pressed&A.gear);g.reset();assert.equal(g.poll().active,false);press(p,2,0);g.poll();press(p,2);assert.ok(g.poll().pressed&A.gear);p.connected=false;assert.equal(g.poll().connected,false);p.connected=true;assert.equal(g.poll().pressed,0);press(p,2,0);g.poll();press(p,2);assert.ok(g.poll().pressed&A.gear);
});
test('the selected device stays stable when another pad appears, and replacement cannot inherit its buttons',()=>{
 const one=pad(),two=pad('two'),pads=[null,one],g=G.create(()=>pads);g.poll();pads[0]=two;press(two,0);assert.equal(g.poll().device,1);assert.equal(g.frame.pressed,0);one.connected=false;assert.equal(g.poll().device,0);assert.equal(g.frame.active,false);press(two,0,0);g.poll();press(two,0);assert.ok(g.poll().pressed&A.interact);
});
test('remapped inputs use only validated indices and a remap while held cannot fire',()=>{
 const p=pad(),g=G.create(()=>[p]);g.poll();press(p,3);g.configure({axes:{steer:2,lookX:-1},buttons:{interact:3,throttle:4,brake:-1,gear:200,focus:-1},deadzone:.2});assert.equal(g.poll().active,false);press(p,3,0);g.poll();press(p,3);press(p,4,.6);press(p,6);p.axes[2]=.6;p.axes[-1]=1;p.buttons[-1]={value:1,pressed:true};const f=g.poll();assert.ok(f.pressed&A.interact);assert.equal(f.pressed&A.focus,0);assert.equal(f.pressed&A.gear,0);assert.ok(Math.abs(f.steer-.5)<1e-9);assert.ok(f.throttle>0&&f.throttle<1);assert.equal(f.brake,0);assert.equal(f.lookX,0);
});
test('nonstandard, disconnected and out-of-range devices never supply commands; unavailable API is neutral',()=>{
 const p=pad();p.mapping='';const pads=[p,null,null,null,pad('fifth')],g=G.create(()=>pads);assert.equal(g.poll().connected,false);const missing=G.create(()=>{throw Error('API unavailable');});assert.equal(missing.poll().active,false);assert.equal(missing.frame.pressed,0);p.mapping='standard';g.poll();p.axes=[NaN];p.buttons=[];const f=g.poll();assert.equal(f.steer,0);assert.equal(f.throttle,0);assert.equal(f.pressed,0);
});
test('polling reuses one frame for long sessions and disposal stops reading the browser API',()=>{
 const p=pad();let reads=0;const g=G.create(()=>{reads++;return [p];}),frame=g.frame;g.poll();for(let n=0;n<10000;n++){p.axes[0]=(n%3-1)*.75;assert.equal(g.poll(),frame);assert.ok(Number.isFinite(frame.steer));}g.dispose();const last=reads;assert.equal(g.poll(),frame);assert.equal(reads,last);assert.equal(frame.connected,false);assert.equal(frame.throttle,0);assert.equal(frame.held,0);
});
