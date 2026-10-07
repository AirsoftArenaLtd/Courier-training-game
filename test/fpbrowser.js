#!/usr/bin/env node
/* Browser integration: real keys/scans/raycasts; position fixtures skip repetitive walking between tasks. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8302';
const LANG=process.env.QA_LANG||'en',GFX=process.env.QA_GFX||'high';
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
const qa=fs.readFileSync(path.join(__dirname,'qa.js'),'utf8');
const audit=qa.slice(qa.indexOf('function auditLayout()'),qa.indexOf('\n}\n',qa.indexOf('function auditLayout()'))+2);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let checks=0;const check=(ok,text)=>{assert.ok(ok,text);checks++;console.log('ok '+text);};
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 const errors=[],layout=[];let p;
 try{
  p=await browser.newPage();await p.setViewport({width:1280,height:720});
  p.on('pageerror',e=>errors.push(e.message));
  const ev=(fn,...args)=>p.evaluate(fn,...args);
  const state=()=>ev(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;return {area:s.area,panel:!!s.panel,transition:s.transitioning,device:s.handheld.isOpen,aiming:s.handheld.aiming,m:m&&m.snapshot()};});
  const until=fn=>p.waitForFunction(fn,{timeout:20000});
  const ready=()=>until(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);
  const press=async key=>{await p.keyboard.press(key);await wait(180);};
  const shot=async name=>{
   await wait(400);const issues=await ev(`(${audit})()`);layout.push(...issues.map(i=>({shot:name,...i})));
   // Check text inside the device screen, and visible prototype text even when it is not scroll-factor pinned.
   const extra=await ev(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),hh=s.handheld.device,items=[];
    const visit=o=>{if(!o.visible||o.alpha<=0.05)return;if(o.type==='Text'){const b=o.getBounds();if(b.x< -2||b.y< -2||b.right>1282||b.bottom>722)items.push({kind:'prototype-text-bounds',text:OTR.i18n.src(o),box:{x:b.x,y:b.y,right:b.right,bottom:b.bottom}});}if(o.list)o.list.forEach(visit);};
    (s.panel?[s.panel.root]:hh.isOpen?[hh.root]:s.children.list).forEach(visit);
    if(hh.isOpen)hh.screen.list.filter(o=>o.type==='Text').forEach(o=>{const b=o.getBounds();if(b.bottom>hh.root.y+hh.sy+hh.sh+2||b.right>hh.root.x+hh.sx+hh.sw+2)items.push({kind:'device-text-clipping',text:OTR.i18n.src(o)});});return items;});
   layout.push(...extra.map(i=>({shot:name,...i})));await p.screenshot({path:path.join(OUT,`fp-${LANG}-${GFX}-${name}.png`)});
  };
  const pose=async(x,z,id,barcode=false)=>{
   await ev((x,z,id,barcode)=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;Object.assign(m.player,{x,z});s.sync();
    const visible=o=>{for(let a=o;a;a=a.parent)if(!a.visible)return false;return true;};
    const o=barcode?s.art.parcels[Number(id.slice(6))].userData.barcode:s.art.interactions.find(o=>o.userData.interaction===id&&visible(o));if(!o)throw Error('No visible target '+id);
    const v=o.getWorldPosition(new THREE.Vector3()),eye=s.view.camera.position,dx=v.x-eye.x,dz=v.z-eye.z;
    m.player.yaw=Math.atan2(dx,-dz);m.player.pitch=Math.atan2(eye.y-v.y,Math.hypot(dx,dz));s.sync();
   },x,z,id,barcode);await wait(100);
  };
  const aimPoint=async id=>{const point=await ev(id=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return m.point(id);},id);await pose(point.x,point.z+1.5,id);};
  const scan=async()=>{await press('Tab');await press('Digit1');check((await state()).aiming,'scanner enters aiming mode');await p.keyboard.down('Space');await until(()=>!OTR.game.scene.getScene('FirstPersonScene').handheld.aiming);await p.keyboard.up('Space');await wait(180);check(!(await state()).aiming&&(await state()).device,'continuous trigger opens a scan result');};
  const open=async()=>{await p.goto(BASE+'/first-person.html?gfx='+GFX+'&lang='+LANG);await ready();await until(()=>OTR.i18n.lang===(new URLSearchParams(location.search).get('lang')||'en'));};
  await open();check(await ev(()=>!!OTR.game.scene.getScene('FirstPersonScene').view),'3D renderer starts');await shot('welcome');
  await press('Enter');await press('KeyH');await shot('hub');await press('Digit2');await wait(750);await press('Enter');
  check((await state()).m.kind==='campaign','hub starts a workday');
  // Load all three using the real pickup, scanner and shelf interactions.
  for(let i=0;i<3;i++){
   await pose(-9,4-i*3,'parcel'+i);await press('KeyE');check((await state()).m.heldId==='parcel'+i,'pick up parcel '+i);
   await scan();check((await state()).m.parcels[i].scanned,'depot barcode verified '+i);if(i===0)await shot('scan-result');await press('Digit1');
   if(i===0){await aimPoint('cargo');await press('KeyE');check((await state()).m.cargoOpen,'open physical cargo doors');}
   await pose(4,8+2.05-i*1.05+0.65,'slot'+i);await press('KeyE');check((await state()).m.parcels[i].location==='slot'+i,'place parcel in chosen shelf '+i);
  }
  await aimPoint('secure');await press('KeyE');check((await state()).m.secured,'cargo restraint secures the load');
  await shot('cargo');await pose(5.5,11.6,'cargo');await press('KeyE');check(!(await state()).m.cargoOpen,'close cargo after stepping outside');
  for(const part of ['tyres','lights']){
   if(part==='tyres')await pose(1.6,6.4,part);else await pose(4,4,part);
   await press('KeyE');await shot('inspection-'+part);const fault=await ev(()=>OTR.game.scene.getScene('FirstPersonScene').model.fault);
   await press(part===fault?'Digit2':'Digit1');
  }
  await pose(1.6,6.3,'driver');await press('KeyE');check((await state()).m.mode==='cab','enter cab through driver door');await press('KeyB');await press('KeyM');await shot('mirror');
  await press('Space');await p.keyboard.down('KeyW');await wait(1000);await press('Tab');check(!(await state()).device,'handheld refuses use while driving');await p.keyboard.up('KeyW');await p.keyboard.down('KeyS');await wait(1000);await p.keyboard.up('KeyS');
  // Drive the first leg with actual throttle/brake inputs, including the stop line.
  async function driveTo(z){
   const end=Date.now()+45000;let forward=false,brake=false;
   while(Date.now()<end){const v=(await state()).m.van,d=v.z-z;
    const stop=d<=v.speed*v.speed/10+0.6;
    const gas=!stop&&v.speed<5.5;
    if(gas!==forward){await p.keyboard[gas?'down':'up']('KeyW');forward=gas;}
    if(stop!==brake){await p.keyboard[stop?'down':'up']('KeyS');brake=stop;}
    if(stop&&Math.abs(v.speed)<0.12){await p.keyboard.up('KeyW');await p.keyboard.up('KeyS');return;}
    await wait(120);
   }throw Error('drive leg did not arrive');
  }
  await driveTo(-20);await driveTo(-42);await press('Space');await press('KeyE');check((await state()).m.mode==='walk','park and exit after a driven leg');
  for(let i=0;i<3;i++){
   if(i>0)await ev(i=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;Object.assign(m.van,{x:4,z:m.stops[i].z,yaw:0,speed:0,hand:true});m.activeStop=i;s.sync();},i);
   const vz=(await state()).m.van.z;await pose(4,vz+4,'cargo');await press('KeyE');
   check((await state()).m.cargoOpen,'open cargo at delivery '+i);
   const pz=vz+2.05-i*1.05;await pose(4,pz+1.15,'parcel'+i,true);
   await scan();check((await state()).m.parcels[i].stopScanned,'fresh delivery scan '+i);if(i===0)await shot('delivery-scan');await press('Digit1');
   await pose(4,pz+0.65,'parcel'+i);await press('KeyE');check((await state()).m.heldId==='parcel'+i,'retrieve physical parcel '+i);
   const stop=(await state()).m.stops[i];await pose(8.4,stop.z,'door'+i);await press('KeyE');await press('Digit1');await shot('contact-'+i);await press('Digit1');
   check((await state()).device,'door opens delivery on handheld');await shot('delivery-options-'+i);
   await press(stop.service==='handover'?'Digit1':stop.service==='safeplace'?'Digit2':'Digit3');check((await state()).m.stops[i].resolved,'record supported delivery outcome '+i);await shot('receipt-'+i);await press('Digit1');
   if(stop.service==='signature'){await pose(4,pz+0.65,'slot'+i);await press('KeyE');check((await state()).m.parcels[i].location==='slot'+i,'retain signature parcel in cargo');}
   await aimPoint('secure');await press('KeyE');await pose(5.5,vz+3.6,'cargo');await press('KeyE');
   if(i===0){await press('KeyH');const before=JSON.stringify((await state()).m.parcels);await p.reload();await ready();await press('Digit2');await wait(750);await press('Enter');check(JSON.stringify((await state()).m.parcels)===before,'reload resumes identical cargo and scan state');}
  }
  check((await state()).m.phase==='return','all stops lead to depot return');
  await ev(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');Object.assign(s.model.van,{x:4,z:8,yaw:0,speed:0,hand:true});s.sync();});
  await aimPoint('cargo');await press('KeyE');const ret=(await state()).m.parcels.find(p=>p.returnRequired),slot=Number(ret.location.slice(4));
  await pose(4,8+2.05-(slot%3)*1.05+0.65,ret.id);await press('KeyE');await pose(-12.2,5,'returns');await press('KeyE');
  check((await state()).aiming,'Returns opens the barcode scanner');await p.keyboard.down('Space');await until(()=>!OTR.game.scene.getScene('FirstPersonScene').handheld.aiming);await p.keyboard.up('Space');await wait(200);
  check((await state()).m.parcels[ret.stop].location==='returned','return scan checks in the held parcel');await shot('return-receipt');await press('Digit1');
  await pose(-12.1,11,'dispatch');await press('KeyE');await press('Digit1');check((await state()).m.phase==='debrief','Dispatch completes the workday');await shot('debrief');await press('Escape');await wait(750);check((await state()).area==='hub','debrief returns to hub');
  await press('KeyH');await press('Digit3');await wait(750);await press('Enter');check((await state()).m.kind==='practice','hub starts separate cargo practice');await pose(1.6,6.3,'driver');await press('KeyE');check((await state()).m.mode==='walk','cargo practice blocks driving');
  await press('Tab');await shot('practice-handheld');await press('Digit2');await shot('practice-details');await press('Tab');
  await press('KeyH');await press('Digit4');await shot('settings');
  if(LANG==='hi')check(await ev(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');let found=false;const visit=o=>{if(!o.visible)return;if(o.type==='Text'&&/[\u0900-\u097f]/.test(o.text))found=true;(o.list||[]).forEach(visit);};s.children.list.forEach(visit);return OTR.i18n.lang==='hi'&&found;}),'Hindi is active and Devanagari text is displayed');
  await p.setViewport({width:960,height:540});await shot('settings-small');await p.setViewport({width:1280,height:720});
  check(errors.length===0,'no browser page errors');check(layout.length===0,'captured interfaces pass layout checks');
  console.log(`${checks} checks passed; lang=${LANG}; gfx=${GFX}`);
 }catch(e){console.error(e.stack);if(p)await p.screenshot({path:path.join(OUT,`fp-${LANG}-${GFX}-failure.png`)}).catch(()=>{});process.exitCode=1;}
 finally{fs.writeFileSync(path.join(OUT,`fp-${LANG}-${GFX}.json`),JSON.stringify({checks,errors,layout,exit:process.exitCode||0},null,2));await browser.close();}
})();
