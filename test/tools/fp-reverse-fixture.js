/* Static benchmark fixture: optional test registration, real loaded adapter, no gameplay claim. */
module.exports=()=>{
 const id='m8-reverse';if(!OTR.registry.get(id)){OTR_DATA.reverseLessons={nearMiss:{}};OTR_DATA.modules.find(m=>m.id==='m8').scenarios.push({id,title:'Reversing Near-Miss',categories:['safety'],scene3d:'wellness-reverse',dataKey:'reverseLessons.nearMiss',optional:true});}
 const old=OTR.game.scene.getScenes(true).find(s=>s.sys.settings.key!=='BootScene');if(old?.releaseMouse)old.releaseMouse();
 window.otrReverseBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 OTR.academy.assessing=null;OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:id});if(old&&old.sys.settings.key!=='FirstPersonScenarioScene')OTR.game.scene.stop(old.sys.settings.key);window.otrBenchmarkScene='FirstPersonScenarioScene';
};
