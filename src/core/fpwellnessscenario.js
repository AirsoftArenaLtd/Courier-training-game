/* Playable M8 stops. The original local evaluator and conversation callbacks own every score. */
window.OTR=window.OTR||{};
OTR.fpWellnessScenario=Object.assign(Object.create(OTR.fpScannerStopScenario),{
  configure(run,m){
    OTR.fpScannerStopScenario.configure.call(this,run,m);m.wellnessRun=run;
    OTR.fpWellnessStage.create(m);m.solids.push(...OTR.fpWellnessStage.solids(m));OTR.fpWellnessStage.bind(m);
    m.wellnessInput={careful:false};m.wellnessMotionInput={forward:false,back:false,left:false,right:false,careful:true};m.wellnessStatus=null;
  },
  panel(scene,title,body,choices,kind='controls'){
    const d=scene.model.customerStop,index=d.index,phase=d.phase,token={};
    OTR.fpCustomerScenario.panel(scene,title,body,choices.map(choice=>({...choice,action:()=>{
      if(scene.panel?.wellnessToken===token&&scene.model.customerStop===d&&d.index===index&&d.phase===phase&&scene.scenarioSession.phase==='active')choice.action();
    }})),kind,()=>scene.showPause());scene.panel.wellnessToken=token;
  },
  device(scene,page){
    const d=scene.model.customerStop,index=d.index,phase=d.phase,token={},h=scene.handheld;
    const guard=fn=>()=>{if(h.isOpen&&h.wellnessToken===token&&scene.model.customerStop===d&&d.index===index&&d.phase===phase&&scene.scenarioSession.phase==='active')fn();};
    h.show({...page,options:page.options?.map(op=>({...op,onPick:op.onPick?guard(op.onPick):op.onPick})),back:page.back?guard(page.back):page.back});h.wellnessToken=token;
  },
  signature(scene){OTR.fpCustomerStopScenario.signature.call(this,scene);scene.handheld.wellnessToken={};},
  nearPerson(scene){if(scene.model.customerStop.def.lot.interior&&!scene.model.wellnessStage.facts.interior)return false;return OTR.fpScannerStopScenario.nearPerson(scene);},
  talking(d){return !!d.talk&&d.talk.phase!=='done';},
  present(scene){scene.handheld.close(false);scene.model.customerTalk=scene.model.customerStop.talk;OTR.fpCustomerScenario.present(scene);},
  person(scene){
    const d=scene.model.customerStop;
    if(this.talking(d)){this.present(scene);return;}
    if(d.state.answered&&d.def.answer?.talk&&!d.state.talked&&OTR.fpWellnessStop.situation(d,d.def.answer.talk)){this.present(scene);return;}
    this.notice(scene,'Use the handheld to record a delivery or an exception.');
  },
  enter(scene){
    const d=scene.model.customerStop;
    if((this.talking(d)||d.wellness.acting)&&!scene.model.wellnessStage.coolTask){this.notice(scene,'Continue the safety conversation before climbing into the cab.');return;}
    OTR.fpScannerStopScenario.enter.call(this,scene);
  },
  cab(scene){const d=scene.model.customerStop;if(this.talking(d)||d.wellness.acting){scene.closePanel();return;}OTR.fpCustomerStopScenario.cab.call(this,scene);},
  exit(scene){
    if(this.talking(scene.model.customerStop)){this.notice(scene,'Continue the safety conversation before climbing out of the cab.');return;}
    OTR.fpCustomerStopScenario.exit.call(this,scene);
  },
  handheld(run,scene){
    const d=scene.model.customerStop;
    if(this.talking(d)){
      this.device(scene,{title:'Continue the safety conversation.',lines:[],options:[
        {label:'Continue the safety conversation.',onPick:()=>this.present(scene)},
        {label:'Read the safety controls.',onPick:()=>{scene.handheld.close(false);this.controls(scene);}},
        {label:'Return to the stop.',onPick:()=>scene.handheld.close()}
      ],back:()=>scene.handheld.close()});return;
    }
    if(d.photoPending||d.identity){OTR.fpScannerStopScenario.handheld.call(this,run,scene);return;}
    this.device(scene,{title:'Read the stop details.',lines:[`The stop is ${d.def.packages[0].number} ${d.def.packages[0].street}.`],options:[
      {label:'Scan the carried packages.',onPick:()=>this.scan(scene)},
      {label:'Record a delivery.',onPick:()=>this.delivery(scene)},
      {label:'Record an exception.',onPick:()=>this.exceptions(scene)},
      {label:'Open the safety controls.',onPick:()=>this.safety(scene)}
    ],back:()=>scene.handheld.close()});
  },
  conditions(d){const h=d.wellness.ref.heat;return h?`Your hydration is ${Math.round(h.hyd)}%. Your body heat indicator is ${Math.round(h.temp)} out of 100.`:'Hold the careful-walking key before stepping onto slippery or uneven ground.';},
  safety(scene){
    const d=scene.model.customerStop,heat=!!d.wellness.ref.heat;
    this.device(scene,{title:'Use the safety controls.',lines:[],options:[
      ...(heat?[{label:'Drink some water.',onPick:()=>this.water(scene)},{label:'Take a cooling break.',onPick:()=>this.rest(scene)}]:[]),
      {label:'Read the stop brief.',onPick:()=>{scene.handheld.close(false);this.brief(scene);}},
      {label:'Read your conditions and controls.',onPick:()=>{scene.handheld.close(false);this.controls(scene,heat?2:1);}}
    ],back:()=>this.handheld(scene.scenarioSession,scene)});
  },
  water(scene){
    if(OTR.fpWellnessStage.water(scene.model)){scene.handheld.close();scene.closePanel();scene.message('You are drinking water.');}
    else{scene.handheld.close(false);this.notice(scene,'Return to the parked van before drinking water, and finish any current activity first.');}
  },
  rest(scene){
    if(OTR.fpWellnessStage.rest(scene.model)){scene.handheld.close();scene.closePanel();scene.message(scene.model.mode==='cab'?'You are cooling off in the parked van.':'You are resting in the shade.');}
    else{scene.handheld.close(false);this.notice(scene,'Walk into the visible shade or climb into the parked van before taking a cooling break.');}
  },
  finishStop(scene){if(OTR.fpWellnessStop.evaluate(scene.model.customerStop)){OTR.fpScannerPhoto.clear(scene);scene.handheld.close(false);this.report(scene);}},
  report(scene,page=0){
    const d=scene.model.customerStop,lessons=OTR.fpScenario.coaching(scene.scenarioSession)?d.log.takeaways(d.def.id).map(t=>t.text):[];
    this.panel(scene,`Review stop ${d.index+1}.`,page===0?'This stop has ended.':lessons[page-1],[
      ...(page<lessons.length?[{label:'Read the next finding.',action:()=>this.report(scene,page+1)}]:[]),
      {label:d.index+1<d.content.stops.length?'Continue to the next stop.':'Finish the scenario.',action:()=>{
        OTR.fpScannerPhoto.clear(scene);if(!OTR.fpWellnessStop.next(d))return;
        if(d.phase==='done'){scene.finishScenario();return;}
        this.configure(scene.scenarioSession,scene.model);scene.rebuildWorld();scene.closePanel();scene.sync();this.brief(scene);
      }}
    ]);
  },
  controls(scene,page=0){
    const k=code=>OTR.fpAccess.key(code),d=scene.model.customerStop;
    const pages=[
      `Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to walk. Hold ${k('ShiftLeft')} to take short, careful steps. Press ${k('KeyP')} to face a nearby physical target, then ${k('KeyE')} to interact. The van stays parked.`,
      `Clear the hose and toys before carrying a package across the path. Use three points of contact when climbing in or out. Keep a closed dog gate shut until its owner has secured the dog.`,
      this.conditions(d),
      `Open the handheld with ${k('Tab')} to scan, record a delivery or exception, drink water at the van, or take a break in visible shade or the parked cab. The pause menu and handheld stop the activity timers.`,
      `When an action asks you to retreat, walk back to the van yourself. An approaching dog stays in view while you back away slowly. You can continue an interrupted safety conversation from the handheld.`,
      `A timed decision keeps counting down while you read replies or look around. The pause menu and handheld stop the clocks. Frame the actual package and doorstep before taking its delivery photo.`
    ];
    this.panel(scene,'Use the safety controls.',pages[page],[{label:'Read the next controls page.',action:()=>this.controls(scene,(page+1)%pages.length)},{label:'Return to the stop.',action:()=>scene.closePanel()}]);
  },
  photoOverlay(scene){
    if(!scene.add)return;
    if(!scene.scannerFrame){scene.scannerFrame=scene.add.graphics().setDepth(21).lineStyle(3,0xFFFFFF,1).strokeRect(OTR.W*.14,OTR.H*.14,OTR.W*.72,OTR.H*.72);scene.events.once('shutdown',()=>{OTR.fpScannerPhoto.clear(scene);scene.scannerFrame=scene.scannerCaption=null;});}
    if(scene.scannerPhotoView&&!scene.handheld.isOpen)OTR.fpScannerPhoto.hide(scene);OTR.fpScannerPhoto.overlay(scene);
  },
  status(run){
    const m=run.model,d=m.customerStop,w=d.wellness,s=m.wellnessStage,h=w.ref.heat,hyd=h?Math.round(h.hyd):-1,temp=h?Math.round(h.temp):-1,entry=d.talk?.entries||0,goal=s.coolTask||s.walkGoal;
    const cache=m.wellnessStatus;
    if(cache&&cache.version===d.version&&cache.hyd===hyd&&cache.temp===temp&&cache.entry===entry&&cache.goal===goal&&cache.acting===w.acting&&cache.animation===w.ref.me.animation&&cache.shade===s.facts.shade&&cache.interior===s.facts.interior)return cache.text;
    let text=`This is stop ${d.index+1} of ${d.content.stops.length}.`;
    if(s.coolTask)text='Walk into the visible shade or return to the parked cab before continuing.';
    else if(w.walkTask)text=w.walkTask.act==='approach'?'Walk toward the entrance to continue.':'Back away slowly toward the parked van while keeping the dog in view.';
    else if(w.acting||w.ref.stage.locked&&!w.talkLock)text='Wait for the current activity to finish.';
    else if(this.talking(d))text=`Press ${OTR.fpAccess.key('Tab')} to continue the safety conversation.`;
    else if(d.waiting!==null)text='Wait for an answer at the door.';
    else if(d.state.outcome)text='Return to the parked van with any undelivered packages.';
    else if(d.state.knocks>0&&!d.state.answered)text='Nobody has answered the door.';
    if(h)text+='\n'+this.conditions(d)+(s.facts.interior?' You are inside the clinic.':s.facts.shade?' You are in the shade.':'');
    m.wellnessStatus={version:d.version,hyd,temp,entry,goal,acting:w.acting,animation:w.ref.me.animation,shade:s.facts.shade,interior:s.facts.interior,text};return text;
  },
  targetName(scene,id){return id==='wellness-gate'?'the closed dog gate':id==='wellness-dog'?'the dog':id==='wellness-water'?'the water bottle':id.startsWith('wellness-clear-')?scene.model.customerStop.state.hazards[id.slice(15)]?.label||'the path hazard':'the safety target';}
});
const wellnessBase=OTR.fpScenario.definitions.get('customer-doorsteps');
OTR.fpScenario.register('wellness-stops',{
  ...wellnessBase,goal:'Complete the stops while managing footing, dogs and heat.',guardConversation:true,
  stage:{apply(stage,talk){stage.speaker=talk.presentation?.speaker;OTR.fpCustomerStage.target(stage);return false;}},
  setup(run,m){
    wellnessBase.setup(run,m);m.customerStop=OTR.fpWellnessStop.create(run.id,run.content,run.scenario.categories,{coaching:OTR.fpScenario.coaching(run)});OTR.fpWellnessScenario.configure(run,m);
    const originalStep=m.step;m.step=function(input,seconds){
      if(this.paused||this.wellnessRun.phase!=='active')return;this.wellnessInput.careful=!!input.careful;
      const w=this.customerStop.wellness,s=this.wellnessStage;
      if(w.ref.stage.locked&&!w.walkTask&&!s.coolTask){this.elapsed+=Math.max(0,Math.min(.05,Number(seconds)||0));this.van.speed=0;return;}
      if(w.walkTask?.keepFacing){const motion=this.wellnessMotionInput;motion.forward=!!input.forward;motion.back=!!input.back;motion.left=!!input.left;motion.right=!!input.right;this.wellnessInput.careful=true;originalStep.call(this,motion,seconds);return;}
      originalStep.call(this,input,seconds);
    };
  },
  interact(run,scene,id){
    const A=OTR.fpWellnessScenario,m=scene.model,d=m.customerStop;if(run.phase!=='active')return true;if(d.phase==='brief')OTR.fpCustomerStop.begin(d);if(d.phase!=='active')return true;
    if(d.photoMode){A.capturePhoto(scene);return true;}
    if(d.wellness.acting&&!m.wellnessStage.coolTask){scene.message('Wait for the current activity to finish, or open the pause menu.');return true;}
    if(!id||scene.art.pick()!==id){A.notice(scene,'Move close to a physical target and face it before interacting.');return true;}
    if(id==='wellness-water'){A.water(scene);return true;}
    if(m.mode==='cab'){if(id==='cab-exit')A.exit(scene);else return false;return true;}
    if(id==='wellness-gate'){if(OTR.fpWellnessStop.gate(d)){if(A.talking(d))A.present(scene);else scene.sync();}return true;}
    if(id==='wellness-dog'){if(A.talking(d))A.present(scene);else A.notice(scene,'Keep your distance from the dog and follow the stop brief.');return true;}
    if(id.startsWith('wellness-clear-')){if(OTR.fpWellnessStage.clear(m,id.slice(15))){scene.closePanel();scene.sync();scene.message('You have cleared the path hazard.');}return true;}
    if(id==='cargo'){m.cargoOpen=!m.cargoOpen;scene.sync();return true;}if(id==='driver'){A.enter(scene);return true;}
    if(id.startsWith('customer-stop-parcel-')){if(!d.photoPending)A.parcel(scene,id.slice(21));}
    else if(id==='customer-stop-door')A.door(scene);else if(id==='customer-stop-person')A.person(scene);
    else if(id==='customer-stop-number')A.notice(scene,`The building is numbered ${d.def.lot.spec.number}. The stop address is ${d.def.packages[0].number} ${d.def.packages[0].street}.`);
    else if(id==='scanner-stop-hours')A.notice(scene,`The posted business hours are ${d.def.lot.spec.hours.replace('\n',', ')}.`);return true;
  },
  conversationStage(run,scene){
    const d=scene.model.customerStop,w=d.wellness;if(!w.talkLock&&d.talk?.phase!=='done'){w.ref.stage.lock();w.talkLock=true;}
    if(!OTR.fpWellnessStop.presentation(d)){scene.closePanel();return false;}w.resume=false;return true;
  },
  conversationEnded(run,scene){OTR.fpWellnessStop.finishSituation(scene.model.customerStop);scene.closePanel();scene.sync();scene.message('Use the handheld to continue this stop.');},
  tick(run,scene,dt,active){
    const m=scene.model,d=m?.customerStop,A=OTR.fpWellnessScenario,K=OTR.fpWellnessStop;if(!d||run.phase!=='active')return;
    A.photoOverlay(scene);if(!active)return;if(d.phase==='brief')OTR.fpCustomerStop.begin(d);if(d.phase!=='active')return;
    const w=d.wellness,talk=d.talk,phase=talk?.phase,entry=talk?.entries;
    if(!scene.panel&&!scene.handheld?.isOpen&&!w.acting&&w.talkLock){w.ref.stage.unlock();w.talkLock=false;}
    if(active){
      if(!m.paused&&!scene.panel&&!scene.handheld?.isOpen)OTR.fpWellnessStage.observe(m,m.wellnessInput,dt,true);
      else K.step(d,dt,true,m.wellnessStage.facts);
      m.customerStage.time+=dt;
    }
    if(m.wellnessStage.facts.interior&&d.def.answer?.role==='reception'&&!d.state.answered){d.state.answered=true;d.version++;scene.sync();scene.message('The receptionist is available at the counter.');}
    if(w.collapsedReady){A.finishStop(scene);return;}
    if(w.pending&&!A.talking(d)&&!w.acting)K.situation(d,w.pending);
    if(d.talk&&!w.acting&&(d.talk!==talk||d.talk.phase!==phase||d.talk.entries!==entry||w.resume))A.present(scene);
    if(scene.panel?.customerKind==='reply'&&d.talk?.phase==='choices'){const second=Math.ceil(d.talk.remaining??0);if(scene.panel.customerSecond!==second){scene.panel.customerSecond=second;scene.panel.customerText?.setText(OTR.fpCustomerScenario.body(d.talk));}}
    if(w.notice&&d.coaching){const notice=w.notice;w.notice=null;scene.message(notice==='Hydration back up.'?'You have finished drinking water.':notice==='Cleared the trip hazard.'?'You have cleared the path hazard.':notice.startsWith('Cooling off')?'You are cooling off in the parked van.':notice.startsWith('Resting in')?'You are resting in the shade.':notice);}
  },
  beforeRefresh(run,scene){OTR.fpScannerPhoto.beforeRefresh(scene);},refreshOverlay(run,scene){OTR.fpScannerPhoto.overlay(scene);},
  handheld(run,scene){OTR.fpWellnessScenario.handheld(run,scene);},controls(run,scene){OTR.fpWellnessScenario.controls(scene);},status(run){return OTR.fpWellnessScenario.status(run);},
  result(run){const result=OTR.fpWellnessStop.result(run.model.customerStop);if(!result)throw Error('The wellness stop set is incomplete');return result;}
});
