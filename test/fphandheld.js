/* Handheld/controller workflow tests. The device renderer is stubbed; no pixels are drawn. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={};context.window=context;vm.createContext(context);
for(const file of ['firstperson','fpmission','fphandheld'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+file+'.js','utf8'),context);
context.OTR.H=720;
context.OTR.Handheld=class{
  constructor(){this.keyHandlers=[];this.isOpen=false;this.root={setVisible(){}};}
  setTabVisible(){}
  open(def){this.current=def;this.isOpen=true;}
  close(){this.isOpen=false;}
};
function setup(kind='campaign'){
  const m=context.OTR.fpMission.create(kind,1),s={model:m,held:{},time:{now:100},input:{keyboard:{off(){}}},
    closePanel(){this.panel=null;this.held={};},releaseMouse(){},capture(){},sync(){},checkpoint(){},message(text){this.notice=text;}};
  let target='parcel0';s.art={scanTarget:()=>target};Object.assign(m.player,{x:-11,z:5.5});
  s.handheld=new context.OTR.fpHandheld(s);
  return {s,m,hh:s.handheld,aim:id=>{target=id;}};
}
function trigger(hh,n=10){for(let i=0;i<n;i++)hh.tick(0.05,true);}
test('handheld stays closed while moving or unsecured and does not pause the vehicle',()=>{
  const {m,hh}=setup();m.mode='cab';m.paused=false;m.van.speed=2;m.van.hand=false;hh.home();
  assert.equal(hh.isOpen,false);assert.equal(m.paused,false);
  m.van.speed=0;hh.home();assert.equal(hh.isOpen,false);assert.equal(m.logs.length,1);
  m.van.hand=true;hh.home();assert.equal(hh.isOpen,true);assert.equal(m.paused,true);
});
test('scanning needs a continuous trigger on one visible barcode and never picks up a box',()=>{
  const {m,hh,aim}=setup();hh.scan();trigger(hh,5);assert.equal(m.parcels[0].scanned,false);
  aim(null);hh.tick(0.05,true);assert.equal(hh.progress,0);
  aim('parcel0');trigger(hh,5);hh.tick(0.05,false);assert.equal(hh.progress,0);
  trigger(hh);assert.equal(m.parcels[0].scanned,true);assert.equal(m.parcels[0].location,'depot');
  assert.equal(m.lastScan,'parcel0');assert.equal(hh.aiming,false);assert.equal(m.paused,true);
});
test('switching targets resets scan time and inaccessible parcels cannot be scanned',()=>{
  const {m,hh,aim}=setup();hh.scan();trigger(hh,5);aim('parcel1');trigger(hh);
  assert.equal(m.parcels[0].scanned,false);assert.equal(m.parcels[1].scanned,false);
  m.parcels[1].location='slot0';Object.assign(m.player,{x:4,z:11.3});trigger(hh);assert.equal(m.parcels[1].scanned,false);
  m.cargoOpen=true;trigger(hh);assert.equal(m.parcels[1].scanned,true);
});
test('wrong-stop scan warns on the device without verifying a different delivery',()=>{
  const {m,hh,aim}=setup();m.phase='route';m.parcels[1].location='held';m.parcels[1].loaded=true;m.heldId='parcel1';
  aim('parcel1');hh.scan();trigger(hh);
  assert.equal(hh.device.current.title,'SCAN ALERT');assert.equal(m.parcels[1].stopScanned,false);
  assert.equal(m.logs.filter(l=>l.id==='mismatch:parcel1:0').length,1);
});
test('a scanned held parcel can be recorded on the device after contact at its address',()=>{
  const {m,hh}=setup();const p=m.parcels[0],stop=m.stop(0);
  Object.assign(p,{location:'held',loaded:true});m.heldId=p.id;m.phase='route';m.van.z=stop.z;
  Object.assign(m.player,{x:8.5,z:stop.z});
  hh.delivery(0);assert.equal(hh.device.current.title,'NOT SCANNED');
  hh.scan();trigger(hh);assert.equal(p.stopScanned,true);
  hh.delivery(0);hh.choose(1);assert.equal(stop.resolved,false,'contact is still required');
  m.contact(0);hh.delivery(0);hh.choose(1);assert.equal(stop.resolved,true);assert.equal(p.location,'delivered');
  assert.equal(hh.device.current.title,'STOP RECORDED');
});
test('scanning a retained parcel at Returns physically checks that parcel back in',()=>{
  const {m,hh}=setup();const p=m.parcels[0];Object.assign(p,{location:'held',loaded:true,returnRequired:true});m.heldId=p.id;
  Object.assign(m.player,{x:-12.8,z:5});hh.scan();trigger(hh);
  assert.equal(p.location,'returned');assert.equal(m.heldId,null);assert.equal(hh.device.current.title,'RETURN RECORDED');
  assert.equal(m.logs.filter(l=>l.id==='returned:'+p.id).length,1);
});
test('putting away or suspending the handheld cancels held input and respects pause',()=>{
  const {s,m,hh}=setup();hh.scan();hh.trigger=true;s.held.Space=true;trigger(hh,3);hh.close(false);
  assert.equal(hh.isOpen,false);assert.equal(hh.trigger,false);assert.equal(hh.progress,0);assert.equal(m.paused,true);assert.equal(Object.keys(s.held).length,0);
  hh.home();hh.close();assert.equal(m.paused,false);
});
test('cargo practice exposes scanning but disables delivery recording and route changes',()=>{
  const {m,hh}=setup('practice');hh.stop(0);hh.choose(1);hh.choose(2);
  assert.equal(m.activeStop,0);assert.equal(m.stop(0).resolved,false);assert.equal(hh.isOpen,true);
  hh.choose(0);assert.equal(hh.aiming,true);
});
