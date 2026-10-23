/* Native keys operate the physical turntable and stations. Only walking positions are fixtures. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8382',OUT=path.join(__dirname,'out/fp-review'),TAG=process.env.QA_TAG||'c40-labels';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,protocolTimeout:300000,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let page;
 const report={checks:0,modes:[],errors:[],scope:'Physical label inspection only; C-40 sorting, lifting and heavy items remain in progress.'};
 const save=()=>fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify(report,null,2)+'\n');
 const check=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);report.checks++;};
 const frames=async(n=2)=>{const f=await page.evaluate(()=>OTR.game.loop.frame);await page.waitForFunction(({f,n})=>OTR.game.loop.frame>f+n,{timeout:180000},{f,n});};
 const ready=key=>page.waitForFunction(k=>window.OTR?.game?.scene.isActive(k)&&!OTR.game.scene.getScene(k).loading,{timeout:180000},key);
 const key=async code=>{await page.keyboard.press(code);await frames();};
 const focus=async id=>{for(let i=0;i<14;i++){await key('KeyP');if(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').target)===id)return;}throw Error('Physical target not reachable: '+id);};
 const pose=async station=>{await page.evaluate(station=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),p=station?OTR.fpPackageLabelWorld.stationPoint(station):OTR.fpPackageLabelWorld.center;Object.assign(s.model.player,{x:p.x,z:station?p.z+1.7:16.6,yaw:0,pitch:0});s.sync();if(s.model.blocked(s.model.player.x,s.model.player.z))throw Error('The walking fixture entered a solid');},station);await frames();};
 try{
  for(const quality of (process.env.QA_QUALITIES||'low,high').split(','))for(const lang of (process.env.QA_LANGS||'en,ta').split(','))for(const large of (process.env.QA_SIZES||'normal,large').split(',').map(s=>s==='large')){
   console.log(quality,lang,large?'large':'normal');page=await browser.newPage();await page.setViewport({width:1280,height:720});await page.evaluateOnNewDocument(()=>localStorage.clear());page.on('pageerror',e=>report.errors.push(e.message));await page.goto(BASE+'/first-person.html?gfx='+quality+'&lang='+lang);await ready('FirstPersonScene');
   const before=await page.evaluate(large=>{const old=OTR.game.scene.getScene('FirstPersonScene');old.closePanel(false);old.releaseMouse();OTR.save.createProfile('Package inspection review');Object.assign(OTR.a11y.settings(),{large,colour:large,reducedMotion:large});OTR.workday.begin();OTR.workday.report('brief.read',{key:'suspended-label-test'});const s=OTR.registry.get('m2-labels');s.scene3d='package-label-station';if(large)OTR.academy.begin(s.id);const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:s.id});OTR.game.scene.stop('FirstPersonScene');return before;},large);
   await ready('FirstPersonScenarioScene');await page.evaluate(()=>{OTR.game.scene.getScene('FirstPersonScenarioScene').keyboardMode=true;});await key('Digit1');await page.waitForFunction(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.packageLabels.answering);
   check(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').scenarioSession.assessment),large,'assessment uses the same id');
   const mode={quality,lang,large,items:[],shots:[]};report.modes.push(mode);
   // One item per assessment layout is enough to audit the hidden coaching paths. Practice completes all nine.
   for(let index=0;index<(large?1:9);index++){
    await pose(null);await focus('label-package');
    for(const face of ['front','right','back','left','top','base']){
     await key('Tab');check(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScenarioScene').handheld.isOpen),true,'device opened with a real key');
     const menu=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),p=s.handheld.device.current;return {labels:p.options.map(o=>o.label),elapsed:s.scenarioSession.elapsed,itemTime:s.model.packageLabels.itemTime};});
     const layout=await page.evaluate(()=>{
      const h=OTR.game.scene.getScene('FirstPersonScenarioScene').handheld.device,back=h.screen.list.find(o=>o.type==='Text'&&o.x===h.sx+h.sw-14&&o.y===h.sy+h.sh-16);
      const choices=h.optionBtns.map(b=>{const a=b.bg.input.hitArea,m=b.bg.getWorldTransformMatrix();return {top:m.transformPoint(a.x-b.bg.displayOriginX,a.y-b.bg.displayOriginY).y,bottom:m.transformPoint(a.x-b.bg.displayOriginX,a.y+a.height-b.bg.displayOriginY).y,scale:b.label.scaleY,font:parseFloat(b.label.style.fontSize)};});
      const body=h.screen.list.filter(o=>o.type==='Text'&&o!==back&&o.y>h.sy+44&&o.y<h.sy+h.sh-35).map(o=>({bottom:o.getBounds().bottom,scale:o.scaleY,font:parseFloat(o.style.fontSize)}));return {choices,body,back:back?.getBounds().top};
     });
     check(typeof layout.back,'number','independent device Back control exists');for(const choice of layout.choices){assert.ok(choice.bottom<=layout.back-7.99,'choices clear Back');assert.equal(choice.scale,1);assert.ok(choice.font>=(large?17:15));report.checks+=3;}for(const line of layout.body){assert.ok(line.bottom<=layout.choices[0].top-4,'reading clears choices');assert.equal(line.scale,1);report.checks+=2;}
     check(menu.labels.includes('Read the handling guide.'),!large,'assessment omits the handling guide');await frames(4);
     check(await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene');return [s.scenarioSession.elapsed,s.model.packageLabels.itemTime];}),[menu.elapsed,menu.itemTime],'both clocks pause while inspecting controls');
     const n=['front','right','back','left','top','base'].indexOf(face);for(let p=0;p<Math.floor(n/2);p++)await key('Digit3');await key(n%2?'Digit2':'Digit1');
     await page.waitForFunction(face=>OTR.game.scene.getScene('FirstPersonScenarioScene').model.packageLabels.seen[face],{timeout:180000},face);
     check(await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene');return s.art.packageLabels.currentFace();}),face,'the rendered package turns before exposure is credited');
    }
    const item=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene').model.packageLabels;return {answer:s.item.answer,seen:Object.keys(s.seen),time:s.itemTime};});check(item.seen.length,6,'all six physical faces inspected');
    if(index===0){const shot=TAG+'-'+quality+'-'+lang+'-'+(large?'large':'normal')+'-base.png';await page.screenshot({path:path.join(OUT,shot)});mode.shots.push(shot);}
    await pose(item.answer);await focus('label-station-'+item.answer);await key('KeyE');check(await page.evaluate(()=>!!OTR.game.scene.getScene('FirstPersonScenarioScene').panel),true,'the actual station opens');await key('Digit1');
    const outcome=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene');return {outcome:s.model.packageLabels.outcomes.at(-1),body:s.panel.root.list.filter(o=>o.type==='Text').map(o=>OTR.i18n.src(o))};});check(outcome.outcome.ok,true,'native placement grades the chosen station');check(outcome.outcome.blind,false,'all sides were actually exposed');
    if(large)check(outcome.body.includes('Your decision has been recorded.'),true,'assessment gives neutral acknowledgement');mode.items.push(outcome.outcome);console.log('  package',index+1,'graded',outcome.outcome.points);save();await key('Digit1');
   }
   if(large){await key('Escape');await key('Digit3');await ready('HubScene');}
   else{await ready('ResultsScene');const result=await page.evaluate(()=>({id:OTR.flow.last.id,score:OTR.flow.last.score,ratios:OTR.flow.last.ratios,record:OTR.save.data.scenarios['m2-labels']}));check(result.id,'m2-labels');check(result.record.plays,1);check(result.record.bestScore,mode.items.reduce((a,o)=>a+o.points,0));mode.result=result;}
   const after=await page.evaluate(()=>({checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)}));check(after,before,'module cannot alter suspended workday, checkpoint or reports');save();await page.close();page=null;
  }
  assert.deepEqual(report.errors,[]);report.complete=true;save();
 }catch(error){report.failure={message:error.message,stack:error.stack};if(page){try{await page.screenshot({path:path.join(OUT,TAG+'-failure.png')});report.failure.state=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScenarioScene');return {phase:s.scenarioSession?.phase,item:s.model?.packageLabels?.index,face:s.model?.packageLabels?.presentationFace,seen:s.model?.packageLabels?.seen,target:s.target,handheld:s.handheld?.isOpen,panel:!!s.panel};});}catch(e){report.failure.capture=e.message;}}save();throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
