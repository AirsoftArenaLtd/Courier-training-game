/* Unloaded component: actual mission parcel/parking/proximity gates. Native/physical UI follows. */
const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict'),{c,O}=require('./tools/fp-problem-route-context')();
vm.runInContext(fs.readFileSync(__dirname+'/../src/core/fpproblemblocked.js','utf8'),c);const B=O.fpProblemBlocked;
function fixture(options){const m=B.model(options),run={model:m};B.attach(run);m.paused=false;return {m,run,b:m.blockedProblem};}
function card(m){m.mode='walk';const p=m.blockedProblem.card;Object.assign(m.player,{x:p.x-1.4,z:p.z});assert.equal(m.blocked(m.player.x,m.player.z),false);assert.equal(B.retry(m,'card'),true);}
function retain(m){m.mode='cab';assert.equal(B.retry(m,'retain','access'),true);assert.equal(B.retry(m,'book',{day:5,slot:'afternoon'}),true);}
test('the canonical mission parcel, legal curb and safe card point define the protocol geometry',()=>{
 const {m,b}=fixture();assert.equal(B.parking(m),true);assert.equal(B.secured(m),true);assert.equal(m.parcels.length,1);assert.equal(b.state.spec.parcel,m.parcels[0].id);assert.ok(m.solids.includes(b.car));assert.equal(m.blocked(b.car.x,b.car.z),true);assert.equal(m.blocked(b.card.x,b.card.z),true,'the holder is a physical collider');assert.equal(m.blocked(b.card.x-1.4,b.card.z),false,'the safe reading pose is reachable');assert.equal(B.atCard(m),false);assert.equal(B.ready(m),false);
 const p=m.van.x;m.van.x+=2;assert.equal(B.parking(m),false);m.van.x=p;m.van.hand=false;assert.equal(B.parking(m),false);
});
test('the actual cargo slot, held parcel, restraint and closed doors gate UN and retained completion',()=>{
 const {m,b}=fixture(),p=m.parcels[0];assert.equal(B.exception(m,'AC'),false);
 for(const change of [()=>{p.location='held';m.heldId=p.id;},()=>{m.cargoOpen=true;},()=>{m.secured=false;}]){const saved={location:p.location,heldId:m.heldId,cargo:m.cargoOpen,secured:m.secured};change();assert.equal(B.secured(m),false);assert.equal(B.exception(m,'UN'),false);p.location=saved.location;m.heldId=saved.heldId;m.cargoOpen=saved.cargo;m.secured=saved.secured;}
 assert.equal(B.exception(m,'UN'),true);assert.equal(B.retry(m,'card'),false);card(m);assert.equal(B.atVan(m),false);assert.equal(B.retry(m,'retain','access'),false);retain(m);assert.equal(B.ready(m),true);const r=B.result({model:m});assert.equal(r.score,200);assert.equal(r.ratios.safety,1);assert.equal(r.ratios.service,1);assert.equal(r.stats.doorReached,false);assert.equal(b.state.exception,'UN');
});
test('actual locked access accepts AC while a safe absent site requires an on-foot door approach before NA',()=>{
 const locked=fixture({unsafe:false,locked:true}).m;assert.ok(locked.blockedProblem.gate);assert.equal(locked.blocked(locked.blockedProblem.gate.x,locked.blockedProblem.gate.z),true);assert.equal(B.exception(locked,'UN'),false);assert.equal(B.exception(locked,'AC'),true);
 const safe=fixture({unsafe:false,locked:false}).m;assert.equal(B.exception(safe,'NA'),false);assert.equal(B.reachDoor(safe),false);safe.mode='walk';const point=safe.blockedProblem.card;Object.assign(safe.player,{x:point.x-1.4,z:point.z+1.5,yaw:Math.PI/2});
 const door=safe.blockedProblem.door;for(let i=0;i<80&&safe.player.x<door.x-1.3;i++)safe.step({forward:true},.05);safe.player.yaw=0;for(let i=0;i<80&&safe.player.z>door.z;i++)safe.step({forward:true},.05);
 assert.equal(safe.blocked(safe.player.x,safe.player.z),false,'the real walking motor reaches the public approach around the car');assert.ok(Math.hypot(safe.player.x-door.x,safe.player.z-door.z)<2.65);assert.equal(B.reachDoor(safe),true);safe.mode='cab';assert.equal(B.exception(safe,'NA'),true);
});
test('actual careless walking into the unsafe approach keeps the major hazard and a corrected booking stays failed',()=>{
 const {m,b}=fixture();m.mode='walk';Object.assign(m.player,{x:b.hazard.x0+.2,z:b.hazard.z0+.2});m.step({forward:false,back:false,left:false,right:false,careful:false},.05);assert.equal(b.state.log.items.filter(i=>i.type==='stop.hazard').length,1);assert.equal(b.state.log.criticals().length,0);assert.equal(b.slipAt,b.state.elapsed);m.step({},.05);assert.equal(b.state.log.items.filter(i=>i.type==='stop.hazard').length,1);
 m.mode='cab';assert.equal(B.exception(m,'UN'),true);card(m);m.mode='cab';assert.equal(B.retry(m,'retain','absent'),false);retain(m);const r=B.result({model:m});assert.equal(r.ratios.safety,0);assert.equal(r.ratios.service,0);
});
test('paused/ended states freeze and timeout observations cannot enter the suspended workday',()=>{
 O.workday.begin();O.workday.report('brief.read',{key:'saved'});const before=JSON.stringify(O.workday.events),{m,run,b}=fixture();m.paused=true;const pose=JSON.stringify([m.van,b.state.elapsed]);m.step({forward:true},.05);assert.equal(JSON.stringify([m.van,b.state.elapsed]),pose);m.moduleReport('drive.contact',{key:'physical'});const r=B.result(run,'timeout');assert.equal(r.score,0);assert.equal(r.log.criticals().length,1);m.paused=false;m.step({forward:true},.05);assert.equal(JSON.stringify([m.van,b.state.elapsed]),pose);assert.equal(JSON.stringify(O.workday.events),before);
});
