/* The two original M6 scenarios use physical cargo actions and the original local result scale. */
window.OTR=window.OTR||{};
OTR.fpLoadingScenario={
  panel(scene,title,body,choices){
    const s=scene.model.loading,phase=s.phase,round=s.roundIndex;
    scene.showPanel(title,body,choices.map(ch=>({...ch,action:()=>{if(scene.scenarioSession.phase==='active'&&scene.model.loading===s&&s.phase===phase&&s.roundIndex===round)ch.action();}})),{accessibleText:true,back:()=>scene.closePanel()});
  },
  notice(scene,body){this.panel(scene,'Read the cargo information.',body,[{label:'Return to the cargo.',action:()=>scene.closePanel()}]);},
  label(scene,id){
    const s=scene.model.loading,p=OTR.fpLoading.parcel(s,id);if(!p||p.pulled)return;
    const held=s.held===id,lines=[`This package is for ${p.to}.`,`The address is ${p.number} ${p.street}.`,...(p.unit?[`The unit is ${p.unit}.`]:[]),`It weighs ${p.weight} pounds.`,...(s.mode==='load'?[`It is for stop ${p.stop}.`]:[]),...(p.fragile?['This package is fragile.']:[]),...(p.hazmat?['This package contains dangerous goods.']:[])];
    this.panel(scene,'Read the package label.',lines.join('\n'),[
      ...(s.mode==='load'?[{label:held?'Keep carrying this package.':'Pick up this package.',action:()=>{
        if(!held&&(!this.facing(scene,'loading-parcel-'+id)||!OTR.fpLoading.take(s,id))){this.notice(scene,'Put down the package you are carrying before taking another one.');return;}scene.closePanel();scene.sync();
      }}]:[{label:'Take this package for the requested stop.',action:()=>{
        if(!this.facing(scene,'loading-parcel-'+id)||!OTR.fpLoading.pick(s,id))return;scene.closePanel();scene.sync();
        if(OTR.fpScenario.coaching(scene.scenarioSession)&&s.hint?.kind==='mismatch')scene.message('The package does not match the requested address. Read the number, street and unit.');
      }}]),
      {label:'Return to the cargo.',action:()=>scene.closePanel()}
    ]);
  },
  facing(scene,id){return scene.art.pick()===id;},
  shelf(scene,id){
    const s=scene.model.loading,slot=OTR.fpLoading.slot(s,id);if(!slot)return;
    if(s.mode!=='load'){this.notice(scene,'Read the labels and take the package for the requested address.');return;}
    if(!s.held){this.notice(scene,slot.pkg?'A package is already in this position. Face the package to read its label.':'Pick up a package before choosing its shelf or floor position.');return;}
    const descriptions={top:`The loading position is on the top shelf in section ${slot.col}.`,mid:`The loading position is on the middle shelf in section ${slot.col}.`,bottom:`The loading position is on the bottom shelf in section ${slot.col}.`},body=id==='haz'?'The loading position is in the marked dangerous goods zone.':slot.level==='floor'?'The loading position is in a bulk floor bay.':descriptions[slot.level];
    this.panel(scene,'Choose this loading position.',body,[
      {label:'Put the package in this position.',action:()=>{
        if(!this.facing(scene,'loading-slot-'+id))return;const pkg=s.held,ok=OTR.fpLoading.place(s,id);scene.closePanel();scene.sync();
        if(!ok){this.notice(scene,'That position is occupied. The package remains in its original position.');return;}
        if(OTR.fpScenario.coaching(scene.scenarioSession)){const problems=OTR.fpLoading.problems(s,pkg,id);if(problems.length)this.notice(scene,`This placement needs attention: ${problems.join('; ')}.`);}
      }},
      {label:'Keep carrying the package.',action:()=>scene.closePanel()}
    ]);
  },
  cart(scene){const s=scene.model.loading;if(s.mode!=='load')return;this.panel(scene,'Use the parcel cart.',s.held?'You are carrying a package.':'Read a package label before taking it from the cart.',[
    ...(s.held?[{label:'Return the package to the cart.',action:()=>{if(this.facing(scene,'loading-cart')){OTR.fpLoading.returnToCart(s);scene.closePanel();scene.sync();}}}]:[]),
    {label:'Return to the cargo.',action:()=>scene.closePanel()}
  ]);},
  restraints(scene){const s=scene.model.loading;this.panel(scene,'Use the floor restraints.',s.strapped?'The floor load is strapped.':'The floor restraints are released.',[
    {label:'Strap the floor load.',action:()=>{if(!this.facing(scene,'loading-restraints'))return;if(!OTR.fpLoading.strap(s)){this.notice(scene,'Load every package and put down the package you are carrying before strapping the floor load.');return;}scene.closePanel();scene.sync();}},
    {label:'Check the load before finishing.',action:()=>this.review(scene)},
    {label:'Return to the cargo.',action:()=>scene.closePanel()}
  ]);},
  review(scene,page=0){
    const s=scene.model.loading,K=OTR.fpLoading;
    if(s.phase==='active'&&!K.review(s)){this.notice(scene,'Place every package in the van and put down the package you are carrying before checking the load.');return;}
    if(s.phase!=='report')return;const practice=OTR.fpScenario.coaching(scene.scenarioSession),findings=[];
    if(practice){for(const p of s.pkgs){const probs=p.slotRef?K.problems(s,p.id,p.slotRef.id):['not loaded'];if(probs.length)findings.push(`The package for ${p.number} ${p.street} needs attention: ${probs.join('; ')}.`);}if(!s.strapped)findings.push('The floor load was not strapped.');}
    const pages=[practice?`The load check found ${s.report.right} of ${s.report.total} packages in the right position.`:'The load has been checked. Finish the scenario to view your results.',...findings];page=Math.min(page,pages.length-1);
    this.panel(scene,'Review the load.',pages[page],[
      ...(page+1<pages.length?[{label:'Read the next finding.',action:()=>this.review(scene,page+1)}]:[]),
      {label:'Finish the scenario.',action:()=>{if(K.complete(s))scene.finishScenario();}}
    ]);
  },
  inspect(run,scene,id){const s=scene.model.loading,held=s.held,target=id||scene.aimTarget();if(held)this.label(scene,held);else if(target?.startsWith('loading-parcel-'))this.label(scene,target.slice(15));},
  controls(run,scene,page=0){
    const k=code=>OTR.fpAccess.key(code),pages=[`Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to walk. Use ${OTR.fpAccess.lookKeys()} or the mouse to look. Press ${k('KeyP')} to face a nearby visible target, then ${k('KeyE')} to interact.`,`Open the rear cargo doors to reach the shelves. Read each package label before taking it. You can carry one package at a time and return it to the parcel cart. The van stays parked.`,`Section A is nearest the rear doors, section B is in the middle and section C is nearest the cab. Each section has top, middle and bottom shelves on both sides. The floor has two bulk bays and a marked dangerous goods zone.`,`Face an empty position to place a package, or face the restraints to strap the floor load. Open the handheld with ${k('Tab')} to read the request or check your completed load. Menus and pauses stop both clocks.`];
    this.panel(scene,'Use the cargo controls.',pages[page],[{label:'Read the next controls page.',action:()=>this.controls(run,scene,(page+1)%pages.length)},{label:'Return to the cargo.',action:()=>scene.closePanel()}]);
  },
  handheld(run,scene){
    const s=scene.model.loading;if(s.phase==='report'){this.review(scene);return;}
    const lines=s.mode==='load'?[`There are ${s.cart.length} packages left on the cart.`,s.held?'You are carrying one package.':'You are not carrying a package.']:s.round?[this.request(s),`This is package ${s.roundIndex+1} of ${s.content.rounds.length}.`]:['The next package request is being prepared.'];
    scene.handheld.show({title:'Read the cargo details.',lines,options:[
      ...(s.mode==='load'?[{label:'Check the completed load.',onPick:()=>{scene.handheld.close(false);this.review(scene);}}]:[]),
      {label:'Read the cargo controls.',onPick:()=>{scene.handheld.close(false);this.controls(run,scene);}},
      {label:'Return to the cargo.',onPick:()=>scene.handheld.close()}
    ],back:()=>scene.handheld.close()});
  },
  request(s){const p=OTR.fpLoading.parcel(s,s.round.pkg);return p.unit?`Find the package for ${p.number} ${p.street}, unit ${p.unit}.`:`Find the package for ${p.number} ${p.street}.`;},
  targetName(scene,id){
    if(id.startsWith('loading-parcel-'))return 'the package label';if(id==='loading-cart')return 'the parcel cart';if(id==='loading-restraints')return 'the floor restraints';
    const slot=OTR.fpLoading.slot(scene.model.loading,id.slice(13));return slot?.hazmat?'the marked dangerous goods zone':slot?.level==='floor'?'the bulk floor bay':slot?`the ${slot.level} shelf in section ${slot.col}`:'the loading position';
  }
};
OTR.fpScenario.register('loading-cargo',{
  piece:'depot',goal:'Load the parked van or find the requested packages in its cargo.',seconds:1200,
  setup(run,m){
    m.loading=OTR.fpLoading.create(run.id,run.content,run.scenario.categories);m.loadingCoaching=OTR.fpScenario.coaching(run);m.kind='practice';m.stops=[];m.parcels=[];m.traffic=[];m.crossing.x=m.crossing.z=10000;
    Object.assign(m.van,{x:2.84,z:8,yaw:0,speed:0,gear:2,hand:true,belt:false,look:0});Object.assign(m.player,{x:2.84,z:12.1,yaw:0,pitch:0});m.cargoOpen=false;
    const slots=OTR.fpLoadingWorld.layout(m.loading,m.van),byId=new Map(slots.map(s=>[s.id,s])),motor=OTR.fp.create(),blocked=m.blocked;
    m.solids=m.solids.filter(s=>s.z>-8);m.solids.push({x:m.van.x-4,z:m.van.z+2.4,w:1.9,d:2.25,h:.72});
    for(const side of [-1,1])m.solids.push({x:m.van.x+side*.8,z:m.van.z+.75,w:.5,d:3.35,h:2.5});
    const footprints=new Map(m.loading.pkgs.map(p=>{const dims=OTR.fpLoadingWorld.dimensions(p);return [p.id,{x:0,z:0,w:dims[0],d:dims[2]}];}));
    m.blocked=function(x,z,r=.24){if(blocked.call(this,x,z,r))return true;for(const p of this.loading.pkgs){if(p.id===this.loading.held||!p.slotRef||p.slotRef.level!=='floor'||p.pulled)continue;const slot=byId.get(p.slotRef.id),box=footprints.get(p.id);box.x=slot.x;box.z=slot.z;if(OTR.fp.circleBox(x,z,r,box))return true;}return false;};
    m.tick=function(input,dt){this.elapsed+=dt;motor.tick.call(this,input,dt);};
  },
  interact(run,scene,id){
    const s=scene.model.loading,A=OTR.fpLoadingScenario;if(s.phase==='brief')OTR.fpLoading.begin(s);if(s.phase==='report'){A.review(scene);return true;}if(s.phase!=='active')return true;
    if(!id||!A.facing(scene,id)){A.notice(scene,'Move close to the cargo target and face it before interacting.');return true;}
    if(id==='cargo'){const message=scene.model.toggleCargo();if(message)A.notice(scene,message);else{scene.sync();scene.refresh();}return true;}
    if(id.startsWith('loading-parcel-'))A.label(scene,id.slice(15));else if(id.startsWith('loading-slot-'))A.shelf(scene,id.slice(13));else if(id==='loading-cart')A.cart(scene);else if(id==='loading-restraints')A.restraints(scene);else A.notice(scene,'Use the cargo doors, package labels, loading positions or floor restraints. The van stays parked.');return true;
  },
  inspect(run,scene,id){OTR.fpLoadingScenario.inspect(run,scene,id);},
  tick(run,scene,dt,active){
    const s=scene.model?.loading;if(!s)return;if(s.phase==='brief')OTR.fpLoading.begin(s);const before=s.hint;OTR.fpLoading.step(s,dt,active);if(s.phase==='done'){scene.finishScenario();return;}
    if(active&&s.hint!==before&&OTR.fpScenario.coaching(run)){
      const h=s.hint;if(h?.kind==='nudge')scene.message('Read each whole address and check the stop sections and bulk floor bays.');
      if(h?.kind==='shown')scene.message(h.floor?'The requested package is highlighted in a bulk floor bay.':`The requested package is highlighted in section ${h.section}.`);
    }
  },
  controls(run,scene){OTR.fpLoadingScenario.controls(run,scene);},handheld(run,scene){OTR.fpLoadingScenario.handheld(run,scene);},
  status(run){const s=run.model.loading;return s.mode==='find'?s.round?OTR.fpLoadingScenario.request(s):'The next package request is being prepared.':s.held?'You are carrying one package.':`There are ${s.cart.length} packages left on the cart.`;},
  timeout(run,scene){run.phase='timed-out';scene.showPanel('The cargo scenario has stopped.','There is no result because the cargo task was not completed.',[{label:'Return to the station.',action:()=>scene.toHub()}],{accessibleText:true,back:()=>scene.toHub()});},
  result(run){const result=OTR.fpLoading.result(run.model.loading);if(!result)throw Error('The loading task is incomplete');return result;}
});
