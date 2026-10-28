/* A parked-cab sat-nav exercise over the original route planner's graph, manifests and scoring scale. */
window.OTR=window.OTR||{};
OTR.fpRouteLesson={
  create(content){
    const s={content,T:OTR.town.build(1),roundIndex:0,rounds:[],score:0,revision:0,finished:false};
    this.round(s,0);return s;
  },
  round(s,index){
    // These methods are pure graph/planning calculations. Keep one implementation of the real town,
    // closure detours, active school-zone delay, ETA and exhaustive optimal-loop calculation.
    const p=Object.create(RoutePlannerScene.prototype);
    Object.assign(p,{content:s.content,T:s.T,round:s.content.rounds[index],roundIndex:index,
      minPerPx:s.content.minutesPerBlock/OTR_DATA.town.cell,milesPerPx:s.content.milesPerBlock/OTR_DATA.town.cell});
    p.startMin=p.round.startMin??s.content.startMin;
    p.buildStops();p.buildGraph();p.computeMatrices();p.optimal=p.solveOptimal();
    s.planner=p;s.roundIndex=index;s.order=[];s.selected=1;s.revision++;
    s.instruction=`Plan route ${index+1} of ${s.content.rounds.length} on the sat nav.`;
  },
  available(m){return !!m.routeLesson&&m.mode==='cab'&&m.parked()&&!m.heldId;},
  toggle(m,id){
    if(!this.available(m))return false;const s=m.routeLesson;
    if(!Number.isInteger(id)||id<1||id>s.planner.stops.length||s.finished)return false;
    const at=s.order.indexOf(id);if(at<0)s.order.push(id);else s.order.splice(at,1);s.revision++;return true;
  },
  clear(m){if(!this.available(m)||m.routeLesson.finished)return false;m.routeLesson.order=[];m.routeLesson.revision++;return true;},
  plan(s){
    if(s.planRevision!==s.revision){s.plan=s.planner.evaluate(s.order,s.order.length===s.planner.stops.length);s.planRevision=s.revision;}
    return s.plan;
  },
  canSubmit(m){return this.available(m)&&!m.routeLesson.finished&&m.routeLesson.order.length===m.routeLesson.planner.stops.length;},
  grade(run,ev){
    const s=run.model.routeLesson,p=s.planner,C=s.content,opt=p.optimal;
    const eff=Math.pow(OTR.util.clamp01(opt.cost/Math.max(1,ev.cost)),1.3),best=p.evaluate(opt.order,true);
    const avoidableWait=ev.wait>best.wait+.5,avoidableSchool=ev.legs.some(l=>l.slowed)&&!best.legs.some(l=>l.slowed);
    run.log.setGroup('r'+(s.roundIndex+1));
    // Identical labels, weights, penalties and critical checks to RoutePlannerScene.roundDone.
    for(const stop of p.stops){
      const f=ev.flags[stop.i];
      if(stop.pickup){
        run.log.check('service',f.bad?0:stop.svc.weight,stop.svc.weight,`${stop.address} · pickup ${p.clock(stop.ready)}–${p.clock(stop.close)}`,
          {lesson:f.bad?C.lessons.missed:null,critical:true});
        if(f.waited&&avoidableWait)run.log.penalty('efficiency',1,`Waited ${f.waited} min at ${stop.address}`,{lesson:C.lessons.early});
      }else if(stop.by)run.log.check('service',f.bad?0:stop.svc.weight,stop.svc.weight,`${stop.address} · ${stop.svc.short} by ${p.clock(stop.by)}`,
        {lesson:f.bad?C.lessons.commit:null,critical:stop.svcId==='first'});
    }
    run.log.check('efficiency',Math.round(eff*10),10,`Loop length vs the best plan (${(ev.dist*p.milesPerPx).toFixed(1)} mi vs ${(opt.dist*p.milesPerPx).toFixed(1)} mi)`,
      {lesson:eff<.9?((p.round.closures||[]).length?C.lessons.closure:C.lessons.long):null});
    if(avoidableSchool)run.log.penalty('efficiency',1,'Drove the school zone while it was active',{lesson:C.lessons.school});
    s.score+=Math.round(eff*600);s.rounds.push({eff,ev,opt});
  },
  submit(run){
    const m=run.model,s=m.routeLesson;if(!this.canSubmit(m))return false;
    this.grade(run,this.plan(s));
    if(s.roundIndex+1<s.content.rounds.length)this.round(s,s.roundIndex+1);else{s.finished=true;s.revision++;}
    return true;
  },
  result(run){
    const s=run.model.routeLesson;
    // Unsubmitted manifests cannot gain stars when the scenario expires. Every remaining commitment
    // is checked, including the same critical pickup/Early AM obligations as an explicitly bad plan.
    while(!s.finished){
      const p=s.planner,flags={};for(const stop of p.stops)flags[stop.i]={bad:stop.pickup?'missed':'late'};
      this.grade(run,{flags,legs:[],dist:0,cost:Infinity,drive:0,wait:0,met:0,commitments:p.stops.filter(x=>x.pickup||x.by).length});
      if(s.roundIndex+1<s.content.rounds.length)this.round(s,s.roundIndex+1);else s.finished=true;
    }
    return {score:s.score,ratios:run.log.ratios(['efficiency','service']),log:run.log,
      lessons:run.log.mistakes().length?[]:[s.content.lessons.perfect],
      stats:{rounds:s.rounds.map(r=>({eff:r.eff,met:r.ev.met,of:r.ev.commitments}))}};
  },
  instruction(m){return m.routeLesson.instruction;}
};
OTR.fpScenario.register('route-satnav',{
  piece:'cab',goal:'Use the parked van’s sat nav to sequence every manifest, then accept each route.',seconds:1800,
  setup(run,m){m.routeLesson=OTR.fpRouteLesson.create(run.content);m.parcels=[];m.cargoOpen=false;m.repaired=true;Object.assign(m.van,{gear:2,hand:true,belt:true});},
  interact(run,scene,id){if(id==='cab-camera'){OTR.fpRouteLessonUI.brief(scene);return true;}return false;},
  hint(run,id,key){return id==='cab-camera'?`Press ${key} to plan the route on the sat nav.`:null;},
  handheld(run,scene){
    if(OTR.fpRouteLesson.available(run.model)){OTR.fpRouteLessonUI.brief(scene);return;}
    scene.handheld.show({title:'Plan the route on the sat nav.',lines:['Enter the cab and park the van before planning the route.'],options:[{label:'Return to the van.',onPick:()=>scene.handheld.close()}]});
  },
  result(run){return OTR.fpRouteLesson.result(run);}
});
