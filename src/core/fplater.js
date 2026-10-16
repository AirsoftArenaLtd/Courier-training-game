/* Later workdays: deterministic practice plans, never points or deadline penalties. */
window.OTR=window.OTR||{};
OTR.fpLater={
  weather(day){return ['fog','rain','ice'][(day-2)%3];},
  prepare(source){
    if(source.day<2)return source;
    const plan=OTR.fpMission.clone(source);plan.later=1;plan.weather=this.weather(plan.day);
    const present=plan.route.filter(r=>r.stop.answer);
    plan.route.forEach(r=>{const p=r.stop.packages[0];p.service='signature';delete p.note;});
    present.slice(0,plan.day>=3?2:1).forEach(r=>{r.stop.packages[0].service='adult';});
    // Generation always has an absent leave-at-door stop; keep that recipient absent and require retention.
    if(plan.dispatch)plan.dispatch.kind='signature';
    return plan;
  },
  enabled(m){return !!(m.routePlan&&m.routePlan.later===1);},
  layout(m){
    if(m.routePlan&&m.routePlan.later!==undefined&&m.routePlan.later!==1)throw Error('Invalid later-day version');
    if(!this.enabled(m))return;
    if(m.routePlan.day<2||m.routePlan.weather!==this.weather(m.routePlan.day))throw Error('Invalid later-day plan');
    const t=m.town;
    for(const x of t.xs.slice(1))for(let i=0;i<t.zs.length-1;i++){
      const z=(t.zs[i]+t.zs[i+1])/2,w=t.road+2.8;
      if(m.roadworks||m.stops.some(s=>Math.abs(s.park.x-x)<w/2+4&&Math.abs(s.park.z-z)<12))continue;
      m.roadworks={x,z,w,d:1,h:1.1,from:i,to:i+1};m.solids.push(m.roadworks);
    }
    if(!m.roadworks)throw Error('No accessible road-works location');
  },
  configure(m){if(this.enabled(m))m.routeDay.later={departAt:null,arrivals:m.stops.map(()=>null)};},
  valid(m,d,raw){
    if(!d)return false;
    if(!this.enabled(m))return d.later===undefined;
    const a=d.later;if(!a||!Array.isArray(a.arrivals)||a.arrivals.length!==5)return false;
    const time=v=>v===null||Number.isFinite(v)&&v>=0&&(!raw||v<=raw.elapsed);
    return time(a.departAt)&&a.arrivals.every((v,i)=>time(v)&&(v===null||a.departAt!==null&&v>=a.departAt)&&(!raw||raw.stops&&raw.stops[i]&&raw.stops[i].resolved===(v!==null)))&&(!raw||raw.departed===(a.departAt!==null));
  },
  depart(m){if(this.enabled(m)&&m.routeDay&&m.routeDay.later.departAt===null)m.routeDay.later.departAt=m.elapsed;},
  arrive(m,id){if(this.enabled(m)&&m.routeDay)m.routeDay.later.arrivals[id]=m.elapsed;},
  window(m,id){const day=m.routePlan.day,interval=day===2?7:day===3?6:5,width=day===2?4:day===3?3:2,end=(id+1)*interval;return {start:end-width,end};},
  windowText(m,id){const w=this.window(m,id);return `Plan stop ${id+1} for ${w.start} to ${w.end} minutes after leaving the depot.`;},
  status(m,id){
    const a=m.routeDay.later;if(a.departAt===null)return 'The planning clock starts when the van first leaves the depot.';
    const at=a.arrivals[id],minutes=Math.max(0,((at===null?m.elapsed:at)-a.departAt)/60),w=this.window(m,id);
    if(at!==null)return `This stop was recorded ${Math.floor(minutes)} minutes after departure.`;
    if(minutes>w.end)return 'The practice window has passed. Continue safely and discuss the delay with Dispatch.';
    return `The planning clock shows ${Math.floor(minutes)} minutes since departure.`;
  },
  open(scene,page=-1){
    const m=scene.model;if(!this.enabled(m))return;
    const body=page<0?[`The forecast is ${m.routeDay.weather}.`,'Every package needs a signature. Check the label for photo ID requirements.','Road works close the red-marked street on the route map. Use another cross street.','Practice windows guide planning and do not affect the score. Safety comes first.'].join('\n\n'):
      [m.stops[page].address,m.serviceLabel(page),this.windowText(m,page),this.status(m,page)].join('\n\n');
    const choices=[];if(page<4)choices.push({label:page<0?'View the stop windows':'Next stop',action:()=>this.open(scene,page+1)});
    if(page>=0)choices.push({label:'Previous',action:()=>this.open(scene,page-1)});
    choices.push({label:'Back',action:()=>scene.closePanel()});scene.showPanel('Your workday plan',body,choices,{back:()=>scene.closePanel()});
  }
};
