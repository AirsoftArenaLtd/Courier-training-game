/* Optional diversion: real vehicle, mounted signs, navigation and a whole-van finish bay. */
window.OTR=window.OTR||{};
OTR.fpProblemRouteUI={
  notice(scene,body){scene.showPanel('Read the road-closure information.',body,[{label:'Return to the road.',action:()=>scene.closePanel()}],{accessibleText:true,back:()=>scene.closePanel()});},
  read(scene){
    const visible=scene.art.signs.entries.filter(e=>e.mainVisible&&scene.art.labelPosition(e.label));
    if(!visible.length){this.notice(scene,'Look toward a road sign, then read it again.');return;}
    const index=scene.signUI.readIndex=(scene.signUI.readIndex+1)%visible.length;
    scene.showPanel('Read the physical road sign.',visible[index].label.text,[{label:'Return to the road.',action:()=>scene.closePanel()}],{accessibleText:true,back:()=>scene.closePanel()});
  },
  finish(scene){
    const r=scene.scenarioSession;if(r.phase!=='active')return false;
    if(!OTR.fpProblemRoute.ready(r.model)){
      this.notice(scene,'Follow the diversion on the sat nav, then park the whole van inside the marked destination bay, facing with traffic. Set the parking brake before finishing.');return false;
    }
    scene.finishScenario();return true;
  },
  handheld(run,scene){
    scene.handheld.show({title:'Read the diversion.',lines:[`The destination is ${run.model.stops[0].address}.`],options:[
      {label:'Finish the diversion.',onPick:()=>{scene.handheld.close();this.finish(scene);}},
      {label:'Read the controls.',onPick:()=>{scene.handheld.close(false);this.controls(run,scene);}}
    ],back:()=>scene.handheld.close()});
  },
  controls(run,scene,page=0){
    const k=c=>OTR.fpAccess.key(c),pages=[
      `Use ${k('KeyW')} to accelerate, ${k('KeyS')} to brake, and ${k('KeyA')}/${k('KeyD')} to steer. Use the mouse or ${OTR.fpAccess.lookKeys()} to look. Press ${k('KeyP')} to select a nearby cab control and ${k('KeyE')} to use it.`,
      `Press ${k('Space')} for the parking brake, ${k('KeyB')} for the seatbelt, and ${k('KeyR')} for drive or reverse. Press ${k('KeyQ')}/${k('KeyC')} for the signals and ${k('KeyV')} to look forward. Look at the physical mirrors before moving off.`,
      `The road ahead is closed. Follow the mounted sat nav around the closure to ${run.model.stops[0].address}. Read a visible sign with ${k('KeyJ')}. Park inside the marked bay, facing with traffic. Press ${k('KeyF')} to finish, or use the device with ${k('Tab')}.`
    ];
    scene.showPanel('Use the diversion controls.',pages[page],[
      {label:'Read the next controls page.',action:()=>this.controls(run,scene,(page+1)%pages.length)},
      {label:'Return to the road.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  }
};
OTR.fpScenario.register('road-closure',{
  piece:'street',goal:'Follow the diversion around the road closure and park in the marked destination bay.',seconds:600,
  model(){return OTR.fpProblemRoute.model();},setup(run){OTR.fpProblemRoute.attach(run);},
  report(run,type,detail){OTR.fpProblemProtocol.observe(run.model.roadProblem.state,type,detail);},
  controls(run,scene){OTR.fpProblemRouteUI.controls(run,scene);},
  key(run,scene,code){if(code==='KeyJ'){OTR.fpProblemRouteUI.read(scene);return true;}if(code!=='KeyF')return false;OTR.fpProblemRouteUI.finish(scene);return true;},
  handheld(run,scene){OTR.fpProblemRouteUI.handheld(run,scene);},
  interact(run,scene,id){
    if(id==='cab-camera'&&run.model.van.gear!==-1){OTR.fpProblemRouteUI.handheld(run,scene);return true;}
    // This is a driving lesson. Unrelated workday delivery/dispatch actions cannot end it.
    return !!id&&!id.startsWith('cab-')&&!id.startsWith('mirror-');
  },
  hint(run,id,key){if(id==='cab-camera'&&run.model.van.gear!==-1)return `Press ${key} to read the diversion and finish details.`;return null;},
  result(run,reason){return OTR.fpProblemRoute.result(run,reason);}
});
