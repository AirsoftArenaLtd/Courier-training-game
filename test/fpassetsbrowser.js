/* Actual local loader, rendered variants, failure recovery, restart ownership and loading layouts. One browser. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});
const TAG=process.env.QA_TAG||'c27-assets';
const BASE=process.env.QA_BASE||'http://127.0.0.1:8302',wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[],outside=[],report={scenarios:[],layouts:[]};let checks=0,recording;
 const open=async(mode,gfx='low')=>{
  const p=await browser.newPage();await p.setViewport({width:1280,height:720});await p.setCacheEnabled(false);await p.evaluateOnNewDocument(()=>localStorage.clear());p.on('pageerror',e=>errors.push(e.message));await p.setRequestInterception(true);
  let slowModels=0;const requests=[];p.on('request',async r=>{
   const url=r.url();if(url.endsWith('/assets/3d/manifest.json'))slowModels=0;if(!url.startsWith(BASE)&&!url.startsWith('data:')&&!url.startsWith('blob:')){outside.push(url);await r.abort();return;}
   if(url.includes('/assets/3d/')||url.endsWith('/lib/GLTFLoader.min.js'))requests.push(url.slice(BASE.length));
   if(mode==='manifest'&&url.endsWith('/assets/3d/manifest.json')||mode==='loader'&&url.endsWith('/lib/GLTFLoader.min.js')||mode==='missing'&&url.endsWith('.glb')||mode==='high-fallback'&&url.endsWith('/delivery-high.glb')){await r.respond({status:404,body:''});return;}
   if(url.endsWith('.glb')){
    await wait(mode==='layouts'?(slowModels++<2?1200:0):100);const bytes=fs.readFileSync(path.join(ROOT,new URL(url).pathname));
    if(mode==='corrupt')bytes.writeUInt32LE(0,0);await r.respond({status:200,contentType:'model/gltf-binary',body:bytes});return;
   }
   await r.continue();
  });
  await p.goto(BASE+'/first-person.html?gfx='+gfx);
  await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:30000});return {p,requests};
 };
 const view=async p=>{
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.closePanel();s.launch('campaign');});await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return !s.transitioning&&!s.loading&&s.model?.town;});
  return p.evaluate(()=>{
   const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.closePanel();m.paused=true;
   const lot=m.town.lots.filter(l=>!m.stops.some(st=>st.lotId===l.id)).sort((a,b)=>(a.x-4)**2+(a.z-8)**2-((b.x-4)**2+(b.z-8)**2))[0];
   const x=m.town.xs.reduce((a,b)=>Math.abs(a-lot.x)<Math.abs(b-lot.x)?a:b),z=lot.z+3,dx=lot.x-x,dz=lot.z-z;
   Object.assign(m.player,{x,z,yaw:Math.atan2(dx,-dz),pitch:Math.atan2(1.65-lot.h*.4,Math.hypot(dx,dz))});m.mode='walk';s.sync();s.refresh();
   return {stats:s.assetBank.stats,groups:s.art.assetGroups.length,instances:s.art.assetGroups.map(g=>g.children.map(o=>o.count)),unchangedSolid:!!m.solids.find(b=>b.x===lot.x&&b.z===lot.z)};
  });
 };
 try{
  for(const mode of (process.env.QA_MODES||'low,high,high-fallback,missing,corrupt,loader,manifest,layouts').split(',')){
   const {p,requests}=await open(mode,mode.startsWith('high')?'high':'low');
   if(mode==='layouts'){
    await p.addScriptTag({url:BASE+'/data/i18n/ta.js'});
    for(const lang of ['en','ta'])for(const large of [false,true]){
     await p.evaluate(({lang,large})=>{const s=OTR.game.scene.getScene('FirstPersonScene');window.oldBank=s.assetBank;window.oldToken=s.loadingToken;OTR.i18n.use(lang);OTR.theme.font=lang==='ta'?'"Noto Sans Tamil", "Noto Sans", sans-serif':'"Noto Sans", sans-serif';Object.assign(OTR.a11y.settings(),{large,reducedMotion:true});s.scene.restart();},{lang,large});
     await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.loadingToken!==window.oldToken&&s.loading&&s.objective.text===OTR.i18n.t('Your workday is loading.');});
     const layout=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),b=s.objective.getBounds();return {text:s.objective.text,x:b.x,right:b.right,bottom:b.bottom,font:parseFloat(s.objective.style.fontSize),oldModels:window.oldBank.models.size};});
     assert.ok(layout.x>=0&&layout.right<=1270&&layout.bottom<=82,JSON.stringify(layout));assert.ok(layout.font>=(large?23:19));assert.equal(layout.oldModels,0);checks+=3;report.layouts.push({lang,large,...layout});
     await p.screenshot({path:path.join(OUT,`${TAG}-loading-${lang}-${large?'large':'normal'}.png`)});
     await p.waitForFunction(()=>!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:30000});
     assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').assetBank.stats.loaded),14);checks++;
    }
   }else{
    const result=await view(p),healthy=mode==='low'||mode.startsWith('high'),highVariant=mode.startsWith('high');assert.equal(result.groups,healthy?8:0);assert.equal(result.stats.loaded,healthy?(highVariant?20:14):0);assert.equal(result.unchangedSolid,true);checks+=3;
    assert.equal(result.stats.fallbacks,mode==='high-fallback'?1:0);checks++;
    if(healthy){assert.equal(result.stats.failed,0);checks++;assert.ok(result.instances.length===8&&result.instances.every(a=>a.length===1)&&result.instances.some(a=>a[0]>0));assert.ok(requests.some(r=>r.endsWith(highVariant?'garage-high.glb':'garage-low.glb')));assert.ok(!requests.some(r=>r.endsWith(highVariant?'garage-low.glb':'garage-high.glb')));checks+=3;}
    else{assert.ok(result.stats.failed>0);checks++;}
    await wait(250);await p.screenshot({path:path.join(OUT,TAG+'-'+mode+'.png')});report.scenarios.push({mode,...result,requests});
    if(mode==='low'){
     if(process.env.QA_CLIP==='1')recording=await p.screencast({path:path.join(OUT,TAG+'.webm'),fps:15,quality:35});
     await wait(1000);
     const preserved=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),snapshot=JSON.stringify(s.model.snapshot()),reports=OTR.workday.events.length,bank=s.assetBank;s.assetBank=null;s.rebuildWorld();s.assetBank=bank;s.sync();return {snapshot,reports};});
     await wait(1000);await p.screenshot({path:path.join(OUT,TAG+'-procedural.png')});
     const after=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.rebuildWorld();s.sync();return {snapshot:JSON.stringify(s.model.snapshot()),reports:OTR.workday.events.length,groups:s.art.assetGroups.length};});
     assert.equal(after.snapshot,preserved.snapshot);assert.equal(after.reports,preserved.reports);assert.equal(after.groups,8);checks+=3;
     await wait(1000);if(recording){await recording.stop();recording=null;}
    }
   }
   await p.close();console.log('assets browser '+mode+' passed');
  }
  assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);checks+=2;report.checks=checks;report.errors=errors;report.outside=outside;
  fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify(report,null,2));console.log(checks+' asset browser checks passed');
 }finally{if(recording)await recording.stop();await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
