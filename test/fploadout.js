const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../lib/three.min.js'),c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/m6_loading.js','data/workday_events.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fploadout.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const M=c.OTR.fpMission,L=c.OTR.fpLoadout,W=c.OTR.workday;
const make=kind=>{W.begin();const m=M.create('campaign',1);L.configure(m,kind);return m;};
const at=(m,id)=>{Object.assign(m.player,m.point(id));m.player.x+=1.5;};
const loaded=m=>{for(const p of m.parcels)if(!p.anomaly&&p.location!=='pending'){p.location='slot'+p.stop;p.zone=p.location;p.scanned=p.loaded=true;}};
test('seeded discrepancies are stable, optional on old saves and excluded from cargo practice',()=>{
 const kinds=new Set();for(let seed=1;seed<=10;seed++){const m=M.create('campaign',seed);L.configure(m);kinds.add(m.loadout.kind);assert.equal(m.loadout.kind,L.kinds[seed%5]);assert.ok(M.restore(m.snapshot()));}
 assert.equal(kinds.size,5);const old=M.create('campaign',1);assert.ok(M.restore(old.snapshot()));assert.equal(old.loadout,undefined);
 const practice=M.create('practice',1);L.configure(practice);assert.equal(practice.loadout,undefined);
});
test('a mis-sort is a physical unlisted parcel; scanning catches it once and Dispatch sets it aside',()=>{
 const m=make('missort'),p=m.parcels.at(-1);assert.equal(m.stops.length,3);assert.equal(m.parcels.length,4);
 at(m,p.id);assert.match(m.scan(p.id),/not on the route/);m.scan(p.id);
 assert.equal(W.events.filter(e=>e.type==='load.missort-caught').length,1);
 assert.equal(m.pickup(p.id),'');at(m,'dispatch');assert.match(L.aside(m),/set aside/);assert.equal(p.location,'aside');assert.equal(m.heldId,null);
 assert.ok(M.restore(m.snapshot()));W.begin();const resumed=M.restore(m.snapshot());at(resumed,'dispatch');L.aside(resumed);assert.equal(W.events.length,0);
});
test('an extra package earns its catch only when set aside, and cannot be delivered or returned',()=>{
 const m=make('extra'),p=m.parcels.at(-1);at(m,p.id);m.scan(p.id);assert.equal(W.events.length,0);
 m.pickup(p.id);m.player.x=0;m.player.z=0;assert.match(L.aside(m),/Dispatch/);at(m,'dispatch');L.aside(m);assert.equal(W.events.filter(e=>e.type==='load.extra-caught').length,1);
 const bad=m.snapshot();bad.parcels.at(-1).location='delivered';assert.equal(M.restore(bad),null);
});
test('loading a mis-sort and skipping the count are reported on departure only once',()=>{
 const m=make('missort'),p=m.parcels.at(-1);p.location='slot5';p.zone='slot5';p.loaded=true;m.preparation();m.preparation();
 assert.equal(W.events.filter(e=>e.type==='load.missort-missed').length,1);assert.equal(W.events.filter(e=>e.type==='load.count'&&!e.ok).length,1);
 at(m,'dispatch');assert.match(L.count(m,0),/already closed/);assert.equal(W.events.filter(e=>e.type==='load.count').length,1);
 assert.ok(M.restore(m.snapshot()));
});
test('a missing package can be reported, physically recovered, scanned and loaded before counting',()=>{
 const m=make('missing'),p=m.parcel(m.loadout.missingId);assert.equal(m.point(p.id),null);assert.equal(m.canParcel(p),false);
 at(m,'dispatch');assert.match(L.missing(m),/found the package/);assert.equal(p.location,'depot');assert.equal(W.events.find(e=>e.type==='load.missing-found').ok,true);
 loaded(m);at(m,'dispatch');assert.match(L.count(m,3),/count is recorded/);m.preparation();assert.equal(W.events.find(e=>e.type==='load.count').ok,true);assert.ok(M.restore(m.snapshot()));
});
test('rolling out without reporting a missing package fails the check and remains recoverable at Dispatch',()=>{
 const m=make('missing'),p=m.parcel(m.loadout.missingId);m.preparation();assert.equal(W.events.find(e=>e.type==='load.missing-found').ok,false);
 at(m,'dispatch');L.missing(m);assert.equal(p.location,'depot');assert.equal(W.events.filter(e=>e.type==='load.missing-found').length,1);
});
test('a reported late package appears once when parked at a stop with cargo open, and files under that stop',()=>{
 const m=make('late'),p=m.parcel(m.loadout.missingId);at(m,'dispatch');L.missing(m);loaded(m);at(m,'dispatch');L.count(m,2);m.preparation();
 m.cargoOpen=true;at(m,'cargo');L.findLater(m);assert.equal(p.location,'pending','not at the depot');
 m.van.z=m.stops[0].z;at(m,'cargo');m.van.hand=false;L.findLater(m);assert.equal(p.location,'pending','parking brake required');
 m.van.hand=true;L.findLater(m);assert.match(p.location,/^slot/);assert.equal(p.scanned,false);assert.equal(p.loaded,true);assert.equal(m.loadout.notice,true);
 L.findLater(m);const reports=W.events.filter(e=>e.type==='load.found-later');assert.equal(reports.length,1);assert.equal(reports[0].stop,1);
 const resumed=M.restore(m.snapshot());assert.ok(resumed);assert.equal(resumed.loadout.found,true);W.begin();L.findLater(resumed);assert.equal(W.events.length,0);
});
test('the count requires the physical van load and rejects a wrong number or an unlisted package',()=>{
 let m=make('clear');at(m,'dispatch');L.count(m,3);assert.equal(W.events.find(e=>e.type==='load.count').ok,false);
 m=make('clear');loaded(m);at(m,'dispatch');L.count(m,2);assert.equal(W.events.find(e=>e.type==='load.count').ok,false);
 m=make('extra');loaded(m);const p=m.parcels.at(-1);p.location='slot5';at(m,'dispatch');L.count(m,4);assert.equal(W.events.find(e=>e.type==='load.count').ok,false);
});
test('bad load-out state and impossible parcel identities do not resume',()=>{
 const m=make('late');let bad=m.snapshot();bad.loadout.found='yes';assert.equal(M.restore(bad),null);
 bad=m.snapshot();bad.loadout.found=true;assert.equal(M.restore(bad),null);
 bad=m.snapshot();bad.loadout.missingId='parcel0';assert.equal(M.restore(bad),null);
 const extra=make('extra');bad=extra.snapshot();bad.parcels.at(-1).anomaly='missort';assert.equal(M.restore(bad),null);
});
test('the extra package has its own real mesh and scan face on the Dispatch counter',()=>{
 const m=make('extra');c.OTR.gfx={high:()=>false};const camera=new THREE.PerspectiveCamera(68,16/9,0.08,180),world=new THREE.Scene();world.add(camera);
 const scene={view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},art=c.OTR.fpWorld.build(scene,m),p=m.parcels.at(-1),point=m.point(p.id);
 Object.assign(m.player,{x:point.x,z:point.z+1.5});art.sync(m,null,'route');camera.lookAt(art.parcels[3].userData.barcode.getWorldPosition(new THREE.Vector3()));camera.updateMatrixWorld(true);
 assert.equal(art.scanTarget(),p.id);assert.equal(art.parcels.length,4);art.dispose();
});

test('load checks also handle five manifest packages and one unlisted package',()=>{
 W.begin();const m=M.create('campaign',1);
 for(let i=3;i<5;i++){m.stops.push(Object.assign({},m.stops[0],{id:i,address:'Test stop '+i}));m.parcels.push(Object.assign({},m.parcels[0],{id:'parcel'+i,stop:i,address:'Test stop '+i}));}
 L.configure(m,'extra');assert.equal(m.parcels.at(-1).id,'parcel5');loaded(m);at(m,'dispatch');m.parcels.at(-1).location='aside';
 L.count(m,5);assert.equal(W.events.find(e=>e.type==='load.count').ok,true);
});
