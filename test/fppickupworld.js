/* Actual counter geometry/rays and bounded label visibility; no GPU/FPS claim. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
function fixture(id='m7-business',high=false){
 const c={THREE,Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);for(const file of ['data/theme.js','data/config.js','data/modules.js','data/m7_pickups.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/talk.js','src/core/fpcustomertalk.js','src/core/fppickup.js','src/core/fpsignlettering.js','src/core/fpmountedwords.js','src/core/fppickupworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);
 const O=c.OTR;O.gfx={high:()=>high};const sc=c.OTR_DATA.modules.find(m=>m.id==='m7').scenarios.find(s=>s.id===id),state=O.fpPickup.create(id,c.OTR_DATA.pickups[id.replace('-','_')],sc.categories),m={pickupTask:state,elapsed:0,player:{x:12,z:-40.4}},parent=new THREE.Group(),interactions=[],occluders=[];let selected=null;
 const art=O.fpPickupWorld.build(parent,m,{interactions,occluders,focus:()=>selected});art.sync(m);return {c,O,state,m,parent,interactions,occluders,art,focus(id){selected=id;art.sync(m);}};
}
function cast(f,id,offset=new THREE.Vector3(0,.5,1.5)){
 const object=f.interactions.find(o=>o.userData.interaction===id),target=object.position.clone().add(new THREE.Vector3(0,0,object.scale.z/2)),from=target.clone().add(offset),ray=new THREE.Raycaster(from,target.clone().sub(from).normalize(),0,3);ray.layers.enable(1);f.parent.updateMatrixWorld(true);return ray.intersectObjects(f.occluders.filter(o=>o.visible),false)[0];
}
test('every original package has actual supported geometry and an unobscured selectable front label face',()=>{
 for(const id of ['m7-business','m7-intl','m7-dg'])for(const high of [false,true]){
  const f=fixture(id,high);try{assert.equal(f.art.parcels.length,f.state.pieces.length);assert.equal(f.interactions.length,f.state.pieces.length+(f.state.content.docs?4:3));
   for(const b of f.art.parcels){assert.ok(Math.abs(b.y-b.h/2-.78)<1e-9);assert.equal(b.proxy.userData.interaction,'pickup-parcel-'+b.data.id);const hit=cast(f,b.proxy.userData.interaction,new THREE.Vector3(0,.8,1.2));assert.equal(hit?.object.userData.interaction,b.proxy.userData.interaction,b.data.id);assert.equal(!!b.label,!b.noLabel);}
  }finally{f.art.dispose();}
 }
});
test('Low ink follows only the actual focus; missing-label pieces never gain an address or verdict',()=>{
 const f=fixture();try{assert.equal(f.art.parcels.filter(b=>b.label?.mesh.visible).length,0);
  for(const b of f.art.parcels){f.focus(b.proxy.userData.interaction);const shown=f.art.parcels.filter(p=>p.label?.mesh.visible);assert.equal(shown.length,b.noLabel?0:1);if(!b.noLabel)assert.equal(shown[0],b);for(const p of f.art.parcels)if(p.label)assert.ok(p.label.entries.every(e=>e.visible===(!b.noLabel&&p===b)));}
  f.focus('pickup-manifest');assert.equal(f.art.parcels.filter(b=>b.label?.mesh.visible).length,0);
 }finally{f.art.dispose();}
});
test('the shipper and physical papers are selectable above the counter, while tables and room walls occlude',()=>{
 const f=fixture('m7-intl');try{for(const id of ['pickup-shipper','pickup-manifest','pickup-invoice','pickup-receipt'])assert.equal(cast(f,id,new THREE.Vector3(0,.15,1.4))?.object.userData.interaction,id);
  const ray=new THREE.Raycaster(new THREE.Vector3(12,.5,-45.2),new THREE.Vector3(0,0,-1),0,4);ray.layers.enable(1);assert.equal(ray.intersectObjects(f.occluders,false)[0]?.object.userData.interaction,undefined);
  assert.equal(f.art.parcels[0].marks.every(e=>e.visible===false),true);f.state.counted[f.art.parcels[0].data.id]=true;f.art.sync(f.m);assert.equal(f.art.parcels[0].marks.every(e=>e.visible),true);
 }finally{f.art.dispose();}
});
test('buffers, object counts and owned disposal remain bounded through focus and count changes',()=>{
 const f=fixture();try{const buffers=f.art.batches.map(b=>b.mesh.instanceMatrix.array),count=f.parent.getObjectByName('pickup-counter').children.length;
  for(let n=0;n<100;n++){f.focus('pickup-parcel-'+f.state.pieces[n%f.state.pieces.length].id);f.state.counted[f.state.pieces[n%f.state.pieces.length].id]=true;f.art.sync(f.m);assert.equal(f.art.root.children.length,count);for(let i=0;i<buffers.length;i++)assert.equal(f.art.batches[i].mesh.instanceMatrix.array,buffers[i]);}
  assert.ok(f.art.fixed.count<=64);assert.ok(f.art.words.every(w=>w.count<=2048));
 }finally{f.art.dispose();f.art.dispose();assert.equal(f.parent.children.length,0);assert.throws(()=>f.art.sync(f.m),/disposed/);}
});
