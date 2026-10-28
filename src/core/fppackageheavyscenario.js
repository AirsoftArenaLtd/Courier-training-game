/* The optional heavy practice shares the physical bay, not the original five-load grading. */
window.OTR=window.OTR||{};
OTR.fpPackageHeavyUI={
  limit:'The posted solo lifting limit is 50 lb (23 kg). Use help or equipment for heavier or awkward loads.',
  next(scene){
    const s=scene.model.packageLift;
    if(!OTR.fpPackageHeavy.next(s)){if(s.phase==='done')scene.finishScenario();return;}
    scene.closePanel();Object.assign(scene.model.player,{x:s.bay.body.x,z:s.bay.body.z});OTR.fpPackageLiftScenario.faceLoad(scene);scene.sync();
  },
  assess(scene){
    const s=scene.model.packageLift;if(s.phase!=='assess')return;
    scene.showPanel('Choose how to move this load.',this.limit+'\n\n'+s.lift.prompt,s.lift.options.map((option,index)=>({label:OTR.fpPackageLiftScenario.labels[s.lift.id][index],action:()=>{
      if(!OTR.fpPackageHeavy.choose(s,index))return;scene.closePanel();scene.sync();
      if(s.bay.mode==='waiting-helper')OTR.fpPackageLiftScenario.acknowledge(scene,'The team lift is waiting for your coworker. Use the call button at the gauge stand.');
      else if(s.bay.mode==='equipment')OTR.fpPackageLiftScenario.acknowledge(scene,'The hand truck is ready. Step beside its handle and take it before moving the load.');
    }})),{accessibleText:true,back:()=>scene.closePanel()});
  },
  controls(scene){
    const back=()=>scene.closePanel();scene.showPanel('Handle heavy and awkward loads.',this.limit,[
      {label:'Read the lifting controls.',action:()=>OTR.fpPackageLiftScenario.controls(scene)},
      {label:'Continue handling the load.',action:back}
    ],{accessibleText:true,back});
  },
  reading(scene){
    const s=scene.model.packageLift,back=()=>scene.handheld.close();scene.handheld.show({title:'Read the lifting bay status.',
      lines:['The posted solo lifting limit is 50 lb (23 kg).',`This load weighs ${s.lift.weight} pounds.`],
      options:[{label:'Read the lifting controls.',onPick:()=>{scene.handheld.close(false);this.controls(scene);}},{label:'Continue handling the load.',onPick:back}],back});
  },
  verdict(scene){
    const s=scene.model.packageLift,coaching=OTR.fpScenario.coaching(scene.scenarioSession);s.bay.mode='shown-verdict';
    scene.showPanel('The load has been handled.',coaching?this.limit:'Your decision has been recorded.',[
      {label:s.index+1<s.content.lifts.length?'Handle the next load.':'Finish the lifting practice.',action:()=>this.next(scene)}
    ],{accessibleText:true,back:()=>{}});
  }
};
OTR.fpScenario.register('heavy-load-bay',{
  piece:'depot',goal:'Move heavy or awkward loads safely.',seconds:480,
  setup(run,m){
    const H=OTR.fpPackageHeavy,s=m.packageLift=H.create(run.content);m.parcels=[];m.cargoOpen=false;m.solids.push(...OTR.fpPackageLiftWorld.solids());
    H.next(s);Object.assign(m.player,{x:s.bay.body.x,z:s.bay.body.z,yaw:Math.atan2(s.bay.parcel.x-s.bay.body.x,-(s.bay.parcel.z-s.bay.body.z)),pitch:.4});
    const input={left:false,right:false,up:false,down:false};
    m.step=(controls,seconds)=>{if(m.paused||run.phase!=='active')return;const dt=Math.max(0,Math.min(.05,Number(seconds)||0));m.elapsed+=dt;input.left=!!controls.left;input.right=!!controls.right;input.up=!!controls.forward;input.down=!!controls.back;H.step(s,input,dt);m.player.x=s.bay.body.x;m.player.z=s.bay.body.z;};
  },
  update(run,scene){
    const s=run.model.packageLift,a=s.heavy.active,HUI=OTR.fpPackageHeavyUI;OTR.fpPackageHeavy.observe(s);
    if(s.bay.pivoted){s.bay.pivoted=false;OTR.fpPackageLiftScenario.faceLoad(scene);}
    if(a.soloRaised&&!a.announced){a.announced=true;if(OTR.fpScenario.coaching(run))OTR.fpPackageLiftScenario.acknowledge(scene,'The load rose above the floor without help. It exceeds the posted solo lifting limit.');}
    if(s.bay.mode==='verdict')HUI.verdict(scene);
    else if(s.bay.mode==='unload'&&!s.bay.unloadNotice){s.bay.unloadNotice=true;OTR.fpPackageLiftScenario.acknowledge(scene,'The hand truck is at the pallet. Use its handle to unload the load.');}
  },
  interact(run,scene,id){
    const s=run.model.packageLift,H=OTR.fpPackageHeavy,A=OTR.fpPackageLiftScenario;if(!s.lift)return true;
    if(!id||scene.art.pick()!==id){A.acknowledge(scene,'Look at the nearby load, hand truck or gauge stand before using the action key.');return true;}
    if(id==='lift-parcel'){
      if(s.phase==='assess')OTR.fpPackageHeavyUI.assess(scene);
      else if(s.bay.mode==='waiting-helper')A.acknowledge(scene,'The team lift is waiting for your coworker.');
      else if(s.bay.mode==='equipment')A.acknowledge(scene,'The hand truck is ready to move this load.');
      else if(!H.grip(s))A.acknowledge(scene,'The load is outside your grip. Adjust your stance before trying again.');else scene.sync();
    }else if(id==='lift-help'){A.acknowledge(scene,H.requestHelper(s)?'Your coworker is ready to lift with you.':'No team lift is waiting.');scene.sync();}
    else if(id==='lift-truck'){
      if(s.bay.mode==='unload'){H.unload(s);scene.sync();}
      else if(H.takeHandle(s)){A.faceLoad(scene);scene.sync();}else A.acknowledge(scene,'Stand beside the hand truck handle before moving it.');
    }else if(id==='lift-gauge')OTR.fpPackageHeavyUI.reading(scene);
    else A.acknowledge(scene,'Use the lifting bay load, hand truck or gauge stand.');return true;
  },
  handheld(run,scene){OTR.fpPackageHeavyUI.reading(scene);},
  controls(run,scene){OTR.fpPackageHeavyUI.controls(scene);},
  status(run){return OTR.fpScenario.definitions.get('package-lift-bay').status(run);},
  keyHint(){return OTR.fpScenario.definitions.get('package-lift-bay').keyHint();},
  result(run,reason){return OTR.fpPackageHeavy.result(run.model.packageLift,reason);}
});
