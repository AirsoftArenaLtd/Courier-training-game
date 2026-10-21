/* Real remapped keyboard targets, handheld descriptions, checkpoints and report boundaries.
 * Travel, completed deliveries and seven-zone contacts are fixtures; this is not a full driven day. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review'),BASE=process.env.QA_BASE||'http://127.0.0.1:8345',GFX=process.env.QA_GFX||'low',TAG=process.env.QA_TAG||'c35-'+GFX;fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const b=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const r={quality:GFX,checks:0,runs:[],errors:[],complete:false,scope:'Fixture travel/return/contact poses; real P/E selection, handheld keys, records, scoring, checkpoints and guide pages. New English falls back until Claude translates.'};let p;
 const save=()=>fs.writeFileSync(path.join(OUT,TAG+'-walkaround.json'),JSON.stringify(r,null,2)+'\n');save();
 try{
  p=await b.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>r.errors.push(e.message));
  const press=async key=>{await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.time.now>=(s.inputBlockedUntil||0);},{timeout:60000});const f=await p.evaluate(()=>OTR.game.loop.frame);await p.keyboard.press(key);await p.waitForFunction(f=>OTR.game.loop.frame>f+1,{timeout:60000},f);};
  const pick=async label=>{const index=await p.evaluate(label=>{const s=OTR.game.scene.getScene('FirstPersonScene'),options=s.panel?s.panel.choices:s.handheld.device.current.options;return options.findIndex(o=>o.label===label&&!o.disabled);},label);assert.ok(index>=0,'Missing choice: '+label);await press('Digit'+(index+1));r.checks++;};
  const audit=async()=>{
   const a=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),d=s.handheld.device,bad=[];
    const visit=o=>{if(!o.visible||o.alpha<=.01)return;if(o.type==='Text'&&o.text){const b=o.getBounds(),font=parseFloat(o.style.fontSize)*Math.min(o.scaleX,o.scaleY);if(b.x<0||b.right>1281||b.y<0||b.bottom>721||font<(s.panel?18.9:12.9))bad.push(o.text+' ['+font+']');if(d.isOpen&&(b.x<d.root.x+d.sx-1||b.right>d.root.x+d.sx+d.sw+1||b.bottom>d.root.y+d.sy+d.sh+1))bad.push('Outside handheld: '+o.text);}for(const child of o.list||[])visit(child);};
    if(s.panel){visit(s.panel.root);const body=s.panel.root.list.find(o=>o.type==='Text'&&o.y===170),top=Math.min(...s.panel.buttons.map(b=>b.getBounds().top));if(body.getBounds().bottom>top-8)bad.push('Panel body overlaps choices.');}
    else if(d.isOpen){visit(d.screen);const top=Math.min(...d.optionBtns.map(b=>{const bg=b.bg,a=bg.input.hitArea;return bg.getWorldTransformMatrix().transformPoint(a.x-bg.displayOriginX,a.y-bg.displayOriginY).y;}));for(const o of d.screen.list)if(o.type==='Text'&&o.y>d.sy+44&&o.y<d.sy+d.sh-35&&o.getBounds().bottom>top-4)bad.push('Body overlaps choices: '+o.text);}
    let bytes=0;const seen=new Set();for(const t of Object.values(OTR.game.textures.list))for(const source of t.source||[]){const key=source.glTexture||source;if(seen.has(key))continue;seen.add(key);const i=source.image;bytes+=(i&&(i.naturalWidth||i.videoWidth||i.width)||source.width)*(i&&(i.naturalHeight||i.videoHeight||i.height)||source.height)*4;}
    return {bad,phaserBytes:Math.ceil(bytes*4/3),contextLost:OTR.game.renderer.gl.isContextLost()};});assert.deepEqual(a.bad,[]);assert.equal(a.contextLost,false);assert.ok(a.phaserBytes<=(GFX==='low'?4194304:16777216),JSON.stringify(a));r.checks+=3;return a;
  };
  const aim=async zone=>{
   await p.evaluate(zone=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,t=OTR.fpWalkaroundFlow.target(zone);s.handheld.close(false);m.paused=true;m.cargoOpen=false;m.heldId=null;
    const x=t.x+(zone==='right'?.85:['front','rear'].includes(zone)?0:-.85),z=t.z+(zone==='front'?-.85:zone==='rear'?.85:0);Object.assign(m.player,OTR.fp.local(m.van,x,z));s.target=null;s.sync();s.refresh();},zone);
   for(let n=0;n<24;n++){await press('n');if(await p.evaluate(zone=>OTR.game.scene.getScene('FirstPersonScene').target==='wear-'+zone,zone))break;}
   assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').aimTarget()),'wear-'+zone);r.checks++;
  };
  const record=async(zone,level)=>{await aim(zone);await press('o');assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').handheld.isOpen),true);r.checks++;await audit();if(level>=2){await pick('See more descriptions.');await audit();}const label=await p.evaluate(level=>OTR.fpWalkaround.descriptions[level],level);await pick(label);await audit();};
  const checkpoint=async()=>{assert.equal(await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,raw=m.snapshot(),events=JSON.stringify(OTR.workday.events),store=OTR.fpStore.empty();store.sequence=m.seed;store.campaign=raw;
   if(!OTR.fpStore.write(store))return false;const read=OTR.fpMission.restore(OTR.fpStore.read().campaign);if(!read||JSON.stringify(read.snapshot())!==JSON.stringify(raw)||JSON.stringify(OTR.workday.events)!==events)return false;
   s.handheld.close(false);s.model=read;s.model.paused=true;s.sync();return true;}),true);r.checks++;};
  for(const lang of (process.env.QA_LANGS||'en,ta').split(','))for(const size of (process.env.QA_SIZES||'normal,large').split(',')){
   await p.goto(BASE+'/first-person.html?gfx='+GFX+'&lang='+lang);await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:60000});
   await p.evaluate(large=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.capture=()=>{};s.releaseMouse=()=>{};s.keyboardMode=true;s.closePanel();Object.assign(OTR.a11y.settings(),{large,colour:true,reducedMotion:true,narrate:true,keys:{KeyP:'KeyN',KeyE:'KeyO'}});OTR.fpAccess.syncKeys();
    window.walkSaid=[];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,pending:false,speak(u){walkSaid.push(u.text);},cancel(){}}});window.SpeechSynthesisUtterance=function(text){this.text=text;};
    s.progress.guidance={intro:true,seen:[]};OTR.save.data.route.days=3;s.progress.sequence=7;s.progress.campaign=null;s.launch('campaign');s.closePanel();s.model.paused=true;OTR.workday.begin();s.notice='';s.sync();s.refresh();},size==='large');
   assert.deepEqual(await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return {marker:s.model.routePlan.walkaround,targets:s.art.walkaroundTargets.length,phaser:s.art.walkaroundTargets.every(o=>o.layers.mask===2)};}),{marker:1,targets:7,phaser:true});r.checks++;
   let peak=0;const run={lang,size,pre:[],post:[],guide:[]};r.runs.push(run);save();
   for(const zone of ['front','rear','left','right','roof','wheel','mirror']){
    const level=await p.evaluate(zone=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return m.damage.baseline[OTR.fpWalkaround.zones.indexOf(zone)];},zone);await record(zone,level);peak=Math.max(peak,(await audit()).phaserBytes);await checkpoint();run.pre.push(zone);save();
    if(['roof','wheel'].includes(zone))await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${size}-pre-${zone}.png`)});
   }
   const depart=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;m.mode='cab';m.paused=false;m.secured=true;Object.assign(m.van,{speed:2,hand:false,belt:true});m.step({},.0125);m.van.speed=0;m.van.hand=true;m.mode='walk';m.paused=true;
    m.stops.forEach(t=>{t.resolved=true;t.outcome='handover';OTR.fpLater.arrive(m,t.id);});m.parcels.forEach(p=>p.location='delivered');m.phase='return';return {departed:m.walkaround.departed,pre:OTR.workday.events.filter(e=>e.type==='inspect.damage')};});assert.equal(depart.departed,true);assert.equal(depart.pre.length,1);assert.equal(depart.pre[0].ok,true);r.checks+=3;
   // A wrong clear-zone description is a real selectable decision and cannot repeat after a checkpoint.
   await record('front',2);await checkpoint();await record('front',3);assert.equal(await p.evaluate(()=>OTR.workday.events.filter(e=>e.type==='trip.damage-false').length),1);r.checks++;
   await p.evaluate(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;OTR.fpDamage.zones.forEach((zone,i)=>{OTR.fpDamage.release(m.damage);OTR.fpDamageFlow.fire(m,OTR.fpDamage.contact(m.damage,zone,'solid',[.5,3,8][i%3]),3);});});
   for(const [i,zone] of ['front','rear','left','right','roof','wheel','mirror'].entries()){
    const level=await p.evaluate(zone=>OTR.fpDamage.level(OTR.game.scene.getScene('FirstPersonScene').model.damage,zone),zone);await record(zone,level);peak=Math.max(peak,(await audit()).phaserBytes);await checkpoint();run.post.push(zone);save();
    if(['rear','roof','mirror'].includes(zone))await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${size}-post-${zone}.png`)});
   }
   await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.workday();});await pick('Review the walkaround.');await audit();
   for(let i=0;i<6;i++){await pick('See the next area.');await audit();}await pick('Put away the handheld.');
   const guideCount=11;for(let page=0;page<guideCount;page++){await p.evaluate(page=>{const s=OTR.game.scene.getScene('FirstPersonScene');OTR.fpGuide.steps(s,page,()=>s.closePanel());},page);const a=await audit();peak=Math.max(peak,a.phaserBytes);run.guide.push(page);if(page===8)await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${size}-guide-report.png`)});}
   await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').closePanel());
   const done=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;Object.assign(m.player,m.point('dispatch'));const text=m.finish(),count=OTR.workday.events.length;m.finish();return {text,count,after:OTR.workday.events.length,reports:OTR.workday.events.filter(e=>e.type==='trip.damage-report'),said:walkSaid.length,valid:!!OTR.fpMission.restore(m.snapshot())};});
   assert.equal(done.text,'');assert.equal(done.count,done.after);assert.equal(done.reports.length,7);assert.ok(done.reports.every(e=>e.ok));assert.ok(done.said>20);assert.equal(done.valid,true);r.checks+=6;run.peakPhaserBytes=peak;run.reports=done.reports;run.narrationCalls=done.said;save();
   // The same finish path grades an unreported caused zone as critical in a fresh mission fixture.
   const missed=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),old=s.model,m=OTR.fpMission.create('campaign',old.seed,old.routePlan);OTR.fpDay.configure(m);OTR.fpDoors.configure(m);OTR.workday.begin();m.preparation();OTR.fpDamageFlow.fire(m,OTR.fpDamage.contact(m.damage,'front','solid',3),3);m.stops.forEach(t=>{t.resolved=true;t.outcome='handover';OTR.fpLater.arrive(m,t.id);});m.parcels.forEach(p=>p.location='delivered');m.phase='return';Object.assign(m.player,m.point('dispatch'));return {text:m.finish(),reports:OTR.workday.events.filter(e=>e.type==='trip.damage-report'),critical:OTR.workday.log.criticals().some(e=>e.type==='trip.damage-report')};});assert.equal(missed.text,'');assert.equal(missed.reports.length,1);assert.equal(missed.reports[0].ok,false);assert.equal(missed.critical,true);r.checks+=4;run.missed=missed;save();console.log(lang+' '+size+' passed '+r.checks+' checks; '+peak+' Phaser bytes');
  }
  assert.deepEqual(r.errors,[]);r.complete=true;save();console.log(r.checks+' walkaround browser checks passed');
 }catch(e){r.failure=e.stack;save();if(p)await p.screenshot({path:path.join(OUT,TAG+'-failure.png')}).catch(()=>{});throw e;}finally{await b.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
