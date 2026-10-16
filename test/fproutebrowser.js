/* Generated workday: physical raycasts/scans at all five stops; fixtures skip long walks/drives. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let checks=0;const errors=[];let p;
 try{
  p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));
  await p.goto((process.env.QA_BASE||'http://127.0.0.1:8302')+'/first-person.html?gfx=low');
  await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:30000});
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.releaseMouse=()=>{};s.closePanel();s.launch('campaign');});
  await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model&&!s.transitioning;});
  assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.stops.length),5);checks++;
  const fixture=async(id,barcode=false)=>p.evaluate((id,barcode)=>{
   const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.handheld.close();s.closePanel();m.paused=true;
   const point=m.point(id);Object.assign(m.player,{x:point.x,z:point.z});
   if(id.startsWith('parcel')&&m.parcel(id).location==='depot')m.player.x-=1.6;
   else if(id.startsWith('gate'))m.player.x-=m.stop(id.slice(4)).side*1.2;
   else if(id.startsWith('door'))m.player.x-=m.stop(id.slice(4)).side*1.5;
   else if(id==='dispatch'||id==='returns')m.player.x-=1.6;
   else if(id.startsWith('slot')||(id.startsWith('parcel')&&m.parcel(id).location.startsWith('slot'))){const d=barcode?1.15:0.65;m.player.x-=Math.sin(m.van.yaw)*d;m.player.z+=Math.cos(m.van.yaw)*d;}
   else if(id==='cargo'||id==='secure'){const d=id==='cargo'?1.25:0.65;m.player.x-=Math.sin(m.van.yaw)*d;m.player.z+=Math.cos(m.van.yaw)*d;}
   else m.player.z+=0.65;
   s.sync();const visible=o=>{for(let a=o;a;a=a.parent)if(!a.visible)return false;return true;};
   const obj=barcode?s.art.parcels[Number(id.slice(6))].userData.barcode:s.art.interactions.find(o=>o.userData.interaction===id&&visible(o));
   if(!obj)throw Error('Missing target '+id);const v=obj.getWorldPosition(new THREE.Vector3()),eye=s.view.camera.position;
   m.player.yaw=Math.atan2(v.x-eye.x,-(v.z-eye.z));m.player.pitch=Math.atan2(eye.y-v.y,Math.hypot(v.x-eye.x,v.z-eye.z));s.sync();
   const hit=barcode?s.art.scanTarget():s.aimTarget();if(hit!==id)throw Error('Occluded '+id+' by '+hit);
  },id,barcode);
  const use=async id=>{await fixture(id);await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').interact());checks++;};
  const scan=async()=>{
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.scan();s.handheld.trigger=true;});
   await p.waitForFunction(()=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld;return h.isOpen&&!h.aiming;},{timeout:15000});checks++;
   await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.close());
  };
  // Visit every manifest page before recording the final acknowledgement.
  await fixture('dispatch');
  for(let i=0;i<5;i++)await p.evaluate(i=>OTR.game.scene.getScene('FirstPersonScene').showManifest(i,i===4),i);
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.choose(0);OTR.workday.begin();});
  for(let i=0;i<5;i++){
   await use('parcel'+i);await scan();
   if(i===0)await use('cargo');
   await use('slot'+i);
   assert.equal(await p.evaluate(i=>OTR.game.scene.getScene('FirstPersonScene').model.parcels[i].zone,i),'slot'+i);checks++;
  }
  await use('secure');await use('cargo');
  await p.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;m.checks.tyres=m.checks.lights=true;m.preparation();});
  await p.addScriptTag({url:(process.env.QA_BASE||'http://127.0.0.1:8302')+'/data/i18n/ta.js'});
  for(const lang of ['en','ta'])for(const large of [false,true]){
   await p.evaluate(async({lang,large})=>{OTR.i18n.use(lang);OTR.a11y.settings().large=large;const s=OTR.game.scene.getScene('FirstPersonScene');s.showRoute();}, {lang,large});
   const issues=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),out=[];for(const o of s.panel.root.list)if(o.type==='Text'){
    const b=o.getBounds();if(b.x<100||b.right>1180||b.y<90||b.bottom>635||parseFloat(o.style.fontSize)*Math.min(o.scaleX,o.scaleY)<17)out.push(o.text);
   }return out;});assert.deepEqual(issues,[]);checks++;
   await p.screenshot({path:path.join(OUT,`c7-map-${lang}-${large?'large':'normal'}.png`)});
  }
  await p.evaluate(()=>{OTR.a11y.settings().large=false;OTR.game.scene.getScene('FirstPersonScene').closePanel();});
  for(let i=0;i<5;i++){
   await p.evaluate(i=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;Object.assign(m.van,m.stops[i].park,{speed:0,hand:true});m.activeStop=i;m.mode='walk';m.paused=true;s.sync();},i);
   await use('cargo');await fixture('parcel'+i,true);
   await scan();
   assert.equal(await p.evaluate(i=>OTR.game.scene.getScene('FirstPersonScene').model.parcels[i].stopScanned,i),false);checks++;
   await use('parcel'+i);
   if(await p.evaluate(i=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return m.doorsteps&&m._doorSpecs[i].dog;},i)){await use('gate'+i);await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').choose(0));}
   await fixture('door'+i);await scan();
   assert.equal(await p.evaluate(i=>OTR.game.scene.getScene('FirstPersonScene').model.parcels[i].stopScanned,i),true);checks++;
   const signer=await p.evaluate(i=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;m.contact(i);if(!m.doorsteps)return false;const a=m._doorSpecs[i];
    if(a.adult){s.showIdentity(i);s.choose(OTR.fpDoors.validID(m,i)?0:1);}
    if(a.difficult){s.showCustomer(i);s.choose(0);}
    const sign=a.signature&&a.present&&OTR.fpDoors.expected(m,i)==='handover';if(sign){s.handheld.signature(i);s.handheld.choose(0);}return sign;
   },i);
   if(signer)await p.waitForFunction(i=>!!OTR.game.scene.getScene('FirstPersonScene').model.doorsteps.stops[i].signatureName,{timeout:15000},i);
   await p.evaluate(i=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,choice=m.doorsteps?OTR.fpDoors.expected(m,i):m.stops[i].service==='handover'?'handover':m.stops[i].service==='safeplace'?'safeplace':'exception';s.handheld.delivery(i);s.handheld.choose(choice==='handover'?0:choice==='safeplace'?1:2);s.handheld.close();},i);
   assert.equal(await p.evaluate(i=>{const logs=OTR.game.scene.getScene('FirstPersonScene').model.logs;return logs.find(e=>e.id==='outcome:'+i)?.outcome;},i),'good');checks++;
   assert.equal(await p.evaluate(i=>OTR.game.scene.getScene('FirstPersonScene').model.stops[i].resolved,i),true);checks++;
   const retained=await p.evaluate(()=>!!OTR.game.scene.getScene('FirstPersonScene').model.heldId);
   if(retained)await use('slot'+i);
   await use('secure');await use('cargo');console.log('completed stop '+(i+1));
   if(i===1){
    await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.checkpoint();s.toHub();});
    await p.waitForFunction(()=>!OTR.game.scene.getScene('FirstPersonScene').transitioning);
    await p.reload();await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);
    await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.releaseMouse=()=>{};s.closePanel();s.launch('campaign');});
    await p.waitForFunction(()=>!OTR.game.scene.getScene('FirstPersonScene').transitioning);
    assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.stops.filter(s=>s.resolved).length),2);checks++;
   }
  }
  assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.phase),'return');checks++;
  await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');Object.assign(s.model.van,{x:2.84,z:8,yaw:0,speed:0,hand:true});s.sync();});
  await use('cargo');const returned=await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.parcels.filter(p=>p.returnRequired).map(p=>p.id));
  for(const id of returned){await use(id);await fixture('returns');await scan();}
  await fixture('dispatch');await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.showDispatch();s.choose(0);});
  assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.phase),'debrief');checks++;
  await p.screenshot({path:path.join(OUT,'c7-debrief.png')});assert.deepEqual(errors,[]);checks++;
  console.log(`${checks} full-route browser checks passed`);
 }catch(e){if(p)await p.screenshot({path:path.join(OUT,'c7-failure.png')}).catch(()=>{});throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
