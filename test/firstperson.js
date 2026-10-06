/* Renderer-free prototype checks. No browser or graphics assets are rendered by this test. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const THREE = require('../lib/three.min.js');
const context = { THREE }; context.window = context;
vm.createContext(context);
for (const name of ['firstperson','world3d']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/core/' + name + '.js'),'utf8'),context);
const F = context.OTR.fp;
const input = changes => Object.assign({forward:false,back:false,left:false,right:false},changes);
const live = () => { const m = F.create(); m.paused = false; return m; };
const run = (m, controls, seconds, fps=60) => { for (let i=0;i<Math.round(seconds*fps);i++) m.step(input(controls),1/fps); };

test('paused controls leave position and vehicle unchanged', () => {
  const m=F.create(), x=m.player.x, z=m.player.z;
  m.step(input({forward:true,right:true}),1);
  assert.equal(m.player.x,x); assert.equal(m.player.z,z); assert.equal(m.van.speed,0);
});
test('diagonal walking has the same speed as straight walking', () => {
  const a=live(), b=live();
  a.player.x=b.player.x=9; a.player.z=b.player.z=-10; a.player.yaw=b.player.yaw=0;
  run(a,{forward:true},1); run(b,{forward:true,right:true},1);
  assert.ok(Math.abs(Math.hypot(a.player.x-9,a.player.z+10)-Math.hypot(b.player.x-9,b.player.z+10))<1e-8);
});
test('walking slides along walls and remains outside their collision volume', () => {
  const m=live(); Object.assign(m.player,{x:-11.5,z:4,yaw:-Math.PI/2});
  run(m,{forward:true,right:true},1);
  assert.ok(m.player.x>-11.54); assert.ok(m.player.z<3); assert.equal(m.blocked(m.player.x,m.player.z),false);
});
test('walking respects a rotated van collision footprint', () => {
  const m=live(); Object.assign(m.van,{x:5,z:-10,yaw:Math.PI/4});
  const centre=F.local(m.van,0,0), front=F.local(m.van,0,-2.65), clear=F.local(m.van,2,0);
  assert.equal(m.blocked(centre.x,centre.z),true); assert.equal(m.blocked(front.x,front.z),true); assert.equal(m.blocked(clear.x,clear.z),false);
});
test('rotated vehicle collisions detect corners without an oversized circular footprint', () => {
  const v={x:0,z:0,yaw:Math.PI/4};
  assert.equal(F.vanBox(v,{x:2,z:-2,w:0.4,d:0.4}),true);
  assert.equal(F.vanBox(v,{x:3,z:-3,w:0.4,d:0.4}),false);
});
test('van stops at a depot wall without passing through it', () => {
  const m=live(); m.mode='cab'; Object.assign(m.van,{x:3,z:7.5,yaw:-Math.PI/2,hand:false});
  run(m,{forward:true},4);
  assert.ok(m.van.x>0.84); assert.equal(m.van.speed,0);
  assert.equal(m.solids.some(s=>F.vanBox(m.van,s)),false);
});
test('a long frame does not simulate a large jump after tab inactivity', () => {
  const m=live(); m.mode='cab'; m.van.hand=false; m.van.speed=8;
  m.step(input(),30); assert.ok(Math.abs(m.van.z-3)<0.41);
});
test('30 and 120 FPS inputs produce consistent vehicle travel', () => {
  const a=live(),b=live(); a.mode=b.mode='cab'; a.van.hand=b.van.hand=false;
  run(a,{forward:true},2,30); run(b,{forward:true},2,120);
  assert.ok(Math.abs(a.van.z-b.van.z)<0.02); assert.ok(Math.abs(a.van.speed-b.van.speed)<0.01);
});
test('steering recentres promptly after the key is released', () => {
  const m=live(); m.mode='cab';
  run(m,{right:true},1); assert.ok(m.van.steer>0.4);
  run(m,{},1); assert.ok(Math.abs(m.van.steer)<0.001);
});
test('brake slows the van without selecting reverse', () => {
  const m=live(); m.mode='cab'; m.van.hand=false;
  run(m,{forward:true},1); assert.ok(m.van.speed>2);
  run(m,{back:true},2); assert.equal(m.van.speed,0); assert.equal(m.van.gear,1);
});
test('gear can change only while stopped inside the cab', () => {
  const m=live(); assert.equal(m.shiftGear(),false);
  m.mode='cab'; m.van.speed=1; assert.equal(m.shiftGear(),false); assert.equal(m.van.gear,1);
  m.van.speed=0; assert.equal(m.shiftGear(),true); assert.equal(m.van.gear,-1);
});
test('exit needs a stopped van and parking brake', () => {
  const m=live(); m.mode='cab'; m.van.speed=1; assert.equal(m.exit(),false);
  m.van.speed=0; m.van.hand=false; assert.equal(m.exit(),false);
  m.van.hand=true; assert.equal(m.exit(),true); assert.equal(m.mode,'walk'); assert.equal(m.blocked(m.player.x,m.player.z),false);
});
test('exit selects a clear side and refuses when both sides are blocked', () => {
  const m=live(); m.mode='cab';
  m.solids.push({x:-1.8,z:1.35,w:0.8,d:1,h:2});
  assert.equal(m.exit(),true); assert.ok(m.player.x>0);
  m.mode='cab'; m.solids.push({x:1.8,z:1.35,w:0.8,d:1,h:2});
  assert.equal(m.exit(),false); assert.equal(m.mode,'cab');
});
test('inspection requires proximity and a facing label to scan', () => {
  const m=live(); assert.equal(m.inspect('package'),false);
  Object.assign(m.player,{x:-8,z:2}); assert.equal(m.inspect('package'),true);
  m.inspectYaw=Math.PI; assert.equal(m.use('package'),false); assert.equal(m.scanned,false);
  m.inspectYaw=0; assert.equal(m.use('package'),true); assert.equal(m.scanned,true);
});
test('a package cannot be loaded without scanning', () => {
  const m=live(); m.package='held'; Object.assign(m.player,{x:0,z:6.3});
  assert.equal(m.use('cargo'),false); assert.equal(m.package,'held');
});
test('complete courier sequence needs scanning, loading and a correctly parked van', () => {
  const m=live(); Object.assign(m.player,{x:-8,z:2});
  assert.equal(m.use('package'),true); assert.equal(m.mode,'inspect'); assert.equal(m.use(),true);
  m.mode='walk'; assert.equal(m.use('package'),true); assert.equal(m.package,'held');
  Object.assign(m.player,{x:5.5,z:-35}); assert.equal(m.use('customer'),false);
  Object.assign(m.player,{x:0,z:6.3}); assert.equal(m.use('cargo'),true); assert.equal(m.package,'loaded');
  Object.assign(m.van,{x:3.1,z:-35,hand:true}); assert.equal(m.parkedAtDelivery(),true);
  Object.assign(m.player,{x:3.1,z:-31.3}); assert.equal(m.use('cargo'),true);
  Object.assign(m.player,{x:5.5,z:-35}); assert.equal(m.use('customer'),true);
  assert.equal(m.complete,true); assert.equal(m.package,'delivered');
});
test('delivery parking checks position, direction, motion and parking brake', () => {
  const m=live(); Object.assign(m.van,{x:3.1,z:-35}); assert.equal(m.parkedAtDelivery(),true);
  for (const change of [{x:0},{yaw:Math.PI},{speed:1},{hand:false}]) {
    const previous=Object.assign({},m.van); Object.assign(m.van,change);
    assert.equal(m.parkedAtDelivery(),false); Object.assign(m.van,previous);
  }
});
test('interaction ray respects walls, range and hidden parent groups', () => {
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(68,16/9,0.08,100); scene.add(camera);
  const target=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.5,0.5),new THREE.MeshBasicMaterial());
  target.position.z=-2; target.userData.interaction='package';
  const parent=new THREE.Group(); parent.add(target); scene.add(parent);
  const wall=new THREE.Mesh(new THREE.BoxGeometry(2,2,0.1),new THREE.MeshBasicMaterial()); wall.position.z=-1; scene.add(wall);
  const ray=new THREE.Raycaster(); ray.far=3;
  scene.updateMatrixWorld(true);
  const pick=occluders=>context.OTR.world3d.pick(camera,occluders,[target],ray);
  assert.equal(pick([wall]),null); assert.equal(pick([]),'package');
  parent.visible=false; assert.equal(pick([]),null);
  parent.visible=true; target.position.z=-5; scene.updateMatrixWorld(true); assert.equal(pick([]),null);
});
