/* Optional ice and fatigue lessons: real keys, physical rail and active-time breaks. */
window.OTR=window.OTR||{};
OTR.fpIceFatigueUI={
  panel(run,scene,title,body,choices){
    const token={},guard=fn=>()=>{if(run.phase==='active'&&scene.panel?.wellnessRoadToken===token)fn();};
    scene.showPanel(title,body,choices.map(c=>({...c,action:guard(c.action)})),{accessibleText:true,back:guard(()=>scene.closePanel())});scene.panel.wellnessRoadToken=token;
  },
  notice(run,scene,body){this.panel(run,scene,'Read the road-safety information.',body,[{label:'Return to the scenario.',action:()=>scene.closePanel()}]);},
  controls(run,scene,page=0){
    const k=c=>OTR.fpAccess.key(c),ice=run.model.iceFatigue.kind==='ice',pages=[
      `Use ${k('KeyW')} to accelerate, ${k('KeyS')} to brake and ${k('KeyA')}/${k('KeyD')} to steer. Select a physical cab control with ${k('KeyP')}, then use it with ${k('KeyE')}. Look with the mouse or ${OTR.fpAccess.lookKeys()}.`,
      `Look in the mirrors before moving off. Use ${k('KeyB')} for the seatbelt, ${k('Space')} for the parking brake and the physical gear selector for P, D or R. Park the whole van inside the marked curbside bay, in P with the parking brake on.`,
      ice?`Ice reduces grip. Keep below 8 mph and leave six seconds behind traffic. Hold ${k('ShiftLeft')} for short, careful steps on bare ice. Use the brown gritted strip or face the handrail and press ${k('KeyE')} to hold it. The walk ends beside the house.`:
        'The tiredness warning appears after 30 seconds of active scenario time. Park in the marked bay within one minute of it. Use the handheld to begin a 30-second break. Stay parked, then use the handheld to end the break.',
      `Open the handheld with ${k('Tab')}. Menus and the pause screen stop both clocks. Close the handheld during the break so active scenario time can pass. Press ${k('KeyF')} to finish when the physical task is complete.`
    ];this.panel(run,scene,'Use the road-safety controls.',pages[page],[{label:'Read the next controls page.',action:()=>this.controls(run,scene,(page+1)%pages.length)},{label:'Return to the scenario.',action:()=>scene.closePanel()}]);
  },
  finish(run,scene){
    if(!OTR.fpIceFatigueStage.ready(scene.model)){this.notice(run,scene,run.model.iceFatigue.kind==='ice'?'Drive to the marked bay, secure the van, then complete the icy approach on foot.':'Park in the marked bay and complete the required break before finishing.');return false;}
    scene.finishScenario();return true;
  },
  handheld(run,scene){
    const a=run.model.iceFatigue,s=a.state,h=scene.handheld,token={},guard=fn=>()=>{if(run.phase==='active'&&h.isOpen&&h.wellnessRoadToken===token)fn();};
    const act=fn=>{
      h.close(false);
      if(!OTR.fpIceFatigue.safePark(run.model,a.park)){this.notice(run,scene,'Park the whole van inside the marked bay, in P with the parking brake on.');return;}
      if(!s.prompted){this.notice(run,scene,'The tiredness warning has not been shown yet.');return;}
      if(!fn())this.notice(run,scene,'The break ended before the required time. Take a complete break before finishing.');else scene.closePanel();
    };
    const options=a.kind==='fatigue'?[{label:s.resting?'End the rest break.':'Begin the rest break.',onPick:guard(()=>act(()=>s.resting?OTR.fpIceFatigue.endBreak(s,run.model):OTR.fpIceFatigue.startBreak(s,run.model)))}]:[];
    options.push({label:'Finish this scenario.',onPick:guard(()=>{h.close(false);this.finish(run,scene);})},{label:'Read the controls.',onPick:guard(()=>{h.close(false);this.controls(run,scene);})});
    h.show({title:run.scenario.title,lines:[a.kind==='ice'?'Read the mounted notice before approaching the ice.':s.prompted?'The tiredness warning has been shown.':'The tiredness warning has not been shown.',scene.clockSentence()],options,back:guard(()=>h.close())});h.wellnessRoadToken=token;
  },
  interact(run,scene,id){
    if(id==='wellness-road-notice'||id==='wellness-handrail'){
      if(scene.model.mode!=='walk'||scene.art.pick()!==id){this.notice(run,scene,'Move close to the physical target and face it before continuing.');return true;}
      const a=scene.model.iceFatigue,s=a.state;
      if(id==='wellness-handrail'){
        if(!OTR.fpIceFatigue.rail(s,scene.model,!s.holdingRail)){this.notice(run,scene,'Stand beside the handrail before holding it.');return true;}
        this.notice(run,scene,s.holdingRail?'You are holding the handrail. Stay beside it while walking.':'You have released the handrail.');
      }else this.notice(run,scene,a.kind==='ice'?'Ice on the approach. Use short, careful steps. Keep to the brown gritted path or use the handrail.':'Rest area. Park completely inside the marked bay and secure the van before taking a break.');return true;
    }
    if(id==='cab-camera'&&run.model.van.gear!==-1){this.handheld(run,scene);return true;}
    return !!id&&!id.startsWith('cab-')&&!id.startsWith('mirror-')&&!['driver','cargo'].includes(id);
  },
  tick(run,scene){
    const a=run.model.iceFatigue,s=a.state;if(a.kind==='fatigue'&&s.prompted&&!run.fatigueWarned){run.fatigueWarned=true;this.notice(run,scene,'You feel tired. Find the marked rest bay, park safely within one minute and take the required break.');}
    if(a.kind==='ice'&&s.slipped&&!run.slipShown){run.slipShown=true;this.notice(run,scene,'Your footing slipped. Stop and use short, careful steps.');}
  }
};
for(const kind of ['ice','fatigue'])OTR.fpScenario.register('wellness-'+kind,{
  piece:'street',goal:kind==='ice'?'Drive below 8 mph to the marked bay, then cross the icy approach using the gritted path or handrail.':'Respond to the tiredness warning, park safely and take the required break.',seconds:kind==='ice'?300:360,
  model(){return OTR.fpIceFatigueStage.model(kind);},setup(run){OTR.fpIceFatigueStage.attach(run);},report(run,type,detail){return OTR.fpIceFatigueStage.report(run,type,detail);},
  controls(run,scene){OTR.fpIceFatigueUI.controls(run,scene);},handheld(run,scene){OTR.fpIceFatigueUI.handheld(run,scene);},
  key(run,scene,code){if(code!=='KeyF')return false;OTR.fpIceFatigueUI.finish(run,scene);return true;},interact(run,scene,id){return OTR.fpIceFatigueUI.interact(run,scene,id);},
  hint(run,id,key){return id==='wellness-handrail'?`Press ${key} to hold or release the physical handrail.`:id==='wellness-road-notice'?`Press ${key} to read the mounted notice.`:null;},
  tick(run,scene,seconds,active){if(active)OTR.fpIceFatigueUI.tick(run,scene);},result(run,reason){return OTR.fpIceFatigueStage.result(run,reason);}
});
