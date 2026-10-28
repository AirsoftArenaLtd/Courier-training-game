/* Unloaded optional adapter. Physical actions and the device share the actual parcel/proximity kernel. */
window.OTR=window.OTR||{};
OTR.fpProblemBlockedUI={
  panel(scene,title,body,choices){
    const run=scene.scenarioSession,m=scene.model,state=m.blockedProblem.state;
    scene.showPanel(title,body,choices.map(choice=>({...choice,action:()=>{if(scene.scenarioSession===run&&scene.model===m&&state.phase==='active'&&run.phase==='active')choice.action();}})),{accessibleText:true,back:()=>scene.closePanel()});
  },
  notice(scene,body){this.panel(scene,'Read the blocked-drive information.',body,[{label:'Return to the stop.',action:()=>scene.closePanel()}]);},
  card(scene){
    const m=scene.model;if(!OTR.fpProblemBlocked.atCard(m)){this.notice(scene,'Approach the delivery-card holder at the public edge before leaving the card.');return;}
    this.panel(scene,'Leave the delivery attempt card.',m.blockedProblem.state.sequence.card?'The card is already in the holder.':'The card holder is outside the blocked driveway.',[
      {label:'Leave the card in the holder.',action:()=>{if(!OTR.fpProblemBlocked.retry(m,'card')){this.notice(scene,'Record the exception at the secured van before leaving the card.');return;}scene.closePanel();scene.sync();}},
      {label:'Return to the stop.',action:()=>scene.closePanel()}
    ]);
  },
  handheld(run,scene){
    const state=run.model.blockedProblem.state;scene.handheld.show({title:'Blocked driveway.',lines:[state.exception?`Exception ${state.exception} is recorded.`:'No exception is recorded.'],options:[
      {label:'Record an exception.',onPick:()=>{scene.handheld.close(false);this.exception(scene);}},
      {label:'Record retention and a reattempt.',onPick:()=>{scene.handheld.close(false);this.retention(scene);}},
      {label:'Finish this stop.',onPick:()=>{scene.handheld.close();this.finish(scene);}}
    ],back:()=>scene.handheld.close()});
  },
  exception(scene,page=0){
    const options=OTR_DATA.handheld.exceptions,ex=options[page%options.length];
    this.panel(scene,'Choose an exception code.',ex.desc,[
      {label:`Record exception ${ex.id}.`,action:()=>{if(!OTR.fpProblemBlocked.exception(scene.model,ex.id)){this.notice(scene,'This code does not match the access conditions, or the parcel is not secured at the legally parked van.');return;}scene.closePanel();}},
      {label:'Read the next exception code.',action:()=>this.exception(scene,page+1)},
      {label:'Return to the stop.',action:()=>scene.closePanel()}
    ]);
  },
  retention(scene,page=0){
    const m=scene.model,s=m.blockedProblem.state;if(!s.exception){this.notice(scene,'Record an exception before recording retention.');return;}
    if(!OTR.fpProblemBlocked.atVan(m)||!OTR.fpProblemBlocked.secured(m)){this.notice(scene,'Return to the legally parked van and secure the retained parcel with the cargo doors closed.');return;}
    if(s.sequence.booked){this.notice(scene,'The retention and next attempt have been recorded.');return;}
    if(s.sequence.retained){this.booking(scene);return;}
    const reasons=[['access','Access prevented delivery.'],['absent','The recipient was absent.'],['address','The address was incorrect.'],['id','The required photo ID was unavailable.'],['dispatch','Dispatch changed the delivery.']],reason=reasons[page%reasons.length];
    this.panel(scene,'Record why the parcel is retained.',reason[1],[
      {label:'Record this retention reason.',action:()=>{if(!OTR.fpProblemBlocked.retry(m,'retain',reason[0])){this.notice(scene,'The retention record is incomplete.');return;}this.booking(scene);}},
      {label:'Read the next retention reason.',action:()=>this.retention(scene,page+1)},
      {label:'Return to the stop.',action:()=>scene.closePanel()}
    ]);
  },
  booking(scene){
    const m=scene.model,s=m.blockedProblem.state,day=s.spec.nextDay;
    const book=(day,slot)=>{if(!OTR.fpProblemBlocked.retry(m,'book',{day,slot})){this.notice(scene,'The next attempt record is incomplete.');return;}scene.closePanel();};
    this.panel(scene,'Book the next delivery attempt.',`The next available attempt is day ${day} in the afternoon.`,[
      {label:`Book day ${day} in the afternoon.`,action:()=>book(day,'afternoon')},
      {label:`Book day ${day} in the morning.`,action:()=>book(day,'morning')},
      {label:'Return to the stop.',action:()=>scene.closePanel()}
    ]);
  },
  finish(scene){
    if(scene.scenarioSession.phase!=='active')return false;
    if(!OTR.fpProblemBlocked.ready(scene.model)){this.notice(scene,'Complete the exception, safe card, retained parcel and next-attempt records. Return to the legally parked van with its parcel secured and cargo doors closed.');return false;}
    scene.finishScenario();return true;
  },
  controls(run,scene,page=0){
    const k=c=>OTR.fpAccess.key(c),pages=[
      `Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to walk. Look with the mouse or ${OTR.fpAccess.lookKeys()}. Press ${k('KeyP')} to select a nearby physical target and ${k('KeyE')} to use it.`,
      'Keep the van on the public road. Read the access notice and inspect the driveway before choosing an exception. The delivery-card holder is at the safe public edge. Keep the parcel secured in the van when access prevents delivery.',
      `Press ${k('Tab')} for the exception, retention and next-attempt records. Use the physical card holder to leave a card. Close the cargo doors and return to the legally parked van before finishing with ${k('KeyF')} or the device.`
    ];this.panel(scene,'Use the blocked-drive controls.',pages[page],[{label:'Read the next controls page.',action:()=>this.controls(run,scene,(page+1)%pages.length)},{label:'Return to the stop.',action:()=>scene.closePanel()}]);
  }
};
OTR.fpScenario.register('blocked-drive',{
  piece:'street',goal:'Assess the blocked driveway and complete a safe delivery attempt with the parcel secured.',seconds:600,
  model(){return OTR.fpProblemBlocked.model();},setup(run){OTR.fpProblemBlocked.attach(run);},
  report(run,type,detail){OTR.fpProblemProtocol.observe(run.model.blockedProblem.state,type,detail);},
  controls(run,scene){OTR.fpProblemBlockedUI.controls(run,scene);},handheld(run,scene){OTR.fpProblemBlockedUI.handheld(run,scene);},
  key(run,scene,code){if(code==='KeyF'){OTR.fpProblemBlockedUI.finish(scene);return true;}if(code==='KeyJ'){OTR.fpProblemRouteUI.read(scene);return true;}return false;},
  interact(run,scene,id){
    const m=run.model,A=OTR.fpProblemBlockedUI;if(!id)return false;
    if(id==='cab-camera'&&m.van.gear!==-1){A.handheld(run,scene);return true;}
    if(id==='blocked-card'||id==='blocked-warning'||id.startsWith('door')){
      if(m.mode!=='walk'||scene.art.pick()!==id){A.notice(scene,'Move close to the physical target and face it before continuing.');return true;}
      if(id==='blocked-card')A.card(scene);
      else if(id==='blocked-warning')A.notice(scene,m.blockedProblem.state.unsafe?'The driveway is unsafe. Keep to the public path.':m.blockedProblem.state.locked?'The entry gate is locked.':'The driveway is blocked. Inspect the public approach.');
      else if(!OTR.fpProblemBlocked.reachDoor(m))A.notice(scene,'The entry cannot be reached safely. Record the access conditions from the secured van.');
      else A.notice(scene,'The accessible door has been reached. Nobody has answered.');return true;
    }
    if(id==='dispatch'||id==='returns'||id.startsWith('visit')){A.handheld(run,scene);return true;}return false;
  },
  hint(run,id,key){if(id==='blocked-card')return `Press ${key} to leave the delivery attempt card.`;if(id==='blocked-warning')return `Press ${key} to read the driveway access notice.`;if(id&&id.startsWith('parcel'))return `Press ${key} to take the parcel from its shelf.`;return null;},
  tick(run,scene){const b=run.model.blockedProblem;if(b.slipAt!==null&&!run.slipNotified){run.slipNotified=true;OTR.fpProblemBlockedUI.notice(scene,'Your footing slipped on the driveway. Return to the safe public path.');}},
  result(run,reason){return OTR.fpProblemBlocked.result(run,reason);}
});
