/* Static render setup only. No pose, node or score fixtures are allowed in native gameplay checks. */
module.exports=({view})=>{
 const kind=view==='problemrecovery'||view==='problemcargo'?'recover':view==='problemdamaged'||view==='problemisolation'?'damaged':view.startsWith('problemstorm')||view==='problemgate'||view==='problemflood'?'storm':'address';
 const id='m4-'+kind;OTR.registry.get(id).scene3d='problem-conversation';OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:id});OTR.game.scene.stop('FirstPersonScene');
};
