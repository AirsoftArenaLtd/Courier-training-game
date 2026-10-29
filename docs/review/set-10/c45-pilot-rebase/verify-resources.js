/* Recheck archived reports only; never starts a browser or rewrites evidence. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),{PROFILES,checkReport}=require(path.join(root,'test/fpquality'));
const folder=path.join(__dirname,'acceptance/artifacts/c45-rebase-pickup-resources');
const summary=JSON.parse(fs.readFileSync(path.join(folder,'c45-rebase-pickup-resources-quality.json'))),peaks=[];
assert.equal(summary.profiles.length,4);assert.equal(summary.requestedViews.length,15);
for(const item of summary.profiles){
 const profile=PROFILES.find(p=>p.id===item.id),report=JSON.parse(fs.readFileSync(path.join(folder,item.report)));
 assert.equal(item.exit,0);const peak=checkReport(report,{...profile,views:summary.requestedViews.join(',')},'c45-rebase-pickup-resources-'+profile.id);assert.deepEqual(peak,item.peak);
 for(const view of summary.requestedViews){
  const q=report.pickupProof?.[view];assert.ok(report.pickupFixture&&q&&q.source==='pickup-static-render-fixture');
  assert.ok(['m7-business','m7-intl','m7-dg'].includes(q.id)&&q.canonical&&q.piece==='street'&&q.phase==='active');
  assert.ok(q.parcels===q.modelParcels&&q.bounded&&q.supported&&q.inkTextures===0&&q.viewedLabelPrinted);
  assert.equal(q.highShipper,profile.quality==='high'&&!profile.fallback);
  for(const field of ['on','receives','casts'])assert.equal(q.shadow[field],profile.quality==='high');
  if(profile.quality==='high'){assert.equal(q.shadow.span,20);assert.deepEqual(q.shadow.size,[512,512]);}
  assert.ok(q.checkpointUnchanged&&q.eventsUnchanged&&q.workdayUnchanged);
  if(view==='pickupcart')assert.equal(q.gaze,'pickup-parcel-b6');
 }
 peaks.push({id:item.id,views:summary.requestedViews.length,peak});
}
console.log(JSON.stringify(peaks,null,2));
