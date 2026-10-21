/* Physical walkaround proxies follow Low, High and missing-model van surfaces. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const THREE=require('../lib/three.min.js'),{install,local}=require('./tools/fpassets-context');
const c={THREE};c.window=c;vm.createContext(c);
for(const file of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js',
 'src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js',
 'src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fproute.js','src/core/fplater.js','src/core/fpdriving.js','src/core/fploadout.js','src/core/fpday.js','src/core/fpdoors.js','src/core/fpstops.js','src/core/fpstopflow.js','src/core/fpstopscene.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fprear.js','src/core/fplighting.js','src/core/fpweather.js','src/core/fptown.js','src/core/fpsigns.js','src/core/fptraffic.js','src/core/fpnav.js','src/core/fpactors.js','src/core/fpdamage.js','src/core/fpdamageflow.js','src/core/fpwalkaround.js','src/core/fpwalkaroundflow.js','src/core/fpdamageworld.js','src/core/fpworld.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),c);

Object.assign(c.OTR.fpWalkaroundFlow.target('rear'),{x:-.18,w:.3});
c.OTR.save={data:{townSeed:1}};const F=install(c),banks={};
test.before(async()=>{for(const high of [false,true])banks[high]=await F.preload({high,fetch:local});});
test.after(()=>Object.values(banks).forEach(b=>b.dispose()));
for(const profile of ['low','high','fallback'])test(profile+': every ground-level inspection selects a nearby rendered van surface',()=>{
 const high=profile==='high',O=c.OTR;O.gfx={high:()=>high};
 let plan=O.fpStopFlow.prepare(O.fpRoute.plan(4,8),true);plan=O.fpWalkaroundFlow.prepare(O.fpDamageFlow.prepare(O.fpLater.prepare(plan)));
 const m=O.fpMission.create('campaign',8,plan),camera=new THREE.PerspectiveCamera(68,16/9,.08,180),world=new THREE.Scene();world.add(camera);O.fpDoors.configure(m);
 const scene={assetBank:profile==='fallback'?null:banks[high],view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}}},art=O.fpWorld.build(scene,m);
 try{
  const door=art.interactions.find(o=>o.userData.interaction==='cargo'&&o.position.x===0);
  Object.assign(m.player,O.fp.local(m.van,0,4));art.sync(m,null,'route');camera.position.set(m.player.x,1.65,m.player.z);camera.lookAt(door.getWorldPosition(new THREE.Vector3()));camera.updateMatrixWorld(true);assert.equal(art.pick(),'cargo','the cargo-door centre stays selectable before loading');
  const handle=art.interactions.find(o=>o.userData.interaction==='cargo'&&o.position.x>1);
  Object.assign(m.player,O.fp.local(m.van,1.15,3.6));art.sync(m,null,'route');camera.position.set(m.player.x,1.65,m.player.z);camera.lookAt(handle.getWorldPosition(new THREE.Vector3()));camera.updateMatrixWorld(true);assert.equal(art.pick(),'cargo','the existing cargo handle stays selectable');
  m.cargoOpen=true;art.sync(m,null,'route');assert.equal(art.walkaroundTargets.find(o=>o.userData.interaction==='wear-rear').visible,false);m.cargoOpen=false;
  for(const t of O.fpWalkaroundFlow.targets){
   const point=O.fp.local(m.van,t.x+(t.zone==='right'?.85:['front','rear'].includes(t.zone)?0:-.85),t.z+(t.zone==='front'?-.85:t.zone==='rear'?.85:0));Object.assign(m.player,point);
   art.sync(m,null,'route');const proxy=art.walkaroundTargets.find(o=>o.userData.interaction==='wear-'+t.zone),target=proxy.getWorldPosition(new THREE.Vector3());
   camera.position.set(m.player.x,1.65,m.player.z);camera.lookAt(target);camera.updateMatrixWorld(true);
   assert.equal(O.fpWalkaroundFlow.canInspect(m,t.zone),true);assert.equal(art.pick(),'wear-'+t.zone);
   const ray=new THREE.Raycaster();ray.far=4;ray.setFromCamera({x:0,y:0},camera);const visible=[];world.traverseVisible(o=>{if(o.isMesh&&o.layers.test(ray.layers))visible.push(o);});
   const real=ray.intersectObjects(visible,false)[0];ray.layers.enable(1);const hit=ray.intersectObjects([proxy],false)[0];assert.ok(real&&hit,t.zone+' has no physical surface');
   const delta=Math.abs(real.distance-hit.distance);assert.ok(delta<.25,t.zone+' target floats '+delta+' m from '+real.object.name);
  }
 }finally{art.dispose();}
});
