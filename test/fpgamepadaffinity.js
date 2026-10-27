/* A connected driver's controller must keep ownership when a lower-index device appears during a menu. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fpgamepad.js','utf8'),c);
const pad=id=>({id,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({value:0,pressed:false}))});
test('modal/focus/configuration resets keep the current connected device when a lower-index pad appears',()=>{
 const driver=pad('driver'),other=pad('other'),pads=[null,driver],g=c.OTR.fpGamepad.create(()=>pads);g.poll();g.poll();assert.equal(g.frame.device,1);pads[0]=other;assert.equal(g.poll().device,1);g.reset();assert.equal(g.poll().device,1,'A modal reset must retain the current connected controller');g.poll();g.configure({deadzone:.2});assert.equal(g.poll().device,1);g.poll(false);assert.equal(g.poll().device,1);driver.connected=false;assert.equal(g.poll().device,0);g.dispose();assert.equal(g.frame.connected,false);
});
