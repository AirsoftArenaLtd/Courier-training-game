/* Browser-only test adapter: it does not enable a production module or replace its content file. */
module.exports=function installScenarioFixture({piece='cab',assess=false,autoFinish=true,remap=false}={}){
 const old=OTR.game.scene.getScenes(true).find(s=>s.sys.settings.key!=='BootScene');
 if(old?.closePanel)old.closePanel(false);if(old?.releaseMouse)old.releaseMouse();
 const scenario=OTR.registry.get('m1-pretrip'),key='qa-runner-'+piece;
 OTR.fpScenario.definitions.delete(key);scenario.scene3d=key;
 OTR.fpScenario.register(key,{
  piece,goal:piece==='cab'?'Select neutral at the shifter.':'Inspect the van before driving.',seconds:120,
  setup(run){run.localReports=[];},
  report(run,type,detail){run.localReports.push({type,detail});},
  update(run,scene){if(autoFinish&&piece==='cab'&&run.model.van.gear===0)scene.finishScenario();},
  result(run,reason){
   const ok=reason==='complete'&&run.model.van.gear===0,entry=OTR_DATA.workdayEvents['drive.gear'];
   run.log.check(entry.cat,ok?entry.max:0,entry.max,ok?entry.label:entry.fail,{lesson:entry.lesson,critical:entry.critical});
   return {score:ok?100:0,ratios:{[entry.cat]:run.log.ratio(entry.cat)},log:run.log};
  }
 });
 if(assess)OTR.academy.begin(scenario.id);else OTR.academy.assessing=null;
 if(remap)OTR.a11y.settings().keys.KeyP='KeyO';
 const before={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:scenario.id});
 if(old&&old.sys.settings.key!=='FirstPersonScenarioScene')OTR.game.scene.stop(old.sys.settings.key);
 return before;
};
