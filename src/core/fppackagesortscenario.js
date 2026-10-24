/* Existing five-wave sorting assessment, operated at the physical conveyor and routing console. */
window.OTR=window.OTR||{};
OTR.fpPackageSortScenario={
  binNames:{R1:'route 1',R2:'route 2',R3:'route 3',PRI:'the priority bin',EXC:'the exceptions bin',DG:'the dangerous goods cage',HVY:'the heavy chute'},
  selected(s){return s.packages.find(p=>p.id===s.selectedId)||null;},
  acknowledge(scene,body){const back=()=>scene.closePanel();scene.showPanel('Continue sorting the packages.',body,[{label:'Return to the conveyor.',action:back}],{accessibleText:true,back});},
  controls(scene,page=0){
    const s=scene.model.packageSort,A=this,back=()=>scene.closePanel();
    const body=page?OTR.fpPackageSortWorld.bins.slice((page-1)*3,page*3).map(id=>`Routing key ${s.binKeys[id]} sends packages to ${A.binNames[id]}.`).join('\n'):
      `Look at a package on the conveyor. Press ${OTR.fpAccess.key('KeyP')} to select it and ${OTR.fpAccess.key('KeyE')} to scan it. Read its label on the handheld, then close the handheld. Select a numbered routing key and press ${OTR.fpAccess.key('KeyE')} to send that package. Use the red jam-reset post when the belt has stopped.`;
    scene.showPanel('Use the conveyor controls.',body,[
      {label:page===3?'Read the conveyor controls.':'Read more routing key numbers.',action:()=>A.controls(scene,(page+1)%4)},
      {label:'Return to the conveyor.',action:back}
    ],{accessibleText:true,back});
  },
  rule(scene){
    const s=scene.model.packageSort;if(s.state!=='rule')return;
    scene.showPanel(`Read the rule for wave ${s.waveIndex+1}.`,s.wave.rule.text,[
      {label:'Start this conveyor wave.',action:()=>{OTR.fpPackageSort.begin(s);scene.closePanel();}}
    ],{accessibleText:true,back:()=>{}});
  },
  reading(scene,page=0){
    const s=scene.model.packageSort,p=this.selected(s),A=this;
    if(!p?.scanned){this.acknowledge(scene,`Scan a package on the conveyor before reading its label. The active routing keys are ${s.wave.bins.map(id=>s.binKeys[id]).join(', ')}.`);return;}
    const facts=[`The label shows route ${p.route}.`,`The package weighs ${p.weight} pounds.`];
    if(p.priority)facts.push('The package carries a priority band.');
    if(p.damage)facts.push(p.damage==='leak'?'The package is leaking.':'The package is crushed.');
    if(p.dg)facts.push('The package carries a dangerous goods mark.');
    if(p.heavy)facts.push('The package is marked for a team lift.');
    const pages=Math.ceil(facts.length/2);page%=pages;
    scene.handheld.show({title:`Read package ${p.id}.`,lines:facts.slice(page*2,page*2+2),options:[
      {label:'Read more of the package label.',onPick:()=>A.reading(scene,(page+1)%pages)},
      {label:'Return to the conveyor.',onPick:()=>scene.handheld.close()}
    ],back:()=>scene.handheld.close()});
  },
  route(scene,bin){
    const s=scene.model.packageSort,A=this,p=this.selected(s)||OTR.fpPackageSort.front(s);
    if(!s.wave.bins.includes(bin)||s.state!=='play')return;
    if(!p){this.acknowledge(scene,'Wait for a package to reach the conveyor before using a routing key.');return;}
    const body=`Routing key ${s.binKeys[bin]} sends package ${p.id} to ${A.binNames[bin]}.`+(p.scanned?'':' This package has not been scanned.');
    scene.showPanel('Choose the package destination.',body,[
      {label:'Send the package to this destination.',action:()=>{
        const outcome=OTR.fpPackageSort.sort(s,p,bin);s.selectedId=null;scene.closePanel();scene.sync();
        if(outcome)A.acknowledge(scene,OTR.fpScenario.coaching(scene.scenarioSession)?(outcome.blind?'This package was routed without a scan.':outcome.ok?'You routed the package correctly.':'The destination does not match this package.'):'Your decision has been recorded.');
      }},
      {label:'Keep checking the package.',action:()=>scene.closePanel()}
    ],{accessibleText:true,back:()=>scene.closePanel()});
  }
};
OTR.fpScenario.register('package-sort-belt',{
  piece:'depot',goal:'Scan the packages, read their labels and use the numbered keys to route them safely.',seconds:360,
  setup(run,m){m.packageSort=OTR.fpPackageSort.create(run.content);m.packageSort.selectedId=null;m.parcels=[];m.cargoOpen=false;m.solids.push(...OTR.fpPackageSortWorld.solids());Object.assign(m.player,{x:-10,z:16.4,yaw:0,pitch:0});},
  update(run,scene,dt){
    const s=run.model.packageSort;if(s.state==='brief')OTR.fpPackageSort.begin(s);
    OTR.fpPackageSort.advance(s,dt);if(s.selectedId&&!OTR.fpPackageSortScenario.selected(s))s.selectedId=null;
    if(s.state==='rule')OTR.fpPackageSortScenario.rule(scene);else if(s.state==='done')scene.finishScenario();
  },
  interact(run,scene,id){
    const s=run.model.packageSort,A=OTR.fpPackageSortScenario;if(s.state!=='play')return true;
    // The runner supplies the nearest actual ray hit. Direct or stale calls cannot operate a remote proxy.
    if(!id||scene.art.pick()!==id){A.acknowledge(scene,'Look at a nearby package or routing key before using the action key.');return true;}
    if(id.startsWith('sort-parcel-')){
      const p=s.packages.find(p=>'sort-parcel-'+p.id===id);if(p){OTR.fpPackageSort.scan(s,p);s.selectedId=p.id;A.reading(scene);}
    }else if(id.startsWith('sort-bin-'))A.route(scene,id.slice(9));
    else if(id==='sort-jam'){
      if(s.jammed&&s.beltSpeed<=1){OTR.fpPackageSort.clearJam(s,true);scene.sync();A.acknowledge(scene,'The conveyor is ready to restart.');}
      else A.acknowledge(scene,s.jammed?'Wait for the belt to stop before using the jam-reset post.':'The conveyor has no jam to clear.');
    }else A.acknowledge(scene,'Use the conveyor packages, numbered routing keys or jam-reset post.');
    return true;
  },
  handheld(run,scene){OTR.fpPackageSortScenario.reading(scene);},
  controls(run,scene){OTR.fpPackageSortScenario.controls(scene);},
  result(run){
    const s=run.model.packageSort;
    // The normal five-wave run finishes well inside the outer cap. A forced expiry only settles real in-flight parcels.
    if(s.state!=='done'){s.state='play';while(s.packages.length)OTR.fpPackageSort.miss(s,s.packages[0]);s.state='done';}
    return {...OTR.fpPackageSort.result(s),log:null};
  }
});
