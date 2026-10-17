const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcab.js','src/core/fpcamera.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fplighting.js','src/core/fpweather.js','src/core/fproute.js','src/core/fpday.js','src/core/fpdriving.js','src/core/fpbranding.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
 c.OTR.save={data:{townSeed:1}};
const O=c.OTR,W=O.fpWeather,make=()=>{const m=O.fpMission.create('campaign',7);m.mode='cab';m.paused=false;m.routeDay={weather:'rain'};return m;};
test('wipers clear the glass through the saved physical control without changing scoring or mission time',()=>{
 const m=make(),s=W.create();W.advance(s,m,false);O.fpCab.act(m,'cab-wipers');W.advance(s,m,false);assert.equal(s.clear,1);assert.equal(m.elapsed,0);assert.equal(m.van.wipers,true);m.elapsed=.1;W.advance(s,m,false);assert.notEqual(s.angle,-1.35);assert.equal(m.snapshot().weatherEffects,undefined);
});
test('pausing and reduced motion freeze cosmetic movement while the functional clearing state remains available',()=>{
 const m=make(),s=W.create();m.van.wipers=true;W.advance(s,m,false);m.elapsed=.1;W.advance(s,m,false);const at=s.time,angle=s.angle;m.paused=true;m.elapsed+=20;W.advance(s,m,false);assert.equal(s.time,at);assert.equal(s.angle,angle);m.paused=false;m.elapsed+=.1;W.advance(s,m,true);assert.equal(s.time,at);assert.equal(s.angle,-1.35);assert.equal(s.clear,1);
});
test('rain returns gradually after switching off, and a different mission resets cosmetic state',()=>{
 const m=make(),s=W.create();m.van.wipers=true;W.advance(s,m,false);m.van.wipers=false;m.elapsed=.1;W.advance(s,m,false);assert.ok(s.clear>0&&s.clear<1);for(let i=0;i<20;i++){m.elapsed+=.1;W.advance(s,m,false);}assert.equal(s.clear,0);const next=make();W.advance(s,next,false);assert.equal(s.time,0);assert.equal(s.model,next);
});
test('one physical windscreen belongs to the cab and only the main camera can draw it',()=>{
 const m=make(),camera=new THREE.PerspectiveCamera(),root=new THREE.Group(),scene={view:{camera}};const a=W.build(scene,{root});a.sync(m,'route');assert.equal(a.windscreen.visible,true);assert.equal(a.windscreen.parent,root);assert.equal(camera.layers.test(a.windscreen.layers),true);assert.equal(new THREE.PerspectiveCamera().layers.test(a.windscreen.layers),false);m.mode='walk';a.sync(m,'route');assert.equal(a.windscreen.visible,false);a.dispose();assert.equal(root.children.length,0);assert.equal(camera.layers.isEnabled(2),false);
});
test('clear weather draws no weather pane until the existing wiper switch is used, and disposal preserves other layer users',()=>{
 const m=make();m.routeDay.weather='clear';const camera=new THREE.PerspectiveCamera(),root=new THREE.Group();camera.layers.enable(2);const a=W.build({view:{camera}},{root});a.sync(m,'route');assert.equal(a.windscreen.visible,false);m.van.wipers=true;a.sync(m,'route');assert.equal(a.windscreen.visible,true);a.sync(m,'hub');assert.equal(a.windscreen.visible,false);a.dispose();assert.equal(camera.layers.isEnabled(2),true);
});
function full(condition,high=false){O.gfx={high:()=>high};const plan=O.fpRoute.plan(4,7);plan.weather=condition;const m=O.fpMission.create('campaign',7,plan);O.fpDay.configure(m);m.mode='cab';m.paused=false;const camera=new THREE.PerspectiveCamera(68,16/9,.08,180),world=new THREE.Scene();world.add(camera);const s={model:m,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera()}}};s.art=O.fpWorld.build(s,m);s.sync=()=>s.art.sync(m,null,'route');s.sync();return s;}
test('all weather variants preserve the mission snapshot and scores while preserving fog limits and the first morning',()=>{
 for(const w of ['clear','cloudy','rain','storm','fog','snow','ice','heat']){const s=full(w);const before=JSON.stringify(s.model.snapshot());O.workday.begin();for(let i=0;i<5;i++)s.sync();assert.equal(JSON.stringify(s.model.snapshot()),before,w);assert.equal(O.workday.events.length,0);assert.ok(O.fpMission.restore(s.model.snapshot()));if(w==='clear')assert.equal(s.art.weatherEffects.surfaces,null);if(w==='fog'){assert.equal(s.art.weatherEffects.surfaces.uniforms.mist.value,1);}s.art.dispose();assert.equal(s.view.world.children.length,1);}
});
test('snow and ice have ground/frost cues; the hub and disposal restore shared material hooks',()=>{
 for(const high of [false,true])for(const w of ['rain','snow','ice','fog']){const s=full(w,high),surface=s.art.weatherEffects.surfaces;assert.ok(surface.hooks.size>0);const material=[...surface.hooks.keys()][0],hook=material.onBeforeCompile;assert.match(material.customProgramCacheKey(),/weather-surfaces/);s.art.sync(s.model,{x:0,z:4.6,yaw:0,pitch:0},'hub');for(const k of ['wet','snow','ice','mist'])assert.equal(surface.uniforms[k].value,0);s.sync();if(w==='snow'||w==='ice')assert.equal(s.art.weatherEffects.uniforms.frost.value,1);s.art.dispose();assert.notEqual(material.onBeforeCompile,hook);assert.equal(material.onBeforeCompile,THREE.Material.prototype.onBeforeCompile);}
});
test('rain and snow use the existing bounded batch with two triangles per particle and no image texture',()=>{
 for(const w of ['rain','snow','ice']){const s=full(w),p=s.art.weatherParticles;assert.ok(p);assert.equal(p.mesh.geometry.index.count,6);assert.ok(Math.abs(p.mesh.geometry.attributes.normal.getZ(0)-1)<1e-7,'billboard faces the camera rather than lying on the road');assert.ok(p.mesh.count<=18);assert.equal(p.mesh.material.map,undefined);assert.equal(p.mesh.castShadow,false);s.art.dispose();}
});
test('cold breath appears ahead of the walking courier, and ice particles hide in a stationary cab',()=>{
 const s=full('ice'),p=s.art.weatherParticles,m=s.model;assert.equal(p.mesh.visible,false);m.mode='walk';Object.assign(m.player,{x:20,z:10,yaw:0});s.sync();const a=new THREE.Matrix4();p.mesh.getMatrixAt(0,a);assert.ok(a.elements[14]<10&&a.elements[14]>8);assert.ok(a.elements[13]>=1.47);assert.equal(p.mesh.visible,true);s.art.dispose();
});
test('tire spray trails the actual direction of travel from the wheels, including reverse',()=>{
 const s=full('rain'),m=s.model,p=s.art.weatherParticles,a=new THREE.Matrix4();m.elapsed=.2;m.van.speed=4;s.sync();p.mesh.getMatrixAt(0,a);const forward=a.elements[14]-m.van.z;m.van.speed=-4;s.sync();p.mesh.getMatrixAt(0,a);assert.ok(forward>1.7);assert.ok(a.elements[14]-m.van.z<1.7);s.art.dispose();
});
test('reduced motion freezes every precipitation and breath matrix, plus surface ripples',()=>{
 const s=full('snow');O.fpAccess={reduced:()=>true};s.model.mode='walk';s.sync();const before=[...s.art.weatherDrops.instanceMatrix.array];s.model.elapsed=100;s.sync();assert.deepEqual([...s.art.weatherDrops.instanceMatrix.array],before);assert.equal(s.art.weatherEffects.surfaces.uniforms.clock.value,0);s.art.dispose();delete O.fpAccess;
});
