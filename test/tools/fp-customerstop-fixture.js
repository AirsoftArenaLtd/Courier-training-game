/* Static resource pose registration only. Native doorstep tests use actual keys and clocks. */
module.exports=()=>{
 OTR.registry.get('m3-doorsteps').scene3d='customer-doorsteps';
 OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:'m3-doorsteps'});OTR.game.scene.stop('FirstPersonScene');
};
