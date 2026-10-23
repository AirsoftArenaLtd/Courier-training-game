/* Native response keys/clicks, actual cue renders, pause, results and assessment. Timeline jumps are explicit fixtures. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8376',OUT=path.join(__dirname,'out/fp-review'),TAG=process.env.QA_TAG||'c39-hazard';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let page;
 const report={checks:0,runs:[],errors:[],fixture:'Temporary scene3d field. The first ordinary Low English clip plays in full real scene time. Other clips jump to just before the clue and to the ending after real input; no flags, verdicts, scores or results are injected. Cue pictures are sampled after a separate disclosed time jump.'};
 const save=()=>fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify(report,null,2)+'\n');
 try{
  const configs=[];for(const quality of (process.env.QA_QUALITIES||'low,high').split(','))for(const lang of (process.env.QA_LANGS||'en,ta').split(','))for(const large of (process.env.QA_SIZES||'normal,large').split(',').map(x=>x==='large'))configs.push({quality,lang,large,spam:false});
  if(configs.some(c=>c.quality==='low'&&c.lang==='en'&&!c.large))configs.push({quality:'low',lang:'en',large:false,spam:true});
  for(const {quality,lang,large,spam} of configs){
   console.log('hazard',quality,lang,large?'large':'normal',spam?'spam':'good');page=await browser.newPage();await page.setViewport({width:1280,height:720});await page.evaluateOnNewDocument(()=>localStorage.clear());page.on('pageerror',e=>report.errors.push(e.stack));
   const ready=key=>page.waitForFunction(key=>window.OTR?.game?.scene.isActive(key)&&!OTR.game.scene.getScene(key).loading,{timeout:120000},key);
   const frames=async(n=2)=>{const f=await page.evaluate(()=>OTR.game.loop.frame);await page.waitForFunction(({f,n})=>OTR.game.loop.frame>=f+n,{timeout:90000},{f,n});};
   const press=async key=>{await page.keyboard.press(key);await frames();};
   const choose=async source=>{const i=await page.evaluate(source=>OTR.game.scene.getScene('FirstPersonScenarioScene').panel?.choices.findIndex(c=>c.label===source)??-1,source);assert.ok(i>=0,'Missing native option '+source);await press('Digit'+(i+1));report.checks++;};
   const layout=async()=>{const texts=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene');return (s.panel?s.panel.root.list:[s.moduleGoal,s.moduleClock,s.hint]).filter(x=>x.type==='Text'&&x.visible).map(x=>{const b=x.getBounds();return {source:OTR.i18n.src(x),x:b.x,y:b.y,right:b.right,bottom:b.bottom,size:parseFloat(x.style.fontSize)*x.scaleY};});});for(const t of texts){assert.ok(t.x>=0&&t.y>=0&&t.right<=1280&&t.bottom<=720,JSON.stringify(t));assert.ok(t.size>=(large?22:18),JSON.stringify(t));report.checks+=2;}return texts;};
   await page.goto(BASE+'/first-person.html?gfx='+quality+'&lang='+lang);await ready('FirstPersonScene');
   const baseline=await page.evaluate(async({large})=>{
    OTR.save.createProfile('Hazard review');Object.assign(OTR.a11y.settings(),{large,colour:true,reducedMotion:large,narrate:true,keys:large?{Space:'KeyU'}:{}});OTR.a11y.save();OTR.workday.begin();OTR.workday.report('brief.read',{key:'suspended'});
    const old=OTR.game.scene.getScene('FirstPersonScene');old.closePanel(false);old.releaseMouse();await new Promise(resolve=>{old.events.once('shutdown',resolve);OTR.game.scene.stop('FirstPersonScene');});
    const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
    OTR.registry.get('m1-spot').scene3d='hazard-road-clips';if(large)OTR.academy.begin('m1-spot');OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m1-spot'});return before;
   },{large});await ready('FirstPersonScenarioScene');await layout();await choose('Read the next instruction page.');await layout();await choose('Begin the scenario.');
   const run={quality,lang,large,spam,clips:[],shots:[]};report.runs.push(run);
   for(let index=0;index<5;index++){
    const full=index===0&&quality==='low'&&lang==='en'&&!large&&!spam;
    if(!full)await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=s.model;m.hazardLesson.time=m.hazardLesson.clip.at-.15;OTR.fpHazardLesson.pose(m);s.sync();});
    if(index===0){await press('Escape');const t=await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.hazardLesson.time);await press(large?'KeyU':'Space');assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.hazardLesson.time),t);assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.hazardLesson.presses),0);report.checks+=2;await choose('Continue the scenario.');}
    await page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene').model.hazardLesson;return s.time>=s.clip.at;},{timeout:180000});
    if(!spam||index===0){if(spam){for(let n=0;n<7;n++)await press('Space');}else if(index===1){await page.mouse.click(720,340);await frames();}else await press(large?'KeyU':'Space');}
    const response=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=s.model,h=m.hazardLesson;return {id:h.clip.id,flags:h.flags.slice(),presses:h.presses,hand:m.van.hand,gear:m.van.gear,reduced:h.reduced,controls:s.controls.visible,help:s.help.visible,assets:!!s.art.hazardLessonArt.asset,person:!!s.art.hazardLessonArt.actor};});
    assert.equal(response.hand,false);assert.equal(response.gear,1);assert.equal(response.controls,false);assert.equal(response.help,false);assert.equal(response.assets,true);assert.equal(response.person,true);assert.equal(response.reduced,large);assert.equal(response.presses,spam?(index===0?7:0):1);report.checks+=8;await layout();
    if(!full){await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=s.model;m.hazardLesson.time=m.hazardLesson.clip.at+1.8;OTR.fpHazardLesson.pose(m);s.sync();});await frames();}
    const shot=TAG+'-'+quality+'-'+lang+'-'+(large?'large':'normal')+'-'+index+(spam?'-spam':'')+'.png';await page.screenshot({path:path.join(OUT,shot)});run.shots.push(shot);
    if(!full)await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),h=s.model.hazardLesson;h.time=h.clip.at+h.content.window+2-.01;});
    await page.waitForFunction(()=>!!OTR.game.scene.getScene('FirstPersonScenarioScene').panel,{timeout:180000});await layout();
    const result=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),h=s.model.hazardLesson;return {result:h.results[h.results.length-1],sources:s.panel.root.list.filter(x=>x.type==='Text').map(x=>OTR.i18n.src(x)),why:h.clip.why};});
    assert.equal(result.result.pts,spam?0:5);if(large)assert.equal(result.sources.some(x=>x.includes(result.why)),false);report.checks+=2;run.clips.push({response,...result});
    await choose(index===4?'See the results.':'Watch the next clip.');
   }
   await ready('ResultsScene');run.result=await page.evaluate(()=>({id:OTR.flow.last.id,stars:OTR.flow.last.stars,score:OTR.save.data.scenarios['m1-spot'].bestScore,assessment:OTR.save.data.assess?.['m1-spot'],checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)}));
   assert.equal(run.result.id,'m1-spot');assert.equal(run.result.score,spam?0:2500);assert.equal(run.result.stars.safety,spam?0:3);assert.equal(run.result.checkpoint,baseline.checkpoint);assert.equal(run.result.events,baseline.events);assert.equal(run.result.workday,baseline.workday);if(large){assert.equal(run.result.assessment.attempts,1);assert.equal(run.result.assessment.passed,true);}report.checks+=8;save();await page.close();page=null;
  }
  assert.deepEqual(report.errors,[]);report.complete=true;save();console.log(report.checks+' native hazard-perception checks passed');
 }catch(error){report.failure=error.stack;if(page)await page.screenshot({path:path.join(OUT,TAG+'-failure.png')}).catch(()=>{});save();throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
