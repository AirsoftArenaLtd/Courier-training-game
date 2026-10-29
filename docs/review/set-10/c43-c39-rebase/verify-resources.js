/* Read archived reports and retain every original scanner resource/fixture check. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../../../..'),{PROFILES,checkReport}=require(path.join(root,'test/fpquality'));
const base=path.join(__dirname,'acceptance/artifacts/c43-c39-scanner-resources'),summary=JSON.parse(fs.readFileSync(path.join(base,'c43-c39-scanner-resources-quality.json'))),views='scannercab,scannerreverse,scannercargo,scannerplanter,scannerphoto,scannersignature,scannerreception,scannerclosed,scannerrefusal,scanneridvalid,scanneridunder,scanneridexpired,scannerhandheld,scannercontrols',result=[];
assert.equal(summary.profiles.length,4);
for(const item of summary.profiles){
 const p=PROFILES.find(p=>p.id===item.id),report=JSON.parse(fs.readFileSync(path.join(base,item.report)));assert.equal(item.exit,0);
 const peak=checkReport(report,{...p,views},'c43-c39-scanner-resources-'+p.id);assert.deepEqual(peak,item.peak);
 for(const view of views.split(',')){
  const q=report.scannerProof?.[view],id=view.startsWith('scannerid')?'m5-adult':['scannerclosed','scannerrefusal'].includes(view)?'m5-exceptions':'m5-pod',index=['scannersignature','scannerclosed','scanneridunder'].includes(view)?1:['scannerreception','scannerrefusal','scanneridexpired'].includes(view)?2:0,person=id==='m5-adult'||id==='m5-pod'&&index>0||view==='scannerrefusal';
  assert.ok(report.scannerFixture&&q&&q.source==='scanner-static-render-fixture');assert.equal(q.id,id);assert.equal(q.index,index);assert.equal(q.phase,'active');assert.equal(q.piece,'street');assert.ok(q.canonical&&q.bounded);
  assert.equal(q.building,p.fallback?0:1);assert.equal(q.person,!p.fallback&&person);assert.equal(q.assetDoor,p.quality==='high'&&!p.fallback);assert.equal(q.font,p.quality==='high');assert.equal(q.identity,view.startsWith('scannerid'));
  if(['scannerplanter','scannerphoto'].includes(view))assert.equal(q.spot,'planter');
  if(view==='scannerphoto'){assert.equal(q.photo.grade,'good');assert.ok(q.photoPreview.visible);assert.equal(q.photoPreview.width,p.quality==='high'?640:320);assert.equal(q.photoPreview.height,p.quality==='high'?360:180);}
  if(view==='scannerplanter')assert.ok(q.frameClear);assert.ok(q.checkpointUnchanged&&q.eventsUnchanged&&q.workdayUnchanged);
 }
 result.push({id:p.id,views:14,peak});
}
console.log(JSON.stringify(result,null,2));
