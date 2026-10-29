/* Independently replay archived native observations and apply the original resource gate. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),root=path.resolve(__dirname,'../../../..');
const cohortAt=process.argv.indexOf('--cohort');
const load=f=>JSON.parse(fs.readFileSync(f,'utf8')),base=path.resolve(__dirname,cohortAt<0?'acceptance-ready':process.argv[cohortAt+1]);
const plan=load(path.join(base,'plan.json')),state=load(path.join(base,'status.json'));
const original=require(path.join(root,'test/tools/fp-loading-original'));
const partial=process.argv.includes('--native-only'),native=[];
// A documentation handoff may advance HEAD while frozen browser inputs stay identical.
const equivalentRevisions=new Set([plan.sourceRevision]);
const verifyRevision=revision=>{
 if(equivalentRevisions.has(revision))return;
 const changes=cp.execFileSync('git',['diff','--name-only',plan.sourceRevision,revision,'--','src','data','assets','lib','css','test','index.html','first-person.html'],{cwd:root,encoding:'utf8'}).trim();
 assert.equal(changes,'','Only documentation may differ from the frozen source');equivalentRevisions.add(revision);
};
if(!partial){assert.equal(state.phase,'complete');assert.equal(state.jobs.length,7);}
for(const job of state.jobs){
 if(job.script!=='test/fploadingbrowser.js')continue;
 assert.equal(job.exit,0);assert.deepEqual(job.changedSources,[]);
 const d=load(path.join(base,'artifacts',job.tag,job.tag+'.json'));
 assert.ok(d.complete&&!d.uncommittedRuntime);assert.deepEqual(d.errors,[]);assert.equal(d.modes.length,1);
 verifyRevision(d.sourceRevision);assert.equal(d.protocolSha256,plan.sources['test/fploadingbrowser.js']);
 for(const [file,hash] of Object.entries(d.sourceFiles))assert.equal(hash,plan.sources[file],file);
 const m=d.modes[0],r=m.result,[quality,lang,size,kind]=job.env.QA_CASE.split('-'),bad=!!job.env.QA_VARIANT;
 assert.deepEqual([m.quality,m.lang,m.large,m.kind],[quality,lang,size==='large',kind]);assert.equal(d.variant,job.env.QA_VARIANT||'good');
 assert.equal(r.id,'m6-'+kind);assert.ok(d.checks>100&&m.durable);
 const replay=original[kind](m.observation);
 assert.deepEqual(replay,m.original);assert.deepEqual(original.normalize(r.result),replay.result);assert.deepEqual(r.stars,replay.stars);
 assert.equal(r.result.stats.seconds,Math.round(r.runElapsed));assert.deepEqual(r.verdict.criticals,[]);
 const passed=Object.entries(replay.stars).every(([cat,stars])=>stars>=(r.passStars[cat]||2));assert.equal(passed,!bad);
 if(r.assessment){assert.equal(r.assessment.attempts,1);assert.equal(r.assessment.pending,false);assert.equal(r.assessment.passed,passed);}
 if(bad)assert.equal(r.assessment.passed,false);
 assert.equal(r.record.plays,1);assert.equal(r.record.bestScore,r.result.score);
 assert.deepEqual(Object.fromEntries(Object.keys(r.stars).map(cat=>[cat,r.record.bestStars[cat]])),r.stars);
 assert.deepEqual(m.reload.record,r.record);assert.equal(m.reload.scene,'LoadingScene');assert.equal(m.reload.default3d,false);assert.equal(m.reload.scene3d,'loading-cargo');
 if(r.assessment)assert.deepEqual(m.reload.assessment,r.assessment);
 assert.equal(m.fontProof.override,null);
 if(lang==='ta')assert.ok(m.fontProof.platformFonts.some(f=>f.postScriptName==='NotoSansTamil-Bold'&&f.glyphCount>=28));
 assert.ok(m.resultPresentation.active&&m.resultPresentation.modals===0);assert.equal(m.resultPresentation.counter,m.resultPresentation.expected);
 native.push({tag:job.tag,sourceRevision:d.sourceRevision,sourceEquivalentToPlan:true,checks:d.checks,quality,lang,large:m.large,kind,variant:d.variant,score:r.result.score,stars:r.stars,assessmentPassed:r.assessment?.passed??null,durable:true,originalCallbacksReplayed:true});
}
if(partial){console.log(JSON.stringify({scope:'Only currently completed native jobs; full resource gate is pending.',nativeJobs:native,nativeChecks:native.reduce((n,j)=>n+j.checks,0)},null,2));process.exit(0);}
assert.equal(native.length,6);
const {PROFILES,checkReport}=require(path.join(root,'test/fpquality'));
const prefix='c44-c39-loading-resources',where=path.join(base,'artifacts',prefix),summary=load(path.join(where,prefix+'-quality.json'));
assert.equal(summary.profiles.length,4);verifyRevision(summary.sourceRevision);
const views='loadclosed,loadcart,loadcargo,loadtop,loadbottom,loadcarried,loadstrapped,loadunsafe,loadreport,loadhandheld,loadcontrols,findcargo,findunit,findhelp',profiles=[];
for(const item of summary.profiles){
 const p=PROFILES.find(p=>p.id===item.id);assert.ok(p);assert.equal(item.exit,0);
 const report=load(path.join(where,item.report)),peak=checkReport(report,{...p,views},prefix+'-'+p.id);assert.deepEqual(peak,item.peak);
 for(const view of views.split(',')){
  const q=report.loadingProof?.[view],find=view.startsWith('find');
  assert.ok(report.loadingFixture&&q&&q.source==='loading-static-render-fixture');assert.equal(q.id,find?'m6-find':'m6-load');
  assert.equal(q.phase,'active');assert.equal(q.piece,'depot');assert.equal(q.slots,21);assert.equal(q.parcels,12);
  assert.ok(q.inkFacesClear&&q.viewedLabelPrinted&&q.cargoFit&&q.cargoFit.floor>=.6&&q.canonical&&q.bounded);
  assert.equal(q.moduleMode,find?'find':'load');assert.equal(q.highInk,p.quality==='high');assert.equal(q.inkTextures,0);assert.notEqual(q.assetVan,!!p.fallback);
  if(q.assetVan)assert.ok(Number.isFinite(q.doorOpening)&&Math.abs(q.doorOpening-(q.cargoOpen?1:0))<=.000001);
  assert.notEqual(q.cargoOpen,['loadclosed','loadcart','loadcontrols'].includes(view));assert.ok(q.checkpointUnchanged&&q.eventsUnchanged&&q.workdayUnchanged);
  if(view==='loadstrapped')assert.ok(q.strapped);if(view==='loadcarried')assert.equal(q.held,'l1');if(view==='loadreport')assert.equal(q.taskPhase,'report');
  if(view==='findunit'){assert.equal(q.round,'f10');assert.equal(q.gazeTarget,'loading-parcel-f10');assert.ok(q.printedParcelIds.includes('f10'));}
  if(view==='findhelp')assert.equal(q.hint,'shown');
 }
 profiles.push({id:p.id,views:14,peak});
}
console.log(JSON.stringify({nativeJobs:native,nativeChecks:native.reduce((n,j)=>n+j.checks,0),resourceProfiles:profiles,resourceViews:56},null,2));
