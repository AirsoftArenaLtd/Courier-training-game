/* Dispatch-only layout and workflow audit; uses the actual game, at both text sizes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[];let checks=0;
 try{
  for(const lang of ['en','ta'])for(const large of [false,true]){
   const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1280,height:720});
   await page.evaluateOnNewDocument(()=>localStorage.clear());
   await page.goto((process.env.QA_BASE||'http://127.0.0.1:8302')+'/first-person.html?gfx=low&lang='+lang);
   await page.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:30000});
   await page.evaluate(large=>{const s=OTR.game.scene.getScene('FirstPersonScene');OTR.a11y.settings().large=large;s.progress.welcomed=true;s.closePanel();s.launch('campaign');},large);
   await page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model&&!s.transitioning;});
   await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.closePanel();Object.assign(s.model.player,{x:-12.1,z:11});OTR.workday.begin();s.showDispatch();});
   const audit=async tag=>{
    const issues=await page.evaluate(()=>{
     const s=OTR.game.scene.getScene('FirstPersonScene'),panel=s.panel,issues=[];
     for(const o of panel.root.list)if(o.type==='Text'){
      const b=o.getBounds(),bottom=panel.buttons.length?Math.min(...panel.buttons.map(b=>b.y-b.height/2)):610;
      if(b.x<130||b.right>1150||b.y<90||b.bottom>635)issues.push('bounds: '+o.text);
      if(Number(o.style.fontSize)*Math.min(o.scaleX,o.scaleY)<17)issues.push('small: '+o.text);
      if(o.y===170&&b.bottom>bottom-12)issues.push('body overlaps buttons: '+o.text);
     }return issues;
    });assert.deepEqual(issues,[],tag);checks++;
    if(tag)await page.screenshot({path:path.join(OUT,`c2-${lang}-${large?'large':'normal'}-${tag}.png`)});
   };
   await audit('brief');
   await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());
   assert.equal(await page.evaluate(()=>OTR.workday.events.length),0);checks++;
   await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').showDispatch());
   // All catalogue nodes and answers must fit, including feedback on the longer branch.
   const count=await page.evaluate(()=>OTR_DATA.briefs.length);
   for(let day=1;day<=count;day++){
    const ids=await page.evaluate(day=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.briefing.day=day;return Object.keys(OTR_DATA.briefs[day-1].talk.nodes);},day);
    for(const id of ids){
     const answers=await page.evaluate(id=>{const s=OTR.game.scene.getScene('FirstPersonScene');const n=OTR_DATA.briefs[s.model.briefing.day-1].talk.nodes[id];s.showMorningBrief(id);return n.choices?n.choices.length:0;},id);
     await audit();
     for(let index=0;index<answers;index++){
      await page.evaluate((id,index)=>OTR.game.scene.getScene('FirstPersonScene').showBriefAnswer(id,index),id,index);await audit();
      await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').panel.choices[0].action());await audit();
     }
    }
   }
   await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.briefing.day=1;s.showDispatch();});
   // Keyboard selection traverses the full graph, then the three manifest pages.
   for(let i=0;i<20;i++){
    if(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').panel===null))break;
    await page.keyboard.press('Digit1');await new Promise(r=>setTimeout(r,200));
    if(await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.panel&&s.panel.choices.some(c=>c.label==='Next');}))await audit('manifest');
   }
   assert.equal(await page.evaluate(()=>OTR.workday.events.filter(e=>e.type==='brief.read').length),1);checks++;
   await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.checkpoint();s.model=OTR.fpMission.restore(s.progress.campaign);s.showDispatch();});
   assert.equal(await page.evaluate(()=>OTR.workday.events.filter(e=>e.type==='brief.read').length),1);checks++;
   await page.close();
  }
  assert.deepEqual(errors,[]);console.log(`${checks} dispatch checks passed; English/Tamil, normal/large, low graphics`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
