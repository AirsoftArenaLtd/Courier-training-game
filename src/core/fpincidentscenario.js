/* Original M8 incident graph/result, staged at a collision, two people and a real cab device. */
window.OTR=window.OTR||{};
OTR.fpIncidentScenario={
  notice(scene,body){OTR.fpCustomerScenario.panel(scene,'Read the incident information.',body,[{label:'Return to the incident scene.',action:()=>scene.closePanel()}],'notice',()=>scene.closePanel());},
  controls(scene,page=0){
    const k=c=>OTR.fpAccess.key(c),pages=[`Use ${k('KeyW')}/${k('KeyA')}/${k('KeyS')}/${k('KeyD')} to walk. Press ${k('KeyP')} to face a nearby person, damaged fender or communication device, then ${k('KeyE')} to interact.`,`Use the driver’s door to enter the parked cab for calls and the incident report. Use the cab exit control to get out. The vehicles stay parked while you make the original incident decisions.`,`Read one reply at a time. Choosing the first button sends that reply. Press ${k('Tab')} for the earlier statements and controls. Pause and handheld menus stop the scenario clock.`];
    OTR.fpCustomerScenario.panel(scene,'Use the incident controls.',pages[page],[{label:'Read the next controls page.',action:()=>this.controls(scene,(page+1)%pages.length)},{label:'Return to the incident scene.',action:()=>scene.closePanel()}],'controls',()=>scene.showPause());
  },
  handheld(run,scene){const s=scene.model.incidentStage;scene.handheld.show({title:'Read the incident details.',lines:[OTR.fpIncidentStage.destination(s)],options:[{label:'Read the earlier statements.',onPick:()=>{scene.handheld.close(false);OTR.fpCustomerScenario.history(scene);}},{label:'Read the incident controls.',onPick:()=>{scene.handheld.close(false);this.controls(scene);}}],back:()=>scene.handheld.close()});}
};
OTR.fpScenario.register('wellness-incident',{
  piece:'street',goal:'Secure the collision scene, check on people and make an accurate incident report.',seconds:900,stage:OTR.fpIncidentStage,
  setup(run,m){
    if(run.id!=='m8-incident')throw Error('The incident adapter requires its original scenario');
    m.customerTalk=OTR.fpCustomerTalk.create(run.content,run.scenario.categories,{coaching:OTR.fpScenario.coaching(run)});m.incidentStage=m.customerStage=OTR.fpIncidentStage.create(run.id,run.content);
    m.kind='practice';m.stops=[];m.parcels=[];m.traffic=[];m.crossing.x=m.crossing.z=10000;m.solids=OTR.fpIncidentStage.solids(m.incidentStage);
    Object.assign(m.van,{x:1.7,z:-41,yaw:0,speed:0,gear:2,hand:true,belt:false,look:0});m.cargoOpen=false;m.mode='walk';Object.assign(m.player,{x:-.3,z:-38,yaw:Math.PI/2,pitch:0});m.routeDay={weather:'clear',clockMin:12*60};
    const step=m.step;m.step=function(input,dt){if(this.mode==='cab'){this.elapsed+=Math.max(0,Math.min(.05,dt||0));this.van.speed=0;return;}step.call(this,input,dt);};
  },
  interact(run,scene,id){
    const m=scene.model,s=m.customerTalk,stage=m.incidentStage,A=OTR.fpIncidentScenario;
    if(!id||id!==scene.art.pick()){A.notice(scene,'Move close to the physical target and face it before continuing.');return true;}
    if(id==='driver'&&m.mode==='walk'){m.mode='cab';m.van.look=0;m.player.pitch=0;scene.sync();return true;}
    if(m.mode==='cab'&&id!=='customer-conversation')return false;
    if(id!=='customer-conversation'||stage.site==='cab'&&m.mode!=='cab'){A.notice(scene,OTR.fpIncidentStage.destination(stage));return true;}
    if(s.phase==='brief')OTR.fpCustomerTalk.begin(s);OTR.fpCustomerScenario.present(scene,s.replyPage||0);return true;
  },
  clockActive(run,scene,active){return OTR.fpScenario.definitions.get('customer-conversation').clockActive(run,scene,active);},
  tick(run,scene,dt,active){
    const s=scene.model?.customerTalk;if(!s)return;const panel=scene.panel,animate=!scene.loading&&!scene.external&&!scene.transitioning&&!scene.handheld?.isOpen&&(!panel||panel.customer&&panel.customerKind!=='controls'&&panel.customerKind!=='notice');
    if(animate)OTR.fpIncidentStage.step(scene.model.incidentStage,dt);const before=s.phase;OTR.fpCustomerTalk.step(s,dt,active);if(before!==s.phase)OTR.fpCustomerScenario.present(scene,s.replyPage||0);
  },
  controls(run,scene){OTR.fpIncidentScenario.controls(scene);},handheld(run,scene){OTR.fpIncidentScenario.handheld(run,scene);},
  status(run){return OTR.fpIncidentStage.destination(run.model.incidentStage);},
  timeout(run,scene){OTR.fpCustomerScenario.unfinished(run,scene,'There is no result because the incident report was not completed.');},
  result(run){const result=OTR.fpCustomerTalk.result(run.model.customerTalk);if(!result)throw Error('The incident report is incomplete');return result;}
});
