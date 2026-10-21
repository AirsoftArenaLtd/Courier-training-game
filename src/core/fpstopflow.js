/* Campaign adapter for richer stops. No points, shared saves or renderer state. */
window.OTR=window.OTR||{};
OTR.fpStopFlow={
  prepare(source,authoriseLocker=false){
    if(!source||source.day<3)return source;
    const plan=Object.assign({},source,{deliveries:1});
    // Only a new scene plan opts in, before later-day signature/ID rules. Older plans stay unchanged.
    if(!authoriseLocker||source.later===1||source.deliveries!==undefined)return plan;
    for(const kind of ['business','apartment','leave']){
      const id=plan.route.findIndex((r,i)=>r.type===kind&&r.stop.packages[0].service==='standard'&&!r.stop.dog&&(!plan.dispatch||plan.dispatch.stop!==i));
      if(id>=0){plan.lockerStop=id;break;}
    }
    return plan;
  },
  validLocker(plan){
    if(plan.lockerStop===undefined)return true;
    const id=plan.lockerStop,r=Number.isSafeInteger(id)&&plan.route&&plan.route[id];
    return !!(plan.deliveries===1&&plan.day>=3&&id>=0&&id<5&&r&&(r.type==='business'||r.type==='apartment'||r.type==='leave')&&
      r.stop&&!r.stop.dog&&Array.isArray(r.stop.packages)&&r.stop.packages.length===1&&r.stop.packages[0]&&
      r.stop.packages[0].service==='standard'&&(!plan.dispatch||plan.dispatch.stop!==id));
  },
  authorised(m,id){return Number.isSafeInteger(id)&&this.enabled(m)&&m.routePlan.lockerStop===id&&this.validLocker(m.routePlan);},
  brief(m){
    const id=m.routePlan&&m.routePlan.lockerStop;
    return this.authorised(m,id)?`Stop ${id+1} at ${m.stops[id].address} is an authorized locker drop. Use its assigned compartment.`:'';
  },
  enabled(m){return m.kind==='campaign'&&m.routePlan&&m.routePlan.deliveries===1&&m.routePlan.day>=3;},
  specs(m){
    const town=OTR.town.build(m.routePlan.townSeed),dispatch=m.routePlan.dispatch,obstacles=OTR.fpNav?OTR.fpNav.obstacles(m):[];let gated=false,locker=false;
    return m.stops.map((s,i)=>{
      const a=m._doorSpecs[i],lot=town.lotById(s.lotId),parcel=m.parcels[i].id;
      const reason=a.wrong?'address':a.adult&&!OTR.fpDoors.validID(m,i)?'id':a.dog?'access':!a.present?'absent':'access';
      const entry={protocol:null,gated:false,reattempt:{kind:'reattempt',parcel,day:m.routePlan.day,nextDay:m.routePlan.day+1,slot:'afternoon',reason}};
      if(this.authorised(m,i))entry.protocol={kind:'locker',parcel,compartment:String(10+s.id)};
      else if(lot.kind==='apartment'){
        const pkg=m.routePlan.route[i].stop.packages[0];
        entry.protocol={kind:'intercom',parcel,button:String(pkg.unit||pkg.to),available:a.present};
      }
      else if(lot.kind==='business'&&a.present&&!a.adult)entry.protocol={kind:'reception',parcel,recipient:a.person,receptionist:a.person,signature:a.signature};
      else if(!a.dog&&!a.wrong&&!a.adult&&!(dispatch&&dispatch.stop===i)){
        if(!locker&&!a.present&&!a.signature&&s.service==='safeplace'){
          locker=true;entry.protocol={kind:'locker',parcel,compartment:String(10+s.id)};
        }else if(!gated&&a.present&&m.seed%2===0&&!obstacles.some(o=>o.driveway&&o.stop===i)){
          gated=true;entry.gated=true;entry.protocol={kind:'intercom',parcel,button:a.person,available:true};
        }
      }
      return entry;
    });
  },
  configure(m,saved){
    if(!this.enabled(m)||!m.doorsteps)return;
    m._deliverySpecs=this.specs(m);
    m._deliveryPoints=null;m._deliveryPoints=m._deliverySpecs.map((_,i)=>this.point(m,i));
    m.deliveryStops=saved||{version:1,stops:m._deliverySpecs.map(a=>({protocol:a.protocol?OTR.fpStops.create(a.protocol):null,reattempt:OTR.fpStops.create(a.reattempt)}))};
    this.attach(m);
  },
  point(m,id){
    if(m._deliveryPoints&&m._deliveryPoints[id])return m._deliveryPoints[id];
    const s=m.stops[id],a=m._deliverySpecs&&m._deliverySpecs[id];if(!s||!a)return null;
    return {x:s.x-s.side*(a.gated?2.85:a.protocol&&['locker','reception'].includes(a.protocol.kind)?.98:.16),y:1.35,z:s.z+(a.gated?1.1:a.protocol&&a.protocol.kind==='locker'?1.65:.9)};
  },
  inLocker(m,p){const d=p&&m.deliveryStops&&m.deliveryStops.stops[p.stop];return !!(d&&d.protocol&&d.protocol.kind==='locker'&&d.protocol.deposited);},
  parcelPoint(m,p){const s=m.stops[p.stop];return {x:s.x-s.side*.55,y:.75,z:s.z+1.65};},
  lockerDoor(m,id,open){const s=m.stops[id];return {x:s.x-s.side*(open?1.53:.98),y:.9,z:s.z+(open?2.2:1.65),yaw:open?s.side*Math.PI/2:0,w:open?1.1:.06,d:open?.06:1.1};},
  near(m,id){return !!m.deliveryStops&&m.near('visit'+id);},
  attach(m){
    if(!m._deliverySolids)m._deliverySolids=m._deliverySpecs.map((a,i)=>{
      if(!a.gated)return null;const s=m.stops[i],gate={x:s.x-s.side*2.6,z:s.z,w:.16,d:4.8,h:1.25};
      m.solids.push(gate,...[-3.1,3.1].map(dz=>({x:gate.x,z:s.z+dz,w:.16,d:1.4,h:1.25})),
        ...[-3.8,3.8].map(dz=>({x:s.x-s.side*1.3,z:s.z+dz,w:2.6,d:.16,h:1.25})));return gate;
    });
    if(!m._deliveryFurniture)m._deliveryFurniture=m._deliverySpecs.map((a,i)=>{
      if(!a.protocol||!['locker','reception'].includes(a.protocol.kind))return null;const s=m.stops[i],locker=a.protocol.kind==='locker';
      const body={x:s.x-s.side*.55,z:s.z+(locker?1.65:.9),w:.8,d:locker?1.3:1.4,h:locker?1.55:.95};m.solids.push(body);
      if(!locker)return {body};const door={x:0,z:0,w:0,d:0,h:1.2};m.solids.push(door);return {body,door};
    });
    this.sync(m);
  },
  sync(m){
    for(let i=0;i<m.stops.length;i++)if(m._deliverySolids[i])m._deliverySolids[i].x=m.deliveryStops.stops[i].protocol.opened?1e6:m.stops[i].x-m.stops[i].side*2.6;
    for(let i=0;i<m.stops.length;i++){const a=m._deliveryFurniture[i];if(a&&a.door){const d=this.lockerDoor(m,i,m.deliveryStops.stops[i].protocol.open);Object.assign(a.door,{x:d.x,z:d.z,w:d.w,d:d.d});}}
  },
  can(m,id){
    const s=m.stops[id];return !!(m.deliveryStops&&s&&!s.resolved&&m.mode==='walk'&&m.parked()&&
      Math.hypot(m.van.x-s.x,m.van.z-s.z)<18&&OTR.fpDoors.near(m,id));
  },
  contact(m,id){
    const a=m._deliverySpecs[id].protocol,s=m.deliveryStops.stops[id].protocol;
    if(!a||a.kind!=='intercom'||s.opened)return '';
    if(!a.available&&s.callValid&&s.calledAt!==null&&m.elapsed>=s.calledAt+8)return '';
    return 'Use the intercom and wait for a reply before attempting this delivery.';
  },
  retention(m,id){const a=m._deliverySpecs[id].protocol;return !!(a&&a.kind==='intercom'&&!a.available);},
  beginException(m,id){
    if(!this.can(m,id))return 'Park safely and approach this delivery point on foot.';
    const a=m._deliverySpecs[id].protocol,d=m.deliveryStops.stops[id].protocol;
    if(a&&a.kind==='intercom'&&!d.opened){
      if(!d.callValid||d.calledAt===null||m.elapsed<d.calledAt+8)return 'Call the matching entry and wait for a reply before recording a failed attempt.';
      m.stops[id].contacted=true;m.touch();return '';
    }
    if(!m.stops[id].contacted)m.contact(id);return '';
  },
  act(m,id,command,value){
    m._deliveryActionOK=false;
    if(!this.can(m,id))return 'Park safely and approach this delivery point on foot.';
    const [kind,action]=command.split('.'),a=m._deliverySpecs[id],d=m.deliveryStops.stops[id],spec=kind==='reattempt'?a.reattempt:a.protocol;
    if(!spec||spec.kind!==kind)return 'This action is not available at this delivery point.';
    if(kind==='reattempt'&&!m.stops[id].contacted)return 'Attempt contact before recording a failed delivery.';
    const p=m.parcel(m.heldId),hasParcel=p&&p.id===spec.parcel&&p.loaded&&p.stopScanned;
    if((kind==='locker'&&['scan','deposit','photo'].includes(action)||kind==='reception'&&['sign','handover'].includes(action)||kind==='reattempt'&&['retain','book'].includes(action))&&!hasParcel)
      return 'Retrieve and scan the matching parcel at this stop first.';
    if(kind==='reattempt'&&['retain','book'].includes(action)&&this.inLocker(m,p))return 'Open the locker and retrieve the parcel before recording retention.';
    if(kind==='reception'&&!m.stops[id].contacted)return 'Speak to the person at reception before recording a handover.';
    if(kind==='locker'&&action==='scan'&&value===spec.parcel)m.scan(p.id);
    const state=kind==='reattempt'?d.reattempt:d.protocol,ok=OTR.fpStops.act(state,spec,action,value,m.elapsed);
    m._deliveryActionOK=ok;
    if(kind==='reception'&&action==='sign'&&ok)OTR.fpDoors.sign(m,id,value);
    if(kind==='intercom'&&action==='call'&&ok){m.stops[id].contacted=false;m._deliveryBuzzMask=(m._deliveryBuzzMask||0)&~(1<<id);}
    this.sync(m);m.touch();
    if(!ok)return 'That action does not meet the delivery requirements. Check the instructions and try again.';
    return kind==='intercom'?(action==='call'?'Your call is connected. Wait for the entry buzz or a reply.':'The entry is unlocked. You may approach the recipient.'):
      kind==='reception'?(action==='handover'?'The named recipient is ready. Record the delivery outcome.':'The reception details are recorded.'):
      kind==='locker'?(action==='photo'?'The closed locker door is photographed. Record the delivery outcome.':'The locker action is recorded. Follow the remaining steps.'):
      action==='book'?'The next attempt is booked. Record the exception and keep the parcel for return.':'The failed-delivery step is recorded. Complete the card, retention and booking.';
  },
  guard(m,id,outcome){
    const a=m._deliverySpecs[id].protocol,d=m.deliveryStops.stops[id].protocol;
    if(outcome==='exception'&&a&&a.kind==='locker'&&d.deposited)return 'Open the locker and retrieve the parcel before recording an exception.';
    if(outcome==='exception'||!a)return '';
    if(a.kind==='intercom'&&!d.opened)return 'Wait for the intercom buzz and unlock the entry before delivering.';
    if(a.kind==='reception'&&(outcome!=='handover'||!d.handed))return 'Complete the named reception handover before recording delivery.';
    if(a.kind==='locker'&&(outcome!=='safeplace'||!OTR.fpStops.assessment(d).complete))return 'Use the assigned locker, scan the parcel, close the door and take the photo before recording delivery.';
    return '';
  },
  fire(m,id,state){
    const result=OTR.fpStops.assessment(state),key=`visit:${result.type}:${id}`;if(m.events[key])return;
    m.log(key,'doorstep',result.ok?'good':'needs',result.ok?'Completed the delivery-point requirements.':'Completed the stop without meeting the delivery-point requirements.');
    if(OTR.workday)OTR.workday.report(result.type,{key:id,stop:id+1,ok:result.ok,where:result.ok?undefined:{x:m.player.x,z:m.player.z}});
  },
  resolve(m,id,outcome){
    const a=m._deliverySpecs[id].protocol,d=m.deliveryStops.stops[id];
    if(a&&(outcome!=='exception'||d.protocol.failed||OTR.fpStops.assessment(d.protocol).complete))this.fire(m,id,d.protocol);
    if(outcome==='exception')this.fire(m,id,d.reattempt);
  },
  valid(m,data,raw){
    if(!this.enabled(m)||!m.doorsteps||!data||data.version!==1||!Array.isArray(data.stops)||data.stops.length!==m.stops.length||Object.keys(data).length!==2)return false;
    const specs=this.specs(m);
    return data.stops.every((d,i)=>{
      const a=specs[i];if(!d||Object.keys(d).length!==2||!OTR.fpStops.valid(d.reattempt,a.reattempt,raw.elapsed))return false;
      if(a.protocol?!OTR.fpStops.valid(d.protocol,a.protocol,raw.elapsed):d.protocol!==null)return false;
      const s=raw.stops&&raw.stops[i],p=raw.parcels&&raw.parcels[i];
      if(!s||!p)return false;
      if(s.resolved&&s.outcome!=='exception'&&a.protocol&&!OTR.fpStops.assessment(d.protocol).complete)return false;
      if(a.protocol&&a.protocol.kind==='locker'&&d.protocol.deposited&&
        (s.resolved?s.outcome!=='safeplace'||p.location!=='delivered':p.location!=='held'||raw.heldId!==p.id))return false;
      return true;
    });
  }
};
