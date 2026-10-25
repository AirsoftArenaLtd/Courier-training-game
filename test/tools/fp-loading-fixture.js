/* Resource captures only. Native controls/records validation must not use these positions or actions. */
module.exports=({view})=>{
 const id=view.startsWith('find')?'m6-find':'m6-load';OTR.registry.get(id).scene3d='loading-cargo';OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:id});OTR.game.scene.stop('FirstPersonScene');
};
