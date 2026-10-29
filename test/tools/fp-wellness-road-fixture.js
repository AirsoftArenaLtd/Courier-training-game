/* Explicit static render fixture, not gameplay. Prepared optional metadata never ships as a fake fallback. */
module.exports=kind=>{
 const id='m8-'+kind;if(!OTR.registry.get(id)){OTR_DATA.wellnessRoadFixtures=OTR_DATA.wellnessRoadFixtures||{};OTR_DATA.wellnessRoadFixtures[kind]={};OTR_DATA.modules.find(m=>m.id==='m8').scenarios.push({id,title:kind==='ice'?'Slips on Ice':'Tired at the Wheel',categories:kind==='ice'?['safety']:['safety','efficiency'],scene3d:'wellness-'+kind,dataKey:'wellnessRoadFixtures.'+kind,optional:true});}
 window.otrWellnessRoadBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 window.otrWellnessRoadPriorRun=OTR.game.scene.getScene('FirstPersonScenarioScene').scenarioSession;window.otrWellnessRoadWantedId=id;
 const old=OTR.game.scene.getScenes(true).find(s=>s.sys.settings.key!=='BootScene');old?.releaseMouse?.();OTR.academy.assessing=null;OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:id});if(old&&old.sys.settings.key!=='FirstPersonScenarioScene')OTR.game.scene.stop(old.sys.settings.key);window.otrBenchmarkScene='FirstPersonScenarioScene';
};
