/* The school drive uses the mounted device and the same remappable finish key. */
window.OTR=window.OTR||{};
OTR.fpSchoolLessonUI={
  show(scene){
    const m=scene.model;scene.handheld.show({title:'Read the school-zone route.',lines:[`The finish bay is at ${m.stops[0].address}.`],options:[
      {label:'Finish the school drive.',onPick:()=>{scene.handheld.close();this.finish(scene);}},
      {label:'Return to the road.',onPick:()=>scene.handheld.close()}
    ],back:()=>scene.handheld.close()});OTR.fpDrivingLessonUI.fitDevice(scene);
  },
  finish(scene){
    const run=scene.scenarioSession;if(run.phase!=='active')return false;
    if(!OTR.fpSchoolLesson.ready(run.model)){
      const s=run.model.schoolLesson;scene.message(!s.busSeen||!s.crossingSeen||run.model.crossing.state!=='resolved'||!['leaving','done'].includes(run.model.driving.bus.state)?
        'Drive through the school zone and let the bus and children clear before finishing.':'Park the whole van inside the marked finish bay and set the parking brake.');return false;
    }
    scene.finishScenario();return true;
  },
  controls(scene){
    const k=OTR.fpAccess.key.bind(OTR.fpAccess);scene.showPanel('Use the school-drive controls.',
      `Use ${k('KeyW')} to accelerate, ${k('KeyS')} to brake, and ${k('KeyA')}/${k('KeyD')} to steer. Look with the mouse or ${OTR.fpAccess.lookKeys()}. Press ${k('KeyP')} to select a nearby physical cab control and ${k('KeyE')} to use it.`,[
      {label:'Read the cab shortcuts.',action:()=>this.shortcuts(scene)},
      {label:'Return to the road.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  },
  shortcuts(scene){
    const k=OTR.fpAccess.key.bind(OTR.fpAccess);scene.showPanel('Use the cab shortcuts.',
      `Press ${k('Space')} to set or release the parking brake, ${k('KeyB')} for the seatbelt, ${k('KeyR')} for drive or reverse, ${k('KeyQ')}/${k('KeyC')} for the left or right signal, ${k('KeyL')} for headlights, and ${k('KeyK')} for wipers. Press ${k('KeyV')} to look forward.`,[
      {label:'Read the finish controls.',action:()=>this.finishControls(scene)},
      {label:'Return to the road.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  },
  finishControls(scene){
    const k=OTR.fpAccess.key.bind(OTR.fpAccess);scene.showPanel('Finish the school drive.',
      `Follow the mounted sat nav to the finish bay. Press ${k('KeyF')} to finish after parking, or use the finish option on the device with ${k('Tab')}. Read a visible road sign with ${k('KeyJ')}. The rear camera is automatic in reverse. Look at the physical mirrors to check them.`,[
      {label:'Return to the road.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  }
};

OTR.fpScenario?.register('school-zone-drive',{
  piece:'street',goal:'Drive through the school zone, wait for the bus and children, and park in the marked bay.',seconds:600,
  model(){return OTR.fpSchoolLesson.model();},
  setup(run){OTR.fpSchoolLesson.attach(run);},
  brief(run){
    const k=OTR.fpAccess.key.bind(OTR.fpAccess);return [
      `Use ${k('KeyW')} to accelerate, ${k('KeyS')} to brake, and ${k('KeyA')}/${k('KeyD')} to steer. Fasten the seatbelt with its physical control or ${k('KeyB')}. Look at the mirrors and signal before moving off.`,
      'Read the entry sign, then look forward before moving off. Keep to the school-zone speed limit. Stop before the school bus when its red lights flash. Wait until its lights go off and the children are clear before continuing.',
      `Follow the sat nav to ${run.model.stops[0].address}. Park the whole van in the marked bay, set the parking brake and press ${k('KeyF')} to finish. The mounted screen and ${k('Tab')} offer the same finish action. You can read the controls from the pause menu.`
    ];
  },
  report(run,type,detail){OTR.fpSchoolLesson.report(run,type,detail);},
  controls(run,scene){OTR.fpSchoolLessonUI.controls(scene);},
  key(run,scene,code){if(code==='KeyF'){OTR.fpSchoolLessonUI.finish(scene);return true;}return false;},
  handheld(run,scene){OTR.fpSchoolLessonUI.show(scene);},
  interact(run,scene,id){
    if(id==='cab-camera'&&run.model.van.gear!==-1||id==='dispatch'||id&&id.startsWith('visit')){OTR.fpSchoolLessonUI.show(scene);return true;}
    return !!id&&id!=='driver'&&!id.startsWith('cab-')&&!id.startsWith('mirror-');
  },
  hint(run,id,key){if(id==='cab-camera'&&run.model.van.gear!==-1||id==='dispatch'||id&&id.startsWith('visit'))return `Press ${key} to read the school route and finish details.`;return null;},
  result(run,reason){return OTR.fpSchoolLesson.result(run,reason);}
});
