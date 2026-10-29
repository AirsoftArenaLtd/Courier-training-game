/* Benchmark poses use the actual registered adapter. No result is completed and no workday report is sent. */
module.exports=async function routeLessonFixture(){
 const incomingCheckpoint=JSON.stringify(OTR.fpStore.read());
 const old=OTR.game.scene.getScenes(true).find(s=>s.sys.settings.key!=='BootScene');old?.closePanel?.(false);old?.releaseMouse?.();
 // Leaving a normal workday legitimately saves its own last position. Await that shutdown before
 // measuring whether the module writes to its checkpoint; otherwise its delayed save is misattributed.
 if(old)await new Promise(resolve=>{old.events.once('shutdown',resolve);OTR.game.scene.stop(old.sys.settings.key);});
 const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 before.previousCheckpointSaved=incomingCheckpoint!==before.checkpoint;
 OTR.registry.get('m1-route').scene3d='route-satnav';OTR.academy.assessing=null;window.routeLessonBenchmarkBefore=before;
 OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m1-route'});return before;
};
