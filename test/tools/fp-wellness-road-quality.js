/* Original fpbench resource caps plus canonical, physical, bounded and isolation proof. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),{PROFILES,checkReport}=require('../fpquality');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(ROOT,'test/out/fp-review'),VIEWS='icecab,icenotice,icerail,icegrit,fatiguecab,fatiguepark,fatiguewarning,fatiguebreak';
function checkWellnessRoad(report,profile,tag){
 const peak=checkReport(report,profile,tag);for(const view of profile.views.split(',')){
  const p=report.wellnessRoadProof?.[view],kind=view.startsWith('ice')?'ice':'fatigue';
  if(!report.wellnessRoadFixture||!p||p.source!=='wellness-road-static-render-fixture'||p.id!=='m8-'+kind||p.kind!==kind||p.phase!=='active'||p.piece!=='street'||!p.canonical||p.targets!==(kind==='ice'?2:1)||!(p.letters>0)||p.letters>p.capacity||p.capacity!==(profile.quality==='high'?3072:256)||p.inkTextures!==0||!p.bounded||!p.checkpointUnchanged||!p.eventsUnchanged||!p.workdayUnchanged||view==='icenotice'&&p.pick!=='wellness-road-notice'||view==='icerail'&&p.pick!=='wellness-handrail')throw Error('Invalid wellness road fixture proof: '+view);
 }return peak;
}
function run(){
 const tag=process.env.QA_TAG||'c46-wellness-road',views=process.env.QA_VIEWS||VIEWS,summary={sourceRevision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),scope:'Static ice/fatigue resource views only; native movement/assessment and Intel FPS are separate.',profiles:[]};fs.mkdirSync(OUT,{recursive:true});
 for(const p of PROFILES.filter(p=>(process.env.QA_PROFILES||PROFILES.map(p=>p.id).join(',')).split(',').includes(p.id))){
  const name=tag+'-'+p.id,reportFile=path.join(OUT,'bench-'+name+'-'+p.quality+'.json'),log=path.join(OUT,name+'.log'),fd=fs.openSync(log,'w');let result;
  try{result=cp.spawnSync(process.execPath,['test/fpbench.js'],{cwd:ROOT,env:{...process.env,QA_GFX:p.quality,QA_TAG:name,QA_PROTOTYPE_ONLY:'1',QA_WELLNESS_ROAD:'1',QA_SOUND:'1',QA_MIRROR_PROBE:'1',QA_SHOTS:'1',QA_VIEWS:views,QA_A11Y:p.accessibility||'',QA_FALLBACK:p.fallback?'1':'0'},stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
  const item={id:p.id,exit:result.status??1,report:path.basename(reportFile)};
  try{if(result.error)throw result.error;if(result.status!==0)throw Error('Benchmark child failed');item.peak=checkWellnessRoad(JSON.parse(fs.readFileSync(reportFile,'utf8')),{...p,views},name);}catch(e){item.exit=1;item.error=e.message;}
  summary.profiles.push(item);fs.writeFileSync(path.join(OUT,tag+'-quality.json'),JSON.stringify(summary,null,2)+'\n');console.log(p.id,item.exit?'FAIL '+item.error:'PASS '+JSON.stringify(item.peak));if(item.exit){process.exitCode=1;break;}
 }
 if(!summary.profiles.length)throw Error('No known resource profile selected');return summary;
}
module.exports={checkWellnessRoad,VIEWS};if(require.main===module)run();
