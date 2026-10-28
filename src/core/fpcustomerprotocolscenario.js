/* Optional physical protocols reuse the doorstep motor, parcels, climbing controls and local result path. */
window.OTR=window.OTR||{};
OTR.fpCustomerProtocolScenario={
  ...OTR.fpCustomerStopScenario,
  configure(run,m){
    OTR.fpCustomerStopScenario.configure(run,m);const kind=m.customerStop.protocol.spec.kind;
    m.customerStage.actors[0].visible=kind==='reception';OTR.fpCustomerStage.target(m.customerStage);
    if(kind==='reception')m.solids.push({x:12.05,z:-43.65,w:2.2,d:.78});
    if(kind==='locker')m.solids.push({x:8.8,z:-43.9,w:1.94,d:.7});
    m.customerStop.protocol.photoMode=false;
  },
  confirmMissed(scene){this.panel(scene,'Confirm leaving this stop.','This protocol has not been completed. Leaving now records an unfinished run.',[{label:'Leave this protocol unfinished.',action:()=>scene.finishScenario('incomplete')},{label:'Continue the stop.',action:()=>scene.closePanel()}]);},
  finishStop(scene){if(OTR.fpCustomerProtocol.evaluate(scene.model.customerStop))this.report(scene);else this.notice(scene,'Complete the handover or locker record before finishing this stop.');},
  contact(scene,button){this.panel(scene,'Use the intercom.',`The selected intercom button is ${button}.`,[
    {label:'Identify yourself as the courier making a delivery.',action:()=>this.act(scene,'call',{button,purpose:'delivery'})},
    {label:'Say that you are visiting the building.',action:()=>this.act(scene,'call',{button,purpose:'visitor'})},
    {label:'Return to the stop.',action:()=>scene.closePanel()}
  ]);},
  act(scene,action,value){
    OTR.fpCustomerProtocol.action(scene.model.customerStop,action,value);scene.closePanel();scene.sync();
  },
  door(scene){const d=scene.model.customerStop;if(d.protocol.sequence.opened){this.handover(scene);return;}this.panel(scene,'Use the building entrance.','The entrance door has an electric latch.',[
    {label:'Try to open the entrance door.',action:()=>{this.act(scene,'open');d.state.answered=d.protocol.sequence.opened;scene.model.customerStage.actors[0].visible=d.state.answered;OTR.fpCustomerStage.target(scene.model.customerStage);scene.sync();}},
    {label:'Return to the stop.',action:()=>scene.closePanel()}
  ]);},
  handover(scene){this.panel(scene,'Hand over the parcel.','The person is at the open entrance.',[{label:'Give the scanned parcel to the recipient.',action:()=>{OTR.fpCustomerProtocol.handOver(scene.model.customerStop);scene.closePanel();scene.sync();}},{label:'Return to the stop.',action:()=>scene.closePanel()}]);},
  reception(scene){const p=scene.model.customerStop.protocol;this.panel(scene,'Use the reception desk.',`The person at reception is ${p.spec.receptionist}.`,[
    {label:'Record who will receive the parcel.',action:()=>this.receiver(scene)},
    {label:'Capture the receiver\'s signature.',action:()=>this.signature(scene)},
    {label:'Hand the parcel to the recorded receiver.',action:()=>this.act(scene,'handover')},
    {label:'Return to the stop.',action:()=>scene.closePanel()}
  ]);},
  receiver(scene,page=0){const p=scene.model.customerStop.protocol,names=[p.spec.receptionist,p.spec.recipient,'Occupant'],name=names[page%names.length];this.panel(scene,'Record the receiver\'s name.','Who is accepting the parcel at reception?',[
    {label:`Record ${name} as the receiver.`,action:()=>this.act(scene,'identify',{role:'reception',name})},
    {label:'Read the next name.',action:()=>this.receiver(scene,(page+1)%names.length)},
    {label:'Return to the stop.',action:()=>scene.closePanel()}
  ]);},
  signature(scene){
    const d=scene.model.customerStop,p=d.protocol,h=scene.handheld,token={};
    if(!p.sequence.role){this.notice(scene,'Record who is receiving the parcel before opening the signature screen.');return;}
    const name=p.sequence.role==='recipient'?p.spec.recipient:p.spec.receptionist;
    h.show({title:'Capture the signature.',lines:[`${name} is signing.`],widget:{type:'signature',onDone:()=>{
      if(h.signatureToken!==token||!h.isOpen||scene.model.customerStop!==d||scene.scenarioSession.phase!=='active'||scene.model.mode!=='walk'||Math.hypot(scene.model.player.x-12.05,scene.model.player.z+43.2)>2.65)return;
      OTR.fpCustomerProtocol.action(d,'sign',name);h.close(false);scene.sync();
    }},options:[{label:'Cancel signing.',onPick:()=>h.close()}],back:()=>h.close()});h.signatureToken=token;
  },
  locker(scene,compartment){const seq=scene.model.customerStop.protocol.sequence;
    this.panel(scene,`Use compartment ${compartment}.`,seq.open?'The compartment door is open.':'The compartment door is closed.',[
      {label:seq.open?'Close the compartment door.':'Open the compartment door.',action:()=>this.act(scene,compartment===scene.model.customerStop.protocol.spec.compartment&&seq.open?'close':'open',compartment)},
      {label:'Scan the parcel at this compartment.',action:()=>{if(compartment===scene.model.customerStop.protocol.spec.compartment)this.act(scene,'scan','p1');else this.act(scene,'open',compartment);}},
      {label:'Read the parcel placement controls.',action:()=>this.placement(scene,compartment)},
      {label:'Return to the stop.',action:()=>scene.closePanel()}
    ]);
  },
  placement(scene,compartment){this.panel(scene,`Place the parcel in compartment ${compartment}.`,'Use the physical compartment at this target.',[
    {label:'Place the scanned parcel inside.',action:()=>{if(compartment===scene.model.customerStop.protocol.spec.compartment)this.act(scene,'deposit');else this.act(scene,'open',compartment);}},
    {label:'Take the parcel back out.',action:()=>{if(compartment===scene.model.customerStop.protocol.spec.compartment)this.act(scene,'retrieve');else this.act(scene,'open',compartment);}},
    {label:'Return to the stop.',action:()=>scene.closePanel()}
  ]);},
  handheld(run,scene){
    const d=scene.model.customerStop,p=d.protocol;if(p.photoMode){scene.handheld.show({title:'Use the locker camera.',lines:['Frame the actual closed compartment in the camera view.'],options:[{label:'Resume framing the photo.',onPick:()=>scene.handheld.close()},{label:'Cancel the photo.',onPick:()=>{p.photoMode=false;scene.handheld.close();}}],back:()=>scene.handheld.close()});return;}
    scene.handheld.show({title:'Read this stop\'s details.',lines:[d.def.brief],options:[...(p.spec.kind==='locker'?[{label:'Open the locker camera.',onPick:()=>{p.photoMode=true;scene.handheld.close();}}]:[]),{label:'Read the controls.',onPick:()=>{scene.handheld.close(false);this.controls(scene);}},{label:'Return to the stop.',onPick:()=>scene.handheld.close()}],back:()=>scene.handheld.close()});
  },
  capturePhoto(scene){
    scene.sync();const d=scene.model.customerStop,p=d.protocol;
    if(scene.art.pick()!=='protocol-locker-B12'||!scene.art.customerStop.protocol.photo(scene.view.camera)){this.notice(scene,'The closed compartment must be visible inside the camera frame.');return;}
    OTR.fpCustomerProtocol.action(d,'photo');p.photoMode=false;scene.closePanel();scene.sync();this.notice(scene,'The compartment photo has been recorded.');
  },
  controls(scene,page=0){const k=c=>OTR.fpAccess.key(c),pages=[`Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to walk. Press ${k('KeyP')} to face a nearby physical target, then ${k('KeyE')} to interact. The van stays parked during this scenario.`,
    'Use the cargo doors to take and scan the parcel. Close the cargo doors before returning to the cab. Face the intercom, entrance, reception desk or locker to use its controls.',
    `Press ${k('Tab')} to read the stop details or open the locker camera. While using the camera, frame the actual closed compartment, then press ${k('KeyE')} to capture it. Pause, handheld and control pages stop the scenario clocks.`];this.panel(scene,'Use the protocol controls.',pages[page],[{label:'Read the next controls page.',action:()=>this.controls(scene,(page+1)%pages.length)},{label:'Return to the stop.',action:()=>scene.closePanel()}]);}
};
OTR.fpScenario.register('customer-protocol',{
  piece:'street',goal:'Complete the customer protocol, record the handover and return to the parked van.',seconds:480,
  setup(run,m){
    const authored=OTR.fpCustomerProtocolContent.create(run.id);m.customerStop=OTR.fpCustomerProtocol.create(authored.content,authored.spec,{coaching:OTR.fpScenario.coaching(run)});m.kind='practice';m.stops=[];m.parcels=[];m.traffic=[];m.crossing.x=m.crossing.z=10000;OTR.fpCustomerProtocolScenario.configure(run,m);
    const step=m.step;m.step=function(input,dt){if(this.mode==='cab'){this.elapsed+=Math.max(0,Math.min(.05,dt||0));this.van.speed=0;return;}step.call(this,input,dt);};
  },
  interact(run,scene,id){
    const A=OTR.fpCustomerProtocolScenario,m=scene.model,d=m.customerStop;if(d.phase==='brief')OTR.fpCustomerProtocol.begin(d);if(d.phase!=='active')return true;
    if(d.protocol.photoMode){A.capturePhoto(scene);return true;}
    if(m.mode==='cab'){if(id==='cab-exit'&&scene.art.pick()===id)A.exit(scene);else return false;return true;}
    if(!id||scene.art.pick()!==id)return false;
    if(id==='cargo'){m.cargoOpen=!m.cargoOpen;scene.sync();}
    else if(id==='driver')A.enter(scene);
    else if(id.startsWith('customer-stop-parcel-'))A.parcel(scene,id.slice(21));
    else if(id.startsWith('protocol-intercom-'))A.contact(scene,id.slice(18));
    else if(id==='customer-stop-door')A.door(scene);
    else if(id==='customer-stop-person')A.handover(scene);
    else if(id==='protocol-reception')A.reception(scene);
    else if(id.startsWith('protocol-locker-'))A.locker(scene,id.slice(16));
    else if(id==='customer-stop-number')A.notice(scene,`The stop address is ${d.def.packages[0].number} ${d.def.packages[0].street}.`);
    else return false;return true;
  },
  tick(run,scene,dt,active){const d=scene.model?.customerStop;if(!d)return;if(d.phase==='brief'&&run.phase==='active')OTR.fpCustomerProtocol.begin(d);OTR.fpCustomerProtocol.step(d,dt,active);if(active)scene.model.customerStage.time+=dt;},
  controls(run,scene){OTR.fpCustomerProtocolScenario.controls(scene);},
  handheld(run,scene){OTR.fpCustomerProtocolScenario.handheld(run,scene);},
  status(run){const d=run.model.customerStop;return d.protocol.photoMode?`Frame the closed compartment, then press ${OTR.fpAccess.key('KeyE')} to capture the photo.`:d.state.outcome?'The handover is recorded. Return to the parked van.':'Read the stop details on the handheld.';},
  result(run,reason){const r=OTR.fpCustomerProtocol.result(run.model.customerStop,reason);if(!r)throw Error('The customer protocol is incomplete');return r;}
});
