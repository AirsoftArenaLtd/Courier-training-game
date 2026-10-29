/* Benchmark setup only: real registered pre-trip adapter, fixed poses and no module results or workday writes. */
module.exports=function pretripFixture(){
 const old=OTR.game.scene.getScenes(true).find(s=>s.sys.settings.key!=='BootScene');old?.closePanel?.(false);old?.releaseMouse?.();
 const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 OTR.registry.get('m1-pretrip').scene3d='pretrip-van';OTR.academy.assessing=null;window.pretripBenchmarkBefore=before;
 OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m1-pretrip'});if(old&&old.sys.settings.key!=='FirstPersonScenarioScene')OTR.game.scene.stop(old.sys.settings.key);return before;
};
