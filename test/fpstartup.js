/* Actual scene startup, transitions and async cancellation; render factories are observed resource boundaries. */
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{EventEmitter}=require('node:events');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const settle=()=>new Promise(setImmediate);
function fixture(options={}){
 const calls=[],worlds=[],banks=[],pending=[],events=new EventEmitter(),load=options.load||Promise.resolve(),assets=options.assets||Promise.resolve();
 let active=true,readyCount=0;
 const c={Promise,URLSearchParams,AbortController,location:{search:''},console:{warn:()=>calls.push('warn')},Phaser:{Scene:class{}},document:{}};c.window=c;vm.createContext(c);
 const model={kind:'campaign',phase:'prepare',mode:'walk',paused:false,seed:1,elapsed:0,stops:[],events:{},briefKey:'brief',briefing:{day:1},snapshot:()=>({kind:'campaign'}),touch(){}};
 const progress={welcomed:true,sequence:1,campaign:options.resume?{kind:'campaign'}:null},configure=()=>{};
 const O=c.OTR={registerScene(){},fp:{clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),create:()=>({player:{}}),applyDriveRules(){}},
  fpStore:{read:()=>progress,write:()=>{calls.push('write');return true;}},save:{data:{route:{days:0}}},gfx:{high:()=>!!options.high},
  fpAccess:{textResolution(){},reduced:()=>!!options.reduced},fpSound:class{},
  fpContext:{attach(){return {ready:()=>{readyCount++;return options.ready?options.ready(readyCount):Promise.resolve(true);}};}},
  fpBrand:{loadLogo:()=>options.logo||Promise.resolve('logo'),labels(scene){assert.ok(scene.art);calls.push('labels');return [{label:{},object:{destroy:()=>calls.push('destroy-label')}}];}},
  fpAssets:{async preload(settings){calls.push('preload');pending.push(settings);settings.progress(.5);await assets;const bank={dispose(){this.disposals++;},disposals:0,stats:{loaded:options.fallback?0:14,failed:options.fallback?14:0}};banks.push(bank);return bank;}},
  world3d:{load:()=>load,create(){calls.push('view');return {dispose:()=>calls.push('dispose-view')};}},
  fpWorld:{build(scene,m){assert.ok(scene.view&&scene.assetBank);calls.push('world');const world={model:m,bank:scene.assetBank,disposals:0,dispose(){this.disposals++;},sync(){calls.push('sync');}};worlds.push(world);return world;}},
  fpHandheld:class{constructor(scene){assert.ok(scene.view&&scene.assetBank);calls.push('handheld');}close(){}},
  fpMission:{restore:s=>s?model:null,create:()=>model},fpRoute:{plan:()=>({})},fpLoadout:{configure},fpDriving:{configure},fpDay:{configure},fpDoors:{configure},fpGuide:{opening:()=>false},
  fpScenario:{model:()=>model},fpStopFlow:{prepare:x=>x,configure},fpDamageFlow:{prepare:x=>x},fpTraffic:{prepare:x=>x},fpNav:{prepare:x=>x},fpSigns:{prepare:x=>x},fpLater:{prepare:x=>x},fpRadio:{prepare:x=>x},fpWalkaroundFlow:{prepare:x=>x}};
 const root=options.sourceRoot||__dirname+'/..';
 for(const f of ['FirstPersonScene','FirstPersonScenarioScene'])vm.runInContext(fs.readFileSync(root+'/src/scenes/'+f+'.js','utf8')+'\nwindow.'+f+'Class='+f+';',c);
 const s=new c.FirstPersonSceneClass();s.events=events;s.sys={isActive:()=>active};s.time={now:0};s.tweens={add:t=>pending.push(t)};
 s.add={graphics(){return {setDepth(){return this;},destroy:()=>calls.push('destroy-bar'),clear(){},fillStyle(){},fillRect(){}};}};
 s.makeHud=()=>{s.fade={alpha:0};};s.setText=()=>{};s.installInput=()=>calls.push('input');s.capture=()=>{};
 s.showPanel=(title,body,choices)=>{calls.push('panel');s.panel={title,choices};if(s.model)s.model.paused=true;};s.showPause=()=>calls.push('pause');
 if(options.scenario){s.scenarioSession={phase:'brief'};s.beginScenario=c.FirstPersonScenarioSceneClass.prototype.beginScenario;s.showScenarioBrief=()=>{calls.push('brief');s.panel={};};s.checkpoint=()=>{};s.write=()=>true;s.scenarioUnavailable=()=>calls.push('unavailable');}
 const boot=()=>s.create(options.workday?{workday:{resume:!!options.resume}}:undefined);
 const finishTransition=()=>{let t;while((t=pending.find(x=>typeof x.onComplete==='function'))){const fn=t.onComplete;t.onComplete=null;fn();}};
 return {s,model,progress,calls,worlds,banks,pending,boot,finishTransition,shutdown(){active=false;events.emit('shutdown');},get readyCount(){return readyCount;}};
}
for(const resume of [false,true])for(const reduced of [false,true])test(`direct ${resume?'resume':'new workday'}, ${reduced?'reduced':'normal'} motion constructs only its actual world`,async()=>{
 const f=fixture({workday:true,resume,reduced});f.boot();await settle();
 if(!reduced){assert.equal(f.worlds.length,0);assert.equal(f.s.transitioning,true);assert.equal(f.s.art,null);assert.equal(f.s.loading,true);assert.doesNotThrow(()=>f.s.update(100,16));}
 f.finishTransition();assert.equal(f.worlds.length,1);assert.equal(f.worlds[0].model,f.model);assert.equal(f.worlds[0].bank,f.banks[0]);assert.equal(f.s.model,f.model);assert.equal(f.s.area,'route');assert.equal(f.s.loading,false);assert.equal(f.s.transitioning,false);assert.equal(f.s.companyLogo,'logo');assert.equal(f.model.elapsed,0);assert.ok(f.s.panel);assert.equal(f.calls.filter(c=>c==='labels').length,1);
 f.shutdown();assert.equal(f.worlds[0].disposals,1);assert.equal(f.banks[0].disposals,1);
});
test('a physical module builds its isolated world and briefing once without campaign writes',async()=>{
 const f=fixture({scenario:true});f.boot();await settle();assert.equal(f.worlds.length,1);assert.equal(f.worlds[0].model,f.model);assert.equal(f.s.area,'route');assert.equal(f.s.loading,false);assert.equal(f.calls.filter(c=>c==='brief').length,1);assert.equal(f.calls.includes('write'),false);assert.equal(f.model.elapsed,0);
});
test('the explicit prototype still opens its hub and disposes that world on a later native launch',async()=>{
 const f=fixture();f.boot();await settle();assert.equal(f.worlds.length,1);assert.equal(f.worlds[0].model,undefined);assert.equal(f.s.area,'hub');assert.ok(f.calls.includes('pause'));
 f.s.launch('campaign');f.finishTransition();assert.equal(f.worlds.length,2);assert.equal(f.worlds[0].disposals,1);assert.equal(f.worlds[1].disposals,0);assert.equal(f.worlds[1].model,f.model);assert.equal(f.calls.filter(c=>c==='destroy-label').length,1);
});
test('shutdown during asset loading aborts the request and disposes its late bank without building',async()=>{
 const assets=deferred(),f=fixture({workday:true,assets:assets.promise});f.boot();await settle();assert.equal(f.banks.length,0);f.shutdown();assert.equal(f.pending[0].signal.aborted,true);assets.resolve();await settle();assert.equal(f.worlds.length,0);assert.equal(f.banks[0].disposals,1);assert.equal(f.calls.includes('input'),false);
});
test('loss after preload waits for renderer recovery before any world or inputs are created',async()=>{
 const recovery=deferred(),f=fixture({workday:true,ready:n=>n===3?recovery.promise:Promise.resolve(true)});f.boot();await settle();assert.equal(f.readyCount,3);assert.equal(f.banks.length,1);assert.equal(f.worlds.length,0);assert.equal(f.calls.includes('view'),false);assert.equal(f.s.loading,true);
 recovery.resolve(true);await settle();f.finishTransition();assert.equal(f.worlds.length,1);assert.equal(f.s.loading,false);assert.equal(f.banks[0].disposals,0);
});
test('shutdown while waiting for post-load recovery releases the bank and cannot enter a scene',async()=>{
 const recovery=deferred(),f=fixture({scenario:true,ready:n=>n===3?recovery.promise:Promise.resolve(true)});f.boot();await settle();f.shutdown();recovery.resolve(false);await settle();assert.equal(f.banks[0].disposals,1);assert.equal(f.worlds.length,0);assert.equal(f.calls.includes('brief'),false);
});
test('an inactive scene cannot continue past the script or logo boundary',async()=>{
 for(const boundary of ['load','logo']){const wait=deferred(),f=fixture({workday:true,[boundary]:wait.promise});f.boot();await settle();f.shutdown();wait.resolve();await settle();assert.equal(f.banks.length,0);assert.equal(f.worlds.length,0);assert.equal(f.calls.includes('input'),false);}
});
for(const high of [false,true])test(`the ${high?'High':'Low'} preload and missing-model fallback still feed the first actual world`,async()=>{
 const f=fixture({workday:true,high,fallback:true});f.boot();await settle();f.finishTransition();assert.equal(f.pending[0].high,high);assert.equal(f.pending[0].signal.aborted,false);assert.equal(f.worlds.length,1);assert.equal(f.worlds[0].bank.stats.failed,14);assert.equal(f.calls.indexOf('preload')<f.calls.indexOf('view'),true);
});
test('script or asset rejection retains the existing startup failure path',async()=>{
 for(const boundary of ['load','assets']){const wait=deferred(),f=fixture({workday:true,[boundary]:wait.promise});f.boot();await settle();wait.reject(new Error('loader unavailable'));await settle();assert.equal(f.worlds.length,0);assert.equal(f.s.loading,false);assert.equal(f.s.panel.title,'The prototype could not start');}
});
