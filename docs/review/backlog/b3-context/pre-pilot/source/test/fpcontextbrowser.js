/* Forced shared-context loss while real keyboard input drives the actual motor. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8400',OUT=path.join(__dirname,'out/fp-review'),TAG=process.env.QA_TAG||'b3-context',GFX=process.env.QA_GFX||'low';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let page;
 const report={quality:GFX,checks:0,failures:[],errors:[],scope:'Declared initial parked-cab/profile fixture. Thereafter physical keyboard input and the real WEBGL_lose_context extension; no position, mission, event, scoring or timer edits.'};
 const save=()=>fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify(report,null,2));
 const check=(ok,message,detail)=>{report.checks++;if(!ok)report.failures.push({message,detail});save();};
 try{
  page=await browser.newPage();await page.setViewport({width:1280,height:720});await page.bringToFront();page.on('pageerror',e=>{report.errors.push(e.message);save();});
  await page.evaluateOnNewDocument(()=>localStorage.clear());await page.goto(BASE+'/first-person.html?gfx='+GFX,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.OTR?.game?.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:180000});
  await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.keyboardMode=true;s.capture=()=>{};s.closePanel();OTR.a11y.settings().reducedMotion=true;s.progress.sequence=9;s.progress.campaign=null;s.launch('campaign');});
  await page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model?.kind==='campaign'&&!s.transitioning;},{timeout:180000});
  await page.evaluate(()=>{
   const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.closePanel();m.mode='cab';m.phase='route';m.departed=m.repaired=m.secured=true;m.cargoOpen=false;m.events[m.briefKey]=true;OTR.fpLater.depart(m);OTR.fpWalkaroundFlow.depart(m);Object.assign(m.van,{x:2.84,z:-18,yaw:0,speed:0,gear:1,hand:false,belt:true,look:0});m.player.pitch=0;OTR.workday.begin();s.sync();s.refresh();
   window.otrContextSnapshot=()=>({elapsed:m.elapsed,van:{...m.van},player:{...m.player},parcels:m.parcels.map(p=>({id:p.id,location:p.location})),events:JSON.stringify(OTR.workday.events)});
   window.otrLose=OTR.game.renderer.gl.getExtension('WEBGL_lose_context');
   s.sys.game.canvas.addEventListener('webglcontextlost',()=>{window.otrLoss={at:performance.now(),state:window.otrContextSnapshot()};});
   s.sys.game.canvas.addEventListener('webglcontextrestored',()=>{window.otrRestored={state:window.otrContextSnapshot()};});
  });
  check(await page.evaluate(()=>!!window.otrLose),'The actual WebGL loss extension is available');
  await page.keyboard.down('KeyW');await page.waitForFunction(()=>OTR.game.scene.getScene('FirstPersonScene').model.van.speed>1,{timeout:180000});
  await page.evaluate(()=>window.otrLose.loseContext());await page.waitForFunction(()=>!!window.otrLoss&&OTR.game.renderer.gl.isContextLost(),{timeout:30000});
  await page.waitForFunction(()=>performance.now()-window.otrLoss.at>1200,{timeout:30000});
  report.loss=await page.evaluate(()=>({before:window.otrLoss.state,after:window.otrContextSnapshot(),held:{...OTR.game.scene.getScene('FirstPersonScene').held}}));
  check(JSON.stringify(report.loss.before)===JSON.stringify(report.loss.after),'Simulation, cargo and observations freeze at the loss moment',report.loss);
  await page.keyboard.up('KeyW');await page.keyboard.press('KeyR');
  const afterAction=await page.evaluate(()=>window.otrContextSnapshot());check(afterAction.events===report.loss.before.events&&afterAction.van.gear===report.loss.before.van.gear,'No cab actions or scoring observations are accepted while the display is lost',afterAction);
  await page.evaluate(()=>window.otrLose.restoreContext());await page.waitForFunction(()=>!!window.otrRestored&&!OTR.game.renderer.gl.isContextLost(),{timeout:60000});
  report.restored=await page.evaluate(()=>({atEvent:window.otrRestored.state,now:window.otrContextSnapshot(),held:{...OTR.game.scene.getScene('FirstPersonScene').held},diagnostics:{...OTR.game.scene.getScene('FirstPersonScene').view.diagnostics}}));
  check(JSON.stringify(report.restored.atEvent)===JSON.stringify(report.loss.before),'Restoration keeps the same in-memory workday moment',report.restored);
  await page.screenshot({path:path.join(OUT,TAG+'-restored.png')});check(report.errors.length===0,'No page errors during loss and restoration',report.errors);
  report.complete=true;save();console.log(report.checks+' context checks completed; '+report.failures.length+' failed.');if(report.failures.length)process.exitCode=1;
 }catch(error){report.failure=error.stack;if(page)await page.screenshot({path:path.join(OUT,TAG+'-failure.png')}).catch(()=>{});save();throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
