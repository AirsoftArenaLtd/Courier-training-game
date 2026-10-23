/* Local road rules for the controllable drill; observations use the rendered street geometry. */
window.OTR=window.OTR||{};
OTR.fpDrivingLessonRules={
  attach(run){
    const s=run.model.drivingLesson;if(s.rules)return false;
    s.rules={speedT:0,hlT:0,lightsWarned:false,lightsFined:false,beltT:0,beltFined:false,wrongT:0,wheelsUp:new Uint8Array(4),
      signal:0,signalAt:0,reverse:false,reverseFined:false,contact:false,warning:'',
      approach:{index:-1,dir:0,dist:0,stopped:false,stillT:0,crossed:false,entered:false,judged:false,heading0:0,sig:0,sigFor:0,kind:'stop'},
      nearest:{index:-1,dir:0,dist:Infinity,kind:'stop'}};return true;
  },
  road(m,x,z){
    if(x>=1&&x<=8&&z>=-7&&z<=17)return true;
    const half=m.town.road/2;
    for(const at of m.town.xs)if(Math.abs(x-at)<=half)return true;
    for(const at of m.town.zs)if(Math.abs(z-at)<=half)return true;
    return false;
  },
  find(m){
    const r=m.drivingLesson.rules.nearest,v=m.van,half=m.town.road/2,c=Math.cos(v.yaw),s=Math.sin(v.yaw),layout=OTR.fpTraffic?.enabled(m)?OTR.fpTraffic.layout(m):null;
    r.index=-1;r.dist=Infinity;
    for(let i=0;i<m.junctions.length;i++){
      const j=m.junctions[i],dx=v.x-j.x,dz=v.z-j.z;if(Math.abs(dx)>half+16||Math.abs(dz)>half+16)continue;
      let dir=-1,along=0;
      if(Math.abs(dx)<half&&dz>half-.6&&c>.45){dir=0;along=dz;}
      else if(Math.abs(dx)<half&&dz<-half+.6&&c<-.45){dir=2;along=-dz;}
      else if(Math.abs(dz)<half&&dx<-half+.6&&s>.45){dir=1;along=-dx;}
      else if(Math.abs(dz)<half&&dx>half-.6&&s<-.45){dir=3;along=dx;}
      if(dir<0)continue;const dist=Math.max(0,along-half-2.7);
      if(dist<r.dist){r.index=i;r.dir=dir;r.dist=dist;r.kind=layout?layout[i].kind:'stop';}
    }
    return r;
  },
  aspect(m,a){
    if(a.kind!=='signal')return 'green';const control=OTR.fpTraffic.layout(m)[a.index];
    return OTR.fpTraffic.aspect(OTR.fpTraffic.signal(m.elapsed,control.offset),a.dir*Math.PI/2);
  },
  entry(run,a,mph,atBox){
    if(a.judged)return;
    if(a.kind==='stop'){
      if(a.stopped){a.judged=true;return;}
      if(mph>1||atBox){a.judged=true;OTR.fpDrivingLesson.violation(run,'rolling',mph>1?'Rolled through a stop sign':'Went through a stop sign without stopping behind the line','safety',2,'A stop means wheels stopped behind the line for a moment, then look both ways. Rolling stops are the classic delivery-driver citation.');}
    }else if(a.kind==='signal'){
      if(this.aspect(run.model,a)!=='red'){a.judged=true;return;}
      if(mph>1.5||atBox&&mph>.5){a.judged=true;OTR.fpDrivingLesson.violation(run,'redlight','Ran a red light','safety',4,'Red means stop, even when you are behind schedule. Intersection crashes are the worst ones.');}
    }
  },
  turn(run,a){
    const d=OTR.fpCamera?OTR.fpCamera.angle(run.model.van.yaw-a.heading0):Math.atan2(Math.sin(run.model.van.yaw-a.heading0),Math.cos(run.model.van.yaw-a.heading0));
    if(Math.abs(d)<1)return;const side=d>0?1:-1;if(a.sig===side&&a.sigFor>=3)return;
    const direction=side>0?'right':'left',late=a.sig===side;
    OTR.fpDrivingLesson.violation(run,'signal',late?`Signaled the ${direction} turn too late`:`Turned ${direction} without signaling`,'safety',1,
      OTR_DATA.workdayEvents['drive.signal'].lesson);
  },
  advance(run,seconds,oldSpeed=run.model.van.speed){
    const m=run.model,s=m.drivingLesson,r=s.rules,v=m.van;if(!r||m.paused||s.finished||m.mode!=='cab')return;
    const dt=Math.max(0,Math.min(.05,Number(seconds)||0));if(!dt)return;
    const D=OTR.fpDrivingLesson,mph=Math.abs(v.speed)*2.2369362921,limit=OTR.fpRoute.limit(m),tolerance=limit<=15?2:5;
    if(mph>limit+tolerance){r.speedT+=dt;if(r.speedT>1.2){r.speedT=0;D.violation(run,'speed',`Speeding: ${Math.round(mph)} in a ${limit}`,'safety',2,'Speed limits in residential and school zones exist because stopping distance doubles with speed. The route time you save is never worth it.');}}else r.speedT=0;
    const weather=m.routePlan.weather,lightsWanted=['rain','storm','snow','fog'].includes(weather)||['dusk','night'].includes(m.routePlan.timeOfDay);
    if(lightsWanted&&!v.headlights&&mph>3){r.hlT+=dt;if(!r.lightsWarned&&r.hlT>2){r.lightsWarned=true;r.hlT=0;r.warning='Visibility is reduced. Turn on the headlights.';}
      else if(r.lightsWarned&&r.hlT>5&&!r.lightsFined){r.hlT=0;r.lightsFined=true;D.violation(run,'lights','Driving without headlights','safety',2,'Headlights are for being seen as much as for seeing. Rain, fog, dusk and dark: lights on (L).');}}
    if(v.headlights){r.lightsFined=false;r.warning='';}if(v.belt)r.beltFined=false;
    if(!v.belt&&mph>3&&!r.beltFined){r.beltT+=dt;if(r.beltT>3){r.beltT=0;r.beltFined=true;D.violation(run,'belt','Driving without your seatbelt','safety',3,'Buckle up before you move, every single time. Couriers make hundreds of stops a day and the belt is what keeps you in the seat.');}}
    // The owner replaced mandatory G.O.A.L. with the live camera. Retain the existing backing penalty weight.
    if(v.gear===-1){if(!r.reverse){r.reverse=true;r.reverseFined=false;}if(!r.reverseFined&&(Math.max(-v.speed,-oldSpeed)>5/2.2369362921||m._rearContact||m.motion?.contact)){
      r.reverseFined=true;D.violation(run,'backing','Contacted an obstacle or exceeded 5 mph while reversing.','safety',3,'Use the rear camera and mirrors to reverse slowly. Stop if the path is not clear.');
    }}else{r.reverse=false;r.reverseFined=false;}
    const c=Math.cos(v.yaw),sn=Math.sin(v.yaw);let climbed=false;
    for(let i=0;i<4;i++){const side=i%2? .79:-.79,along=i<2?-1.6:1.7,x=v.x+c*side-sn*along,z=v.z+sn*side+c*along,up=!this.road(m,x,z);if(up&&!r.wheelsUp[i])climbed=true;r.wheelsUp[i]=Number(up);}
    if(climbed&&mph>1){v.speed*=mph>8?.8:.88;D.violation(run,'kerb','Drove over the curb','safety',2,"Sidewalks are for people. Swing wider and slower on right turns — a step van's rear wheels cut inside the front ones.");}
    let nearX,nearZ;for(const at of m.town.xs)if(Math.abs(v.x-at)<m.town.road/2){nearX=at;break;}for(const at of m.town.zs)if(Math.abs(v.z-at)<m.town.road/2){nearZ=at;break;}
    let wrong=false;if(mph>6&&!(nearX!==undefined&&nearZ!==undefined)){
      if(nearX!==undefined)wrong=c>.6&&v.x<nearX||c<-.6&&v.x>=nearX;
      else if(nearZ!==undefined)wrong=sn>.6&&v.z<nearZ||sn<-.6&&v.z>=nearZ;
    }
    if(wrong){r.wrongT+=dt;if(r.wrongT>1.6){r.wrongT=0;D.violation(run,'wrongside','Driving on the wrong side of the road','safety',3,'Stay in the right-hand lane. Cutting across to save a turn is how head-on collisions happen.');}}else r.wrongT=0;
    if(r.signal!==m.signal){r.signal=m.signal;const clock=m.driving?.signalClock;r.signalAt=clock&&clock[0]===m.signal?clock[1]:m.elapsed;}
    const a=r.approach,ap=this.find(m),half=m.town.road/2;
    if(ap.index>=0&&!a.entered){
      if(a.index!==ap.index||a.dir!==ap.dir)Object.assign(a,{index:ap.index,dir:ap.dir,kind:ap.kind,dist:ap.dist,stopped:false,stillT:0,crossed:false,entered:false,judged:false});
      a.dist=ap.dist;const behind=a.dist>=.25-.04;
      if(Math.abs(v.speed)<.1&&behind&&a.dist<.25+8.5){a.stillT+=dt;if(a.stillT>=.5)a.stopped=true;}else if(Math.abs(v.speed)>=.1)a.stillT=0;
      if(!a.crossed&&a.dist<.25){a.crossed=true;this.entry(run,a,mph,false);}
    }
    if(a.index>=0){const j=m.junctions[a.index],inside=Math.abs(v.x-j.x)<half+.3&&Math.abs(v.z-j.z)<half+.3;
      if(inside&&!a.entered){a.entered=true;a.heading0=v.yaw;a.sig=m.signal;a.sigFor=m.signal?m.elapsed-r.signalAt:0;this.entry(run,a,mph,true);}
      const far=Math.abs(v.x-j.x)>half+11.5||Math.abs(v.z-j.z)>half+11.5;
      if(a.entered&&!inside&&far){this.turn(run,a);a.index=-1;a.entered=false;}
    }
    const contact=!!m.motion?.contact||m._rearContact;if(contact&&!r.contact){const impact=Math.abs(oldSpeed),levels=OTR_DATA.vehicle?.impact||{incident:1.8,serious:4.5};
      if(impact>=levels.incident)D.violation(run,'crash',`The van hit an obstacle at ${Math.max(1,Math.round(impact*2.2369362921))} mph.`,'safety',impact>=levels.serious?4:2,'Most delivery collisions happen under 15 mph, backing or squeezing through gaps. Slow down and take the wider line.');
    }r.contact=contact;
  }
};
