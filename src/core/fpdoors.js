/* Physical doorstep situations from the generated 2D lessons. */
window.OTR=window.OTR||{};
OTR.fpDoors={
  configure(m,saved){
    if(m.kind!=='campaign'||!m.routePlan)return;
    m.doorsteps=saved||{date:new Date().toISOString().slice(0,10),stops:m.stops.map(()=>({dogSecured:false,gateOpen:false,addressSeen:false,idViewed:false,idDecision:null,signatureName:null,calm:null,hazardCleared:false,hazardHit:false}))};
    const wrong=m.seed%3===0?m.routePlan.route.findIndex(r=>r.type==='leave'):-1;
    m._doorSpecs=m.routePlan.route.map((r,i)=>{
      const s=r.stop,p=s.packages[0],a=s.answer,graph=a&&s.talks&&s.talks[a.talk],nodes=graph?Object.values(graph.nodes):[];
      const id=a&&a.id||{},year=Number(m.doorsteps.date.slice(0,4)),variant=m.seed%5;
      return {present:!!a,person:a?a.name:'',to:p.to,signature:p.service==='signature'||p.service==='adult',adult:p.service==='adult',
        dog:!!s.dog,dogName:s.dog?s.dog.name:'',fur:s.dog?s.dog.spec.fur:0x927557,
        skin:a&&a.spec&&a.spec.skin||0xB68F72,shirt:a&&a.spec&&a.spec.shirt||0x608987,
        wrong:i===wrong,label:i===wrong?`${s.decoys[0].number} ${s.decoys[0].street}`:m.stops[i].address,
        difficult:nodes.some(n=>n.expr==='angry'),opening:graph&&graph.nodes[graph.start]?graph.nodes[graph.start].text:'',
        hazard:(s.props||[]).find(p=>p.hazard)?.hazard||s.stepHazard||'',
        idName:variant===4?'Another Resident':a?a.name:'',dob:variant===1?`05/14/${year-18}`:id.dob||'05/14/1986',
        exp:variant===2?`05/14/${year-1}`:id.exp||'05/14/2030',photoMatch:variant!==3};
    });
    for(let i=0;i<m.stops.length;i++)m.parcels[i].address=m._doorSpecs[i].label;
    this.attach(m);
  },
  attach(m){
    if(!m._doorSolids){m._doorSolids=m.stops.map((s,i)=>{
      const resident={x:1e6,z:s.z,w:.55,d:.5,h:1.9};m.solids.push(resident);
      if(!m._doorSpecs[i].dog)return {resident};
      const gate={x:1e6,z:s.z,w:.16,d:4.8,h:1.1},dog={x:1e6,z:s.z,w:1.6,d:.65,h:.7};
      const fences=[-3.1,3.1].map(dz=>({x:s.x-s.side*2.6,z:s.z+dz,w:.16,d:1.4,h:1.2}));
      m.solids.push(gate,dog,...fences);return {resident,gate,dog,fences};
    });}this.sync(m);
  },
  point(m,id,type){const s=m.stops[id];return {x:s.x-s.side*(type==='gate'?2.6:1.5),y:type==='gate'?1:.05,z:s.z};},
  near(m,id){return m.near('door'+id)||(m._doorSpecs[id].dog&&m.near('gate'+id))||(m.deliveryStops&&OTR.fpStopFlow.near(m,id));},
  can(m,id){const s=m.stops[id];return !!s&&!s.resolved&&m.mode==='walk'&&m.parked()&&this.near(m,id);},
  fire(m,type,id,ok,text){
    const key=`door:${type}:${id}`;if(m.events[key])return;m.log(key,'doorstep',ok?'good':'needs',text);
    if(OTR.workday)OTR.workday.report(type,{key:id,stop:id+1,ok,where:{x:m.player.x,z:m.player.z}});
  },
  sync(m){
    for(let i=0;i<m.stops.length;i++){
      const bounds=m._doorSolids[i],s=m.stops[i],d=m.doorsteps.stops[i];
      bounds.resident.x=s.contacted&&m._doorSpecs[i].present&&!s.resolved?s.x-s.side*.8:1e6;
      if(!bounds.gate)continue;
      bounds.gate.x=d.gateOpen||d.dogSecured?1e6:s.x-s.side*2.6;
      const x=s.x-s.side*(d.gateOpen?3.6:1.4),z=s.z+1.3+Math.sin(m.elapsed*1.3+i)*.35;
      if(!d.dogSecured&&Math.hypot(x-m.player.x,z-m.player.z)>.9){bounds.dog.x=x;bounds.dog.z=z;}
      if(d.dogSecured)bounds.dog.x=1e6;
    }
  },
  tick(m,input){
    m.dogNearby=false;for(let i=0;i<m.stops.length;i++){
      const s=m.stops[i],spec=m._doorSpecs[i],d=m.doorsteps.stops[i];if(s.resolved)continue;
      const x=(s.x-m.player.x)*s.side,z=Math.abs(m.player.z-s.z);
      if(spec.dog&&!d.dogSecured&&m.mode==='walk'){
        if(x<2.5&&x>-.5&&z<2.7)this.fire(m,'stop.dog',i,false,'Entered the yard while the dog was loose.');
        if(Math.hypot(m.player.x-s.x,m.player.z-s.z)<12)m.dogNearby=true;
      }
      if(m.mode==='walk'&&spec.hazard&&!d.hazardCleared&&!d.hazardHit&&(input.forward||input.back||input.left||input.right)&&Math.abs(x-1.5)<.48&&z<.55){
        if((spec.hazard==='ice'||spec.hazard==='wet')&&input.careful)continue;
        d.hazardHit=true;this.fire(m,'stop.hazard',i,false,'Slipped or tripped on the delivery path.');m.doorNotice='You slipped or tripped. Look at the path and use short, careful steps.';m.touch();
      }
    }this.sync(m);
  },
  secureDog(m,id){
    const s=m.stops[id],d=m.doorsteps.stops[id];
    if(!this.can(m,id)||!m._doorSpecs[id].dog||(s.x-m.player.x)*s.side<2.5)return 'Stay outside the gate and call the owner.';
    d.dogSecured=true;d.gateOpen=true;s.contacted=true;this.sync(m);this.fire(m,'stop.dog',id,true,'Waited outside while the owner secured the dog.');m.touch();return 'The owner has secured the dog. The gate is safe to use.';
  },
  openGate(m,id){
    if(!this.can(m,id))return 'Approach the gate from outside.';m.doorsteps.stops[id].gateOpen=true;this.sync(m);
    if(!m.doorsteps.stops[id].dogSecured)this.fire(m,'stop.dog',id,false,'Opened the gate while the dog was loose.');m.touch();return 'The gate is open. Keep away from the loose dog.';
  },
  clearHazard(m,id){
    const spec=m._doorSpecs[id];if(!this.can(m,id)||!m.near('hazard'+id))return 'Move close enough to inspect the path.';
    if(spec.hazard==='ice'||spec.hazard==='wet')return 'Use short, careful steps or walk around the slippery patch.';
    if(m.heldId)return 'Put the parcel on a cargo shelf before clearing the path.';
    m.doorsteps.stops[id].hazardCleared=true;m.touch();return 'The trip hazard is clear of the path.';
  },
  address(m,p){
    if(p.stop<0||!m._doorSpecs[p.stop].wrong||!m.atDelivery(p))return '';
    m.doorsteps.stops[p.stop].addressSeen=true;m.touch();return 'The label does not match this door. Keep the parcel and report an address exception.';
  },
  validID(m,id){
    const a=m._doorSpecs[id],now=new Date(m.doorsteps.date+'T12:00:00Z'),parts=a.dob.split('/').map(Number),expiry=a.exp.split('/').map(Number),born=new Date(Date.UTC(parts[2],parts[0]-1,parts[1]));
    let age=now.getUTCFullYear()-born.getUTCFullYear();if(now.getUTCMonth()<born.getUTCMonth()||(now.getUTCMonth()===born.getUTCMonth()&&now.getUTCDate()<born.getUTCDate()))age--;
    return a.photoMatch&&a.idName===a.person&&age>=21&&now<=new Date(Date.UTC(expiry[2],expiry[0]-1,expiry[1],23,59));
  },
  viewID(m,id){if(!this.can(m,id)||!m.stops[id].contacted||!m._doorSpecs[id].present)return false;m.doorsteps.stops[id].idViewed=true;m.touch();return true;},
  checkID(m,id,accept){if(!this.can(m,id)||!m.doorsteps.stops[id].idViewed)return 'Check the photo ID at the door first.';m.doorsteps.stops[id].idDecision=!!accept;m.touch();return 'Your ID decision is recorded. Follow the delivery requirements.';},
  sign(m,id,name){
    if(!this.can(m,id)||!m.stops[id].contacted||!m._doorSpecs[id].present||!m.heldId||m.parcel(m.heldId).stop!==id||!m.parcel(m.heldId).loaded||!m.parcel(m.heldId).stopScanned)return 'The recipient must be present with the parcel before signing.';
    m.doorsteps.stops[id].signatureName=name;m.touch();return 'The signature and printed name are recorded.';
  },
  respond(m,id,calm){
    if(!this.can(m,id)||!m.stops[id].contacted)return 'Speak to the customer at the door first.';
    const d=m.doorsteps.stops[id];if(d.calm!==null)return 'The customer response is already recorded.';
    d.calm=!!calm;this.fire(m,'stop.difficult',id,!!calm,calm?'Acknowledged the problem and offered a clear next step.':'Argued with the customer instead of helping.');m.touch();return calm?'The customer is ready to continue calmly.':'The customer is more upset. Review your response in the debrief.';
  },
  expected(m,id){
    const a=m._doorSpecs[id],d=m.doorsteps.stops[id],s=m.stops[id];
    if(m.deliveryStops&&OTR.fpStopFlow.retention(m,id))return 'exception';
    if(a.wrong||(a.dog&&!d.dogSecured)||(a.adult&&(!this.validID(m,id)||d.idDecision===false)))return 'exception';
    return s.service==='handover'?'handover':s.service==='safeplace'?'safeplace':'exception';
  },
  assess(m,id,outcome){
    const a=m._doorSpecs[id],d=m.doorsteps.stops[id];let ok=outcome===this.expected(m,id);
    if(a.wrong)this.fire(m,'stop.wrong-address',id,outcome==='exception'&&d.addressSeen,'Checked the label against the door and recorded the address response.');
    if(a.wrong&&!d.addressSeen)ok=false;
    if(a.adult){const valid=this.validID(m,id),checked=d.idViewed&&d.idDecision===valid&&(outcome!=='handover'||valid);this.fire(m,'stop.age-check',id,checked,checked?'Checked the ID requirements before recording the outcome.':'Recorded an age-restricted outcome without completing the required photo ID check.');if(!checked)ok=false;}
    if(outcome==='handover'&&a.signature&&d.signatureName!==a.person)ok=false;
    if(a.difficult&&d.calm===null)this.fire(m,'stop.difficult',id,false,'Completed the stop without addressing the customer’s concern.');
    if(a.dog&&!d.dogSecured)this.fire(m,'stop.dog',id,outcome==='exception','Recorded the response to unsafe access with a loose dog.');
    return ok;
  },
  label(m,id){const a=m._doorSpecs[id];if(a.dog&&!m.doorsteps.stops[id].dogSecured)return 'A loose dog blocks safe access. Keep outside the gate or record an exception.';if(a.adult)return 'Photo ID and an adult signature are required. The recipient must be 21 or older.';if(a.signature&&a.present)return 'Record the recipient’s signature and printed name before handing over the parcel.';return '';},
  valid(m,d){return !!d&&typeof d.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Number.isFinite(Date.parse(d.date))&&Array.isArray(d.stops)&&d.stops.length===m.stops.length&&d.stops.every(a=>a&&['dogSecured','gateOpen','addressSeen','idViewed','hazardCleared','hazardHit'].every(k=>typeof a[k]==='boolean')&&[null,true,false].includes(a.idDecision)&&[null,true,false].includes(a.calm)&&(a.signatureName===null||typeof a.signatureName==='string'&&a.signatureName.length<100)&&(a.idDecision===null||a.idViewed));}
};
