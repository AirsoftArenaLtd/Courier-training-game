/* Draft night-run controls. Not loaded or registered by the game until native acceptance. */
window.OTR=window.OTR||{};
OTR.fpNightLessonUI={
  show(scene){
    scene.handheld.show({title:'Read the night route.',lines:[`The finish bay is at ${scene.model.stops[0].address}.`],options:[
      {label:'Finish the night run.',onPick:()=>{scene.handheld.close();this.finish(scene);}},
      {label:'Return to the road.',onPick:()=>scene.handheld.close()}
    ],back:()=>scene.handheld.close()});OTR.fpDrivingLessonUI.fitDevice(scene);
  },
  finish(scene){
    const run=scene.scenarioSession;if(run.phase!=='active')return false;
    if(!OTR.fpNightLesson.ready(run.model)){scene.message('Follow the night route behind the lead vehicle, then park the whole van in the marked bay and set the parking brake.');return false;}
    scene.finishScenario();return true;
  },
  controls(scene){
    const k=OTR.fpAccess.key.bind(OTR.fpAccess);scene.showPanel('Use the night-run controls.',
      `Walk with ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} and look with the mouse or ${OTR.fpAccess.lookKeys()}. Select a nearby physical target with ${k('KeyP')} and use it with ${k('KeyE')}. Check the headlights at the front of the van before entering the cab.`,[
      {label:'Read the cab shortcuts.',action:()=>this.shortcuts(scene)},
      {label:'Return to the road.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  },
  shortcuts(scene){
    const k=OTR.fpAccess.key.bind(OTR.fpAccess);scene.showPanel('Use the cab shortcuts.',
      `Use ${k('KeyW')} to accelerate, ${k('KeyS')} to brake, and ${k('KeyA')}/${k('KeyD')} to steer. Press ${k('KeyB')} for the seatbelt, ${k('Space')} for the parking brake, ${k('KeyL')} for the headlights, and ${k('KeyQ')}/${k('KeyC')} to signal. Look at the physical mirrors to check them.`,[
      {label:'Read the finish controls.',action:()=>this.finishControls(scene)},
      {label:'Return to the road.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  },
  finishControls(scene){
    const k=OTR.fpAccess.key.bind(OTR.fpAccess);scene.showPanel('Finish the night run.',
      `Follow the mounted sat nav. Keep at least a three-second gap behind the lead vehicle. Drive within the distance the headlights illuminate. Park in the marked finish bay and press ${k('KeyF')}, or use the finish option on the device with ${k('Tab')}.`,[
      {label:'Return to the road.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  }
};

OTR.fpScenario?.register('night-route-drive',{
  piece:'street',goal:'Check the headlights, follow the night route with a safe gap, and park in the marked bay.',seconds:900,
  model(){return OTR.fpNightLesson.model();},setup(run){OTR.fpNightLesson.attach(run);},
  brief(run){
    const k=OTR.fpAccess.key.bind(OTR.fpAccess);return [
      `Walk to the front of the van. Look at the headlights and press ${k('KeyE')} to inspect them. Assess the light test and request a repair if needed. Inspect before the van moves.`,
      `Enter the cab at the driver door with ${k('KeyE')}. Fasten the seatbelt, switch on the headlights with ${k('KeyL')} or their physical control, check the mirrors and signal before moving off.`,
      `Follow the sat nav to ${run.model.stops[0].address}. Keep at least a three-second gap behind the lead vehicle and drive within the headlight range. Park the whole van in the marked bay and set the parking brake, then press ${k('KeyF')} or use the finish option on the device with ${k('Tab')}.`
    ];
  },
  controls(run,scene){OTR.fpNightLessonUI.controls(scene);},
  key(run,scene,code){if(code==='KeyF'){OTR.fpNightLessonUI.finish(scene);return true;}return false;},
  handheld(run,scene){OTR.fpNightLessonUI.show(scene);},
  interact(run,scene,id){
    if(id==='cab-camera'&&run.model.van.gear!==-1||id==='dispatch'||id&&id.startsWith('visit')){OTR.fpNightLessonUI.show(scene);return true;}
    return !!id&&id!=='driver'&&id!=='lights'&&!id.startsWith('cab-')&&!id.startsWith('mirror-');
  },
  hint(run,id,key){if(id==='cab-camera'&&run.model.van.gear!==-1||id==='dispatch'||id&&id.startsWith('visit'))return `Press ${key} to read the night route and finish details.`;return null;},
  result(run,reason){return OTR.fpNightLesson.result(run,reason);}
});
