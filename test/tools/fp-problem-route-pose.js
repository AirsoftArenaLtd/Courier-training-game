/* Explicit static render poses. They never count as native movement or route completion. */
module.exports=({name,stage})=>{
 if(stage==='launch'){
  if(!OTR.registry.get('m4-closure'))OTR_DATA.modules.find(m=>m.id==='m4').scenarios.push({id:'m4-closure',module:'m4',title:'Road closure.',blurb:'Follow the diversion to the delivery address.',categories:['safety','efficiency'],optional:true,scene3d:'road-closure',dataKey:'dialogues.m4_recover'});
  OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m4-closure'});OTR.game.scene.stop('FirstPersonScene');return;
 }
 const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=s.scenarioSession,m=s.model,g=m.roadProblem.goal,b=m.roadworks;window.otrBenchmarkScene='FirstPersonScenarioScene';s.keyboardMode=true;OTR.fpScenario.begin(r);s.closePanel();
 s.closureBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 if(['closurebay','closuredevice','closurereverse'].includes(name))Object.assign(m.van,{...g,speed:0,hand:true,gear:name==='closurereverse'?-1:2,look:0});
 if(name==='closuremirror')m.van.look=-1.1;
 if(name==='closureturn')Object.assign(m.van,{x:0,z:-12.25,yaw:-Math.PI/2,look:0});
 if(name==='closurebarrier'){m.mode='walk';Object.assign(m.player,{x:b.x-4,z:b.z-7,yaw:Math.PI+.5,pitch:.05});}
 if(name==='closurebay'){m.mode='walk';Object.assign(m.player,{x:g.x-4,z:g.z+7,yaw:.4,pitch:.12});}
 if(name==='closuredevice')OTR.fpProblemRouteUI.handheld(r,s);
 if(name==='closurecontrols')OTR.fpProblemRouteUI.controls(r,s,2);
 if(name==='closurereverse')m.van.look=1.1;
 // Fixed resource sampling, deliberately separate from gameplay evidence.
 m.paused=true;s.sync();s.refresh();
};
