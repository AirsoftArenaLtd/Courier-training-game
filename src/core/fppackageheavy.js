/* Optional heavy-load observations over the existing physical lifting bay; no workday reports. */
window.OTR=window.OTR||{};
OTR.fpPackageHeavy={
  soloLimit:50,
  create(content){
    const loads=['heavy','awkward'].map(id=>{
      const source=content.lifts.find(l=>l.id===id);if(!source)throw Error('Missing heavy handling load');
      const methods=id==='heavy'?['equipment','helper','normal']:['helper','normal'];
      return {...source,options:methods.map(effect=>({effect,grade:effect==='normal'?'bad':'good'}))};
    });
    const s=OTR.fpPackageLiftBay.create({lifts:loads,lessons:content.lessons});
    s.heavy={log:new OTR.ScoreLog(),active:null,completed:0,result:null};return s;
  },
  next(s){
    const h=s.heavy;if(h.result||h.active&&!h.active.recorded)return false;
    if(!OTR.fpPackageLiftBay.next(s))return false;
    h.active={method:null,knees:false,close:false,pivot:false,controlled:false,handle:false,soloRaised:false,recorded:false};return true;
  },
  choose(s,index){
    if(s.heavy.result||!OTR.fpPackageLiftBay.choose(s,index))return false;
    s.heavy.active.method=s.lift.options[index].effect;return true;
  },
  requestHelper(s){return !s.heavy.result&&OTR.fpPackageLiftBay.requestHelper(s);},
  takeHandle(s){
    if(s.heavy.result||!OTR.fpPackageLiftBay.takeHandle(s))return false;
    s.heavy.active.handle=true;return true;
  },
  step(s,input,seconds){
    if(s.heavy.result)return false;const direction=s.pose.dir;
    const moved=OTR.fpPackageLiftBay.step(s,input,seconds);
    if(s.pose.hold&&direction!==s.pose.dir)s.heavy.active.pivot=true;
    this.observe(s);return moved;
  },
  grip(s){
    if(s.heavy.result)return false;
    const a=s.heavy.active,holding=s.pose.hold,P=OTR.fpPackageLift;
    const controlled=holding&&P.overPallet(s)&&582-P.heldBox(s).bottom<=8;
    if(!OTR.fpPackageLiftBay.grip(s))return false;
    if(!holding){a.knees=s.gripSquat>=.8&&s.gripStoop<=.2;a.close=s.gripGap<=20;}
    else a.controlled=controlled;
    this.observe(s);return true;
  },
  unload(s){
    if(s.heavy.result||!OTR.fpPackageLiftBay.unload(s))return false;
    s.heavy.active.controlled=s.bay.transport===1;this.observe(s);return true;
  },
  observe(s){
    const h=s.heavy,a=h.active;if(!a||a.recorded||h.result)return;
    // Gripping a floor load is permitted. The critical begins only at real upward movement.
    if(!a.soloRaised&&s.lift.weight>this.soloLimit&&s.pose.hold&&
      !(s.helper&&s.bay.helperReady)&&OTR.fpPackageLift.heldBox(s).bottom<600-1e-6){
      a.soloRaised=true;h.log.penalty('safety',1,'Lifted a load above the 50 lb solo limit without help.',{critical:true,severity:'critical',lesson:s.content.lessons.heavy,group:s.lift.id});
    }
    if(s.bay.mode!=='verdict')return;
    const equipment=a.method==='equipment',helped=s.helper&&s.bay.helperReady;
    h.log.setGroup(s.lift.id);
    const check=(cat,ok,label,lesson)=>h.log.check(cat,ok?1:0,1,label,{lesson});
    check('safety',equipment?a.handle:a.knees,equipment?'Took the hand truck handle before moving the load.':'Bent the knees and kept the back straight.',s.content.lessons.stoop);
    check('safety',equipment?a.handle:a.close,equipment?'Moved the load with the hand truck.':'Kept a close grip on the load.',s.content.lessons.far);
    check('safety',equipment?s.bay.transport===1:a.pivot,equipment?'Brought the hand truck to the pallet.':'Pivoted the feet while moving the load.',s.content.lessons.twist);
    check('safety',a.controlled,equipment?'Unloaded the hand truck at the pallet.':'Lowered the load onto the pallet under control.',s.content.lessons.drop);
    check('efficiency',equipment?a.handle&&s.bay.unloaded:helped,'Used help or equipment for the heavy or awkward load.',s.content.lessons[s.lift.id]);
    a.recorded=true;h.completed++;
  },
  result(s,reason='complete'){
    const h=s.heavy;if(h.result)return h.result;
    const completed=reason==='complete'&&h.completed===s.content.lifts.length&&s.phase==='done';
    h.result={score:completed?h.log.score():0,ratios:completed?h.log.ratios(['safety','efficiency']):{safety:0,efficiency:0},log:h.log,lessons:[],stats:{completed,loads:h.completed,soloLimit:this.soloLimit}};return h.result;
  }
};
