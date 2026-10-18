/* Town asset placement, fallback, physical access and reflection ownership without WebGL. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../lib/three.min.js'),{install,local}=require('./tools/fpassets-context');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js',
'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js',
'src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fproute.js','src/core/fplater.js','src/core/fpdriving.js','src/core/fploadout.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fplighting.js','src/core/fpweather.js','src/core/fptown.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
c.OTR.save={data:{townSeed:1}};const F=install(c),banks={};
test.before(async()=>{for(const high of [false,true])banks[high]=await F.preload({high,fetch:local});});
test.after(()=>Object.values(banks).forEach(b=>b.dispose()));
function world(high=false,bank=banks[high],day=1,variant=7){
 c.OTR.gfx={high:()=>high};const m=c.OTR.fpMission.create('campaign',variant,c.OTR.fpLater.prepare(c.OTR.fpRoute.plan(day,variant))),camera=new THREE.PerspectiveCamera(68,16/9,.08,180),root=new THREE.Scene();root.add(camera);
 const scene={assetBank:bank,view:{world:root,camera,mirror:{camera:new THREE.PerspectiveCamera(55,16/9,.08,100),on:false}}},art=c.OTR.fpWorld.build(scene,m);return {m,scene,art,camera};
}
test('both qualities load all nine local templates and use one texture-free primitive per town model',()=>{
 for(const high of [false,true]){const bank=banks[high];assert.equal(bank.stats.loaded,9,JSON.stringify(bank.stats));assert.equal(bank.stats.failed,0);
  for(const [use,model] of bank.models){assert.equal(model.parts.length,1);assert.ok(!model.parts[0].material.map);if(!high&&use!=='town-garage')assert.ok(model.parts[0].geometry.index.count/3<=44);}
 }
});
test('Low scenery stays bounded through repeated culling and shares geometry/materials',()=>{
 const w=world();for(const s of w.m.stops){Object.assign(w.m.player,{x:s.park.x,z:s.park.z});w.art.sync(w.m,null,'route');const t=w.art.townArt;
  const active=t.choices.filter(x=>x.selected);assert.ok(active.reduce((n,x)=>n+x.cost,0)<=290);assert.equal(t.triangleLimit,290);
  for(const g of t.groups)for(const mesh of g.children){assert.equal(mesh.material,t.paint);assert.ok(mesh.material.vertexColors);assert.ok(!mesh.material.map);assert.ok(mesh.userData.fpAsset);}
 }w.art.dispose();
});
test('full source detail is limited by the existing High scenery distance',()=>{
 const w=world(true);w.art.townArt.select(0,0);const selected=w.art.townArt.choices.filter(x=>x.selected);assert.ok(selected.length>0);assert.ok(selected.every(x=>x.x*x.x+x.z*x.z<95*95));assert.equal(w.art.townArt.triangleLimit,Infinity);w.art.dispose();
});
test('asset and procedural worlds keep identical snapshots, exact solids, all door targets and scores',()=>{
 for(const high of [false,true])for(const present of [true,false])for(const day of [1,6,21]){
  const w=world(high,present?banks[high]:null,day,10),originalPlayer={...w.m.player},snapshot=JSON.stringify(w.m.snapshot()),solids=JSON.stringify(w.m.solids),events=JSON.stringify(c.OTR.workday.events);
  for(const s of w.m.stops){Object.assign(w.m.player,{x:s.x-s.side*1.5,z:s.z});w.art.sync(w.m,null,'route');const target=w.art.interactions.find(o=>o.userData.interaction==='door'+s.id);w.camera.lookAt(target.getWorldPosition(new THREE.Vector3()));w.camera.updateMatrixWorld(true);assert.equal(w.art.pick(),'door'+s.id,s.address);}
  Object.assign(w.m.player,originalPlayer);assert.equal(JSON.stringify(w.m.snapshot()),snapshot);assert.equal(JSON.stringify(w.m.solids),solids);assert.equal(JSON.stringify(c.OTR.workday.events),events);w.art.dispose();
 }
});
test('missing individual models retain their procedural lots without hiding healthy neighbours',async()=>{
 const bank=await F.preload({fetch:url=>url.includes('/building-type-a-')?Promise.resolve(new Response('',{status:404})):local(url)});
 assert.equal(bank.stats.loaded,8);assert.equal(bank.stats.failed,1);
 const w=world(false,bank),t=w.art.townArt,house=t.choices.find(x=>x.use==='town-house');assert.equal(house.available,false);t.select(house.x,house.z);assert.equal(house.selected,false);assert.equal(t.fallback({town:house}),true);assert.ok(t.choices.some(x=>x.available&&x.selected));w.art.dispose();bank.dispose();
});
test('front-yard props stay inside their original lot and outside the building',()=>{
 for(const high of [false,true]){const w=world(high),bounds=new Map();
  for(const batch of w.art.townArt.batches){batch.mesh.geometry.computeBoundingBox();for(const e of batch.entries)bounds.set(e.town,batch.mesh.geometry.boundingBox.clone().applyMatrix4(e.matrix));}
  for(const [choice,b] of bounds){if(!choice.lotId)continue;const l=w.m.town.lots.find(l=>l.id===choice.lotId);assert.ok(b.min.x>=l.x-l.w/2-.001&&b.max.x<=l.x+l.w/2+.001&&b.min.z>=l.z-l.d/2-.001&&b.max.z<=l.z+l.d/2+.001,choice.use+' stays inside '+l.id);
   if(!choice.house){const house=w.art.townArt.choices.find(c=>c.house&&c.lotId===l.id),h=bounds.get(house);assert.ok(b.max.x<=h.min.x+.001||b.min.x>=h.max.x-.001,choice.use+' stays outside the house on '+l.id);}
  }w.art.dispose();
 }
});
test('all four reflection passes restore every static/asset matrix, colour, count and visibility',()=>{
 const w=world();w.m.mode='cab';w.m.van.wipers=true;w.m.van.gear=-1;w.m.paused=false;w.art.sync(w.m,null,'route');const meshes=[];
 w.art.route.traverse(o=>{if(o.isInstancedMesh)meshes.push(o);});
 const state=()=>meshes.map(o=>({matrix:Array.from(o.instanceMatrix.array),colour:o.instanceColor&&Array.from(o.instanceColor.array),count:o.count,visible:o.visible}));const before=state();
 for(let i=0;i<4;i++){w.scene.view.mirror.before(i);w.scene.view.mirror.after();assert.deepEqual(state(),before);}
 w.art.dispose();assert.equal(w.scene.view.world.children.length,1);
});
test('per-instance static colour batching retains several colours in one route draw',()=>{
 const w=world(),meshes=[];w.art.route.traverse(o=>{if(o.isInstancedMesh&&o.instanceColor)meshes.push(o);});
 assert.ok(meshes.some(o=>{const colours=new Set();for(let i=0;i<o.instanceColor.count;i++)colours.add(o.instanceColor.array.slice(i*3,i*3+3).join(','));return colours.size>5;}));w.art.dispose();
});
