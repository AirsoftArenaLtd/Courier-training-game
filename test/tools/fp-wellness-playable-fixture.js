/* Start the actual loaded adapter. Resource poses are explicitly arranged by the separate pose fixture. */
module.exports=({view='wellnessice'}={})=>{
 const id=['wellnessgate','wellnesscharge','wellnessfear','wellnessreply','wellnessowner'].includes(view)?'m8-dog':['wellnessshade','wellnesscarry','wellnessclinic','wellnesscab','wellnessreverse','wellnesshandheld','wellnesscontrols','wellnessdrink'].includes(view)?'m8-heat':'m8-steps';
 const scene=OTR.game.scene.getScene('FirstPersonScenarioScene');window.otrWellnessPriorRun=scene.scenarioSession;window.otrWellnessFixtureSerial=(window.otrWellnessFixtureSerial||0)+1;window.otrWellnessFixtureError=null;
 if(!scene.wellnessUnavailableOriginal){scene.wellnessUnavailableOriginal=scene.scenarioUnavailable;scene.scenarioUnavailable=function(error){window.otrWellnessFixtureError={serial:window.otrWellnessFixtureSerial,message:error.message,stack:error.stack};return this.wellnessUnavailableOriginal(error);};}
 OTR.registry.get(id).scene3d='wellness-stops';OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:id});OTR.game.scene.stop('FirstPersonScene');return id;
};
