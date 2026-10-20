/* Reverse-facing clearance caption/narration and live camera; the approach pose is a fixture. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});
const TAG=process.env.QA_TAG||'c34-reverse-warning',LANG=process.env.QA_LANG||'en',LARGE=process.env.QA_LARGE==='1';
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let p;const errors=[];
 try{
  p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));
  await p.goto((process.env.QA_BASE||'http://127.0.0.1:8341')+'/first-person.html?gfx=low&lang='+encodeURIComponent(LANG));await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:60000});
  await p.evaluate(large=>{
   const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.closePanel();s.progress.guidance={intro:true,seen:['driver']};
   Object.assign(OTR.a11y.settings(),{narrate:true,colour:true,reducedMotion:true,large});s.hint.setFontSize(large?22:18);s.soundCue.setFontSize(large?21:17);s.navText.setFontSize(large?21:17);window.reverseDamageSaid=[];
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,pending:false,speak(u){this.speaking=true;window.reverseDamageSaid.push(u.text);setTimeout(()=>{this.speaking=false;if(u.onend)u.onend();},80);},cancel(){this.speaking=false;}}});window.SpeechSynthesisUtterance=function(text){this.text=text;};
   const plan=OTR.fpDamageFlow.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(OTR.fpRoute.plan(4,7))))),m=OTR.fpMission.create('campaign',7,plan);
   OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);m.phase='route';m.mode='cab';m.paused=false;m.departed=m.secured=true;OTR.fpLater.depart(m);m.events[m.briefKey]=true;
   const b=m._damageClearances[0];Object.assign(m.van,{x:b.x,z:b.z+10,yaw:Math.PI,gear:-1,speed:0,hand:true,belt:true,look:0});m.workdayRules={damage:true,satnav:'full'};
   OTR.workday.begin();s.model=m;s.area='route';s.notice='';s.target=null;s.rebuildWorld();s.sync();s.refresh();
  },LARGE);
  const initialHandle=await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');if(!s.notice.includes('8 feet 10 inches')||!s.hint.text.includes('8 feet 10 inches')||!s.hint.visible||s.hint.alpha<=0||!s.view.mirror.rearOn||!window.reverseDamageSaid.some(t=>t.includes('8 feet 10 inches')))return false;
   window.reverseDamageNoticeAt=s.time.now;return {hint:s.hint.text,visible:true};
  },{timeout:60000});const initial=await initialHandle.jsonValue();await initialHandle.dispose();
  await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.time.now>window.reverseDamageNoticeAt+8500;},{timeout:60000});
  const result=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,b=s.soundCue.getBounds(),result={language:OTR.i18n.lang,large:OTR.a11y.settings().large,notice:s.notice,caption:s.soundCue.text,captionFits:b.x>=0&&b.y>=0&&b.right<=1280&&b.bottom<=720,warningVisible:s.soundCue.visible&&s.soundCue.alpha>0,sceneMillisecondsAfterNotice:s.time.now-window.reverseDamageNoticeAt,rearCamera:s.view.mirror.rearOn,narration:window.reverseDamageSaid,events:OTR.workday.events.filter(e=>e.type==='drive.clearance'),damage:m.damage.added,restored:!!OTR.fpMission.restore(m.snapshot())};
   // Keep the evidence on the asserted frame; subsequent ordinary camera captions
   // must not replace the clearance notice between the assertion and screenshot.
   OTR.game.loop.sleep();return result;
  });
  assert.equal(initial.visible,true);assert.match(initial.hint,/8 feet 10 inches/);assert.equal(result.rearCamera,true);assert.equal(result.warningVisible,true);assert.match(result.caption,/8 feet 10 inches/);assert.equal(result.captionFits,true);assert.equal(result.events.length,1);assert.equal(result.events[0].ok,true);assert.equal(result.damage.some(Boolean),false);assert.equal(result.restored,true);assert.equal(result.narration.filter(t=>t.includes('8 feet 10 inches')).length,1);assert.equal(result.language,LANG);assert.equal(result.large,LARGE);assert.deepEqual(errors,[]);
  await p.screenshot({path:path.join(OUT,TAG+'.png')});fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify({checks:14,fixture:'Day four, seed seven, rear facing the beam at ten meters; real scene ticks, captions, narration and camera, checked again after ordinary notice expiry.',errors,initial,...result},null,2)+'\n');console.log('14 reverse-clearance browser checks passed after ordinary notice expiry ('+LANG+', '+(LARGE?'larger':'normal')+' text)');
 }catch(e){if(p)await p.screenshot({path:path.join(OUT,TAG+'-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
