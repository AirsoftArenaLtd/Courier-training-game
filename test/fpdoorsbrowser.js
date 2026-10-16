/* Doorstep UI, real raycasts, signature completion/cancellation and safe outcomes. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const errors=[];let checks=0,p;
 try{
  p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});const base=process.env.QA_BASE||'http://127.0.0.1:8302';await p.goto(base+'/first-person.html?gfx=low');await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);await p.addScriptTag({url:base+'/data/i18n/ta.js'});
  await p.evaluate(()=>{
   window.doorFixture=(kind,variant=0)=>{
    const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.releaseMouse=()=>{};s.handheld.close();s.closePanel();let m,id;
    for(let seed=1;seed<100;seed++){
     m=OTR.fpMission.create('campaign',seed,OTR.fpRoute.plan(2,seed));OTR.fpDoors.configure(m);m.doorsteps.date='2026-10-15';OTR.fpDoors.configure(m,m.doorsteps);
     id=m._doorSpecs.findIndex(a=>kind==='adult'?a.adult&&seed%5===variant:kind==='signature'?a.signature&&a.present&&!a.adult&&!a.dog&&!a.wrong:kind==='dog'?a.dog:kind==='wrong'?a.wrong:kind==='customer'?a.difficult:a.hazard==='wet'||a.hazard==='ice');if(id>=0)break;
    }if(id<0)throw Error('No fixture '+kind);s.model=m;s.area='route';s.rebuildWorld();m.events[m.briefKey]=true;m.phase='route';m.departed=true;m.mode='walk';m.paused=true;const stop=m.stops[id],parcel=m.parcels[id];Object.assign(m.van,stop.park,{speed:0,hand:true});Object.assign(m.player,{x:stop.x-stop.side*1.5,z:stop.z,yaw:stop.side*Math.PI/2,pitch:0});Object.assign(parcel,{location:'held',loaded:true,scanned:true,stopScanned:true});m.heldId=parcel.id;m.activeStop=id;m.contact(id);OTR.workday.begin();s.notice='';s.sync();s.refresh();return id;
   };
  });
  const audit=async()=>{
   await p.waitForFunction(()=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld.device;return !h.isOpen||Math.abs(h.root.y-h.Yopen)<1;});
   const bad=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),h=s.handheld.device,out=[];const visit=o=>{if(!o.visible||o.alpha<=.05)return;if(o.type==='Text'){const r=o.getBounds(),font=parseFloat(o.style.fontSize)*Math.min(o.scaleX,o.scaleY);if(r.x<0||r.right>1281||r.y<0||r.bottom>721||font<(s.panel?17:11))out.push(o.text);if(h.isOpen&&s.panel===null&&(r.x<h.root.x+h.sx-1||r.right>h.root.x+h.sx+h.sw+1||r.bottom>h.root.y+h.sy+h.sh+1))out.push('device '+o.text);}for(const child of o.list||[])visit(child);};if(s.panel)visit(s.panel.root);else if(h.isOpen)visit(h.screen);return out;});assert.deepEqual(bad,[]);checks++;
  };
  const signature=async id=>{
   await p.evaluate(id=>OTR.game.scene.getScene('FirstPersonScene').handheld.signature(id),id);await audit();await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.choose(0));await audit();
   if(!fs.existsSync(path.join(OUT,'c9-signature.png'))){await new Promise(r=>setTimeout(r,600));await p.screenshot({path:path.join(OUT,'c9-signature.png')});}
   await p.waitForFunction(id=>OTR.game.scene.getScene('FirstPersonScene').model.doorsteps.stops[id].signatureName!==null,{timeout:15000},id);await audit();checks++;
  };
  for(const lang of ['en','ta'])for(const large of [false,true]){
   await p.evaluate(({lang,large})=>{OTR.i18n.use(lang);OTR.a11y.settings().large=large;},{lang,large});
   for(let variant=0;variant<5;variant++){
    const id=await p.evaluate(v=>doorFixture('adult',v),variant);await p.evaluate(id=>OTR.game.scene.getScene('FirstPersonScene').showIdentity(id),id);await audit();
    if(variant===3&&large)await p.screenshot({path:path.join(OUT,`c9-id-photo-${lang}-large.png`)});
    await p.evaluate(v=>OTR.game.scene.getScene('FirstPersonScene').choose(v===0?0:1),variant);await audit();
    if(variant===0)await signature(id);
    await p.evaluate(id=>OTR.game.scene.getScene('FirstPersonScene').handheld.delivery(id),id);await audit();await p.evaluate(v=>OTR.game.scene.getScene('FirstPersonScene').handheld.choose(v===0?0:2),variant);await audit();
    const result=await p.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return {ok:OTR.workday.events.find(e=>e.type==='stop.age-check').ok,saved:!!OTR.fpMission.restore(m.snapshot())};});assert.deepEqual(result,{ok:true,saved:true});checks+=2;
   }
   let id=await p.evaluate(()=>doorFixture('signature'));await signature(id);await p.evaluate(id=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld;h.delivery(id);h.choose(0);},id);assert.equal(await p.evaluate(()=>OTR.workday.events.find(e=>e.type==='deliver.outcome').ok),true);checks++;
   id=await p.evaluate(()=>doorFixture('customer'));await p.evaluate(id=>OTR.game.scene.getScene('FirstPersonScene').showCustomer(id),id);await audit();await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').choose(0));assert.equal(await p.evaluate(()=>OTR.workday.events.find(e=>e.type==='stop.difficult').ok),true);checks++;
   id=await p.evaluate(()=>doorFixture('wrong'));assert.match(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.scan()),/does not match/);await p.evaluate(id=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld;h.delivery(id);h.choose(2);},id);assert.equal(await p.evaluate(()=>OTR.workday.events.find(e=>e.type==='stop.wrong-address').ok),true);checks+=2;
   id=await p.evaluate(()=>doorFixture('dog'));
   await p.evaluate(id=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,stop=m.stops[id],point=m.point('gate'+id);Object.assign(m.player,{x:point.x-stop.side*1.2,z:point.z,pitch:0});s.sync();const target=s.art.interactions.find(o=>o.userData.interaction==='gate'+id).getWorldPosition(new THREE.Vector3()),eye=s.view.camera.position;m.player.yaw=Math.atan2(target.x-eye.x,-(target.z-eye.z));m.player.pitch=Math.atan2(eye.y-target.y,Math.hypot(target.x-eye.x,target.z-eye.z));s.sync();if(s.aimTarget()!=='gate'+id)throw Error('Gate is occluded');s.interact();},id);await audit();
   if(lang==='en'&&!large)await p.screenshot({path:path.join(OUT,'c9-dog-gate.png')});await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').choose(0));assert.equal(await p.evaluate(id=>OTR.game.scene.getScene('FirstPersonScene').model.doorsteps.stops[id].dogSecured,id),true);checks++;
  }
  // Leaving a live signature page cannot record a signature later in the background.
  const id=await p.evaluate(()=>doorFixture('signature'));await p.evaluate(id=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld;h.signature(id);h.choose(0);h.close(false);},id);await new Promise(r=>setTimeout(r,2500));assert.equal(await p.evaluate(id=>OTR.game.scene.getScene('FirstPersonScene').model.doorsteps.stops[id].signatureName,id),null);checks++;
  // The real Shift control slows walking; the same slippery patch is safe only with careful steps.
  const move=await p.evaluate(()=>{OTR.i18n.use('en');OTR.a11y.settings().large=false;const id=doorFixture('hazard'),s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;m.heldId=null;m.parcels[id].location='slot'+id;Object.assign(m.player,OTR.fpDoors.point(m,id,'hazard'));m.player.x-=m.stops[id].side*.55;m.player.yaw=m.stops[id].side*Math.PI/2;m.player.pitch=.65;m.paused=false;s.sync();return {id,start:m.player.x,side:m.stops[id].side};});
  await p.screenshot({path:path.join(OUT,'c9-path-hazard.png')});
  await p.keyboard.down('Shift');await p.keyboard.down('w');await new Promise(r=>setTimeout(r,500));await p.keyboard.up('w');await p.keyboard.up('Shift');const result=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return {x:s.model.player.x,hits:OTR.workday.events.filter(e=>e.type==='stop.hazard').length};});assert.ok((result.x-move.start)*move.side>0);assert.equal(result.hits,0);checks+=2;
  await p.keyboard.down('w');await new Promise(r=>setTimeout(r,400));await p.keyboard.up('w');assert.equal(await p.evaluate(()=>OTR.workday.events.filter(e=>e.type==='stop.hazard').length),1);checks++;
  assert.deepEqual(errors,[]);checks++;console.log(`${checks} doorstep browser checks passed`);
 }catch(e){if(p)await p.screenshot({path:path.join(OUT,'c9-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
