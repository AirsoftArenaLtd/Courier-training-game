/* Existing-id browser fixture. Production registry/default choices remain with the shared academy. */
module.exports=async function drivingLessonFixture({assess=false}={}){
 const old=OTR.game.scene.getScenes(true).find(s=>s.sys.settings.key!=='BootScene');old?.closePanel?.(false);old?.releaseMouse?.();
 if(old)await new Promise(resolve=>{old.events.once('shutdown',resolve);OTR.game.scene.stop(old.sys.settings.key);});
 const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 OTR.registry.get('m1-driving').scene3d='driving-town-drill';if(assess)OTR.academy.begin('m1-driving');else OTR.academy.assessing=null;
 window.drivingLessonBenchmarkBefore=before;OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m1-driving'});return before;
};
