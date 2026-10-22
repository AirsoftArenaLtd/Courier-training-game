/* Real sign-label placement and straight-ahead cab sight lines, in native languages and text sizes. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review'),BASE=process.env.QA_BASE||'http://127.0.0.1:8339',TAG=process.env.QA_TAG||'c33-sign-layout';
const LANGS=(process.env.QA_LANGS||'en,es,fr,hi,bn,mr,te,ta,gu,kn,ml,pa').split(','),SIZES=(process.env.QA_SIZES||'normal,large').split(','),GFX=process.env.QA_GFX||'low';
assert.match(TAG,/^[a-z0-9-]+$/);assert.ok(SIZES.every(s=>s==='normal'||s==='large'));fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const report={sourceRevision:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),fixture:'Native day-four approaches and first-day guidance, live fonts and Phaser labels. Camera poses are fixtures. Reports, saves and scores are not altered.',runs:[],firstDay:[],errors:[],failures:[],completed:false};
 const save=()=>fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify(report,null,2)+'\n');save();
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>report.errors.push(e.message));
  for(const lang of LANGS)for(const size of SIZES){
   await p.goto(BASE+'/first-person.html?gfx='+GFX+'&lang='+lang);
   await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:120000});
   assert.equal(await p.evaluate(()=>OTR.i18n.lang),lang);
   await p.evaluate(large=>{
    const s=OTR.game.scene.getScene('FirstPersonScene');s.closePanel();s.handheld.close();s.releaseMouse();s.target=null;
    const a=OTR.a11y.settings();a.large=large;a.colour=true;a.reducedMotion=true;OTR.a11y.applyColour(s);
    const plan=OTR.fpDamageFlow.prepare(OTR.fpTraffic.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpLater.prepare(OTR.fpStopFlow.prepare(OTR.fpRoute.plan(4,7),true))))));
    const m=OTR.fpMission.create('campaign',7,plan);OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);OTR.fpStopFlow.configure(m);OTR.fpLoadout.configure(m,'extra');
    m.phase='route';m.departed=m.secured=m.repaired=true;m.paused=false;m.events[m.briefKey]=true;m.step=()=>{};m.mode='cab';m.player.pitch=0;
    OTR.fpLater.depart(m);for(const q of m.parcels)q.location='slot'+(q.anomaly?5:q.stop);
    Object.assign(m.van,{speed:0,hand:true,belt:true,gear:1,look:0,wipers:true});s.model=m;s.area='route';s.notice='';s.noticeUntil=0;s.rebuildWorld();
    for(const slot of s.signUI.pool)slot.text.setFontSize(OTR.a11y.size(large?22:18));s.navText.setFontSize(OTR.a11y.size(large?21:17));
    s.hint.setFontSize(OTR.a11y.size(large?22:18));
   },size==='large');
   for(const kind of ['red','amber','green','giveway','stop'])for(const back of [24,12]){
    await p.evaluate(({kind,back})=>{
     const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,T=OTR.fpTraffic,half=m.town.road/2;
     const control=T.layout(m).find(j=>j.kind===(['red','amber','green'].includes(kind)?'signal':kind));
     if(!control)throw Error('No '+kind+' junction');
     m.trafficControl.cyclist.state=m.crossing.state='waiting';m.van.look=0;m.player.pitch=0;s.art.resetCamera();
     if(kind==='giveway')Object.assign(m.van,{x:control.x+half+back,z:control.z-1.7,yaw:-Math.PI/2});
     else Object.assign(m.van,{x:control.x+1.7,z:control.z+half+back,yaw:0});
     if(['red','amber','green'].includes(kind))for(let t=0;t<T.cycle;t+=.5)if(T.aspect(T.signal(t,control.offset),0)===kind){m.elapsed=t;break;}
     s.signUI.lastAt=-1000;s.hud.navAt=-1000;s.sync();s.refresh();
     window.otrSignPoseAt=s.time.now;window.otrSignPoseFrame=s.game.loop.frame;window.otrSignProbe=()=>{
     const signal=['red','amber','green'].includes(kind),signKind=signal?'signal':kind==='giveway'?'junction-yield':'stop';
     const entry=s.art.signs.entries.find(e=>e.sign.kind===signKind&&e.sign.junction===control.index&&e.sign.approach===(kind==='giveway'?'w':'n')&&e.mainVisible);
     window.otrSignEntry=entry;
     const slots=s.signUI.pool.filter(q=>q.entry&&q.entry===entry&&q.text.visible);
     const text=slots.map(q=>{const b=q.text.getBounds();return {text:q.text.text,source:OTR.i18n.src(q.text),bounds:{x:b.x,y:b.y,right:b.right,bottom:b.bottom},font:parseFloat(q.text.style.fontSize)*q.text.scaleX};});
     const nav=s.navRoot.visible?s.navRoot.getBounds():null;let head=null;
     if(entry){const points=[];for(const x of [-.5,.5])for(const z of [-.5,-.12]){const q=new THREE.Vector3(x,0,z).applyMatrix4(entry.matrix).applyMatrix4(entry.label.parent.matrixWorld).project(s.view.camera);points.push({x:(q.x+1)*640,y:(1-q.y)*360});}
      head={x:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};}
     const covers=(a,b)=>a&&b&&a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
     const hiddenMirrors=[];for(const target of s.art.mirrors?.targets||[]){
      const {width:w=1,height:h=1}=target.geometry.parameters,points=[];
      for(const x of [-w/2,w/2])for(const y of [-h/2,h/2]){const v=new THREE.Vector3(x,y,0).applyMatrix4(target.matrixWorld).project(s.view.camera);points.push({x:(v.x+1)*640,y:(1-v.y)*360,z:v.z});}
      if(points.some(p=>p.z<-1||p.z>1))continue;
      const b={x:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};if(covers(b,nav))hiddenMirrors.push(target.name);
     }
     const hiddenGears=s.labels.filter(q=>q.label.gear&&q.object.visible&&covers(q.object.getBounds(),nav)).map(q=>q.object.text);
     const hiddenControls=[];for(const q of s.art.interactions){if(!Object.hasOwn(OTR.fpCab.gears,q.userData.interaction))continue;
      const points=[];for(const x of [-.5,.5])for(const y of [-.5,.5]){const v=new THREE.Vector3(x,y,.5).applyMatrix4(q.matrixWorld).project(s.view.camera);points.push({x:(v.x+1)*640,y:(1-v.y)*360});}
      const b={x:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
      if(b.x>=0&&b.right<=1280&&b.y>=0&&b.bottom<=720&&covers(b,nav))hiddenControls.push(q.userData.interaction);
     }
     const seen=new Set();let textureBytes=0;
     for(const texture of Object.values(OTR.game.textures.list))for(const source of texture.source||[]){
      const key=source.glTexture||source;if(seen.has(key))continue;seen.add(key);const image=source.image;
      const w=image&&(image.naturalWidth||image.videoWidth||image.width)||source.width,h=image&&(image.naturalHeight||image.videoHeight||image.height)||source.height;
      textureBytes+=w*h*4;
     }
     return {entry:!!entry,faceLettering:!!s.art.signLettering,kind,back,text,head,quality:OTR.gfx.level(),phaserBytes:Math.ceil(textureBytes*4/3),projected:entry&&s.art.labelPosition(entry.label),occupied:s.signUI.occupied,pool:s.signUI.pool.map(q=>({kind:q.entry&&q.entry.sign.kind,width:q.text.width,height:q.text.height,wrap:q.text.style.wordWrapWidth,text:q.text.text,visible:q.text.visible})),nav:nav&&{x:nav.x,y:nav.y,right:nav.right,bottom:nav.bottom},covered:!!covers(head,nav),labelCoversHead:text.some(t=>covers(head,t.bounds)),hiddenGears,hiddenControls,hiddenMirrors,look:m.van.look};};
    },{kind,back});
    await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return (s.art.signLettering?s.game.loop.frame>window.otrSignPoseFrame+2:s.signUI.lastAt>window.otrSignPoseAt)&&s.hud.navAt>window.otrSignPoseAt;},{timeout:60000});
    const proof=await p.evaluate(()=>window.otrSignProbe());
    if(proof.faceLettering&&proof.entry){
     const before=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return {snapshot:JSON.stringify(s.model.snapshot()),events:JSON.stringify(OTR.workday.events)};});let found=false;
     for(let n=0;n<24;n++){const frame=await p.evaluate(()=>OTR.game.loop.frame);await p.keyboard.press('KeyJ');await p.waitForFunction(f=>OTR.game.loop.frame>f,{},frame);found=await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').notice===window.otrSignEntry.label.text);if(found)break;}
     if(found)await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.hint.text===OTR.i18n.t(window.otrSignEntry.label.text);},{timeout:60000});
     const reading=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),r=s.hint.getBounds();return {translated:s.hint.text===OTR.i18n.t(window.otrSignEntry.label.text),text:s.hint.text,font:parseFloat(s.hint.style.fontSize)*s.hint.scaleY,bounds:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},snapshot:JSON.stringify(s.model.snapshot()),events:JSON.stringify(OTR.workday.events)};});
     const b=reading.bounds;if(!found||!reading.translated||b.x<0||b.right>1280||b.y<0||b.bottom>720||reading.font<(size==='large'?22:18)-.1||reading.snapshot!==before.snapshot||reading.events!==before.events)report.failures.push(`${lang}/${size}/${kind}/${back}: the explicit translated reading is missing, clips, shrinks or changes the mission`);
     reading.found=found;reading.unchanged=reading.snapshot===before.snapshot&&reading.events===before.events;delete reading.snapshot;delete reading.events;proof.reading=reading;
    }
    const item={lang,size,...proof};report.runs.push(item);
    if(!Number.isFinite(proof.phaserBytes)||proof.phaserBytes>(GFX==='high'?16:4)*1024*1024)report.failures.push(`${lang}/${size}/${kind}/${back}: Phaser text textures exceed the memory ceiling`);
    if(proof.quality!==GFX)report.failures.push(`${lang}/${size}/${kind}/${back}: incorrect graphics quality`);
    if(!proof.nav)report.failures.push(`${lang}/${size}/${kind}/${back}: sat nav is hidden in the forward driving view`);
    if(!proof.entry)report.failures.push(`${lang}/${size}/${kind}/${back}: physical sign is absent`);
    if(proof.entry&&!proof.faceLettering&&!proof.text.length)report.failures.push(`${lang}/${size}/${kind}/${back}: sign line is absent`);
    if(proof.faceLettering&&proof.text.length)report.failures.push(`${lang}/${size}/${kind}/${back}: an automatic floating paragraph remains`);
    if(proof.hiddenControls.length)report.failures.push(`${lang}/${size}/${kind}/${back}: sat nav covers physical selector positions ${proof.hiddenControls.join(',')}`);
    if(proof.hiddenGears.length)report.failures.push(`${lang}/${size}/${kind}/${back}: sat nav covers gear labels ${proof.hiddenGears.join(',')}`);
    if(proof.hiddenMirrors.length)report.failures.push(`${lang}/${size}/${kind}/${back}: sat nav covers a physical mirror`);
    if(proof.labelCoversHead)report.failures.push(`${lang}/${size}/${kind}/${back}: a label covers the sign head`);
    if(proof.covered)report.failures.push(`${lang}/${size}/${kind}/${back}: sat nav covers the sign head`);
    for(const t of proof.text){const b=t.bounds;if(b.x<0||b.right>1280||b.y<0||b.bottom>420||t.font<(size==='large'?22:18)-.1)report.failures.push(`${lang}/${size}/${kind}/${back}: label clips or shrinks`);}
    if(back===24&&(lang==='en'||lang==='ta'))await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${size}-${kind}.png`)});
    save();
   }
   await p.evaluate(large=>{
    const s=OTR.game.scene.getScene('FirstPersonScene'),plan=OTR.fpNav.prepare(OTR.fpSigns.prepare(OTR.fpRoute.plan(1,7))),m=OTR.fpMission.create('campaign',7,plan);
    OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);m.mode='cab';m.phase='route';m.departed=m.secured=true;m.step=()=>{};m.paused=false;m.events[m.briefKey]=true;
    Object.assign(m.van,{gear:1,belt:true,hand:true,look:0});s.model=m;s.area='route';s.notice='';s.rebuildWorld();s.hints=null;
    for(const o of [s.hint,s.controls,s.help])o.setFontSize(OTR.a11y.size(large?22:18));
   },size==='large');
   for(const gear of [1,-1])for(const look of [0,-.35,.35,.7]){
    const proof=await p.evaluate(({look,gear})=>{
     const s=OTR.game.scene.getScene('FirstPersonScene');s.model.van.look=look;s.model.van.gear=gear;s.art.resetCamera();s.sync();s.hud.navAt=-1000;OTR.fpHud.navigation(s);s.refresh();
     let nav=s.navRoot.visible?s.navRoot.getBounds():null;const overlap=(a,b)=>a&&b&&a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
     if(gear===-1&&s.art.rear.inView){const o=s.art.rear.screen,points=[];for(const x of [-.5,.5])for(const y of [-.5,.5]){const p=new THREE.Vector3(x,y,0).applyMatrix4(o.matrixWorld).project(s.view.camera);points.push({x:(p.x+1)*640,y:(1-p.y)*360});}nav={x:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};}
     return {look,gear,nav:nav&&{x:nav.x,y:nav.y,right:nav.right,bottom:nav.bottom},lines:[s.hint,s.controls,s.help].filter(o=>o.visible&&o.alpha>0).map(o=>{const r=o.getBounds();return {text:o.text,font:parseFloat(o.style.fontSize)*o.scaleY,bounds:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},covered:!!overlap(r,nav)};})};
    },{look,gear});report.firstDay.push({lang,size,...proof});
    if(look===0&&!proof.nav)report.failures.push(`${lang}/${size}/${gear}: first-day display is hidden`);
    for(const t of proof.lines){const b=t.bounds;if(t.covered||b.x<0||b.right>1280||b.y<0||b.bottom>720||t.font<(size==='large'?22:18)-.1)report.failures.push(`${lang}/${size}/${look}: first-day guidance overlaps, clips or shrinks`);}
    if(look===0&&(lang==='en'||lang==='ta'))await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${size}-first-day-${gear===1?'drive':'reverse'}.png`)});save();
   }
   console.log(lang+' '+size+': '+report.runs.length+' approaches and '+report.firstDay.length+' first-day views checked');
  }
  report.completed=true;save();
 }finally{await browser.close();}
 console.log(JSON.stringify({approaches:report.runs.length,phaserBytes:Math.max(...report.runs.map(r=>r.phaserBytes)),failures:report.failures.length,errors:report.errors}));
 if(report.failures.length||report.errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
