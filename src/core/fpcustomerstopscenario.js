/* Physical Tricky Doorsteps adapter. Existing stop data and shared local-log evaluators remain authoritative. */
window.OTR=window.OTR||{};
OTR.fpCustomerStopScenario={
  labels:{recipient:'Hand the package to the recipient.',adult:'Hand the package to an adult at the address.',reception:'Record a reception or mailroom handover.',left:'Leave the package at the location and take a photo.',neighbor:'Hand the package to a neighbor.'},
  configure(run,m){
    const d=m.customerStop,answer=d.def.answer,key=answer?.talk||'stranger',person=answer||d.def.stranger,cast={[key]:{name:person?.name||'The resident',portrait:person?.spec||{}}};
    m.customerTalk=null;m.customerStage=OTR.fpCustomerStage.create({cast});for(const a of m.customerStage.actors){a.x=12.05;a.z=-44.6;a.visible=false;}
    m.solids=[{x:12,z:-47,w:7,d:4},{x:6.2,z:-43.3,w:1.6,d:.15},...m.customerStage.actors.map(a=>a.solid)];OTR.fpCustomerStage.target(m.customerStage);
    Object.assign(m.van,{x:1.7,z:-42,yaw:0,speed:0,gear:2,hand:true,belt:false,look:0});m.mode='cab';m.cargoOpen=false;Object.assign(m.player,{x:-.1,z:-43.7,yaw:0,pitch:0});d.photoPending=false;d.photoMode=false;d.photo=null;d.actorEntry=-1;
  },
  panel(scene,title,body,choices,kind='controls'){
    const d=scene.model.customerStop,index=d.index,phase=d.phase;OTR.fpCustomerScenario.panel(scene,title,body,choices.map(ch=>({...ch,action:()=>{if(scene.model.customerStop===d&&d.index===index&&d.phase===phase&&scene.scenarioSession.phase==='active')ch.action();}})),kind,()=>scene.showPause());
  },
  notice(scene,body){this.panel(scene,'Read the stop information.',body,[{label:'Return to the stop.',action:()=>scene.closePanel()}],'notice');},
  atVan(scene){const m=scene.model;return Math.hypot(m.player.x-m.van.x,m.player.z-m.van.z)<4.2;},
  nearPerson(scene){const m=scene.model;return m.customerStage.actors[0]?.visible&&Math.hypot(m.player.x-12.05,m.player.z+44.6)<2.65;},
  exit(scene){this.panel(scene,'Choose how to climb down.','The van is parked at the stop.',[
    {label:'Face the cab, hold the grab handle and step down.',action:()=>this.climbDown(scene,true)},
    {label:'Hop down to the curb.',action:()=>this.climbDown(scene,false)},
    {label:'Remain in the cab.',action:()=>scene.closePanel()}
  ]);},
  climbDown(scene,safe){const m=scene.model;if(!m.exit()){this.notice(scene,'Park the van and set the parking brake before getting out.');return;}OTR.fpCustomerStop.exit(m.customerStop,safe);scene.closePanel();scene.sync();},
  enter(scene){const m=scene.model;if(m.cargoOpen){this.notice(scene,'Close the cargo doors before entering the cab.');return;}
    this.panel(scene,'Choose how to climb into the cab.','The van is parked at the stop.',[
      {label:'Hold the grab handle and step up one foot at a time.',action:()=>this.climbIn(scene,true)},
      {label:'Jump up in one move.',action:()=>this.climbIn(scene,false)},
      {label:'Remain beside the van.',action:()=>scene.closePanel()}
    ]);
  },
  climbIn(scene,safe){const m=scene.model,d=m.customerStop;if(!OTR.fpCustomerStop.enter(d,safe))return;m.mode='cab';m.van.look=0;m.player.pitch=0;scene.closePanel();scene.sync();if(d.state.outcome)this.finishStop(scene);else this.cab(scene);},
  cab(scene){this.panel(scene,'Continue this stop.','You are in the parked van.',[{label:'Get out of the cab.',action:()=>this.exit(scene)},{label:'Leave this stop now.',action:()=>this.confirmMissed(scene)},{label:'Remain in the cab.',action:()=>scene.closePanel()}]);},
  confirmMissed(scene){this.panel(scene,'Confirm leaving this stop.','No delivery or exception has been recorded. Leaving now will keep this stop incomplete.',[{label:'Leave the stop without a record.',action:()=>this.finishStop(scene)},{label:'Continue the stop.',action:()=>scene.closePanel()}]);},
  parcel(scene,id){
    const d=scene.model.customerStop,p=OTR.fpCustomerStop.parcel(d,id);if(!p)return;const S=d.state,held=S.carrying.includes(id),body=`This package is for ${p.to}.\nIts address is ${p.number} ${p.street}.\nIt weighs ${p.weight||0} pounds and uses ${p.service||'standard'} service.`;
    this.panel(scene,'Read the package label.',body,[
      {label:held?'Return this package to its shelf.':'Take this package from its shelf.',action:()=>{if(!this.atVan(scene)){this.notice(scene,'Return to the cargo doors before changing the packages on the shelves.');return;}if(held)OTR.fpCustomerStop.replace(d,id);else OTR.fpCustomerStop.take(d,id);scene.closePanel();scene.sync();if(!held&&(p.weight||0)>=50&&S.heavy===undefined)this.heavy(scene);}},
      {label:'Scan this package.',action:()=>{if(!OTR.fpCustomerStop.scan(d,id,this.atVan(scene))){this.notice(scene,'Take the package before scanning it.');return;}scene.closePanel();scene.sync();this.notice(scene,`The scan recorded tracking number ${p.tracking||p.id}.`);}},
      {label:'Return to the stop.',action:()=>scene.closePanel()}
    ]);
  },
  heavy(scene){const d=scene.model.customerStop;if(!d.state.carrying.some(id=>(OTR.fpCustomerStop.parcel(d,id)?.weight||0)>=50)){this.notice(scene,'You are not carrying a heavy package.');return;}if(d.state.heavy!==undefined){this.notice(scene,'The transport method has already been recorded for this stop.');return;}
    this.panel(scene,'Choose how to move the heavy package.',`This package weighs ${d.packages.find(p=>d.state.carrying.includes(p.id)&&(p.weight||0)>=50).weight} pounds.`,[
      {label:'Strap the package onto the hand truck and wheel it to the door.',action:()=>this.moveHeavy(scene,'truck')},
      {label:'Carry the package in your arms.',action:()=>this.moveHeavy(scene,'carry')},
      {label:'Ask the customer to come to the van for the package.',action:()=>this.moveHeavy(scene,'ask')}
    ]);
  },
  moveHeavy(scene,how){OTR.fpCustomerStop.heavy(scene.model.customerStop,how);scene.closePanel();scene.sync();},
  door(scene){
    const d=scene.model.customerStop,S=d.state;if(S.tagPrinted&&!S.tagAttached){this.panel(scene,'Attach the delivery attempt tag.','The printed tag is ready.',[{label:'Attach the tag to the door.',action:()=>{OTR.fpCustomerStop.attachTag(d);scene.closePanel();scene.sync();}},{label:'Return to the street.',action:()=>scene.closePanel()}]);return;}
    this.panel(scene,'Contact the customer.',d.waiting!==null?'Wait for an answer at the door.':S.answered?'The door is open. Face the customer to speak to them.':'The door is closed.',[
      {label:'Knock on the door and wait.',action:()=>{if(OTR.fpCustomerStop.knock(d)){scene.closePanel();scene.sync();}else this.notice(scene,'A reply is still pending, or an outcome has already been recorded.');}},
      {label:'Return to the street.',action:()=>scene.closePanel()}
    ]);
  },
  person(scene){const d=scene.model.customerStop;if(d.state.talked){this.notice(scene,'Use the handheld to record a delivery or an exception.');return;}if(!OTR.fpCustomerStop.startTalk(d)){this.notice(scene,'The conversation is not available at this moment.');return;}scene.model.customerTalk=d.talk;OTR.fpCustomerScenario.present(scene);},
  handheld(run,scene){const d=scene.model.customerStop;if(d.photoMode){scene.handheld.show({title:'Use the delivery camera.',lines:['The package is placed at the doorstep.'],options:[{label:'Resume framing the photo.',onPick:()=>scene.handheld.close()},{label:'Cancel leaving the package.',onPick:()=>{d.photoPending=d.photoMode=false;scene.handheld.close();scene.sync();}}],back:()=>scene.handheld.close()});return;}scene.handheld.show({title:'Read this stop\'s details.',lines:[`The stop is ${d.def.packages[0].number} ${d.def.packages[0].street}.`,d.state.carrying.length===1?'You are carrying one package.':`You are carrying ${d.state.carrying.length} packages.`],options:[{label:'Open the delivery controls.',onPick:()=>{scene.handheld.close(false);this.records(scene);}},{label:'Read the stop brief.',onPick:()=>{scene.handheld.close(false);this.brief(scene);}}],back:()=>scene.handheld.close()});},
  brief(scene){const d=scene.model.customerStop;this.panel(scene,'Read the stop brief.',d.def.brief,[{label:'Return to the stop.',action:()=>scene.closePanel()},{label:'Read the controls.',action:()=>this.controls(scene)}]);},
  records(scene){const d=scene.model.customerStop;this.panel(scene,'Record this stop.',d.state.outcome?`The recorded outcome is ${d.state.outcome==='delivered'?'a delivery':'exception '+d.state.code}.`:'No delivery or exception has been recorded.',[
    {label:'Record a delivery.',action:()=>this.delivery(scene)},
    {label:'Record an exception.',action:()=>this.exceptions(scene)},
    {label:'Return to the stop.',action:()=>scene.closePanel()}
  ]);},
  delivery(scene,page=0){
    const d=scene.model.customerStop;if(!OTR.fpCustomerStop.canDeliver(d)){this.notice(scene,'Carry the package and scan it before recording a delivery. An existing outcome cannot be recorded again.');return;}
    const types=Object.keys(OTR_DATA.handheld.deliveryTypes),type=types[page%types.length];this.panel(scene,'Choose the delivery method.','How is this package being delivered?',[
      {label:this.labels[type],action:()=>{if(type==='left'){if(scene.model.mode!=='walk'||Math.hypot(scene.model.player.x-11,scene.model.player.z+44.55)>2.65){this.notice(scene,'Approach the doorstep before placing the package.');return;}d.photoPending=true;d.photoMode=true;scene.closePanel();scene.sync();return;}if(!this.nearPerson(scene)||!OTR.fpCustomerStop.requestSignature(d,type)){this.notice(scene,'Walk up to the customer who answered before recording a handover.');return;}this.signature(scene);}},
      {label:'Read the next delivery method.',action:()=>this.delivery(scene,(page+1)%types.length)},
      {label:'Return to the delivery controls.',action:()=>this.records(scene)}
    ]);
  },
  signature(scene){const d=scene.model.customerStop,h=scene.handheld,signature=d.signature,index=d.index,token={};h.show({title:'Capture the signature.',lines:[`${signature.name} is signing.`],widget:{type:'signature',onDone:()=>{
      if(h.signatureToken!==token||!h.isOpen||scene.model.customerStop!==d||d.index!==index||d.signature!==signature)return;if(OTR.fpCustomerStop.signed(d)){h.close(false);this.names(scene);}
    }},options:[{label:'Cancel signing.',onPick:()=>{d.signature=null;h.close();}}],back:()=>{d.signature=null;h.close();}});h.signatureToken=token;
  },
  names(scene,page=0){const d=scene.model.customerStop,names=OTR.fpCustomerStop.names(d),name=names[page%names.length];if(d.signature)d.signature.page=page%names.length;this.panel(scene,'Record the signer\'s printed name.','Who signed for the package?',[
    {label:`Record ${name} as the signer.`,action:()=>{if(OTR.fpCustomerStop.recordSigner(d,name)){scene.closePanel();scene.sync();this.notice(scene,'The delivery has been recorded. Return to the parked van.');}}},
    {label:'Read the next name.',action:()=>this.names(scene,(page+1)%names.length)},
    {label:'Return to the stop.',action:()=>scene.closePanel()}
  ]);},
  exceptions(scene,page=0){const all=OTR_DATA.handheld.exceptions,ex=all[page%all.length];this.panel(scene,'Choose an exception code.',ex.desc,[
    {label:`Record exception ${ex.id}.`,action:()=>{if(!OTR.fpCustomerStop.exception(scene.model.customerStop,ex.id)){this.notice(scene,'An outcome has already been recorded for this stop.');return;}if(ex.doorTag)this.tag(scene);else{scene.closePanel();this.notice(scene,`Exception ${ex.id} has been recorded.`);}}},
    {label:'Read the next exception code.',action:()=>this.exceptions(scene,(page+1)%all.length)},
    {label:'Return to the delivery controls.',action:()=>this.records(scene)}
  ]);},
  tag(scene){this.panel(scene,'Choose whether to print a door tag.','The exception has been recorded.',[{label:'Print a delivery attempt tag.',action:()=>{OTR.fpCustomerStop.printTag(scene.model.customerStop);scene.closePanel();this.notice(scene,'The tag has been printed. Attach it at the door.');}},{label:'Continue without printing a tag.',action:()=>scene.closePanel()}]);},
  capturePhoto(scene){const d=scene.model.customerStop;scene.sync();d.photo=scene.art.customerStop.photo(scene.view.camera);d.photoMode=false;const body=OTR.fpScenario.coaching(scene.scenarioSession)?d.photo.grade==='good'?'The photo shows the package and the doorstep without private details.':d.photo.grade==='private'?'The photo includes a person or the house number.':'The photo does not clearly show the package and the doorstep.':'The photo has been captured.';this.panel(scene,'Review the delivery photo.',body,[
    {label:'Record the delivery with this photo.',action:()=>{OTR.fpCustomerStop.leave(d,d.photo);d.photoPending=false;scene.closePanel();scene.sync();}},
    {label:'Take another photo.',action:()=>{d.photoMode=true;scene.closePanel();}},
    {label:'Cancel leaving the package.',action:()=>{d.photoPending=false;scene.closePanel();scene.sync();}}
  ]);},
  finishStop(scene){const d=scene.model.customerStop;if(OTR.fpCustomerStop.evaluate(d))this.report(scene);},
  report(scene,page=0){const d=scene.model.customerStop,practice=OTR.fpScenario.coaching(scene.scenarioSession),lessons=practice?d.log.takeaways(d.def.id).map(t=>t.text):[],body=page===0?'This stop has ended.':lessons[page-1];this.panel(scene,`Review stop ${d.index+1}.`,body,[
    ...(page<lessons.length?[{label:'Read the next finding.',action:()=>this.report(scene,page+1)}]:[]),
    {label:d.index+1<d.content.stops.length?'Continue to the next stop.':'Finish the scenario.',action:()=>{OTR.fpCustomerStop.next(d);if(d.phase==='done'){scene.finishScenario();return;}this.configure(scene.scenarioSession,scene.model);scene.rebuildWorld();scene.closePanel();scene.sync();this.brief(scene);}}
  ]);},
  controls(scene,page=0){const k=c=>OTR.fpAccess.key(c),pages=[`Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to walk. Press ${k('KeyP')} to face a nearby physical target, then ${k('KeyE')} to interact. The van stays parked during this scenario.`,`Open the cargo doors to read, take and scan the packages. The hand truck follows you after you choose it for a heavy package. Close the cargo doors before returning to the cab.`,`Face the door to knock, the customer to speak, or the printed address to read it. Press ${k('Tab')} for delivery controls and the stop brief. A printed door tag must be attached at the door.`,`Choose one reply or delivery method at a time. While taking a photo, use the look controls to frame the actual package and doorstep, then press ${k('KeyE')} to capture it. Pause and handheld menus stop the scenario clocks.`];this.panel(scene,'Use the doorstep controls.',pages[page],[{label:'Read the next controls page.',action:()=>this.controls(scene,(page+1)%pages.length)},{label:'Return to the stop.',action:()=>scene.closePanel()}]);}
};
OTR.fpScenario.register('customer-doorsteps',{
  piece:'street',goal:'Complete the three customer stops and record each delivery or exception.',seconds:900,
  setup(run,m){m.customerStop=OTR.fpCustomerStop.create(run.content,run.scenario.categories,{coaching:OTR.fpScenario.coaching(run)});m.kind='practice';m.stops=[];m.parcels=[];m.traffic=[];m.crossing.x=m.crossing.z=10000;OTR.fpCustomerStopScenario.configure(run,m);
    const step=m.step;m.step=function(input,dt){if(this.mode==='cab'){this.elapsed+=Math.max(0,Math.min(.05,dt||0));this.van.speed=0;return;}const p=this.player,x=p.x,z=p.z;step.call(this,input,dt);const d=this.customerStop;let pending=false;for(const parcel of d.packages)if(parcel.weight>=50&&d.state.carrying.includes(parcel.id)){pending=d.state.heavy===undefined;break;}if(pending&&Math.hypot(p.x-this.van.x,p.z-this.van.z)>4.3){p.x=x;p.z=z;}let heavy=false;if(d.state.heavy==='truck'&&!d.photoPending)for(const parcel of d.packages)if(parcel.weight>=50&&d.state.carrying.includes(parcel.id)){heavy=true;break;}if(heavy){const sy=Math.sin(p.yaw)*.9,cy=Math.cos(p.yaw)*.9;if(!this.blocked(x+sy,z-cy)&&this.blocked(p.x+sy,p.z-cy)){p.x=x;p.z=z;}}};
  },
  interact(run,scene,id){const A=OTR.fpCustomerStopScenario,m=scene.model,d=m.customerStop;if(d.phase==='brief')OTR.fpCustomerStop.begin(d);if(d.phase!=='active')return true;
    if(d.photoMode){A.capturePhoto(scene);return true;}if(m.mode==='cab'){if(id==='cab-exit'&&scene.art.pick()===id)A.exit(scene);else return false;return true;}
    if(!id||scene.art.pick()!==id){A.notice(scene,'Move close to a physical target and face it before interacting.');return true;}
    if(id==='cargo'){m.cargoOpen=!m.cargoOpen;scene.sync();return true;}if(id==='driver'){A.enter(scene);return true;}
    if(id.startsWith('customer-stop-parcel-'))A.parcel(scene,id.slice(21));
    else if(id==='customer-stop-door')A.door(scene);
    else if(id==='customer-stop-person')A.person(scene);
    else if(id==='customer-stop-trolley')A.heavy(scene);
    else if(id==='customer-stop-number'){d.state.addressChecked=true;A.notice(scene,`The building is numbered ${d.def.lot.spec.number}. The stop address is ${d.def.packages[0].number} ${d.def.packages[0].street}.`);}
    else A.notice(scene,'Use the nearby door, customer, cargo, parcel or cab targets.');return true;
  },
  conversationStage(run,scene){const d=scene.model.customerStop,talk=d.talk,stage=scene.model.customerStage;if(!talk||d.actorEntry===talk.entries)return;d.actorEntry=talk.entries;if(talk.node.act==='strangerLeaves')stage.actors[0].visible=false;if(talk.node.act==='strangerAppears')stage.actors[0].visible=true;OTR.fpCustomerStage.target(stage);},
  conversationEnded(run,scene){OTR.fpCustomerStop.finishTalk(scene.model.customerStop);scene.closePanel();scene.sync();scene.message('Use the handheld to record a delivery or an exception.');},
  clockActive(run,scene,active){return OTR.fpCustomerScenario?OTR.fpScenario.definitions.get('customer-conversation').clockActive(run,scene,active):active;},
  tick(run,scene,dt,active){const d=scene.model?.customerStop;if(!d)return;if(d.phase==='brief'&&run.phase==='active')OTR.fpCustomerStop.begin(d);
    const ready=OTR.fpCustomerStop.step(d,dt,active);if(ready){scene.model.customerStage.actors[0].visible=d.state.answered||d.stranger;OTR.fpCustomerStage.target(scene.model.customerStage);scene.sync();scene.message(d.state.answered?'The customer has opened the door.':'Nobody has answered the door.');}
    if(d.talk&&d.talk.phase!=='done'){const phase=d.talk.phase;OTR.fpCustomerTalk.step(d.talk,dt,active);if(d.talk.phase!==phase)OTR.fpCustomerScenario.present(scene);}
    if(active||scene.panel?.customer&&scene.panel.customerKind!=='controls'&&scene.panel.customerKind!=='notice')scene.model.customerStage.time+=dt;
  },
  controls(run,scene){OTR.fpCustomerStopScenario.controls(scene);},handheld(run,scene){OTR.fpCustomerStopScenario.handheld(run,scene);},
  status(run){const d=run.model.customerStop;return d.photoMode?`Frame the package and doorstep, then press ${OTR.fpAccess.key('KeyE')} to capture the photo.`:d.state.heavy===undefined&&OTR.fpCustomerStop.heavyCarried(d)?'Choose how to move the heavy package before leaving the van.':`This is stop ${d.index+1} of ${d.content.stops.length}.`;},
  timeout(run,scene){OTR.fpCustomerScenario.unfinished(run,scene,'There is no result because the three stops were not completed.');},
  result(run){const result=OTR.fpCustomerStop.result(run.model.customerStop);if(!result)throw Error('The customer stop set is incomplete');return result;}
});
