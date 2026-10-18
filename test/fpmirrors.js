/* Gaze evidence, manoeuvre keys, checkpoint continuity and the bounded reflection scheduler. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),THREE=require('../lib/three.min.js');
let clock=0;const c={THREE,performance:{now:()=>clock}};c.window=c;vm.createContext(c);
for(const f of ['data/theme.js','data/config.js','data/workday_events.js','src/core/theme.js','src/core/scorelog.js','src/core/workday.js','src/core/firstperson.js','src/core/fpmission.js','src/core/fpcamera.js','src/core/fpcab.js','src/core/fpmirrors.js','src/core/fpdriving.js','src/core/world3d.js','src/core/fpbranding.js','src/core/fpworld.js','src/core/fpaccess.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),c);
const O=c.OTR,M=O.fpMission,G=O.fpMirrors,D=O.fpDriving,W=O.workday;
const make=()=>{const m=M.create('campaign',7);m.mode='cab';m.paused=false;return m;};
function look(m,index,seconds=.4){const s=G.specs[index],dx=s.x+.45,dz=s.z+1.85;m.van.look=Math.atan2(dx,-dz);m.player.pitch=Math.atan2(2.05-s.y,Math.hypot(dx,dz));for(let n=0;n<Math.round(seconds*100);n++){m.elapsed+=.01;G.tick(m,.01);}}
const events=()=>W.events.filter(e=>e.type==='drive.mirrors');test.beforeEach(()=>W.begin());
test('a button or a legacy timestamp cannot establish a physical mirror check',()=>{
 const m=make();assert.equal(m.mirror(),false);m.mirrorAt=m.elapsed;assert.equal(G.recent(m,0),false);for(let i=0;i<100;i++){m.elapsed+=.01;G.tick(m,.01);}assert.equal(G.recent(m,0),false);assert.equal(G.recent(m,1),false);assert.equal(G.recent(m,2),false);
});
test('each actual mirror needs 0.4 continuous seconds and refreshes only its own four-second evidence',()=>{
 for(let index=0;index<3;index++){const m=make();look(m,index,.39);assert.equal(G.recent(m,index),false);look(m,index,.01);assert.equal(G.recent(m,index),true);
 for(let other=0;other<3;other++)if(other!==index)assert.equal(G.recent(m,other),false);
 const at=m.elapsed;assert.equal(G.recent(m,index,at+4),true);assert.equal(G.recent(m,index,at+4.001),false);assert.equal(G.recent(m,index,at-.1),false);}
});
test('looking away, a hidden UI, walking and pause cannot complete a check',()=>{
 const m=make();look(m,0,.25);m.van.look=0;m.player.pitch=0;m.elapsed+=.01;G.tick(m,.01);look(m,0,.2);assert.equal(G.recent(m,0),false);
 for(const flag of ['hidden','walk','paused']){G.reset(m);m.mode='cab';m.paused=false;m.mirrorVisible=true;look(m,0,.25);
  if(flag==='hidden')m.mirrorVisible=false;else if(flag==='walk')m.mode='walk';else m.paused=true;
  m.elapsed+=.2;G.tick(m,.2);assert.equal(m.van.mirrors[4],0);assert.equal(G.recent(m,0),false);}
});
test('partial dwell and completed checks survive a real mission checkpoint without replaying reports',()=>{
 let m=make();look(m,0,.25);const raw=m.snapshot();m=M.restore(raw);assert.ok(m);assert.deepEqual(m.snapshot(),raw);m.paused=false;look(m,0,.15);assert.equal(G.recent(m,0),true);assert.equal(W.events.length,0);
 const saved=m.snapshot();m=M.restore(saved);assert.ok(m);assert.equal(G.recent(m,0),true);assert.equal(m.mirror(),false);assert.deepEqual(m.snapshot(),saved);
});
test('legacy and new mirror checkpoints validate timestamps, dwell and indexes',()=>{
 const m=make();assert.ok(M.restore(m.snapshot()));look(m,0);assert.ok(M.restore(m.snapshot()));
 for(const bad of [[0,0],[-100,-100,100,-1,0],[-100,-100,-100,3,0],[-100,-100,-100,0,.5],[-101,-100,-100,-1,0]]){const raw=m.snapshot();raw.van.mirrors=bad;assert.equal(M.restore(raw),null,JSON.stringify(bad));}
});
test('pulling out requires the current left mirror, independently of the other mirrors',()=>{
 for(const index of [0,1,2]){W.begin();const m=make();D.configure(m);m.phase='route';m.departed=true;look(m,index);m.van.hand=false;m.van.speed=2;D.tick(m,.1);const e=events().at(-1);assert.equal(e.ok,index===0);assert.equal(e.stop,1);assert.ok(Number.isFinite(e.where.x));}
});
test('turns use their matching mirror before the move, reject late looks, and count once per manoeuvre',()=>{
 for(const side of [-1,1]){W.begin();const m=make();D.configure(m);m.phase='route';m.departed=true;const d=m.driving;d.mirrorDone=true;m.van.hand=false;m.van.speed=2;
 look(m,side<0?0:1);m.van.steer=side*.2;D.tick(m,.01);m.van.yaw=side*.08;m.elapsed+=.1;D.tick(m,.01);const e=events().at(-1);assert.equal(e.ok,true);assert.match(e.key,/turn:/);const count=events().length;D.tick(m,.1);assert.equal(events().length,count);
 m.van.steer=0;D.tick(m,.1);m.elapsed+=5;m.van.steer=-side*.2;D.tick(m,.01);look(m,side<0?1:0);m.van.yaw=0;D.tick(m,.01);assert.equal(events().at(-1).ok,false,'looking after starting cannot repair a missing prior check');}
});
test('a lane crossing also triggers a check and resumed turn keys cannot collide',()=>{
 let m=make();D.configure(m);m.phase='route';m.departed=true;m.driving.mirrorDone=true;m.van.hand=false;m.van.speed=2;look(m,0);m.van.steer=-.1;D.tick(m,.01);m.van.x-=.7;D.tick(m,.01);assert.equal(events().at(-1).ok,true);
 const first=events().at(-1).key;m=M.restore(m.snapshot());assert.ok(m);m.paused=false;m.van.steer=0;D.tick(m,.1);look(m,1);m.van.steer=.1;D.tick(m,.01);m.van.yaw+=.08;D.tick(m,.01);assert.notEqual(events().at(-1).key,first);assert.equal(events().at(-1).ok,true);
});
function scene(high=false){O.gfx={high:()=>high};O.a11y={settings:()=>({reducedMotion:true}),physical:k=>k,label:k=>k};const m=make(),camera=new THREE.PerspectiveCamera(68,16/9,.08,180),world=new THREE.Scene();world.add(camera);
 const s={model:m,view:{world,camera,mirror:{camera:new THREE.PerspectiveCamera(),on:false}},message(){}};s.art=O.fpWorld.build(s,m);s.sync=()=>s.art.sync(m,null,'route');s.sync();return s;}
test('mirror housings stay behind the reflective faces on both presets',()=>{
 for(const high of [false,true]){const s=scene(high),r=s.art.mirrors,face=new THREE.Matrix4(),frame=new THREE.Matrix4();
  for(let i=0;i<3;i++){r.faces.getMatrixAt(i,face);r.frames.getMatrixAt(i,frame);const front=new THREE.Vector3(0,0,high?.5:0).applyMatrix4(frame).applyMatrix4(face.clone().invert());assert.ok(front.z<-.002,`${high?'High':'Low'} mirror ${i} housing obscures its face at ${front.z}`);}
  s.art.dispose();
 }
});
test('all three physical mirrors stay on the van and retain the same reflection camera when the head turns',()=>{
 for(const high of [false,true]){const s=scene(high),r=s.art.mirrors,before=r.root.matrixWorld.clone(),cameras=s.view.mirror.cameras.map(c=>c.matrixWorld.clone());s.model.van.look=.7;s.model.elapsed+=.02;const saved=JSON.stringify(s.model.snapshot());s.sync();
 assert.equal(s.view.mirror.on,true);assert.equal(s.model.snapshot().cameraMotion,undefined);assert.equal(JSON.stringify(s.model.snapshot()),saved);assert.deepEqual(r.root.matrixWorld,before);s.view.mirror.cameras.forEach((c,i)=>assert.deepEqual(c.matrixWorld,cameras[i]));
 s.model.mode='walk';s.model.elapsed+=10;s.sync();assert.equal(r.root.visible,true);assert.equal(s.view.mirror.on,true);s.art.dispose();assert.equal(s.view.world.children.length,1);}
});
test('keyboard focus reaches all mirrors, and reflection passes restore cab and van state on foot or in the cab',()=>{
 const s=scene(),seen=new Set();for(let i=0;i<20;i++)seen.add(O.fpAccess.focus(s));for(const spec of G.specs)assert.ok(seen.has(spec.id),[...seen].join());
 for(const mode of ['cab','walk']){s.model.mode=mode;s.sync();const van=s.art.van.visible,dash=s.art.cab.root.visible;for(let i=0;i<3;i++){s.view.mirror.before(i);assert.equal(s.art.mirrors.root.visible,false);assert.equal(s.art.van.visible,true);s.view.mirror.after(i);assert.equal(s.art.mirrors.root.visible,true);assert.equal(s.art.van.visible,van);assert.equal(s.art.cab.root.visible,dash);}}
 s.art.dispose();
});
test('reflection atlas refreshes all tiles at bounded rates with at most one extra world render per frame',()=>{
 const Original=THREE.WebGLRenderer;try{for(const high of [false,true]){clock=0;O.gfx={high:()=>high};O.W=1280;O.H=720;let worldDraws=0;
 THREE.WebGLRenderer=class{constructor(){this.info={autoReset:false,render:{calls:0,triangles:0},memory:{textures:2,geometries:4},reset(){this.render.calls=this.render.triangles=0;}};}resetState(){}setScissorTest(){}setScissor(){}setRenderTarget(){}setViewport(){}clear(){}render(root){if(root.children.some(o=>o.isCamera))worldDraws++;this.info.render.calls++;this.info.render.triangles+=2;}};
 const s={sys:{game:{canvas:{},renderer:{gl:{drawingBufferWidth:1280,drawingBufferHeight:720},pipelines:{clear(){},rebind(){}}}}},add:{extern:()=>({setDepth(){return this;}})},events:{once(){}}},v=O.world3d.create(s);v.mirror.on=true;
 for(let f=0;f<120;f++){const before=worldDraws;clock=f*1000/60;v.extern.render();assert.ok(worldDraws-before>=1&&worldDraws-before<=2);}
 assert.equal(v.mirror.filled,7);for(const count of v.mirror.updates)assert.ok(count>=(high?35:17)&&count<=(high?42:22),high+':'+v.mirror.updates);
 assert.equal(v.diagnostics.attachmentBytes,high?9142272:3557376);assert.equal(v.diagnostics.textures,2);
 }}finally{THREE.WebGLRenderer=Original;}
});
