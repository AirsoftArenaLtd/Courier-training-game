/* Optional reversing lesson: physical cab, path inspection and local source-defined checks. */
window.OTR=window.OTR||{};
OTR.fpReverseScenario={
  panel(scene,title,body,choices,back=()=>scene.closePanel()){
    const run=scene.scenarioSession,token={};
    const guard=action=>()=>{if(run.phase==='active'&&scene.panel?.reverseToken===token)action();};
    scene.showPanel(title,body,choices.map(c=>({...c,action:guard(c.action)})),{accessibleText:true,back:guard(back)});
    scene.panel.reverseToken=token;
  },
  path(run,scene){
    if(run.phase!=='active')return;
    this.panel(scene,'Check the reversing path',OTR.fpScenario.coaching(run)?
      `Park and secure the van. Walk behind it, face the reversing path, then confirm the check. Press ${OTR.fpAccess.key('KeyG')} to open this control while on foot.`:
      'Confirm your observation of the reversing path.',[
      {label:'Confirm the path check',action:()=>{scene.message(OTR.fpDriving.checkGoal(scene.model));scene.closePanel();}},
      {label:'Return to the scenario.',action:()=>scene.closePanel()}
    ]);
  },
  controls(run,scene,page=0){
    const k=c=>OTR.fpAccess.key(c),pages=[
      `Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to walk. Use ${OTR.fpAccess.lookKeys()} or the mouse to look. Press ${k('KeyP')} to face a nearby target and ${k('KeyE')} to interact.`,
      `The cab exit works while the van is parked. Use the driver’s door to return. Press ${k('KeyG')} while on foot to open the reversing-path check. The control records what you can see from your actual position.`,
      `Look at a gear position on the physical selector and press ${k('KeyE')} to select it. Press ${k('KeyB')} for the seatbelt and ${k('Space')} for the parking brake. In reverse, ${k('KeyW')} accelerates and ${k('KeyS')} brakes.`,
      `Look toward either physical mirror to use it. The rear camera turns on automatically in reverse. Press ${k('KeyV')} to look forward. The pause menu and handheld stop the scenario clock and traffic.`
    ];
    this.panel(scene,'Use the reversing controls.',pages[page],[
      {label:'Read the next controls page.',action:()=>this.controls(run,scene,(page+1)%pages.length)},
      {label:'Return to the scenario.',action:()=>scene.closePanel()}
    ],()=>scene.showPause());
  },
  handheld(run,scene){
    const token={},h=scene.handheld,guard=action=>()=>{if(run.phase==='active'&&h.isOpen&&h.reverseToken===token)action();};
    h.show({title:run.scenario.title,lines:[run.definition.goal,scene.clockSentence()],options:[
      {label:'Read the controls.',onPick:guard(()=>{h.close(false);this.controls(run,scene);})},
      {label:'Return to the scenario.',onPick:guard(()=>h.close())}
    ],back:guard(()=>h.close())});h.reverseToken=token;
  }
};
OTR.fpScenario.register('wellness-reverse',{
  piece:'street',goal:'Reverse into the marked bay and secure the parked van.',seconds:300,
  model(){return OTR.fpReverseLesson.model();},setup(run){OTR.fpReverseLesson.attach(run);},
  report(run,type,detail){OTR.fpReverseLesson.report(run,type,detail);},
  goalControl(run,scene){OTR.fpReverseScenario.path(run,scene);},
  controls(run,scene){OTR.fpReverseScenario.controls(run,scene);},
  handheld(run,scene){OTR.fpReverseScenario.handheld(run,scene);},
  update(run,scene){if(OTR.fpReverseLesson.ready(run.model))scene.finishScenario();},
  result(run,reason){return OTR.fpReverseLesson.result(run,reason);}
});
