/* Real controls-screen navigation and raw Gamepad API gestures. Preferences persist through the existing writer and browser reload. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8399',OUT=path.join(__dirname,'out/fp-review'),TAG=process.env.QA_TAG||'b2-remap',GFX=process.env.QA_GFX||'low',LANG=process.env.QA_LANG||'en',LARGE=process.env.QA_LARGE==='1';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let page;
 const report={quality:GFX,language:LANG,large:LARGE,checks:0,shots:[],layouts:[],errors:[],scope:'One initial parked-cab/profile fixture, then real keyboard/menu choices and fake Gamepad API values. No subsequent position, mission, score or timer writes. Shared gamepad overrides use the existing writer. The initial profile/parked cab and final oversized-save layout are fixtures; remapping, reset, driving actions and reload use the real UI/writer. Three revised body strings await the shared translation pass.'};
 const save=()=>fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify(report,null,2));
 const equal=(a,b,message)=>{assert.deepEqual(a,b,message);report.checks++;};const ok=(v,message)=>{assert.ok(v,message);report.checks++;};
 const frames=async(n=3)=>{const frame=await page.evaluate(()=>OTR.game.loop.frame);await page.waitForFunction(({frame,n})=>OTR.game.loop.frame>=frame+n,{timeout:180000},{frame,n});};
 const key=async code=>{await page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return !s||s.time.now>=(s.inputBlockedUntil||0);},{timeout:90000});await page.keyboard.press(code);await frames();};
 const button=async(n,value)=>{await page.evaluate(({n,value})=>{const b=window.otrFakePads[0].buttons[n];b.value=value;b.pressed=value>.5;},{n,value});await frames();};
 const axis=async(n,value)=>{await page.evaluate(({n,value})=>window.otrFakePads[0].axes[n]=value,{n,value});await frames();};
 const press=async n=>{await button(n,1);await button(n,0);};
 const state=()=>page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return {panel:s.panel?.choices.map(c=>c.label),gear:s.model?.van.gear??null,belt:s.model?.van.belt??null,hand:s.model?.van.hand??null,paused:s.model?.paused??null,elapsed:s.model?.elapsed??null,modelPresent:!!s.model,area:s.area,draft:s.gamepad.session,prefs:OTR.a11y.settings().gamepad||null,keys:{...OTR.a11y.settings().keys},localKeys:Object.keys(localStorage).sort(),held:{...s.held},stored:JSON.stringify(OTR.save.data.settings),local:JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,k===OTR.save.localKey()?localStorage.getItem(k):null])),frame:{...s.gamepad.controller.frame},controls:{...s.gamepad.controls}};});
 const pick=async label=>{
  const info=await page.evaluate(label=>{const p=OTR.game.scene.getScene('FirstPersonScene').panel;return {index:p?.index,labels:p?.choices.map(c=>c.label),target:p?.choices.findIndex(c=>c.label===label)};},label);
  ok(info.target>=0,'Choice is present: '+label);for(let n=0;n<(info.target-info.index+info.labels.length)%info.labels.length;n++)await key('ArrowDown');await key('Enter');
 };
 const row=async name=>page.evaluate(name=>{const s=OTR.game.scene.getScene('FirstPersonScene'),label=OTR.i18n.t(name);return s.panel.choices.find(c=>c.label.endsWith(': '+label))?.label;},name);
 const audit=async name=>{
  const layout=await page.evaluate(()=>{
   const s=OTR.game.scene.getScene('FirstPersonScene'),p=s.panel,text=p.root.list.filter(o=>o.type==='Text'),bad=[];
   const rows=text.map(o=>{const b=o.getBounds();return {source:OTR.i18n.src(o),text:o.text,x:b.x,y:b.y,right:b.right,bottom:b.bottom,size:parseFloat(o.style.fontSize)*Math.min(o.scaleX,o.scaleY)};});
   for(const r of rows)if(r.x<130||r.right>1150||r.y<90||r.bottom>630||r.size<17)bad.push({reason:'bounds or readable size',...r});
   for(let n=0;n<rows.length;n++)for(let j=n+1;j<rows.length;j++){const a=rows[n],b=rows[j];if(a.x<b.right-.5&&a.right>b.x+.5&&a.y<b.bottom-.5&&a.bottom>b.y+.5)bad.push({reason:'text overlap',a,b});}
   for(let n=0;n<p.buttons.length;n++){const b=p.buttons[n].getBounds(),label=rows[n+2];if(label&&(label.x<b.x||label.right>b.right||label.y<b.y||label.bottom>b.bottom))bad.push({reason:'button label',label});}
   return {rows,bad};
  });equal(layout.bad,[],name+' fits without clipping, overlap or small text');report.layouts.push({name,...layout});save();
 };
 const shot=async name=>{await page.screenshot({path:path.join(OUT,TAG+'-'+name+'.png')});report.shots.push(name);save();};
 try{
  page=await browser.newPage();await page.setViewport({width:1280,height:720});await page.bringToFront();page.on('pageerror',e=>{report.errors.push(e.message);save();});
  await page.evaluateOnNewDocument(()=>{window.otrFakePads=[{id:'Remap review fixture',index:0,connected:true,mapping:'standard',axes:Array(8).fill(0),buttons:Array.from({length:32},()=>({value:0,pressed:false}))}];Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.otrFakePads});});
  await page.goto(BASE+'/first-person.html?gfx='+GFX+'&lang='+LANG,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.OTR?.game?.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:180000});
  if(LANG==='ta')await page.addScriptTag({url:BASE+'/data/i18n/ta.js'});
  await page.evaluate(({lang,large})=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.keyboardMode=true;s.capture=()=>{};s.closePanel();OTR.save.createProfile('Saved gamepad review');OTR.i18n.use(lang);Object.assign(OTR.a11y.settings(),{large,reducedMotion:true,keys:{KeyR:'KeyT'}});OTR.a11y.save();s.progress.sequence=9;s.progress.campaign=null;s.launch('campaign');},{lang:LANG,large:LARGE});
  await page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model?.kind==='campaign'&&!s.transitioning;},{timeout:180000});
  await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.closePanel();m.mode='cab';m.phase='route';m.departed=m.repaired=m.secured=true;m.cargoOpen=false;m.events[m.briefKey]=true;OTR.fpLater.depart(m);OTR.fpWalkaroundFlow.depart(m);Object.assign(m.van,{x:2.84,z:-18,yaw:0,speed:0,gear:2,hand:true,belt:true,look:0});m.player.pitch=0;OTR.workday.begin();s.sync();s.refresh();window.dispatchEvent(new Event('focus'));});await frames(4);report.initial=await state();
  await key('KeyH');await pick('Controls and guidance');await pick('Change the 3D controls');await audit('existing keyboard controls');await pick('Gamepad controls');
  for(let n=0;n<5;n++){await audit('guide '+n);if(n===1)await shot('driving-guide');await pick('Next page');}
  await pick('Change gamepad controls');const elapsed=(await state()).elapsed;
  for(let n=0;n<8;n++){await audit('bindings '+n);if(n===0)await shot('bindings');await pick('Next page');}
  equal((await state()).elapsed,elapsed,'Remapping menus pause the actual mission');
  // Page two starts with the gear control. Capture an unbound physical button, with entry-held A ignored.
  await pick('Next page');await pick('Next page');await pick(await row('Change gear'));await audit('edit');await button(0,1);await audit('capture');await shot('capture');
  equal((await state()).prefs,null);await button(0,0);await button(16,1);equal((await state()).prefs,null,'A held candidate cannot commit');await button(16,0);
  equal((await state()).prefs.buttons.gear,16,'Physical input 16 is remapped through the actual UI');equal((await state()).gear,2,'Capturing did not operate the cab');await audit('remapped');await shot('remapped');
  await pick(await row('Change gear'));await pick('Choose a new input');await press(7);await audit('conflict');await shot('conflict');equal((await state()).prefs.buttons.gear,16,'Conflicts retain the previous binding');await pick('Back');
  await pick(await row('Change gear'));await pick('Choose a new input');await button(17,1);await key('Escape');await button(17,0);equal((await state()).prefs.buttons.gear,16,'Escape cancels capture without a binding');
  await pick(await row('Change gear'));await pick('Disable this input');equal((await state()).prefs.buttons.gear,-1);await pick(await row('Change gear'));await pick('Choose a new input');await press(16);
  await pick('Stick sensitivity');await audit('deadzone');await pick('Ignore movement below 30 percent.');equal((await state()).prefs.deadzone,.3);await audit('deadzone changed');await shot('deadzone');await pick('Back');
  // Exercise raw-axis remapping, disable and cancellation through the same menu.
  for(let n=0;n<6;n++)await pick('Next page');await pick(await row('Walk or steer left and right'));await pick('Choose a new input');await axis(5,-.8);equal((await state()).prefs.axes?.steer,undefined);await axis(5,0);equal((await state()).prefs.axes?.steer,5);await pick(await row('Walk or steer left and right'));await pick('Disable this input');equal((await state()).prefs.axes?.steer,-1);
  // Return by the actual back choices, then use the new physical gear input and unchanged remapped keyboard.
  await pick('Back');await pick('Back');await pick('Back');await pick('Back');await pick('Back');await pick('Continue');await press(16);equal((await state()).gear,1);await key('KeyT');equal((await state()).gear,-1);equal((await state()).held,{});
  const savedState=await state(),withoutGamepad=value=>{const q=JSON.parse(value);delete q.a11y.gamepad;return q;};equal(withoutGamepad(savedState.stored),withoutGamepad(report.initial.stored),'Only gamepad overrides changed');equal(savedState.localKeys,report.initial.localKeys,'No alternate saved store');ok(JSON.stringify(savedState.prefs).length<=300);ok(!savedState.stored.includes('Remap review fixture'));equal(savedState.keys.KeyR,'KeyT');
  // Reset requires a real confirmation and removes only saved gamepad overrides.
  await key('KeyH');await pick('Controls and guidance');await pick('Gamepad controls');await pick('Change gamepad controls');await pick('Restore default gamepad controls');await audit('reset confirmation');await shot('reset');await pick('Cancel');equal((await state()).prefs.buttons.gear,16);await pick('Restore default gamepad controls');await pick('Restore defaults');equal((await state()).prefs,null);
  await pick(await row('Walk or steer left and right'));await pick('Choose a new input');await axis(4,.8);await axis(4,0);equal((await state()).prefs.axes?.steer,4);
  await page.reload();await page.waitForFunction(()=>window.OTR?.game?.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:180000});await frames(4);const restored=await state();equal(restored.prefs.axes.steer,4,'Reload restores the saved axis');equal(restored.keys.KeyR,'KeyT');equal(restored.draft,null,'The controller reads saved preferences without a session override');await axis(4,.59);ok(Math.abs((await state()).frame.steer-.5)<1e-8,'The reloaded controller uses the saved physical axis');await axis(4,0);
  await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),G=OTR.fpGamepad;OTR.fpGamepadUI.persist(s,{deadzone:.45,axes:Object.fromEntries(Object.keys(G.defaults.axes).map(k=>[k,7])),buttons:Object.fromEntries(Object.keys(G.defaults.buttons).map(k=>[k,31]))});});await audit('oversized save feedback');await shot('too-many-overrides');equal((await state()).prefs.axes.steer,4,'An oversized save leaves the stored preference intact');
  equal(report.errors,[]);report.complete=true;save();console.log(report.checks+' actual remapping UI checks passed.');
 }catch(error){report.failure=error.stack;if(page){report.last=await state().catch(()=>null);await page.screenshot({path:path.join(OUT,TAG+'-failure.png')}).catch(()=>{});}save();throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
