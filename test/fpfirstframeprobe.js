/* The measurement boundary must follow actual route rendering and presentation, not just loader completion. */
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{EventEmitter}=require('node:events'),install=require('./tools/fp-first-frame-probe');
function fixture({assetError=null}={}){
 let now=0;const events=new EventEmitter(),scene={sys:{isActive:()=>true},loading:true,art:null,area:'hub',model:null,transitioning:false,fade:{alpha:0},assetBank:{stats:{loaded:2}}},bank={stats:{loaded:2},models:new Map([['van',{}]]),textures:new Map(),audio:new Map()},originals={};
 const O={workday:{start(...args){assert.equal(this,O.workday);return args[0];},resume(){return 7;}},world3d:{load:()=>Promise.resolve('three'),create:()=>({extern:{render:()=>9},diagnostics:{calls:2}})},fpAssets:{preload:()=>assetError?Promise.reject(assetError):Promise.resolve(bank)},fpWorld:{build:()=>({})},game:{events,loop:{frame:0},scene:{getScene:()=>scene}}};
 for(const [object,key] of [[O.workday,'start'],[O.fpAssets,'preload'],[O.fpWorld,'build']])originals[key]=object[key];const c={OTR:O,performance:{now:()=>now,getEntriesByType:()=>[]}};c.window=c;vm.createContext(c);vm.runInContext('('+install.toString()+')()',c);const probe=c.otrFirstFrameProbe;
 return {O,scene,probe,bank,originals,tick(n=10){now+=n;},frame(){O.game.loop.frame++;scene.view.extern.render();events.emit('postrender');}};
}
 test('the observer preserves method receivers, results and the exact loaded bank',async()=>{
 const f=fixture();assert.equal(f.probe.snapshot(),null);const marker={};assert.equal(f.O.workday.start(marker),marker);assert.equal(await f.O.world3d.load(),'three');assert.equal(await f.O.fpAssets.preload({high:true}),f.bank);f.O.fpWorld.build({area:'hub'});assert.equal(f.probe.snapshot().worlds.length,1);assert.equal(f.probe.snapshot().worlds[0].kind,'prototype-hub');f.probe.cleanup();assert.equal(f.O.workday.start,f.originals.start);assert.equal(f.O.fpAssets.preload,f.originals.preload);assert.equal(f.O.game.events.listenerCount('postrender'),0);
 });
 test('loading, hidden hub frames and an opaque transition cannot satisfy the first uncovered route frame',()=>{
 const f=fixture();f.O.workday.start();f.scene.view=f.O.world3d.create(f.scene);f.tick();f.frame();assert.equal(f.probe.snapshot().firstUncoveredMs,null);f.scene.loading=false;f.tick();f.frame();assert.equal(f.probe.snapshot().firstUncoveredMs,null);
 f.scene.art={};f.scene.area='route';f.scene.model={kind:'campaign',elapsed:42};f.scene.transitioning=true;f.scene.fade.alpha=1;f.tick();f.frame();assert.equal(f.probe.snapshot().firstThreeCompositeMs,30);assert.equal(f.probe.snapshot().firstPhaserCompositeMs,30);assert.equal(f.probe.snapshot().firstUncoveredMs,null);
 f.scene.transitioning=false;f.scene.fade.alpha=0;f.tick();f.frame();assert.equal(f.probe.snapshot().firstUncoveredMs,40);assert.equal(f.scene.model.elapsed,42);f.tick();f.frame();assert.equal(f.probe.snapshot().firstUncoveredMs,40);f.probe.cleanup();
 });
 test('resume starts a separate sample and loader errors remain errors',async()=>{
 const error=Error('cancelled'),f=fixture({assetError:error});f.O.workday.start();assert.equal(f.O.workday.resume(),7);assert.equal(f.probe.runs.length,2);assert.equal(f.probe.snapshot().action,'resume');await assert.rejects(f.O.fpAssets.preload(),e=>e===error);assert.equal(f.probe.snapshot().assets.length,0);f.probe.cleanup();
 });
