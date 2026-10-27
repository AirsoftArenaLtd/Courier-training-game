/* Ambient people use actual town bounds and preserve physical access, reflection state and source ownership. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js'),{install,local}=require('./tools/fpassets-context');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fproute.js','src/core/fplater.js','src/core/fpdriving.js','src/core/fploadout.js','src/core/fpday.js','src/core/fpdoors.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fplighting.js','src/core/fpweather.js','src/core/fptown.js','src/core/fpsigns.js','src/core/fptraffic.js','src/core/fpactors.js','src/core/fpnav.js','src/core/fpambient.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
c.OTR.save={data:{townSeed:1}};const F=install(c),A=c.OTR.fpActors,banks={};
test.before(async()=>{for(const high of [false,true])banks[high]=await F.preload({high,fetch:local});});test.after(()=>Object.values(banks).forEach(b=>b.dispose()));
function world(high=false,bank=banks[high],day=null,variant=7){c.OTR.gfx={high:()=>high};let plan=c.OTR.fpRoute.plan(day||1,variant);if(day!==null)plan=c.OTR.fpTraffic.prepare(c.OTR.fpSigns.prepare(plan));const m=c.OTR.fpMission.create('campaign',variant,plan),camera=new THREE.PerspectiveCamera(68,16/9,.08,180),root=new THREE.Scene();root.add(camera);c.OTR.fpDoors.configure(m);const scene={assetBank:bank,view:{world:root,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},art=c.OTR.fpWorld.build(scene,m);return{m,art,scene,camera};}
function clear(site,lot,bounds){
 assert.ok(Math.abs(site.x-lot.x)+site.radius<lot.w/2);assert.ok(Math.abs(site.z-lot.z)+site.span+site.radius<lot.d/2);
 for(const b of bounds)if(b.minY<=1.8&&b.maxY>=.05)assert.ok(Math.abs(site.x-b.x)>=(site.radius+b.w/2)||Math.abs(site.z-b.z)>=(site.span+site.radius+b.d/2),site.lotId+' intersects rendered detail');
}
test('actual source/fallback union bounds keep ordinary-route people and paths inside unused solids',()=>{
 let loadedSites=0,fallbackSites=0;
 for(const high of [false,true])for(const present of [false,true])for(const day of [1,4,6])for(let seed=1;seed<=10;seed++){
  const w=world(high,present?banks[high]:null,day,seed),a=w.art.ambient;if(a){const player={...w.m.player},state=JSON.stringify(w.m.snapshot()),solids=JSON.stringify(w.m.solids),events=JSON.stringify(c.OTR.workday.events);assert.equal(a.people.length,high?2:1);
   for(const site of a.selection.sites){const lot=w.m.town.lots.find(l=>l.id===site.lotId);assert.ok(!w.m.stops.some(s=>s.lotId===site.lotId));assert.ok(w.m.blocked(site.x,site.z),'Already inside an existing solid');clear(site,lot,w.art.townArt.footprints);}
   if(present)loadedSites+=a.selection.sites.length;else fallbackSites+=a.selection.sites.length;
   const site=a.selection.sites[0];Object.assign(w.m.player,{x:site.x,z:site.z});w.art.sync(w.m,null,'route');assert.ok(a.selection.slots[0].visible);assert.equal(JSON.stringify(w.m.solids),solids);assert.equal(JSON.stringify(c.OTR.workday.events),events);Object.assign(w.m.player,player);assert.equal(JSON.stringify(w.m.snapshot()),state);
  }w.art.dispose();
 }
 assert.ok(loadedSites>100&&fallbackSites>100);
});
test('posed source people stay inside the reserved swept body throughout walks and turns',()=>{
 const w=world(true,banks[true],4),a=w.art.ambient;assert.ok(a);const site=a.selection.sites[0];Object.assign(w.m.player,{x:site.x-3,z:site.z});const point=new THREE.Vector3();
 for(let step=0;step<160;step++){w.m.elapsed=step/20;w.art.sync(w.m,null,'route');for(let i=0;i<a.people.length;i++){const actor=a.people[i],slot=a.selection.slots[i];if(!actor||!slot.visible)continue;for(let j=0;j<actor.geometry.attributes.position.count;j++){point.fromBufferAttribute(actor.geometry.attributes.position,j).applyMatrix4(actor.mesh.matrixWorld);assert.ok(Math.abs(point.x-slot.site.x)<=slot.site.radius+.001);assert.ok(Math.abs(point.z-slot.site.z)<=slot.site.span+slot.site.radius+.001);}}}
 w.art.dispose();
});
test('people placements are near ordinary planned driving legs across generated routes',()=>{
 const rows=[];
 for(const high of [false,true])for(const day of [1,4,6])for(let seed=1;seed<=10;seed++){
  const w=world(high,banks[high],day,seed),sites=w.art.ambient?.selection.sites||[],destinations=[{x:w.m.van.x,z:w.m.van.z},...w.m.stops.map(s=>s.park),{x:2.84,z:8}];let covered=0,legs=0;
  for(let n=1;n<destinations.length;n++){const route=c.OTR.fpNav.path(w.m,destinations[n-1],destinations[n]);assert.ok(route);legs++;let nearby=false;
   for(let k=1;k<route.points.length;k++){const a=route.points[k-1],b=route.points[k],dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;for(const site of sites){const t=length2?Math.max(0,Math.min(1,((site.x-a.x)*dx+(site.z-a.z)*dz)/length2)):0;if((site.x-a.x-t*dx)**2+(site.z-a.z-t*dz)**2<(high?35:22)**2)nearby=true;}}
   if(nearby)covered++;
  }
  rows.push({high,day,seed,sites:sites.length,legs,withinSelectionRange:covered});assert.ok(covered>0,'No person near any normal driving leg: '+JSON.stringify(rows[rows.length-1]));w.art.dispose();
 }
 fs.mkdirSync(__dirname+'/out/fp-review',{recursive:true});fs.writeFileSync(__dirname+'/out/fp-review/c51-route-coverage.json',JSON.stringify({scope:'Potential selection range along planned streets; native views separately prove pixels, not every route.',routes:rows},null,2)+'\n');
});
test('Low and missing packs use bounded entries in the existing draw, not another person mesh',()=>{
 for(const high of [false,true]){const w=world(high,null,4),a=w.art.ambient;assert.ok(a);assert.ok(a.people.every(p=>p===null));assert.equal(a.reserved,high?0:36);assert.equal(w.art.townArt.triangleLimit,high?Infinity:180);const site=a.selection.sites[0];Object.assign(w.m.player,{x:site.x-2,z:site.z});w.art.sync(w.m,null,'route');assert.ok(a.fallbacks[0].every(p=>p.entry.visible));assert.equal(a.fallbacks[0].length*12,36);assert.ok(w.art.route.children.every(o=>!o.name.startsWith('actor:ambient')));w.art.dispose();}
});
test('source people stop posing at distance and reduced motion holds both placement and vertices',()=>{
 const w=world(true,banks[true],4),a=w.art.ambient,site=a.selection.sites[0];Object.assign(w.m.player,{x:site.x-2,z:site.z});a.sync(w.m,site.x-2,site.z,true);const slots=JSON.stringify(a.selection.slots),vertices=a.people.map(p=>Array.from(p.geometry.attributes.position.array));w.m.elapsed=99;a.sync(w.m,site.x-2,site.z,true);assert.equal(JSON.stringify(a.selection.slots),slots);assert.deepEqual(a.people.map(p=>Array.from(p.geometry.attributes.position.array)),vertices);
 let posed=0;for(const p of a.people)p.pose=()=>posed++;a.sync(w.m,10000,10000,false);assert.equal(posed,0);assert.ok(a.people.every(p=>!p.mesh.visible));w.art.dispose();
});
test('all four reflections restore actor and batched fallback presentation exactly',()=>{
 for(const high of [false,true])for(const present of [false,true]){const w=world(high,present?banks[high]:null,4),a=w.art.ambient;assert.ok(a);const site=a.selection.sites[0];Object.assign(w.m.player,{x:site.x-3,z:site.z});w.art.sync(w.m,null,'route');const meshes=[];w.art.route.traverse(o=>{if(o.isInstancedMesh||o.name.startsWith('actor:ambient'))meshes.push(o);});const state=()=>meshes.map(o=>({matrix:Array.from(o.matrixWorld.elements),visible:o.visible,count:o.count,instances:o.instanceMatrix&&Array.from(o.instanceMatrix.array),colours:o.instanceColor&&Array.from(o.instanceColor.array)})),before=state();for(const i of [0,1,2,3]){w.scene.view.mirror.before(i);w.scene.view.mirror.after();assert.deepEqual(state(),before);}w.art.dispose();}
});
test('scene disposal releases posed geometry once while keeping the source bank intact',()=>{
 const w=world(true,banks[true],4),a=w.art.ambient;assert.ok(a);const disposed=new Map();for(const p of a.people)p.geometry.addEventListener('dispose',()=>disposed.set(p,(disposed.get(p)||0)+1));let source=0;banks[true].models.get('ambient-adult-a').parts[0].geometry.addEventListener('dispose',()=>source++);w.art.dispose();assert.ok(a.people.every(p=>disposed.get(p)===1));assert.equal(source,0);assert.equal(w.scene.view.world.children.length,1);assert.equal(a.selection.sites.length,0);
});
test('the unchanged bench retains its source wood factor without a missing vertex-colour attribute',()=>{
 const w=world(true,banks[true],4),group=w.art.townArt.groups.find(g=>g.name==='asset:town-bench');assert.ok(group);const source=banks[true].models.get('town-bench').parts[0];for(const mesh of group.children){assert.ok(!mesh.geometry.hasAttribute('color'));assert.equal(mesh.material.vertexColors,false);assert.ok(mesh.material.color.equals(source.material.color));assert.ok(!mesh.material.map);}w.art.dispose();
});
test('combined Low days keep collision-bearing parked cars ahead of optional people',()=>{
 for(const file of ['fpstops','fpstopflow','fpstopscene','fpdamage','fpdamageflow'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+file+'.js','utf8'),c);
 let suppressed=0;
 for(const present of [false,true])for(const seed of [1,7,10]){
  c.OTR.gfx={high:()=>false};let plan=c.OTR.fpRoute.plan(6,seed);plan=c.OTR.fpStopFlow.prepare(c.OTR.fpDamageFlow.prepare(c.OTR.fpNav.prepare(c.OTR.fpSigns.prepare(c.OTR.fpLater.prepare(plan)))),true);
  const m=c.OTR.fpMission.create('campaign',seed,plan);c.OTR.fpDay.configure(m);c.OTR.fpDriving.configure(m);c.OTR.fpDoors.configure(m);c.OTR.fpStopFlow.configure(m);const root=new THREE.Scene(),camera=new THREE.PerspectiveCamera(76,16/9,.08,180);root.add(camera);const scene={assetBank:present?banks[false]:null,view:{world:root,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},art=c.OTR.fpWorld.build(scene,m),town=art.townArt;assert.equal(town.triangleLimit,60);assert.ok(art.ambient);
  const selected=()=>Array.from(town.choices.filter(c=>c.obstruction&&c.selected),c=>c.x+':'+c.z).sort();
  for(const obstacle of c.OTR.fpNav.obstacles(m)){
   town.ambientReserve=0;town.select(obstacle.x,obstacle.z);const before=selected();assert.ok(before.length>0);town.ambientReserve=36;town.select(obstacle.x,obstacle.z);assert.deepEqual(selected(),before,'A collision surface became invisible to fund a person');
   Object.assign(m.player,{x:obstacle.x,z:obstacle.z});art.sync(m,null,'route');assert.deepEqual(selected(),before);if(!town.ambientAllowed){suppressed++;assert.ok(art.ambient.selection.slots.every(s=>!s.visible));assert.ok(art.ambient.fallbacks.every(parts=>parts.every(p=>!p.entry.visible)));}
  }art.dispose();
 }
 assert.ok(suppressed>0,'The tight combined budget must exercise the safe suppression path');
});
test('every real benchmark people fixture preserves a restorable generated day',()=>{
 for(const file of ['fpwalkaround','fpwalkaroundflow','fpradio','fpnight'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+file+'.js','utf8'),c);
 // Exercise the exact page-evaluation function used by fpbench, with real mission and world adapters.
 const source=fs.readFileSync(__dirname+'/fpbench.js','utf8'),section=source.indexOf("if(process.env.QA_AMBIENT==='1')"),start=source.indexOf('const proof=await p.evaluate(',section)+'const proof=await p.evaluate('.length,end=source.indexOf('},kind);',start)+1;
 assert.ok(section>=0&&end>start);const fixture=vm.runInContext('('+source.slice(start,end)+')',c);
 for(const high of [false,true])for(const kind of ['ambientwalk','ambientcab','ambientmirror','ambientnight',...(high?['ambientbench']:[])]){
  c.OTR.gfx={high:()=>high};const root=new THREE.Scene(),camera=new THREE.PerspectiveCamera(76,16/9,.08,180);root.add(camera);
  const scene={assetBank:banks[high],view:{world:root,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},handheld:{close(){}},closePanel(){},refresh(){},rebuildWorld(){if(this.art)this.art.dispose();this.art=c.OTR.fpWorld.build(this,this.model);},sync(){this.art.sync(this.model,null,'route');}};
  c.OTR.game={scene:{getScene:()=>scene}};try{const proof=fixture(kind);assert.ok(proof.restoreValid,kind+' has invalid mission state');assert.ok(proof.selected>0,kind+' has no visible person');assert.equal(proof.limit,high?2:1);assert.equal(scene.model.routeDay.weather,scene.model.routePlan.weather);assert.equal(scene.model.walkaround.departed,true);assert.notEqual(scene.model.routeDay.later.departAt,null);if(kind==='ambientbench')assert.equal(proof.bench,true);}finally{if(scene.art)scene.art.dispose();delete c.OTR.game;}
 }
});
