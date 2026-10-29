/* Town asset placement, fallback, physical access and reflection ownership without WebGL. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../lib/three.min.js'),{install,local}=require('./tools/fpassets-context');
const c={THREE,document:{createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){},clearRect(){},fillText(){},measureText(text){return {width:text.length*26};}})})}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js',
'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js',
'src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fproute.js','src/core/fplater.js','src/core/fpdriving.js','src/core/fploadout.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fplighting.js','src/core/fpweather.js','src/core/fptown.js','src/core/fpmaterials.js','src/core/fpsignlettering.js','src/core/fpsigns.js','src/core/fpnav.js','src/core/fpactors.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
c.OTR.save={data:{townSeed:1}};const F=install(c),banks={};
test.before(async()=>{for(const high of [false,true])banks[high]=await F.preload({high,fetch:local});});
test.after(()=>Object.values(banks).forEach(b=>b.dispose()));
function world(high=false,bank=banks[high],day=1,variant=7,nav=false){
 c.OTR.gfx={high:()=>high};const m=c.OTR.fpMission.create('campaign',variant,(nav?c.OTR.fpNav.prepare(c.OTR.fpSigns.prepare(c.OTR.fpLater.prepare(c.OTR.fpRoute.plan(day,variant)))):c.OTR.fpLater.prepare(c.OTR.fpRoute.plan(day,variant)))),camera=new THREE.PerspectiveCamera(68,16/9,.08,180),root=new THREE.Scene();root.add(camera);
 const scene={assetBank:bank,view:{world:root,camera,mirror:{camera:new THREE.PerspectiveCamera(55,16/9,.08,100),on:false}}},art=c.OTR.fpWorld.build(scene,m);return {m,scene,art,camera};
}
test('High surface identities follow real reflection compaction without changing reports or bank geometry',()=>{
 const w=world(true,banks[true],4,7,true);w.art.sync(w.m,null,'route');const snapshot=JSON.stringify(w.m.snapshot()),reports=JSON.stringify(c.OTR.workday.events),meshes=[];
 w.scene.view.world.traverse(o=>{if(o.isInstancedMesh&&o.geometry.hasAttribute('otrSurfaceKind'))meshes.push(o);});assert.ok(meshes.length>=3);
 const before=meshes.map(o=>({count:o.count,matrix:Array.from(o.instanceMatrix.array),surface:Array.from(o.geometry.getAttribute('otrSurfaceKind').array),sign:o.geometry.hasAttribute('otrSignShape')?Array.from(o.geometry.getAttribute('otrSignShape').array):null,words:['otrSignWordsA','otrSignWordsB','otrSignWordLengths'].map(k=>o.geometry.hasAttribute(k)?Array.from(o.geometry.getAttribute(k).array):null)}));
 for(const index of [0,1,2]){w.scene.view.mirror.before(index);w.scene.view.mirror.after();for(let n=0;n<meshes.length;n++){const o=meshes[n],a=before[n];assert.equal(o.count,a.count);assert.deepEqual(Array.from(o.instanceMatrix.array),a.matrix);assert.deepEqual(Array.from(o.geometry.getAttribute('otrSurfaceKind').array),a.surface);if(a.sign)assert.deepEqual(Array.from(o.geometry.getAttribute('otrSignShape').array),a.sign);['otrSignWordsA','otrSignWordsB','otrSignWordLengths'].forEach((k,i)=>{if(a.words[i])assert.deepEqual(Array.from(o.geometry.getAttribute(k).array),a.words[i]);});}}
 assert.equal(JSON.stringify(w.m.snapshot()),snapshot);assert.equal(JSON.stringify(c.OTR.workday.events),reports);w.art.dispose();
 for(const model of banks[true].models.values())for(const part of model.parts)assert.ok(!part.geometry.hasAttribute('otrSurfaceKind'));assert.ok([...banks[true].textures.values()].every(t=>!t.image.closed));
});
test('Low retains fourteen templates and High adds uploaded people and one colour-only bench',()=>{
 for(const high of [false,true]){const bank=banks[high];assert.equal(bank.models.size,high?18:14);assert.equal(bank.stats.loaded,high?23:14,JSON.stringify(bank.stats));assert.equal(bank.stats.failed,0);
  for(const [use,model] of bank.models){if(!use.startsWith('town-'))continue;assert.equal(model.parts.length,1);assert.ok(!model.parts[0].material.map);if(!high&&use!=='town-garage')assert.ok(model.parts[0].geometry.index.count/3<=44);}
 }
});
test('Low scenery stays bounded through repeated culling and shares geometry/materials',()=>{
 const w=world();for(const s of w.m.stops){Object.assign(w.m.player,{x:s.park.x,z:s.park.z});w.art.sync(w.m,null,'route');const t=w.art.townArt;
  const active=t.choices.filter(x=>x.selected);assert.ok(active.reduce((n,x)=>n+x.cost,0)<=290);assert.equal(t.triangleLimit,290);
  for(const g of t.groups)for(const mesh of g.children){assert.equal(mesh.material,t.paint);assert.ok(mesh.material.vertexColors);assert.ok(!mesh.material.map);assert.ok(mesh.userData.fpAsset);}
 }w.art.dispose();
});
test('High retains offscreen town instances for shadows when the trainee turns around',()=>{
 const w=world(true),stop=w.m.stops[0];w.m.mode='walk';Object.assign(w.m.player,{x:stop.park.x,z:stop.park.z,yaw:0});w.art.sync(w.m,null,'route');
 const counts=()=>w.art.assetGroups.flatMap(g=>g.children.map(mesh=>mesh.count)),before=counts(),look=w.camera.quaternion.clone();assert.ok(before.some(n=>n>0));
 w.m.player.yaw=Math.PI;w.m.elapsed+=.2;w.art.sync(w.m,null,'route');assert.ok(look.angleTo(w.camera.quaternion)>2.5);assert.deepEqual(counts(),before);w.art.dispose();
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
 assert.equal(bank.stats.loaded,13);assert.equal(bank.stats.failed,1);
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

test('navigation obstacles reuse bounded car models and always remain visible with matching solids',()=>{
 for(const high of [false,true])for(const present of [false,true]){const w=world(high,present?banks[high]:null,4,7,true),t=w.art.townArt;
  assert.equal(t.triangleLimit,high?Infinity:260);const obstacles=c.OTR.fpNav.obstacles(w.m);assert.equal(t.choices.filter(c=>c.obstruction).length,obstacles.length);
  for(const o of obstacles){t.select(o.x,o.z);const choice=t.choices.find(c=>c.obstruction&&c.x===o.x&&c.z===o.z);assert.ok(choice&&choice.selected);assert.equal(choice.use,'town-parked-car');assert.ok(w.m.solids.includes(o));assert.ok(t.choices.filter(c=>c.selected).reduce((n,c)=>n+c.cost,0)<=t.triangleLimit);if(!present)assert.equal(t.fallback({town:choice}),true);}
  w.art.dispose();
 }
});
test('delivery fronts use at most two shared High house instances inside the original lot volumes',()=>{
 const w=world(true),fronts=w.art.deliveryFronts;assert.ok(fronts&&fronts.choices.length>0);assert.equal(fronts.limit,2);assert.equal(fronts.group.userData.batches.length,1);
 const source=banks[true].models.get('town-house');assert.equal(fronts.group.children[0].geometry,source.parts[0].geometry);assert.equal(fronts.group.children[0].material,w.art.townArt.paint);
 for(const batch of fronts.group.userData.batches)for(const e of batch.entries){const lot=w.m.town.lots.find(l=>l.id===e.town.lotId),b=batch.mesh.geometry.boundingBox.clone().applyMatrix4(e.matrix);
  assert.ok(b.min.x>=lot.x-lot.w/2-1e-5&&b.max.x<=lot.x+lot.w/2+1e-5);assert.ok(b.min.z>=lot.z-lot.d/2-1e-5&&b.max.z<=lot.z+lot.d/2+1e-5);assert.ok(b.min.y>=-1e-5&&b.max.y<=lot.h+1e-5);
 }
 const before=JSON.stringify(w.m.snapshot());
 for(const stop of w.m.stops){Object.assign(w.m.player,{x:stop.x-stop.side*1.5,z:stop.z});w.art.sync(w.m,null,'route');assert.ok(fronts.choices.filter(c=>c.selected).length<=2);assert.ok(fronts.group.children[0].count<=2);
  for(const choice of fronts.choices){assert.equal(w.art.townArt.fallback({town:choice}),!choice.selected);assert.ok(choice.details.every(e=>e.visible===choice.selected));}
 }
 fronts.select(10000,10000);assert.ok(fronts.choices.every(c=>!c.selected&&c.details.every(e=>!e.visible)));
 // Only the explicitly moved player differs; art selection never writes progression or scores.
 const restored=JSON.parse(before);Object.assign(w.m.player,restored.player);assert.equal(JSON.stringify(w.m.snapshot()),before);w.art.dispose();
});
test('delivery fronts preserve exact collision proxies, door/path rays and address anchors with a missing source',()=>{
 const source=banks[true].models.get('town-house'),loaded=world(true);banks[true].models.delete('town-house');let fallback;
 try{fallback=world(true);assert.equal(fallback.art.deliveryFronts,null);}finally{banks[true].models.set('town-house',source);}
 const proxies=w=>w.art.occluders.filter(o=>o.parent===w.art.route).map(o=>({p:o.position.toArray(),s:o.scale.toArray()}));
 const addresses=w=>w.art.labels.filter(l=>l.address).map(l=>({text:l.text,point:l.point.toArray()}));
 assert.deepEqual(proxies(loaded),proxies(fallback));assert.deepEqual(addresses(loaded),addresses(fallback));assert.equal(JSON.stringify(loaded.m.solids),JSON.stringify(fallback.m.solids));
 for(const w of [loaded,fallback])for(const stop of w.m.stops){Object.assign(w.m.player,{x:stop.x-stop.side*1.5,z:stop.z});w.art.sync(w.m,null,'route');const door=w.art.interactions.find(o=>o.userData.interaction==='door'+stop.id);w.camera.lookAt(door.getWorldPosition(new THREE.Vector3()));w.camera.updateMatrixWorld(true);assert.equal(w.art.pick(),'door'+stop.id);}
 loaded.art.dispose();fallback.art.dispose();
});
test('Low, isolated areas, nonresidential lots and shifted entrances keep procedural delivery buildings',()=>{
 const low=world(false);assert.equal(low.art.deliveryFronts,null);low.art.dispose();
 const w=world(true),O=c.OTR,build=m=>O.fpTown.deliveryFronts(w.scene,m,w.art.route,w.art.townArt.paint);assert.equal(build({...w.m,trainingArea:{street:true}}),null);assert.equal(build({...w.m,town:null}),null);
 const stop=w.m.stops.find(s=>w.art.deliveryFronts.byStop.has(s.id)),lot=w.m.town.lots.find(l=>l.id===stop.lotId),single={...w.m,stops:[stop],town:{...w.m.town,lots:[lot]}};
 assert.equal(build({...single,town:{...single.town,lots:[{...lot,h:7}]}}),null);assert.equal(build({...single,stops:[{...stop,z:stop.z+1}]}),null);
 const bank=w.scene.assetBank;w.scene.assetBank={};assert.equal(build(single),null);w.scene.assetBank=bank;w.art.dispose();
});
test('disposing a delivery front releases its scene instance without disposing the shared source geometry',()=>{
 const w=world(true),geometry=banks[true].models.get('town-house').parts[0].geometry;let disposed=0;const listen=()=>disposed++;geometry.addEventListener('dispose',listen);
 const fronts=w.art.deliveryFronts;assert.ok(fronts);w.art.dispose();assert.equal(disposed,0);assert.equal(w.art.route.parent,null);geometry.removeEventListener('dispose',listen);
});
