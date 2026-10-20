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

test('traffic views require the combined versioned traffic and navigation fixture',()=>{
 const r=report(),p={...profile,views:'trafficpeak'};r.prototype.trafficpeak=r.prototype.cab;assert.throws(()=>checkReport(r,p,'sample'),/traffic and navigation fixture/);r.trafficFixture=true;assert.ok(checkReport(r,p,'sample'));
});
