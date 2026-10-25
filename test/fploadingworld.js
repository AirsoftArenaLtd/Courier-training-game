/* Physical M6 fit-out only: real geometry/rays, no browser, GPU, whole-world or FPS claim. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
function context(high=false,id='m6-load'){
 const c={THREE,Phaser:{Scene:class{}}};c.window=c;vm.createContext(c);
 for(const f of ['data/theme.js','data/config.js','data/m6_loading.js','src/core/theme.js','src/core/scoring.js','src/core/scorelog.js','src/core/fploading.js','src/core/fpsignlettering.js','src/core/fpmountedwords.js','src/core/fploadingworld.js','src/scenes/BaseScenarioScene.js','src/scenes/m6/LoadingScene.js']){if(f.includes('/LoadingScene'))c.OTR.registerScene=()=>{};vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);}
 const O=c.OTR;O.gfx={high:()=>high};const state=O.fpLoading.create(id,c.OTR_DATA.loading[id.replace('-','_')],id==='m6-load'?['safety','efficiency']:['efficiency','service']);O.fpLoading.begin(state);
 const m={loading:state,van:{x:2.84,z:8,yaw:0},player:{x:2.84,z:11.8,yaw:0},cargoOpen:true},root=new THREE.Group(),interactions=[],occluders=[],art=O.fpLoadingWorld.build(root,m,{interactions,occluders});art.sync(m);
 return {c,O,state,m,root,art,interactions,occluders};
}
const good={l1:'A-mid-0',l2:'A-top-0',l3:'A-bottom-0',l4:'B-top-0',l5:'B-bottom-0',l6:'B-mid-0',l7:'C-mid-0',l8:'C-bottom-0',l9:'haz',l10:'A-mid-1',l11:'B-top-1',l12:'C-top-0'};
function load(f){for(const [id,slot]of Object.entries(good)){f.O.fpLoading.take(f.state,id);f.O.fpLoading.place(f.state,slot);}f.art.sync(f.m);}
function ray(f,from,to){const direction=to.clone().sub(from),distance=direction.length(),ray=new THREE.Raycaster(from,direction.normalize(),0,distance+.05);ray.layers.enable(1);return ray.intersectObjects(f.occluders.filter(o=>o.visible),false)[0];}
test('the actual 21 cargo slots put first stops nearest the doors, heavy shelves low and bulk on the floor',()=>{
 const f=context();try{assert.equal(f.art.slots.length,21);const at=id=>f.art.slotById.get(id),v=f.m.van;
  assert.ok(at('A-mid-0').z>at('B-mid-0').z&&at('B-mid-0').z>at('C-mid-0').z);
  assert.ok(at('A-bottom-0').y<at('A-mid-0').y&&at('A-mid-0').y<at('A-top-0').y);
  for(const s of f.art.slots){assert.ok(Math.abs(s.x-v.x)+s.w/2<=1.06);assert.ok(s.z-s.d/2>v.z-.9&&s.z+s.d/2<v.z+2.6);assert.ok(s.y>=.6&&s.y<2.8);}
  load(f);for(const b of f.art.parcels){const slot=at(b.data.slotRef.id);assert.ok(Math.abs(b.y-b.h/2-slot.y)<1e-9);assert.equal(b.x,slot.x);assert.equal(b.z,slot.z);assert.ok(b.y+b.h/2<3.09);}
  const haz=f.art.parcels.find(b=>b.data.hazmat);assert.equal(haz.data.slotRef.id,'haz');assert.ok(Math.abs(haz.y-haz.h/2-.6)<1e-9);
 }finally{f.art.dispose();}
});
test('all 21 empty physical slot markers can be selected by real rays from the cargo aisle',()=>{
 const f=context();try{for(const s of f.art.slots){const t=s.target.position,from=new THREE.Vector3(f.m.van.x,2.15,s.slot.level==='floor'?t.z+.85:t.z);const hit=ray(f,from,t);assert.equal(hit?.object.userData.interaction,'loading-slot-'+s.id,s.id);}}finally{f.art.dispose();}
});
test('cart packages have distinct supported positions and physical rays cannot choose through a nearer package',()=>{
 const f=context();try{
  for(const b of f.art.parcels)assert.equal(b.y-b.h/2,f.art.cart.y);
  for(let i=0;i<f.art.parcels.length;i++)for(let j=i+1;j<f.art.parcels.length;j++){const a=f.art.parcels[i],b=f.art.parcels[j];assert.ok(Math.abs(a.x-b.x)>(a.w+b.w)/2||Math.abs(a.z-b.z)>(a.d+b.d)/2);}
  const near=f.art.parcels[9],far=f.art.parcels[0],from=new THREE.Vector3(near.x,near.y,near.z+1),point=new THREE.Vector3(far.x,far.y,far.z),hit=ray(f,from,point);assert.equal(hit?.object.userData.interaction,'loading-parcel-'+near.data.id);
 }finally{f.art.dispose();}
});
test('loaded parcels expose their label face toward the aisle and retain bounded ink without image textures',()=>{
 for(const high of [false,true]){const f=context(high);try{load(f);Object.assign(f.m.player,{x:f.m.van.x,z:f.m.van.z+1.85});f.art.sync(f.m);
  assert.equal(f.art.parcels.filter(b=>b.printVisible).length,high?12:1);
  for(const b of f.art.parcels){const normal=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),b.angle);if(b.data.slotRef.level!=='floor')assert.ok(normal.x*(f.m.van.x-b.x)>0);assert.equal(b.words.mesh.material.map,null);assert.ok(b.words.count<1024);}
  for(const b of f.art.parcels){const env=b.data.size==='env',n=env?new THREE.Vector3(0,1,0):new THREE.Vector3(Math.sin(b.angle),0,Math.cos(b.angle)),ink=new THREE.Vector3().setFromMatrixPosition(b.matrix),body=new THREE.Vector3(b.x,b.y,b.z),surface=env?b.h/2+.006:b.d/2+.006;assert.ok(ink.sub(body).dot(n)>surface+(high?.004:0)+.001,'label ink stays in front of its actual paper backing');}
  f.O.fpLoading.take(f.state,'l1');f.art.sync(f.m);assert.equal(f.art.parcels.filter(b=>b.printVisible).length,high?12:1);assert.equal(f.art.parcels[0].printVisible,true);assert.equal(f.art.parcels[0].body.visible,false);
 }finally{f.art.dispose();}}
});
test('find disables a picked body at once but keeps its visual for the original 400ms, including closed-door guards',()=>{
 const f=context(false,'m6-find');try{const b=f.art.parcels[0];assert.equal(b.visible,true);f.O.fpLoading.pick(f.state,'f1');f.art.sync(f.m);assert.equal(b.body.visible,false);assert.equal(b.visible,true);
  for(let n=0;n<8;n++)f.O.fpLoading.step(f.state,.05);f.art.sync(f.m);assert.equal(b.visible,false);
  f.m.cargoOpen=false;f.art.sync(f.m);assert.ok(f.art.slots.every(s=>!s.target.visible));assert.equal(f.art.restraint.visible,false);assert.ok(f.art.parcels.every(b=>!b.body.visible));
 }finally{f.art.dispose();}
});
test('secured floor parcels have a visible band over their top and straps down to the fitted floor',()=>{
 for(const high of [false,true]){const f=context(high);try{load(f);f.O.fpLoading.strap(f.state);f.art.sync(f.m);const parcel=f.art.parcels.find(b=>b.data.slotRef.id==='haz'),bands=f.art.batches[high?1:2].entries.filter(e=>e.color.getHex()===0xD4A83F);assert.equal(bands.length,3);assert.ok(bands[0].matrix.elements[13]>parcel.y+parcel.h/2+.001);for(const e of bands.slice(1))assert.ok(Math.abs(e.matrix.elements[13]-e.matrix.elements[5]/2-f.art.fit.floor)<1e-8);}
 finally{f.art.dispose();}}
});
test('repeated walking, carrying, placements and restraints reuse the exact fixed pools and dispose idempotently',()=>{
 for(const high of [false,true]){const f=context(high);try{const arrays=f.art.batches.map(b=>b.mesh.instanceMatrix.array),children=f.art.root.children.length;load(f);f.O.fpLoading.strap(f.state);for(let n=0;n<300;n++){
   Object.assign(f.m.player,{x:f.m.van.x+(n%3-1)*.1,z:f.m.van.z+(n%30)*.1,yaw:n/20});f.m.cargoOpen=n%2===0;f.art.sync(f.m);assert.equal(f.art.root.children.length,children);for(let i=0;i<arrays.length;i++)assert.equal(f.art.batches[i].mesh.instanceMatrix.array,arrays[i]);assert.ok(f.art.fixed.count<=96);assert.ok(f.art.moving.count<=128);for(const b of f.art.batches)assert.ok(b.mesh.material.map===null);for(const value of f.art.moving.instanceMatrix.array)assert.ok(Number.isFinite(value));
  }
 }finally{f.art.dispose();f.art.dispose();assert.equal(f.art.root.parent,null);assert.throws(()=>f.art.sync(f.m),/disposed/);}}
});
