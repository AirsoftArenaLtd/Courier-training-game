/* Native instrument pixels, retained device hit targets and bounded translated layouts. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8368',OUT=path.join(__dirname,'out/fp-review'),TAG=process.env.QA_TAG||'c52-design';fs.mkdirSync(OUT,{recursive:true});
const LANGS=(process.env.QA_LANGS||'en,ta').split(',');
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let page,checks=0;const report={views:[],errors:[]};
 try{for(const quality of (process.env.QA_QUALITIES||'low,high').split(',')){
  page=await browser.newPage();await page.setViewport({width:1280,height:720});await page.evaluateOnNewDocument(()=>localStorage.clear());page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/.test(m.text()))report.errors.push(m.text());});
  await page.goto(BASE+'/first-person.html?gfx='+quality);const ready=()=>page.waitForFunction(()=>window.OTR?.game?.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:60000});await ready();for(const lang of LANGS)if(lang!=='en')await page.addScriptTag({url:BASE+'/data/i18n/'+lang+'.js'});
  const frames=async()=>{const at=await page.evaluate(()=>OTR.game.loop.frame);await page.waitForFunction(f=>OTR.game.loop.frame>f+2,{timeout:60000},at);};
  const shot=async name=>{await frames();const file=TAG+'-'+quality+'-'+name+'.png';await page.screenshot({path:path.join(OUT,file)});return file;};
  for(const lang of LANGS)for(const large of [false,true]){
   console.log(quality+' '+lang+' large='+large);
   await page.evaluate(({lang,large})=>{const s=OTR.game.scene.getScene('FirstPersonScene');window.designToken=s.loadingToken;OTR.i18n.use(lang);const font=OTR.fpBrand.scriptFonts[lang];OTR.theme.font=font?'"'+font+'", "Noto Sans", sans-serif':'"Noto Sans", sans-serif';Object.assign(OTR.a11y.settings(),{large,colour:true,reducedMotion:true});s.scene.restart();},{lang,large});
   await page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return !s.loading&&s.loadingToken!==window.designToken;},{timeout:60000});
   const initial=await page.evaluate(()=>{
    const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.closePanel();s.keyboardMode=true;
    let plan=OTR.fpStopFlow.prepare(OTR.fpRoute.plan(4,7),true);plan=OTR.fpRadio.prepare(OTR.fpWalkaroundFlow.prepare(OTR.fpDamageFlow.prepare(OTR.fpTraffic.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(plan)))))));
    const m=OTR.fpMission.create('campaign',7,plan);OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);OTR.fpStopFlow.configure(m);OTR.fpLoadout.configure(m);
    m.phase='route';m.departed=m.secured=true;m.events[m.briefKey]=true;OTR.fpLater.depart(m);OTR.fpWalkaroundFlow.depart(m);for(const p of m.parcels)p.location='slot'+(p.anomaly?5:p.stop);
    m.step=()=>{};m.mode='cab';m.paused=false;m.routePlan.timeOfDay='midday';Object.assign(m.van,{speed:0,gear:1,hand:true,belt:true,headlights:false,look:0});OTR.fp.suspension(m,0);m.player.pitch=.18;s.model=m;s.area='route';s.rebuildWorld();s.sync();s.refresh();s.hud.navAt=-1000;OTR.fpHud.navigation(s);OTR.workday.begin();
    return {valid:!!OTR.fpMission.restore(m.snapshot()),quality:OTR.gfx.high()?'high':'low',controls:s.art.interactions.filter(o=>o.userData.interaction?.startsWith('cab-')).map(o=>o.userData.interaction)};
   });assert.equal(initial.quality,quality);assert.equal(initial.valid,true);assert.ok(initial.controls.includes('cab-reverse')&&initial.controls.includes('cab-headlights'));checks+=3;
   const key=quality+'-'+lang+'-'+(large?'large':'normal'),view={quality,lang,large,initial};view.cab=await shot(lang+'-'+(large?'large':'normal')+'-cab');
   if(lang==='en'&&!large){
    const pixels=await page.evaluate(async()=>{
     const s=OTR.game.scene.getScene('FirstPersonScene'),face=s.art.cab.gauges,gl=s.game.renderer.gl,m=s.model,beforeState=JSON.stringify(m.snapshot()),beforeEvents=JSON.stringify(OTR.workday.events);
     const read=()=>new Promise(resolve=>s.game.events.once('postrender',()=>{const data=new Uint8Array(1280*720*4);gl.readPixels(0,0,1280,720,gl.RGBA,gl.UNSIGNED_BYTE,data);resolve(data);}));
     const box=new THREE.Box3().setFromObject(face),corners=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(s.view.camera);corners.push({x:(p.x+1)*640,y:(p.y+1)*360});}
     const r={x:Math.max(0,Math.floor(Math.min(...corners.map(p=>p.x)))),y:Math.max(0,Math.floor(Math.min(...corners.map(p=>p.y))))};r.right=Math.min(1280,Math.ceil(Math.max(...corners.map(p=>p.x))));r.top=Math.min(720,Math.ceil(Math.max(...corners.map(p=>p.y))));
     const before=await read();face.visible=false;let after;try{after=await read();}finally{face.visible=true;}
     let changed=0;for(let y=r.y;y<r.top;y++)for(let x=r.x;x<r.right;x++){const i=(y*1280+x)*4;if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>18)changed++;}
     return {changed,rect:r,unchanged:beforeState===JSON.stringify(m.snapshot())&&beforeEvents===JSON.stringify(OTR.workday.events),glError:gl.getError(),textures:s.view.diagnostics.textures};
    });assert.ok(pixels.changed>100,JSON.stringify(pixels));assert.ok(pixels.unchanged);assert.equal(pixels.glError,0);assert.ok(pixels.textures<=(quality==='high'?4:2));view.instrumentPixels=pixels;checks+=4;
    const live=await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;Object.assign(m.van,{speed:8,headlights:true});m.motion.rpm=2400;s.sync();const u=s.art.cab.gauges.material.uniforms;return {speed:u.speed.value,rpm:u.rpm.value,lit:u.lit.value};});assert.ok(Math.abs(live.speed-8/17.8816)<1e-8);assert.equal(live.rpm,.6);assert.equal(live.lit,1);checks+=3;
    view.live=await shot('en-normal-live-instruments');await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.van.speed=0;s.model.motion.rpm=800;s.sync();});
   }
   await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.home());await page.waitForFunction(()=>{const d=OTR.game.scene.getScene('FirstPersonScene').handheld.device;return d.isOpen&&Math.abs(d.root.y-d.Yopen)<1;});
   const layout=await page.evaluate(()=>{
    const s=OTR.game.scene.getScene('FirstPersonScene'),d=s.handheld.device,bad=[],buttons=d.optionBtns.map(b=>{const r=b.label.getBounds();if(r.x<d.root.x+d.sx||r.right>d.root.x+d.sx+d.sw||r.y<d.root.y+d.sy||r.bottom>d.root.y+d.sy+d.sh)bad.push(b.label.text);return {surface:b._fpSurface?.type,enabled:b.enabled,x:d.root.x+b.x,y:d.root.y+b.y,top:d.root.y+b.y-b._fpHeight/2,bottom:d.root.y+b.y+b._fpHeight/2,faceTop:d.root.y+b.y-b._fpHeight*b.scaleY/2,faceBottom:d.root.y+b.y+b._fpHeight*b.scaleY/2,height:b._fpHeight,font:parseFloat(b.label.style.fontSize)*b.label.scaleY};});
    // The merged dense-page layout intentionally allows gaps from two to six pixels.
    // Check both its minimum spacing and the rendered face after any hover transform.
    for(let i=1;i<buttons.length;i++)if(buttons[i].top<buttons[i-1].bottom+2-.01||buttons[i].faceTop<buttons[i-1].faceBottom-.01)bad.push('Overlapping choices');
    const top=Math.min(...buttons.map(b=>b.top));for(const o of d.screen.list)if(o.type==='Text'&&o.y>d.sy+44&&o.y<d.sy+d.sh-30&&o.getBounds().bottom>top-4)bad.push(o.text);
    return {bad,buttons,body:d.body.type,bodyCanvases:Object.keys(s.textures.list).filter(k=>k==='handheld_body').length,focused:!!s.handheld.focusRing?.active};
   });view.layout=layout;report.current=view;fs.writeFileSync(path.join(OUT,TAG+'-progress.json'),JSON.stringify(report,null,2)+'\n');assert.deepEqual(layout.bad,[]);assert.ok(layout.buttons.every(b=>b.surface==='Graphics'&&b.font>=15&&b.height>=46));assert.ok(layout.focused);if(quality==='low'){assert.equal(layout.body,'Graphics');assert.equal(layout.bodyCanvases,0);checks+=2;}checks+=3;view.handheld=await shot(lang+'-'+(large?'large':'normal')+'-handheld');
   // Test the real pointer path as well as the preserved numbered/remapped keyboard routes.
   const index=await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.device.current.options.findIndex(o=>o.label==='Stop details'));
   await page.mouse.click(layout.buttons[index].x,layout.buttons[index].y);await frames();assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.device.current.title),'STOP DETAILS');checks++;
   await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.home();const a=OTR.a11y.settings();a.keys.KeyP='KeyO';});await page.keyboard.press('Tab');await frames();
   await page.keyboard.press('o');await frames();assert.ok(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').target));checks++;
   await page.keyboard.press('Tab');await frames();await page.keyboard.press('2');await frames();assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.device.current.title),'STOP DETAILS');checks++;
   report.views.push(view);
  }
  await page.close();page=null;
 }assert.deepEqual(report.errors,[]);checks++;report.checks=checks;fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify(report,null,2)+'\n');console.log(checks+' device visual browser checks passed');}
 catch(e){if(page)await page.screenshot({path:path.join(OUT,TAG+'-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
