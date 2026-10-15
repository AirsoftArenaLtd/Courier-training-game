/* Physical unlisted-package scan and Dispatch load-check UI, both text sizes and languages. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let checks=0;const errors=[];let p;
 try{
  p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));
  const base=process.env.QA_BASE||'http://127.0.0.1:8302';await p.goto(base+'/first-person.html?gfx=low');
  await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.closePanel();s.launch('campaign');});
  await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model&&!s.transitioning;});
  assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.loadout.kind),'missort');checks++;
  await p.addScriptTag({url:base+'/data/i18n/ta.js'});
  const fixture=async(kind,lang,large)=>p.evaluate(({kind,lang,large})=>{
   const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();const m=OTR.fpMission.create('campaign',1,OTR.fpRoute?OTR.fpRoute.plan(1,1):null);OTR.fpLoadout.configure(m,kind);m.briefing={day:1,weather:'clear',clockMin:500};m.events[m.briefKey]=true;
   OTR.i18n.lang='en';OTR.i18n.cache.clear();if(lang==='ta')OTR.i18n.use('ta');OTR.a11y.settings().large=large;
   s.model=m;s.area='route';s.rebuildWorld();const desk=m.point('dispatch');Object.assign(m.player,{x:desk.x+1.6,z:desk.z,yaw:-Math.PI/2,pitch:0});m.paused=true;OTR.workday.begin();s.sync();s.refresh();
  },{kind,lang,large});
  const audit=async tag=>{
   await wait(400);const issues=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),h=s.handheld.device,issues=[];
    const root=s.panel?s.panel.root:h.root,screen=s.panel?{x:120,y:88,right:1160,bottom:632}:{x:h.root.x+h.sx,y:h.root.y+h.sy,right:h.root.x+h.sx+h.sw,bottom:h.root.y+h.sy+h.sh};
    const visit=o=>{if(!o.visible)return;if(o.type==='Text'){const b=o.getBounds();if(b.x<screen.x-2||b.right>screen.right+2||b.y<screen.y-2||b.bottom>screen.bottom+2)issues.push('bounds '+o.text);if(parseFloat(o.style.fontSize)*Math.min(o.scaleX,o.scaleY)<(s.panel?17:12))issues.push('small '+o.text);}for(const child of o.list||[])visit(child);};
    if(s.panel)visit(root);else for(const child of h.screen.list)visit(child);return issues;
   });assert.deepEqual(issues,[],tag);checks++;
   await p.screenshot({path:path.join(OUT,'c8-'+tag+'.png')});
  };
  for(const lang of ['en','ta'])for(const large of [false,true]){
   const tag=lang+'-'+(large?'large':'normal');await fixture('extra',lang,large);
   await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.home());await audit(tag+'-home');await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.close());
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,p=m.parcels.at(-1),point=m.point(p.id);Object.assign(m.player,{x:point.x,z:point.z+1.5});s.sync();const v=s.art.parcels.at(-1).getWorldPosition(new THREE.Vector3()),eye=s.view.camera.position;m.player.yaw=Math.atan2(v.x-eye.x,-(v.z-eye.z));m.player.pitch=Math.atan2(eye.y-v.y,Math.hypot(v.x-eye.x,v.z-eye.z));s.sync();s.interact();});
   assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.heldId),'parcel5');checks++;
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.scan();s.handheld.trigger=true;});
   await p.waitForFunction(()=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld;return h.isOpen&&!h.aiming;},{timeout:15000});await audit(tag+'-scan-alert');
   await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.loadCheck());await audit(tag+'-load-check');
   await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.choose(2));
   assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.parcels.at(-1).location),'aside');checks++;
   assert.equal(await p.evaluate(()=>OTR.workday.events.filter(e=>e.type==='load.extra-caught').length),1);checks++;
   await audit(tag+'-aside');
   await fixture('clear',lang,large);await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;for(const p of m.parcels){p.location='slot'+p.stop;p.zone=p.location;p.scanned=p.loaded=true;}s.showLoadCount();});await audit(tag+'-count');
   await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').choose(5));assert.equal(await p.evaluate(()=>OTR.workday.events.find(e=>e.type==='load.count').ok),true);checks++;
   await fixture('missing',lang,large);await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.loadCheck();s.handheld.choose(1);});await audit(tag+'-missing');
   assert.equal(await p.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return m.parcel(m.loadout.missingId).location;}),'depot');checks++;
   await fixture('late',lang,large);await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;OTR.fpLoadout.missing(m);m.preparation();m.mode='walk';m.cargoOpen=true;Object.assign(m.van,m.stops[0].park||{z:m.stops[0].z});Object.assign(m.player,m.point('cargo'));m.player.z+=1.2;m.paused=false;m.step({},0.025);s.sync();s.refresh();s.checkpoint();});
   assert.equal(await p.evaluate(()=>OTR.workday.events.filter(e=>e.type==='load.found-later'&&e.stop===1).length),1);checks++;
   assert.equal(await p.evaluate(()=>OTR.fpStore.read().campaign.loadout.found),true);checks++;
  }
  assert.deepEqual(errors,[]);console.log(`${checks} load-out browser checks passed`);
 }catch(e){if(p)await p.screenshot({path:path.join(OUT,'c8-failure.png')}).catch(()=>{});throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
