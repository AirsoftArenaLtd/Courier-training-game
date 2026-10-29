/* Four original profiles for the corrected static top-shelf review pose only. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),{PROFILES,checkReport}=require('../fpquality');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(ROOT,'test/out/fp-review'),tag=process.env.QA_TAG||'c44-review-pose',views='loadtop';
fs.mkdirSync(OUT,{recursive:true});const summary={scope:'Four static review-pose/resource captures. Native gameplay remains covered by the separate completed C44 cohort.',sourceRevision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),profiles:[]};
for(const p of PROFILES){
 const name=tag+'-'+p.id,file=path.join(OUT,'bench-'+name+'-'+p.quality+'.json'),log=path.join(OUT,name+'.log'),fd=fs.openSync(log,'w');let result;
 try{result=cp.spawnSync(process.execPath,['test/fpbench.js'],{cwd:ROOT,env:{...process.env,QA_GFX:p.quality,QA_TAG:name,QA_FPS_FLOOR:'0',QA_PROTOTYPE_ONLY:'1',QA_LOADING:'1',QA_SOUND:'1',QA_SHOTS:'1',QA_VIEWS:views,QA_A11Y:p.accessibility||'',QA_FALLBACK:p.fallback?'1':'0'},stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
 const item={id:p.id,exit:result.status??1,report:path.basename(file),log:path.basename(log)};
 try{
  if(result.error)throw result.error;assert.equal(item.exit,0);const report=JSON.parse(fs.readFileSync(file,'utf8'));item.peak=checkReport(report,{...p,views},name);
  const q=report.loadingProof?.loadtop,b=report.loadingLabelProjection;assert.ok(report.loadingFixture&&q&&b);
  assert.equal(q.id,'m6-load');assert.equal(q.slots,21);assert.equal(q.parcels,12);assert.equal(q.gazeTarget,'loading-parcel-l2');assert.ok(q.inkFacesClear&&q.viewedLabelPrinted&&q.canonical&&q.bounded&&q.checkpointUnchanged&&q.eventsUnchanged&&q.workdayUnchanged);
  assert.equal(q.assetVan,!p.fallback);assert.equal(q.cargoOpen,true);assert.equal(q.held,null);assert.equal(q.inkTextures,0);
  assert.equal(b.target,'loading-parcel-l2');assert.ok(b.printed&&b.legalFooting&&b.quads>0);assert.equal(b.clipped,0);assert.equal(b.width,1280);assert.equal(b.height,720);assert.equal(b.font,p.quality==='high');
  assert.ok(b.bounds.left>=32&&b.bounds.right<=1248&&b.bounds.top>=112&&b.bounds.bottom<=622,JSON.stringify(b));item.projection=b;
 }catch(error){item.exit=1;item.error=error.message;}
 summary.profiles.push(item);fs.writeFileSync(path.join(OUT,tag+'-quality.json'),JSON.stringify(summary,null,2)+'\n');console.log(p.id,item.exit?'FAIL '+item.error:'PASS '+JSON.stringify(item.peak));if(item.exit){process.exitCode=1;break;}
}
