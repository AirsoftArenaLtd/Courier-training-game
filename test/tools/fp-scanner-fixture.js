/* Static rendering only; native scanner journeys must never call this fixture. */
module.exports=({view})=>{
 const id=view.startsWith('scannerid')?'m5-adult':['scannerclosed','scannerrefusal'].includes(view)?'m5-exceptions':'m5-pod';OTR.registry.get(id).scene3d='scanner-stop';OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:id});OTR.game.scene.stop('FirstPersonScene');
};
