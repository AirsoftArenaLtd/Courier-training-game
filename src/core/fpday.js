/* The generated day's weather and actionable dispatch messages. No scoring rules. */
window.OTR=window.OTR||{};
OTR.fpDay={
  conditions:{clear:{mph:25,gap:3,grip:1},cloudy:{mph:25,gap:3,grip:1},rain:{mph:18,gap:4,grip:.65},storm:{mph:12,gap:5,grip:.55},snow:{mph:10,gap:6,grip:.45},heat:{mph:20,gap:4,grip:1}},
  configure(m,saved){
    if(m.kind!=='campaign'||!m.routePlan)return;
    const source=m.routePlan.dispatch;
    m.routeDay=saved||{weather:m.routePlan.weather,distance:0,closeTime:0,fastTime:0,failed:false,heat:0,
      dispatch:source?{stop:source.stop,kind:source.kind,sent:false,read:false,resolved:false}:null};
    this.attach(m);
  },
  attach(m){
    m.traction=this.conditions[m.routeDay.weather].grip;
    const d=m.routeDay.dispatch;if(d&&d.sent&&d.kind==='signature')m.stops[d.stop].service='signature';
  },
  active(m){return m.routeDay&&m.routeDay.weather!=='clear'&&m.routeDay.weather!=='cloudy';},
  fire(m,type,key,ok,text,stop){
    const id=`day:${type}:${key}`;if(m.events[id])return;
    m.log(id,'route-day',ok?'good':'needs',text);
    if(OTR.workday)OTR.workday.report(type,{key,stop:stop===undefined?(m.phase==='route'?m.activeStop+1:undefined):stop,ok,
      where:{x:m.van.x,z:m.van.z,mph:Math.abs(m.van.speed)*2.2369362921}});
  },
  endLeg(m){
    const day=m.routeDay;if(!day)return;
    if(this.active(m)&&day.distance>15&&!day.failed)this.fire(m,'drive.weather',m.leg,true,'Adjusted speed and following distance to the weather.');
    day.distance=0;day.closeTime=0;day.fastTime=0;day.failed=false;
  },
  tick(m,dt){
    const day=m.routeDay,v=m.van;if(!day)return;
    if(m.mode==='cab'&&Math.abs(v.speed)>.3){
      day.distance+=Math.abs(v.speed)*dt;
      if(day.weather==='heat')day.heat=Math.min(1.1,day.heat+dt/180);
      if(this.active(m)){
        const c=this.conditions[day.weather],limit=Math.min(c.mph,OTR.fpRoute.limit(m));
        day.fastTime=Math.abs(v.speed)*2.2369362921>limit+.5?day.fastTime+dt:0;
        let gap=Infinity;
        if(v.speed>1)for(const car of m.traffic){
          const ahead=(car.x-v.x)*Math.sin(v.yaw)-(car.z-v.z)*Math.cos(v.yaw),side=(car.x-v.x)*Math.cos(v.yaw)+(car.z-v.z)*Math.sin(v.yaw);
          if(Math.cos(car.yaw-v.yaw)>.85&&ahead>0&&ahead<75&&Math.abs(side)<2)gap=Math.min(gap,(ahead-4.5)/v.speed);
        }
        day.closeTime=gap<c.gap?day.closeTime+dt:0;
        if(!day.failed&&(day.fastTime>1||day.closeTime>.5||day.heat>=1)){
          day.failed=true;this.fire(m,'drive.weather',m.leg,false,day.heat>=1?'Continued driving without a water and shade break.':'Speed or following distance did not suit the weather.');
        }
      }
    }else{day.fastTime=0;day.closeTime=0;}
    const d=day.dispatch;
    if(d&&!d.sent&&!m.stops[d.stop].resolved&&m.departed&&m.phase==='route'&&m.mode==='cab'&&m.activeStop===d.stop&&day.distance>10){
      d.sent=true;this.attach(m);m.dayNotice='Dispatch sent a route update. Park safely before opening the handheld.';m.touch();
    }
  },
  hint(m){const day=m.routeDay,d=day&&day.dispatch;if(d&&d.sent&&!d.read&&!d.resolved)return 'Dispatch has sent a route update. Park safely, then open Route-day updates on the handheld.';return day&&day.weather==='heat'&&day.heat>.8?'Heat exposure is building. Park safely for a water and shade break now.':'';},
  driveText(m){
    const w=m.routeDay.weather;
    return w==='snow'?'Snow reduces grip. Keep below 10 mph and leave six seconds behind traffic.':w==='storm'?'The storm reduces visibility. Keep below 12 mph and leave five seconds behind traffic.':w==='rain'?'Wet roads reduce grip. Keep below 18 mph and leave four seconds behind traffic.':w==='heat'?'Heat builds during the drive. Slow down and park safely for water and shade breaks.':'';
  },
  message(m){const d=m.routeDay.dispatch;return d.kind==='signature'?`Stop ${d.stop+1} now needs a signature. If nobody can sign, retain the parcel.`:`Stop ${d.stop+1} requests delivery behind the planter. Keep the package out of view.`;},
  read(m){
    const d=m.routeDay&&m.routeDay.dispatch;if(!d||!d.sent)return 'There is no dispatch update yet.';
    if(!m.parked())return 'Stop and set the parking brake before reading the update.';
    d.read=true;m.touch();return this.message(m);
  },
  rest(m){
    if(!m.parked())return 'Park safely before taking a water and shade break.';
    m.routeDay.heat=Math.max(0,m.routeDay.heat-.6);m.elapsed+=30;m.touch();return 'You took a water and shade break. Keep drinking regularly during the day.';
  },
  planter(m,id){const d=m.routeDay&&m.routeDay.dispatch;return !!(d&&d.sent&&d.kind==='planter'&&d.stop===id);},
  outcome(m,s,choice){
    const d=m.routeDay.dispatch;if(!d||!d.sent||d.stop!==s.id||d.resolved)return null;
    const ok=d.read&&(d.kind==='signature'?choice==='exception':choice==='planter');d.resolved=true;
    this.fire(m,'dispatch.update',s.id,ok,ok?'Followed the updated dispatch instruction at the stop.':'Missed the updated dispatch instruction at the stop.',s.id+1);return ok;
  },
  valid(m,d){
    if(!d||d.weather!==m.routePlan.weather||!this.conditions[d.weather]||typeof d.failed!=='boolean')return false;
    if(!['distance','closeTime','fastTime','heat'].every(k=>Number.isFinite(d[k])&&d[k]>=0)||d.heat>1.1)return false;
    const source=m.routePlan.dispatch,a=d.dispatch;
    if(!source)return a===null;
    return !!a&&Number.isSafeInteger(a.stop)&&a.stop===source.stop&&m.stops[a.stop]&&a.kind===source.kind&&['signature','planter'].includes(a.kind)&&['sent','read','resolved'].every(k=>typeof a[k]==='boolean')&&(!a.read||a.sent)&&(!a.resolved||a.sent);
  }
};
