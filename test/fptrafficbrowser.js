/* Physical signal readings, real keys, narration, and bounded road actors. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const quality=process.env.QA_GFX||'low',base=process.env.QA_BASE||'http://127.0.0.1:8336';
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let page,checks=0;const errors=[],samples=[];
 try{for(const [lang,large] of (process.env.QA_SMOKE==='1'?[['en',false]]:[['en',false],['en',true],['ta',true]]).filter(([lang])=>!process.env.QA_LANGS||process.env.QA_LANGS.split(',').includes(lang))){
  page=await browser.newPage();await page.setViewport({width:1280,height:720});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/i.test(m.text()))errors.push(m.text());});
  await page.goto(base+'/first-person.html?gfx='+quality+'&lang='+lang);await page.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:60000});
  await page.waitForFunction(lang=>OTR.i18n.lang===lang,{timeout:30000},lang);
  await page.evaluate(({lang,large})=>{const s=OTR.game.scene.getScene('FirstPersonScene');window.trafficToken=s.loadingToken;OTR.i18n.use(lang);Object.assign(OTR.a11y.settings(),{large,colour:true,reducedMotion:true,narrate:false});s.scene.restart();},{lang,large});
  await page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return !s.loading&&s.loadingToken!==window.trafficToken;},{timeout:60000});
  const fixture=await page.evaluate(()=>{
   const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.closePanel();s.keyboardMode=true;
   const plan=OTR.fpTraffic.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(OTR.fpRoute.plan(4,7))))),m=OTR.fpMission.create('campaign',7,plan);
   OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);OTR.fpLoadout.configure(m);
   window.trafficStep=m.step;m.step=()=>{};m.phase='route';m.mode='cab';m.departed=m.secured=true;OTR.fpLater.depart(m);m.paused=false;m.events[m.briefKey]=true;
   const j=OTR.fpTraffic.layout(m).find(j=>j.kind==='signal');window.trafficJunction=j;
   m.elapsed=(23-j.offset+54)%54;Object.assign(m.van,{x:j.x+1.7,z:j.z+m.town.road/2+13,yaw:0,speed:0,hand:true,belt:true,gear:1,look:0});
   s.model=m;s.area='route';s.notice='';s.progress.guidance={intro:true,seen:['driver']};s.rebuildWorld();s.sync();s.refresh();OTR.workday.begin();
   return {version:m.routePlan.traffic,lights:OTR.fpTraffic.layout(m).filter(j=>j.kind==='signal').length,limit:s.art.townArt.triangleLimit};
  });assert.equal(fixture.version,1);assert.equal(fixture.lights,3);assert.equal(fixture.limit,quality==='high'?null:180);checks+=3;
  const frames=async()=>{const before=await page.evaluate(()=>OTR.game.loop.frame);await page.waitForFunction(f=>OTR.game.loop.frame>f+4,{},before);};await frames();
  const signal=()=>page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),e=s.art.signs.entries.find(e=>e.sign.kind==='signal'&&e.sign.control.id===window.trafficJunction.id&&e.sign.approach==='n');const lamp=new THREE.Vector3(0,0,.5-(.7+.3*(e.shape===10?.8:e.shape===11?.5:.2))).applyMatrix4(e.matrix).applyMatrix4(s.art.route.matrixWorld).project(s.view.camera),nav=s.navRoot.getBounds();return {lamp:{x:(lamp.x+1)*640,y:(1-lamp.y)*360},nav:{x:nav.x,y:nav.y,right:nav.right,bottom:nav.bottom},shape:e.shape,text:e.label.text,visible:e.mainVisible,kind:e.sign.kind,labels:s.signUI.pool.filter(p=>p.entry).map(p=>{const r=p.text.getBounds();return {text:p.text.text,x:r.x,y:r.y,right:r.right,bottom:r.bottom,font:parseFloat(p.text.style.fontSize)};})};});
  const clearLamp=shown=>{const {lamp,nav}=shown;assert.ok(lamp.x>10&&lamp.x<1270&&lamp.y>90&&lamp.y<710,'The physical signal lamp must be in the cab view.');assert.ok(lamp.x+10<nav.x||lamp.x-10>nav.right||lamp.y+10<nav.y||lamp.y-10>nav.bottom,'The sat nav must not hide the physical signal lamp.');checks+=2;};const red=await signal();clearLamp(red);assert.equal(red.shape,10);assert.equal(red.visible,true);assert.match(red.text,/red/);checks+=3;
  for(const label of red.labels){assert.ok(label.x>=0&&label.right<=1280&&label.y>=0&&label.bottom<=720);assert.ok(label.font>=(large?22:18));checks+=2;}
  const press=async key=>{await page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.time.now>=(s.inputBlockedUntil||0);});await page.keyboard.press(key);await frames();};
  await page.evaluate(()=>{window.trafficSaid=[];const speech={speaking:false,pending:false,speak(u){this.speaking=true;window.trafficSaid.push(u.text);setTimeout(()=>{this.speaking=false;if(u.onend)u.onend();},80);},cancel(){this.speaking=false;}};Object.defineProperty(window,'speechSynthesis',{configurable:true,value:speech});window.SpeechSynthesisUtterance=function(text){this.text=text;};OTR.a11y.settings().narrate=true;OTR.a11y.settings().keys.KeyJ='KeyU';});
  for(let i=0;i<12;i++){await press('KeyU');if(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').notice===OTR.fpTraffic.signalText('red')))break;}
  assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').notice),red.text);
  await page.waitForFunction(()=>window.trafficSaid.includes(OTR.i18n.t(OTR.fpTraffic.signalText('red'))),{timeout:20000});checks+=2;
  await page.screenshot({path:path.join(OUT,`c32-${quality}-${lang}-${large?'large':'normal'}-red.png`)});
  for(const [time,shape,word] of [[17,11,'amber'],[0,12,'green']]){
   await page.evaluate(time=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.elapsed=(time-window.trafficJunction.offset+54)%54;s.notice='';s.sync();s.refresh();s.signUI.lastAt=-1000;},time);await frames();const shown=await signal();clearLamp(shown);assert.equal(shown.shape,shape);assert.match(shown.text,new RegExp(word));checks+=2;
  }
  await page.screenshot({path:path.join(OUT,`c32-${quality}-${lang}-${large?'large':'normal'}-green.png`)});
  const actors=await page.evaluate(()=>{
   const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,c=m.trafficControl.cyclist;
   Object.assign(m.van,{x:2.84,z:-18,yaw:0,speed:0,look:0});m.elapsed=10;OTR.fpTraffic.cyclistStep(m,.0125);OTR.fpTraffic.syncSolids(m);
   m.mode='walk';Object.assign(m.player,{x:c.x+4,z:c.z+3,yaw:Math.atan2(-4,3),pitch:.08});s.sync();s.refresh();
   return {state:c.state,solid:m._trafficSolids.cyclist.x===c.x,quads:s.art.trafficArt.entries.filter(e=>e.visible).length,highBike:!!s.art.trafficBike?.visible,children:s.art.actors.children?.count||s.art.schoolChildren};
  });assert.equal(actors.state,'beside');assert.equal(actors.solid,true);assert.equal(actors.quads,quality==='high'?0:4);assert.equal(actors.highBike,quality==='high');assert.equal(actors.children,2);checks+=5;await frames();
  await page.screenshot({path:path.join(OUT,`c32-${quality}-${lang}-${large?'large':'normal'}-cyclist.png`)});
  await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,h=m.crossing;m.mode='walk';h.state='crossing';h.x=m.town.school.x-2;Object.assign(m.player,{x:h.x-5,z:h.z+6,yaw:Math.atan2(5,6),pitch:.05});OTR.fpTraffic.syncSolids(m);s.sync();s.refresh();});await frames();
  await page.screenshot({path:path.join(OUT,`c32-${quality}-${lang}-${large?'large':'normal'}-school.png`)});
  const checkpoint=await page.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model,raw=m.snapshot(),r=OTR.fpMission.restore(raw);return {accepted:!!r,same:r&&JSON.stringify(r.snapshot())===JSON.stringify(raw),different:r&&Object.keys(raw).filter(k=>JSON.stringify(r.snapshot()[k])!==JSON.stringify(raw[k])),reports:OTR.workday.events.length};});assert.equal(checkpoint.accepted,true,JSON.stringify(checkpoint));assert.equal(checkpoint.same,true,JSON.stringify(checkpoint));assert.equal(checkpoint.reports,0);checks+=3;
  const before=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,j=window.trafficJunction;m.mode='cab';m.elapsed=(23-j.offset+54)%54;m.trafficControl.cyclist.state='done';m.trafficControl.cyclist.leg=m.leg;OTR.fpTraffic.syncSolids(m);Object.assign(m.van,{x:j.x+1.7,z:j.z+m.town.road/2+3.5,yaw:0,speed:1,steer:0,hand:false,gear:1,look:0});m.player.pitch=0;m.step=window.trafficStep;s.notice='';s.sync();s.refresh();return m.van.z;});
  await page.keyboard.down('KeyW');await page.waitForFunction(()=>OTR.workday.events.some(e=>e.type==='drive.red-light'&&!e.ok),{timeout:60000});await page.keyboard.up('KeyW');await press('Space');
  const driven=await page.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return {z:m.van.z,events:OTR.workday.events.filter(e=>['drive.red-light','drive.sign-stop','drive.stop-line'].includes(e.type))};});assert.ok(driven.z<before);assert.equal(driven.events.length,1);assert.equal(driven.events[0].type,'drive.red-light');checks+=3;
  const phaserBytes=await page.evaluate(()=>{const seen=new Set();let bytes=0;for(const t of Object.values(OTR.game.textures.list))for(const src of t.source||[]){const id=src.glTexture||src;if(seen.has(id))continue;seen.add(id);const im=src.image,w=im&&(im.naturalWidth||im.width)||src.width,h=im&&(im.naturalHeight||im.height)||src.height;bytes+=w*h*4;}return Math.ceil(bytes*4/3);});assert.ok(phaserBytes<=(quality==='low'?4:16)*1024*1024);checks++;
  samples.push({lang,large,fixture,red,actors,checkpoint,driven,phaserBytes});await page.close();page=null;
 }
 assert.ok(samples.length,'No traffic language fixtures were selected.');assert.deepEqual(errors,[]);checks++;fs.writeFileSync(path.join(OUT,`${process.env.QA_TAG||'c32'}-${quality}-traffic.json`),JSON.stringify({checks,samples,errors},null,2));console.log(checks+' traffic browser checks passed');
 }catch(e){if(page){const state=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;return {plan:m.routePlan,van:m.van,elapsed:m.elapsed,phase:m.phase,paused:m.paused,mode:m.mode,junctions:m.junctions,events:OTR.workday.events,modelEvents:m.events,junction:window.trafficJunction,controls:OTR.fpTraffic.layout(m),step:String(m.step),logs:m.logs};}).catch(()=>null);fs.writeFileSync(path.join(OUT,'c32-failure-state.json'),JSON.stringify(state,null,2));}if(page)await page.screenshot({path:path.join(OUT,'c32-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
