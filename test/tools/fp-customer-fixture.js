/* Static render poses only; native tests exercise actual conversations, decisions and walking. */
module.exports=({view})=>{
 const kind=['customerphone','customerquestion','customerhistory'].includes(view)?'signature':['customerreception','customerdog','customertimed'].includes(view)?'twostops':'missing';
 const id='m3-'+kind,entry=OTR.registry.get(id);entry.scene3d='customer-conversation';
 OTR.game.scene.start('FirstPersonScenarioScene',{scenarioId:id});OTR.game.scene.stop('FirstPersonScene');
};
