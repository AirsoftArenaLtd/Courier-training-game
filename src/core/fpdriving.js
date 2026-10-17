/* Driving observations and bounded live hazards. Scores belong to workday.report. */
window.OTR = window.OTR || {};
OTR.fpDriving = {
  configure(m) {
    if(!['campaign','parking'].includes(m.kind)||m.driving)return;
    m.driving={mirrorDone:false,mirrorCount:0,followingSeen:false,followingFailed:false,closeTime:0,
      goalAt:-100,goalX:0,goalZ:0,goalYaw:0,goalClear:false,reverseActive:false,reverseSafe:false,reverseCount:0,
      bus:{state:'waiting',x:0,z:0,yaw:0,clock:0,hold:0,passed:false},
      siren:{state:'waiting',x:0,z:0,yaw:0,clock:0,yielded:false,road:0,offset:1.3}};
    this.attach(m);
  },
  attach(m) {
    if(!m._driveSolids){
      m._driveSolids={bus:{x:1e6,z:1e6,w:2.4,d:7.6,h:3},siren:{x:1e6,z:1e6,w:1.45,d:4,h:1.8}};
      m._drivePose={x:0,z:0,yaw:0};m._driveNext={x:0,z:0,w:0,d:0};m.solids.push(m._driveSolids.bus,m._driveSolids.siren);
    }
    this.syncActors(m);
  },
  syncActor(a,b,width,length){
    const active=a.state!=='waiting'&&a.state!=='done',vertical=Math.abs(Math.cos(a.yaw))>0.7;
    b.x=active?a.x:1e6;b.z=active?a.z:1e6;b.w=vertical?width:length;b.d=vertical?length:width;
  },
  syncActors(m) {
    this.syncActor(m.driving.bus,m._driveSolids.bus,2.4,7.6);
    this.syncActor(m.driving.siren,m._driveSolids.siren,1.45,4);
  },
  fire(m,type,key,ok,text,extra) {
    const id=`driver:${type}:${key}`;if(m.events[id])return;
    m.log(id,'driving',ok?'good':'needs',text);
    if(OTR.workday&&m.kind!=='parking')OTR.workday.report(type,{key,ok,stop:m.phase==='route'?m.activeStop+1:undefined,...extra,
      where:{x:m.van.x,z:m.van.z,mph:Math.abs(m.van.speed)*2.2369362921}});
  },
  endLeg(m) {
    const d=m.driving;if(!d)return;
    if(OTR.fpRear)OTR.fpRear.finish(m);
    if(d.followingSeen&&!d.followingFailed)this.fire(m,'drive.following',m.leg,true,'Kept a three-second following gap on this leg.');
    d.mirrorDone=false;d.followingSeen=false;d.followingFailed=false;d.closeTime=0;
    d.reverseActive=false;d.reverseSafe=false;d.goalAt=-100;d.goalClear=false;if(d.mirrorTurn)d.mirrorTurn[0]=0;
  },
  checkGoal(m) {
    const d=m.driving,v=m.van;if(!d||m.mode!=='walk'||!m.parked()||m.heldId)return 'Park the van and get out before checking the reversing path.';
    const p=OTR.fpMission.local(v,m.player);
    if(Math.abs(p.x)>1.8||p.z<3.2||p.z>5.2||Math.cos(m.player.yaw-v.yaw)>-0.7)return 'Stand behind the van and look along the reversing path.';
    const point=OTR.fp.local(v,0,6.5),path={x:point.x,z:point.z,yaw:v.yaw};
    const bounds=m.bounds,h=m.crossing;
    let clear=m.driveAllowed(path)&&point.x>bounds.x0+3&&point.x<bounds.x1-3&&point.z>bounds.z0+3&&point.z<bounds.z1-3&&!m.solids.some(b=>OTR.fp.vanBox(path,b));
    if(h.state==='crossing'&&OTR.fp.vanBox(path,{x:h.x,z:h.z,w:.6,d:.6}))clear=false;
    for(const car of m.traffic)if(OTR.fp.vanBox(path,{x:car.x,z:car.z,w:1.8,d:3.6}))clear=false;
    d.goalAt=m.elapsed;d.goalX=v.x;d.goalZ=v.z;d.goalYaw=v.yaw;d.goalClear=clear;d.reverseActive=false;m.touch();
    return clear?'The reversing path is clear. Return to the cab and keep watching as you reverse.':'The reversing path is blocked. Wait for it to clear and check again.';
  },
  roadCenter(m,v) {
    const vertical=Math.abs(Math.cos(v.yaw))>0.7,list=m.town?(vertical?m.town.xs:m.town.zs):null;
    if(!list)return 0;
    const value=vertical?v.x:v.z;let center=list[0];
    for(const n of list)if(Math.abs(n-value)<Math.abs(center-value))center=n;
    return center;
  },
  atRight(m) {
    const v=m.van,c=this.roadCenter(m,v);
    return Math.abs(Math.cos(v.yaw))>0.7?(v.x-c)*Math.cos(v.yaw)>3.1:(v.z-c)*Math.sin(v.yaw)>3.1;
  },
  spawnSpace(m,x,z,yaw) {
    const p=m._drivePose,b=m.bounds;p.x=x;p.z=z;p.yaw=yaw;
    if(x<b.x0+5||x>b.x1-5||z<b.z0+5||z>b.z1-5||!m.driveAllowed(p))return false;
    for(const box of m.solids)if(OTR.fp.vanBox(p,box))return false;
    for(const car of m.traffic)if(Math.hypot(car.x-x,car.z-z)<8)return false;
    return Math.hypot(m.van.x-x,m.van.z-z)>12;
  },
  blockTraffic(m,c) {
    if(!m.driving)return false;
    for(let i=0;i<2;i++){
      const a=i===0?m.driving.bus:m.driving.siren;if(a.state==='waiting'||a.state==='done')continue;
      const ahead=(a.x-c.x)*Math.sin(c.yaw)-(a.z-c.z)*Math.cos(c.yaw),side=(a.x-c.x)*Math.cos(c.yaw)+(a.z-c.z)*Math.sin(c.yaw);
      if(ahead>0&&ahead<12&&Math.abs(side)<2.5)return true;
    }return false;
  },
  advance(m,a,speed,dt,width,length) {
    const b=m._driveNext,vertical=Math.abs(Math.cos(a.yaw))>0.7;
    b.x=a.x+Math.sin(a.yaw)*speed*dt;b.z=a.z-Math.cos(a.yaw)*speed*dt;b.w=vertical?width:length;b.d=vertical?length:width;
    if(OTR.fp.vanBox(m.van,b)||(m.mode==='walk'&&OTR.fp.circleBox(m.player.x,m.player.z,.4,b)))return false;
    for(const car of m.traffic)if(OTR.fp.vanBox(car,b))return false;
    const other=a===m.driving.bus?m._driveSolids.siren:m._driveSolids.bus;
    if(Math.abs(b.x-other.x)<(b.w+other.w)/2&&Math.abs(b.z-other.z)<(b.d+other.d)/2)return false;
    a.x=b.x;a.z=b.z;return true;
  },
  tick(m,dt,old) {
    const d=m.driving,v=m.van,F=OTR.fp;if(!d)return;
    if(OTR.fpRear)OTR.fpRear.tick(m,dt,old||v);
    if(m.mode==='cab'){
      if(Math.abs(v.speed)<.15&&(v.hand||v.gear===2))d.mirrorDone=false;
      if(!d.mirrorDone&&Math.abs(v.speed)>0.3){d.mirrorDone=true;d.mirrorCount++;const ok=!!OTR.fpMirrors&&OTR.fpMirrors.recent(m,0);this.fire(m,'drive.mirrors',`${m.leg}:${d.mirrorCount}`,ok,ok?'Checked the mirrors before pulling out.':'Pulled out without checking the mirrors.');}
      if(OTR.fpMirrors)OTR.fpMirrors.maneuvers(m);
      if(v.speed>1){let gap=Infinity;
        for(const car of m.traffic){
          if(Math.cos(car.yaw-v.yaw)<0.85)continue;
          const ahead=(car.x-v.x)*Math.sin(v.yaw)-(car.z-v.z)*Math.cos(v.yaw),side=(car.x-v.x)*Math.cos(v.yaw)+(car.z-v.z)*Math.sin(v.yaw);
          if(ahead>0&&ahead<60&&Math.abs(side)<2)gap=Math.min(gap,ahead-4.5);
        }
        if(Number.isFinite(gap)){
          d.followingSeen=true;d.closeTime=gap/v.speed<3?d.closeTime+dt:0;
          if(d.closeTime>=0.5&&!d.followingFailed){d.followingFailed=true;this.fire(m,'drive.following',m.leg,false,'Followed traffic with less than a three-second gap.');}
        }else d.closeTime=0;
      }else d.closeTime=0;
    }
    if(m.kind==='parking')return;
    const b=d.bus,e=d.siren;
    if(b.state==='waiting'&&m.mode==='cab'&&v.speed>1.5&&m.departed&&m.phase==='route'&&Math.hypot(v.x-4,v.z-8)>18){
      const yaw=Math.round(v.yaw/(Math.PI/2))*Math.PI/2,x=v.x+Math.sin(yaw)*25,z=v.z-Math.cos(yaw)*25;
      if(Math.abs(v.yaw-yaw)<0.15&&this.spawnSpace(m,x,z,yaw)){b.x=x;b.z=z;b.yaw=yaw;b.state='flashing';b.clock=0;b.hold=0;m.touch();}
    }
    if(b.state==='flashing'){
      b.clock+=dt;
      const ahead=(b.x-v.x)*Math.sin(b.yaw)-(b.z-v.z)*Math.cos(b.yaw),side=(v.x-b.x)*Math.cos(b.yaw)+(v.z-b.z)*Math.sin(b.yaw);
      if(old&&Math.abs(old.speed)>1&&v.speed===0&&ahead<7.1&&ahead>=6.5&&Math.abs(side)<2.5)this.fire(m,'drive.school-bus','bus',false,'Contacted the school bus instead of stopping with a safe gap.');
      if(!b.passed&&ahead<6.5&&Math.abs(side)<(m.town?m.town.road:11)){
        b.passed=true;this.fire(m,'drive.school-bus','bus',false,'Passed a school bus while its red lights were flashing.');
        this.fire(m,'drive.school-bus-pass','bus',false,'Drove past a school bus while children were boarding.');
      }
      b.hold=m.mode==='cab'&&Math.abs(v.speed)<0.12&&ahead>=6.5&&ahead<20&&Math.abs(side)<5?b.hold+dt:0;
      if(!b.passed&&b.hold>=3&&b.clock>=4){this.fire(m,'drive.school-bus','bus',true,'Stopped and waited until the school bus switched off its red lights.');b.state='leaving';}
      else if(b.clock>=14)b.state='leaving';
    }else if(b.state==='leaving'){
      this.advance(m,b,4,dt,2.4,7.6);
      if(Math.hypot(b.x-v.x,b.z-v.z)>55||b.x<m.bounds.x0+4||b.x>m.bounds.x1-4||b.z<m.bounds.z0+4||b.z>m.bounds.z1-4)b.state='done';
    }
    if(e.state==='waiting'&&m.leg>=1&&m.mode==='cab'&&v.speed>1.5&&m.phase==='route'){
      const yaw=Math.round(v.yaw/(Math.PI/2))*Math.PI/2,vertical=Math.abs(Math.cos(yaw))>0.7,road=this.roadCenter(m,v);
      const x=vertical?road+1.3*Math.cos(yaw):v.x-Math.sin(yaw)*25,z=vertical?v.z+Math.cos(yaw)*25:road+1.3*Math.sin(yaw);
      if(Math.abs(v.yaw-yaw)<0.15&&this.spawnSpace(m,x,z,yaw)){Object.assign(e,{state:'approaching',x,z,yaw,road,offset:1.3,clock:0,yielded:false});m.touch();}
    }
    if(e.state==='approaching'||e.state==='passing'){
      e.clock+=dt;
      if(e.state==='approaching'&&m.parked()&&this.atRight(m)){
        e.yielded=true;e.state='passing';
      }else if(e.state==='approaching'&&e.clock>=20){e.state='passing';this.fire(m,'drive.siren','siren',false,'Did not pull over and stop for the emergency vehicle.');}
      if(e.state==='passing'&&e.yielded&&(!m.parked()||!this.atRight(m))){e.yielded=false;this.fire(m,'drive.siren','siren',false,'Pulled out before the emergency vehicle had passed.');}
      const vertical=Math.abs(Math.cos(e.yaw))>0.7;
      if(e.state==='passing')e.offset=F.approach(e.offset,e.yielded?1.3:0,dt*1.5);
      if(vertical)e.x=e.road+e.offset*Math.cos(e.yaw);else e.z=e.road+e.offset*Math.sin(e.yaw);
      const ahead=(v.x-e.x)*Math.sin(e.yaw)-(v.z-e.z)*Math.cos(e.yaw);
      if((e.state==='passing'&&(e.yielded||e.offset<0.15))||ahead>10){this.advance(m,e,7,dt,1.45,4);}
      if(e.clock>45||ahead< -16||e.x<m.bounds.x0+3||e.x>m.bounds.x1-3||e.z<m.bounds.z0+3||e.z>m.bounds.z1-3){
        if(e.yielded)this.fire(m,'drive.siren','siren',true,'Pulled over to the right and waited for the emergency vehicle to pass.');
        else this.fire(m,'drive.siren','siren',false,'Did not pull over and stop for the emergency vehicle.');e.state='done';
      }
    }
    this.syncActors(m);
  },
  hint(m) {
    const d=m.driving;if(!d)return '';
    if(d.siren.state==='approaching')return 'An emergency vehicle is behind you. Signal, pull over to the right and stop.';
    if(d.siren.state==='passing'&&d.siren.yielded)return 'Wait until the emergency vehicle has passed before pulling out.';
    const b=d.bus,ahead=(b.x-m.van.x)*Math.sin(b.yaw)-(b.z-m.van.z)*Math.cos(b.yaw),side=(m.van.x-b.x)*Math.cos(b.yaw)+(m.van.z-b.z)*Math.sin(b.yaw);
    if(b.state==='flashing'&&ahead>0&&ahead<40&&Math.abs(side)<6)return 'The school bus has flashing red lights. Stop before the bus and wait until the lights go off.';
    if(m.van.gear<0){
      return OTR.fpRear?OTR.fpRear.hint(m):'Reverse slowly and keep watching the path.';
    }
    return '';
  },
  valid(m,d,elapsed) {
    if(!d||!['mirrorDone','followingSeen','followingFailed','goalClear','reverseActive','reverseSafe'].every(k=>typeof d[k]==='boolean'))return false;
    if(OTR.fpMirrors&&!OTR.fpMirrors.validTurn(d.mirrorTurn,elapsed))return false;
    if(OTR.fpRear&&!OTR.fpRear.valid(d.backing,elapsed))return false;
    if(!['reverseCount','mirrorCount'].every(k=>Number.isSafeInteger(d[k])&&d[k]>=0))return false;
    if(!['closeTime','goalAt','goalX','goalZ','goalYaw'].every(k=>Number.isFinite(d[k]))||d.goalAt>elapsed)return false;
    for(const name of ['bus','siren']){
      const a=d[name],states=name==='bus'?['waiting','flashing','leaving','done']:['waiting','approaching','passing','done'];
      if(!a||!states.includes(a.state)||!['x','z','yaw','clock'].every(k=>Number.isFinite(a[k]))||a.clock<0)return false;
      if(name==='bus'&&(!Number.isFinite(a.hold)||a.hold<0||typeof a.passed!=='boolean'))return false;
      if(name==='siren'&&(!Number.isFinite(a.road)||!Number.isFinite(a.offset)||typeof a.yielded!=='boolean'))return false;
    }return true;
  }
};
