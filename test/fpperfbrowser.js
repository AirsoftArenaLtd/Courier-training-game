/* Compare frozen frames with an untouched pilot served at QA_BEFORE_BASE. No image library needed. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out','fp-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const rows=[],errors=[];
 try{const p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>errors.push(e.message));
 for(const quality of ['low','high'])for(const view of ['depot','mirror','door','parcel']){
  const frames=[];for(const base of [process.env.QA_BEFORE_BASE||'http://127.0.0.1:8406',process.env.QA_BASE||'http://127.0.0.1:8302']){
   await p.goto(base+'/first-person.html?gfx='+quality);await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading);
   const resource=await p.evaluate(view=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.keyboardMode=true;s.closePanel();const m=OTR.fpMission.create('campaign',17,OTR.fpRoute.plan(4,17));OTR.fpLoadout.configure(m,'extra');OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);m.stops.forEach(stop=>stop.contacted=true);OTR.fpDoors.sync(m);s.model=m;s.area='campaign';s.rebuildWorld();m.elapsed=12;m.step=()=>{};m.paused=false;m.phase='route';m.departed=true;m.events[m.briefKey]=true;m.cargoOpen=true;
    Object.assign(m.van,m.stops[0].park,{speed:0,hand:true,belt:true});Object.assign(m.player,{x:m.van.x-4,z:m.van.z+4,yaw:-Math.PI/4,pitch:0});m.mode='walk';
    if(view==='mirror'){m.mode='cab';m.mirrorAt=m.elapsed;for(const [name,z] of [['bus',-18],['siren',14]]){const point=OTR.fp.local(m.van,0,z);Object.assign(m.driving[name],{state:name==='bus'?'flashing':'passing',x:point.x,z:point.z,yaw:m.van.yaw});}OTR.fpDriving.syncActors(m);}
    if(view==='door'){const stop=m.stops.find(stop=>m._doorSpecs[stop.id].dog)||m.stops[0];m.activeStop=stop.id;Object.assign(m.van,stop.park,{speed:0,hand:true});Object.assign(m.player,{x:stop.x-stop.side*3.8,z:stop.z,yaw:stop.side*Math.PI/2,pitch:.1});}
    s.progress.guidance={intro:false,seen:[]};s.notice='';s.noticeUntil=0;s.lastAim=-1000;s.sync();if(view==='parcel'){m.parcels[0].location='held';m.heldId='parcel0';s.handheld.scan();}s.sync();s.refresh();return {quality:OTR.gfx.level()};},view);
   await new Promise(r=>setTimeout(r,1600));frames.push({png:await p.screenshot(),resource});
  }
  const difference=await p.evaluate(async encoded=>{const read=async data=>{const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};const [a,b]=await Promise.all(encoded.map(read));let pixels=0,maxChannel=0;for(let i=0;i<a.length;i+=4){let d=0;for(let ch=0;ch<3;ch++)d=Math.max(d,Math.abs(a[i+ch]-b[i+ch]));maxChannel=Math.max(maxChannel,d);if(d>2)pixels++;}return {pixels,maxChannel,fraction:pixels/(1280*720)};},frames.map(f=>f.png.toString('base64')));
  for(let i=0;i<2;i++)fs.writeFileSync(path.join(OUT,`c16-${quality}-${view}-${i?'after':'before'}.png`),frames[i].png);
  rows.push({quality,view,...difference});console.log(JSON.stringify(rows.at(-1)));assert.ok(difference.fraction<.0001,`${quality} ${view} changed ${difference.pixels} pixels`);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'c16-pixels.json'),JSON.stringify({rows,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
