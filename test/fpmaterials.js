/* Uploaded surface sources: High selects them, Low never requests them, failures stay local. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const THREE=require('../lib/three.min.js'),{install,local,root}=require('./tools/fpassets-context');
const uses=['surface-asphalt','surface-brick','surface-grass','surface-pavement','surface-plaster'];
function context(){const c={THREE:{...THREE}};c.window=c;vm.createContext(c);return {c,F:install(c)};}
function materialContext(){
 const {c,F}=context(),draws=[];c.document={createElement:()=>({width:0,height:0,getContext:()=>({drawImage(...args){draws.push(args);}})})};
 vm.runInContext(fs.readFileSync(path.join(root,'src/core/fpmaterials.js'),'utf8'),c);return {c,F,draws};
}
test('the real manifest keeps all five surface images exclusive to High',()=>{
 const {F}=context(),m=JSON.parse(fs.readFileSync(path.join(root,'assets/3d/manifest.json')));
 assert.deepEqual(Array.from(F.manifest(m.files,true),j=>j.use).filter(s=>s.startsWith('surface-')).sort(),uses);
 assert.equal(F.manifest(m.files,false).some(j=>j.use.startsWith('surface-')),false);
});
test('High preloads five bounded sources and releases their image handles once; Low requests none',async()=>{
 for(const high of [false,true]){
  const {F}=context(),requests=[],bank=await F.preload({high,fetch:url=>{requests.push(url);return local(url);}});
  assert.equal(bank.models.size,high?18:14);assert.equal(bank.textures.size,high?5:0);assert.equal(bank.stats.loaded,high?23:14);assert.equal(bank.stats.failed,0);
  assert.equal(requests.filter(u=>/\.jpg$/.test(u)).length,high?5:0);
  if(high)assert.ok(bank.stats.decodedBytes>=20*1024*1024&&bank.stats.decodedBytes<=64*1024*1024);
  const images=[...bank.textures.values()].map(t=>t.image);
  for(const image of images){assert.equal(image.width,1024);assert.equal(image.height,1024);assert.ok(!image.closed);}
  bank.dispose();bank.dispose();assert.ok(images.every(i=>i.closed&&i.closeCount===1));assert.equal(bank.textures.size,0);
 }
});
test('a missing surface leaves all models and the other material sources available',async()=>{
 const {F}=context(),bank=await F.preload({high:true,fetch:url=>url.includes('asphalt_pit_lane_diff')?Promise.resolve(new Response('',{status:404})):local(url)});
 assert.equal(bank.stats.loaded,22);assert.equal(bank.stats.failed,1);assert.equal(bank.models.size,18);assert.equal(bank.textures.size,4);assert.ok(!bank.textures.has('surface-asphalt'));bank.dispose();
});
test('the High atlas owns one bounded image and leaves UV-less bank geometry and source images unchanged',async()=>{
 const {c,F,draws}=materialContext(),bank=await F.preload({high:true,fetch:local});c.OTR.gfx={high:()=>true};
 const model=bank.models.get('town-house'),geometry=model.parts[0].geometry,attributes=Object.keys(geometry.attributes).sort();assert.ok(!geometry.hasAttribute('uv'));
 const surface=c.OTR.fpMaterials.build({assetBank:bank},'clear');assert.equal(surface.bytes,8*1024*1024);assert.equal(surface.atlas.colorSpace,THREE.NoColorSpace);assert.equal(draws.length,45);assert.equal(surface.atlas.image.width,2048);assert.equal(surface.atlas.image.height,1024);
 const a=new THREE.InstancedMesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true}),1),b=new THREE.InstancedMesh(geometry,a.material,1);
 surface.attach(a,[{surface:4}]);surface.attach(b,[{surface:5}]);assert.notEqual(a.geometry,geometry);assert.notEqual(b.geometry,geometry);assert.deepEqual(Object.keys(geometry.attributes).sort(),attributes);
 for(const mesh of [a,b]){
  const shader={vertexShader:THREE.ShaderLib.lambert.vertexShader,fragmentShader:THREE.ShaderLib.lambert.fragmentShader,uniforms:{}};mesh.material.onBeforeCompile(shader,{});assert.equal(shader.uniforms.otrSurfaceAtlas.value,surface.atlas);assert.ok(!mesh.material.map);assert.ok(mesh.geometry.hasAttribute('otrSurfaceKind'));
 }
 let closed=0;for(const item of [surface.atlas,...surface.paints,...surface.geometries])item.addEventListener('dispose',()=>closed++);const owned=1+surface.paints.length+surface.geometries.length;surface.dispose();surface.dispose();assert.equal(closed,owned);assert.ok([...bank.textures.values()].every(t=>!t.image.closed));bank.dispose();
});
test('Low and missing images keep the palette, and sign-shape attributes retain their live identity',async()=>{
 const {c,F}=materialContext(),bank=await F.preload({high:true,fetch:url=>url.includes('asphalt_pit_lane_diff')?Promise.resolve(new Response('',{status:404})):local(url)});c.OTR.gfx={high:()=>false};assert.equal(c.OTR.fpMaterials.build({assetBank:bank},'clear'),null);
 c.OTR.gfx.high=()=>true;const surfaces=c.OTR.fpMaterials.build({assetBank:bank},'snow'),g=new THREE.BoxGeometry(),signs=new THREE.InstancedBufferAttribute(new Float32Array([1,0]),1);g.setAttribute('otrSignShape',signs);const m=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial(),2),entries=[{surface:1},{surface:2}];const ids=surfaces.attach(m,entries);
 assert.deepEqual(Array.from(ids.array),[0,2]);assert.equal(m.geometry,g);assert.equal(m.geometry.getAttribute('otrSignShape'),signs);signs.setX(0,8);assert.equal(m.geometry.getAttribute('otrSignShape').getX(0),8);surfaces.dispose();bank.dispose();g.dispose();
});
