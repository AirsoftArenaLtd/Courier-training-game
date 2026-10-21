/* Physical richer-stop targets, real remapped keys, scanner/signature and readable layouts. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),pp=require('puppeteer-core');
const OUT=path.join(__dirname,'out/fp-review'),GFX=process.env.QA_GFX||'low',BASE=process.env.QA_BASE||'http://127.0.0.1:8339';fs.mkdirSync(OUT,{recursive:true});
const TAG=process.env.QA_TAG||'c33-'+GFX,KINDS=(process.env.QA_KINDS||'intercom,gated,reception,locker,failed,nativeintercom').split(','),SIZES=(process.env.QA_SIZES||'normal,large').split(',');
const NEGATIVE=process.env.QA_NEGATIVE==='1',LANGS=(process.env.QA_LANGS||'en,ta').split(',');
const LIVE_LOCKER=process.env.QA_LIVE_LOCKER==='1';
assert.match(TAG,/^[a-z0-9-]+$/);assert.ok(KINDS.every(k=>['intercom','gated','reception','locker','failed','nativeintercom'].includes(k)));assert.ok(SIZES.every(s=>['normal','large'].includes(s)));
assert.ok(!LIVE_LOCKER||KINDS.every(k=>k==='locker'),'The native locker probe selects only locker workflows.');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await pp.launch({executablePath:process.env.QA_BROWSER||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 const result={sourceRevision:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:path.join(__dirname,'..'),encoding:'utf8'}).trim(),quality:GFX,negative:NEGATIVE,fixture:LIVE_LOCKER?'Native later-day plans nominate one originally standard parcel before signature/ID rules, with traffic/signs/navigation and the real briefing. Travel poses are fixtures; controls, scanner, reports and restores are real.':'Legacy generated standard-service fixtures; the native later-day schedule is tested separately.',checks:0,runs:[],errors:[],completed:false,expectedRuns:LANGS.length*SIZES.length*KINDS.length};let p,recording;
 const save=()=>{const name=path.join(OUT,`${TAG}-stops.json`);fs.writeFileSync(name+'.tmp',JSON.stringify(result,null,2)+'\n');fs.renameSync(name+'.tmp',name);};save();
 try{
  p=await browser.newPage();await p.setViewport({width:1280,height:720});p.on('pageerror',e=>result.errors.push(e.message));
  const press=async key=>{const before=await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').time.now);await p.keyboard.press(key);await p.waitForFunction(before=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.time.now>before&&s.time.now>=(s.inputBlockedUntil||0);},{timeout:60000},before);};
  const audit=async()=>{
   await p.waitForFunction(()=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld.device;return !h.isOpen||Math.abs(h.root.y-h.Yopen)<1;});
   const bad=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),bad=[],d=s.handheld.device;
    const visit=o=>{if(!o.visible||o.alpha<.05)return;if(o.type==='Text'&&o.text){const r=o.getBounds(),min=s.panel?17:11,font=parseFloat(o.style.fontSize)*Math.min(o.scaleX,o.scaleY);if(r.x<-.5||r.right>1280.5||r.y<-.5||r.bottom>720.5||font<min-.1)bad.push(o.text);}
     for(const c of o.list||[])visit(c);};
    if(s.panel){visit(s.panel.root);const body=s.panel.root.list.find(o=>o.type==='Text'&&o.y===170),top=Math.min(...s.panel.buttons.map(b=>b.getBounds().top));if(body&&body.getBounds().bottom>top-8)bad.push('Panel body overlaps choices.');}
    else if(d.isOpen){visit(d.screen);const top=Math.min(...d.optionBtns.map(b=>b.getBounds().top));for(const o of d.screen.list)if(o.type==='Text'&&o.y>d.sy+44&&o.y<d.sy+d.sh-35&&o.getBounds().bottom>top-4)bad.push('Handheld body overlaps choices.');}
    else for(const {label,object} of s.labels)if(label.delivery&&object.visible&&parseFloat(object.style.fontSize)*Math.min(object.scaleX,object.scaleY)<16.9)bad.push('A projected delivery sentence shrank below readable size.');
    return bad;});assert.deepEqual(bad,[]);result.checks++;
  };
  const pick=async label=>{const index=await p.evaluate(label=>{const s=OTR.game.scene.getScene('FirstPersonScene');return (s.panel?s.panel.choices:s.handheld.device.current.options).findIndex(o=>o.label===label);},label);assert.ok(index>=0,'Missing option: '+label);await press('Digit'+(index+1));await audit();};
  const focus=async id=>{for(let i=0;i<12;i++){await press('n');if(await p.evaluate(id=>OTR.game.scene.getScene('FirstPersonScene').target==='visit'+id,id)){result.checks++;return;}}throw Error('The physical delivery target could not be selected.');};
  const controls=async id=>{await focus(id);await press('o');await audit();};
  const recover=async()=>{
   assert.equal(await p.evaluate(()=>OTR.workday.events.filter(e=>e.type.startsWith('stop.')).length),0,'An unsuccessful attempt must not report before the outcome.');
   assert.equal(await p.evaluate(()=>!!OTR.fpMission.restore(OTR.game.scene.getScene('FirstPersonScene').model.snapshot())),true,'The unsuccessful step must remain restorable.');result.checks+=2;
   await pick('Return to the delivery controls.');
  };
  const scan=async()=>{
   await press('u');await pick('Scan package');await p.keyboard.down('l');
   try{await p.waitForFunction(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.handheld.isOpen&&!s.handheld.aiming;},{timeout:60000});}finally{await p.keyboard.up('l');}
   await audit();await pick('Put away');assert.equal(await p.evaluate(()=>OTR.game.scene.getScene('FirstPersonScene').model.parcel(OTR.game.scene.getScene('FirstPersonScene').model.heldId).stopScanned),true);result.checks++;
  };
  for(const lang of LANGS){
   await p.goto(BASE+'/first-person.html?gfx='+GFX+'&lang='+lang);await p.waitForFunction(()=>window.OTR&&OTR.game&&OTR.game.scene.isActive('FirstPersonScene')&&!OTR.game.scene.getScene('FirstPersonScene').loading,{timeout:60000});
   assert.equal(await p.evaluate(()=>OTR.i18n.lang),lang,'The requested language is active.');
   await p.evaluate(()=>{window.stopSaid=[];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,pending:false,speak(u){this.speaking=true;window.stopSaid.push(u.text);setTimeout(()=>{this.speaking=false;if(u.onend)u.onend();},80);},cancel(){this.speaking=false;}}});window.SpeechSynthesisUtterance=function(text){this.text=text;};});
   for(const large of SIZES.map(size=>size==='large')){
    await p.evaluate(large=>{const s=OTR.game.scene.getScene('FirstPersonScene'),a=OTR.a11y.settings();a.large=large;a.colour=true;a.reducedMotion=true;a.narrate=true;a.keys={KeyE:'KeyO',KeyP:'KeyN',Space:'KeyL',Tab:'KeyU'};OTR.fpAccess.syncKeys();OTR.a11y.applyColour(s);s.capture=()=>{};s.releaseMouse=()=>{};s.keyboardMode=true;},large);
    for(const kind of KINDS){
     const fixture=await p.evaluate(({kind,live})=>{
      const s=OTR.game.scene.getScene('FirstPersonScene');s.handheld.close();s.closePanel();let m,id;
      for(let seed=1;seed<=100;seed++){
       let source=OTR.fpRoute.plan(3,seed);
       if(live)source=OTR.fpLater.prepare(OTR.fpStopFlow.prepare(source,true));else if(kind==='nativeintercom')source=OTR.fpLater.prepare(source);
       let plan=OTR.fpStopFlow.prepare(OTR.fpNav.prepare(OTR.fpSigns.prepare(source)));if(live)plan=OTR.fpTraffic.prepare(plan);m=OTR.fpMission.create('campaign',seed,plan);
       OTR.fpDay.configure(m);OTR.fpDriving.configure(m);OTR.fpDoors.configure(m);OTR.fpStopFlow.configure(m);
       id=m._deliverySpecs.findIndex((a,i)=>kind==='failed'?!m._doorSpecs[i].present&&m._doorSpecs[i].signature:kind==='gated'?a.gated:kind==='nativeintercom'?seed%5===0&&a.protocol&&a.protocol.kind==='intercom'&&m._doorSpecs[i].adult&&!m._doorSpecs[i].difficult:a.protocol&&a.protocol.kind===kind&&!a.gated&&!m._doorSpecs[i].difficult);if(id>=0)break;
      }
      if(id<0)throw Error('Missing generated fixture: '+kind);const stop=m.stops[id],parcel=m.parcels[id],point=OTR.fpStopFlow.point(m,id);
      Object.assign(m.van,stop.park,{speed:0,hand:true});Object.assign(m.player,{x:point.x-stop.side*1.2,z:point.z,yaw:stop.side*Math.PI/2,pitch:0});Object.assign(parcel,{location:'held',loaded:true,scanned:true});
      m.heldId=parcel.id;m.activeStop=id;m.phase='route';m.departed=true;m.mode='walk';m.paused=false;m.events[m.briefKey]=true;
      OTR.fpLater.depart(m);
      s.model=m;s.area='route';s.target=null;s.notice='';s.rebuildWorld();s.sync();OTR.workday.begin();window.stopSaid=[];
      return {id,seed:m.seed,kind,lockerStop:m.routePlan.lockerStop,nativeLater:m.routePlan.later===1,originalService:OTR.fpRoute.plan(3,m.seed).route[id].stop.packages[0].service,adult:m._doorSpecs[id].adult,signature:m._doorSpecs[id].signature,button:m._deliverySpecs[id].protocol&&m._deliverySpecs[id].protocol.button,name:m._doorSpecs[id].person,compartment:m._deliverySpecs[id].protocol&&m._deliverySpecs[id].protocol.compartment,nextDay:m._deliverySpecs[id].reattempt.nextDay};
     },{kind,live:LIVE_LOCKER});
     result.fixtureNow=fixture;const {id}=fixture;
     if(LIVE_LOCKER){
      assert.equal(fixture.lockerStop,id);assert.equal(fixture.nativeLater,true);assert.equal(fixture.originalService,'standard');assert.equal(fixture.signature,false);assert.equal(fixture.adult,false);result.checks+=5;
      await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;window.lockerBriefPose={...m.player};Object.assign(m.player,m.point('dispatch'));s.showMorningBrief();});await audit();
      assert.equal(await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');return s.panel.root.list.some(o=>o.type==='Text'&&/locker/i.test(o.srcText??o.text)&&(o.srcText??o.text).includes(s.model.stops[s.model.routePlan.lockerStop].address));}),true);result.checks++;
      await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${large?'large':'normal'}-brief.png`)});
      await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.closePanel();Object.assign(s.model.player,window.lockerBriefPose);s.sync();s.refresh();window.stopSaid=[];});
     }
     await scan();await pause(300);await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${large?'large':'normal'}-${kind}-physical.png`)});
     if(process.env.QA_CLIP==='1'&&result.runs.length===0)recording=await p.screencast({path:path.join(OUT,`${TAG}-controls.webm`),fps:15,quality:35});await controls(id);
     if(kind==='intercom'||kind==='gated'||kind==='nativeintercom'){
      if(NEGATIVE){await pick('Choose an intercom button.');await pick('Call a different entry.');await pick('I am the courier, and I have a parcel for this address.');await recover();}
      await pick('Choose an intercom button.');await pick(`Call ${fixture.button}.`);await pick('I am the courier, and I have a parcel for this address.');
      const call=await p.evaluate(id=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;return {valid:m.deliveryStops.stops[id].protocol.callValid,available:m._deliverySpecs[id].protocol.available,paused:m.paused};},id);assert.deepEqual(call,{valid:true,available:true,paused:false});result.checks++;
      await p.waitForFunction(id=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;return OTR.fpStops.ready(m.deliveryStops.stops[id].protocol,m._deliverySpecs[id].protocol,m.elapsed);},{timeout:180000},id);
      await controls(id);await pick('Unlock the entry.');
      if(kind==='gated'){
       await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene');s.model.player.yaw=s.model.stops[s.model.activeStop].side*Math.PI/2;});await p.keyboard.down('w');
       try{await p.waitForFunction(()=>{const m=OTR.game.scene.getScene('FirstPersonScene').model;return m.near('door'+m.activeStop,2.4);},{timeout:60000});}finally{await p.keyboard.up('w');}
      }
      await controls(id);await pick('Record on handheld');
      if(fixture.signature){
       await pick('Review the delivery checks.');
       if(fixture.adult){await pick('Check the required photo ID.');await pick('Accept the photo ID');}
       await pick('Capture the recipient signature.');await pick('Record '+fixture.name);
       await p.waitForFunction(id=>!!OTR.game.scene.getScene('FirstPersonScene').model.doorsteps.stops[id].signatureName,{timeout:60000},id);await audit();await pick('Back');await pick('Return to the delivery controls.');await pick('Record on handheld');
      }
      await pick('Hand the parcel to the recipient.');
     }else if(kind==='reception'){
      await pick('Greet the person and confirm the address.');if(NEGATIVE){await pick('Record an unnamed occupant.');await recover();}await pick(`Record ${fixture.name} at reception.`);await pick('Return to the street.');await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${large?'large':'normal'}-reception-resident.png`)});await controls(id);await pick('Capture the matching signature.');
      await p.waitForFunction(id=>OTR.game.scene.getScene('FirstPersonScene').model.deliveryStops.stops[id].protocol.signed,{timeout:60000},id);await audit();await pick('Hand over and record the parcel.');await pick('Hand the parcel to the recipient.');
     }else if(kind==='locker'){
      if(NEGATIVE){await pick('Open a different compartment.');await recover();}
      await pick(`Open compartment ${fixture.compartment}.`);await pick('Scan the physical parcel.');await p.keyboard.down('l');
      try{await p.waitForFunction(()=>{const h=OTR.game.scene.getScene('FirstPersonScene').handheld;return h.isOpen&&!h.aiming;},{timeout:60000});}finally{await p.keyboard.up('l');}
      await pick('Put away');await controls(id);await pick('Place the parcel inside.');
      const placed=await p.evaluate(id=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;return {carried:s.art.carried.visible,point:m.point(m.heldId),saved:!!OTR.fpMission.restore(m.snapshot())};},id);assert.equal(placed.carried,false);assert.equal(placed.saved,true);result.checks+=2;
      await pick('Return to the street.');await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${large?'large':'normal'}-locker-open.png`)});await controls(id);
      await pick('Close the locker door.');await pick('Photograph the closed locker door.');await controls(id);await pick('Record the locker delivery.');await pick('Record the locker delivery.');
     }else{
      await pick('Leave a delivery attempt card.');if(NEGATIVE){await pick('Record an unrelated reason.');await recover();}await pick('Record this retention reason.');await pick(`Book the afternoon of day ${fixture.nextDay}.`);await pick('Record the exception and keep the parcel.');await pick('Record a delivery exception.');
     }
     const event=kind==='gated'||kind==='nativeintercom'?'stop.intercom':kind==='failed'?'stop.reattempt':'stop.'+kind;
     const state=await p.evaluate(({id,event})=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model;return {resolved:m.stops[id].resolved,retained:m.parcels[id].returnRequired,events:OTR.workday.events.filter(e=>[event,'deliver.outcome'].includes(e.type)),saved:!!OTR.fpMission.restore(m.snapshot()),lost:s.sys.game.renderer.gl.isContextLost()};},{id,event});
     const speech=await p.evaluate(()=>window.stopSaid);assert.ok(speech.length>=4,'The controls must be narrated.');result.checks++;
     result.current={fixture,...state};assert.equal(state.resolved,true);assert.equal(state.saved,true);assert.equal(state.lost,false);assert.equal(state.events.filter(e=>e.type===event).length,1);assert.ok(state.events.every(e=>e.type===event?e.ok===!NEGATIVE:e.ok),'Recovery records one protocol result and preserves the correct delivery outcome.');result.checks+=5;
     await p.screenshot({path:path.join(OUT,`${TAG}-${lang}-${large?'large':'normal'}-${kind}.png`)});if(recording){await recording.stop();recording=null;}result.runs.push({lang,large,...fixture,...state,narration:speech.slice(0,6)});save();console.log('PASS '+GFX+' '+lang+' '+(large?'large ':'normal ')+kind);
    }
   }
  }
  assert.deepEqual(result.errors,[]);
 }catch(e){result.failure=e.stack;if(p){result.failureState=await p.evaluate(()=>{const s=OTR.game.scene.getScene('FirstPersonScene'),m=s.model,id=m.activeStop;return {elapsed:m.elapsed,paused:m.paused,panel:!!s.panel,handheld:s.handheld.isOpen,transitioning:s.transitioning,spec:m._deliverySpecs[id],state:m.deliveryStops.stops[id]};}).catch(()=>null);save();await p.screenshot({path:path.join(OUT,`${TAG}-failure.png`)}).catch(()=>{});}throw e;}
 finally{result.completed=!result.failure&&result.runs.length===result.expectedRuns;if(recording)await recording.stop().catch(()=>{});save();await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
