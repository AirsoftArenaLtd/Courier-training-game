/* Module sessions own no save data or workday log. Scenario adapters supply their existing scoring scale. */
window.OTR=window.OTR||{};
OTR.fpScenario={
  definitions:new Map(),
  pieces:{
    depot:{bounds:{x0:-19,x1:9,z0:-8,z1:22},depot:true,player:{x:-9,z:10,yaw:0}},
    street:{bounds:{x0:-19,x1:19,z0:-54,z1:22},depot:false,player:{x:-1,z:-20,yaw:0},van:{x:1.7,z:-20}},
    doorstep:{bounds:{x0:-2,x1:18,z0:-50,z1:-34},depot:false,player:{x:8,z:-42,yaw:Math.PI/2},van:{x:1.7,z:-42}},
    cab:{bounds:{x0:-19,x1:9,z0:-8,z1:22},depot:true,player:{x:-9,z:10,yaw:0},mode:'cab'}
  },
  register(key,definition){
    if(typeof key!=='string'||!key||this.definitions.has(key))throw Error('Invalid or duplicate 3D scenario key');
    if(!definition||!this.pieces[definition.piece]||typeof definition.goal!=='string'||!definition.goal.trim()||definition.goal.length>160||
      !Number.isFinite(definition.seconds)||definition.seconds<=0||typeof definition.result!=='function')throw Error('Invalid 3D scenario definition');
    this.definitions.set(key,Object.freeze({...definition}));
  },
  // A-30 supplies the trainer's per-module choice. No trainer settings are authored here.
  resolve(scenario,{choice='auto',webgl=true}={}){
    if(!['auto','3d','2d'].includes(choice))throw Error('Invalid scenario presentation');
    const ready=!!scenario&&this.definitions.has(scenario.scene3d),want=choice==='3d'||choice==='auto'&&!!scenario&&(scenario.default3d||!scenario.scene);
    if(want&&ready&&webgl)return {scene:'FirstPersonScenarioScene',presentation:'3d',data:{scenarioId:scenario.id}};
    if(scenario&&scenario.scene)return {scene:scenario.scene,presentation:'2d',data:{scenarioId:scenario.id}};
    return {scene:null,presentation:'unavailable',reason:'This scenario needs 3D graphics.'};
  },
  create(id){
    const scenario=OTR.registry.get(id),definition=scenario&&this.definitions.get(scenario.scene3d);
    if(!definition)throw Error('No registered 3D scenario');
    const assessment=!!OTR.academy&&OTR.academy.assessing===id;
    return {id,scenario,definition,content:OTR.registry.content(scenario)||{},assessment,phase:'brief',elapsed:0,remaining:definition.seconds,
      log:new OTR.ScoreLog(),seen:new Set(),overflow:false,result:null};
  },
  model(run){
    const d=run.definition,piece=this.pieces[d.piece],m=d.model?d.model(run):OTR.fpMission.create('campaign',1);
    if(!m||typeof m.step!=='function')throw Error('Invalid scenario model');
    // Bind before adapter setup, so setup actions cannot report into a saved workday.
    m.moduleReport=(type,detail)=>this.report(run,type,detail);m.trainingArea={key:d.piece,depot:piece.depot};
    m.bounds={...piece.bounds};Object.assign(m.player,piece.player);Object.assign(m.van,piece.van||{});m.mode=piece.mode||'walk';m.paused=true;
    if(!d.model){m.stops=m.stops.slice(0,1);for(const s of m.stops)s.side=s.side||1;m.parcels=m.parcels.slice(0,1);m.traffic=[];m.crossing.state='resolved';m.tickTraffic=()=>{};}
    run.model=m;if(d.setup)d.setup(run,m);return m;
  },
  coaching(run){return !run.assessment&&(!OTR.academy||OTR.academy.coaching());},
  begin(run){if(run.phase==='brief'){run.phase='active';return true;}return false;},
  advance(run,seconds,active=true){
    if(run.phase!=='active'||!active)return false;
    const dt=Math.max(0,Math.min(.05,Number(seconds)||0));run.elapsed+=dt;run.remaining=Math.max(0,run.definition.seconds-run.elapsed);
    return run.remaining<=1e-8;
  },
  report(run,type,detail={}){
    if(run.phase!=='active'||!run.definition.report)return false;
    // The adapter chooses its checks. Repeated world observations remain one event per key.
    const key=type+'|'+String(detail.key??'');if(run.seen.has(key))return false;
    if(run.seen.size>=512){run.overflow=true;return false;}
    run.seen.add(key);run.definition.report(run,type,detail);return true;
  },
  finish(run,scene,reason='complete'){
    if(run.phase!=='active'||run.overflow)return false;
    const result=run.definition.result(run,reason);
    if(!result||!Number.isFinite(result.score)||result.score<0||!result.ratios||
      Object.entries(result.ratios).some(([cat,n])=>!run.scenario.categories.includes(cat)||!Number.isFinite(n)||n<0||n>1))throw Error('Invalid 3D scenario result');
    result.log=result.log||run.log;result.stats={...result.stats,seconds:Math.round(run.elapsed)};
    run.phase='finished';run.result=result;OTR.flow.complete(scene,run.id,result);return true;
  },
  abandon(run){
    if(run.phase==='finished'||run.phase==='abandoned')return false;
    run.phase='abandoned';if(run.assessment&&OTR.academy&&OTR.academy.assessing===run.id)OTR.academy.abandon();return true;
  }
};
