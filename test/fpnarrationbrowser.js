/* Real P/actions/gaze and a four-second reverse, based on Claude's cab probe.
 * Define the read-only browser speech property explicitly; assignment silently keeps native speech. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const b=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let p,checks=0;const errors=[],report={};
 try{
  p=await b.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));
  await p.evaluateOnNewDocument(()=>{
   window.__said=[];window.__hold=false;
   const speech={speaking:false,pending:false,current:null,cancels:0,finish(){this.speaking=false;const u=this.current;this.current=null;if(u&&u.onend)u.onend();},cancel(){this.cancels++;this.finish();},speak(u){this.current=u;this.speaking=true;window.__said.push({text:u.text,time:performance.now(),lang:u.lang});if(!window.__hold)setTimeout(()=>{if(this.current===u)this.finish();},80);}};
   Object.defineProperty(window,'speechSynthesis',{configurable:true,value:speech});window.SpeechSynthesisUtterance=function(text){this.text=text;};
  });
  await p.goto((process.env.QA_BASE||'http://127.0.0.1:8330')+'/first-person.html?gfx=low');
  await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:60000});
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.closePanel();s.progress.sequence=9;s.progress.campaign=null;s.progress.welcomed=true;Object.assign(OTR.a11y.settings(),{narrate:true,large:true,colour:true,reducedMotion:true});s.launch('campaign');});
  await p.waitForFunction(()=>!OTR.game.scene.getScene('FirstPersonScene').transitioning);
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.closePanel();m.mode='cab';m.phase='route';m.departed=m.secured=true;m.events[m.briefKey]=true;Object.assign(m.van,{speed:0,hand:true,belt:true,gear:1,look:0});s.keyboardMode=true;s.sync();s.refresh();window.__said.length=0;});
  const spoken=()=>p.evaluate(()=>window.__said);
  const hear=async fragment=>{await p.waitForFunction(f=>window.__said.some(u=>u.text.includes(f)),{timeout:20000},fragment);checks++;};
  for(let i=0;i<6;i++){await p.keyboard.press('KeyP');await wait(500);}
  const selected=await spoken();assert.ok(selected.length>=1&&selected.length<=3,JSON.stringify(selected));assert.equal(new Set(selected.map(u=>u.text)).size,selected.length);for(let i=1;i<selected.length;i++){assert.ok(selected[i].time-selected[i-1].time>=1450,'Ordinary hints must be spaced.');checks++;}checks+=2;report.sixSelections=selected;
  await p.keyboard.press('KeyV');await p.keyboard.press('KeyR');await hear('The van is in reverse.');
  await p.keyboard.press('KeyL');await hear('The headlights are on.');
  await p.keyboard.press('KeyR');await hear('The van is in drive.');
  for(let i=0;i<32;i++){await p.keyboard.press('KeyP');if(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').target==='mirror-left'))break;await wait(80);}
  assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').target),'mirror-left');checks++;await hear('Your left mirror check is current.');
  report.controlsAndMirror=await spoken();
  await p.screenshot({path:path.join(OUT,'b30-narrated-cab.png')});
  // A long panel reading owns the synthesizer even when a stop becomes pending.
  await p.evaluate(()=>{window.__hold=true;const s=OTR.game.scene.getScene('FirstPersonScene');s.showPanel('Narration check.','This panel keeps speaking until the trainee closes it.',[{label:'Continue.',action:()=>s.closePanel()}]);});
  const panel=await p.evaluate(()=>({count:window.__said.length,cancels:speechSynthesis.cancels}));
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;m.van.gear=-1;m.solids=[{x:m.van.x,z:m.van.z+3.02,w:3,d:.2,h:1}];m.traffic.length=0;m.crossing.state='resolved';OTR.fpAccess.voiceHint(s,'The headlights are on.');});
  await wait(1900);assert.deepEqual(await p.evaluate(()=>({count:window.__said.length,cancels:speechSynthesis.cancels})),panel);checks++;
  report.panelProtectedForMs=1900;
  await p.evaluate(()=>{window.__hold=false;OTR.game.scene.getScene('FirstPersonScene').closePanel();});await hear('Stop. A rear obstacle');
  await p.screenshot({path:path.join(OUT,'b30-stop-warning.png')});
  // Render real sensor bands. Decimal distance changes inside a band stay silent.
  const distance=async d=>p.evaluate(d=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;m.solids=[{x:m.van.x,z:m.van.z+2.82+d,w:3,d:.2,h:1}];m.van.hand=true;m.van.speed=0;s.target=null;m.van.look=0;m.player.pitch=0;s.sync();},d);
  await distance(2.5);await hear('A rear obstacle is within three meters.');await distance(.8);await hear('A rear obstacle is within one meter.');
  report.stopAndBands=(await spoken()).slice(panel.count);
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.solids=[];s.model.van.look=0;s.model.player.pitch=0;s.target=null;window.__said.length=0;});
  await hear('no obstacle within three meters.');await wait(1600);
  const baseline=await spoken();await p.keyboard.press('Space');await p.keyboard.down('KeyW');await wait(4000);await p.keyboard.up('KeyW');
  const reverse=await p.evaluate(n=>({said:window.__said.slice(n),speed:OTR.game.scene.getScene('FirstPersonScene').model.van.speed}),baseline.length);
  assert.ok(reverse.speed<0,'The actual accelerator must reverse the van.');assert.ok(reverse.said.length<=3,JSON.stringify(reverse));checks+=2;report.reverseFourSeconds=reverse;
  await p.keyboard.press('Space');
  // Turning the saved accessibility option off silences both actions and live bands.
  await p.evaluate(()=>{OTR.a11y.settings().narrate=false;window.__said.length=0;});await p.keyboard.press('KeyL');await distance(.2);await wait(1700);assert.deepEqual(await spoken(),[]);checks++;
  assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>OTR.game.renderer.gl.isContextLost()),false);checks+=2;
  report.checks=checks;report.errors=errors;fs.writeFileSync(path.join(OUT,'b30-narration.json'),JSON.stringify(report,null,2));console.log(checks+' cab narration browser checks passed');
 }finally{await b.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
