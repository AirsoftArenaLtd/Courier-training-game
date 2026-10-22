const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root='/workspace/c51-pilot-acceptance',out=path.join(root,'test/out/fp-review'),q=require(root+'/test/fpquality.js'),summary={scope:'ambient-only',sourceRevision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),budgets:q.BUDGETS,profiles:[]};
for(const original of q.PROFILES){
 const profile={...original,views:original.views.split(',').filter(v=>v.startsWith('ambient')).join(',')},tag='c51-focused-'+profile.id;
 const env={...process.env,QA_GFX:profile.quality,QA_TAG:tag,QA_PROTOTYPE_ONLY:'1',QA_AMBIENT:'1',QA_RADIO:'1',QA_WALKAROUND:'1',QA_DAMAGE:'1',QA_STOPS:'1',QA_TRAFFIC:'1',QA_NAV:'1',QA_SIGNS:'1',QA_ACTORS:'1',QA_TOWN:'1',QA_LIGHTING:'1',QA_WEATHER:'1',QA_SOUND:'1',QA_MIRROR_PROBE:'1',QA_THEME:'',QA_SHOTS:'1',QA_VIEWS:profile.views,QA_A11Y:profile.accessibility||'',QA_FALLBACK:profile.fallback?'1':'0'};
 const log=fs.openSync(path.join(out,tag+'.log'),'w');let result;try{result=cp.spawnSync(process.execPath,['test/fpbench.js'],{cwd:root,env,stdio:['ignore',log,log]});}finally{fs.closeSync(log);}
 assert.equal(result.status,0,profile.id+' failed; see '+tag+'.log');const report='bench-'+tag+'-'+profile.quality+'.json',peak=q.checkReport(JSON.parse(fs.readFileSync(path.join(out,report))),profile,tag);summary.profiles.push({...profile,views:profile.views.split(','),report,exit:0,peak});fs.writeFileSync(path.join(out,'c51-focused-quality.json'),JSON.stringify(summary,null,2)+'\n');console.log(profile.id+': PASS '+JSON.stringify(peak));
}
assert.equal(summary.profiles.reduce((n,p)=>n+p.views.length,0),17);console.log('All 17 focused ambient resource views pass.');
