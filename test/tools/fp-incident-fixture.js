/* Existing-id registration only for static resource views. Defaults remain unchanged after reload. */
module.exports=()=>{OTR.registry.get('m8-incident').scene3d='wellness-incident';OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m8-incident'});OTR.game.scene.stop('FirstPersonScene');};
