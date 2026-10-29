/* Replay archived native pickup decisions through original callbacks; retain original resource checks. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../../../..');
const cohortAt=process.argv.indexOf('--cohort');
const load=f=>JSON.parse(fs.readFileSync(f,'utf8')),base=path.resolve(__dirname,cohortAt<0?'acceptance':process.argv[cohortAt+1]);
const plan=load(path.join(base,'plan.json')),state=load(path.join(base,'status.json')),original=require(path.join(root,'test/tools/fp-pickup-original'));
const partial=process.argv.includes('--native-only'),native=[];
if(!partial){assert.equal(state.phase,'complete');assert.equal(state.jobs.length,10);}
for(const job of state.jobs){
 if(job.script!=='test/fppickupbrowser.js')continue;
 assert.equal(job.exit,0);assert.deepEqual(job.changedSources,[]);
 const d=load(path.join(base,'artifacts',job.tag,job.tag+'.json'));
 assert.ok(d.complete&&!d.uncommittedRuntime);assert.deepEqual(d.errors,[]);assert.equal(d.modes.length,1);
 assert.equal(d.sourceRevision,plan.sourceRevision);assert.equal(d.protocolSha256,plan.sources['test/fppickupbrowser.js']);
 for(const [file,hash] of Object.entries(d.sourceFiles))assert.equal(hash,plan.sources[file],file);
 const m=d.modes[0],r=m.result,[quality,lang,size,kind]=job.env.QA_CASE.split('-'),bad=!!job.env.QA_VARIANT;
 assert.deepEqual([m.quality,m.lang,m.large,m.kind],[quality,lang,size==='large',kind]);assert.equal(d.variant,job.env.QA_VARIANT||'good');assert.equal(r.id,'m7-'+kind);assert.ok(d.checks>100&&m.durable);
 const replay=original.replay(r.id,m.observation);assert.deepEqual(replay,m.original);assert.deepEqual(original.normalize(r.result),replay.result);assert.deepEqual(r.stars,replay.stars);
 assert.equal(r.result.stats.seconds,Math.round(r.runElapsed));
 const passed=Object.entries(r.stars).every(([cat,n])=>n>=(r.passStars[cat]||2))&&!r.verdict.criticals.length;assert.equal(passed,!bad);
 if(!bad)assert.equal(r.verdict.criticals.length,0);if(['bad-call','bad-docs'].includes(d.variant))assert.ok(r.verdict.criticals.length>0);
 if(r.assessment){assert.equal(r.assessment.attempts,1);assert.equal(r.assessment.pending,false);assert.equal(r.assessment.passed,passed);}if(bad)assert.equal(r.assessment.passed,false);
 assert.equal(r.record.plays,1);assert.equal(r.record.bestScore,r.result.score);assert.deepEqual(Object.fromEntries(Object.keys(r.stars).map(cat=>[cat,r.record.bestStars[cat]])),r.stars);
 assert.deepEqual(m.reload.record,r.record);assert.equal(m.reload.scene,'PickupScene');assert.equal(m.reload.default3d,false);assert.equal(m.reload.scene3d,'pickup-counter');if(r.assessment)assert.deepEqual(m.reload.assessment,r.assessment);
 assert.equal(m.fontProof.override,null);if(lang==='ta')assert.ok(m.fontProof.platformFonts.some(f=>f.postScriptName==='NotoSansTamil-Bold'&&f.glyphCount>=28));
 assert.ok(m.resultPresentation.active&&m.resultPresentation.modals===0);assert.equal(m.resultPresentation.counter,m.resultPresentation.expected);
 native.push({tag:job.tag,checks:d.checks,quality,lang,large:m.large,kind,variant:d.variant,score:r.result.score,stars:r.stars,criticals:r.verdict.criticals.length,assessmentPassed:r.assessment?.passed??null,durable:true,originalCallbacksReplayed:true});
}
if(partial){console.log(JSON.stringify({scope:'Completed native jobs only; full resource acceptance remains separate.',nativeJobs:native,nativeChecks:native.reduce((n,j)=>n+j.checks,0)},null,2));process.exit(0);}
assert.equal(native.length,9);
const {PROFILES,checkReport}=require(path.join(root,'test/fpquality')),prefix='c45-c39-pickup-resources',where=path.join(base,'artifacts',prefix),summary=load(path.join(where,prefix+'-quality.json'));
assert.equal(summary.profiles.length,4);assert.equal(summary.sourceRevision,plan.sourceRevision);
const views='pickupbusiness,pickupcart,pickupcount,pickupinspection,pickupreceipt,pickupcontrols,pickupinternational,pickupinvoice,pickupinvoicelast,pickupfindings,pickupexception,pickupdangerous,pickupdeclared,pickuprefusal,pickupsigned',profiles=[];
assert.deepEqual(summary.requestedViews,views.split(','));
for(const item of summary.profiles){
 const p=PROFILES.find(p=>p.id===item.id);assert.ok(p);assert.equal(item.exit,0);
 const report=load(path.join(where,item.report)),peak=checkReport(report,{...p,views},prefix+'-'+p.id);assert.deepEqual(peak,item.peak);
 for(const view of views.split(',')){
  const q=report.pickupProof?.[view],kind=['pickupinternational','pickupinvoice','pickupinvoicelast','pickupfindings','pickupexception'].includes(view)?'intl':['pickupdangerous','pickupdeclared','pickuprefusal','pickupsigned'].includes(view)?'dg':'business';
  assert.ok(report.pickupFixture&&q&&q.source==='pickup-static-render-fixture');assert.equal(q.id,'m7-'+kind);assert.equal(q.piece,'street');assert.equal(q.phase,'active');
  assert.ok(q.canonical&&q.bounded&&q.supported&&q.viewedLabelPrinted&&q.checkpointUnchanged&&q.eventsUnchanged&&q.workdayUnchanged);assert.equal(q.parcels,q.modelParcels);assert.equal(q.inkTextures,0);assert.equal(q.highShipper,p.quality==='high'&&!p.fallback);
  for(const key of ['on','receives','casts'])assert.equal(q.shadow[key],p.quality==='high');
  if(p.quality==='high'){assert.equal(q.shadow.span,20);assert.deepEqual(q.shadow.size,[512,512]);}if(view==='pickupcart')assert.equal(q.gaze,'pickup-parcel-b6');
 }
 profiles.push({id:p.id,views:15,peak});
}
console.log(JSON.stringify({nativeJobs:native,nativeChecks:native.reduce((n,j)=>n+j.checks,0),resourceProfiles:profiles,resourceViews:60},null,2));
