/* Startup must retain the original whole-frame ceilings and loaded/fallback art. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),{PROFILES,checkReport}=require('../fpquality');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(ROOT,'test/out/fp-review'),TAG=process.env.QA_TAG||'b4-startup-resources',views='depot,cab,mirrorRight,handheld';
fs.mkdirSync(OUT,{recursive:true});const summary={sourceRevision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),scope:'Four unchanged startup/vehicle/handheld poses per original resource profile; static fixtures, separate from native startup timing and Intel acceptance.',views,profiles:[]};
for(const profile of PROFILES){
 const tag=TAG+'-'+profile.id,file=path.join(OUT,'bench-'+tag+'-'+profile.quality+'.json'),log=path.join(OUT,tag+'.log'),fd=fs.openSync(log,'w');let result;
 try{result=cp.spawnSync(process.execPath,['test/fpbench.js'],{cwd:ROOT,env:{...process.env,QA_GFX:profile.quality,QA_TAG:tag,QA_FPS_FLOOR:'0',QA_PROTOTYPE_ONLY:'1',QA_SOUND:'1',QA_MIRROR_PROBE:'1',QA_SHOTS:'1',QA_VIEWS:views,QA_A11Y:profile.accessibility||'',QA_FALLBACK:profile.fallback?'1':'0'},stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
 const item={id:profile.id,exit:result.status??1,report:path.basename(file),log:path.basename(log)};
 try{if(result.error)throw result.error;if(result.status!==0)throw Error('fpbench failed');item.peak=checkReport(JSON.parse(fs.readFileSync(file)),{...profile,views},tag);}
 catch(error){item.exit=1;item.error=error.message;}
 summary.profiles.push(item);fs.writeFileSync(path.join(OUT,TAG+'-quality.json'),JSON.stringify(summary,null,2)+'\n');console.log(profile.id,item.exit?'FAIL '+item.error:'PASS '+JSON.stringify(item.peak));if(item.exit){process.exitCode=1;break;}
}
