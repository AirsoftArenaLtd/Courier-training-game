/* Real hazard meshes, walk/cab interactions and readable safety prompts. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let checks=0;const errors=[];
 try{
  const p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
  const base=process.env.QA_BASE||'http://127.0.0.1:8302';await p.goto(base+'/first-person.html?gfx=low');
  await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.releaseMouse=()=>{};s.closePanel();s.launch('campaign');});await p.waitForFunction(()=>!OTR.game.scene.getScene('FirstPersonScene').transitioning);
  await p.addScriptTag({url:base+'/data/i18n/ta.js'});
  for(const lang of ['en','ta'])for(const large of [false,true])for(const hazard of ['bus','siren','backing','goal']){
   await p.evaluate(({lang,large,hazard})=>{
    OTR.i18n.use(lang);OTR.a11y.settings().large=large;const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.closePanel();s.handheld.close();m.paused=hazard!=='siren';m.step=()=>{};m.phase='route';m.mode='cab';s.hint.setFontSize(OTR.a11y.size(18));m.departed=true;m.events[m.briefKey]=true;s.notice='';
    Object.assign(m.van,{x:m.town.xs[0]+2,z:m.town.zs[1]+25,yaw:0,speed:0,hand:true,gear:1});m.driving.bus.state=m.driving.siren.state='done';
    if(hazard==='bus')Object.assign(m.driving.bus,{state:'flashing',x:m.van.x,z:m.van.z-18,yaw:0,clock:1,hold:0,passed:false});
    m.mirrorAt=hazard==='siren'?m.elapsed:-100;
    if(hazard==='siren')Object.assign(m.driving.siren,{state:'approaching',x:m.van.x,z:m.van.z+16,yaw:0,road:m.town.xs[0],offset:1.3,clock:1,yielded:false});
    if(hazard==='backing')m.van.gear=-1;
    if(hazard==='goal'){m.mode='walk';Object.assign(m.player,{x:m.van.x,z:m.van.z+4,yaw:Math.PI,pitch:0});s.showGoal();}
    OTR.fpDriving.syncActors(m);s.sync();s.refresh();
   },{lang,large,hazard});
   const issues=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),out=[];
    const texts=s.panel?s.panel.root.list.filter(o=>o.type==='Text'):[s.objective,s.hint];for(const o of texts){if(!o.visible)continue;const b=o.getBounds();if(b.x<0||b.right>1280||b.y<0||b.bottom>(s.panel?635:720)||parseFloat(o.style.fontSize)*Math.min(o.scaleX,o.scaleY)<17)out.push({text:o.text,b});}
    return out;});assert.deepEqual(issues,[],`${lang} ${large} ${hazard}`);checks++;
   if(lang==='en'&&!large||lang==='ta'&&large)await p.screenshot({path:path.join(OUT,`c10-${hazard}-${lang}-${large?'large':'normal'}.png`)});
  }
  await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());await p.keyboard.press('g');
  assert.equal(await p.evaluate(()=>!!OTR.game.scene.getScene('FirstPersonScene').panel),true);checks++;
  // Confirm from the real rear-of-van position, enter through its physical driver door, and reverse.
  const result=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;OTR.workday.begin();s.choose(0);const checked=m.driving.goalClear;
   Object.assign(m.player,m.point('driver'));const entered=m.enter();m.van.gear=-1;m.van.hand=false;m.van.speed=-.5;OTR.fpDriving.tick(m,.1);
   // C-24: a safe reverse is reported when the manoeuvre ends (stopped with the parking brake set), not while rolling
   m.van.speed=0;m.van.hand=true;OTR.fpDriving.tick(m,.1);
   const restored=OTR.fpMission.restore(m.snapshot());return {checked,entered,backing:OTR.workday.events.filter(e=>e.type==='drive.backing').map(e=>e.ok),restored:!!restored};});
  assert.deepEqual(result,{checked:true,entered:'',backing:[true],restored:true});checks+=4;
  // Neither walking nor driving can pass through the live bus body.
  const physical=await p.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;Object.assign(m.driving.bus,{state:'flashing',x:m.van.x,z:m.van.z-18,yaw:0});OTR.fpDriving.syncActors(m);return {walk:m.blocked(m.driving.bus.x,m.driving.bus.z),van:OTR.fp.vanBox({x:m.driving.bus.x,z:m.driving.bus.z,yaw:0},m._driveSolids.bus)};});
  assert.deepEqual(physical,{walk:true,van:true});checks+=2;
  assert.deepEqual(errors,[]);checks++;console.log(`${checks} driving browser checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
