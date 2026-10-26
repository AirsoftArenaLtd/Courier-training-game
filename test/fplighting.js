/* Lighting follows the saved clock, respects trainer rules, keeps controls live and never changes scoring. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fplighting.js','src/core/fproute.js','src/core/fpdriving.js','src/core/fpworld.js','src/core/fpbranding.js','src/core/fpaccess.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,L=O.fpLighting,M=O.fpMission;
O.save={data:{townSeed:1}};
const make=()=>{const m=M.create('campaign',7,O.fpRoute.plan(1,7));m.mode='cab';m.paused=false;m.workdayRules={night:true};return m;};
function scene(high=false,pickup=false){O.gfx={high:()=>high};const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.add(camera);const s={model:make(),view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera()}}};if(pickup)s.model.pickupTask={};s.art=O.fpWorld.build(s,s.model);s.sync=()=>s.art.sync(s.model,null,'route');s.sync();return s;}
test('the existing saved clock selects morning, midday, dusk and night deterministically',()=>{
 const m=make();for(const [clock,expected] of [[360,'morning'],[660,'midday'],[1020,'dusk'],[1140,'night'],[60,'night']]){m.briefing.clockMin=clock;assert.equal(L.time(m),expected);}m.briefing.clockMin=659;m.elapsed=60;assert.equal(L.time(m),'midday');
});
test('explicit scene presets restore, while invalid optional time values reject only the bad checkpoint',()=>{
 const m=make();for(const time of L.times){m.routePlan.timeOfDay=time;const r=M.restore(m.snapshot());assert.ok(r);assert.equal(L.time(r),time);}
 const old=m.snapshot();delete old.routePlan.timeOfDay;assert.ok(M.restore(old));for(const bad of [null,'late',3,{},'']){const raw=m.snapshot();raw.routePlan.timeOfDay=bad;assert.equal(M.restore(raw),null);}
});
test('disabled night rules use a morning fallback without altering the saved planned preset',()=>{
 const m=make();m.routePlan.timeOfDay='night';m.workdayRules.night=false;assert.equal(L.time(m),'morning');assert.equal(m.routePlan.timeOfDay,'night');m.workdayRules.night=true;assert.equal(L.time(m),'night');
});
test('lighting does not allocate saved state, report scores or query trainer settings per frame',()=>{
 const s=scene();s.model.routePlan.timeOfDay='night';const before=JSON.stringify(s.model.snapshot());let calls=0;O.academy={workdayRules(){calls++;return {assists:'full',night:false};}};O.workday.begin();try{O.fp.applyDriveRules(s.model);for(let i=0;i<50;i++)s.sync();assert.equal(calls,1);assert.equal(O.workday.events.length,0);assert.equal(JSON.stringify(s.model.snapshot()),before);assert.equal(s.art.lighting.time,'morning');}finally{delete O.academy;s.art.dispose();}
});
test('physical and keyboard headlight state illuminates the road, reflects faults and survives resume',()=>{
 for(const high of [false,true]){const s=scene(high),a=s.art.lighting,m=s.model;m.routePlan.timeOfDay='night';m.repaired=true;s.sync();assert.ok(a.front.every(l=>l.intensity===0));assert.equal(O.fpCab.act(m,'cab-headlights'),'');s.sync();assert.ok(a.front.every(l=>l.intensity>0));assert.match(a.caption(),/headlights are on/);const restored=M.restore(m.snapshot());assert.ok(restored);assert.equal(restored.van.headlights,true);
 m.repaired=false;m.fault='lights';s.sync();if(high){assert.equal(a.front[0].intensity,0);assert.ok(a.front[1].intensity>0);}else assert.equal(a.front[0].intensity,650);m.repaired=true;s.sync();assert.ok(a.front.every(l=>l.intensity>0));s.art.dispose();}
});
test('the reverse lamp is automatic, lights remain on the van and gaze cannot move the beams',()=>{
 const s=scene(),a=s.art.lighting,m=s.model;m.van.gear=-1;s.sync();assert.ok(a.rear.intensity>0);const at=a.rear.position.clone(),aim=a.rear.target.position.clone();m.van.look=1;m.player.pitch=.3;s.sync();assert.ok(a.rear.position.distanceTo(at)<1e-10);assert.ok(a.rear.target.position.distanceTo(aim)<1e-10);m.van.x+=3;s.sync();assert.ok(Math.abs(a.rear.position.x-at.x-3)<1e-8);m.van.gear=1;s.sync();assert.equal(a.rear.intensity,0);s.art.dispose();
});
test('night instruments stay lit, and the hub regains neutral light after leaving a dark route',()=>{
 const s=scene(true),a=s.art.lighting,m=s.model,initial=a.sun.color.clone();m.routePlan.timeOfDay='night';s.sync();assert.ok(a.interior.intensity>0);assert.ok(s.art.cab.batch.material.color.r<.6);assert.equal(a.sun.castShadow,false);s.art.sync(m,{x:0,z:4.6,yaw:0,pitch:0},'hub');assert.equal(a.sky.visible,false);assert.equal(a.caption(),'');assert.ok(a.ambient.intensity>=1);assert.equal(a.front[0].parent.visible,false);assert.equal(a.sun.castShadow,false);s.art.dispose();
});
test('High installs contact occlusion and soft-shadow casters; Low uses no shadow maps or shader hooks',()=>{
 for(const high of [false,true]){const s=scene(high),a=s.art.lighting;s.model.routePlan.timeOfDay='midday';s.sync();assert.equal(a.sun.castShadow,high);assert.equal(a.ao.strength.value,high?1:0);const road=[];s.view.world.traverse(o=>{if(o.isMesh&&o.material.isMeshLambertMaterial)road.push(o);});assert.ok(road.length>0);assert.equal(road.some(o=>o.receiveShadow),high);if(high)assert.equal(a.sun.shadow.mapSize.width,512);assert.equal(a.sun.shadow.map,null);s.art.dispose();}
});
test('shadow rendering happens with the van visible after the main view, then restores its original visibility',()=>{
 const s=scene(true),a=s.art.lighting;let calls=0;s.view.renderSunShadow=()=>{assert.equal(s.art.van.visible,true);calls++;};const visible=s.art.van.visible;s.view.world.onAfterRender({},s.view.world,s.view.camera);assert.equal(calls,1);assert.equal(s.art.van.visible,visible);s.view.world.onAfterRender({},s.view.world,s.view.camera);assert.equal(calls,1);s.model.elapsed+=.13;s.sync();s.view.world.onAfterRender({},s.view.world,s.view.camera);assert.equal(calls,2);s.art.dispose();
});
test('restoration refreshes the static shadow at an unchanged mission time without creating Low shadows',()=>{
 for(const high of [false,true]){const s=scene(high);let calls=0;s.view.renderSunShadow=()=>calls++;const render=()=>s.view.world.onAfterRender({},s.view.world,s.view.camera);render();assert.equal(calls,high?1:0);render();assert.equal(calls,high?1:0);const before=JSON.stringify(s.model.snapshot());s.art.lighting.restore();s.sync();render();assert.equal(calls,high?2:0);assert.equal(JSON.stringify(s.model.snapshot()),before);s.art.dispose();}
});
test('the bounded shadow area follows the walking viewpoint while van light beams stay on the chassis',()=>{
 const s=scene(true),a=s.art.lighting,beam=a.front[0].position.clone();s.model.mode='walk';s.model.player.x=100;s.model.player.z=-80;s.sync();assert.ok(Math.abs(a.sun.target.position.x-100)<.18);assert.ok(Math.abs(a.sun.target.position.z+80)<.18);assert.ok(a.front[0].position.distanceTo(beam)<1e-10);s.art.dispose();
});
test('reflection sky uses the actual camera rotation and FOV, and disposal removes private geometry and hooks',()=>{
 const s=scene(true),a=s.art.lighting,cam=s.view.mirror.cameras[0];a.sky.onBeforeRender({},s.view.world,cam);assert.equal(a.sky.material.uniforms.projection.value.y,1/cam.projectionMatrix.elements[5]);const root=s.view.world,sky=a.sky;s.art.dispose();assert.equal(sky.parent,null);assert.equal(root.getObjectByName('workday-sky'),undefined);assert.equal(s.view.mirror.on,false);
});
test('world rebuilds restore the hub sun position, colours and fog before the next lighting adapter is created',()=>{
 const s=scene(true);s.art.dispose();const sky=new THREE.HemisphereLight(0xE9F1FF,0x63594C,1.5),sun=new THREE.DirectionalLight(0xFFF0DC,1.4);sun.position.set(-12,25,8);s.view.lights={sky,sun};s.view.world.add(sky,sun,sun.target);s.view.world.background=new THREE.Color(0xA7C7DE);s.view.world.fog=new THREE.Fog(0xA7C7DE,65,165);s.art=O.fpWorld.build(s,s.model);s.model.routePlan.timeOfDay='night';s.sync();s.art.dispose();assert.deepEqual(sun.position.toArray(),[-12,25,8]);assert.deepEqual(sun.target.position.toArray(),[0,0,0]);assert.equal(s.view.world.background.getHex(),0xA7C7DE);assert.equal(s.view.world.fog.color.getHex(),0xA7C7DE);
});
test('the counter focuses the same High shadow map on its room, with matching texel snap and unchanged workday/Low coverage',()=>{
 for(const high of [false,true]){const s=scene(high,true),sun=s.art.lighting.sun,m=s.model;try{m.mode='walk';Object.assign(m.player,{x:12.33,z:-44.27});m.elapsed+=.2;s.sync();const span=high?20:90,grid=span/512;assert.equal(sun.target.position.x,Math.round(m.player.x/grid)*grid);assert.equal(sun.target.position.z,Math.round(m.player.z/grid)*grid);assert.equal(sun.shadow.map,null);if(high){assert.equal(sun.shadow.mapSize.width,512);assert.equal(sun.shadow.mapSize.height,512);assert.equal(sun.shadow.camera.right-sun.shadow.camera.left,20);assert.equal(sun.shadow.camera.top-sun.shadow.camera.bottom,20);}else assert.equal(sun.castShadow,false);
  s.art.dispose();delete m.pickupTask;s.art=O.fpWorld.build(s,m);s.sync();const ordinary=s.art.lighting.sun;assert.equal(ordinary.target.position.x,Math.round(m.player.x/(90/512))*(90/512));assert.equal(ordinary.target.position.z,Math.round(m.player.z/(90/512))*(90/512));if(high)assert.equal(ordinary.shadow.camera.right-ordinary.shadow.camera.left,90);
 }finally{s.art.dispose();}}
});
