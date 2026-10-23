/* Benchmark poses use the actual registered adapter. No result is completed and no workday report is sent. */
module.exports=function routeLessonFixture(){
 const old=OTR.game.scene.getScenes(true).find(s=>s.sys.settings.key!=='BootScene');old?.closePanel?.(false);old?.releaseMouse?.();
 const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 OTR.registry.get('m1-route').scene3d='route-satnav';OTR.academy.assessing=null;window.routeLessonBenchmarkBefore=before;
 OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m1-route'});if(old&&old.sys.settings.key!=='FirstPersonScenarioScene')OTR.game.scene.stop(old.sys.settings.key);return before;
};
