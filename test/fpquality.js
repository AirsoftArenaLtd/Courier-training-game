#!/usr/bin/env node
/* Fixed milestone-eight review gate. Browsers run sequentially; fpbench supplies the measurements. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const MiB=1024*1024,ROOT=path.join(__dirname,'..'),OUT=path.join(__dirname,'out/fp-review');
const BUDGETS={low:{calls:64,triangles:2500,textures:2,attachmentBytes:4*MiB,phaserBytes:4*MiB},high:{calls:128,triangles:300000,textures:4,attachmentBytes:16*MiB,phaserBytes:16*MiB}};
const PROFILES=[
 {id:'loaded-low',quality:'low',views:'depot,cab,mirror,mirrorRight,mirrorInterior,handheld,barcodeAim,firstStop,doorstep,doorsignature,doorid,laterstressturnleft,laterrearpeak,lightingnightreverse,visibleweatherstorm,visibleweathersnowwalk,townhouse,townroad,townparked-car,towncab,actorsvan,actorscargoextra,actorsresident,actorsmirror,signsjunction,signsnumber,signsoneway,signspeak,navfull,navline,navreroute,navblocked,navdouble'},
 {id:'loaded-high',quality:'high',views:'cab,mirror,mirrorRight,mirrorInterior,lightingnightreverse,townhouse,townroad,actorscargoextra,actorsresident,actorsmirror,signsjunction,signsoneway,signspeak,navfull,navline,navreroute,navblocked,navdouble'},
 {id:'accessible-low',quality:'low',accessibility:'large,colour,reduced',views:'cab,mirrorInterior,barcodeAim,visibleweatherstorm,actorscargoextra,laterrearpeak,signsjunction,signspeak,navfull,navreroute,navblocked'},
 {id:'fallback-low',quality:'low',fallback:true,views:'cab,mirrorInterior,lightingnightreverse,laterrearpeak,actorscargoextra,actorsresident,signsjunction,signspeak,navfull,navreroute,navblocked'}
];
for(const profile of PROFILES)profile.views+=profile.id==='loaded-low'||profile.id==='loaded-high'?',trafficsignal,trafficgreen,trafficcyclist,trafficmirror,trafficschool,trafficpeak':',trafficsignal,trafficschool,trafficpeak';
function checkReport(report,profile,tag){
 const fail=text=>{throw Error(profile.id+': '+text);};
 if(report.tag!==tag||report.actualQuality!==profile.quality||report.quality!==profile.quality)fail('The report does not match its requested tag and quality.');
 if(JSON.stringify([...(report.accessibility||[])].sort())!==JSON.stringify((profile.accessibility||'').split(',').filter(Boolean).sort()))fail('The accessibility fixture does not match its profile.');
 if(profile.views.split(',').some(v=>v.startsWith('nav'))&&report.navigationFixture!==true)fail('The navigation fixture was not exercised.');
 if(report.audioContext!=='running')fail('The live sound and caption fixture was not exercised.');
 const assets=report.assets,assetOK=assets&&assets.fallbacks===0&&(profile.fallback?report.assetFailure==='missing-model-files'&&assets.loaded===0&&assets.failed>=14:assets.loaded>=14&&assets.failed===0);
 if(!assetOK)fail('The asset fixture was not exercised.');
 if((report.errors||[]).length||(report.missingViews||[]).length)fail('A view or browser check failed.');
 const budget=BUDGETS[profile.quality],peak={calls:0,triangles:0,textures:0,attachmentBytes:0,phaserBytes:0};
 for(const name of profile.views.split(',')){
  if(['mirror','mirrorRight','mirrorInterior'].includes(name)){const proof=report.mirrorProof&&report.mirrorProof[name],red=proof&&proof.red,blue=proof&&proof.blue;if(!red||!blue||!(red[0]>180&&red[0]>blue[0]+100&&blue[2]>150&&blue[0]<80))fail('No live reflected pixels for '+name+'.');}
  const sample=report.prototype&&report.prototype[name];if(!sample||!(sample.frames>0)||sample.contextLost)fail('No valid frames for '+name+'.');
  if(!sample.peak||!(sample.peak.calls>0)||!(sample.peak.triangles>0)||!(sample.peak.attachmentBytes>0))fail('An empty render was recorded for '+name+'.');
  for(const key of ['calls','triangles','textures','attachmentBytes']){const n=sample.peak&&sample.peak[key];if(!Number.isFinite(n)||n<0||n>budget[key])fail(name+' exceeds '+key+'.');peak[key]=Math.max(peak[key],n);}
  const bytes=sample.phaserTextures&&sample.phaserTextures.withMipmapsUpperBytes;if(!Number.isFinite(bytes)||bytes<0||bytes>budget.phaserBytes)fail(name+' exceeds Phaser texture memory.');peak.phaserBytes=Math.max(peak.phaserBytes,bytes);
 }
 return peak;
}
function run(){
 fs.mkdirSync(OUT,{recursive:true});const selected=(process.env.QA_PROFILES||PROFILES.map(p=>p.id).join(',')).split(',').map(id=>id.trim()).filter(Boolean),tagBase=process.env.QA_TAG||'c29';
 if(!selected.length||selected.some(id=>!PROFILES.some(p=>p.id===id)))throw Error('Unknown or empty quality profile.');
 const summary={sourceRevision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),budgets:BUDGETS,profiles:[]};let failed=false;
 for(const profile of selected.map(id=>PROFILES.find(p=>p.id===id))){
  const tag=tagBase+'-'+profile.id,reportFile=path.join(OUT,`bench-${tag}-${profile.quality}.json`),start=Date.now();
  // Remove only this run's prior generated report, so a failed child cannot reuse stale evidence.
  if(fs.existsSync(reportFile))fs.unlinkSync(reportFile);
  const env={...process.env,QA_GFX:profile.quality,QA_TAG:tag,QA_PROTOTYPE_ONLY:'1',QA_TRAFFIC:'1',QA_NAV:'1',QA_SIGNS:'1',QA_ACTORS:'1',QA_TOWN:'1',QA_LIGHTING:'1',QA_WEATHER:'1',QA_SOUND:'1',QA_MIRROR_PROBE:'1',QA_THEME:'',QA_SHOTS:'1',QA_VIEWS:profile.views,QA_A11Y:profile.accessibility||'',QA_FALLBACK:profile.fallback?'1':'0'};
  // Write measurements as they arrive, so a long profile can be inspected while it runs.
  const logFile=path.join(OUT,tag+'.log'),logFD=fs.openSync(logFile,'w');let result;
  try{result=cp.spawnSync(process.execPath,['test/fpbench.js'],{cwd:ROOT,env,stdio:['ignore',logFD,logFD]});}finally{fs.closeSync(logFD);}
  if(result.error)fs.appendFileSync(logFile,String(result.error));
  const item={id:profile.id,quality:profile.quality,views:profile.views.split(','),accessibility:profile.accessibility||'',fallback:!!profile.fallback,report:path.basename(reportFile),exit:result.status??1,elapsedMs:Date.now()-start};
  try{if(result.status!==0)throw Error('Benchmark child failed; see '+tag+'.log');item.peak=checkReport(JSON.parse(fs.readFileSync(reportFile,'utf8')),profile,tag);}catch(e){item.exit=1;item.error=e.message;failed=true;}
  summary.profiles.push(item);fs.writeFileSync(path.join(OUT,tagBase+'-quality.json'),JSON.stringify(summary,null,2)+'\n');console.log(profile.id+': '+(item.exit?'FAIL '+item.error:'PASS '+JSON.stringify(item.peak)));
  if(failed)break;
 }
 if(failed)process.exitCode=1;return summary;
}
module.exports={BUDGETS,PROFILES,checkReport};if(require.main===module)run();
