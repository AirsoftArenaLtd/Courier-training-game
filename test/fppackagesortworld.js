/* Unwired conveyor renderer: real geometry, local model, physical targets and bounded lifetime. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/m2_sorting.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpsignlettering.js','src/core/fppackagesort.js','src/core/fppackagesortworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,A=O.fpPackageSortWorld,S=O.fpPackageSort;
function fixture(){const root=new THREE.Scene(),interactions=[],occluders=[],art=A.build(root,{interactions,occluders}),state=S.create(c.OTR_DATA.sorting,{random:()=>.5});S.begin(state);return {root,interactions,occluders,art,state};}
test('sixteen parcels use fixed buffers, three visible batches and no image maps',()=>{
 const {art,state}=fixture();for(let i=0;i<16;i++){const p=S.spawn(state);p.position=-70+i*1252/16;p.priority=true;p.damage='leak';p.dg=i%2===0;p.heavy=!p.dg;}
 art.sync(state);const meshes=[art.staticMesh,art.parcelMesh,art.markMesh],buffers=meshes.map(m=>[m.instanceMatrix.array,m.instanceColor.array]),proxies=art.slots.map(s=>s.target);
 const triangles=meshes.reduce((n,m)=>n+m.geometry.index.count/3*m.count,0);assert.ok(triangles<=1700,'component geometry remains bounded; this is not the combined Low gate');assert.equal(meshes.length,3);
 for(let frame=0;frame<1000;frame++){for(const p of state.packages)p.position=-70+(frame+p.id*35)%1252;art.sync(state);}
 for(let i=0;i<3;i++){const m=meshes[i];assert.equal(m.instanceMatrix.array,buffers[i][0]);assert.equal(m.instanceColor.array,buffers[i][1]);assert.equal(m.material.map,null);assert.equal(m.material.vertexColors,false,'colour comes from instances, never a missing geometry attribute');for(const value of m.instanceMatrix.array)assert.ok(Number.isFinite(value));}
 assert.ok(art.parcelMesh.instanceColor.array.some(v=>v>.1));for(let i=0;i<16;i++)assert.equal(art.slots[i].target,proxies[i]);state.packages.push({...state.packages[0],id:17});assert.throws(()=>art.sync(state),/capacity/);state.packages.length=0;art.sync(state);assert.equal(art.parcelMesh.count,0);assert.ok(art.slots.every(s=>!s.target.visible));art.dispose();
});
test('stable routing keys follow active waves, and the real rays reach every active physical key',()=>{
 const {root,art,state}=fixture(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180),ray=new THREE.Raycaster();ray.layers.enable(1);root.add(camera);camera.position.set(-10,1.65,16.4);
 for(let wave=0;wave<state.content.waves.length;wave++){
  if(wave){S.wave(state,wave);S.begin(state);}art.sync(state);for(let i=0;i<A.bins.length;i++){
   const target=art.buttons[i],active=state.wave.bins.includes(A.bins[i]);assert.equal(target.visible,active);
   if(active){camera.lookAt(target.position);camera.updateMatrixWorld(true);ray.setFromCamera({x:0,y:0},camera);const hit=ray.intersectObjects([...art.buttons,art.restart,...art.blockers].filter(o=>o.visible),false)[0];assert.equal(hit?.object.userData.interaction,'sort-bin-'+A.bins[i]);assert.ok(hit.distance<=2.65);}
  }
 }
 assert.equal(art.restart.visible,false);S.spawn(state);S.jam(state);art.sync(state);assert.equal(art.restart.visible,true);art.dispose();
});
test('furniture and operator access fit the real depot without intersecting its existing props',()=>{
 const m=O.fpMission.create('campaign',1),solids=A.solids();for(const solid of solids){const overlaps=m.solids.filter(p=>Math.abs(p.x-solid.x)<(p.w+solid.w)/2&&Math.abs(p.z-solid.z)<(p.d+solid.d)/2);assert.equal(overlaps.length,0);}
 m.solids.push(...solids);assert.equal(m.blocked(-10,16.4),false);for(const solid of solids)assert.equal(m.blocked(solid.x,solid.z),true);
 const out={};assert.equal(A.parcelPoint({position:-70},out),out);assert.equal(out.x,-14.4);A.parcelPoint({position:1182},out);assert.ok(Math.abs(out.x+5.6)<1e-8);
});
test('disposing a conveyor releases owned resources exactly once and preserves a shared cube',()=>{
 const root=new THREE.Scene(),cube=new THREE.BoxGeometry(),art=A.build(root,{cube});let shared=0,material=0,plane=0,instance=0;cube.addEventListener('dispose',()=>shared++);art.staticMesh.material.addEventListener('dispose',()=>material++);art.markMesh.geometry.addEventListener('dispose',()=>plane++);for(const mesh of [art.staticMesh,art.parcelMesh,art.markMesh])mesh.addEventListener('dispose',()=>instance++);
 art.dispose();art.dispose();assert.equal(root.children.length,0);assert.equal(shared,0);assert.equal(material,1);assert.equal(plane,1);assert.equal(instance,3);cube.dispose();assert.equal(shared,1);
});
