/* Original whole-frame budgets plus the bounded, scene-owned High delivery facade. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),{PROFILES,checkReport}=require('../fpquality');
const ROOT=path.resolve(__dirname,'../..'),OUT=path.join(ROOT,'test/out/fp-review'),VIEWS='firstStop,doorstep,doorsignature,doorid,cab,mirror,mirrorRight,mirrorInterior,lightingnightreverse,visibleweatherrainnight,trafficpeak,ambientnight';
function checkFronts(report,profile,tag){
 const peak=checkReport(report,{...profile,views:VIEWS},tag),high=profile.quality==='high'&&!profile.fallback;
 for(const name of VIEWS.split(',')){
  const q=report.prototype[name].deliveryFronts;assert.ok(q&&q.source==='delivery-front-resource-observation');assert.equal(q.enabled,high);
  assert.ok(q.bounded&&q.sharedGeometry&&q.detailVisibility&&q.stateUnchanged);assert.equal(q.doorTargets,q.stops);assert.equal(q.addressAnchors,q.stops);
  if(high){assert.equal(q.limit,2);assert.equal(q.use,'town-house');assert.ok(q.choices>0&&q.choices<=q.stops&&q.selected<=2&&q.instances<=2);if(name==='firstStop'||name==='doorstep')assert.ok(q.instances>0,'The delivery approach must show the actual facade');}
  else assert.equal(q.instances,0);
 }
 return peak;
}
function run(){
 const tag=process.env.QA_TAG||'b45-fronts',summary={sourceRevision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),scope:'Twelve existing delivery/cab/reflection/night/rain/traffic poses in each original quality profile (48 static views). Observation-only facade bounds/count/identity/state proof; separate from native progression and Intel acceptance.',profiles:[]};fs.mkdirSync(OUT,{recursive:true});
 for(const profile of PROFILES){
  const name=tag+'-'+profile.id,file=path.join(OUT,'bench-'+name+'-'+profile.quality+'.json'),log=path.join(OUT,name+'.log'),fd=fs.openSync(log,'w');let result;
  const env={...process.env,QA_GFX:profile.quality,QA_TAG:name,QA_PROTOTYPE_ONLY:'1',QA_FPS_FLOOR:'0',QA_DELIVERY_FRONTS:'1',QA_MODULES:'',QA_THEME:'',QA_SHOTS:'1',QA_VIEWS:VIEWS,QA_A11Y:profile.accessibility||'',QA_FALLBACK:profile.fallback?'1':'0'};
  for(const key of ['AMBIENT','RADIO','WALKAROUND','DAMAGE','STOPS','TRAFFIC','NAV','SIGNS','ACTORS','TOWN','LIGHTING','WEATHER','SOUND','MIRROR_PROBE'])env['QA_'+key]='1';
  try{result=cp.spawnSync(process.execPath,['test/fpbench.js'],{cwd:ROOT,env,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
  const item={id:profile.id,exit:result.status??1,report:path.basename(file),log:path.basename(log)};
  try{if(result.error)throw result.error;if(result.status!==0)throw Error('fpbench failed');item.peak=checkFronts(JSON.parse(fs.readFileSync(file)),profile,name);}catch(error){item.exit=1;item.error=error.message;}
  summary.profiles.push(item);fs.writeFileSync(path.join(OUT,tag+'-quality.json'),JSON.stringify(summary,null,2)+'\n');console.log(profile.id,item.exit?'FAIL '+item.error:'PASS '+JSON.stringify(item.peak));if(item.exit){process.exitCode=1;break;}
 }
}
module.exports={checkFronts,VIEWS};if(require.main===module)run();
