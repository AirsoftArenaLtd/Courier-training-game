#!/usr/bin/env node
/* Unmodified ?bench=1 plus raw-frame samples of the first-person prototype. Run one browser at a time. */
const fs=require('node:fs'),path=require('node:path'),pp=require('puppeteer-core');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8302',GFX=process.env.QA_GFX||'high',TAG=process.env.QA_TAG||'current';
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 const errors=[];let report={tag:TAG,quality:GFX};
 try{
  const p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));
  if(process.env.QA_PROTOTYPE_ONLY!=='1'){
  await p.goto(BASE+'/index.html?bench=1&gfx='+GFX);
  const end=Date.now()+360000;let last=-1;
  while(Date.now()<end){const result=await p.evaluate(()=>{const s=window.OTR&&OTR.game&&OTR.game.scene.getScene('BenchScene');return s?{count:s.results.length,done:!!s.report}:{};});
   if(result.count!==last){last=result.count;console.log(TAG+' '+GFX+' benchmark screens: '+last);}
   if(result.done)break;await wait(1000);
  }
  report.bench=await p.evaluate(()=>{const s=OTR.game.scene.getScene('BenchScene');if(!s.report)throw Error('Benchmark did not finish');return {gpu:s.gpu(),results:s.results,report:s.report};});
  if(report.bench.results.some(r=>r.avg<=0||r.low<=0))throw Error('Benchmark screen has no measured frames');
  await p.screenshot({path:path.join(OUT,`bench-${TAG}-${GFX}.png`)});
  }
  await p.goto(BASE+'/first-person.html?gfx='+GFX);
  await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:30000});
  const sample=async name=>{
   await wait(1500);
   const value=await p.evaluate(()=>new Promise(resolve=>{const frames=[];let prev=performance.now(),start=prev;const onFrame=()=>{const now=performance.now();frames.push(now-prev);prev=now;if(now-start<10000)return;
    OTR.game.events.off('step',onFrame);frames.sort((a,b)=>a-b);const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,worst=frames.slice(Math.floor(frames.length*.99));
    resolve({frames:frames.length,avgFPS:+(1000/mean(frames)).toFixed(2),low1FPS:+(1000/mean(worst)).toFixed(2),p99ms:+frames[Math.floor(frames.length*.99)].toFixed(2),maxMs:+frames[frames.length-1].toFixed(2),contextLost:OTR.game.renderer.gl.isContextLost()});};OTR.game.events.on('step',onFrame);}));
   console.log(TAG+' '+GFX+' '+name+' '+JSON.stringify(value));report.prototype[name]=value;
  };
  report.prototype={};
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());await sample('hub');
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').launch('campaign'));
  await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model&&!s.transitioning;});
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());await sample('depot');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.mode='cab';s.model.paused=false;s.sync();});await sample('cab');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.__mirrorBench=()=>s.model.mirrorAt=s.model.elapsed;s.events.on('update',s.__mirrorBench);});await sample('mirror');
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.events.off('update',s.__mirrorBench);s.model.mode='walk';s.showScanner();});await sample('handheld');
  const hasAim=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');if(!s.handheld)return false;
   const p=s.model.parcels[0];p.location='held';s.model.heldId=p.id;s.handheld.scan();return true;});
  if(hasAim)await sample('barcodeAim');
  report.errors=errors;fs.writeFileSync(path.join(OUT,`bench-${TAG}-${GFX}.json`),JSON.stringify(report,null,2));
  if(Object.values(report.prototype).some(sample=>sample.contextLost))throw Error('Shared WebGL context was lost');
  if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
