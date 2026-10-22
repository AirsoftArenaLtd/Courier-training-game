/* Translated delivery choices and the independent Back control must remain usable. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const out=path.join(__dirname,'out','fp-review');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const errors=[],views=[];let page;
 try{
  page=await browser.newPage();await page.setViewport({width:1280,height:720});page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.QA_BASE||'http://127.0.0.1:8352',quality=process.env.QA_GFX||'low';
  await page.goto(base+'/first-person.html?gfx='+quality);
  await page.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);
  for(const lang of ['ta','hi','mr','bn','te','kn','ml','pa','gu','es','fr'])await page.addScriptTag({url:base+'/data/i18n/'+lang+'.js'});
  await page.evaluate(()=>{
   const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.releaseMouse=()=>{};
   window.deliveryChecksFixture=()=>{
    s.handheld.close();s.closePanel();let m,id;
    for(let seed=5;seed<100;seed+=5){m=OTR.fpMission.create('campaign',seed,OTR.fpRoute.plan(2,seed));OTR.fpDoors.configure(m);m.doorsteps.date='2026-10-15';OTR.fpDoors.configure(m,m.doorsteps);id=m._doorSpecs.findIndex(a=>a.adult&&a.present);if(id>=0)break;}
    if(id<0)throw Error('No adult-signature fixture');
    s.model=m;s.area='route';s.rebuildWorld();m.events[m.briefKey]=true;m.phase='route';m.departed=true;m.mode='walk';m.paused=true;
    const stop=m.stops[id],parcel=m.parcels[id];Object.assign(m.van,stop.park,{speed:0,hand:true});Object.assign(m.player,{x:stop.x-stop.side*1.5,z:stop.z,yaw:stop.side*Math.PI/2,pitch:0});Object.assign(parcel,{location:'held',loaded:true,scanned:true,stopScanned:true});m.heldId=parcel.id;m.activeStop=id;m.contact(id);m.doorsteps.stops[id].idViewed=true;OTR.workday.begin();s.sync();s.handheld.checks(id);return id;
   };
  });
  const langs=process.env.QA_LANGS?process.env.QA_LANGS.split(','):['en','ta','hi','mr','bn','te','kn','ml','pa','gu','es','fr'];
  for(const lang of langs)for(const large of [false,true]){
   const id=await page.evaluate(({lang,large})=>{OTR.i18n.use(lang);Object.assign(OTR.a11y.settings(),{large,reducedMotion:true,colour:true});return deliveryChecksFixture();},{lang,large});
   const layout=await page.evaluate(()=>{
    const s=OTR.game.scene.getScene('FirstPersonScene'),h=s.handheld.device;
    const back=h.screen.list.find(o=>o.type==='Text'&&o.x===h.sx+h.sw-14&&o.y===h.sy+h.sh-16);
    const choices=h.optionBtns.map(b=>{const a=b.bg.input.hitArea,m=b.bg.getWorldTransformMatrix(),top=m.transformPoint(a.x-b.bg.displayOriginX,a.y-b.bg.displayOriginY).y,bottom=m.transformPoint(a.x-b.bg.displayOriginX,a.y+a.height-b.bg.displayOriginY).y;return {top,bottom,text:b.label.text,scale:b.label.scaleY,font:parseFloat(b.label.style.fontSize)};});
    const body=h.screen.list.filter(o=>o.type==='Text'&&o!==back&&o.y>h.sy+44&&o.y<h.sy+h.sh-35).map(o=>({text:o.text,bottom:o.getBounds().bottom}));
    const seen=new Set();let bytes=0;for(const texture of Object.values(OTR.game.textures.list))for(const source of texture.source||[]){const key=source.glTexture||source;if(seen.has(key))continue;seen.add(key);const im=source.image;bytes+=(im&&(im.naturalWidth||im.width)||source.width)*(im&&(im.naturalHeight||im.height)||source.height)*4;}
    return {choices,body,back:back&&{top:back.getBounds().top,bottom:back.getBounds().bottom,text:back.text,x:back.getBounds().centerX,y:back.getBounds().centerY},screenBottom:h.root.y+h.sy+h.sh,events:OTR.workday.events.length,phaserBytes:Math.ceil(bytes*4/3)};
   });
   if(lang==='ta'&&large)await page.screenshot({path:path.join(out,(process.env.QA_TAG||'b134')+'-'+quality+'-ta-large.png')});
   assert.ok(layout.back,'Back must remain on the delivery checks page');assert.ok(layout.choices.length>=3);
   for(const choice of layout.choices){assert.ok(choice.bottom<=layout.back.top-7.99,lang+' larger='+large+': delivery choices crowd Back');assert.equal(choice.scale,1);assert.ok(choice.font>=(large?17:15));}
   for(const line of layout.body)assert.ok(line.bottom<=layout.choices[0].top-4,lang+': body overlaps choices');
   assert.ok(layout.back.bottom<=layout.screenBottom);assert.equal(layout.events,0);
   assert.ok(layout.phaserBytes<=(quality==='high'?16:4)*1024*1024,lang+': handheld exceeds the texture budget');
   // Use the actual Back hit target, then return by the keyboard route.
   await page.evaluate(()=>new Promise(resolve=>OTR.game.events.once('step',()=>resolve())));
   await page.mouse.click(layout.back.x,layout.back.y);
   await page.waitForFunction(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.device.current.title==='DELIVERY');
   assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.device.current.title),'DELIVERY');
   await page.evaluate(id=>OTR.game.scene.getScene('FirstPersonScene').handheld.checks(id),id);await page.keyboard.press('Backspace');
   await page.waitForFunction(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.device.current.title==='DELIVERY');
   assert.equal(await page.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.device.current.title),'DELIVERY');
   views.push({lang,large,...layout});console.log(lang+' larger='+large+' passes');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,(process.env.QA_TAG||'b134')+'-'+quality+'-handheld.json'),JSON.stringify({views,errors},null,2));console.log(views.length+' translated delivery layouts pass');
 }catch(e){
  if(page){await page.screenshot({path:path.join(out,'b134-handheld-failure.png')}).catch(()=>{});console.error(await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),p=s.input.activePointer,c=OTR.game.canvas.getBoundingClientRect();return {canvas:{x:c.x,y:c.y,width:c.width,height:c.height},pointer:{x:p.x,y:p.y},hits:s.input.hitTestPointer(p).map(o=>({type:o.type,text:o.text})),title:s.handheld.device.current.title};}).catch(()=>null));}
  throw e;
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
