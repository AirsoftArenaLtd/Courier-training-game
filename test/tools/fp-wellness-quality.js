/* Unchanged fpbench resource ceilings for the unloaded M8 art component, separate from native acceptance. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),{PROFILES,checkReport}=require('../fpquality');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(ROOT,'test/out/fp-review'),tag=process.env.QA_TAG||'c46-wellness-component',views='wellnessice,wellnessclutter,wellnessentry,wellnessgate,wellnesscharge,wellnessfear,wellnessshade,wellnesscarry,wellnessclinic',requestedViews=(process.env.QA_VIEWS||views).split(','),summary={sourceRevision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),requestedViews,scope:'Static injected safety art component only, using four original fpbench profiles and limits. No loaded application adapter, native gameplay, scoring/layout/default/current-pilot or Intel FPS acceptance.',profiles:[]};
if(requestedViews.some(view=>!views.split(',').includes(view)))throw Error('Unknown wellness component view');fs.mkdirSync(OUT,{recursive:true});let failed=false;
for(const p of PROFILES.filter(p=>(process.env.QA_PROFILES||PROFILES.map(p=>p.id).join(',')).split(',').includes(p.id))){
 const name=tag+'-'+p.id,file=path.join(OUT,'bench-'+name+'-'+p.quality+'.json'),log=path.join(OUT,name+'.log'),fd=fs.openSync(log,'w');let result;
 try{result=cp.spawnSync(process.execPath,['test/fpbench.js'],{cwd:ROOT,env:{...process.env,QA_GFX:p.quality,QA_TAG:name,QA_PROTOTYPE_ONLY:'1',QA_WELLNESS_COMPONENT:'1',QA_PICKUP:'',QA_INCIDENT:'',QA_LOADING:'',QA_CUSTOMERS:'',QA_CUSTOMER_STOPS:'',QA_MODULES:'',QA_PROBLEMS:'',QA_SCANNER_STOPS:'',QA_SOUND:'1',QA_SHOTS:'1',QA_VIEWS:requestedViews.join(','),QA_A11Y:p.accessibility||'',QA_FALLBACK:p.fallback?'1':'0'},stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
 const item={id:p.id,exit:result.status??1,report:path.basename(file),log:path.basename(log)};
 try{
  if(result.error)throw result.error;if(result.status!==0)throw Error('fpbench failed');const report=JSON.parse(fs.readFileSync(file,'utf8'));item.peak=checkReport(report,{...p,views:requestedViews.join(',')},name);
  for(const view of requestedViews){const q=report.wellnessProof?.[view],id=['wellnessgate','wellnesscharge','wellnessfear'].includes(view)?'m8-dog':['wellnessshade','wellnesscarry','wellnessclinic'].includes(view)?'m8-heat':'m8-steps',index=['wellnessclutter','wellnesscharge','wellnesscarry'].includes(view)?1:['wellnessentry','wellnessfear','wellnessclinic'].includes(view)?2:0;
   if(!report.wellnessComponentFixture||!q||q.source!=='wellness-static-component-fixture'||q.id!==id||q.index!==index||!q.canonical||q.phase!=='active'||!q.bounded||q.building!==(p.fallback?0:1)||q.person!==(!p.fallback&&!['wellnessice','wellnessshade','wellnesscharge'].includes(view))||q.extraFixed>128||q.extraMoving>96||q.interiorBuilt!==(view==='wellnessclinic')||!q.checkpointUnchanged||!q.eventsUnchanged||!q.workdayUnchanged)throw Error('Invalid wellness component proof: '+view);
  }
 }catch(e){item.exit=1;item.error=e.message;failed=true;}
 summary.profiles.push(item);fs.writeFileSync(path.join(OUT,tag+'-quality.json'),JSON.stringify(summary,null,2)+'\n');console.log(p.id,item.exit?'FAIL '+item.error:'PASS '+JSON.stringify(item.peak));if(failed)break;
}
if(!summary.profiles.length)throw Error('No known profile selected');if(failed)process.exitCode=1;
