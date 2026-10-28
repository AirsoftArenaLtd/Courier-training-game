/* Physical sat nav and remapped checkpoint key advance the same three-round junction exercise. */
window.OTR=window.OTR||{};
OTR.fpJunctionLessonUI={
  show(scene){
    const m=scene.model,s=m.junctionLesson;
    scene.handheld.show({title:'Read the junction route.',lines:[`Approach ${s.index+1} of 3. Follow the sat nav to ${m.stops[0].address}.`],options:[
      {label:'Record this checkpoint.',onPick:()=>{scene.handheld.close();this.record(scene);}},
      {label:'Return to the road.',onPick:()=>scene.handheld.close()}
    ],back:()=>scene.handheld.close()});OTR.fpDrivingLessonUI.fitDevice(scene);
  },
  record(scene){
    const run=scene.scenarioSession,m=scene.model,s=m.junctionLesson;
    if(run.phase!=='active'||s.recorded)return false;
    if(!OTR.fpJunctionLesson.record(run)){
      scene.message(!s.crossed?'Drive through the junction on the planned approach before recording this checkpoint.':
        s.travel<=10?'Follow the sat nav through the junction to the marked bay.':s.parking.reason);return false;
    }
    OTR.audio.play('success');scene.handheld.close(false);scene.closePanel(false);
    if(run.junctionLesson.index>=OTR.fpJunctionLesson.rounds.length){scene.finishScenario();return true;}
    scene.held=Object.create(null);scene.target=null;scene.notice='';scene.noticeUntil=0;
    scene.model=OTR.fpScenario.model(run);scene.area='route';scene.rebuildWorld();scene.sync();
    scene.showPanel('Begin the next junction approach.',`Approach ${run.junctionLesson.index+1} of 3. Follow the sat nav, then park the whole van in the marked bay and set the parking brake.`,[
      {label:'Begin the next approach.',action:()=>scene.closePanel()},
      {label:'Read the controls.',action:()=>OTR.fpDrivingLessonUI.controls(scene)}
    ],{accessibleText:true,back:()=>scene.closePanel()});scene.refresh();return true;
  }
};

OTR.fpScenario.register('junction-approaches',{
  piece:'street',goal:'Complete the three junction approaches and park in each marked bay.',seconds:900,
  model(run){return OTR.fpJunctionLesson.model(run);},
  setup(run){OTR.fpJunctionLesson.attach(run);},
  brief(){
    const k=OTR.fpAccess.key.bind(OTR.fpAccess);return [
      `Use ${k('KeyW')} to accelerate, ${k('KeyS')} to brake, and ${k('KeyA')}/${k('KeyD')} to steer. Fasten the seatbelt with its physical control or ${k('KeyB')}. Look at the physical mirrors and signal for three seconds before moving off.`,
      'Complete a stop-sign approach, a red-light approach and a give-way approach. Stop behind the stop line, wait for green at a red light and give way to traffic with priority. Each approach starts with the van parked.',
      `Follow the mounted sat nav. Park the whole van in the marked bay, facing with traffic, and set the parking brake. Press ${k('KeyF')} to record the checkpoint, or use the same action on the device with ${k('Tab')}.`
    ];
  },
  controls(run,scene){OTR.fpDrivingLessonUI.controls(scene);},
  key(run,scene,code){if(code==='KeyF'){OTR.fpJunctionLessonUI.record(scene);return true;}return false;},
  handheld(run,scene){OTR.fpJunctionLessonUI.show(scene);},
  interact(run,scene,id){
    if(id==='cab-camera'&&run.model.van.gear!==-1||id==='dispatch'||id&&id.startsWith('visit')){OTR.fpJunctionLessonUI.show(scene);return true;}
    return !!id&&id!=='driver'&&!id.startsWith('cab-')&&!id.startsWith('mirror-');
  },
  hint(run,id,key){if(id==='cab-camera'&&run.model.van.gear!==-1||id==='dispatch'||id&&id.startsWith('visit'))return `Press ${key} to read the junction route and checkpoint details.`;return null;},
  result(run,reason){return OTR.fpJunctionLesson.result(run,reason);}
});
