/* Native physical targets and test/record/sign-off keys. Travel and seeded defects are fixtures; verdicts are input. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8372',OUT=path.join(__dirname,'out/fp-review'),TAG=process.env.QA_TAG||'c39-pretrip';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let page;const report={checks:0,runs:[],errors:[],fixture:'Only travel positions, the deterministic defect seed and temporary scene3d registry field are fixtures. Nearby ray selection, remapped keys, cab entry/exit, switches, tests, condition recording and the existing results screen are real.'};
 const save=()=>fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify(report,null,2)+'\n');
 try{
  for(const quality of (process.env.QA_QUALITIES||'low,high').split(','))for(const lang of (process.env.QA_LANGS||'en,ta').split(','))for(const large of (process.env.QA_SIZES||'normal,large').split(',').map(x=>x==='large')){
   console.log('pretrip',quality,lang,large?'large':'normal');page=await browser.newPage();await page.setViewport({width:1280,height:720});await page.evaluateOnNewDocument(()=>localStorage.clear());page.on('pageerror',e=>report.errors.push(e.stack));
   const ready=key=>page.waitForFunction(key=>window.OTR?.game?.scene.isActive(key)&&!OTR.game.scene.getScene(key).loading,{timeout:120000},key);
   const frames=async(n=2)=>{const f=await page.evaluate(()=>OTR.game.loop.frame);await page.waitForFunction(({f,n})=>OTR.game.loop.frame>=f+n,{timeout:90000},{f,n});};
   const press=async key=>{if(key==='KeyE')await page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene');return s.time.now>=(s.inputBlockedUntil||0);});await page.keyboard.press(key);await frames();};
   const focus=async id=>{for(let n=0;n<55;n++){await press(large?'KeyO':'KeyP');const actual=await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').target);if(actual===id){assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').art.pick()),id);report.checks++;return;}}throw Error('Cannot select '+id);};
   const choose=async source=>{const i=await page.evaluate(text=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene');return s.panel?.choices.findIndex(c=>c.label===text)??-1;},source);assert.ok(i>=0,'No native option '+source);await press('Digit'+(i+1));report.checks++;};
   const pose=async id=>{await page.evaluate(id=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=s.model,a=m.pretripLesson.locations[id],view=a[3];if(view==='cab')return;Object.assign(m.player,OTR.fp.local(m.van,view==='driver'?-2.25:view==='passenger'?2.25:a[0],view==='front'?Math.min(-3.85,a[2]-1):view==='rear'?Math.max(3.85,a[2]+1):a[2]));m.player.pitch=0;m.paused=false;s.sync();s.refresh();},id);await frames();};
   const cab=async()=>{if(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.mode==='cab'))return;await pose('tire_front');await focus('driver');await press('KeyE');assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.mode),'cab');report.checks++;};
   await page.goto(BASE+'/first-person.html?gfx='+quality+'&lang='+lang);await ready('FirstPersonScene');
   const baseline=await page.evaluate(({large})=>{
    OTR.save.createProfile('Pre-trip review');Object.assign(OTR.a11y.settings(),{large,colour:true,reducedMotion:true,narrate:true,keys:large?{KeyP:'KeyO'}:{}});OTR.a11y.save();OTR.workday.begin();OTR.workday.report('brief.read',{key:'suspended'});
    const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
    const old=OTR.game.scene.getScene('FirstPersonScene');old.closePanel(false);old.releaseMouse();OTR.registry.get('m1-pretrip').scene3d='pretrip-van';
    const original=OTR.fpPretrip.create;OTR.fpPretrip.create=function(content){let n=7;return original.call(this,content,()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;});};
    if(large)OTR.academy.begin('m1-pretrip');OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m1-pretrip'});OTR.game.scene.stop('FirstPersonScene');return before;
   },{large});await ready('FirstPersonScenarioScene');await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').keyboardMode=true);await press('Digit1');
   const run={quality,lang,large,items:[],shots:[]};report.runs.push(run);
   const items=await page.evaluate(()=>OTR_DATA.pretrip.items.map(it=>({id:it.id,view:it.view,needs:it.needs,kind:it.kind})));
   let lamps=false;
   for(const it of items){
    console.log('part',it.id);
    if(it.view==='cab')await cab();else await pose(it.id);
    await focus('pretrip-'+it.id);
    const affordance=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene');s.notice='';s.noticeUntil=0;s.refresh();return {visible:s.hint.visible,text:OTR.i18n.src(s.hint)};});
    assert.equal(affordance.visible,true);assert.ok(affordance.text.includes('Press E to interact.'),affordance.text);report.checks+=2;
    await press('KeyE');assert.ok(await page.evaluate(()=>!!OTR.game.scene.getScene('FirstPersonScenarioScene').panel),JSON.stringify(await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene');return {target:s.target,aim:s.aimTarget(),phase:s.scenarioSession.phase,mode:s.model.mode,paused:s.model.paused,parked:s.model.parked(),held:s.model.heldId};})));report.checks++;
    if(it.needs==='lights'&&!lamps){
     assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').panel.choices.some(c=>c.label==='Record this part as serviceable.')),false);report.checks++;
     await press('Escape');await cab();await press('KeyL');await press('KeyC');await focus('cab-exit');await press('KeyE');lamps=true;await pose(it.id);await focus('pretrip-'+it.id);await press('KeyE');
    }
    if(it.needs==='gauge'){
     await choose('Measure the tread.');await choose('Measure the other half of the tread.');await choose('Record the condition.');
    }else if(it.needs==='press'){
     await choose(it.kind==='pedal'?'Hold the service brake for three seconds.':'Test this part.');
     if(it.kind==='pedal')await page.waitForFunction(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.pretripLesson.tests.brake_pedal===true,{timeout:30000});
    }
    const proof=await page.evaluate(id=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),p=s.panel,rect=o=>{const b=o.getBounds();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,size:parseFloat(o.style.fontSize)*o.scaleY,text:OTR.i18n.src(o)};};return {id,canJudge:OTR.fpPretrip.canJudge(s.model,id),bad:s.model.pretripLesson.defects.has(id),texts:p.root.list.filter(o=>o.type==='Text').map(rect),textures:Object.keys(OTR.game.textures.list).filter(k=>k.startsWith('fp-pretrip-')),localItems:s.scenarioSession.log.items.length};},it.id);
    assert.equal(proof.canJudge,true,it.id);assert.equal(proof.localItems,0);assert.deepEqual(proof.textures,['fp-pretrip-closeup']);for(const t of proof.texts){assert.ok(t.x>=0&&t.y>=0&&t.right<=1280&&t.bottom<=720,JSON.stringify(t));assert.ok(t.size>=(large?22:18),JSON.stringify(t));}report.checks+=4;run.items.push(proof);
    if(['tire_front_p','brake_pedal'].includes(it.id)){const shot=TAG+'-'+quality+'-'+lang+'-'+(large?'large':'normal')+'-'+it.id+'.png';await page.screenshot({path:path.join(OUT,shot)});run.shots.push(shot);}
    await choose(proof.bad?'Flag this part as defective.':'Record this part as serviceable.');assert.equal(await page.evaluate(()=>OTR.game.textures.exists('fp-pretrip-closeup')),false);report.checks++;
   }
   assert.equal(await page.evaluate(()=>OTR.fpPretrip.complete(OTR.game.scene.getScene('FirstPersonScenarioScene').model)),true);report.checks++;
   const expected=await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.pretripLesson.defects.size*100+300);
   await press('Tab');const sign=await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').handheld.device.current.options.findIndex(o=>o.label==='Sign off the inspection.'));assert.ok(sign>=0);await press('Digit'+(sign+1));await ready('ResultsScene');
   run.result=await page.evaluate(()=>({id:OTR.flow.last.id,stars:OTR.flow.last.stars,score:OTR.save.data.scenarios['m1-pretrip'].bestScore,assessment:OTR.save.data.assess?.['m1-pretrip'],checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null),textures:Object.keys(OTR.game.textures.list).filter(k=>k.startsWith('fp-pretrip-'))}));
   assert.equal(run.result.id,'m1-pretrip');assert.equal(run.result.score,expected);assert.equal(run.result.stars.safety,3);assert.equal(run.result.stars.efficiency,3);assert.equal(run.result.checkpoint,baseline.checkpoint);assert.equal(run.result.events,baseline.events);assert.equal(run.result.workday,baseline.workday);assert.deepEqual(run.result.textures,[]);if(large){assert.equal(run.result.assessment.attempts,1);assert.equal(run.result.assessment.passed,true);}report.checks+=8;save();await page.close();page=null;
  }
  assert.deepEqual(report.errors,[]);report.complete=true;save();console.log(report.checks+' native pre-trip checks passed');
 }catch(error){report.failure=error.stack;if(page)await page.screenshot({path:path.join(OUT,TAG+'-failure.png')}).catch(()=>{});save();throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
