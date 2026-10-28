/* Explicit static resource fixtures; never native movement/completion evidence. */
module.exports=({name,stage})=>{
 if(stage==='launch'){
  if(!OTR.registry.get('m4-blocked'))OTR_DATA.modules.find(m=>m.id==='m4').scenarios.push({id:'m4-blocked',module:'m4',title:'Blocked driveway.',blurb:'Inspect access and complete a safe delivery attempt.',categories:['safety','service'],optional:true,scene3d:'blocked-drive',dataKey:'dialogues.m4_recover'});
  OTR.fpScenario.definitions.get('blocked-drive').model=()=>OTR.fpProblemBlocked.model({unsafe:name!=='blockedgate',locked:name==='blockedgate'});
  OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m4-blocked'});OTR.game.scene.stop('FirstPersonScene');return;
 }
 const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=s.scenarioSession,m=s.model,b=m.blockedProblem;window.otrBenchmarkScene='FirstPersonScenarioScene';s.keyboardMode=true;OTR.fpScenario.begin(r);s.closePanel();
 s.blockedBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 function look(x,z,to){m.mode='walk';Object.assign(m.player,{x,z,yaw:Math.atan2(to.x-x,z-to.z),pitch:Math.atan2(1.65-to.y,Math.hypot(to.x-x,to.z-z))});}
 if(name==='blockednotice')look(b.warning.x-2.2,b.warning.z,{...b.warning,y:2.3});
 if(name==='blockedcar')look(b.car.x-2.3,b.car.z+5,{...b.car,y:1});
 if(name==='blockedcard'){look(b.card.x-1.4,b.card.z,b.card);b.state.exception='UN';OTR.fpProblemBlocked.retry(m,'card');}
 if(name==='blockedgate')look(b.gate.x-4.3,b.gate.z+4.5,{...b.gate,y:1});
 if(name==='blockedcargo'){m.cargoOpen=true;look(m.van.x,m.van.z+5,{x:m.van.x,y:1.4,z:m.van.z});}
 if(name==='blockeddevice')OTR.fpProblemBlockedUI.handheld(r,s);
 if(name==='blockedcontrols')OTR.fpProblemBlockedUI.controls(r,s,2);
 m.paused=true;s.sync();s.refresh();
};
