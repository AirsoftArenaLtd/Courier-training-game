/* C-28 preparation only: real GLB/rig/clip parsing and a CPU Wave pose. No game scene or GPU. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),folder=process.argv[2];if(!folder)throw Error('Pass the prepared actor directory.');
const c=vm.createContext({console,setTimeout,clearTimeout});c.window=c;c.self=c;vm.runInContext(fs.readFileSync(root+'/lib/three.min.js','utf8'),c);
const F=require('./fpassets-context').install(c),manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json')));
(async()=>{const rows=[];
 for(const f of manifest.files){
  const fetcher=async()=>new Response(fs.readFileSync(path.join(folder,f.path))),data=await F.read(f.path,f.bytes,new AbortController().signal,fetcher),decoded=F.validateGLB(data,true),gltf=await new c.THREE.GLTFLoader().parseAsync(data,'');gltf.scene.updateMatrixWorld(true);
  const bones=[],meshes=[];gltf.scene.traverse(o=>{if(o.isBone)bones.push(o);if(o.isMesh)meshes.push(o);});assert.ok(meshes.length);assert.ok(meshes.every(m=>!m.material.map));
  const box=new c.THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new c.THREE.Vector3());assert.ok([size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>0));let moved=false;
  if(f.use.startsWith('worker-')){
   assert.deepEqual(Array.from(gltf.animations,a=>a.name).sort(),['Idle_Neutral','Interact','Walk','Wave']);assert.ok(bones.length>0);assert.ok(meshes.every(m=>m.isSkinnedMesh));
   const before=bones.map(b=>Array.from(b.matrixWorld.elements)),mixer=new c.THREE.AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations.find(a=>a.name==='Wave')).play();mixer.update(.5);gltf.scene.updateMatrixWorld(true);
   moved=bones.some((b,i)=>b.matrixWorld.elements.some((n,j)=>Math.abs(n-before[i][j])>.00001));assert.ok(moved);mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);
  }else{assert.equal(gltf.animations.length,0);assert.equal(meshes.length,1);}
  rows.push({use:f.use,bytes:f.bytes,decodedBytes:decoded,triangles:meshes.reduce((n,m)=>n+(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3,0),parts:meshes.length,bones:bones.length,clips:Array.from(gltf.animations,a=>a.name),waveChangesBones:moved,size:{x:size.x,y:size.y,z:size.z}});F.release(gltf);
 }console.log(JSON.stringify({fixture:'Source preparation only. The runtime/Low adapters, livery and controls integration remain pending.',models:rows},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
