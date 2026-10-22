/* One captioned dispatch call on later days. Stable delivery identities and five loaded parcels are preserved. */
window.OTR=window.OTR||{};
OTR.fpRadio={
  prepare(source){
    if(source.day<4)return source;
    const plan=OTR.fpMission.clone(source);plan.radio=1;
    if(plan.timeOfDay===undefined&&plan.day%3===0)plan.timeOfDay='night';
    return plan;
  },
  enabled(m){return !!(m&&m.kind==='campaign'&&m.routePlan&&m.routePlan.radio===1&&m.routePlan.day>=4);},
  configure(m,state){if(this.enabled(m))m.radio=state||{version:1,sent:false,read:false,accepted:false,result:null,travel:0};},
  descriptor(m){
    if(!this.enabled(m))return null;
    if(!this.descriptors)this.descriptors=new WeakMap();if(this.descriptors.has(m))return this.descriptors.get(m);
    let call;
    if(m.routePlan.day%2===0)call={kind:'priority',stop:2,address:m.stops[2].address};
    else{
      // An extra parked dispatch check-in, not another delivery or a change to the loaded manifest.
      const town=OTR.town.build(m.routePlan.townSeed),used=new Set(m.stops.map(s=>s.lotId)),scale=OTR.fpRoute.SCALE;
      for(const lot of town.lots){
        if(used.has(lot.id)||lot.kind==='school')continue;
        const park={x:(lot.park.y-town.hy[0])*scale,z:8-(lot.park.x-town.depot.x)*scale,yaw:lot.side>0?0:Math.PI};
        if(m.solids.some(b=>Math.abs(b.x-park.x)<b.w/2+1.15&&Math.abs(b.z-park.z)<b.d/2+2.9))continue;
        if(m.roadworks&&Math.abs(park.x-m.roadworks.x)<m.roadworks.w/2+4&&Math.abs(park.z-m.roadworks.z)<8)continue;
        if(OTR.fpNav&&(!OTR.fpNav.path(m,{x:2.84,z:8},park)||!OTR.fpNav.path(m,park,{x:2.84,z:8})))continue;
        call={kind:'checkin',lotId:lot.id,address:`${lot.number} ${lot.street}`,park};break;
      }
      if(!call)throw Error('No accessible dispatch check-in');
    }
    this.descriptors.set(m,call);return call;
  },
  pending(m){return !!(m&&m.radio&&m.radio.sent&&m.radio.result===null);},
  destination(m){const r=m&&m.radio;if(!r||!r.accepted||!this.pending(m))return null;const c=this.descriptor(m);return c.kind==='checkin'?c.park:null;},
  message(m){
    const c=this.descriptor(m);
    return c.kind==='priority'?`Dispatch asks you to visit ${c.address} next. Keep every other delivery on the route.`:
      `Dispatch has added a check-in stop at ${c.address}. Park at the public curb and confirm your arrival. No package is due there.`;
  },
  caption(m){
    if(!this.pending(m))return '';
    if(!m.radio.read)return 'Dispatch is calling. Park safely, then read the radio message on the handheld.';
    if(!m.radio.accepted)return 'The dispatch radio message is waiting for your response.';
    const c=this.descriptor(m);return c.kind==='priority'?`Dispatch requests ${c.address} as your next stop.`:`A dispatch check-in is pending at ${c.address}.`;
  },
  read(m){
    if(!this.pending(m))return 'There is no dispatch radio message waiting.';
    if(!m.parked())return 'Stop and set the parking brake before reading the radio message.';
    m.radio.read=true;m.touch();return this.message(m);
  },
  accept(m){
    if(!this.pending(m)||!m.radio.read)return 'Read the dispatch radio message before responding.';
    if(!m.parked())return 'Stop and set the parking brake before responding to Dispatch.';
    if(m.radio.accepted)return 'The dispatch route update is already accepted.';
    const c=this.descriptor(m);m.radio.accepted=true;
    if(c.kind==='priority')m.activeStop=c.stop;
    if(m.navigation){m.navigation.pending=null;m.navigation.context=OTR.fpNav.context(m);OTR.fpNav.reroute(m);}
    m.touch();return 'The route update is accepted. Follow the updated destination on the sat nav.';
  },
  report(m,ok){
    if(!this.pending(m))return;
    m.radio.result=ok;
    m.log('radio:r0','route-day',ok?'good':'needs',ok?'Followed the dispatch radio route update.':'Did not follow the dispatch radio route update.');
    const c=this.descriptor(m),detail={key:'r0',ok,radio:true};if(c.kind==='priority')detail.stop=c.stop+1;
    if(OTR.workday)OTR.fpMission.emit(m,'dispatch.update',detail);m.touch();
  },
  decline(m){
    if(!this.pending(m)||!m.radio.read)return 'Read the dispatch radio message before responding.';
    if(!m.parked())return 'Stop and set the parking brake before responding to Dispatch.';
    this.report(m,false);return 'Dispatch records that the route update was declined. Continue the original deliveries safely.';
  },
  arrive(m){
    if(!this.pending(m)||!m.radio.accepted)return 'Accept the dispatch route update before confirming arrival.';
    const c=this.descriptor(m);
    if(c.kind!=='checkin')return 'Complete the requested delivery before the other stops.';
    if(!m.parked()||Math.hypot(m.van.x-c.park.x,m.van.z-c.park.z)>6)return 'Park at the dispatch check-in stop and set the parking brake first.';
    this.report(m,true);if(m.navigation){m.navigation.pending=null;m.navigation.context=OTR.fpNav.context(m);OTR.fpNav.reroute(m);}
    return m.pending().length?'Dispatch has recorded your check-in. Continue the remaining deliveries.':'Dispatch has recorded your check-in. Return to the depot.';
  },
  delivered(m,id){if(this.pending(m)&&m.radio.accepted&&m.stops[id]&&m.stops[id].resolved&&this.descriptor(m).kind==='priority')this.report(m,id===this.descriptor(m).stop);},
  finish(m){if(this.pending(m))this.report(m,false);},
  tick(m,dt){
    const r=m.radio;if(!r||r.sent||m.paused||!m.departed||m.phase!=='route'||m.mode!=='cab')return;
    r.travel=Math.min(20,r.travel+Math.abs(m.van.speed)*dt);
    if(r.travel>=20){
      const c=this.descriptor(m);if(c.kind==='priority'&&m.stops[c.stop].resolved)return;
      r.sent=true;m.touch();
    }
  },
  valid(m,r,raw){
    if(!this.enabled(m))return r===undefined;
    if(!r||Object.keys(r).sort().join(',')!=='accepted,read,result,sent,travel,version'||r.version!==1)return false;
    if(!['sent','read','accepted'].every(k=>typeof r[k]==='boolean')||![null,true,false].includes(r.result)||!Number.isFinite(r.travel)||r.travel<0||r.travel>20)return false;
    if(r.read&&!r.sent||r.accepted&&!r.read||r.result!==null&&!r.read&&r.result===true||r.result===true&&!r.accepted||r.sent&&r.travel!==20)return false;
    if(!r.sent&&(r.read||r.accepted||r.result!==null))return false;
    if(raw&&r.sent&&!raw.departed)return false;
    if(raw&&r.result===true&&this.descriptor(m).kind==='priority'&&(!raw.stops||!raw.stops[this.descriptor(m).stop].resolved))return false;
    return !raw||!!raw.events&&!!raw.events['radio:r0']===(r.result!==null);
  }
};
