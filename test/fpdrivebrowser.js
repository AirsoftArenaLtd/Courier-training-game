/* Driving HUD: actual Phaser layout, English/Tamil and both accessibility text sizes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[];let checks=0;
 try{
  for(const lang of ['en','ta'])for(const large of [false,true]){
   const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:1280,height:720});
   await p.evaluateOnNewDocument(()=>localStorage.clear());
   await p.goto((process.env.QA_BASE||'http://127.0.0.1:8302')+'/first-person.html?gfx=low&lang='+lang);
   await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);
   await p.evaluate(large=>{const s=OTR.game.scene.getScene('FirstPersonScene');OTR.a11y.settings().large=large;s.closePanel();s.launch('campaign');},large);
   await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model&&!s.transitioning;});
   for(const stage of ['belt','departure','road','junction','approach','parked']){
    const result=await p.evaluate(stage=>{
     const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.closePanel();
     m.mode='cab';m.phase=['belt','departure'].includes(stage)?'prepare':'route';m.departed=true;m.paused=true;m.events[m.briefKey]=true;
     Object.assign(m.van,{x:stage==='parked'?4:2.5,z:stage==='junction'?-18:stage==='approach'||stage==='parked'?-42:0,speed:0,belt:stage!=='belt',hand:['belt','departure','parked'].includes(stage)});
     m.stopSign.resolved=false;s.sync();s.refresh();
     const o=s.objective,b=o.getBounds();return {text:o.text,x:b.x,right:b.right,bottom:b.bottom,font:parseFloat(o.style.fontSize)*Math.min(o.scaleX,o.scaleY)};
    },stage);
    assert.ok(result.x>=0&&result.right<=1281&&result.bottom<110,JSON.stringify(result));
    assert.ok(result.font>=17,JSON.stringify(result));checks++;
    if(stage==='junction'||stage==='parked')await p.screenshot({path:path.join(OUT,`c3-${lang}-${large?'large':'normal'}-${stage}.png`)});
   }
   await p.close();
  }
  assert.deepEqual(errors,[]);console.log(`${checks} driving HUD checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
