const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
const c={THREE};c.window=c;vm.createContext(c);for(const f of ['firstperson','fpmission','fpcab','fpweather'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+f+'.js','utf8'),c);
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
