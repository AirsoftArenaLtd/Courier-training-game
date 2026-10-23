/* The real mounted device and remappable keys share one checkpoint action. No answer coaching in assessments. */
window.OTR=window.OTR||{};
OTR.fpDrivingLessonUI={
  show(scene,notice=''){
    const m=scene.model,s=m.drivingLesson,stop=m.stops[s.checkpoint];if(!stop)return;
    scene.handheld.show({title:'Read the driving route.',lines:[notice,`Checkpoint ${stop.index} of ${m.stops.length} is at ${stop.address}.`,
      'Park the whole van in the marked bay and set the parking brake before recording the checkpoint.'].filter(Boolean),options:[
      {label:'Record this checkpoint.',onPick:()=>{scene.handheld.close();this.record(scene);}},
      {label:'Read the driving controls.',onPick:()=>{scene.handheld.close(false);this.controls(scene);}},
      {label:'Return to the road.',onPick:()=>scene.handheld.close()}
    ],back:()=>scene.handheld.close()});
  },
  record(scene){
    const r=scene.scenarioSession,m=scene.model,s=m.drivingLesson;if(r.phase!=='active')return false;
    if(!OTR.fpDrivingLesson.tryCheckpoint(r)){scene.message(s.parking.reason);return false;}
    OTR.audio.play('success');
    if(s.checkpoint>=s.content.checkpoints){scene.finishScenario();return true;}
    if(s.content.rainFrom!==undefined&&s.checkpoint>=s.content.rainFrom&&!s.weatherChanged){
      s.weatherChanged=true;m.routePlan.weather='rain';m.routePlan.timeOfDay='dusk';m.briefing.weather='rain';scene.rebuildWorld();
    }
    const stop=m.stops[s.checkpoint],rain=s.weatherChanged?' Rain is reducing visibility. Use the headlights and wipers and leave more space.':'';
    scene.showPanel('The checkpoint is recorded.',`Checkpoint ${s.checkpoint} is complete. Continue to ${stop.address}.`+rain,[
      {label:'Continue the driving route.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});scene.sync();scene.refresh();return true;
  },
  controls(scene){
    const k=OTR.fpAccess.key.bind(OTR.fpAccess);scene.showPanel('Use the driving controls.',
      `Use ${k('KeyW')} to accelerate, ${k('KeyS')} to brake, and ${k('KeyA')}/${k('KeyD')} to steer. Look with the mouse or ${OTR.fpAccess.lookKeys()}. Press ${k('KeyP')} to select a nearby physical cab control and ${k('KeyE')} to use it.`,[
      {label:'Read the cab shortcuts.',action:()=>this.shortcuts(scene)},
      {label:'Return to the road.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  },
  shortcuts(scene){
    const k=OTR.fpAccess.key.bind(OTR.fpAccess);scene.showPanel('Use the cab shortcuts.',
      `Press ${k('Space')} to set or release the parking brake, ${k('KeyB')} for the seatbelt, ${k('KeyR')} for drive or reverse, ${k('KeyQ')}/${k('KeyC')} for the left or right signal, ${k('KeyL')} for headlights, and ${k('KeyK')} for wipers. Press ${k('KeyV')} to look forward.`,[
      {label:'Read the checkpoint controls.',action:()=>this.checkpoints(scene)},
      {label:'Return to the road.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  },
  checkpoints(scene){
    const k=OTR.fpAccess.key.bind(OTR.fpAccess);scene.showPanel('Record the driving checkpoints.',
      `Follow the mounted sat nav. Press ${k('KeyF')} to record a checkpoint after parking, or press ${k('Tab')} for the device. Read a visible road sign with ${k('KeyJ')}. The rear camera is automatic in reverse. Look at the physical mirrors to check them.`,[
      {label:'Return to the road.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  }
};
