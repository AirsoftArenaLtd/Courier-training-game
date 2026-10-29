/* One bounded physical hazard controller for the existing six-checkpoint driving drill. */
window.OTR=window.OTR||{};
OTR.fpDrivingLessonHazards={
  expiry:{phone:17,ball:15,door:18,water:30,crosswalk:26,bus:26},
  attach(run){
    const m=run.model,s=m.drivingLesson,far=1e6;if(s.hazard)return false;
    s.hazard={active:false,kind:null,t:0,ending:0,judged:false,personVisible:false,ballVisible:false,phone:false,doorReach:0,armOut:false,
      carBox:{x:far,z:far,w:1.8,d:4.3,h:1.5},busBox:{x:far,z:far,w:2.6,d:12,h:3.4},
      observation:{fd:0,lat:0,vanLength:5.4,mph:0,child:false,arrived:false,touching:false,opened:false,gap:0,distance:0,brake:false,steer:0,throttle:false,handheld:false,armOut:false}};
    m.solids.push(s.hazard.carBox,s.hazard.busBox);m.crossing.state='resolved';m.crossing.x=far;m.tickCrossing=()=>{};
    const step=m.step;m.step=(input,seconds)=>{if(m.paused)return;const before=m.elapsed;step.call(m,input,seconds);this.advance(run,input,m.elapsed-before);};return true;
  },
  relative(v,x,z,o){const dx=x-v.x,dz=z-v.z,c=Math.cos(v.yaw),s=Math.sin(v.yaw);o.fd=dx*s-dz*c-2.7;o.lat=dx*c+dz*s;},
  hide(m){const h=m.drivingLesson.hazard;h.active=false;h.personVisible=h.ballVisible=h.armOut=false;h.carBox.x=h.carBox.z=h.busBox.x=h.busBox.z=1e6;m.traction=h.traction??1;},
  arm(run){
    const m=run.model,s=m.drivingLesson,h=s.hazard,def=s.byCheckpoint[s.checkpoint],stop=m.stops[s.checkpoint],v=m.van;
    if(!def||s.armed[def.id]||!stop||s.finished||h.active)return false;
    const bounds=m.bounds;if(v.x<bounds.x0+2.7||v.x>bounds.x1-2.7||v.z<bounds.z0+2.7||v.z>bounds.z1-2.7)return false;
    const dir=stop.side,street=stop.bay.streetX,speed=Math.abs(v.speed),distance=Math.max(12,Math.min(25,10+speed*1.25));
    if(def.kind!=='phone'){
      if(Math.abs(v.x-street)>m.town.road/2||Math.cos(v.yaw)*dir<.85||speed*2.2369362921<5)return false;
      for(const z of m.town.zs)if(Math.abs(v.z-z)<m.town.road/2+2.5)return false;
      const z=v.z-dir*distance;if(z<bounds.z0+6||z>bounds.z1-6||(z-stop.park.z)*dir<3)return false;for(const j of m.town.zs)if(Math.abs(z-j)<m.town.road/2+7.5)return false;
    }
    Object.assign(h,{active:true,kind:def.kind,id:def.id,t:0,ending:0,judged:false,wait:0,hold:0,bad:0,tIn:0,inside:false,minMph:99,reached:false,
      x:street+dir*m.town.road/4,z:v.z-dir*distance,yaw:dir>0?0:Math.PI,dir,street,personX:0,personZ:0,personVisible:false,ballX:0,ballZ:0,ballVisible:false,doorReach:0,opened:false,armOut:false,phone:false,traction:m.traction??1,baseline:s.violations.handheld||0});
    s.armed[def.id]=true;return true;
  },
  handheld(run){
    const m=run.model;if(m.parked())return false;const moving=Math.abs(m.van.speed)*2.2369362921>2;
    return OTR.fpDrivingLesson.violation(run,'handheld',moving?'Using the handheld while moving':'Using the handheld at the wheel (not parked)','safety',moving?2:1,moving?'The handheld waits until you are parked. Screen time at the wheel is how couriers hit things.':'Not at a light, not in traffic: the handheld waits until you are parked at the stop (P).');
  },
  advance(run,input={},seconds){
    const m=run.model,s=m.drivingLesson,h=s.hazard;if(!h||m.paused||s.finished)return;
    const dt=Math.max(0,Math.min(.05,Number(seconds)||0));if(!dt)return;
    if(!h.active&&!this.arm(run))return;
    h.t+=dt;const o=h.observation,v=m.van;
    if(h.judged){h.ending+=dt;if(h.kind==='ball'&&h.outcome)h.personX+=h.dir*dt*2;if(h.kind==='door')h.doorReach=Math.max(0,h.doorReach-dt*2.5);h.armOut=false;if(h.ending>2.6)this.hide(m);return;}
    h.personVisible=h.ballVisible=h.phone=false;
    o.mph=Math.abs(v.speed)*2.2369362921;o.brake=!!input.back||v.hand;o.steer=Number(!!input.right)-Number(!!input.left);o.throttle=!!input.forward;o.child=o.arrived=o.touching=o.opened=o.armOut=false;
    this.relative(v,h.x,h.z,o);if(o.fd<7.5||h.kind==='phone')h.reached=true;if(h.reached)h.minMph=Math.min(h.minMph,o.mph);
    if(h.kind==='phone')o.handheld=(s.violations.handheld||0)>h.baseline;
    if(h.kind==='ball'){
      h.ballVisible=true;h.ballX=h.x+h.dir*(11.5-Math.min(24.5,h.t*24.5/2.1));h.ballZ=h.z;
      h.personVisible=h.t>.85;h.personX=h.x+h.dir*(11.5-Math.min(13,Math.max(0,h.t-.85)*4.75));h.personZ=h.z;o.child=h.personVisible;o.arrived=h.t>.85+13/4.75;
      if(o.child){this.relative(v,h.personX,h.personZ,o);o.touching=Math.abs(o.fd+2.7)<2.7+.3&&Math.abs(o.lat)<1.08+.3;}
    }
    if(h.kind==='door'){
      h.carX=h.street+h.dir*(m.town.road/2-1.5);h.carZ=h.z;h.carBox.x=h.carX;h.carBox.z=h.z;
      this.relative(v,h.carX,h.z,o);if(o.fd<12||h.t>1.6)h.opened=true;if(h.opened)h.doorReach=Math.min(1,h.doorReach+dt/.42);
      o.opened=h.opened;o.gap=Math.abs(o.lat)-.95-h.doorReach-1.08;
    }
    if(h.kind==='water'){
      o.distance=Math.hypot(h.x-v.x,h.z-v.z);if(o.distance<6)m.traction=Math.max(.2,Math.min(1,1-(o.mph-8)/20))*.8;else m.traction=h.traction;
    }
    if(h.kind==='crosswalk'){
      h.personVisible=true;h.phone=true;h.personX=h.x+h.dir*(10.5-Math.min(22,h.t*1.8));h.personZ=h.z;o.arrived=h.t>=22/1.8;
      this.relative(v,h.personX,h.personZ,o);o.touching=Math.abs(o.fd+2.7)<2.7+.3&&Math.abs(o.lat)<1.08+.3;
    }
    if(h.kind==='bus'){
      h.busX=h.street-h.dir*m.town.road/4;h.busZ=h.z;h.busBox.x=h.busX;h.busBox.z=h.z;
      this.relative(v,h.busX,h.z,o);o.gap=o.fd-6;if(o.gap<19||h.t>.8)h.armOut=true;o.armOut=h.armOut;
    }
    let verdict=OTR.fpDrivingLesson.verdict(h,o,dt);const expiry=this.expiry[h.kind];
    if(!verdict&&h.t>expiry){if(!h.reached){s.armed[h.id]=false;this.hide(m);return;}verdict=h.minMph<9?1:-1;}
    if(verdict){const def=s.byId[h.id];OTR.fpDrivingLesson.judge(run,h.id,verdict===1,verdict<-1?def.hit:undefined,verdict<-1?-verdict:0);h.judged=true;h.outcome=verdict===1;h.ending=0;h.armOut=false;m.traction=h.traction;}
  }
};
