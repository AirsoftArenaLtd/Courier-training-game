/* Real geometry, face orientation/visibility, occlusion, finite resource pools and physical clearances. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const file of ['data/theme.js','data/m2_labels.js','src/core/fpsignlettering.js','src/core/fppackagelabelworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);
const A=c.OTR.fpPackageLabelWorld,items=c.OTR_DATA.labels.items;
function fixture(){const scene=new THREE.Scene(),interactions=[],occluders=[],cube=new THREE.BoxGeometry(),art=A.build(scene,{interactions,occluders,cube}),camera=new THREE.PerspectiveCamera(68,16/9,.08,50);scene.add(camera);camera.position.set(-10,1.65,A.center.z+2);camera.lookAt(art.parcel.position);scene.updateMatrixWorld(true);return {scene,art,camera,interactions,occluders,cube};}
test('every face, including base-only damage, turns physically toward the inspection position',()=>{
 const f=fixture();f.art.setItem(items.find(i=>i.damage?.face==='base'));const transforms=[];
 for(const face of ['front','right','back','left','top','base']){assert.equal(f.art.turn(face),true);assert.equal(f.art.visible(face,f.camera),true,face);transforms.push(f.art.parcel.matrixWorld.toArray().join(','));for(const other of ['front','right','back','left','top','base'].filter(s=>s!==face))assert.equal(f.art.visible(other,f.camera),false,face+' hides '+other);}
 assert.equal(new Set(transforms).size,6);assert.equal(f.art.turn('inside'),false);assert.equal(f.art.currentFace(),'base');f.art.dispose();f.cube.dispose();
});
test('inspection requires the whole face on screen, proximity and unobstructed real rays',()=>{
 const f=fixture();f.art.setItem(items[0]);assert.equal(f.art.visible('front',f.camera),true);
 f.camera.position.z=A.center.z+4;f.camera.lookAt(f.art.parcel.position);assert.equal(f.art.visible('front',f.camera),false,'too far');
 f.camera.position.z=A.center.z+2;f.camera.lookAt(new THREE.Vector3(-5,1.65,A.center.z+2));assert.equal(f.art.visible('front',f.camera),false,'looking away');
 f.camera.lookAt(f.art.parcel.position);const wall=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.05),new THREE.MeshBasicMaterial());wall.position.set(-10,1.65,A.center.z+1);f.scene.add(wall);f.scene.updateMatrixWorld(true);assert.equal(f.art.visible('front',f.camera,[wall]),false,'centre blocked');
 wall.position.set(-9.8,1.85,A.center.z+1);f.scene.updateMatrixWorld(true);assert.equal(f.art.visible('front',f.camera,[wall]),false,'one printed corner blocked');
 wall.visible=false;assert.equal(f.art.visible('front',f.camera,[wall]),true,'invisible proxy does not block');
 f.art.root.visible=false;assert.equal(f.art.visible('front',f.camera),false);f.art.root.visible=true;f.art.setItem(null);assert.equal(f.art.visible('front',f.camera),false);f.art.dispose();wall.geometry.dispose();wall.material.dispose();f.cube.dispose();
});
test('all original package marks and damage render in one bounded coloured geometry with no image maps',()=>{
 const f=fixture();let peak=0,disposals=0;const encoded=new Map();
 for(const item of items){const previous=f.art.parcel.children[0]?.geometry;if(previous)previous.addEventListener('dispose',()=>disposals++);f.art.setItem(item);const g=f.art.parcel.children[0].geometry,position=g.getAttribute('position'),colour=g.getAttribute('color');assert.equal(position.count,colour.count);assert.ok([...position.array,...colour.array].every(Number.isFinite));assert.equal(position.count%3,0);peak=Math.max(peak,position.count/3);encoded.set(JSON.stringify(item.marks)+JSON.stringify(item.damage),Array.from(position.array).join(','));assert.equal(f.art.parcel.children.length,1);assert.equal(f.art.parcel.children[0].material.vertexColors,true);assert.equal(f.art.parcel.children[0].material.map,null);}
 assert.equal(disposals,items.length-1);assert.equal(encoded.size,items.length);assert.ok(peak<600,'bounded parcel triangles: '+peak);
 assert.ok(f.art.stationMesh.geometry.getAttribute('position').count/3<600,'bounded station geometry');const count=f.art.root.children.length;
 for(let i=0;i<200;i++){f.art.setItem(items[i%items.length]);f.art.turn(['front','right','back','left','top','base'][i%6]);}assert.equal(f.art.root.children.length,count);assert.equal(f.art.parcel.children.length,1);f.art.dispose();f.art.dispose();assert.equal(f.art.root.parent,null);f.cube.dispose();
});
test('seven numbered physical targets fit the depot, retain their occluders and leave a walkable aisle',()=>{
 const f=fixture();assert.equal(f.interactions.length,7);assert.equal(new Set(f.interactions.map(o=>o.userData.interaction)).size,7);const ray=new THREE.Raycaster();ray.layers.enable(1);
 for(const target of f.interactions){const p=target.getWorldPosition(new THREE.Vector3()),eye=p.clone().add(new THREE.Vector3(0,0,1.5));ray.set(eye,p.clone().sub(eye).normalize());ray.far=2.65;assert.equal(ray.intersectObjects(f.occluders,false)[0].object.userData.interaction,target.userData.interaction);assert.ok(p.x>=-19&&p.x<=9&&p.z>=-8&&p.z<=22);}
 const solids=A.solids();assert.equal(solids.length,7);assert.ok(solids.every(s=>s.w>0&&s.d>0));assert.ok(A.center.z-1.1/2-(A.stationPoint('belt').z+1.1/2)>1.3,'aisle between the table and stations');assert.equal(A.stationPoint('unknown'),null);f.art.dispose();f.cube.dispose();
});
