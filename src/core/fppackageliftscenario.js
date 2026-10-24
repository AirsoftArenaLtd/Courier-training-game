/* First-person lifting: the existing local result, physical posture, coworker, platform and hand truck. */
window.OTR=window.OTR||{};
OTR.fpPackageLiftScenario={
  labels:{
    light:['Lift this load with good form.','Ask a coworker to help with this load.'],
    medium:['Lift this load with good form.','Use the hand truck to move this load.','Bend at the waist and yank the load upward.'],
    awkward:['Ask a coworker to hold the other end.','Lift the long box without a coworker.'],
    heavy:['Use the hand truck to move this load.','Ask a coworker to help with this load.','Lift the heavy crate without help.'],
    shelf:['Use the platform to bring the load within reach.','Pull the load down from above your head.','Climb the shelving to reach the load.']
  },
  faceLoad(scene){const s=scene.model.packageLift,b=s.bay,p=scene.model.player;p.yaw=Math.atan2(b.parcel.x-b.body.x,-(b.parcel.z-b.body.z));p.pitch=Math.min(.9,Math.atan2(b.body.eye-b.parcel.y,Math.hypot(b.parcel.x-b.body.x,b.parcel.z-b.body.z)));},
  acknowledge(scene,text){const back=()=>scene.closePanel();scene.showPanel('Continue the lifting practice.',text,[{label:'Continue handling the load.',action:back}],{accessibleText:true,back});},
  next(scene){
    const s=scene.model.packageLift;if(!OTR.fpPackageLiftBay.next(s)){scene.finishScenario();return;}scene.closePanel();Object.assign(scene.model.player,{x:s.bay.body.x,z:s.bay.body.z});this.faceLoad(scene);scene.sync();
  },
  controls(scene,page=0){
    const key=code=>OTR.fpAccess.key(code),body=page?
      `Use the coworker call button before starting a team lift. For a hand truck, step beside its handle with ${key('KeyD')} and press ${key('KeyE')} to take the handle. Hold ${key('KeyA')} to move the truck to the pallet. Use its handle again to unload it. The platform keeps you at the right height for the shelf load until you grip it.`:
      `Select the load with ${key('KeyP')} and press ${key('KeyE')} to choose how to move it. Hold ${key('KeyD')} to step closer. Hold ${key('KeyS')} to bend your knees and ${key('KeyW')} to stand up. Look at the load and press ${key('KeyE')} to grip or release it. Holding ${key('KeyA')} pivots your feet and steps toward the pallet. Look with the arrow keys or mouse.`;
    const back=()=>scene.closePanel();scene.showPanel('Use the lifting bay controls.',body,[{label:page?'Read the posture controls.':'Read the team and equipment controls.',action:()=>this.controls(scene,1-page)},{label:'Continue handling the load.',action:back}],{accessibleText:true,back});
  },
  assess(scene){
    const s=scene.model.packageLift;if(s.phase!=='assess')return;
    scene.showPanel('Choose how to move this load.',s.lift.prompt,s.lift.options.map((option,index)=>({label:this.labels[s.lift.id][index],action:()=>{
      if(!OTR.fpPackageLiftBay.choose(s,index))return;scene.closePanel();scene.sync();
      if(s.bay.mode==='waiting-helper')this.acknowledge(scene,'The team lift is waiting for your coworker. Use the call button at the gauge stand.');
      else if(s.bay.mode==='equipment')this.acknowledge(scene,'The hand truck is ready. Step beside its handle and take it before moving the load.');
    }})),{accessibleText:true,back:()=>scene.closePanel()});
  },
  reading(scene){
    const s=scene.model.packageLift,back=()=>scene.handheld.close();
    scene.handheld.show({title:'Read the lifting bay status.',lines:[`This load weighs ${s.lift.weight} pounds.`,`Your back health is ${Math.round(s.health)} out of 100.`,`Your knees are ${Math.round(s.pose.squat*100)} percent bent.`],options:[{label:'Read the lifting controls.',onPick:()=>{scene.handheld.close(false);this.controls(scene);}},{label:'Continue handling the load.',onPick:back}],back});
  },
  verdict(scene){
    const s=scene.model.packageLift,practice=OTR.fpScenario.coaching(scene.scenarioSession);s.bay.mode='shown-verdict';
    scene.showPanel('The load has been handled.',practice?`Your back health is ${Math.round(s.health)} out of 100.`:'Your decision has been recorded.',[{label:s.index+1<s.content.lifts.length?'Handle the next load.':'Finish the lifting practice.',action:()=>this.next(scene)}],{accessibleText:true,back:()=>{}});
  }
};
OTR.fpScenario.register('package-lift-bay',{
  piece:'depot',goal:'Choose a safe lifting method and move each load onto the pallet.',seconds:480,
  setup(run,m){
    const B=OTR.fpPackageLiftBay,s=m.packageLift=B.create(run.content);m.parcels=[];m.cargoOpen=false;m.solids.push(...OTR.fpPackageLiftWorld.solids());
    s.bay.controls={left:false,right:false,up:false,down:false};B.next(s);Object.assign(m.player,{x:s.bay.body.x,z:s.bay.body.z,yaw:Math.atan2(s.bay.parcel.x-s.bay.body.x,-(s.bay.parcel.z-s.bay.body.z)),pitch:.4});
    m.step=(input,seconds)=>{if(m.paused||run.phase!=='active')return;const dt=Math.max(0,Math.min(.05,Number(seconds)||0));m.elapsed+=dt;const k=s.bay.controls;k.left=!!input.left;k.right=!!input.right;k.up=!!input.forward;k.down=!!input.back;B.step(s,k,dt);m.player.x=s.bay.body.x;m.player.z=s.bay.body.z;};
  },
  update(run,scene){
    const s=run.model.packageLift;if(s.phase==='brief'){OTR.fpPackageLiftScenario.next(scene);return;}
    if(s.bay.pivoted){s.bay.pivoted=false;OTR.fpPackageLiftScenario.faceLoad(scene);}
    if(s.bay.mode==='verdict')OTR.fpPackageLiftScenario.verdict(scene);else if(s.bay.mode==='unload'&&!s.bay.unloadNotice){s.bay.unloadNotice=true;OTR.fpPackageLiftScenario.acknowledge(scene,'The hand truck is at the pallet. Use its handle to unload the load.');}
  },
  interact(run,scene,id){
    const s=run.model.packageLift,A=OTR.fpPackageLiftScenario;if(!s.lift)return true;
    if(!id||scene.art.pick()!==id){A.acknowledge(scene,'Look at the nearby load, hand truck or gauge stand before using the action key.');return true;}
    if(id==='lift-parcel'){
      if(s.phase==='assess')A.assess(scene);
      else if(s.bay.mode==='waiting-helper')A.acknowledge(scene,'The team lift is waiting for your coworker.');
      else if(s.bay.mode==='equipment')A.acknowledge(scene,'The hand truck is ready to move this load.');
      else if(!OTR.fpPackageLiftBay.grip(s))A.acknowledge(scene,'The load is outside your grip. Adjust your stance before trying again.');else scene.sync();
    }else if(id==='lift-help'){
      A.acknowledge(scene,OTR.fpPackageLiftBay.requestHelper(s)?'Your coworker is ready to lift with you.':'No team lift is waiting.');scene.sync();
    }else if(id==='lift-truck'){
      if(s.bay.mode==='unload'){OTR.fpPackageLiftBay.unload(s);scene.sync();}
      else if(OTR.fpPackageLiftBay.takeHandle(s)){A.faceLoad(scene);scene.sync();}else A.acknowledge(scene,'Stand beside the hand truck handle before moving it.');
    }else if(id==='lift-gauge')A.reading(scene);
    else A.acknowledge(scene,'Use the lifting bay load, hand truck or gauge stand.');return true;
  },
  status(run){
    const s=run.model.packageLift;if(!s.lift)return '';const health=Math.round(s.health),load=s.bay.mode==='posture'&&s.measure.reachable?Math.round(s.measure.load*100):0,stamp=health*101+load;
    if(s.bay.captionStamp!==stamp){s.bay.captionStamp=stamp;s.bay.caption=`Your back health is ${health} out of 100. Your spine load is ${load} percent.`;}return s.bay.caption;
  },
  handheld(run,scene){if(run.model.packageLift.lift)OTR.fpPackageLiftScenario.reading(scene);},
  controls(run,scene){OTR.fpPackageLiftScenario.controls(scene);},
  keyHint(){const k=code=>OTR.fpAccess.key(code);return `Use ${k('KeyA')}/${k('KeyD')} to step and ${k('KeyS')}/${k('KeyW')} to bend or straighten your knees. Press ${k('KeyP')} to select a target and ${k('KeyE')} to interact.`;},
  timeout(run,scene){
    run.phase='timed-out';scene.showPanel('The lifting practice has ended.','There is no result because not every load was handled.',[{label:'Return to the station.',action:()=>scene.toHub()}],{accessibleText:true,back:()=>scene.toHub()});
  },
  result(run){const result=OTR.fpPackageLift.result(run.model.packageLift);if(!result)throw Error('The lifting sequence is incomplete');return {...result,log:null};}
});
