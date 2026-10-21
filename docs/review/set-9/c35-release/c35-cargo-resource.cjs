/* Focused rendered cargo/rear regression, using the unchanged fixed quality budgets. */
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const root='/workspace/c35-walkaround',out=path.join(root,'test/out/fp-review'),{PROFILES,checkReport}=require(root+'/test/fpquality.js');
const result={sourceRevision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'cargo-centre-and-rear-after-interaction-fix',profiles:[]};
for(const base of PROFILES){
 const p={...base,views:'walkcargo,walkrear'},tag='c35-cargo-resource-'+p.id,report=path.join(out,'bench-'+tag+'-'+p.quality+'.json'),log=path.join(out,tag+'.log'),fd=fs.openSync(log,'w');
 if(fs.existsSync(report))fs.unlinkSync(report);
 const env={...process.env,QA_GFX:p.quality,QA_TAG:tag,QA_PROTOTYPE_ONLY:'1',QA_CARGO_PROBE:'1',QA_WALKAROUND:'1',QA_DAMAGE:'1',QA_STOPS:'1',QA_TRAFFIC:'1',QA_NAV:'1',QA_SIGNS:'1',QA_ACTORS:'1',QA_TOWN:'1',QA_LIGHTING:'1',QA_WEATHER:'1',QA_SOUND:'1',QA_MIRROR_PROBE:'1',QA_THEME:'',QA_SHOTS:'1',QA_VIEWS:p.views,QA_A11Y:p.accessibility||'',QA_FALLBACK:p.fallback?'1':'0'};
 let child;try{child=cp.spawnSync(process.execPath,['test/fpbench.js'],{cwd:root,env,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
 const item={id:p.id,views:p.views.split(','),exit:child.status??1,report:path.basename(report)};
 try{
  if(item.exit)throw Error('Benchmark child failed.');const d=JSON.parse(fs.readFileSync(report,'utf8'));item.peak=checkReport(d,p,tag);
  if(d.walkaroundProof.walkcargo.physicalPick!=='cargo'||d.walkaroundProof.walkrear.physicalPick!=='wear-rear')throw Error('A physical cargo/rear control is obscured.');
 }catch(e){item.exit=1;item.error=e.message;}
 result.profiles.push(item);fs.writeFileSync(path.join(out,'c35-cargo-resource-quality.json'),JSON.stringify(result,null,2)+'\n');console.log(item.id+': '+(item.exit?'FAIL '+item.error:'PASS '+JSON.stringify(item.peak)));
 if(item.exit){process.exitCode=1;break;}
}
