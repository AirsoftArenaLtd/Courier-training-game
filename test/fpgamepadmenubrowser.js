/* Focused menu resource samples. Actual navigation and remapping behavior are tested separately. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const {BUDGETS}=require('./fpquality');
const BASE=process.env.QA_BASE||'http://127.0.0.1:8399',OUT=path.join(__dirname,'out/fp-review'),TAG=process.env.QA_TAG||'b2-menu-budget',GFX=process.env.QA_GFX||'low',LANG=process.env.QA_LANG||'en',LARGE=process.env.QA_LARGE==='1';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let page;
 const report={quality:GFX,language:LANG,large:LARGE,checks:0,views:[],errors:[],scope:'Parked cab/profile and direct production-menu presentation fixtures. Three rendered frames per view; no FPS claim, full-route gate or approved new Tamil translation claim.'};
 const save=()=>fs.writeFileSync(path.join(OUT,TAG+'.json'),JSON.stringify(report,null,2));const equal=(a,b)=>{assert.deepEqual(a,b);report.checks++;};
 try{
  page=await browser.newPage();await page.setViewport({width:1280,height:720});await page.bringToFront();page.on('pageerror',e=>{report.errors.push(e.message);save();});
  await page.evaluateOnNewDocument(()=>localStorage.clear());await page.goto(BASE+'/first-person.html?gfx='+GFX+'&lang='+LANG,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.OTR?.game?.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:180000});
  if(LANG==='ta')await page.addScriptTag({url:BASE+'/data/i18n/ta.js'});
  await page.evaluate(({lang,large})=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.keyboardMode=true;s.capture=()=>{};s.closePanel();OTR.i18n.use(lang);Object.assign(OTR.a11y.settings(),{large,reducedMotion:true});s.progress.sequence=9;s.progress.campaign=null;s.launch('campaign');},{lang:LANG,large:LARGE});
  await page.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.model?.kind==='campaign'&&!s.transitioning;},{timeout:180000});
  await page.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;s.closePanel();m.mode='cab';m.phase='route';Object.assign(m.van,{x:2.84,z:-18,yaw:0,speed:0,gear:2,hand:true,belt:true,look:0});m.player.pitch=0;s.sync();s.refresh();});
  const views=[...Array.from({length:8},(_,page)=>({kind:'bindings',page})),...Array.from({length:5},(_,page)=>({kind:'guide',page})),{kind:'deadzone'},{kind:'capture'},{kind:'edit'}];
  for(const view of views){
   await page.evaluate(({kind,page})=>{const s=OTR.game.scene.getScene('FirstPersonScene'),ui=OTR.fpGamepadUI,back=()=>ui.open(s);if(kind==='bindings')ui.bindings(s,page,back);else if(kind==='guide')ui.open(s,page,back);else if(kind==='deadzone')ui.deadzone(s,back);else if(kind==='capture')ui.capture(s,'buttons','gear',back);else ui.edit(s,'buttons','gear','Change gear',back);},view);
   const sample=await page.evaluate(()=>new Promise(resolve=>{
    const s=OTR.game.scene.getScene('FirstPersonScene'),peak={calls:0,triangles:0,textures:0,attachmentBytes:0,phaserBytes:0};let frames=0;
    const observe=()=>{
     for(const key of ['calls','triangles','textures','attachmentBytes'])peak[key]=Math.max(peak[key],s.view.diagnostics[key]);
     const seen=new Set();let bytes=0;
     for(const texture of Object.values(OTR.game.textures.list))for(const source of texture.source||[]){const key=source.glTexture||source;if(seen.has(key))continue;seen.add(key);const image=source.image,w=image&&(image.naturalWidth||image.videoWidth||image.width)||source.width,h=image&&(image.naturalHeight||image.videoHeight||image.height)||source.height;bytes+=w*h*4;}
     peak.phaserBytes=Math.max(peak.phaserBytes,Math.ceil(bytes*4/3));
     if(++frames===3){OTR.game.events.off('postrender',observe);resolve({frames,peak});}
    };OTR.game.events.on('postrender',observe);
   }));
   const budget=BUDGETS[GFX];
   for(const [key,limit] of Object.entries(budget)){assert.ok(Number.isFinite(sample.peak[key])&&sample.peak[key]>0&&sample.peak[key]<=limit,JSON.stringify({view,key,sample,limit}));report.checks++;}
   report.views.push({...view,...sample});save();
  }
  equal(report.errors,[]);report.complete=true;save();console.log(report.checks+' menu resource checks passed.');
 }catch(error){report.failure=error.stack;if(page)await page.screenshot({path:path.join(OUT,TAG+'-failure.png')}).catch(()=>{});save();throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
