const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const THREE=require('../lib/three.min.js'),{install,local:assetLocal,root}=require('./tools/fpassets-context');
function context(){const c={THREE:{...THREE}};c.window=c;vm.createContext(c);return {c,F:install(c)};}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/3d/manifest.json')));manifest.files=manifest.files.filter(f=>f.use==='town-garage');
const local=url=>url.endsWith('manifest.json')?Promise.resolve(new Response(JSON.stringify(manifest))):assetLocal(url);
const bytes=quality=>fs.readFileSync(path.join(root,'assets/3d',manifest.files.find(f=>f.quality===quality).path));
test('the real vendored loader selects Low and High and parses the bundled CC0 variants',async()=>{
 for(const high of [false,true]){const {F}=context(),requests=[],progress=[];
  const bank=await F.preload({high,fetch:async(url,init)=>{requests.push(url);assert.equal(init.redirect,'error');return local(url);},progress:n=>progress.push(n)});
  assert.equal(bank.stats.loaded,1,JSON.stringify(bank.stats));assert.equal(bank.stats.failed,0);assert.equal(bank.stats.fallbacks,0);
  const model=bank.models.get('town-garage');assert.equal(model.parts.length,1);assert.equal(model.parts[0].geometry.index.count/3,high?196:16);assert.ok(!model.parts[0].material.map);
  if(!high){const p=model.parts[0].geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i))<.001||Math.abs(p.getY(i)-.55)<.001,'Low retains the source flat roof');}
  assert.ok(requests.some(r=>r.endsWith(high?'garage-high.glb':'garage-low.glb')));assert.ok(!requests.some(r=>r.endsWith(high?'garage-low.glb':'garage-high.glb')));
  assert.equal(progress[0],0);assert.equal(progress.at(-1),1);assert.ok(progress.every((n,i)=>n>=0&&n<=1&&(!i||n>=progress[i-1])));bank.dispose();
 }
});
test('two repeated models share geometry and material, fit their existing footprint and remain visible after compaction',async()=>{
 const {F}=context(),bank=await F.preload({fetch:local}),parent=new THREE.Group(),positions=[{x:10,y:2,z:-8,w:6,h:4,d:8},{x:100,y:0,z:-80,w:6,h:4,d:8}];
 const group=bank.add(parent,'town-garage',positions),mesh=group.children[0],source=bank.models.get('town-garage').parts[0];assert.ok(mesh.isInstancedMesh);assert.equal(mesh.count,2);assert.equal(mesh.geometry,source.geometry);assert.equal(mesh.material,source.material);
 const matrix=new THREE.Matrix4();mesh.getMatrixAt(0,matrix);const box=mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
 assert.ok(Math.abs(box.min.x-7)<.001&&Math.abs(box.max.x-13)<.001);assert.ok(Math.abs(box.min.y-2)<.001&&Math.abs(box.max.y-6)<.001);assert.ok(Math.abs(box.min.z+12)<.001&&Math.abs(box.max.z+4)<.001);
 bank.cull(group,100,-80,20);assert.equal(mesh.count,1);mesh.getMatrixAt(0,matrix);assert.ok(Math.abs(matrix.elements[12]-100)<.001);
 bank.cull(group,10,-8,20);assert.equal(mesh.count,1);mesh.getMatrixAt(0,matrix);assert.ok(Math.abs(matrix.elements[12]-10)<.001);
 bank.cull(group,-100,-100,10);assert.equal(mesh.visible,false);bank.cull(group,10,-8,20);assert.equal(mesh.visible,true);
 let disposed=0;source.geometry.addEventListener('dispose',()=>disposed++);bank.dispose();bank.dispose();assert.equal(disposed,1);assert.equal(bank.add(parent,'town-garage',positions),null);
});
test('missing, truncated and wrong-size files retain the procedural fallback without blocking completion',async()=>{
 for(const failure of ['missing','truncated','size','manifest']){const {F}=context(),bank=await F.preload({fetch:async url=>{
  if(url.endsWith('manifest.json'))return failure==='manifest'?new Response('bad JSON'):local(url);
  if(failure==='missing')return new Response('',{status:404});const b=bytes('low');return new Response(failure==='truncated'?b.subarray(0,20):Buffer.concat([b,Buffer.from([0])]));
 }});assert.equal(bank.stats.loaded,0);assert.ok(bank.stats.failed>0);assert.equal(bank.stats.fallbacks,0);assert.equal(bank.add(new THREE.Group(),'town-garage',[{}]),null);bank.dispose();}
});
test('High can fall back to the Low variant, while Low never fetches High',async()=>{
 for(const missing of [true,false]){const {F}=context(),requests=[],progress=[],bank=await F.preload({high:true,progress:n=>progress.push(n),fetch:async url=>{
  requests.push(url);if(url.endsWith('manifest.json'))return local(url);
  if(url.endsWith('garage-high.glb')){if(missing)return new Response('',{status:404});const b=bytes('high');b.writeUInt32LE(0,0);return new Response(b);}
  const b=bytes('low');return new Response(new ReadableStream({start(c){c.enqueue(b.subarray(0,16));c.enqueue(b.subarray(16));c.close();}}));
 }});assert.equal(bank.stats.loaded,1);assert.equal(bank.stats.failed,0);assert.equal(bank.stats.fallbacks,1);assert.equal(bank.models.get('town-garage').parts[0].geometry.index.count/3,16);assert.ok(requests.some(r=>r.endsWith('garage-low.glb')));assert.ok(progress.every((n,i)=>!i||n>=progress[i-1]));bank.dispose();}
});
test('unlisted paths, duplicate variants and byte budgets fail before an asset request',async()=>{
 for(const mutate of [f=>f.path='https://example.test/model.glb',f=>f.path='../model.glb',f=>f.path='pack/%2e%2e/model.glb',f=>f.bytes=3*1024*1024+1,f=>f.pack='other']){
  const {F}=context(),copy=structuredClone(manifest),requests=[];mutate(copy.files[0]);const bank=await F.preload({fetch:async url=>{requests.push(url);return new Response(JSON.stringify(copy));}});
  assert.equal(requests.length,1);assert.equal(bank.stats.loaded,0);assert.equal(bank.stats.failed,1);bank.dispose();
 }
 const {F}=context();assert.throws(()=>F.manifest([manifest.files[0],{...manifest.files[0],path:manifest.files[0].path.replace('low','other')}],false),/Duplicate/);
 const many=Array.from({length:6},(_,i)=>({...manifest.files[0],path:'pack/model'+i+'.glb',pack:'pack',use:'model'+i,bytes:3*1024*1024}));assert.throws(()=>F.manifest(many,false),/over budget/);
});
function editedGLB(buffer,change){const size=buffer.readUInt32LE(12),json=JSON.parse(buffer.subarray(20,20+size));change(json);let text=Buffer.from(JSON.stringify(json));text=Buffer.concat([text,Buffer.alloc(-text.length&3,32)]);const bin=buffer.subarray(20+size),header=Buffer.alloc(20);buffer.copy(header,0,0,12);header.writeUInt32LE(20+text.length+bin.length,8);header.writeUInt32LE(text.length,12);header.writeUInt32LE(0x4e4f534a,16);return Buffer.concat([header,text,bin]);}
test('external GLB buffers/images, unsupported compression and oversized decoded arrays never reach the parser',async()=>{
 const edits=[j=>j.buffers[0].uri='https://example.test/data.bin',j=>j.images=[{uri:'file.png'}],j=>j.extensionsRequired=['KHR_draco_mesh_compression'],j=>j.accessors[0].count=100000000,j=>j.accessors[0].count=1000000];
 for(const edit of edits){const {F,c}=context();let parsed=0;c.THREE.GLTFLoader=class{parseAsync(){parsed++;throw Error('Should not parse');}};
  const b=editedGLB(bytes('low'),edit),entry={...manifest.files[0],bytes:b.length};const bank=await F.preload({fetch:async url=>new Response(url.endsWith('manifest.json')?JSON.stringify({version:1,files:[entry]}):b)});
  assert.equal(parsed,0);assert.equal(bank.stats.loaded,0);assert.equal(bank.stats.failed,1);bank.dispose();
 }
});
test('embedded images keep the 1k/2k dimension limits and the two-megabyte encoded texture budget',()=>{
 const {F}=context();
 const withImage=(size,width)=>{
  const source=bytes('low'),n=source.readUInt32LE(12),json=JSON.parse(source.subarray(20,20+n)),old=source.subarray(28+n),image=Buffer.alloc(size);
  image.writeUInt32BE(0x89504e47,0);image.writeUInt32BE(0x0d0a1a0a,4);image.writeUInt32BE(width,16);image.writeUInt32BE(1,20);
  json.images=[{bufferView:json.bufferViews.length,mimeType:'image/png'}];json.bufferViews.push({buffer:0,byteOffset:old.length,byteLength:image.length});
  let bin=Buffer.concat([old,image]);bin=Buffer.concat([bin,Buffer.alloc(-bin.length&3)]);json.buffers[0].byteLength=bin.length;
  let text=Buffer.from(JSON.stringify(json));text=Buffer.concat([text,Buffer.alloc(-text.length&3,32)]);
  const header=Buffer.alloc(20);source.copy(header,0,0,12);header.writeUInt32LE(28+text.length+bin.length,8);header.writeUInt32LE(text.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const chunk=Buffer.alloc(8);chunk.writeUInt32LE(bin.length,0);chunk.writeUInt32LE(0x004e4942,4);const b=Buffer.concat([header,text,chunk,bin]);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
 };
 assert.ok(F.validateGLB(withImage(24,1024),false)>0);assert.throws(()=>F.validateGLB(withImage(24,2048),false),/Image is over budget/);assert.ok(F.validateGLB(withImage(24,2048),true)>0);
 assert.throws(()=>F.validateGLB(withImage(2*1024*1024+1,1),true),/oversized image/);
});
test('an unavailable loader, a network timeout and external cancellation all return safely',async()=>{
 const {F}=context();F.loader=async()=>{throw Error('Missing loader');};let bank=await F.preload({fetch:local});assert.equal(bank.stats.loaded,0);assert.equal(bank.stats.failed,1);bank.dispose();
 const slow=(_url,{signal})=>new Promise((_,reject)=>{signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true});});
 const a=context();bank=await a.F.preload({fetch:slow,timeout:20});assert.equal(bank.stats.loaded,0);assert.ok(bank.stats.failed);bank.dispose();
 const controller=new AbortController(),promise=a.F.preload({fetch:slow,signal:controller.signal});controller.abort();bank=await promise;assert.equal(bank.models.size,0);assert.equal(bank.add(new THREE.Group(),'town-garage',[{}]),null);
});
test('late decoder completion after cancellation releases geometry and material exactly once',async()=>{
 const {F,c}=context();let complete,started;const decoding=new Promise(resolve=>started=resolve);c.THREE.GLTFLoader=class{parseAsync(){started();return new Promise(resolve=>complete=resolve);}};
 const controller=new AbortController(),pending=F.preload({fetch:local,signal:controller.signal});await decoding;controller.abort();const bank=await pending;assert.equal(bank.models.size,0);
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),root=new THREE.Group();root.add(mesh);let geometry=0,material=0;mesh.geometry.addEventListener('dispose',()=>geometry++);mesh.material.addEventListener('dispose',()=>material++);
 complete({scene:root});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(geometry,1);assert.equal(material,1);bank.dispose();
});

test('a missing real High van is counted as a recovered model fallback',async()=>{
 const {F}=context(),bank=await F.preload({high:true,fetch:url=>url.endsWith('/delivery-high.glb')?Promise.resolve(new Response('',{status:404})):assetLocal(url)});assert.equal(bank.stats.loaded,19);assert.equal(bank.models.size,14);assert.equal(bank.textures.size,5);assert.equal(bank.stats.failed,0);assert.equal(bank.stats.fallbacks,1);assert.ok(bank.models.has('van-exterior'));assert.ok(bank.stats.errors.some(e=>e.path.endsWith('/delivery-high.glb')));bank.dispose();
});
