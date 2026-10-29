/* Revalidate all recorded views and original budgets without browser execution. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{PROFILES,checkReport}=require('../../../../test/fpquality'),base=__dirname,out=path.join(base,'acceptance'),plan=JSON.parse(fs.readFileSync(path.join(out,'plan.json'))),profiles=[],ledger=[];
assert.equal(plan.jobs.length,4);
const common='cab,mirror,mirrorRight,mirrorInterior,lightingnightreverse,visibleweatherrainnight,visibleweatherrainreverse,visibleweatherstorm,navdouble,trafficschool,trafficpeak,ambientcab,ambientmirror,ambientnight';
for(const [i,id] of ['loaded-high','loaded-low','accessible-low','fallback-low'].entries()){
 const j=plan.jobs[i],original=PROFILES.find(p=>p.id===id),p={...original,views:common+(id==='loaded-high'?',ambientbench':'')};assert.deepEqual(j.profile,{id,quality:p.quality,...(p.accessibility?{accessibility:p.accessibility}:{}),...(p.fallback?{fallback:true}:{}),views:p.views});
 const folder=path.join(out,'artifacts',j.tag),file='bench-'+j.tag+'-'+p.quality+'.json',r=JSON.parse(fs.readFileSync(path.join(folder,file))),peak=checkReport(r,p,j.tag);assert.equal(r.assets.loaded,p.fallback?0:p.quality==='high'?23:14);assert.deepEqual(Object.keys(r.prototype).sort(),p.views.split(',').sort());assert.equal(r.navigationFixture,true);assert.equal(r.trafficFixture,true);assert.equal(r.ambientFixture,true);
 profiles.push({id,views:p.views.split(',').length,peak,assets:r.assets.loaded,mirrorProof:r.mirrorProof,report:file});
 for(const view of p.views.split(',')){const s=r.prototype[view];ledger.push({profile:id,view,calls:s.peak.calls,triangles:s.peak.triangles,textures:s.peak.textures,attachmentBytes:s.peak.attachmentBytes,phaserBytes:s.phaserTextures.withMipmapsUpperBytes,frames:s.frames,contextLost:s.contextLost,mirror:s.mirrorViews||null});}
}
assert.equal(ledger.length,57);console.log(JSON.stringify({views:57,profiles,ledger}));
