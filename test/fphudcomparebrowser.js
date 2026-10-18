/* Capture the same live, stationary fixture before/after C-47. Serve both checkouts locally. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const b=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const samples=[],errors=[];
 try{
  for(const [lang,large] of [['en',false],['ta',true]])for(const [name,base] of [['before',process.env.QA_BEFORE_BASE||'http://127.0.0.1:8329'],['after',process.env.QA_BASE||'http://127.0.0.1:8331']]){
   const p=await b.newPage();p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:1280,height:720});await p.goto(base+'/first-person.html?gfx=low');
   await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:60000});if(lang!=='en')await p.addScriptTag({url:base+'/data/i18n/'+lang+'.js'});
   await p.evaluate(({lang,large})=>{const s=OTR.game.scene.getScene('FirstPersonScene');window.compareToken=s.loadingToken;OTR.i18n.use(lang);OTR.theme.font=lang==='ta'?'"Noto Sans Tamil", "Noto Sans", sans-serif':'"Noto Sans", sans-serif';Object.assign(OTR.a11y.settings(),{large,colour:true,reducedMotion:large});s.scene.restart();},{lang,large});await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return !s.loading&&s.loadingToken!==window.compareToken;});
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.keyboardMode=true;s.closePanel();const m=OTR.fpMission.create('campaign',10,OTR.fpRoute.plan(2,10));OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);OTR.fpLoadout.configure(m);m.step=()=>{};m.paused=false;m.mode='cab';m.phase='route';m.departed=m.secured=true;m.events[m.briefKey]=true;Object.assign(m.van,{gear:1,hand:true,belt:true,look:0});s.model=m;s.area='route';s.notice='';s.progress.guidance={intro:true,seen:['driver']};s.rebuildWorld();s.sync();s.refresh();OTR.workday.begin();});
   await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.soundSource&&s.soundSource.includes('The engine is running.');});
   const frame=await p.evaluate(()=>OTR.game.loop.frame);await p.waitForFunction(f=>OTR.game.loop.frame>=f+3,{},frame);
   const sample=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return {camera:s.view.camera.position.toArray(),rotation:s.view.camera.rotation.toArray(),quality:OTR.gfx.level(),weather:s.model.routeDay.weather,events:OTR.workday.events.length,assets:s.assetBank.stats.loaded,day:s.model.routePlan.day};});
   assert.equal(sample.quality,'low');assert.equal(sample.events,0);assert.equal(sample.assets,14);samples.push({name,lang,large,...sample});await p.screenshot({path:path.join(OUT,`c47-compare-${name}-${lang}-${large?'large':'normal'}.png`)});await p.close();
  }
  for(let i=0;i<samples.length;i+=2){assert.deepEqual(samples[i].camera,samples[i+1].camera);assert.deepEqual(samples[i].rotation,samples[i+1].rotation);assert.equal(samples[i].weather,samples[i+1].weather);}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'c47-comparison.json'),JSON.stringify({samples,errors,beforeRevision:process.env.QA_BEFORE_REF||null,afterRevision:process.env.QA_REF||null,fixture:'Day two, seed ten, active captions, unchanged camera. Positions and time are fixtures, not driving or FPS evidence.'},null,2));console.log('Two matched before/after HUD comparisons passed');
 }finally{await b.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
