const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fpgamepadcapture.js','utf8'),c);
const pad=(id='test')=>({id,connected:true,mapping:'standard',axes:Array(8).fill(0),buttons:Array.from({length:32},()=>({value:0,pressed:false}))});
const create=(group='buttons',slot=0)=>{const p=pad(),pads=Array(4).fill(null);pads[slot]=p;const capture=c.OTR.fpGamepadCapture.create(group,slot,()=>pads);return {p,pads,capture};};
test('entry held inputs cannot bind; an unassigned button binds only on complete release',()=>{
 const {p,capture:g}=create();p.buttons[0].value=1;assert.equal(g.poll().stage,'neutral');p.buttons[0].value=0;assert.equal(g.poll().stage,'input');p.buttons[27].value=.8;assert.equal(g.poll().stage,'release');assert.equal(g.poll().value,-1);p.buttons[27].value=0;assert.equal(g.poll().value,27);assert.equal(g.result.stage,'complete');
});
test('axis capture accepts either sign with high intent threshold and whole-controller neutral gate',()=>{
 const {p,capture:g}=create('axes');g.poll();p.axes[6]=-.6;assert.equal(g.poll().stage,'input');p.axes[6]=-.8;assert.equal(g.poll().stage,'release');p.axes[6]=0;p.buttons[20].value=.5;assert.equal(g.poll().stage,'release');p.buttons[20].value=0;assert.equal(g.poll().value,6);
});
test('ambiguous or changed controls require a new neutral gesture',()=>{
 const {p,capture:g}=create();g.poll();p.buttons[2].value=p.buttons[3].value=1;assert.equal(g.poll().stage,'neutral');p.buttons[2].value=p.buttons[3].value=0;g.poll();p.buttons[2].value=1;g.poll();p.buttons[2].value=0;p.buttons[3].value=1;assert.equal(g.poll().stage,'neutral');p.buttons[3].value=0;g.poll();p.buttons[3].value=1;g.poll();p.buttons[3].value=0;assert.equal(g.poll().value,3);
});
test('disconnect, same-id slot replacement and identity replacement cannot finish an old gesture',()=>{
 const {p,pads,capture:g}=create('buttons',1);g.poll();p.buttons[31].value=1;g.poll();pads[1]=null;pads[0]=pad();assert.equal(g.poll().stage,'input');assert.equal(g.result.value,-1);pads[0].buttons[9].value=1;g.poll();pads[0]=pad('new');g.poll();assert.equal(g.result.value,-1);pads[0]=null;assert.equal(g.poll().connected,false);
});
test('focus loss clears a candidate and missing/throwing APIs stay cancelable',()=>{
 const {p,capture:g}=create();g.poll();p.buttons[7].value=1;g.poll();g.poll(false);p.buttons[7].value=0;assert.equal(g.poll().stage,'input');assert.equal(g.result.value,-1);const throwing=c.OTR.fpGamepadCapture.create('buttons',0,()=>{throw Error('unavailable');});assert.equal(throwing.poll().connected,false);throwing.dispose();
});
test('only four slots, eight axes and 32 buttons are inspected and one result object is reused',()=>{
 const {p,pads,capture:g}=create();const result=g.result;for(let n=0;n<10000;n++)assert.equal(g.poll(),result);p.buttons[32]={value:1};p.axes[8]=1;assert.equal(g.poll().stage,'input');pads[4]=pad();pads[0]=null;assert.equal(g.poll().connected,false);
});
test('disposal stops polling hardware and cannot deliver a completed binding',()=>{
 const p=pad();let reads=0;const g=c.OTR.fpGamepadCapture.create('buttons',0,()=>{reads++;return [p];});g.poll();p.buttons[2].value=1;g.poll();g.dispose();const at=reads;for(let n=0;n<10;n++)g.poll();assert.equal(reads,at);assert.equal(g.result.value,-1);assert.equal(g.result.connected,false);
});
