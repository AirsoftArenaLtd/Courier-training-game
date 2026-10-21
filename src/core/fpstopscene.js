/* Physical delivery controls and accessible scene menus. Text stays in Phaser. */
window.OTR=window.OTR||{};
OTR.fpStopScene={
  build(m,route,box,labels){
    if(!m.deliveryStops)return null;const T=THREE,parts=[];
    const visual=(x,y,z,w,h,d,colour)=>box(route,x,y,z,w,h,d,colour);
    const target=(id,x,y,z,w,h,d,colour)=>{
      const art=visual(x,y,z,w,h,d,colour),proxy=box(route,x,y,z,w,h,d,colour,'visit'+id,true);proxy.layers.set(1);
      return {entry:art.userData.fpBatchEntry,proxy};
    };
    for(let i=0;i<m.stops.length;i++){
      const s=m.stops[i],a=m._deliverySpecs[i],p=OTR.fpStopFlow.point(m,i),kind=a.protocol&&a.protocol.kind;
      const button=target(i,p.x,p.y,p.z,.08,.32,.36,0x253E4D);
      labels.push({parent:route,point:new T.Vector3(p.x-s.side*.1,1.75,p.z),text:kind==='intercom'?'Use the intercom here.':kind==='reception'?'Speak at reception here.':kind==='locker'?'Use the assigned locker here.':'Record a failed delivery here.',wrap:260,delivery:true,max:8});
      const part={id:i,button,gate:null,door:null,lastOpen:null};parts.push(part);
      if(kind==='intercom')visual(p.x-s.side*.06,p.y-.09,p.z,.09,.055,.25,0xEBC889);
      if(a.gated){
        const x=s.x-s.side*2.6;part.gate=target(i,x,.625,s.z,.16,1.25,4.8,0x657782);
        for(const dz of [-3.1,3.1])visual(x,.625,s.z+dz,.16,1.25,1.4,0x657782);
        for(const dz of [-3.8,3.8])visual(s.x-s.side*1.3,.625,s.z+dz,2.6,1.25,.16,0x657782);
      }
      if(kind==='reception'){
        visual(s.x-s.side*.55,.44,s.z+.9,.8,.88,1.4,0x927557);
        visual(s.x-s.side*.55,.93,s.z+.9,.86,.1,1.46,0xE1DDD3);
        visual(s.x-s.side*.85,1.1,s.z+.9,.08,.32,.12,0x253E4D);
      }
      if(kind==='locker'){
        const x=s.x-s.side*.55,z=s.z+1.65,colour=0x587C91;
        visual(s.x-s.side*.17,.85,z,.06,1.4,1.3,colour);
        for(const dz of [-.62,.62])visual(x,.85,z+dz,.8,1.4,.06,colour);
        for(const y of [.18,1.52])visual(x,y,z,.8,.06,1.3,colour);
        const d=OTR.fpStopFlow.lockerDoor(m,i,false);part.door=target(i,d.x,d.y,d.z,.06,1.25,1.14,0x90B4C5);
        part.door.entry.sphere=new T.Sphere(new T.Vector3(d.x,d.y,d.z),Math.hypot(.06,1.25,1.14)/2);
      }
    }
    return {parts,sync(model,cx,cz){
      for(const p of parts){const state=model.deliveryStops.stops[p.id].protocol,s=model.stops[p.id],near=(s.x-cx)**2+(s.z-cz)**2<55*55;
        p.button.entry.visible=p.button.proxy.visible=near;
        if(p.gate)p.gate.entry.visible=p.gate.proxy.visible=near&&!state.opened;
        if(p.door){
          if(p.lastOpen!==state.open){const d=OTR.fpStopFlow.lockerDoor(model,p.id,state.open);p.lastOpen=state.open;p.door.proxy.position.set(d.x,d.y,d.z);p.door.proxy.rotation.y=d.yaw;p.door.proxy.updateMatrix();p.door.entry.matrix.copy(p.door.proxy.matrix);p.door.entry.sphere.center.set(d.x,d.y,d.z);}
          p.door.entry.visible=p.door.proxy.visible=near;
        }
      }
    }};
  },
  name(m,id){const a=m._deliverySpecs[id].protocol;return a?a.kind==='intercom'?'the intercom':a.kind==='reception'?'the reception desk':'the parcel locker':'the delivery record';},
  outcome(scene,id,record){
    const m=scene.model,a=m._deliverySpecs[id].protocol,planter=m.routeDay&&OTR.fpDay.planter(m,id);
    scene.showPanel('Record the delivery outcome.',m.serviceLabel(id),[
      {label:'Hand the parcel to the recipient.',action:()=>record('handover')},
      {label:a&&a.kind==='locker'?'Record the locker delivery.':planter?'Place the parcel behind the planter.':'Leave the parcel in the approved safe place.',action:()=>record(planter?'planter':'safeplace')},
      {label:'Record a delivery exception.',action:()=>record('exception')},
      {label:'Review the delivery checks.',action:()=>this.checks(scene,id)}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  },
  checks(scene,id){
    const m=scene.model,a=m._doorSpecs[id],protocol=m._deliverySpecs[id].protocol,choices=[];
    if(a.adult)choices.push({label:'Check the required photo ID.',action:()=>scene.showIdentity(id)});
    if(a.signature&&a.present)choices.push({label:'Capture the recipient signature.',action:()=>{if(protocol&&protocol.kind==='reception')this.signature(scene,id,a.person);else scene.handheld.signature(id);}});
    if(a.difficult)choices.push({label:'Speak with the customer calmly.',action:()=>scene.showCustomer(id)});
    choices.push({label:'Return to the delivery controls.',action:()=>{if(protocol)this.show(scene,id);else scene.showDoor(id,true);}});
    scene.showPanel('Complete the delivery checks.',m.serviceLabel(id),choices,{accessibleText:true,back:()=>scene.closePanel()});
  },
  do(scene,id,command,value,close=false,page='show'){
    const text=OTR.fpStopFlow.act(scene.model,id,command,value);scene.message(text);scene.checkpoint();
    if(!scene.model._deliveryActionOK){scene.showPanel('Review the delivery requirements.',text,[{label:'Return to the delivery controls.',action:()=>this[page](scene,id)},{label:'Return to the street.',action:()=>scene.closePanel()}],{accessibleText:true});return false;}
    if(close)scene.closePanel();else this[page](scene,id);return true;
  },
  show(scene,id){
    const m=scene.model;if(!OTR.fpStopFlow.can(m,id))return;
    if(m._doorSpecs[id].dog&&!m.doorsteps.stops[id].dogSecured){scene.showGate(id);return;}
    const a=m._deliverySpecs[id].protocol,d=m.deliveryStops.stops[id].protocol,s=m.stops[id],back={label:'Return to the street.',action:()=>scene.closePanel()};
    const panel=(title,body,choices)=>scene.showPanel(title,body,choices.concat(back),{accessibleText:true,back:()=>scene.closePanel()});
    if(!a){this.reattempt(scene,id);return;}
    if(a.kind==='intercom'){
      if(d.opened){if(m.near('door'+id))scene.showDoor(id,true);else panel('The entry is unlocked.','Walk through the entry to the recipient.',[]);return;}
      const ready=OTR.fpStops.ready(d,a,m.elapsed),called=d.calledAt!==null;
      panel('Use the intercom.',`Contact ${a.button}.\n${ready?'The entry buzz is sounding. Unlock the entry.':called?'Wait on the street for the entry buzz or a reply.':'Choose the matching button, identify yourself and explain the delivery.'}`,[
        {label:'Choose an intercom button.',action:()=>this.call(scene,id)},
        {label:'Unlock the entry.',action:()=>{this.do(scene,id,'intercom.open',null,true);if(m.deliveryStops.stops[id].protocol.opened){scene.message(m.contact(id));scene.checkpoint();}}},
        {label:'Record a failed delivery.',action:()=>this.reattempt(scene,id)}
      ]);return;
    }
    if(a.kind==='reception'){
      if(!s.contacted){panel('Speak at reception.',`The person at reception is ${a.receptionist}.`,[{label:'Greet the person and confirm the address.',action:()=>{scene.message(m.contact(id));scene.checkpoint();this.show(scene,id);}}]);return;}
      if(!d.role){panel('Record the recipient at reception.',`The person receiving the parcel is ${a.receptionist}.`,[
        {label:`Record ${a.receptionist} at reception.`,action:()=>this.do(scene,id,'reception.identify',{role:'reception',name:a.receptionist})},
        {label:'Record an unnamed occupant.',action:()=>this.do(scene,id,'reception.identify',{role:'reception',name:'Occupant'})},
        {label:'Record a failed delivery.',action:()=>this.reattempt(scene,id)}
      ]);return;}
      if(!d.signed){panel('Capture the reception signature.',`Ask ${a.receptionist} to sign for this parcel.`,[
        {label:'Capture the matching signature.',action:()=>this.signature(scene,id,a.receptionist)},
        {label:'Use an unrelated printed name.',action:()=>this.signature(scene,id,'Occupant')},
        {label:'Review the delivery checks.',action:()=>scene.handheld.checks(id)}
      ]);return;}
      panel('Complete the reception handover.',`The name and signature are recorded for ${a.receptionist}.`,[
        {label:'Hand over and record the parcel.',action:()=>{if(this.do(scene,id,'reception.handover',null,true))scene.handheld.delivery(id);}},
        {label:'Review the delivery checks.',action:()=>scene.handheld.checks(id)},
        {label:'Record a failed delivery.',action:()=>this.reattempt(scene,id)}
      ]);return;
    }
    if(!s.contacted){scene.message(m.contact(id));scene.checkpoint();}
    let choices,body;
    if(!d.open&&!d.deposited){body=`Use compartment ${a.compartment} for this parcel.`;choices=[
      {label:`Open compartment ${a.compartment}.`,action:()=>this.do(scene,id,'locker.open',a.compartment)},
      {label:'Open a different compartment.',action:()=>this.do(scene,id,'locker.open','other')},
      {label:'Record a failed delivery.',action:()=>this.reattempt(scene,id)}];
    }else if(d.open&&!d.scanned){body='Scan the matching parcel with the handheld before placing it in the locker.';choices=[
      {label:'Scan the physical parcel.',action:()=>{scene.closePanel();scene.handheld.scan();}},
      {label:'Close the empty locker.',action:()=>this.do(scene,id,'locker.close')}];
    }else if(d.open&&!d.deposited){body='The matching parcel is scanned. Place it inside the assigned compartment.';choices=[
      {label:'Place the parcel inside.',action:()=>this.do(scene,id,'locker.deposit')},
      {label:'Close the empty locker.',action:()=>this.do(scene,id,'locker.close')}];
    }else if(d.open){body='The parcel is inside. Close the door before taking its delivery photo.';choices=[
      {label:'Close the locker door.',action:()=>this.do(scene,id,'locker.close')},
      {label:'Retrieve the parcel.',action:()=>this.do(scene,id,'locker.retrieve')},
      {label:'Photograph the open door.',action:()=>this.do(scene,id,'locker.photo')}];
    }else if(!d.photo){body='The locker door is closed. Photograph this door before recording delivery.';choices=[
      {label:'Photograph the closed locker door.',action:()=>{if(this.do(scene,id,'locker.photo',null,true))scene.workdaySound.effect('parking','The closed locker door is photographed.');}},
      {label:'Reopen the locker.',action:()=>this.do(scene,id,'locker.open',a.compartment)}];
    }else{body='The closed-door photo is recorded. Finish this locker delivery.';choices=[
      {label:'Record the locker delivery.',action:()=>{scene.closePanel();scene.handheld.delivery(id);}},
      {label:'Reopen the locker.',action:()=>this.do(scene,id,'locker.open',a.compartment)}];}
    panel('Use the parcel locker.',body,choices);
  },
  call(scene,id){
    const a=scene.model._deliverySpecs[id].protocol;
    const wording=button=>scene.showPanel('Identify your delivery.','Say who you are and what you bring.',[
      {label:'I am the courier, and I have a parcel for this address.',action:()=>this.do(scene,id,'intercom.call',{button,purpose:'delivery'},true)},
      {label:'Open the door without asking questions.',action:()=>this.do(scene,id,'intercom.call',{button,purpose:'demand'},true)},
      {label:'Return to the intercom.',action:()=>this.show(scene,id)}
    ],{accessibleText:true,back:()=>this.show(scene,id)});
    scene.showPanel('Choose the intercom button.',`The parcel is for ${a.button}.`,[
      {label:`Call ${a.button}.`,action:()=>wording(a.button)},
      {label:'Call a different entry.',action:()=>wording('other')},
      {label:'Return to the intercom.',action:()=>this.show(scene,id)}
    ],{accessibleText:true,back:()=>this.show(scene,id)});
  },
  signature(scene,id,name){
    const h=scene.handheld,token={};scene.closePanel();
    h.show({title:'Capture the reception signature.',lines:[`The printed name is ${name}.`],widget:{type:'signature',onDone:()=>{
      if(h.signatureToken!==token||!h.isOpen)return;h.close();this.do(scene,id,'reception.sign',name);
    }},options:[{label:'Return to reception.',onPick:()=>{h.close();this.show(scene,id);}}]});h.signatureToken=token;
  },
  reattempt(scene,id){
    const m=scene.model;if(!OTR.fpStopFlow.can(m,id))return;const a=m._deliverySpecs[id].reattempt,d=m.deliveryStops.stops[id].reattempt;
    const blocked=OTR.fpStopFlow.beginException(m,id);scene.checkpoint();if(blocked){scene.showPanel('Attempt contact first.',blocked,[{label:'Return to the delivery controls.',action:()=>this.show(scene,id)},{label:'Wait on the street.',action:()=>scene.closePanel()}],{accessibleText:true});return;}
    const reason=a.reason==='address'?'The label does not match the address.':a.reason==='id'?'The required photo ID is not valid.':a.reason==='dispatch'?'The updated dispatch instruction requires retention.':a.reason==='access'?'Safe access or an authorized handover is unavailable.':'The required recipient is absent.';
    const choices=!d.card?[{label:'Leave a delivery attempt card.',action:()=>this.do(scene,id,'reattempt.card',null,false,'reattempt')}]:!d.retained?[
      {label:'Record this retention reason.',action:()=>this.do(scene,id,'reattempt.retain',a.reason,false,'reattempt')},
      {label:'Record an unrelated reason.',action:()=>this.do(scene,id,'reattempt.retain','other',false,'reattempt')}
    ]:!d.booked?[{label:`Book the afternoon of day ${a.nextDay}.`,action:()=>this.do(scene,id,'reattempt.book',{day:a.nextDay,slot:a.slot},false,'reattempt')}]:[
      {label:'Record the exception and keep the parcel.',action:()=>{scene.closePanel();scene.handheld.delivery(id);}}
    ];
    choices.push({label:'Return to the street.',action:()=>scene.closePanel()});
    scene.showPanel('Arrange the next delivery attempt.',reason,choices,{accessibleText:true,back:()=>scene.closePanel()});
  },
  tick(scene){
    const m=scene.model;if(!m||!m.deliveryStops||m.paused||m.mode!=='walk')return;
    for(let i=0;i<m.stops.length;i++){const d=m.deliveryStops.stops[i].protocol,a=m._deliverySpecs[i].protocol;
      if(d&&a.kind==='intercom'&&!d.opened&&!((m._deliveryBuzzMask||0)&(1<<i))&&OTR.fpStops.ready(d,a,m.elapsed)&&OTR.fpStopFlow.near(m,i)){
        m._deliveryBuzzMask=(m._deliveryBuzzMask||0)|(1<<i);scene.workdaySound.effect('parking','The intercom buzzes. You may unlock the entry.');scene.message('The intercom buzzes. You may unlock the entry.');
      }
    }
  }
};
