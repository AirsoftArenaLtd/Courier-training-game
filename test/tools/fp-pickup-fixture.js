/* Static resource fixtures only. Native validation must use real keys instead of these poses/actions. */
module.exports=({view})=>{
 const kind=['pickupinternational','pickupinvoice','pickupinvoicelast','pickupfindings','pickupexception'].includes(view)?'intl':['pickupdangerous','pickupdeclared','pickuprefusal','pickupsigned'].includes(view)?'dg':'business';
 const id='m7-'+kind;OTR.registry.get(id).scene3d='pickup-counter';OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:id});OTR.game.scene.stop('FirstPersonScene');
};
