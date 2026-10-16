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
     id=m._doorSpecs.findIndex(a=>kind==='adult'?a.adult&&seed%5===variant:kind==='signature'?a.signature&&a.present&&!a.adult&&!a.dog&&!a.wrong:kind==='dog'?a.dog:kind==='wrong'?a.wrong:kind==='customer'?a.difficult&&!a.adult&&!a.dog&&!a.wrong:kind==='clearable'?!a.dog&&(a.hazard==='hose'||a.hazard==='toys'):a.hazard==='wet'||a.hazard==='ice');if(id>=0)break;
    }if(id<0)throw Error('No fixture '+kind);s.model=m;s.area='route';s.rebuildWorld();m.events[m.briefKey]=true;m.phase='route';m.departed=true;m.mode='walk';m.paused=true;const stop=m.stops[id],parcel=m.parcels[id];Object.assign(m.van,stop.park,{speed:0,hand:true});Object.assign(m.player,{x:stop.x-stop.side*1.5,z:stop.z,yaw:stop.side*Math.PI/2,pitch:0});Object.assign(parcel,{location:'held',loaded:true,scanned:true,stopScanned:true});m.heldId=parcel.id;m.activeStop=id;m.contact(id);OTR.workday.begin();s.notice='';s.sync();s.refresh();return id;
   };
  });
  const audit=async()=>{
   await p.waitForFunction(()=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld.device;return !h.isOpen||Math.abs(h.root.y-h.Yopen)<1;});
   const bad=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),h=s.handheld.device,out=[];const visit=o=>{if(!o.visible||o.alpha<=.05)return;if(o.type==='Text'){const r=o.getBounds(),font=parseFloat(o.style.fontSize)*Math.min(o.scaleX,o.scaleY);if(r.x<0||r.right>1281||r.y<0||r.bottom>721||font<(s.panel?17:11))out.push(o.text);if(h.isOpen&&s.panel===null&&(r.x<h.root.x+h.sx-1||r.right>h.root.x+h.sx+h.sw+1||r.bottom>h.root.y+h.sy+h.sh+1))out.push('device '+o.text);}for(const child of o.list||[])visit(child);};
    if(s.panel){visit(s.panel.root);const body=s.panel.root.list.find(o=>o.type==='Text'&&o.y===170),top=Math.min(...s.panel.buttons.map(b=>b.getBounds().top));if(body&&body.getBounds().bottom>top-8)out.push('body overlaps panel choices');}
    else if(h.isOpen){visit(h.screen);const top=Math.min(...h.optionBtns.map(b=>{const bg=b.bg,a=bg.input.hitArea;return bg.getWorldTransformMatrix().transformPoint(a.x-bg.displayOriginX,a.y-bg.displayOriginY).y;}));for(const o of h.screen.list)if(o.type==='Text'&&o.y>h.sy+44&&o.y<h.sy+h.sh-35&&o.getBounds().bottom>top-4)out.push('body overlaps handheld choices');}return out;});assert.deepEqual(bad,[]);checks++;
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
  // Seeded situation fixtures skip travel and load-out. Verification, contact, menus and outcomes below use real keys.
  const uiRuns=[],wait=ms=>new Promise(r=>setTimeout(r,ms));let uiLang,uiLarge;
  const press=async key=>{await p.keyboard.press(key);await wait(200);};
  const pick=async label=>{
   const option=await p.evaluate(label=>{const s=OTR.game.scene.getScene('FirstPersonScene'),options=s.panel?s.panel.choices:s.handheld.isOpen?s.handheld.device.current.options:[];return options.findIndex(o=>o.label===label&&!o.disabled);},label);
   assert.ok(option>=0,'Missing visible option: '+label);await press('Digit'+(option+1));await audit();
  };
  const aim=async id=>{
   await p.evaluate(id=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.sync();const o=s.art.interactions.find(o=>o.userData.interaction===id),target=o.getWorldPosition(new THREE.Vector3()),eye=s.view.camera.position;
    m.player.yaw=Math.atan2(target.x-eye.x,-(target.z-eye.z));m.player.pitch=Math.atan2(eye.y-target.y,Math.hypot(target.x-eye.x,target.z-eye.z));s.sync();if(s.aimTarget()!==id)throw Error('Occluded real UI target '+id);
   },id);
  };
  const enterDelivery=async(kind,variant=0)=>{
   const id=await p.evaluate(({kind,variant})=>{const id=doorFixture(kind,variant),s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;m.stops[id].contacted=false;m.parcels[id].stopScanned=false;OTR.fpDoors.sync(m);s.sync();return id;},{kind,variant});
   await aim('door'+id);await press('Tab');await pick('Scan package');assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.aiming),true);checks++;
   await p.keyboard.down('Space');try{await p.waitForFunction(()=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld;return h.isOpen&&!h.aiming;},{timeout:15000});}finally{await p.keyboard.up('Space');}
   await audit();assert.equal(await p.evaluate(id=>OTR.game.scene.getScene('FirstPersonScene').model.parcels[id].stopScanned,id),true);checks++;
   if(kind==='wrong'){assert.match(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.device.current.lines.join(' ')),/does not match/);checks++;}
   await pick('Put away');await aim('door'+id);await press('e');await pick('Knock / ring');await pick('Record on handheld');return id;
  };
  const signThroughUI=async()=>{
   await pick('Capture the signature');const name=await p.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return m._doorSpecs[m.activeStop].person;});await pick('Record '+name);
   await p.waitForFunction(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return !!m.doorsteps.stops[m.activeStop].signatureName;},{timeout:15000});await audit();await pick('Back');
  };
  const evidence=async(kind,id,variant)=>{
   const result=await p.evaluate(id=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return {seed:m.seed,stop:id+1,outcome:m.stops[id].outcome,retained:m.parcels[id].returnRequired,hazardCleared:m.doorsteps.stops[id].hazardCleared,saved:!!OTR.fpMission.restore(m.snapshot()),events:OTR.workday.events.map(e=>({type:e.type,ok:e.ok,stop:e.stop}))};},id);
   assert.equal(result.saved,true);for(const event of result.events)if(['deliver.outcome','stop.age-check','stop.wrong-address','stop.difficult'].includes(event.type))assert.equal(event.ok,true,kind+': '+event.type);
   uiRuns.push({kind,variant,lang:uiLang,large:uiLarge,...result});checks++;
  };
  for(const [lang,large] of [['en',false],['ta',true]]){
   uiLang=lang;uiLarge=large;
   await p.evaluate(({lang,large})=>{OTR.i18n.use(lang);OTR.a11y.settings().large=large;},{lang,large});
   for(let variant=0;variant<5;variant++){
    const id=await enterDelivery('adult',variant);await pick('Delivery checks');await pick('Check the photo ID');await audit();
    await pick(variant===0?'Accept the photo ID':'Decline the photo ID and retain the parcel');if(variant===0)await signThroughUI();
    await pick('Record the delivery outcome');await pick(variant===0?'Hand to resident':'Record a delivery exception');await evidence('adult',id,variant);
   }
   let id=await enterDelivery('wrong');await pick('Record a delivery exception');await evidence('wrong',id);
   assert.equal(await p.evaluate(id=>OTR.game.scene.getScene('FirstPersonScene').model.parcels[id].returnRequired,id),true);checks++;
   id=await enterDelivery('customer');await pick('Delivery checks');await pick('Speak with the customer');await pick('Acknowledge the problem and offer a clear next step');
   if(await p.evaluate(id=>OTR.game.scene.getScene('FirstPersonScene').model._doorSpecs[id].signature,id))await signThroughUI();
   await pick('Record the delivery outcome');await pick('Hand to resident');await evidence('customer',id);
   id=await p.evaluate(()=>{const id=doorFixture('clearable'),s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,stop=m.stops[id];m.heldId=null;m.parcels[id].location='slot'+id;Object.assign(m.player,{x:stop.x-stop.side*2.5,z:stop.z});s.sync();return id;});
   await aim('hazard'+id);await press('e');assert.equal(await p.evaluate(id=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model.doorsteps.stops[id].hazardCleared&&!s.art.hazards[id].visible;},id),true);checks++;
   await evidence('clearable',id);await p.screenshot({path:path.join(OUT,`c9-ui-cleared-${lang}.png`)});
  }
  assert.deepEqual([...new Set(uiRuns.filter(r=>r.kind==='adult').map(r=>r.variant))],[0,1,2,3,4]);checks++;
  assert.deepEqual(errors,[]);checks++;
  fs.writeFileSync(path.join(OUT,'c9-seeded-ui.json'),JSON.stringify({checks,uiRuns},null,2));
  console.log(`${checks} doorstep browser checks passed`);
 }catch(e){if(p)await p.screenshot({path:path.join(OUT,'c9-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
