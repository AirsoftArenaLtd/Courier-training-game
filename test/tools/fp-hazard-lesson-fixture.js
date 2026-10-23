/* Benchmark the actual existing-id adapter after its outgoing scene finishes saving. */
module.exports=async function hazardLessonFixture(){
 const old=OTR.game.scene.getScenes(true).find(s=>s.sys.settings.key!=='BootScene');old?.closePanel?.(false);old?.releaseMouse?.();
 if(old)await new Promise(resolve=>{old.events.once('shutdown',resolve);OTR.game.scene.stop(old.sys.settings.key);});
 const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 OTR.registry.get('m1-spot').scene3d='hazard-road-clips';OTR.academy.assessing=null;window.hazardLessonBenchmarkBefore=before;
 OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m1-spot'});return before;
};
