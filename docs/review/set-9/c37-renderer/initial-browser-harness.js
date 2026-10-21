/* Actual workday finish -> results/map -> detached replay, remapped keyboard, accessibility and resource guards.
 * Travel, elapsed time and completed deliveries are fixtures. Recording, finish, entries and playback are real.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const quality=process.env.QA_GFX||'low',tag=process.env.QA_TAG||'c37-'+quality,base=process.env.QA_BASE||'http://127.0.0.1:8347';
 const report={quality,checks:0,runs:[],errors:[],fixture:'Travel/time/completed deliveries are fixtures. Actual recorder, Dispatch finish, results/map entries, global keyboard focus and detached renderer run normally.'};let page;
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 const check=(ok,detail)=>{assert.ok(ok,typeof detail==='string'?detail:JSON.stringify(detail));report.checks++;};
 try{
  for(const lang of (process.env.QA_LANGS||'en,ta').split(','))for(const size of (process.env.QA_SIZES||'normal,large').split(',')){
   const run={lang,size};report.runs.push(run);page=await browser.newPage();await page.setViewport({width:1280,height:720});page.on('pageerror',e=>report.errors.push(e.message));
   const frames=async(n=3)=>{const at=await page.evaluate(()=>OTR.game.loop.frame);await page.waitForFunction(({at,n})=>OTR.game.loop.frame>=at+n,{timeout:60000},{at,n});};
   const press=async key=>{await page.keyboard.press(key);await frames();};
   const ready=()=>page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FPReplayScene');return s.sys.isActive()&&!s.loading&&s.model&&s.view;},{timeout:90000});
   await page.goto(base+'/first-person.html?gfx='+quality);await page.waitForFunction(()=>window.OTR&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:90000});
   await page.addScriptTag({url:base+'/data/i18n/ta.js'});
   await page.evaluate(({lang,size})=>{
    const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();s.capture=()=>{};s.progress.campaign=null;s.progress.welcomed=true;
    OTR.save.data.day=9;OTR.save.data.route.days=0;OTR.i18n.use(lang);OTR.theme.font=lang==='ta'?'"Noto Sans Tamil", "Noto Sans", sans-serif':'"Noto Sans", sans-serif';
    Object.assign(OTR.a11y.settings(),{large:size==='large',narrate:true,colour:true,reducedMotion:true,keys:{Tab:'KeyU'}});OTR.workday.start(null);s.hubWorkday=true;s.launch('campaign');
   },{lang,size});
   await page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model&&!s.transitioning;},{timeout:90000});
   run.recording=await page.evaluate(()=>{
    const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.closePanel();m.mode='cab';m.phase='route';m.departed=true;m.paused=false;m.events[m.briefKey]=true;m.step=()=>{};m.workdayRules.night=false;OTR.fpLater.depart(m);
    Object.assign(m.van,{x:2.84,z:8,speed:2,hand:false,belt:true,look:0});m.player.pitch=0;OTR.fpReplayUI.bind(s);
    for(let i=0;i<=120;i++){m.elapsed=i/20;m.van.z=8-m.elapsed*2;s.sync();if(i===120)OTR.workday.report('drive.contact',{key:0,where:{x:m.van.x,z:m.van.z,mph:5}});OTR.fpReplayUI.capture(s);}
    window.replaySource=m;return {day:OTR.workday.current.day,routeDay:m.routePlan.day,bytes:s.replayRecorder.bytes,latest:!!s.replayRecorder.latest};
   });check(run.recording.latest,run.recording);check(run.recording.day===9&&run.recording.routeDay===1,run.recording);
   await page.evaluate(()=>{
    const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;for(const stop of m.stops)stop.outcome='safeplace';for(const p of m.parcels)p.returnRequired=false;
    m.mode='walk';m.phase='return';Object.assign(m.van,{x:4,z:8,speed:0,hand:true});Object.assign(m.player,m.point('dispatch'));s.showDispatch();
   });await press('Digit1');
   await page.waitForFunction(()=>OTR.game.scene.isActive('ResultsScene'),{timeout:60000});await frames(12);
   run.entry=await page.evaluate(()=>{
    const s=OTR.game.scene.getScene('ResultsScene'),buttons=s.children.list.filter(o=>o.label&&o.label.text==='Replay the last mistake.'),b=buttons[0];
    return {buttons:buttons.length,bounds:b&&{x:b.getBounds().x,y:b.getBounds().y,right:b.getBounds().right,bottom:b.getBounds().bottom},clipId:OTR.fpReplayUI.clip&&OTR.fpReplayUI.clip.recordId,day:OTR.fpReplayUI.clip&&OTR.fpReplayUI.clip.day,source:JSON.stringify(window.replaySource.snapshot()),storage:JSON.stringify({...localStorage})};
   });check(run.entry.buttons===1&&run.entry.day===9,run.entry);check(run.entry.bounds.x>=0&&run.entry.bounds.right<=1280,run.entry.bounds);
   // Results focus starts at the main button: the first remapped Tab reveals it, the second reaches replay.
   await press('u');await press('u');check(await page.evaluate(()=>OTR.game.scene.getScene('ResultsScene')._screenFocus.current().label.text==='Replay the last mistake.'),'Results replay is in the remapped focus ring');await press('Enter');await ready();await frames();
   const state=()=>page.evaluate(()=>{const s=OTR.game.scene.getScene('FPReplayScene');return {time:s.player.time,paused:s.player.paused,reduced:s.player.reduced,camera:s.view.camera.position.toArray(),model:s.model.van.z,focus:s.focus.current()&&s.focus.current().label.text,playEnabled:s.controls[0].enabled,night:s.model.workdayRules.night};});
   run.initial=await state();check(run.initial.paused&&run.initial.night===false,run.initial);
   run.layout=await page.evaluate(()=>{
    const s=OTR.game.scene.getScene('FPReplayScene'),texts=s.texts.concat(s.controls.map(b=>b.label)),bounds=texts.map(t=>({text:t.text,size:parseFloat(t.style.fontSize),x:t.getBounds().x,y:t.getBounds().y,right:t.getBounds().right,bottom:t.getBounds().bottom}));
    const seen=new Set();let bytes=0;for(const t of Object.values(OTR.game.textures.list))for(const source of t.source||[]){const key=source.glTexture||source;if(seen.has(key))continue;seen.add(key);const im=source.image;bytes+=(im&&(im.naturalWidth||im.width)||source.width)*(im&&(im.naturalHeight||im.height)||source.height)*4;}
    return {bounds,phaserBytes:Math.ceil(bytes*4/3),released:s.releasedUI,diagnostics:{...s.view.diagnostics},headerBottom:s.header.getBounds().bottom,controlsTop:Math.min(...s.controls.map(b=>b.getBounds().y)),colour:s.view.colour.value};
   });check(run.layout.bounds.every(b=>b.x>=0&&b.y>=0&&b.right<=1280&&b.bottom<=720&&b.size>=17),run.layout);check(run.layout.headerBottom<run.layout.controlsTop,run.layout);check(run.layout.colour===1,run.layout);
   const cap=quality==='low'?4:16;check(run.layout.phaserBytes<=cap*1024*1024,run.layout);check(run.layout.diagnostics.attachmentBytes<=cap*1024*1024,run.layout);check(run.layout.diagnostics.calls<=(quality==='low'?64:128)&&run.layout.diagnostics.triangles<=(quality==='low'?2500:300000),run.layout);
   await page.screenshot({path:path.join(OUT,`${tag}-${lang}-${size}-paused.png`)});
   check(run.initial.reduced&&!run.initial.playEnabled,'Reduced motion starts paused and disables automatic playback');
   await press('u');await press('ArrowLeft');await press('Enter');const stepped=await state();check(stepped.time>run.initial.time&&stepped.paused,stepped);check(stepped.camera[2]!==run.initial.camera[2],stepped);
   await frames(8);check((await state()).time===stepped.time,'Manual replay remains still between steps');
   await page.evaluate(()=>{OTR.a11y.settings().reducedMotion=false;window.replaySpoken=[];const original=OTR.a11y.say;OTR.a11y.say=function(text){replaySpoken.push(text);return original.call(this,text);};OTR.audio.setMuted(true);});await frames();
   await press('ArrowLeft');await press('ArrowLeft');await press('Enter');await frames(8);const playing=await state();check(!playing.paused&&playing.time>stepped.time,playing);await page.screenshot({path:path.join(OUT,`${tag}-${lang}-${size}-playing.png`)});
   await press('Enter');const paused=await state();await frames(8);check((await state()).time===paused.time&&paused.paused,paused);
   await press('Enter');await page.evaluate(()=>{OTR.a11y.settings().reducedMotion=true;});await frames();check((await state()).paused&&!(await state()).playEnabled,'Enabling reduced motion pauses immediately');check(await page.evaluate(()=>replaySpoken.some(s=>s.includes('The replay'))),'Muted replay actions use narration');
   await page.evaluate(()=>window.dispatchEvent(new Event('blur')));check((await state()).paused,'Losing window focus pauses replay');
   run.unchanged=await page.evaluate(()=>({source:JSON.stringify(window.replaySource.snapshot()),storage:JSON.stringify({...localStorage}),events:OTR.workday.events.length,log:OTR.workday.log}));
   check(run.unchanged.source===run.entry.source,'Playback leaves the source mission unchanged');check(run.unchanged.storage===run.entry.storage,'Playback never writes local storage');check(run.unchanged.events===0&&run.unchanged.log===null,'Playback emits no score reports');
   await press('Escape');await page.waitForFunction(()=>OTR.game.scene.isActive('ResultsScene'),{timeout:30000});await frames(12);
   // Exercise the real Results map button, then its conditional replay entry.
   const map=await page.evaluate(()=>{const s=OTR.game.scene.getScene('ResultsScene');const visit=o=>{if(o.label&&/^Drive map/.test(OTR.i18n.src(o.label))&&o.press)return o;for(const c of o.list||[]){const hit=visit(c);if(hit)return hit;}};let b;for(const o of s.children.list){b=visit(o);if(b)break;}if(!b)return false;b.press();return true;});check(map,'Results drive-map control exists');
   await page.waitForFunction(()=>OTR.game.scene.isActive('DriveReviewScene'),{timeout:30000});await frames(8);
   const mapEntry=await page.evaluate(()=>{const s=OTR.game.scene.getScene('DriveReviewScene'),b=s.focusables.find(o=>o.label&&o.label.text==='Replay the last mistake.');if(!b)return null;const r=b.getBounds(),bounds={x:r.x,y:r.y,right:r.right,bottom:r.bottom};s._screenFocus.set(s.focusables.indexOf(b));return bounds;});check(mapEntry&&mapEntry.x>=0&&mapEntry.right<=1280,'Map replay is in the existing focus ring');
   await press('u'); // Reveal the chosen control without activating it, then restore its selected index.
   await page.evaluate(()=>{const s=OTR.game.scene.getScene('DriveReviewScene');s._screenFocus.set(s.focusables.findIndex(o=>o.label&&o.label.text==='Replay the last mistake.'));});await press('Enter');await ready();await frames();check((await state()).paused,'Map opens a fresh paused replay');
   await press('Escape');await page.waitForFunction(()=>OTR.game.scene.isActive('DriveReviewScene'),{timeout:30000});
   await page.evaluate(()=>{const s=OTR.game.scene.getScene('DriveReviewScene');s.scene.start('FPReplayScene',{recordId:'older-day',back:'DriveReviewScene',backData:s.d});});await frames(8);
   check(await page.evaluate(()=>{const s=OTR.game.scene.getScene('FPReplayScene');return !s.player&&!s.view&&s.scope.text.includes('There is no replay');}),'A mismatched old record fails closed');await page.screenshot({path:path.join(OUT,`${tag}-${lang}-${size}-unavailable.png`)});
   check(await page.evaluate(()=>!OTR.game.renderer.gl.isContextLost()),'No shared WebGL context loss');await page.close();page=null;
  }
  assert.deepEqual(report.errors,[]);report.complete=true;console.log(report.checks+' '+quality+' replay browser checks passed');
 }catch(error){report.failure=error.stack;if(page)await page.screenshot({path:path.join(OUT,tag+'-failure.png')}).catch(()=>{});throw error;}
 finally{fs.writeFileSync(path.join(OUT,tag+'-replay.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
