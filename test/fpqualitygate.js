/* Guard against mislabeled/stale fixtures and false quality passes. No browser is needed. */
const test=require('node:test'),assert=require('node:assert/strict'),{checkReport}=require('./fpquality');
const profile={id:'fixture',quality:'low',views:'cab,reverse'};
function report(){const sample=()=>({frames:12,contextLost:false,peak:{calls:60,triangles:2400,textures:2,attachmentBytes:3557376},phaserTextures:{withMipmapsUpperBytes:3000000}});return {tag:'sample',quality:'low',actualQuality:'low',audioContext:'running',accessibility:[],assets:{loaded:14,failed:0,fallbacks:0},prototype:{cab:sample(),reverse:sample()},errors:[],missingViews:[]};}
test('a profile requires actual frames for every named view and its requested quality',()=>{
 const r=report();assert.equal(checkReport(r,profile,'sample').triangles,2400);r.prototype.cab.peak.calls=0;assert.throws(()=>checkReport(r,profile,'sample'),/empty render/);r.prototype.cab.peak.calls=60;delete r.prototype.reverse;assert.throws(()=>checkReport(r,profile,'sample'),/No valid frames/);r.prototype.reverse={frames:0};assert.throws(()=>checkReport(r,profile,'sample'),/No valid frames/);r.actualQuality='high';assert.throws(()=>checkReport(r,profile,'sample'),/tag and quality/);
});
test('resource overflow, lost contexts and page errors fail the integrated gate',()=>{
 for(const [key,n] of [['calls',65],['triangles',2501],['textures',3],['attachmentBytes',4194305]]){const r=report();r.prototype.cab.peak[key]=n;assert.throws(()=>checkReport(r,profile,'sample'),/exceeds/);}
 let r=report();r.prototype.reverse.contextLost=true;assert.throws(()=>checkReport(r,profile,'sample'),/valid frames/);r=report();r.errors=['Page error'];assert.throws(()=>checkReport(r,profile,'sample'),/browser check/);r=report();r.prototype.cab.phaserTextures.withMipmapsUpperBytes=4194305;assert.throws(()=>checkReport(r,profile,'sample'),/Phaser/);
});
test('a fallback profile must really fail every selected model without loading any',()=>{
 const p={...profile,fallback:true},r=report();assert.throws(()=>checkReport(r,p,'sample'),/asset fixture/);r.assetFailure='missing-model-files';r.assets={loaded:0,failed:14,fallbacks:0};assert.ok(checkReport(r,p,'sample'));r.assets.loaded=1;assert.throws(()=>checkReport(r,p,'sample'),/asset fixture/);
});
test('High has explicit separate ceilings while the original Low ceilings remain',()=>{
 const r=report();r.quality=r.actualQuality='high';r.prototype.cab.peak={calls:120,triangles:290000,textures:4,attachmentBytes:15000000};r.prototype.cab.phaserTextures.withMipmapsUpperBytes=15000000;assert.ok(checkReport(r,{...profile,quality:'high'},'sample'));r.prototype.cab.peak.triangles=300001;assert.throws(()=>checkReport(r,{...profile,quality:'high'},'sample'),/triangles/);
});
test('accessibility and running sound cannot be silently omitted from the fixture',()=>{
 const r=report(),p={...profile,accessibility:'large,colour,reduced'};
 assert.throws(()=>checkReport(r,p,'sample'),/accessibility fixture/);
 r.accessibility=['reduced','large','colour'];assert.ok(checkReport(r,p,'sample'));
 r.audioContext='suspended';assert.throws(()=>checkReport(r,p,'sample'),/live sound/);
});
test('a blank physical mirror cannot pass on resource counters alone',()=>{
 const r=report(),p={...profile,views:'mirror'};r.prototype.mirror=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/live reflected pixels/);
 r.mirrorProof={mirror:{red:[255,0,0,255],blue:[0,0,255,255]}};assert.ok(checkReport(r,p,'sample'));
 r.mirrorProof.mirror.red=[35,49,60,255];r.mirrorProof.mirror.blue=[35,49,60,255];assert.throws(()=>checkReport(r,p,'sample'),/live reflected pixels/);
});
test('module counters require the requested real set-piece, boundaries and unchanged workday state',()=>{
 const r=report(),p={...profile,views:'moduledepot,modulecabreverse,modulecabhandheld'};
 for(const name of p.views.split(','))r.prototype[name]=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/isolated physical module proof/);
 r.moduleFixture=true;r.moduleProof={};for(const name of p.views.split(','))r.moduleProof[name]={source:'module-controller-fixture',id:'m1-pretrip',piece:name==='moduledepot'?'depot':'cab',phase:'active',bounded:true,checkpointUnchanged:true,eventsUnchanged:true,workdayUnchanged:true,reverse:true,handheld:true};assert.ok(checkReport(r,p,'sample'));
 for(const field of ['bounded','checkpointUnchanged','eventsUnchanged','workdayUnchanged','reverse']){r.moduleProof.modulecabreverse[field]=false;assert.throws(()=>checkReport(r,p,'sample'),/isolated physical module proof/);r.moduleProof.modulecabreverse[field]=true;}
 r.moduleProof.moduledepot.piece='cab';assert.throws(()=>checkReport(r,p,'sample'),/isolated physical module proof/);
});
test('radio and night counters need actual route, caption, visibility and reduced-motion proofs',()=>{
 const {RADIO_VIEWS,PROFILES}=require('./fpquality');assert.ok(PROFILES.every(p=>RADIO_VIEWS.split(',').every(v=>p.views.split(',').includes(v))));
 const r=report(),p={...profile,views:'radiocheckin,nightglare,nightreduced,nightoff,nighton'};
 for(const v of p.views.split(','))r.prototype[v]=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/native radio\/night proof/);
 r.radioFixture=true;r.radioProof={};for(const v of p.views.split(','))r.radioProof[v]={marker:1,valid:true,kind:'checkin',context:'radio',radio:{accepted:true},reduced:false,glare:.1,headlights:true,far:48};
 r.radioProof.nightreduced.reduced=true;r.radioProof.nightreduced.glare=0;r.radioProof.nightoff.headlights=false;r.radioProof.nightoff.far=30;assert.ok(checkReport(r,p,'sample'));
 r.radioProof.radiocheckin.context='0';assert.throws(()=>checkReport(r,p,'sample'),/did not change navigation/);r.radioProof.radiocheckin.context='radio';r.radioProof.nightglare.glare=0;assert.throws(()=>checkReport(r,p,'sample'),/Oncoming glare/);
});

test('healthy profiles reject a recovered fallback and reports missing the fallback counter',()=>{
 const r=report();r.assets.fallbacks=1;assert.throws(()=>checkReport(r,profile,'sample'),/asset fixture/);delete r.assets.fallbacks;assert.throws(()=>checkReport(r,profile,'sample'),/asset fixture/);r.assets.fallbacks=0;assert.ok(checkReport(r,profile,'sample'));
});

test('navigation views must name their versioned campaign fixture',()=>{
 const r=report(),p={...profile,views:'navfull'};r.prototype.navfull=r.prototype.cab;assert.throws(()=>checkReport(r,p,'sample'),/navigation fixture/);r.navigationFixture=true;assert.ok(checkReport(r,p,'sample'));
});
test('damage views require the located damage, cargo and physical clearance fixture',()=>{
 const r=report(),p={...profile,views:'damagefront'};r.prototype.damagefront=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/damage and clearance fixture/);
 r.damageFixture=true;r.damageProof={damagefront:{marker:1,valid:true,zones:7,clearances:2,instances:15,shift:3}};assert.ok(checkReport(r,p,'sample'));
 r.damageProof.damagefront.zones=0;assert.throws(()=>checkReport(r,p,'sample'),/damage and clearance fixture/);
});
test('clearance views require a lasting readable warning and the reverse view also requires its camera',()=>{
 const {PROFILES,CLEARANCE_VIEWS}=require('./fpquality');assert.equal(CLEARANCE_VIEWS.split(',').length,3);
 assert.ok(PROFILES.every(p=>CLEARANCE_VIEWS.split(',').every(v=>p.views.split(',').includes(v))));
 const name='damagereverseclearance',r=report(),p={...profile,views:name};r.prototype[name]=r.prototype.cab;
 r.damageFixture=true;r.damageProof={[name]:{marker:1,valid:true,zones:7,clearances:2,instances:15,shift:3}};
 assert.throws(()=>checkReport(r,p,'sample'),/persistent readable/);
 r.prototype[name].clearanceAlert={text:'The clearance is 8 feet 10 inches.',visible:true,reverse:false,bounds:{x:24,y:18,right:700,bottom:160}};
 assert.throws(()=>checkReport(r,p,'sample'),/live reverse camera/);r.prototype[name].clearanceAlert.reverse=true;assert.ok(checkReport(r,p,'sample'));
 r.prototype[name].clearanceAlert.bounds.bottom=721;assert.throws(()=>checkReport(r,p,'sample'),/persistent readable/);
});
test('richer-stop counters need physical control, custody and native-schedule proofs',()=>{
 const r=report(),p={...profile,views:'stopslockeropen,stopsstresscab'};r.prototype.stopslockeropen=r.prototype.stopsstresscab=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/richer-stop fixture/);r.deliveryFixture=true;
 assert.throws(()=>checkReport(r,p,'sample'),/richer-stop proof/);
 r.deliveryProof={stopslockeropen:{marker:1,parts:5,physicalTarget:true,protocol:'locker',deposited:true,source:'native-later-authorized',later:true},stopsstresscab:{marker:1,parts:5,physicalTarget:true,source:'native-later-authorized',later:true,damageZones:7}};assert.ok(checkReport(r,p,'sample'));
 for(const patch of [{physicalTarget:false},{deposited:false},{parts:0},{later:false},{source:'standard-service-generated-fixture'}]){const saved={...r.deliveryProof.stopslockeropen};Object.assign(r.deliveryProof.stopslockeropen,patch);assert.throws(()=>checkReport(r,p,'sample'),/richer-stop proof/);r.deliveryProof.stopslockeropen=saved;}
});

test('traffic views require the combined versioned traffic and navigation fixture',()=>{
 const r=report(),p={...profile,views:'trafficpeak'};r.prototype.trafficpeak=r.prototype.cab;assert.throws(()=>checkReport(r,p,'sample'),/traffic and navigation fixture/);r.trafficFixture=true;assert.ok(checkReport(r,p,'sample'));
});

test('walkaround views require the opted-in model and seven non-rendered physical targets',()=>{
 const r=report(),p={...profile,views:'walkroof'};r.prototype.walkroof=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/physical walkaround fixture/);
 r.walkaroundFixture=true;r.walkaroundProof={walkroof:{marker:1,valid:true,targets:7,proxyOnly:true}};assert.ok(checkReport(r,p,'sample'));
 for(const [key,value] of [['marker',0],['valid',false],['targets',0],['proxyOnly',false]]){
  const saved=r.walkaroundProof.walkroof[key];r.walkaroundProof.walkroof[key]=value;assert.throws(()=>checkReport(r,p,'sample'),/physical walkaround fixture/);r.walkaroundProof.walkroof[key]=saved;
 }
});
test('ambient views require visible bounded people, the correct source variant and a restorable day',()=>{
 const r=report(),p={...profile,views:'ambientwalk'};r.prototype.ambientwalk=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/ambient presentation proof/);
 r.ambientFixture=true;const proof={sites:20,selected:1,limit:1,sourcePeople:0,reserved:36,solid:true,restoreValid:true};r.ambientProof={ambientwalk:proof};assert.ok(checkReport(r,p,'sample'));
 for(const [key,value] of [['sites',0],['selected',0],['selected',2],['limit',2],['sourcePeople',1],['reserved',0],['solid',false],['restoreValid',false]]){const saved=proof[key];proof[key]=value;assert.throws(()=>checkReport(r,p,'sample'),/ambient presentation proof/);proof[key]=saved;}
 const high={...p,quality:'high',views:'ambientbench'};r.actualQuality=r.quality='high';r.prototype.ambientbench=r.prototype.cab;r.ambientProof.ambientbench={...proof,selected:2,limit:2,sourcePeople:2,reserved:0,bench:true};assert.ok(checkReport(r,high,'sample'));r.ambientProof.ambientbench.bench=false;assert.throws(()=>checkReport(r,high,'sample'),/ambient presentation proof/);
});

test('pre-trip views require the real registered adapter, all targets, bounded canvas reuse and isolated saves',()=>{
 const r=report(),p={...profile,views:'pretriptire,pretripcycle'};for(const n of p.views.split(','))r.prototype[n]=r.prototype.cab;
 assert.throws(()=>checkReport(r,p,'sample'),/physical pre-trip proof/);r.pretripFixture=true;r.pretripProof={};for(const n of p.views.split(','))r.pretripProof[n]={source:'registered-pretrip-adapter',id:'m1-pretrip',key:'pretrip-van',targets:21,visited:21,canvases:1,bounded:true,checkpointUnchanged:true,eventsUnchanged:true,workdayUnchanged:true};assert.ok(checkReport(r,p,'sample'));
 for(const [field,value] of [['targets',20],['canvases',2],['visited',20],['workdayUnchanged',false]]){const old=r.pretripProof.pretripcycle[field];r.pretripProof.pretripcycle[field]=value;assert.throws(()=>checkReport(r,p,'sample'),/physical pre-trip proof/);r.pretripProof.pretripcycle[field]=old;}
});
