/* Test-only optional descriptor; shared no-data-key registry/launcher support is a separate A-30 dependency. */
module.exports=async function junctionLessonFixture({assess=false}={}){
 const old=OTR.game.scene.getScenes(true).find(s=>s.sys.settings.key!=='BootScene');old?.closePanel?.(false);old?.releaseMouse?.();
 if(old)await new Promise(resolve=>{old.events.once('shutdown',resolve);OTR.game.scene.stop(old.sys.settings.key);});
 const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 OTR_DATA.junctionLessonTestContent={};
 if(!OTR.registry.get('m1-junctions'))OTR.registry.modules().find(m=>m.id==='m1').scenarios.push({id:'m1-junctions',title:'Drive safely through three junctions.',icon:'ic_wheel',scene3d:'junction-approaches',dataKey:'junctionLessonTestContent',categories:['safety','efficiency'],optional:true,
  blurb:'Drive through the stop-sign, red-light and give-way approaches, then park in each marked bay.',learn:['Read the junction controls and give way safely.'],controls:'Use the physical cab controls or their keyboard shortcuts.'});
 if(assess)OTR.academy.begin('m1-junctions');else OTR.academy.assessing=null;
 window.junctionLessonBenchmarkBefore=before;OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m1-junctions'});return before;
};
