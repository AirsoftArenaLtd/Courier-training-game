/* Night visibility and glare use the existing fog and windscreen; reset and reduced-motion paths stay bounded. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/m3_doorsteps.js','data/m8_stops.js','data/town.js','data/workday_events.js','src/core/theme.js','src/core/rig.js','src/core/scenery.js','src/core/townart.js','src/core/town.js','src/core/shift.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fplighting.js','src/core/fproute.js','src/core/fpradio.js','src/core/fpnight.js','src/core/fpweather.js','src/core/fpworld.js','src/core/fpbranding.js','src/core/fpaccess.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR;O.save={data:{townSeed:1}};
function scene(high=false){
 O.gfx={high:()=>high};const world=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180);world.background=new THREE.Color();world.fog=new THREE.Fog(0,65,165);world.add(camera);
 const p=O.fpRoute.plan(6,7);p.weather='clear';const m=O.fpMission.create('campaign',7,O.fpRadio.prepare(p));m.mode='cab';m.paused=false;m.workdayRules={night:true};
 const s={model:m,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera()}}};s.art=O.fpWorld.build(s,m);s.sync=()=>s.art.sync(m,null,'route');s.sync();return s;
}
test('headlights increase visible night distance within each quality range and trainer-off restores it',()=>{
 for(const high of [false,true]){const s=scene(high),m=s.model,f=s.view.world.fog;assert.equal(f.far,30);m.van.headlights=true;s.sync();assert.equal(f.far,high?65:48);assert.match(s.art.lighting.caption(),/Drive within the distance/);m.workdayRules.night=false;s.sync();assert.equal(f.far,high?95:55);s.art.dispose();assert.equal(s.view.world.children.length,1);}
});
test('night visibility never extends a fog or storm weather limit',()=>{
 for(const weather of ['fog','storm']){const s=scene();s.art.dispose();s.model.routeDay={weather};s.art=O.fpWorld.build(s,s.model);s.model.van.headlights=true;s.sync();assert.equal(s.view.world.fog.far,weather==='fog'?28:40);s.art.dispose();}
});
test('oncoming glare reuses the existing windscreen geometry/material and reduced motion removes it',()=>{
 const s=scene(),m=s.model,a=s.art.weatherEffects,g=a.windscreen.geometry,material=a.windscreen.material;Object.assign(m.van,{x:2,z:-20,yaw:0});Object.assign(m.traffic[0],{x:0,z:-40,yaw:Math.PI});Object.assign(m.traffic[1],{x:100,z:100});s.sync();assert.ok(a.uniforms.headlightGlow.value.z>0);assert.equal(a.windscreen.visible,true);
 const old=O.fpAccess.reduced;O.fpAccess.reduced=()=>true;try{for(let i=0;i<100;i++)s.sync();assert.equal(a.uniforms.headlightGlow.value.z,0);assert.equal(a.windscreen.visible,false);assert.equal(a.windscreen.geometry,g);assert.equal(a.windscreen.material,material);}finally{O.fpAccess.reduced=old;s.art.dispose();}
});
test('leaving the night world restores fog limits and removes owned objects',()=>{
 const s=scene(),f=s.view.world.fog;s.art.lighting.sync(s.model,'hub');assert.equal(f.far,55);assert.equal(f.near,35);s.art.dispose();assert.equal(s.view.world.children.length,1);
});
