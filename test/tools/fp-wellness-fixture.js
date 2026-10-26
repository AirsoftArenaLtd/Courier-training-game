/* Static component rendering only. This adapter is not installed in the application or used by native journeys. */
module.exports=({view='wellnessice',start=true}={})=>{
 const F=OTR.fpScenario;
 if(!F.definitions.has('wellness-component-fixture')){
  const base=F.definitions.get('customer-doorsteps'),ordinary=OTR.fpCustomerStopWorld;
  OTR.fpCustomerStopWorld={build(parent,m,options){return m.customerStop?.wellness?OTR.fpWellnessStopWorld.build(parent,m,options):ordinary.build(parent,m,options);}};
  F.register('wellness-component-fixture',{
   ...base,goal:'Inspect the safety surfaces in this component preview.',
   setup(run,m){run.wellnessFixtureSerial=window.otrWellnessFixtureSerial;base.setup(run,m);m.customerStop=OTR.fpWellnessStop.create(run.id,run.content,run.scenario.categories,{coaching:OTR.fpScenario.coaching(run)});OTR.fpScannerStopScenario.configure(run,m);OTR.fpWellnessStage.create(m);m.solids.push(...OTR.fpWellnessStage.solids(m));},
   tick(){},clockActive(){return false;},interact(){return true;},status(){return 'This is a static safety component preview.';},
   result(){throw Error('Static component previews cannot complete a scenario');}
  });
 }
 const id=['wellnessgate','wellnesscharge','wellnessfear'].includes(view)?'m8-dog':['wellnessshade','wellnesscarry','wellnessclinic'].includes(view)?'m8-heat':'m8-steps';
 if(start){window.otrWellnessFixtureSerial=(window.otrWellnessFixtureSerial||0)+1;OTR.registry.get(id).scene3d='wellness-component-fixture';OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:id});OTR.game.scene.stop('FirstPersonScene');}
 return id;
};
