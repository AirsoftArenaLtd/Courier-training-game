/* Browser-only optional descriptor/content; shared A-30 routing remains separately owned. */
module.exports=async function nightLessonFixture({assess=false}={}){
 const old=OTR.game.scene.getScenes(true).find(s=>s.sys.settings.key!=='BootScene');old?.closePanel?.(false);old?.releaseMouse?.();
 if(old)await new Promise(resolve=>{old.events.once('shutdown',resolve);OTR.game.scene.stop(old.sys.settings.key);});
 const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 OTR_DATA.nightLessonTestContent={};
 if(!OTR.registry.get('m1-night'))OTR.registry.modules().find(m=>m.id==='m1').scenarios.push({id:'m1-night',title:'Drive safely at night.',icon:'ic_wheel',scene3d:'night-route-drive',dataKey:'nightLessonTestContent',categories:['safety','efficiency'],optional:true,
  blurb:'Inspect the headlights, follow the night route with a safe gap and park in the marked bay.',learn:['Check the headlights and maintain a safe following gap.'],controls:'Use the physical inspection and cab controls or their keyboard shortcuts.'});
 if(assess)OTR.academy.begin('m1-night');else OTR.academy.assessing=null;
 window.nightLessonBenchmarkBefore=before;OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m1-night'});return before;
};
