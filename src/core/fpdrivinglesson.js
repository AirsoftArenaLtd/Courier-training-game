/* Existing m1-driving local grading. The controller supplies physical observations; no workday writes. */
window.OTR=window.OTR||{};
OTR.fpDrivingLesson={
  create(content,seed,map={x:0,y:0,scale:.05}){
    const byId={},byCheckpoint=[];for(const def of content.hazards){byId[def.id]=def;byCheckpoint[def.at]=def;}
    return {content,seed,map,byId,byCheckpoint,armed:{},judged:{},results:[],violations:{},lastViolationAt:{},checkpoint:0,finished:false,result:null,parking:{ok:false,reason:'',gap:0,skew:0,withTraffic:false}};
  },
  model(run){
    const C=run.content,T=OTR.town.build(C.seed),route=DrivingScene.prototype.pickRoute.call({content:C},T),scale=OTR.fpRoute.SCALE;
    if(route.length!==C.checkpoints)throw Error('The original driving route is incomplete.');
    const plan={day:1,variant:C.seed,townSeed:C.seed,weather:'clear',clockMin:720,route:route.slice(0,5).map((entry,i)=>{const lot=T.lotById(entry.lotId);return {lotId:lot.id,stop:{answer:true,packages:[{number:lot.number,street:lot.street,tracking:'drill-'+i,weight:4,service:'standard'}]}};})};
    // Reuse the town projection and scenery unchanged. The five-stop workday schema remains unchanged;
    // this ephemeral module replaces only its own physical stops with the original six checkpoints.
    const m=OTR.fpMission.create('campaign',C.seed,plan),s=this.create(C,C.seed,{x:T.depot.x,y:T.hy[0],scale});
    s.worldBounds={...m.bounds};s.start={...m.van};s.sourceRoute=route;m.drivingLesson=s;
    m.stops=route.map((entry,i)=>{const lot=T.lotById(entry.lotId),body=m.town.lots.find(b=>b.id===lot.id);const bay=TownDriveScene.prototype.parkBay.call({van:{g:{hl:2.7}},P:1/scale,T},lot);return {id:i,index:i+1,lotId:lot.id,side:lot.side,address:`${lot.number} ${lot.street}`,x:body.x-lot.side*(body.w/2+.08),z:body.z,park:{x:(lot.park.y-T.hy[0])*scale,z:8-(lot.park.x-T.depot.x)*scale,yaw:lot.side>0?0:Math.PI},bay:{streetX:(T.hy[lot.row]-T.hy[0])*scale,z0:8-(bay.x1-T.depot.x)*scale,z1:8-(bay.x0-T.depot.x)*scale},contacted:false,resolved:false};});
    m.parcels=[];m.cargoOpen=false;m.secured=true;m.repaired=true;m.phase='route';m.mode='cab';m.departed=true;m.driving=null;
    return m;
  },
  where(m,key){
    const s=m.drivingLesson,v=m.van,p=s.map;
    // Keep the existing town-map coordinates in the review log, projected from the 3D van.
    return {x:Math.round(p.x+(8-v.z)/p.scale),y:Math.round(p.y+v.x/p.scale),mph:Math.round(Math.abs(v.speed)*2.2369362921*10)/10,t:Math.round(m.elapsed),seed:s.seed,key};
  },
  judge(run,id,ok,text,extraPenalty=0){
    const m=run.model,s=m.drivingLesson,def=s.byId[id];if(!def||s.finished||s.judged[id])return false;
    s.armed[id]=true;s.judged[id]=true;
    if(ok)run.log.check('safety',def.points,def.points,def.title);
    else{run.log.check('safety',0,def.points,def.title,{lesson:def.lesson,severity:'major',where:this.where(m,'hazard')});if(extraPenalty)run.log.penalty('safety',extraPenalty,text||def.fail,{severity:'major'});}
    s.results.push({id,ok:!!ok});return true;
  },
  violation(run,key,label,cat,points,lesson){
    const m=run.model,s=m.drivingLesson;if(s.finished)return false;
    if(s.lastViolationAt[key]!==undefined&&m.elapsed-s.lastViolationAt[key]<5)return false;
    s.lastViolationAt[key]=m.elapsed;s.violations[key]=(s.violations[key]||0)+1;
    run.log.penalty(cat||'safety',points||2,label,{lesson,severity:points>=3?'major':'minor',critical:key==='hitped',where:this.where(m,key)});return true;
  },
  parking(m,stop){
    const p=m.drivingLesson.parking,v=m.van;p.ok=false;p.reason='';
    if(!stop||!stop.bay){p.reason='Follow the sat nav to the next checkpoint.';return p;}
    if(!m.parked()){p.reason='Stop fully and set the parking brake before recording this checkpoint.';return p;}
    const c=Math.cos(v.yaw),s=Math.sin(v.yaw),halfX=Math.abs(c)*1.08+Math.abs(s)*2.7,halfZ=Math.abs(s)*1.08+Math.abs(c)*2.7;
    const offset=(v.x-stop.bay.streetX)*stop.side;
    if(Math.abs(v.z-stop.park.z)>11||offset<1||Math.abs(v.x-stop.bay.streetX)>m.town.road/2+3){p.reason='Pull into the marked checkpoint bay on the correct side of the street.';return p;}
    p.skew=Math.abs(s);p.withTraffic=c*stop.side>0;p.gap=m.town.road/2-offset-halfX;
    if(p.skew>.34){p.reason='Straighten the van alongside the curb before recording this checkpoint.';return p;}
    if(p.gap<-.2){p.reason='Move the whole van off the curb before recording this checkpoint.';return p;}
    if(p.gap>1.5){p.reason='Move closer to the curb before recording this checkpoint.';return p;}
    if(v.z-halfZ<stop.bay.z0-.2||v.z+halfZ>stop.bay.z1+.2){p.reason='Keep the whole van inside the marked bay and clear of the crossing.';return p;}
    if(m.solids.some(b=>OTR.fp.vanBox(v,b))){p.reason='Keep the whole van clear of buildings and obstacles.';return p;}
    p.ok=true;return p;
  },
  tryCheckpoint(run){
    const m=run.model,s=m.drivingLesson,stop=m.stops[s.checkpoint],p=this.parking(m,stop);if(!p.ok||s.finished)return false;
    if(s.hazard?.active&&!s.hazard.judged){p.ok=false;p.reason='Wait until the current road hazard has cleared before recording this checkpoint.';return false;}
    if(!this.checkpoint(run,stop,p.gap,p.skew,p.withTraffic))return false;
    stop.resolved=true;m.activeStop=Math.min(m.stops.length-1,s.checkpoint);m.leg=s.checkpoint;m.touch();return true;
  },
  checkpoint(run,stop,gap,skew,withTraffic){
    const s=run.model.drivingLesson;if(s.finished||stop.index!==s.checkpoint+1)return false;
    const address=stop.address,neat=withTraffic&&gap<1.2&&skew<.14;
    run.log.check('safety',neat?2:1,2,neat?`Parked at ${address}`:!withTraffic?`Parked at ${address} (facing the traffic)`:gap>=1.2?`Parked at ${address} (${Math.round(gap*3.281)} ft from the kerb)`:`Parked at ${address} (at an angle)`,{lesson:!withTraffic?'Park on the right-hand side, facing the same way as the traffic, so you pull out into your own lane.':'Pull in close and parallel to the curb, so passing traffic has room and you step out onto the sidewalk.'});
    run.log.check('efficiency',1,1,`Checkpoint ${stop.index} reached`);s.checkpoint++;return true;
  },
  result(run){
    const m=run.model,s=m.drivingLesson;if(s.result)return s.result;const C=s.content,par=C.par;
    // Expiry must include every staged but unresolved hazard in the original safety maximum.
    for(const h of C.hazards)if(s.armed[h.id]&&!s.judged[h.id])this.judge(run,h.id,false);
    s.finished=true;
    run.log.check('efficiency',m.elapsed<=par?3:m.elapsed<=par*1.4?2:m.elapsed<=par*1.9?1:0,3,`Ran the drill in ${Math.round(m.elapsed)}s (par ${par}s)`,{lesson:C.lessons.speed});
    run.log.check('safety',!s.violations.belt?2:0,2,'Drove buckled up the whole way',{lesson:'Belt on before the wheels move, every stop, every time.'});
    for(const h of C.hazards)if(!s.armed[h.id])run.log.check('safety',0,h.points,h.title+' (never reached)',{lesson:h.lesson});
    s.result={score:run.log.score(),ratios:run.log.ratios(['safety','efficiency']),log:run.log,lessons:run.log.mistakes().length?[]:[C.lessons.perfect],summary:'Hazards: '+C.hazards.map(h=>{const r=s.results.find(x=>x.id===h.id);return `${r?(r.ok?'✓':'✗'):'–'} ${h.title}`;}).join('  ·  '),stats:{log:run.log.toJSON()}};return s.result;
  },
  // Metres/seconds port of the original moment-of-truth rules. 0 waits, 1 passes, -1 fails;
  // -4/-3/-5 include the existing additional child/door/pedestrian collision penalty.
  verdict(h,o,seconds){
    const dt=Math.max(0,Math.min(.05,Number(seconds)||0));if(h.judged)return 0;
    if(h.kind==='phone')return o.handheld?-1:h.t>14?1:0;
    if(h.kind==='ball'&&o.child){
      if(o.touching)return -4;
      if(o.fd<2&&o.fd>-o.vanLength&&Math.abs(o.lat)<5.5)return o.mph<4?1:-1;
      if(o.fd<-o.vanLength)return o.mph<9?1:-1;
      if(o.arrived&&o.fd<28&&o.mph<3){h.wait=(h.wait||0)+dt;if(h.wait>.7)return 1;}else h.wait=0;
    }
    if(h.kind==='door'&&o.opened){
      if(o.fd<1.5&&o.fd>-4){if(o.gap<0&&o.mph>3)return -3;return o.gap>1||o.mph<8?1:-1;}
      if(o.fd<28&&o.mph<3){h.wait=(h.wait||0)+dt;if(h.wait>1.4)return 1;}else h.wait=0;
    }
    if(h.kind==='water'){
      if(!h.inside&&o.distance<6.5){if(o.mph<14)return 1;h.inside=true;}
      if(h.inside){h.tIn=(h.tIn||0)+dt;h.bad=(h.bad||0)+(o.brake&&o.mph>8?dt*2:0)+(Math.abs(o.steer)>0?dt*1.6:0)+(o.throttle?dt*.8:0);if(h.t>3.4||o.distance>9.5&&h.tIn>.3)return h.bad<1.1?1:-1;}
    }
    if(h.kind==='crosswalk'){
      if(o.arrived)return 1;if(o.touching)return -5;
      if(o.fd<3&&o.fd>-o.vanLength&&Math.abs(o.lat)<5&&o.mph>5)return -1;
      if(o.fd<-o.vanLength-1)return 1;
    }
    if(h.kind==='bus'&&o.armOut){
      if(o.mph<2&&o.gap>1){h.hold=(h.hold||0)+dt;if(h.hold>2.2)return 1;}
      else if(o.gap<1||o.fd<-6)return -1;else h.hold=0;
    }
    return 0;
  }
};

OTR.fpScenario?.register('driving-town-drill',{
  piece:'street',goal:'Drive to all six checkpoints and respond safely to the road hazards.',seconds:1440,
  model(run){return OTR.fpDrivingLesson.model(run);},
  brief(run){return [
    `Use ${OTR.fpAccess.key('KeyW')} to accelerate, ${OTR.fpAccess.key('KeyS')} to brake, and ${OTR.fpAccess.key('KeyA')}/${OTR.fpAccess.key('KeyD')} to steer. Fasten the seatbelt before moving. Look at each physical mirror to check it. Signal for three seconds before moving off or turning.`,
    `Look at the shifter or a cab switch and press ${OTR.fpAccess.key('KeyE')} to use it. Keyboard shortcuts remain available. The rear camera comes on in reverse. Use it and the mirrors to reverse slowly. You can park and make an optional walk-around in a tight space.`,
    `Follow the mounted sat nav to each address. Park the whole van in the marked bay and set the parking brake. Press ${OTR.fpAccess.key('KeyF')} to record the checkpoint, or select the checkpoint option on the device. Rain begins halfway through the route.`
  ];},
  setup(run,m){
    const s=m.drivingLesson;m.bounds={...s.worldBounds};m.trainingArea=null;m.mode='cab';Object.assign(m.van,s.start);m.van.gear=1;
    // A module has six ephemeral stops. Day three enables the existing physical stop/light layout
    // without the later-day workday obstacles, deliveries or campaign rules.
    Object.assign(m.routePlan,{day:3,signs:1,traffic:1,navigation:1});OTR.fpTraffic.configure(m);OTR.fpNav.configure(m);
    OTR.fpDriving.configure(m);m.driving.bus.state=m.driving.siren.state='done';OTR.fpDriving.syncActors(m);
    OTR.fpDrivingLessonHazards.attach(run);OTR.fpDrivingLessonRules.attach(run);
    const step=m.step;m.step=(input,seconds)=>{if(m.paused)return;const before=m.elapsed,speed=m.van.speed;step.call(m,input,seconds);OTR.fpDrivingLessonRules.advance(run,m.elapsed-before,speed);};
    s.notifiedHazard=null;s.notifiedWarning='';s.weatherChanged=false;
  },
  controls(run,scene){OTR.fpDrivingLessonUI.controls(scene);},
  key(run,scene,code){if(code==='KeyF'){OTR.fpDrivingLessonUI.record(scene);return true;}return false;},
  interact(run,scene,id){
    if(id==='cab-camera'&&run.model.van.gear!==-1||id==='dispatch'||id&&id.startsWith('visit')){OTR.fpDrivingLessonUI.show(scene);return true;}
    return !!id&&id!=='driver'&&!id.startsWith('cab-')&&!id.startsWith('mirror-');
  },
  hint(run,id,key){if(id==='cab-camera'&&run.model.van.gear!==-1||id==='dispatch'||id&&id.startsWith('visit'))return `Press ${key} to read the sat nav and checkpoint details.`;if(id&&id.startsWith('door'))return `Park at this checkpoint and press ${OTR.fpAccess.key('KeyF')} to record it.`;return null;},
  handheld(run,scene){OTR.fpDrivingLessonHazards.handheld(run);OTR.fpDrivingLessonUI.show(scene);},
  update(run,scene){
    const m=run.model,s=m.drivingLesson,coach=OTR.fpScenario.coaching(run),h=s.hazard;
    if(h.active&&h.id!==s.notifiedHazard){s.notifiedHazard=h.id;if(h.kind==='phone')scene.workdaySound.effect('radio','The handheld buzzes in its cradle.');if(coach)scene.message(s.byId[h.id].warn);}
    const warning=s.rules.warning;if(warning!==s.notifiedWarning){s.notifiedWarning=warning;if(warning&&coach)scene.message(warning);}
    if(s.checkpoint>=s.content.checkpoints)scene.finishScenario();
  },
  result(run){return OTR.fpDrivingLesson.result(run);}
});
