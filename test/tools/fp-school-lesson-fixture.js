/* Proposed optional B-135 entry exists only in this browser fixture; Claude owns the shared registry. */
module.exports=async function schoolLessonFixture({assess=false}={}){
 const old=OTR.game.scene.getScenes(true).find(s=>s.sys.settings.key!=='BootScene');old?.closePanel?.(false);old?.releaseMouse?.();
 if(old)await new Promise(resolve=>{old.events.once('shutdown',resolve);OTR.game.scene.stop(old.sys.settings.key);});
 const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 if(!OTR.registry.get('m1-school'))OTR.registry.modules().find(m=>m.id==='m1').scenarios.push({
   id:'m1-school',title:'Drive safely through a school zone.',icon:'ic_wheel',scene3d:'school-zone-drive',dataKey:'schoolZoneLesson',categories:['safety'],optional:true,
   blurb:'Keep to the school-zone speed limit, stop for the flashing school bus and wait for children to clear the crossing.',
   learn:['Read the school-zone signs.','Wait for the school bus and children.'],controls:'Use the physical cab controls or their keyboard shortcuts. Follow the sat nav and press the finish key after parking.'
 });
 if(assess)OTR.academy.begin('m1-school');else OTR.academy.assessing=null;
 window.schoolLessonBenchmarkBefore=before;OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m1-school'});return before;
};
