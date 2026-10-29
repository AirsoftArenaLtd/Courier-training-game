/* Optional M8 set-pieces use the ordinary road, cab, motor and weather reports. */
window.OTR=window.OTR||{};
OTR.fpIceFatigueStage={
  model(kind){
    if(!['ice','fatigue'].includes(kind))throw Error('Invalid wellness driving lesson');
    const m=OTR.fpMission.create('campaign',3),ice=kind==='ice';
    m.moduleReport=()=>false;m.iceFatigue={kind,attached:false,state:null,arrived:false,
      start:{x:ice?1.7:-1.7,z:ice?-8:-118,yaw:ice?0:Math.PI,speed:0,gear:2,hand:true,belt:false,look:0},
      park:{x:ice?4.1:-4.1,z:ice?-34:-42,w:2.7,d:8.4},bounds:{...m.bounds},
      ice:{start:{x:6.2,z:-40.6,w:1.4,d:2.8},goal:{x:9.1,z:-40.6,w:1.1,d:2.8},
        ice:{x:7.7,z:-40.6,w:4,d:2.5},grit:{x:7.7,z:-41.35,w:4,d:.65},rail:{x:7.7,z:-40.1,w:4.2,d:.95}},
      railTarget:{x:7.7,y:.95,z:-39.65},notice:{x:ice?6.2:-6.25,y:1.55,z:ice?-38.95:-38.6}};
    m.parcels=[];m.traffic=[];m.crossing.state='resolved';m.crossing.x=m.crossing.z=1000;m.tickTraffic=m.tickCrossing=()=>{};
    m.driveAllowed=function(v){const c=Math.abs(Math.cos(v.yaw)),s=Math.abs(Math.sin(v.yaw)),width=c*1.08+s*2.7,length=s*1.08+c*2.7;return Math.abs(v.x)+width<=5.5&&v.z-length>=this.bounds.z0&&v.z+length<=this.bounds.z1;};
    m.briefing=null;m.phase='route';m.mode='cab';m.departed=m.secured=m.repaired=true;m.cargoOpen=false;m.checks={tyres:'ready',lights:'ready'};
    if(ice){m.routeDay={weather:'ice',distance:0,closeTime:0,fastTime:0,failed:false,heat:0,dispatch:null};OTR.fpDay.attach(m);}
    const step=m.step;m.step=function(input,seconds){
      const a=this.iceFatigue,s=a.state;if(this.paused||!s||s.phase!=='active')return;
      step.call(this,input,seconds);
      if(a.kind==='ice'){
        OTR.fpIceFatigue.observeIce(s,this,seconds);
        if(!a.arrived&&OTR.fpIceFatigue.safePark(this,a.park)&&this.routeDay.distance>15){a.arrived=true;OTR.fpDay.endLeg(this);}
      }else OTR.fpIceFatigue.observeFatigue(s,this,seconds);
    };
    return m;
  },
  attach(run){
    const m=run.model,a=m.iceFatigue;if(a.attached)return false;
    m.bounds={...a.bounds};m.trainingArea=null;m.mode='cab';Object.assign(m.van,a.start);Object.assign(m.player,{x:a.start.x,z:a.start.z,yaw:a.start.yaw,pitch:0});
    a.state=a.kind==='ice'?OTR.fpIceFatigue.ice(run.log,m,a.ice):OTR.fpIceFatigue.fatigue(run.log,{park:a.park,promptAt:30,breakSeconds:30});
    m.solids.push({x:a.notice.x,z:a.notice.z,w:.95,d:.1,h:1.91});
    if(a.kind==='ice'){
      // A real handrail blocks passage through its posts/rail, without closing the gritted strip.
      m.solids.push({x:7.7,z:-39.65,w:4.2,d:.1,h:1.05});
    }
    OTR.fpDriving.configure(m);m.driving.bus.state=m.driving.siren.state='done';OTR.fpDriving.syncActors(m);
    a.attached=true;return true;
  },
  report(run,type,detail){
    const a=run.model.iceFatigue;return run.phase==='active'&&a.kind==='ice'&&OTR.fpIceFatigue.weather(a.state,type,detail);
  },
  ready(m){const a=m.iceFatigue;return a.kind==='ice'?OTR.fpIceFatigue.safePark(m,a.park)&&OTR.fpIceFatigue.iceReady(a.state,m):OTR.fpIceFatigue.fatigueReady(a.state,m);},
  result(run,reason){const m=run.model,a=m.iceFatigue;if(a.kind==='ice'&&reason==='complete'&&!OTR.fpIceFatigue.safePark(m,a.park))reason='incomplete';return a.kind==='ice'?OTR.fpIceFatigue.iceResult(a.state,m,reason):OTR.fpIceFatigue.fatigueResult(a.state,m,reason);}
};
