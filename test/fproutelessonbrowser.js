/* Actual sat-nav selection, manifest keys, three-round sequencing and same-id results; the good order is a fixture. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8375',OUT=path.join(__dirname,'out/fp-review'),TAG=process.env.QA_TAG||'c39-route';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={checks:0,runs:[],errors:[],fixture:'Temporary scene3d registry field and the original planner solver’s good stop order. All target selection, reading, sequencing, acceptance and results use real keys.'};let page;
 const save=()=>fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify(report,null,2)+'\n');
 try{
  const configs=[];for(const quality of (process.env.QA_QUALITIES||'low,high').split(','))for(const lang of (process.env.QA_LANGS||'en,ta').split(','))for(const large of (process.env.QA_SIZES||'normal,large').split(',').map(x=>x==='large'))configs.push({quality,lang,large,bad:false});
  if(configs.some(c=>c.quality==='low'&&c.lang==='en'&&!c.large))configs.push({quality:'low',lang:'en',large:false,bad:true});
  for(const {quality,lang,large,bad} of configs){
   console.log('route',quality,lang,large?'large':'normal',bad?'bad':'good');page=await browser.newPage();await page.setViewport({width:1280,height:720});await page.evaluateOnNewDocument(()=>localStorage.clear());page.on('pageerror',e=>report.errors.push(e.stack));
   const ready=key=>page.waitForFunction(key=>window.OTR?.game?.scene.isActive(key)&&!OTR.game.scene.getScene(key).loading,{timeout:120000},key);
   const frames=async()=>{const f=await page.evaluate(()=>OTR.game.loop.frame);await page.waitForFunction(f=>OTR.game.loop.frame>=f+2,{timeout:90000},f);};
   const press=async key=>{if(key==='KeyE')await page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene');return s.time.now>=(s.inputBlockedUntil||0);});await page.keyboard.press(key);await frames();};
   const choose=async source=>{const i=await page.evaluate(source=>OTR.game.scene.getScene('FirstPersonScenarioScene').panel?.choices.findIndex(x=>x.label===source)??-1,source);assert.ok(i>=0,'Missing option '+source);await press('Digit'+(i+1));report.checks++;};
   const layout=async()=>{const proof=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene');return s.panel.root.list.filter(x=>x.type==='Text').map(x=>{const b=x.getBounds();return {source:OTR.i18n.src(x),x:b.x,y:b.y,right:b.right,bottom:b.bottom,size:parseFloat(x.style.fontSize)*x.scaleY};});});for(const t of proof){assert.ok(t.x>=0&&t.y>=0&&t.right<=1280&&t.bottom<=720,JSON.stringify(t));assert.ok(t.size>=(large?22:18),JSON.stringify(t));report.checks+=2;}return proof;};
   await page.goto(BASE+'/first-person.html?gfx='+quality+'&lang='+lang);await ready('FirstPersonScene');
   const baseline=await page.evaluate(({large})=>{
    OTR.save.createProfile('Sat-nav review');Object.assign(OTR.a11y.settings(),{large,colour:true,reducedMotion:true,narrate:true,keys:large?{KeyP:'KeyO'}:{}});OTR.a11y.save();OTR.workday.begin();OTR.workday.report('brief.read',{key:'suspended'});
    const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
    const old=OTR.game.scene.getScene('FirstPersonScene');old.closePanel(false);old.releaseMouse();OTR.registry.get('m1-route').scene3d='route-satnav';
    if(large)OTR.academy.begin('m1-route');OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m1-route'});OTR.game.scene.stop('FirstPersonScene');return before;
   },{large});await ready('FirstPersonScenarioScene');await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').keyboardMode=true);await press('Digit1');
   let selected=false;for(let n=0;n<45;n++){await press(large?'KeyO':'KeyP');if(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').target==='cab-camera')){selected=true;break;}}
   assert.equal(selected,true);assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').art.pick()),'cab-camera');await press('KeyE');report.checks+=2;
   const run={quality,lang,large,bad,rounds:[],shots:[]};report.runs.push(run);
   for(let round=0;round<3;round++){
    await layout();while(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').panel.choices.some(x=>x.label==='Read the next dispatch note.'))){await choose('Read the next dispatch note.');await layout();}await choose('Sequence the stops.');
    const order=await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.routeLesson.planner.optimal.order.slice());if(bad)order.reverse();
    await layout();await choose('Review the route.');assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').panel.choices.some(x=>x.label==='Accept this route.')),false);report.checks++;await choose('Continue sequencing the stops.');
    for(const id of order){
      for(let n=0;n<9;n++){if(await page.evaluate(id=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.routeLesson.selected===id,id))break;await choose('Read the next stop.');}
      assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.routeLesson.selected),id);await choose('Add this stop to the route.');await layout();report.checks++;
    }
    const actual=await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.routeLesson.order.slice());assert.deepEqual(actual,order);report.checks++;await choose('Review the route.');const texts=await layout();
    if(round===1){const shot=TAG+'-'+quality+'-'+lang+'-'+(large?'large':'normal')+(bad?'-bad':'')+'.png';await page.screenshot({path:path.join(OUT,shot)});run.shots.push(shot);}
    run.rounds.push({order,actual,texts});await choose('Accept this route.');
   }
   await ready('ResultsScene');run.result=await page.evaluate(()=>({id:OTR.flow.last.id,stars:OTR.flow.last.stars,score:OTR.save.data.scenarios['m1-route'].bestScore,assessment:OTR.save.data.assess?.['m1-route'],checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)}));
   assert.equal(run.result.id,'m1-route');if(bad){assert.ok(run.result.score<=1800);assert.ok(run.result.stars.service<=1);}else{assert.equal(run.result.score,1800);assert.equal(run.result.stars.efficiency,3);}assert.equal(run.result.checkpoint,baseline.checkpoint);assert.equal(run.result.events,baseline.events);assert.equal(run.result.workday,baseline.workday);if(large){assert.equal(run.result.assessment.attempts,1);assert.equal(run.result.assessment.passed,true);}report.checks+=8;save();await page.close();page=null;
  }
  assert.deepEqual(report.errors,[]);report.complete=true;save();console.log(report.checks+' native sat-nav checks passed');
 }catch(error){report.failure=error.stack;if(page)await page.screenshot({path:path.join(OUT,TAG+'-failure.png')}).catch(()=>{});save();throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
