/* Real scene launch, keyboard height reminder, motor contact, reports and recovery.
 * Travel/impact poses are explicit fixtures; this is not a full driving journey. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review'),GFX=process.env.QA_GFX||'low',TAG=process.env.QA_TAG||'c34-'+GFX,BASE=process.env.QA_BASE||'http://127.0.0.1:8341';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const result={quality:GFX,checks:0,runs:[],errors:[],completed:false};let p;
 const save=()=>fs.writeFileSync(path.join(OUT,TAG+'-damage.json'),JSON.stringify(result,null,2)+'\n');save();
 try{
  p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))result.errors.push(m.text());});
  const press=async key=>{await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.time.now>=(s.inputBlockedUntil||0);},{timeout:60000});const frame=await p.evaluate(()=>OTR.game.loop.frame);await p.keyboard.press(key);await p.waitForFunction(f=>OTR.game.loop.frame>f,{timeout:60000},frame);};
  const audit=async()=>{
   const bad=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),bad=[],rects=[];
    if(s.panel){const visit=o=>{if(!o.visible)return;if(o.type==='Text'&&o.text){const b=o.getBounds(),size=parseFloat(o.style.fontSize)*Math.min(o.scaleX,o.scaleY);if(b.x<0||b.right>1280||b.y<0||b.bottom>720||size<16.9)bad.push(o.text);}for(const child of o.list||[])visit(child);};visit(s.panel.root);
     const body=s.panel.root.list.find(o=>o.type==='Text'&&o.y===170),top=Math.min(...s.panel.buttons.map(o=>o.getBounds().top));if(body&&body.getBounds().bottom>top-8)bad.push('Panel body overlaps controls.');}
    const script=OTR.fpBrand.scriptFonts&&OTR.fpBrand.scriptFonts[OTR.i18n.lang];if(script)for(const {label,object} of s.labels)if(!label.brand&&object.type==='Text'&&!object.style.fontFamily.includes(script))bad.push('The projected label is missing its script font.');
    for(const {label,object} of s.labels)if(label.clearance&&object.visible){const b=object.getBounds(),size=parseFloat(object.style.fontSize)*Math.min(object.scaleX,object.scaleY);if(b.x<0||b.right>1280||b.y<0||b.bottom>720||size<(OTR.fpAccess.settings().large?21.9:16.9))bad.push('Unreadable clearance text.');rects.push(b);}
    for(let i=0;i<rects.length;i++)for(let j=0;j<i;j++){const a=rects[i],b=rects[j];if(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y)bad.push('Clearance captions overlap.');}
    return bad;});assert.deepEqual(bad,[]);result.checks++;
  };
  for(const lang of (process.env.QA_LANGS||'en,ta').split(','))for(const size of (process.env.QA_SIZES||'normal,large').split(',')){
   const large=size==='large';await p.goto(BASE+'/first-person.html?gfx='+GFX+'&lang='+lang);await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:60000});
   await p.evaluate(large=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.releaseMouse=()=>{};s.keyboardMode=true;s.closePanel();Object.assign(OTR.a11y.settings(),{large,colour:true,reducedMotion:true,narrate:true,keys:{KeyP:'KeyN',KeyE:'KeyO'}});OTR.fpAccess.syncKeys();
    window.damageSaid=[];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,pending:false,speak(u){this.speaking=true;window.damageSaid.push(u.text);setTimeout(()=>{this.speaking=false;if(u.onend)u.onend();},80);},cancel(){this.speaking=false;}}});window.SpeechSynthesisUtterance=function(text){this.text=text;};
    s.progress.guidance={intro:true,seen:['driver']};OTR.save.data.route.days=3;s.progress.campaign=null;s.launch('campaign');s.closePanel();const m=s.model;m.paused=true;window.damageModel=m;
    const point=m.point('dispatch');Object.assign(m.player,point);s.showManifest(m.stops.length-1,true);
   },large);
   assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.routePlan.damage),1);result.checks++;
   await press('Digit1');assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').panel.root.list.find(o=>o.type==='Text'&&o.y===127).text),'Know the van height.');result.checks++;await audit();await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${size}-height.png`)});
   await press('Digit1');assert.equal(await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return !!s.model.events[s.model.briefKey]&&!s.panel;}),true);result.checks++;
   const impact=await p.evaluate(()=>{
    const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;OTR.workday.begin();m.mode='cab';m.paused=false;m.phase='route';m.departed=m.secured=true;OTR.fpLater.depart(m);
    Object.assign(m.van,{x:2.84,z:8,yaw:0,speed:3,gear:1,hand:false,belt:true});const wall={x:2.84,z:5.23,w:6,d:.1,h:3};m.solids.push(wall);m.step({forward:true},.0125);m.solids.pop();m.paused=true;m.van.hand=true;
    const raw=m.snapshot(),read=OTR.fpMission.restore(raw),events=JSON.stringify(OTR.workday.events),before=OTR.workday.log.score();OTR.workday.restore({events:OTR.workday.events});
    const equal=!!read&&JSON.stringify(read.snapshot())===JSON.stringify(raw)&&events===JSON.stringify(OTR.workday.events)&&before===OTR.workday.log.score();
    m.mode='walk';Object.assign(m.player,{x:m.van.x,z:m.van.z-7,yaw:Math.PI,pitch:-.06});s.sync();s.refresh();
    return {equal,events:OTR.workday.events.filter(e=>e.type.startsWith('van.damage-')),generic:OTR.workday.events.some(e=>e.type==='drive.contact'),damage:m.damage.added[0]};
   });assert.equal(impact.equal,true);assert.equal(impact.damage,2);assert.equal(impact.events.length,1);assert.equal(impact.events[0].type,'van.damage-dent');assert.match(impact.events[0].key,/front:solid-/);assert.equal(impact.generic,false);result.checks+=6;
   await audit();await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${size}-front-dent.png`)});
   const approach=await p.evaluate(()=>{
    const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,b=m._damageClearances[0];m.mode='cab';m.paused=false;Object.assign(m.van,{x:b.x+2.5,z:b.z+12,yaw:0,look:0,speed:0,gear:1,hand:true});m.player.pitch=0;m.workdayRules={damage:true,satnav:'full'};m.step({},.025);s.sync();s.refresh();
    const route=OTR.fpNav.path(m,{x:b.x,z:b.z+12},{x:b.x,z:b.z-12});return {detour:route.distance,events:OTR.workday.events.filter(e=>e.type==='drive.clearance')};
   });assert.ok(approach.detour>24);assert.equal(approach.events.length,1);assert.equal(approach.events[0].ok,true);result.checks+=3;
   await p.waitForFunction(()=>OTR.game.scene.getScene('FirstPersonScene').notice.includes('clearance'),{timeout:60000});await audit();await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${size}-clearance.png`)});
   for(let i=0;i<32;i++){await press('n');if(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').target==='cab-camera'))break;}
   assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').target),'cab-camera');result.checks++;
   await p.waitForFunction(()=>window.damageSaid.some(t=>/clearance|8 feet 10/.test(t)),{timeout:60000});result.checks++;
   await press('r');await p.waitForFunction(()=>OTR.game.scene.getScene('FirstPersonScene').view.mirror.rearOn,{timeout:60000});result.checks++;await audit();await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${size}-reverse.png`)});
   const restored=await p.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return !!OTR.fpMission.restore(m.snapshot());});assert.equal(restored,true);result.checks++;
   if(process.env.QA_STRIKE==='1'){
    await press('r');await press('v');
    const recording=process.env.QA_CLIP==='1'&&result.runs.length===0?await p.screencast({path:path.join(OUT,TAG+'-clearance-strike.webm'),fps:12,quality:30}):null;
    await press('Space');await p.keyboard.down('w');
    try{await p.waitForFunction(()=>OTR.game.scene.getScene('FirstPersonScene').model.damage.clearanceFailed&1,{timeout:180000});}finally{await p.keyboard.up('w');if(recording)await recording.stop();}
    const strike=await p.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;m.van.hand=true;return {roof:m.damage.added[4],events:OTR.workday.events.filter(e=>e.type==='drive.clearance'),restored:!!OTR.fpMission.restore(m.snapshot())};});
    assert.ok(strike.roof>0);assert.equal(strike.events.length,2);assert.equal(strike.events[1].ok,false);assert.equal(strike.events[1].key,'clearance-0-strike');assert.equal(strike.restored,true);result.checks+=5;await audit();await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${size}-strike.png`)});
   }
   result.runs.push({lang,large,impact,approach});save();console.log('PASS '+GFX+' '+lang+' '+size+' damage and clearance');
  }
  assert.deepEqual(result.errors,[]);result.completed=true;save();console.log(result.checks+' damage browser checks passed');
 }catch(e){result.failure=e.stack;save();if(p)await p.screenshot({path:path.join(OUT,TAG+'-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
