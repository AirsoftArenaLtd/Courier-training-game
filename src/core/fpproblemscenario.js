/* Physical M4 conversations use the original graphs and result engine. Nothing reports to the workday. */
window.OTR=window.OTR||{};
OTR.fpProblemScenario={
  notice(scene,body){OTR.fpCustomerScenario.panel(scene,'Read the scenario information.',body,[{label:'Return to the scenario.',action:()=>scene.closePanel()}],'notice',()=>scene.closePanel());},
  controls(scene,page=0){const k=c=>OTR.fpAccess.key(c),pages=[`Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to walk. Press ${k('KeyP')} to face a nearby physical target and ${k('KeyE')} to interact.`,`Use the driver’s door to enter the parked cab, and its exit control to get out. Close the cargo doors before entering. The van stays parked while you work through each decision.`,`Read one reply at a time. Choosing the first button sends that reply. The decision clock keeps running while you review replies, the question or earlier statements.`,`The pause menu and handheld stop both clocks. Press ${k('Tab')} to read the scenario details. The mounted street signs, house numbers and mailbox names can also be read here.`];OTR.fpCustomerScenario.panel(scene,'Use the problem-solving controls.',pages[page],[{label:'Read the next controls page.',action:()=>this.controls(scene,(page+1)%pages.length)},{label:'Read the addresses.',action:()=>this.addresses(scene)},{label:'Return to the scenario.',action:()=>scene.closePanel()}],'controls',()=>scene.showPause());},
  addresses(scene,page=0){const all=scene.model.problemStage.addresses,a=all[page],body=a?`The ${a.site==='house'?'first':'second'} address is ${a.number} ${a.street}.`+(a.mailbox?` The mailbox reads ${a.mailbox}.`:''):'This scenario has one delivery site. Read the earlier statements for its delivery instructions.';OTR.fpCustomerScenario.panel(scene,'Read the physical address.',body,[...(all.length>1?[{label:'Read the next address.',action:()=>this.addresses(scene,(page+1)%all.length)}]:[]),{label:'Return to the controls.',action:()=>this.controls(scene)}],'controls',()=>scene.showPause());},
  handheld(run,scene){const s=scene.model.problemStage,t=s.target,m=scene.model,p=m.player;scene.handheld.show({title:'Read the problem-solving details.',lines:[OTR.fpProblemStage.destination(s),`The conversation point is ${Math.ceil(Math.hypot(t.x-(m.mode==='cab'?m.van.x:p.x),t.z-(m.mode==='cab'?m.van.z:p.z)))} meters away.`],options:[{label:'Read the earlier statements.',onPick:()=>{scene.handheld.close(false);OTR.fpCustomerScenario.history(scene);}},{label:'Read the controls and addresses.',onPick:()=>{scene.handheld.close(false);this.controls(scene);}}],back:()=>scene.handheld.close()});}
};
OTR.fpScenario.register('problem-conversation',{
  piece:'street',goal:'Resolve the delivery problem and explain the outcome accurately.',seconds:900,stage:OTR.fpProblemStage,
  setup(run,m){
    const talk=m.customerTalk=OTR.fpCustomerTalk.create(run.content,run.scenario.categories,{coaching:OTR.fpScenario.coaching(run)}),stage=m.problemStage=m.customerStage=OTR.fpProblemStage.create(run.id,run.content);
    m.kind='practice';m.stops=[];m.parcels=[];m.traffic=[];m.crossing.x=m.crossing.z=10000;m.solids=OTR.fpProblemStage.solids(stage);Object.assign(m.van,{x:1.7,z:-41,yaw:0,speed:0,gear:2,hand:true,belt:false,look:0});m.cargoOpen=run.id==='m4-damaged';
    m.routeDay={weather:run.id==='m4-storm'?'storm':'clear',clockMin:12*60};m.mode=stage.site==='cab'?'cab':'walk';Object.assign(m.player,{x:stage.site==='cargo'?1.7:stage.points.house.x,z:stage.site==='cargo'?-36.4:-42.6,yaw:0,pitch:0});
    // The road decisions retain their authored timers; these existing dialogue ids are parked set-pieces.
    const step=m.step;m.step=function(input,dt){if(this.mode==='cab'){this.elapsed+=Math.max(0,Math.min(.05,dt||0));this.van.speed=0;return;}step.call(this,input,dt);};
    if(talk.phase!=='brief')throw Error('A problem scenario must start at its original brief');
  },
  interact(run,scene,id){
    const m=scene.model,s=m.customerTalk,stage=m.problemStage,A=OTR.fpProblemScenario;
    if(id!==scene.art.pick()){A.notice(scene,'Move close to the physical target and look at it before continuing.');return true;}
    if(id==='driver'&&m.mode==='walk'){if(m.cargoOpen){A.notice(scene,'Close the cargo doors before entering the cab.');return true;}m.mode='cab';m.van.look=0;m.player.pitch=0;scene.sync();return true;}
    if(id==='cargo'&&m.mode==='walk'){m.cargoOpen=!m.cargoOpen;scene.sync();return true;}
    if(m.mode==='cab'&&id!=='customer-conversation')return false;
    if(id!=='customer-conversation'||stage.site==='cab'&&m.mode!=='cab'||stage.site==='cargo'&&!m.cargoOpen){A.notice(scene,stage.site==='cargo'?'Open the cargo doors before inspecting the parcel.':OTR.fpProblemStage.destination(stage));return true;}
    if(s.phase==='brief')OTR.fpCustomerTalk.begin(s);OTR.fpCustomerScenario.present(scene,s.replyPage||0);return true;
  },
  clockActive(run,scene,active){return OTR.fpScenario.definitions.get('customer-conversation').clockActive(run,scene,active);},
  tick(run,scene,dt,active){
    const m=scene.model,s=m?.customerTalk;if(!s)return;const panel=scene.panel,animate=!scene.loading&&!scene.external&&!scene.transitioning&&!scene.handheld?.isOpen&&(!panel||panel.customer&&panel.customerKind!=='controls'&&panel.customerKind!=='notice');
    if(animate)OTR.fpProblemStage.step(m.problemStage,dt);const before=s.phase;OTR.fpCustomerTalk.step(s,dt,active);if(before!==s.phase){OTR.fpCustomerScenario.present(scene,s.replyPage||0);return;}
    if(panel?.customerKind==='reply'&&s.phase==='choices'){const second=Math.ceil(s.remaining??0);if(second!==panel.customerSecond){panel.customerSecond=second;panel.customerText?.setText(OTR.fpCustomerScenario.body(s));}}
  },
  controls(run,scene){OTR.fpProblemScenario.controls(scene);},handheld(run,scene){OTR.fpProblemScenario.handheld(run,scene);},
  status(run){return OTR.fpProblemStage.destination(run.model.problemStage);},
  timeout(run,scene){OTR.fpCustomerScenario.unfinished(run,scene,'There is no result because the delivery problem was not completed.');},
  result(run){const result=OTR.fpCustomerTalk.result(run.model.customerTalk);if(!result)throw Error('The delivery problem is incomplete');return result;}
});
