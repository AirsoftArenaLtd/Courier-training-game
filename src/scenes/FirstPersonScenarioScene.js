/* The module shell reuses physical inputs and render resources, with an isolated session and no workday saves. */
class FirstPersonScenarioScene extends FirstPersonScene {
  constructor(){super('FirstPersonScenarioScene');}
  create(data){
    // Phaser reuses the scene object. A previous result or quit must not block the next transition.
    this._leaving=false;this.inputBlockedUntil=0;
    const scenario=OTR.registry.get(data&&data.scenarioId),route=OTR.fpScenario.resolve(scenario,{choice:'3d',webgl:!!this.sys.game.renderer.gl});
    this.moduleTransferred=false;this.scenarioSession=null;
    if(route.presentation!=='3d'){this.transferScenario(scenario,route);return;}
    this.scenarioSession=OTR.fpScenario.create(scenario.id);
    this.events.once('shutdown',()=>{if(!this.moduleTransferred)OTR.fpScenario.abandon(this.scenarioSession);});
    super.create();
  }
  // The parent owns normal workday checkpoints. Modules only finish through OTR.flow.complete.
  write(){this.saved=true;return true;}
  checkpoint(){}
  makeHud(){
    super.makeHud();const size=OTR.fpAccess.settings().large?22:18;
    this.moduleBack=this.add.rectangle(12,10,620,80,0x14232C,.96).setOrigin(0).setStrokeStyle(1,0x83969E,.65).setDepth(22);
    this.moduleGoal=OTR.txt(this,24,18,'',size,'#ffffff',{ox:0,oy:0,wrap:596}).setDepth(23);
    this.moduleClock=OTR.txt(this,24,50,'',size,'#ffffff',{ox:0,oy:0,wrap:596}).setDepth(23);this.moduleClockSecond=-1;this.moduleStatusSource=null;
  }
  beginScenario(){
    this.model=OTR.fpScenario.model(this.scenarioSession);this.area='route';this.target=null;this.rebuildWorld();this.sync();this.showScenarioBrief();
  }
  clockSentence(){return `Time remaining: ${Math.ceil(this.scenarioSession.remaining)} seconds.`;}
  showScenarioBrief(){
    const r=this.scenarioSession;
    this.showPanel(r.scenario.title,[r.scenario.blurb,r.definition.goal,`You have ${r.definition.seconds} seconds to complete this scenario.`].filter(Boolean).join('\n\n'),[
      {label:'Begin the scenario.',action:()=>{OTR.fpScenario.begin(r);this.closePanel();}},
      {label:'Return to the station.',action:()=>this.toHub()}
    ],{accessibleText:true,back:()=>this.toHub()});
  }
  objectiveText(){return this.scenarioSession?this.scenarioSession.definition.goal:super.objectiveText();}
  lightCaption(){
    if(OTR.fpScenario.coaching(this.scenarioSession))return this.art.lighting?this.art.lighting.caption():'';
    const time=OTR.fpLighting.time(this.model);return `It is ${time}.`+(['night','dusk'].includes(time)?' '+(this.model.van.headlights?'The headlights are on.':'The headlights are off.'):'');
  }
  showPause(){
    const r=this.scenarioSession;if(this.loading||!r||r.phase==='finished'||r.phase==='abandoned')return;
    if(r.phase==='brief'){this.showScenarioBrief();return;}
    this.showPanel('The scenario is paused.',r.definition.goal+'\n\n'+this.clockSentence(),[
      {label:'Continue the scenario.',action:()=>this.closePanel()},
      {label:'Read the controls.',action:()=>this.showScenarioControls()},
      {label:'Return to the station.',action:()=>this.toHub()}
    ],{accessibleText:true,back:()=>this.closePanel()});
  }
  showScenarioControls(){
    const r=this.scenarioSession;if(r.definition.controls){r.definition.controls(r,this);return;}
    this.showPanel('Use the scenario controls.',`Use ${OTR.fpAccess.lookKeys()} to look. Press ${OTR.fpAccess.key('KeyP')} to select a visible nearby target and ${OTR.fpAccess.key('KeyE')} to interact. Press ${OTR.fpAccess.key('Tab')} to read the scenario goal.`,[
      {label:'Continue the scenario.',action:()=>this.closePanel()}
    ],{accessibleText:true,back:()=>this.showPause()});
  }
  showGoal(){this.showPause();}
  showDispatch(){this.showPause();}
  showScanner(){
    if(!this.handheld||!this.scenarioSession)return;if(this.handheld.isOpen){this.handheld.close();return;}
    const r=this.scenarioSession;if(r.definition.handheld){r.definition.handheld(r,this);return;}
    this.handheld.show({title:r.scenario.title,lines:[r.definition.goal,this.clockSentence()],options:[
      {label:'Return to the scenario.',onPick:()=>this.handheld.close()}
    ],back:()=>this.handheld.close()});
  }
  message(text){
    const r=this.scenarioSession;
    // Target selection is an accessible input acknowledgement, not answer feedback.
    const control=this.model?.mode==='cab'?this.controlHint(this.target,this.model,OTR.fpAccess.key('KeyE')):'';
    if(r&&!OTR.fpScenario.coaching(r)&&text!==control&&!String(text).startsWith('Selected ')&&!String(text).startsWith('No nearby target'))return;
    super.message(text);
  }
  interactionHint(id,m,key){return this.scenarioSession?.definition?.hint?.(this.scenarioSession,id,key)||null;}
  controlHint(id,m,key){
    const hint=this.scenarioSession?.definition?.hint?.(this.scenarioSession,id,key);if(hint)return hint;
    if(this.scenarioSession&&!OTR.fpScenario.coaching(this.scenarioSession)){
      if(id==='cab-signal-left')return m.signal===-1?'The left signal is on.':'The left signal is off.';
      if(id==='cab-signal-right')return m.signal===1?'The right signal is on.':'The right signal is off.';
    }
    return OTR.fpCab.hint(id,m,key);
  }
  scenarioKey(code){const r=this.scenarioSession;return !!(r&&r.phase==='active'&&r.definition.key&&r.definition.key(r,this,code));}
  cabAction(id){
    const r=this.scenarioSession;if(!r||OTR.fpScenario.coaching(r)){super.cabAction(id);return;}
    // Selected gear and physical switch state remain available to narrated controls in assessments.
    const result=id==='cab-camera'?OTR.fpHud.screenHint(this.model):OTR.fpCab.act(this.model,id);
    super.message(result||this.controlHint(id,this.model,OTR.fpAccess.key('KeyE')));this.sync();this.refresh();
  }
  interact(){
    const r=this.scenarioSession;if(r&&r.phase==='active'&&!this.panel&&!this.external&&!this.transitioning){
      const id=this.aimTarget();if(r.definition.interact&&r.definition.interact(r,this,id))return;
    }
    super.interact();
  }
  toHub(){
    if(!this.scenarioSession)return;OTR.fpScenario.abandon(this.scenarioSession);this.releaseMouse();OTR.flow.toHub(this);
  }
  leavePrototype(){this.toHub();}
  transferScenario(scenario,route){
    this.moduleTransferred=true;this.releaseMouse();
    if(route.scene&&this.scene.manager.keys[route.scene]){OTR.fx.transition(this,route.scene,route.data);return;}
    if(OTR.academy&&OTR.academy.assessing===scenario?.id)OTR.academy.abandon();
    OTR.ui.toast(this,'This scenario needs 3D graphics.');OTR.flow.toHub(this);
  }
  scenarioUnavailable(error){
    console.warn('3D scenario unavailable',error);if(this.model)this.model.paused=true;
    if(this.art){this.art.dispose();this.art=null;}
    if(this.view){this.view.dispose();this.view=null;}this.loading=false;
    this.transferScenario(this.scenarioSession.scenario,OTR.fpScenario.resolve(this.scenarioSession.scenario,{choice:'2d',webgl:false}));
  }
  finishScenario(reason='complete'){
    const r=this.scenarioSession;if(!r||r.phase!=='active')return false;
    if(this.handheld)this.handheld.close(false);this.closePanel(false);this.model.paused=true;this.releaseMouse();
    try{return OTR.fpScenario.finish(r,this,reason);}catch(error){this.scenarioUnavailable(error);return false;}
  }
  refresh(){
    super.refresh();const r=this.scenarioSession;if(!r||!this.moduleGoal)return;
    const visible=r.phase==='active'&&!this.panel&&!this.external&&!this.transitioning&&!this.handheld?.isOpen;
    this.moduleBack.setVisible(visible);this.moduleGoal.setVisible(visible);this.moduleClock.setVisible(visible);if(!visible)return;
    const status=r.definition.status?r.definition.status(r):'';if(this.moduleStatusSource!==status){this.moduleStatusSource=status;this.moduleGoal.setText(r.definition.goal+(status?'\n'+status:''));}
    // Very long translations remain complete in the brief, pause menu and handheld; never shrink them over a mirror.
    const compact=this.model?.mode==='cab'&&this.moduleGoal.height>80;this.moduleGoal.setVisible(!compact);
    this.moduleClock.setY(compact?18:26+this.moduleGoal.height);
    const second=Math.ceil(r.remaining);if(second!==this.moduleClockSecond){this.moduleClockSecond=second;this.moduleClock.setText(this.clockSentence());}
    const bottom=this.moduleClock.y+this.moduleClock.height+10;this.moduleBack.setDisplaySize(620,bottom-10);
    this.soundCue.setY(bottom+12);this.headerBack.setY(bottom+4);
    if(!OTR.fpScenario.coaching(r)){this.hint.setVisible(visible&&!!this.physicalAffordance);this.hintBack.setVisible(visible&&!!this.physicalAffordance);this.controls.setVisible(false);this.help.setVisible(false);}
  }
  update(time,delta){
    const r=this.scenarioSession,active=!!this.model&&!this.loading&&!this.model.paused&&!this.panel&&!this.external&&!this.transitioning&&!this.handheld?.isOpen;
    const clockActive=r?.definition.clockActive?r.definition.clockActive(r,this,active):active;
    super.update(time,delta);if(!r||r.phase!=='active')return;
    const timeout=OTR.fpScenario.advance(r,delta/1000,clockActive);
    if(r.definition.tick)r.definition.tick(r,this,Math.max(0,Math.min(.05,delta/1000)),clockActive);
    if(r.phase!=='active')return;
    if(active&&r.definition.update)r.definition.update(r,this,Math.max(0,Math.min(.05,delta/1000)));
    if(r.overflow){this.scenarioUnavailable(Error('The scenario event budget was exceeded'));return;}
    if(timeout&&r.phase==='active'){if(r.definition.timeout)r.definition.timeout(r,this);else this.finishScenario('timeout');}
  }
}
OTR.registerScene(FirstPersonScenarioScene);
