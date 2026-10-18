/* Sign data must agree with generated routes and the 3D stop obligations. No WebGL. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={THREE:require('../lib/three.min.js')};c.window=c;vm.createContext(c);
for(const name of ['data/theme.js','data/config.js','data/town.js','data/m3_doorsteps.js','data/m8_stops.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fproute.js','src/core/fpsigns.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+name,'utf8'),c);
c.OTR.save={data:{townSeed:1}};
const O=c.OTR,make=(day=1,variant=7)=>O.fpMission.create('campaign',variant,O.fpRoute.plan(day,variant));
test('signs are derived without changing the mission or its checkpoint',()=>{
 const m=make(),before=JSON.stringify(m.snapshot()),a=O.fpSigns.catalog(m),b=O.fpSigns.catalog(m);
 assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(JSON.stringify(m.snapshot()),before);
 assert.equal(O.fpSigns.catalog(null),null);assert.equal(O.fpSigns.catalog(O.fpMission.create('campaign',1)),null);
});
test('both actual street names appear at every junction after the rotated projection',()=>{
 const m=make(),a=O.fpSigns.catalog(m);assert.equal(a.streets.length,40);
 for(let row=0;row<m.town.xs.length;row++)for(let col=0;col<m.town.zs.length;col++){
  const h=a.streets.find(s=>s.id===`street:${row}:${col}:x`),v=a.streets.find(s=>s.id===`street:${row}:${col}:z`);
  assert.equal(h.name,c.OTR_DATA.town.streetsH[row]);assert.equal(v.name,c.OTR_DATA.town.streetsV[col]);
  assert.equal(h.x,v.x);assert.equal(h.z,v.z);assert.equal(O.fpRoute.onStreet(m,h.x,h.z),false);
 }
});
test('all four approach signs sit on the right and before their existing stop line',()=>{
 const m=make(),a=O.fpSigns.catalog(m);assert.equal(a.stops.length,m.junctions.length*4);
 for(const s of a.stops){const j=m.junctions[s.junction],fx=Math.sin(s.yaw),fz=-Math.cos(s.yaw),rx=Math.cos(s.yaw),rz=Math.sin(s.yaw);
  assert.ok((s.x-j.x)*rx+(s.z-j.z)*rz>m.town.road/2);
  assert.ok((s.line.x-s.x)*fx+(s.line.z-s.z)*fz>0);
  assert.ok(Math.abs((s.line.x-j.x)*fx+(s.line.z-j.z)*fz+m.town.road/2+.25)<1e-9);
 }
});
test('all delivered addresses keep their generated number and actual facade position',()=>{
 for(let day=1;day<=30;day++)for(const variant of [1,7,13]){const m=make(day,variant),a=O.fpSigns.catalog(m),ids=[...a.stops,...a.streets,...a.numbers].map(s=>s.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const stop of m.stops){const n=a.numbers.find(n=>n.lotId===stop.lotId);assert.ok(n);assert.equal(n.number+' '+n.street,stop.address);assert.equal(n.x,stop.x);assert.equal(n.z,stop.z);}
  assert.equal(a.limit,m.town.limit);assert.equal(a.schoolLimit,m.town.schoolLimit);
  assert.equal(a.school.from.x,m.town.school.x);assert.equal(a.school.to.x,m.town.school.x);
  assert.equal(a.school.from.z,m.town.school.z1);assert.equal(a.school.to.z,m.town.school.z0);
 }
});
test('later restrictions stay off day one and match their peripheral road segment',()=>{
 assert.ok(O.fpSigns.catalog(make(1)).regulatory.every(s=>!['oneway','noentry'].includes(s.kind)));
 const m=make(3),a=O.fpSigns.catalog(m),one=a.regulatory.find(s=>s.kind==='oneway'),no=a.regulatory.find(s=>s.kind==='noentry');
 assert.equal(one.from,no.from);assert.equal(one.to,no.to);assert.equal(one.roadZ,m.town.zs[0]);
 assert.ok(m.stops.every(s=>s.park.z!==one.roadZ));
});
test('Low shares one two-triangle surface and chooses at most five instances in any view',()=>{
 const T=c.THREE,m=make(3);O.gfx={high:()=>false};const entries=[],route=new T.Group(),art=O.fpSigns.build({},m,route,e=>entries.push(e));
 assert.ok(entries.length>120);assert.equal(art.limit,5);const cam=new T.PerspectiveCamera(68,16/9,.08,180),frustum=new T.Frustum();
 for(const stop of m.stops)for(let angle=-Math.PI;angle<Math.PI;angle+=.3){cam.position.set(stop.park.x,2,stop.park.z);cam.rotation.set(0,-angle,0);cam.updateMatrixWorld(true);frustum.setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));art.choose(cam,frustum,true);
  assert.ok(entries.filter(e=>e.signChosen).length<=5);assert.ok(entries.every(e=>!e.signChosen||(cam.position.x-e.x)*e.normal.x+(cam.position.z-e.z)*e.normal.z>=.1));
 }
 const plane=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),paint=new T.MeshLambertMaterial(),mesh=new T.InstancedMesh(plane,paint,entries.length),shapes=O.fpSigns.decorate(mesh,entries);
 assert.equal(mesh.geometry.index.count/3,2);assert.equal(shapes.count,entries.length);assert.notEqual(mesh.geometry,plane);assert.notEqual(mesh.material,paint);
 mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();plane.dispose();paint.dispose();
});
