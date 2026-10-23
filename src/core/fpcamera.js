/* Cosmetic camera/body feel. Reused numeric state; no input smoothing, scoring or saved fields. */
window.OTR=window.OTR||{};
OTR.fpCamera={
  // Sit behind the controls rather than against the windscreen. Walking keeps its existing lens.
  seat:{x:-.45,y:2.05,z:-1.45},cabFov:76,
  create(){return {model:null,mode:null,lastTime:0,lastX:0,lastZ:0,heading:0,look:0,pitch:0,roll:0,x:0,z:0,bob:0,travel:0,kerb:false,hitAt:-100,hit:0,fov:68,reduced:false,precise:false,
    pose:{x:0,y:0,z:0,yaw:0,pitch:0,roll:0,fov:68,baseX:0,baseZ:0,bodyY:0,bodyPitch:0,bodyRoll:0,heave:0,roadImpact:0}};},
  angle(a){return Math.atan2(Math.sin(a),Math.cos(a));},
  ease(from,to,dt,rate){return from+(to-from)*(1-Math.exp(-dt*rate));},
  kerb(m){
    if(!m.town)return false;
    const v=m.van,c=Math.cos(v.yaw),s=Math.sin(v.yaw),half=m.town.road/2;
    for(let i=-1;i<=1;i+=2)for(let j=0;j<2;j++){
      const x=v.x+c*i*1.09-s*(j?1.7:-1.6),z=v.z+s*i*1.09+c*(j?1.7:-1.6);
      if(x>=1&&x<=8&&z>=-7&&z<=17)continue; // The depot apron is level with its entrance.
      let road=false;for(const cx of m.town.xs)if(Math.abs(x-cx)<=half){road=true;break;}
      if(!road)for(const cz of m.town.zs)if(Math.abs(z-cz)<=half){road=true;break;}
      if(!road)return true;
    }
    return false;
  },
  update(r,m,reduced,high,precise){
    const v=m.van,p=m.player,cab=m.mode==='cab',source=cab?v:p,x=source.x,z=source.z;
    const time=m.elapsed,elapsed=time-r.lastTime,dx=x-r.lastX,dz=z-r.lastZ,distance=Math.hypot(dx,dz);
    const reset=r.model!==m||r.mode!==m.mode||elapsed<0||distance>2||r.reduced!==reduced||r.precise!==precise;
    const dt=reset?0:Math.max(0,Math.min(.05,elapsed)),speed=cab?Math.abs(v.speed):dt?distance/dt:0;
    const amount=reduced||precise?0:.55+.45*(1-OTR.fp.driveAssist(m)),motion=m.motion;
    const acceleration=motion?motion.acceleration:0,lateral=motion?motion.lateral:0;
    const turn=cab?v.speed*Math.tan(v.steer)/3.3:0,targetLook=OTR.fp.clamp(turn*.28,-.085,.085)*amount;
    const baseFov=cab?this.cabFov:68,targetFov=baseFov+(cab?Math.min(1,speed/12)*(high?4:2)*amount:0),onKerb=cab&&this.kerb(m);
    if(reset){r.travel=0;r.hitAt=-100;r.hit=0;r.heading=v.yaw;r.look=targetLook;r.x=r.z=r.bob=0;r.pitch=r.roll=0;r.fov=targetFov;}
    else if(dt>0){
      r.travel+=distance;
      if(cab&&speed>.4&&onKerb!==r.kerb){r.hitAt=time;r.hit=Math.min(1,speed/5);}
      r.heading=this.angle(r.heading+this.angle(v.yaw-r.heading)*(1-Math.exp(-dt*9)));
      r.look=this.ease(r.look,targetLook,dt,7);r.fov=this.ease(r.fov,targetFov,dt,4);
      r.x=this.ease(r.x,cab?OTR.fp.clamp(-lateral*.006,-.03,.03)*amount:Math.sin(r.travel*2.6)*.003*Math.min(1,speed/2.5)*amount,dt,9);
      r.z=this.ease(r.z,cab?OTR.fp.clamp(acceleration*.004,-.025,.02)*amount:0,dt,8);
      r.bob=this.ease(r.bob,cab?0:Math.sin(r.travel*5.2)*.006*Math.min(1,speed/2.5)*amount,dt,12);
    }
    const age=Math.max(0,time-r.hitAt),impact=cab?r.hit*Math.exp(-age*12):0,road=cab?Math.sin(r.travel*5.2)*.0015*Math.min(1,speed/4)*amount:0;
    const joint=cab?Math.pow(Math.max(0,Math.sin(r.travel*2*Math.PI/9)),18)*.005*Math.min(1,speed/4)*amount:0;
    const bump=Math.sin(age*32)*impact*.025*amount,bodyPitch=reduced?0:motion?motion.pitch:0,bodyRoll=reduced?0:motion?motion.roll:0;
    const targetPitch=bodyPitch*.45*amount,targetRoll=bodyRoll*.5*amount;
    if(reset){r.pitch=targetPitch;r.roll=targetRoll;}else if(dt>0){r.pitch=this.ease(r.pitch,targetPitch,dt,8);r.roll=this.ease(r.roll,targetRoll,dt,8);}
    if(reduced||precise){r.heading=v.yaw;r.look=r.pitch=r.roll=r.x=r.z=r.bob=0;r.fov=baseFov;}
    const out=r.pose,c=Math.cos(v.yaw),s=Math.sin(v.yaw);out.bodyPitch=bodyPitch;out.bodyRoll=bodyRoll;out.heave=road+joint+bump;out.bodyY=bodyPitch*1.85-bodyRoll*.45+out.heave;
    // The watch-only road clips use an upright, forward observation position inside the cab.
    // Keep the dashboard anchored to the van: ground-level clues must clear its upper edge.
    const observation=cab&&!!m.hazardLesson,seatX=this.seat.x-(observation?.3:0),seatZ=this.seat.z-(observation?.35:0),seatY=this.seat.y+(observation?.35:0);
    if(cab){out.baseX=v.x+c*seatX-s*seatZ;out.baseZ=v.z+s*seatX+c*seatZ;out.x=out.baseX+c*r.x-s*r.z;out.z=out.baseZ+s*r.x+c*r.z;out.y=seatY+out.bodyY;
      out.yaw=v.yaw+this.angle(r.heading-v.yaw)*amount+v.look+r.look;out.pitch=-p.pitch+r.pitch;out.roll=r.roll;
    }else{
      const lx=c*(p.x-v.x)+s*(p.z-v.z),lz=-s*(p.x-v.x)+c*(p.z-v.z),inside=m.cargoOpen&&Math.abs(lx)<.75&&lz>-.8&&lz<2.6;
      out.x=p.x+(precise||inside?0:Math.cos(p.yaw)*r.x);out.z=p.z+(precise||inside?0:Math.sin(p.yaw)*r.x);out.y=(inside?2.15:1.65)+(precise||inside?0:r.bob);
      out.yaw=p.yaw;out.pitch=-p.pitch;out.roll=0;
    }
    out.fov=r.fov;out.roadImpact=reduced||precise?0:Math.max(impact,joint*60);
    r.model=m;r.mode=m.mode;r.lastTime=time;r.lastX=x;r.lastZ=z;r.kerb=onKerb;r.reduced=reduced;r.precise=precise;m.cameraMotion=out;return out;
  }
};
