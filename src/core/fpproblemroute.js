/* A real bounded town, solid closure and the existing sat-nav detour. Optional registration/UI follows. */
window.OTR=window.OTR||{};
OTR.fpProblemRoute={
  model(){
    const seed=7,T=OTR.town.build(seed),lot=T.lots.find(l=>l.row===1&&l.col===0&&l.side===1);
    if(!lot)throw Error('No accessible road problem destination');
    const lots=[lot,...T.lots.filter(l=>l.id!==lot.id).slice(0,4)],plan={day:3,variant:seed,townSeed:seed,weather:'clear',clockMin:720,navigation:1,route:lots.map((l,i)=>({lotId:l.id,stop:{answer:true,packages:[{id:'closure-'+i,number:l.number,street:l.street,tracking:'closure-'+i,weight:4,service:'standard'}]}}))};
    const m=OTR.fpMission.create('campaign',seed,plan),stop=m.stops[0],x=m.town.xs[1],z=(m.town.zs[0]+m.town.zs[1])/2;
    m.roadworks={x,z,w:m.town.road+2.8,d:1,h:1.1,from:0,to:1};m.solids.push(m.roadworks);
    const state=OTR.fpProblemProtocol.create('m4-closure',OTR_DATA.stopSets.m3_doorsteps.stops[1]);
    m.roadProblem={state,bounds:{...m.bounds},start:{x:x-m.town.road/4,z:m.town.zs[1]-8,yaw:Math.PI,speed:0,gear:2,hand:true,belt:false,look:0},goal:{...stop.park},bay:{x:stop.park.x,z:stop.park.z,halfWidth:1.3,halfLength:4.2},pose:{mode:'cab',x:0,z:0,speed:0},attached:false};
    m.stops=[stop];m.parcels=[];m.traffic=[];m.crossing.state='resolved';m.tickTraffic=()=>{};m.phase='route';m.mode='cab';m.departed=m.secured=m.repaired=true;m.briefing=null;
    m.moduleReport=(type,detail)=>OTR.fpProblemProtocol.observe(state,type,detail);
    const step=m.step;m.step=function(input,seconds){if(this.paused||state.phase!=='active')return;step.call(this,input,seconds);const p=this.roadProblem.pose;p.mode=this.mode;p.x=this.van.x;p.z=this.van.z;p.speed=this.van.speed;OTR.fpProblemProtocol.step(state,p,seconds,true);};return m;
  },
  attach(run){
    const m=run.model,s=m.roadProblem;if(s.attached)return false;
    m.bounds={...s.bounds};m.trainingArea=null;m.mode='cab';Object.assign(m.van,s.start);run.log=s.state.log;OTR.fpNav.configure(m);
    const route=OTR.fpNav.route(m);if(!route?.points?.length||!OTR.fpProblemProtocol.route(s.state,route.points))throw Error('No bounded diversion route');
    if(!route.points.some(p=>Math.abs(p.x-m.roadworks.x)>m.town.road))throw Error('Diversion did not avoid the closed street');
    s.attached=true;return true;
  },
  parking(m){
    const s=m.roadProblem,v=m.van,b=s.bay,cos=Math.cos(v.yaw),sin=Math.sin(v.yaw),width=Math.abs(cos)*1.08+Math.abs(sin)*2.7,length=Math.abs(sin)*1.08+Math.abs(cos)*2.7;
    return m.mode==='cab'&&m.parked()&&Math.cos(v.yaw-s.goal.yaw)>.94&&Math.abs(v.x-b.x)+width<=b.halfWidth&&Math.abs(v.z-b.z)+length<=b.halfLength&&m.driveAllowed(v);
  },
  context(m){return {parked:m.mode==='cab'&&m.parked(),atDestination:this.parking(m)};},
  ready(m){return OTR.fpProblemProtocol.ready(m.roadProblem.state,this.context(m));},
  result(run,reason='complete'){return OTR.fpProblemProtocol.finish(run.model.roadProblem.state,this.context(run.model),reason);}
};
