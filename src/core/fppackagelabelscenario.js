/* The existing label assessment, operated at a real six-sided inspection table and numbered stations. */
window.OTR=window.OTR||{};
OTR.fpPackageLabelScenario={
  controls(scene,page=0){
    const s=scene.model.packageLabels,back=()=>scene.closePanel();
    const body=page?OTR.fpPackageLabelWorld.stations.slice((page-1)*3,page*3).map((id,i)=>`Station ${(page-1)*3+i+1} is ${s.content.stations[id].label.toLowerCase()}.`).join('\n'):
      `Stand in front of the inspection table. Look at the package and press ${OTR.fpAccess.key('KeyE')} or ${OTR.fpAccess.key('Tab')} to turn it using the handheld. Close the handheld and look at the exposed side before turning again. Walk to a numbered station, select it with ${OTR.fpAccess.key('KeyP')} and press ${OTR.fpAccess.key('KeyE')} to place the package.`;
    scene.showPanel('Use the package inspection controls.',body,[
      {label:page===2?'Read the inspection controls.':'Read the handling station numbers.',action:()=>this.controls(scene,(page+1)%3)},
      {label:'Continue inspecting the package.',action:back}
    ],{accessibleText:true,back});
  },
  next(scene){
    const r=scene.scenarioSession,s=r.model.packageLabels;if(!OTR.fpPackageLabels.next(s,{frontVisible:false})){scene.finishScenario();return;}
    s.presentationFace='front';scene.closePanel();scene.sync();
  },
  near(scene){
    const a=scene.art.packageLabels,s=scene.model.packageLabels;
    return !!a&&s.answering&&scene.view.camera.position.z>=OTR.fpPackageLabelWorld.center.z+.6&&OTR.fpPackageLabels.faces.some(face=>a.visible(face,scene.view.camera));
  },
  read(scene){
    const s=scene.model.packageLabels,a=scene.art.packageLabels,face=s.presentationFace;
    if(!a?.visible(face,scene.view.camera))return 'Move close enough to see the whole package face.';
    const marks=s.item.marks?.[face]||[],parts=[`You are looking at the ${OTR.fpPackageLabels.faceNames[face].toLowerCase()}.`];
    if(face==='front')parts.push('This side carries the shipping label.');
    parts.push(marks.length?`This side carries these marks: ${marks.map(id=>OTR.fpPackageLabels.markName(s,id)).join(', ')}.`:'There are no handling marks on this side.');
    if(s.item.damage?.face===face)parts.push(s.item.damage.kind==='leak'?'Liquid is leaking from this side.':'This side is crushed.');
    return parts.join(' ');
  },
  inspect(scene,page=0){
    const s=scene.model.packageLabels,A=this;if(!s.answering)return;
    if(!this.near(scene)){
      const back=()=>scene.closePanel();scene.showPanel('Return to the package inspection table.','Stand in front of the inspection table and look at the package before turning it.',[
        {label:'Continue inspecting the package.',action:back}
      ],{accessibleText:true,back});return;
    }
    // Two faces per page keep larger translated text out of the device's Back area.
    const options=OTR.fpPackageLabels.faces.slice(page*2,page*2+2).map(face=>({
      label:`Turn the package to show the ${OTR.fpPackageLabels.faceNames[face].toLowerCase()}.`,onPick:()=>{
        s.presentationFace=face;scene.art.packageLabels.turn(face);scene.handheld.close();scene.sync();
      }}));
    options.push({label:'Show more sides of the package.',onPick:()=>A.inspect(scene,(page+1)%3)});
    if(OTR.fpScenario.coaching(scene.scenarioSession))options.push({label:'Read the handling guide.',onPick:()=>A.guide(scene)});
    scene.handheld.show({title:`Inspect package ${s.index+1} of ${s.queue.length}.`,lines:[this.read(scene)],options,back:()=>scene.handheld.close()});
  },
  guide(scene,page=0){
    const s=scene.model.packageLabels;if(!OTR.fpScenario.coaching(scene.scenarioSession)){scene.handheld.close();return;}
    const entry=s.content.guide[page];s.guideOpen=true;
    const line=entry?`${entry.name}: ${entry.meaning}`:'When several rules apply, use the first matching station in this order: isolate and report, hazmat cage, fragile shelf, upright cart, dry rack, belt.';
    scene.handheld.show({title:'Read the handling guide.',lines:[line],options:[
      {label:'Read the next handling mark.',onPick:()=>this.guide(scene,(page+1)%(s.content.guide.length+1))},
      {label:'Return to inspecting the package.',onPick:()=>{s.guideOpen=false;scene.handheld.close();}}
    ],back:()=>{s.guideOpen=false;scene.handheld.close();}});
  },
  station(scene,id){
    const r=scene.scenarioSession,s=r.model.packageLabels,p=OTR.fpPackageLabelWorld.stationPoint(id),camera=scene.view.camera;
    if(!s.answering||!p||Math.hypot(camera.position.x-p.x,camera.position.z-p.z)>2.65)return;
    const number=OTR.fpPackageLabelWorld.stations.indexOf(id)+1;
    scene.showPanel('Choose the handling station.',`Station ${number} is ${s.content.stations[id].label.toLowerCase()}.`,[
      {label:'Place the package at this station.',action:()=>{scene.closePanel();const outcome=OTR.fpPackageLabels.answer(s,id);if(outcome)this.verdict(scene,outcome);}},
      {label:'Keep inspecting the package.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  },
  verdict(scene,outcome){
    const s=scene.model.packageLabels,practice=OTR.fpScenario.coaching(scene.scenarioSession);
    scene.showPanel('Continue the package inspection.',practice?(outcome.station?(outcome.ok?'You chose the correct handling station. ':'That handling station does not match the package. ')+s.item.explain:'The time for this package has ended.'):'Your decision has been recorded.',[
      {label:s.index+1<s.queue.length?'Inspect the next package.':'Finish the label inspection.',action:()=>this.next(scene)}
    ],{accessibleText:true,back:()=>{}});
  }
};
OTR.fpScenario.register('package-label-station',{
  piece:'depot',goal:'Inspect every side of each package and choose its handling station.',seconds:360,
  setup(run,m){
    const s=m.packageLabels=OTR.fpPackageLabels.create(run.content,{log:run.log});s.presentationFace='front';
    Object.assign(m.player,{x:-10,z:16.6,yaw:0,pitch:0});m.parcels=[];m.cargoOpen=false;m.solids.push(...OTR.fpPackageLabelWorld.solids());
  },
  update(run,scene,dt){
    const s=run.model.packageLabels;if(s.phase==='brief'){OTR.fpPackageLabelScenario.next(scene);return;}
    if(!s.answering)return;
    // Closing the device by Tab/Escape must release a guide opened on the previous page as well.
    s.guideOpen=false;for(const face of OTR.fpPackageLabels.faces)if(scene.art.packageLabels.visible(face,scene.view.camera))OTR.fpPackageLabels.see(s,face);
    const outcome=OTR.fpPackageLabels.advance(s,dt);if(outcome)OTR.fpPackageLabelScenario.verdict(scene,outcome);
  },
  interact(run,scene,id){
    if(id==='label-package')OTR.fpPackageLabelScenario.inspect(scene);
    else if(id?.startsWith('label-station-'))OTR.fpPackageLabelScenario.station(scene,id.slice(14));
    else scene.message('Use the package inspection table and the numbered handling stations.');
    return true;
  },
  handheld(run,scene){OTR.fpPackageLabelScenario.inspect(scene);},
  controls(run,scene){OTR.fpPackageLabelScenario.controls(scene);},
  result(run){return OTR.fpPackageLabels.result(run.model.packageLabels);}
});
