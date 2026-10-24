/* M5 on the physical handheld. Existing stop kernel, conversations and original local-log evaluator are reused. */
window.OTR=window.OTR||{};
OTR.fpScannerStopScenario=Object.assign(Object.create(OTR.fpCustomerStopScenario),{
  configure(run,m){OTR.fpCustomerStopScenario.configure.call(this,run,m);OTR.fpScannerStop.prepare(m.customerStop);m.scannerSolids=[{x:10000,z:10000,w:.64,d:.64},{x:10000,z:10000,w:1.7,d:.55}];m.solids.push(...m.scannerSolids);m.scannerStage=null;},
  nearPerson(scene){const m=scene.model,p=m.scannerStage?.person;return !!p&&m.mode==='walk'&&m.customerStage.actors[0]?.visible&&Math.hypot(m.player.x-p.x,m.player.z-p.z)<2.65;},
  nearby(scene,point){const m=scene.model;return m.mode==='walk'&&point&&Math.hypot(m.player.x-point.x,m.player.z-point.z)<2.65;},
  enter(scene){if(scene.model.customerStop.photoPending){this.notice(scene,'Finish recording the pending delivery photo before returning to the cab.');return;}OTR.fpCustomerStopScenario.enter.call(this,scene);},
  handheld(run,scene){
    const d=scene.model.customerStop;if(d.photoPending){if(d.photoMode)scene.handheld.show({title:'Use the delivery camera.',lines:['The package remains where you placed it.'],options:[{label:'Resume framing the photo.',onPick:()=>scene.handheld.close()}],back:()=>scene.handheld.close()});else this.photoReview(scene);return;}
    if(d.identity){this.identity(scene);return;}
    scene.handheld.show({title:'Read the stop details.',lines:[`The stop is ${d.def.packages[0].number} ${d.def.packages[0].street}.`],options:[
      {label:'Scan the carried packages.',onPick:()=>this.scan(scene)},
      {label:'Record a delivery.',onPick:()=>this.delivery(scene)},
      {label:'Record an exception.',onPick:()=>this.exceptions(scene)},
      {label:'Read the stop brief.',onPick:()=>{scene.handheld.close(false);this.brief(scene);}}
    ],back:()=>scene.handheld.close()});
  },
  scan(scene){const d=scene.model.customerStop,K=OTR.fpCustomerStop;if(!d.state.carrying.length){scene.handheld.close(false);this.notice(scene,'Take a package from the cargo shelf before scanning it.');return;}for(const id of d.state.carrying)K.scan(d,id,this.atVan(scene));
    const wrong=d.state.carrying.some(id=>!K.parcel(d,id).mine),pkg=d.def.packages[0],requirement=pkg.service==='adult'?'This package needs a signature from a person who is 21 or older with valid photo ID.':pkg.service==='signature'?'This package needs a signature.':'This package uses standard service.';
    scene.handheld.close(false);this.panel(scene,'Read the scan result.',(wrong?'A carried package belongs to another stop.':'The carried packages belong to this stop.')+'\n'+requirement+(pkg.note?'\nThe customer note says: '+pkg.note+'.':''),[{label:'Return to the stop.',action:()=>scene.closePanel()}],'notice');
  },
  records(scene){this.handheld(scene.scenarioSession,scene);},
  delivery(scene,page=0){
    const d=scene.model.customerStop;if(!OTR.fpCustomerStop.canDeliver(d)||d.photoPending){scene.handheld.close(false);this.notice(scene,'Carry and scan the package before recording a delivery. A recorded outcome cannot be replaced.');return;}
    const types=Object.keys(OTR_DATA.handheld.deliveryTypes),type=types[page%types.length],index=d.index;scene.handheld.show({title:'Choose the delivery method.',lines:[],options:[
      {label:this.labels[type],onPick:()=>{if(scene.model.customerStop!==d||d.index!==index||d.state.outcome)return;if(type==='left'){this.spots(scene);return;}if(!this.nearPerson(scene)){scene.handheld.close(false);this.notice(scene,'Walk up to the customer who answered before handing over the package.');return;}const next=OTR.fpScannerStop.request(d,type);if(next==='identity')this.identity(scene);else if(next==='signature')this.signature(scene);}},
      {label:'Read the next delivery method.',onPick:()=>this.delivery(scene,(page+1)%types.length)}
    ],back:()=>this.handheld(scene.scenarioSession,scene)});
  },
  spots(scene,page=0){const d=scene.model.customerStop,spots=OTR.fpScannerStop.spots(d),spot=spots[page%spots.length];scene.handheld.show({title:'Choose where to leave it.',lines:[],options:[
    {label:`Place the package ${spot.label.charAt(0).toLowerCase()+spot.label.slice(1)}.`,onPick:()=>{const point=scene.model.scannerStage.locations[spot.id]||scene.model.scannerStage.locations.mat;if(!this.nearby(scene,point)){scene.handheld.close(false);this.notice(scene,'Approach the chosen location before placing the package.');return;}if(OTR.fpScannerStop.place(d,spot.id)){scene.handheld.close();scene.sync();}}},
    {label:'Read the next location.',onPick:()=>this.spots(scene,(page+1)%spots.length)}
  ],back:()=>this.delivery(scene,3)});},
  identity(scene,decision=0,field=0){const d=scene.model.customerStop,pending=d.identity,card=OTR.fpScannerStop.card(d);if(!card)return;if(!pending.order)pending.order=OTR.util.shuffle(['ok','under','invalid']);const result=pending.order[decision%3],labels={ok:'Verify a valid ID for a person who is 21 or older.',under:'Record that the person is under 21.',invalid:'Record an expired ID or a name or photo mismatch.'};
    scene.handheld.show({title:'Check the photo ID.',lines:[],options:[
      {label:labels[result],onPick:()=>{if(d!==scene.model.customerStop||d.identity!==pending||!this.nearPerson(scene))return;OTR.fpScannerIdentity.hide(scene);const next=OTR.fpScannerStop.decide(d,result);if(next==='signature')this.signature(scene);else if(next==='refused')scene.handheld.show({title:'Keep the package.',lines:['Record an exception and keep the package.'],options:[{label:'Choose an exception code.',onPick:()=>this.exceptions(scene)}],back:()=>this.handheld(scene.scenarioSession,scene)});}},
      {label:'Read the next decision.',onPick:()=>this.identity(scene,(decision+1)%3,field)},
      {label:'Read the next ID field.',onPick:()=>this.identity(scene,decision,(field+1)%4)}
    ],back:()=>{OTR.fpScannerIdentity.hide(scene);OTR.fpScannerStop.cancelIdentity(d);this.delivery(scene);}});OTR.fpScannerIdentity.show(scene,card,field);
  },
  exceptions(scene,page=0){const d=scene.model.customerStop,all=OTR_DATA.handheld.exceptions,ex=all[page%all.length];if(d.photoPending||d.state.outcome){scene.handheld.close(false);this.notice(scene,'Finish the pending photo or return to the parked van with the recorded outcome.');return;}
    OTR.fpScannerIdentity.hide(scene);OTR.fpScannerStop.cancelIdentity(d);scene.handheld.show({title:'Choose an exception code.',lines:[],options:[
      {label:`Record exception ${ex.id}.`,onPick:()=>{if(OTR.fpCustomerStop.exception(d,ex.id)){scene.handheld.close(false);if(ex.doorTag)this.tag(scene);else this.notice(scene,`Exception ${ex.id} has been recorded. Return the package to the van.`);}}},
      {label:'Read this code description.',onPick:()=>{scene.handheld.close(false);this.panel(scene,`Read exception ${ex.id}.`,ex.desc,[{label:'Return to this code.',action:()=>{scene.closePanel();this.exceptions(scene,page);}}],'notice');}},
      {label:'Read the next exception code.',onPick:()=>this.exceptions(scene,(page+1)%all.length)}
    ],back:()=>this.handheld(scene.scenarioSession,scene)});
  },
  capturePhoto(scene){const d=scene.model.customerStop;scene.sync();if(OTR.fpScannerStop.capture(d,scene.art.customerStop.photo(scene.view.camera)))this.photoReview(scene);},
  photoReview(scene){const d=scene.model.customerStop;if(!d.photo)return;const coaching=OTR.fpScenario.coaching(scene.scenarioSession),body=coaching?d.photo.grade==='good'?'The photo shows the package and its location without private details.':d.photo.grade==='private'?'The photo includes a person or the house number.':'The photo does not clearly show the package and its location.':'The photo has been captured.';
    scene.handheld.show({title:'Review the delivery photo.',lines:[],options:[
      {label:'Use this photo for the delivery.',onPick:()=>{if(OTR.fpScannerStop.usePhoto(d)){scene.handheld.close();scene.sync();}}},
      {label:'Retake the delivery photo.',onPick:()=>{if(OTR.fpScannerStop.retake(d)){scene.handheld.close();scene.sync();}}},
      {label:'Read the photo details.',onPick:()=>{scene.handheld.close(false);this.panel(scene,'Read the photo details.',body,[{label:'Return to the photo.',action:()=>{scene.closePanel();this.photoReview(scene);}}],'notice');}}
    ],back:()=>scene.handheld.close()});
  },
  report(scene,page=0){const d=scene.model.customerStop,lessons=OTR.fpScenario.coaching(scene.scenarioSession)?d.log.takeaways(d.def.id).map(t=>t.text):[];OTR.fpScannerIdentity.hide(scene);this.panel(scene,`Review stop ${d.index+1}.`,page===0?'This stop has ended.':lessons[page-1],[
    ...(page<lessons.length?[{label:'Read the next finding.',action:()=>this.report(scene,page+1)}]:[]),
    {label:d.index+1<d.content.stops.length?'Continue to the next stop.':'Finish the scenario.',action:()=>{OTR.fpScannerStop.next(d);if(d.phase==='done'){scene.finishScenario();return;}this.configure(scene.scenarioSession,scene.model);scene.rebuildWorld();scene.closePanel();scene.sync();this.brief(scene);}}
  ]);},
  controls(scene,page=0){const k=code=>OTR.fpAccess.key(code),pages=[`Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to walk. Press ${k('KeyP')} to face a nearby physical target and ${k('KeyE')} to interact. The van remains parked.`,`Read the full parcel label at the cargo shelf. Open the handheld to scan, choose a delivery method, record the actual signer or select an exception code.`,`Walk to the chosen delivery location before placing a parcel. Frame the package and the doorstep inside the camera border, then press ${k('KeyE')}. Retaking a photo keeps the package at that location.`,`Read every ID field and compare the portrait with the customer. The training date stays September 17, 2026. An ID refusal still needs a separately recorded exception, a printed tag and the package returned to the van.`];this.panel(scene,'Use the scanner controls.',pages[page],[{label:'Read the next controls page.',action:()=>this.controls(scene,(page+1)%pages.length)},{label:'Return to the stop.',action:()=>scene.closePanel()}]);}
});
const scannerBase=OTR.fpScenario.definitions.get('customer-doorsteps');
OTR.fpScenario.register('scanner-stop',{
  ...scannerBase,goal:'Complete the three stops using the handheld, delivery proof and the original delivery rules.',
  setup(run,m){const setup=Object.create(scannerBase);setup.setup(run,m);m.customerStop=OTR.fpScannerStop.create(run.id,run.content,run.scenario.categories,{coaching:OTR.fpScenario.coaching(run)});OTR.fpScannerStopScenario.configure(run,m);},
  interact(run,scene,id){const A=OTR.fpScannerStopScenario,m=scene.model,d=m.customerStop;if(d.phase==='brief')OTR.fpCustomerStop.begin(d);if(d.phase!=='active')return true;
    if(d.photoMode){A.capturePhoto(scene);return true;}if(m.mode==='cab'){if(id==='cab-exit'&&scene.art.pick()===id)A.exit(scene);else return false;return true;}
    if(!id||scene.art.pick()!==id){A.notice(scene,'Move close to a physical target and face it before interacting.');return true;}
    if(id==='cargo'){m.cargoOpen=!m.cargoOpen;scene.sync();return true;}if(id==='driver'){A.enter(scene);return true;}
    if(id.startsWith('customer-stop-parcel-')){if(!d.photoPending)A.parcel(scene,id.slice(21));}
    else if(id==='customer-stop-door')A.door(scene);else if(id==='customer-stop-person')A.person(scene);
    else if(id==='customer-stop-number')A.notice(scene,`The building is numbered ${d.def.lot.spec.number}. The stop address is ${d.def.packages[0].number} ${d.def.packages[0].street}.`);
    else if(id==='scanner-stop-hours')A.notice(scene,`The posted business hours are ${d.def.lot.spec.hours.replace('\n',', ')}. The stop time is ${Math.floor((d.def.time||d.content.time)/60)}:${String((d.def.time||d.content.time)%60).padStart(2,'0')}.`);return true;
  },
  tick(run,scene,dt,active){scannerBase.tick(run,scene,dt,active);const d=scene.model.customerStop;if(scene.scannerIdentity&&!scene.handheld.isOpen){OTR.fpScannerIdentity.hide(scene);OTR.fpScannerStop.cancelIdentity(d);}
    if(!scene.scannerFrame&&scene.add){const frame=scene.add.graphics().setDepth(21).lineStyle(3,0xFFFFFF,1).strokeRect(OTR.W*.14,OTR.H*.14,OTR.W*.72,OTR.H*.72);scene.scannerFrame=frame;scene.events.once('shutdown',()=>{OTR.fpScannerIdentity.hide(scene);scene.scannerFrame=null;});}
    scene.scannerFrame?.setVisible(d.photoMode&&!scene.handheld.isOpen&&!scene.panel&&scene.model.mode==='walk');
  },
  controls(run,scene){OTR.fpScannerStopScenario.controls(scene);},handheld(run,scene){OTR.fpScannerStopScenario.handheld(run,scene);}
});
