/* Component-only CPU surfaces, fitted local assets, visible rays, stable pools and private disposal. */
const test=require('node:test'),assert=require('node:assert/strict'),{c,O,THREE,S,fixture}=require('./tools/fp-wellness-world-context')(),{install,local}=require('./tools/fpassets-context'),assets=install(c);
test('all nine loaded/fallback Low/High safety components have stable bounded surface buffers and private disposal',async()=>{
 let stops=0;const peaks={fixed:0,moving:0};
 for(const high of [false,true]){O.gfx={high:()=>high};const bank=await assets.preload({high,fetch:local});try{for(const loaded of [true,false])for(const id of ['m8-steps','m8-dog','m8-heat'])for(let index=0;index<3;index++){
  const scene=fixture(id,index,{bank:loaded?bank:null}),{world,m,d}=scene,w=world.wellness,arrays=[w.fixed.instanceMatrix.array,w.moving.instanceMatrix.array],children=world.root.children.length;
  try{
   assert.equal(world.imports.length,loaded?1:0);assert.equal(!!world.human,loaded&&!!d.def.answer);assert.equal(w.words.mesh.material.map,null);assert.ok(w.words.mesh.instanceMatrix.array.byteLength<=(high?131072:8192));
   for(const plaque of world.plates)assert.ok(Math.abs(plaque.z-.024-plaque.wall)<1e-8);
   for(let n=0;n<100;n++){
    m.customerStage.time=m.wellnessStage.time=n/20;d.state.answered=!!d.def.answer&&n%2===0;if(d.wellness.ref.gate)d.wellness.ref.gate.open=n%2===0;
    if(d.wellness.ref.dog){d.wellness.ref.dog.setMood(n%2?'fearful':'aggressive');d.wellness.ref.dogGone=n%3===0;}
    scene.sync();assert.equal(world.root.children.length,children);assert.equal(w.fixed.instanceMatrix.array,arrays[0]);assert.equal(w.moving.instanceMatrix.array,arrays[1]);
    assert.ok(w.fixed.count<=128&&w.moving.count<=96);for(const value of arrays[1])assert.ok(Number.isFinite(value));peaks.fixed=Math.max(peaks.fixed,w.fixed.count);peaks.moving=Math.max(peaks.moving,w.moving.count);
   }
   assert.equal(m.wellnessStage.interiorBuilt,!!d.def.lot.interior);stops++;
  }finally{let disposed=0;const shared=bank.models.get('town-house').parts[0].geometry;shared.addEventListener('dispose',()=>disposed++);world.dispose();world.dispose();assert.equal(disposed,0);assert.equal(world.root.parent,null);assert.equal(m.wellnessStage.interiorBuilt,false);}
 }}finally{bank.dispose();}}
 assert.equal(stops,36);console.log(JSON.stringify({loadedFallbackQualityStops:stops,extraInstancePeaks:peaks}));
});
test('clutter targets occupy their real surface and disappear only after the original clear callback',()=>{
 O.gfx={high:()=>false};const scene=fixture('m8-steps',1),{world,m,d}=scene;try{
  for(const h of world.wellness.hazards.filter(h=>h.target)){
   const p=h.target.position,b=h.surface;assert.ok(Math.abs(p.x-b.x)<.4);assert.ok(Math.abs(p.z-b.z)<.5);assert.ok(p.y>=b.y&&p.y<b.y+.2);
   assert.equal(scene.pick(h.target.userData.interaction,b.x,b.z+1.65),h.target.userData.interaction);
   Object.assign(m.player,{x:b.x,z:b.z+1});assert.equal(S.clear(m,b.id),true);scene.sync();assert.equal(h.target.visible,false);assert.equal(d.state.hazards[b.id].state,'cleared');
   for(let n=0;n<10;n++)O.fpWellnessStop.step(d,.05);
  }
 }finally{world.dispose();}
});
test('a gate and its opened panel share collision geometry, while the owner remains on the ground at the gate',()=>{
 const scene=fixture('m8-dog'),{m,d,world}=scene;try{
  assert.equal(scene.pick('wellness-gate',12,-38.8),'wellness-gate');assert.equal(m.blocked(12,-40.6),true);
  d.wellness.ref.gate.open=true;d.wellness.ownerAtGate=true;d.state.answered=true;scene.sync();assert.equal(world.wellness.gate.visible,false);assert.equal(m.blocked(12,-40.6),false);
  assert.equal(m.blocked(11.25,-41.35),true,'the opened gate panel still blocks walking');assert.equal(world.person.position.y,1.55);assert.equal(world.person.position.z,-40.82);
  assert.equal(scene.pick('customer-stop-person',12.8,-38.9),'customer-stop-person');
 }finally{world.dispose();}
});
test('clinic vestibule has walls, a roof and a walkable entry before supplying interior cooling facts',()=>{
 const scene=fixture('m8-heat',2),{m,world}=scene,s=m.wellnessStage;try{
  assert.equal(s.interiorBuilt,true);assert.equal(m.blocked(12,s.wall+1.12),false,'the middle doorway remains physically open');assert.equal(m.blocked(10.5,s.wall+1.12),true);assert.equal(m.blocked(14.45,s.wall+.6),true);
  Object.assign(m.player,{x:12,z:s.wall+.7});S.observe(m,{careful:false},.05);assert.equal(s.facts.interior,true);assert.equal(m.blocked(m.player.x,m.player.z),false);
  assert.equal(world.person.position.x,13.4);assert.equal(world.person.position.z,s.wall+.35);
 }finally{world.dispose();}
});
test('hose segments join, and the wet-entry surface rests on the actual porch instead of floating over a stair',()=>{
 const clutter=fixture('m8-steps',1);try{const h=clutter.world.wellness.hazards.find(h=>h.surface.id==='hose');assert.equal(h.hose.length,8);
  for(let i=0;i<h.hose.length;i++){const a=h.hose[i],b=h.hose[(i+1)%h.hose.length],ax=a.x+Math.cos(a.angle)*(a.w-.03)/2,az=a.z-Math.sin(a.angle)*(a.w-.03)/2,bx=b.x-Math.cos(b.angle)*(b.w-.03)/2,bz=b.z+Math.sin(b.angle)*(b.w-.03)/2;assert.ok(Math.hypot(ax-bx,az-bz)<1e-8);}
 }finally{clutter.world.dispose();}
 const entry=fixture('m8-steps',2);try{const h=entry.m.wellnessStage.hazards.find(h=>h.id==='puddle');for(const x of [-1,1])for(const z of [-1,1])assert.equal(O.fpScannerStopWorld.ground(entry.m,h.x+x*h.w/2,h.z+z*h.d/2),h.y);}finally{entry.world.dispose();}
});
test('a fearful dog has pinned ears, a low body and tucked tail while all feet remain at ground level',()=>{
 const scene=fixture('m8-dog',2);try{const w=scene.world.wellness,m=scene.m,d=scene.d,matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3();d.wellness.ref.dogGone=false;d.wellness.ref.dog.setAlpha(1);d.wellness.ref.dog.setMood('fearful');scene.sync();assert.equal(w.moving.count,13);
  for(const index of [3,7]){w.moving.getMatrixAt(index,matrix);matrix.decompose(p,q,scale);assert.ok(scale.y<.07&&scale.z>.24,'ears lie back rather than standing upright');}
  for(const index of [4,5,8,9]){w.moving.getMatrixAt(index,matrix);matrix.decompose(p,q,scale);assert.ok(Math.abs(p.y-scale.y/2)<1e-6);}
  w.moving.getMatrixAt(11,matrix);matrix.decompose(p,q,scale);assert.ok(scale.y<.07&&scale.z>.23,'tail lies low beneath the hindquarters');
  d.wellness.ref.dog.setMood('alert');scene.sync();w.moving.getMatrixAt(3,matrix);matrix.decompose(p,q,scale);assert.ok(scale.y>.19);
 }finally{scene.world.dispose();}
});
