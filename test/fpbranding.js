/* Theme values, world materials and moving/facing company labels without a GPU. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={THREE:require('../lib/three.min.js')};c.window=c;vm.createContext(c);for(const f of ['firstperson','fpmission','world3d','fpbranding','fpworld'])vm.runInContext(fs.readFileSync(__dirname+'/../src/core/'+f+'.js','utf8'),c);
c.OTR.gfx={high:()=>false};
const themes=[{companyName:'Example One',primary:0x274d62,accent:0xc27a34,vanBody:0xf1e8d4,uniform:0x2c6573,logoText:'E1'},
 {companyName:'Example Two',primary:0x354f36,accent:0xacc7e8,vanBody:0xb8ccad,uniform:0x495275,logoText:'E2'}];
const colours=root=>{const out=[],colour=new c.THREE.Color();root.traverse(o=>{if(!o.material||!(o.layers.mask&1))return;if(o.isInstancedMesh&&o.instanceColor){for(let i=0;i<o.count;i++){o.getColorAt(i,colour);out.push(colour.clone().multiply(o.material.color).getHex());}}else out.push(o.material.color.getHex());});return out;};
test('two company themes reach the actual van, livery and uniform materials',()=>{
 for(const theme of themes){c.OTR_DATA={theme};const T=c.THREE,world=new T.Scene(),camera=new T.PerspectiveCamera(68,16/9,.08,180);world.add(camera);const m=c.OTR.fpMission.create('campaign',1),s={view:{world,camera,mirror:{camera:new T.PerspectiveCamera(),on:false}},model:m};const art=c.OTR.fpWorld.build(s,m);
  assert.equal(art.brand.name,theme.companyName);
  assert.ok(colours(art.van).includes(theme.vanBody));assert.ok(colours(art.van).includes(theme.primary));assert.ok(colours(art.van).includes(theme.accent));assert.ok(colours(art.carried).includes(theme.uniform));
  assert.ok(colours(art.van).filter(value=>value===theme.vanBody).length>=4);assert.equal(art.labels.filter(l=>l.brand).length,3);art.dispose();
 }
});
test('van labels follow a moved/rotated van and do not show through its opposite side',()=>{
 c.OTR_DATA={theme:themes[0]};const T=c.THREE,world=new T.Scene(),camera=new T.PerspectiveCamera(68,16/9,.08,180);world.add(camera);const m=c.OTR.fpMission.create('campaign',1),s={view:{world,camera,mirror:{camera:new T.PerspectiveCamera(),on:false}},model:m},a=c.OTR.fpWorld.build(s,m);
 m.van.x=10;m.van.z=8;m.van.yaw=Math.PI/2;Object.assign(m.player,{x:10,z:13,yaw:0,pitch:0});a.sync(m,null,'route');const labels=a.labels.filter(l=>l.local),front=labels.find(l=>l.local.x>0),back=labels.find(l=>l.local.x<0);
 camera.lookAt(new T.Vector3(9.4,2.1,9.13));camera.updateMatrixWorld(true);assert.ok(a.labelPosition(front));assert.equal(a.labelPosition(back),null);assert.ok(Math.abs(front.point.z-9.13)<.01);a.dispose();
});
test('neutral defaults and the existing config brand remain usable without optional theme fields',()=>{
 delete c.OTR_DATA;assert.equal(c.OTR.fpBrand.read().name,'On The Route');c.OTR_DATA={config:{brand:'Example Legacy'},theme:{primary:NaN,vanBody:-1}};const b=c.OTR.fpBrand.read();assert.equal(b.name,'Example Legacy');assert.equal(b.primary,0x1f4e79);assert.equal(b.body,0xe9f0f9);
});
test('weather cannot repaint company colours that happen to match the road, grass or roofs',()=>{
 const theme={primary:0x4b5058,vanBody:0x789069,uniform:0x65626b};c.OTR_DATA={theme};const T=c.THREE;
 for(const weather of ['rain','snow']){const world=new T.Scene(),camera=new T.PerspectiveCamera();world.add(camera);const m=c.OTR.fpMission.create('campaign',1);m.routeDay={weather};const a=c.OTR.fpWorld.build({view:{world,camera,mirror:{camera:new T.PerspectiveCamera(),on:false}}},m);assert.ok(colours(a.van).includes(theme.primary));assert.ok(colours(a.van).includes(theme.vanBody));assert.ok(colours(a.carried).includes(theme.uniform));a.dispose();}
});
