/* Rendered sign geometry, bounded text, real reading keys and modal visibility. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let checks=0;const errors=[],samples=[];
 try{for(const [quality,lang,large] of [['low','en',false],['low','en',true],['low','ta',true],['high','en',false]]){
  const p=await b.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});
  const base=process.env.QA_BASE||'http://127.0.0.1:8333';await p.goto(base+'/first-person.html?gfx='+quality);const ready=()=>p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:60000});await ready();
  if(lang==='ta')await p.addScriptTag({url:base+'/data/i18n/ta.js'});
  await p.evaluate(({lang,large})=>{const s=OTR.game.scene.getScene('FirstPersonScene');window.signToken=s.loadingToken;OTR.i18n.use(lang);Object.assign(OTR.a11y.settings(),{large,colour:true,reducedMotion:large,narrate:false});s.scene.restart();},{lang,large});await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return !s.loading&&s.loadingToken!==window.signToken;},{timeout:60000});
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.closePanel();s.keyboardMode=true;const m=OTR.fpMission.create('campaign',7,OTR.fpLater.prepare(OTR.fpRoute.plan(3,7)));OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);m.phase='route';m.mode='cab';m.departed=m.secured=true;m.paused=false;m.step=()=>{};m.events[m.briefKey]=true;const j=m.junctions[0];Object.assign(m.van,{x:j.x+2.5,z:j.z+17,yaw:0,speed:0,hand:true,belt:true,gear:1,look:0});s.model=m;s.area='route';s.rebuildWorld();s.sync();s.refresh();});
  const frame=await p.evaluate(()=>OTR.game.loop.frame);await p.waitForFunction(f=>OTR.game.loop.frame>f+5,{},frame);
  await p.waitForFunction(()=>OTR.game.scene.getScene('FirstPersonScene').signUI.pool.some(s=>s.entry),{timeout:5000});
  const result=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return {quality:OTR.gfx.level(),geometry:s.art.signs.entries.length,drawn:s.art.signs.entries.filter(e=>e.mainVisible).length,pool:s.signUI.pool.length,visible:s.signUI.pool.filter(x=>x.entry).map(x=>{const r=x.text.getBounds();return {id:x.entry.sign.id,text:x.text.text,x:r.x,y:r.y,right:r.right,bottom:r.bottom,font:parseFloat(x.text.style.fontSize)};}),calls:s.view.diagnostics.calls,triangles:s.view.diagnostics.triangles,context:s.game.renderer.gl.isContextLost()};});
  assert.equal(result.quality,quality);assert.equal(result.pool,5);assert.ok(result.drawn<=(quality==='low'?5:24));assert.ok(result.visible.length>0);assert.equal(result.context,false);checks+=5;
  for(const x of result.visible){assert.ok(x.x>=0&&x.right<=1280&&x.y>=0&&x.bottom<=720);assert.ok(x.font>=(large?22:18));checks+=2;}
  await p.evaluate(()=>{OTR.a11y.settings().keys.KeyJ='KeyU';});
  await p.keyboard.press('KeyU');await p.waitForFunction(()=>OTR.game.scene.getScene('FirstPersonScene').notice.startsWith('Stop before')||OTR.game.scene.getScene('FirstPersonScene').notice.startsWith('This is')||OTR.game.scene.getScene('FirstPersonScene').notice.startsWith('The ')||OTR.game.scene.getScene('FirstPersonScene').notice.startsWith('Give way'));
  checks++;await p.screenshot({path:path.join(OUT,`c30-signs-${quality}-${lang}-${large?'large':'normal'}.png`)});
  await p.keyboard.press('KeyH');await p.waitForFunction(()=>!!OTR.game.scene.getScene('FirstPersonScene').panel);
  const hidden=await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').signUI.pool.every(s=>!s.text.visible&&!s.back.visible));assert.equal(hidden,true);checks++;
  samples.push({lang,large,...result});await p.close();
 }
 assert.deepEqual(errors,[]);checks++;fs.writeFileSync(path.join(OUT,'c30-signs-browser.json'),JSON.stringify({checks,samples,errors,scope:'Rendering and reading only. Scoring is pending the Claude-inbox clarification.'},null,2));console.log(checks+' sign rendering and keyboard checks passed');
 }finally{await b.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
