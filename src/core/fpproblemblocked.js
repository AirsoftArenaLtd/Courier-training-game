/* Unloaded blocked-drive model. Registration, physical fixtures and UI follow after closure validation. */
window.OTR=window.OTR||{};
OTR.fpProblemBlocked={
  model({unsafe=true,locked=false}={}){
    const seed=7,T=OTR.town.build(seed),lot=T.lots.find(l=>l.row===1&&l.col===0&&l.side===1),lots=[lot,...T.lots.filter(l=>l.id!==lot.id).slice(0,4)];
    const plan={day:3,variant:seed,townSeed:seed,weather:'clear',clockMin:720,route:lots.map((l,i)=>({lotId:l.id,stop:{answer:false,packages:[{number:l.number,street:l.street,tracking:'blocked-'+i,weight:4,service:'standard'}]}}))};
    const m=OTR.fpMission.create('campaign',seed,plan),stop=m.stops[0],parcel=m.parcels[0],source=OTR_DATA.stopSets.m3_doorsteps.stops[1];
    const state=OTR.fpProblemProtocol.create('m4-blocked',{...source,packages:[{...source.packages[0],id:parcel.id}]},{unsafe,locked});
    parcel.location=OTR.fpMission.slots[0].id;parcel.scanned=true;
    const car={x:stop.x-stop.side*3.2,z:stop.z,w:1.9,d:4.4,h:1.35},card={x:stop.park.x+stop.side*2.4,z:stop.z+5.5,y:1.2};
    m.blockedProblem={state,bounds:{...m.bounds},start:{...stop.park,speed:0,gear:2,hand:true,belt:false,look:0},car,card,door:{x:stop.x,z:stop.z},hazard:{x0:stop.park.x+2.7,x1:stop.x+.3,z0:stop.z-3.2,z1:stop.z+3.2},slipAt:null,attached:false};
    m.stops=[stop];m.parcels=[parcel];m.solids.push(car);m.traffic=[];m.crossing.state='resolved';m.tickTraffic=()=>{};m.phase='route';m.mode='cab';m.departed=m.secured=m.repaired=true;m.briefing=null;
    m.moduleReport=(type,detail)=>OTR.fpProblemProtocol.observe(state,type,detail);
    const step=m.step;m.step=function(input,seconds){
      if(this.paused||!OTR.fpProblemProtocol.live(state))return;step.call(this,input,seconds);OTR.fpProblemProtocol.step(state,null,seconds,true);
      const b=this.blockedProblem,p=this.player,h=b.hazard;
      if(state.unsafe&&b.slipAt===null&&this.mode==='walk'&&!input.careful&&p.x>=h.x0&&p.x<=h.x1&&p.z>=h.z0&&p.z<=h.z1&&OTR.fpProblemProtocol.observe(state,'stop.hazard',{key:'blocked-approach'}))b.slipAt=state.elapsed;
    };return m;
  },
  attach(run){const m=run.model,b=m.blockedProblem;if(b.attached)return false;m.bounds={...b.bounds};m.trainingArea=null;m.mode='cab';Object.assign(m.van,b.start);run.log=b.state.log;b.attached=true;return true;},
  parking(m){return m.parked()&&m.driveAllowed(m.van)&&!m.solids.some(r=>OTR.fp.vanBox(m.van,r));},
  secured(m){const p=m.parcels[0];return !!p&&p.id===m.blockedProblem.state.spec.parcel&&OTR.fpMission.slots.some(s=>s.id===p.location)&&m.secured&&!m.heldId&&!m.cargoOpen;},
  atVan(m){return this.parking(m)&&(m.mode==='cab'||m.mode==='walk'&&Math.hypot(m.player.x-m.van.x,m.player.z-m.van.z)<4.2);},
  atCard(m){const p=m.player,c=m.blockedProblem.card;return this.parking(m)&&m.mode==='walk'&&Math.hypot(p.x-c.x,p.z-c.z)<2.1;},
  context(m){return {parked:this.parking(m),atVan:this.atVan(m),parcelSecured:this.secured(m),atCardPoint:this.atCard(m)};},
  exception(m,code){return this.parking(m)&&OTR.fpProblemProtocol.exception(m.blockedProblem.state,code,{id:m.parcels[0]?.id,atVan:this.atVan(m),secured:this.secured(m)});},
  retry(m,action,value){return OTR.fpProblemProtocol.retry(m.blockedProblem.state,action,value,this.context(m));},
  reachDoor(m){return OTR.fpProblemProtocol.reachDoor(m.blockedProblem.state,m.mode==='walk'?{...m.player,mode:'walk'}:null,m.blockedProblem.door);},
  ready(m){return OTR.fpProblemProtocol.ready(m.blockedProblem.state,this.context(m));},
  result(run,reason='complete'){return OTR.fpProblemProtocol.finish(run.model.blockedProblem.state,this.context(run.model),reason);}
};
