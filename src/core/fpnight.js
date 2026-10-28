/* Later-day headlights: one existing contract check per driven leg, with bounded checkpoint state. */
window.OTR=window.OTR||{};
OTR.fpNight={
  enabled(m){return !!(OTR.fpRadio&&OTR.fpRadio.enabled(m));},
  configure(m,state){if(this.enabled(m))m.nightDrive=state||{version:1,leg:0,required:false,failed:false};},
  required(m){
    if(!m||!m.routePlan)return false;
    const time=OTR.fpLighting?OTR.fpLighting.time(m):m.routePlan.timeOfDay,
      weather=m.routeDay?m.routeDay.weather:m.routePlan.weather;
    return time==='night'||time==='dusk'||weather==='fog'||weather==='storm';
  },
  report(m,ok){
    const key=m.nightDrive.leg,id='night:'+key;if(m.events[id])return;
    m.log(id,'driving',ok?'good':'needs',ok?'Used the headlights when visibility required them.':'Moved without headlights when visibility required them.');
    const detail={key,ok};if(m.phase==='route')detail.stop=m.activeStop+1;
    if(!ok)detail.where={x:m.van.x,z:m.van.z,mph:Math.abs(m.van.speed)*2.2369362921};
    if(OTR.workday)OTR.fpMission.emit(m,'drive.lights',detail);
  },
  tick(m){
    const n=m.nightDrive;if(!n||m.paused)return;
    if(n.leg!==m.leg){n.leg=m.leg;n.required=false;n.failed=false;}
    if(m.mode!=='cab'||Math.abs(m.van.speed)<=.3||!this.required(m))return;
    n.required=true;
    if(!m.van.headlights&&!n.failed){n.failed=true;this.report(m,false);m.touch();}
  },
  endLeg(m){const n=m.nightDrive;if(n&&n.required&&!n.failed)this.report(m,true);},
  valid(m,n,raw){
    if(!this.enabled(m))return n===undefined;
    return !!n&&Object.keys(n).sort().join(',')==='failed,leg,required,version'&&n.version===1&&Number.isSafeInteger(n.leg)&&n.leg>=0&&n.leg<=raw.leg&&typeof n.required==='boolean'&&typeof n.failed==='boolean'&&(!n.failed||n.required&&!!raw.events['night:'+n.leg]);
  },
  glare(m,out,reduced){
    out.x=.5;out.y=.35;out.strength=0;
    if(reduced||m.mode!=='cab'||!this.required(m)||!OTR.fpLighting||OTR.fpLighting.time(m)!=='night')return out;
    const v=m.van,s=Math.sin(v.yaw),c=Math.cos(v.yaw);
    for(const car of m.traffic){
      const dx=car.x-v.x,dz=car.z-v.z,ahead=dx*s-dz*c,across=dx*c+dz*s;
      if(ahead<7||ahead>55||Math.abs(across)>9||Math.cos(car.yaw-v.yaw)>-.7)continue;
      const strength=.14*(1-Math.abs(across)/12)*(1-Math.abs(ahead-22)/40);
      if(strength>out.strength){out.strength=strength;out.x=Math.max(.08,Math.min(.92,.5+across/ahead*.65));}
    }
    return out;
  }
};
