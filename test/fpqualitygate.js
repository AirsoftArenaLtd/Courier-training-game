/* Guard against mislabeled/stale fixtures and false quality passes. No browser is needed. */
const test=require('node:test'),assert=require('node:assert/strict'),{checkReport}=require('./fpquality');
const profile={id:'fixture',quality:'low',views:'cab,reverse'};
function report(){const sample=()=>({frames:12,contextLost:false,peak:{calls:60,triangles:2400,textures:2,attachmentBytes:3557376},phaserTextures:{withMipmapsUpperBytes:3000000}});return {tag:'sample',quality:'low',actualQuality:'low',audioContext:'running',accessibility:[],assets:{loaded:14,failed:0},prototype:{cab:sample(),reverse:sample()},errors:[],missingViews:[]};}
test('a profile requires actual frames for every named view and its requested quality',()=>{
 const r=report();assert.equal(checkReport(r,profile,'sample').triangles,2400);r.prototype.cab.peak.calls=0;assert.throws(()=>checkReport(r,profile,'sample'),/empty render/);r.prototype.cab.peak.calls=60;delete r.prototype.reverse;assert.throws(()=>checkReport(r,profile,'sample'),/No valid frames/);r.prototype.reverse={frames:0};assert.throws(()=>checkReport(r,profile,'sample'),/No valid frames/);r.actualQuality='high';assert.throws(()=>checkReport(r,profile,'sample'),/tag and quality/);
});
test('resource overflow, lost contexts and page errors fail the integrated gate',()=>{
 for(const [key,n] of [['calls',65],['triangles',2501],['textures',3],['attachmentBytes',4194305]]){const r=report();r.prototype.cab.peak[key]=n;assert.throws(()=>checkReport(r,profile,'sample'),/exceeds/);}
 let r=report();r.prototype.reverse.contextLost=true;assert.throws(()=>checkReport(r,profile,'sample'),/valid frames/);r=report();r.errors=['Page error'];assert.throws(()=>checkReport(r,profile,'sample'),/browser check/);r=report();r.prototype.cab.phaserTextures.withMipmapsUpperBytes=4194305;assert.throws(()=>checkReport(r,profile,'sample'),/Phaser/);
});
test('a fallback profile must really fail every selected model without loading any',()=>{
 const p={...profile,fallback:true},r=report();assert.throws(()=>checkReport(r,p,'sample'),/asset fixture/);r.assetFailure='missing-model-files';r.assets={loaded:0,failed:14};assert.ok(checkReport(r,p,'sample'));r.assets.loaded=1;assert.throws(()=>checkReport(r,p,'sample'),/asset fixture/);
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
