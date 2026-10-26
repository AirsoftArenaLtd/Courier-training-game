/* Static scene/node/pose fixtures, explicitly separate from native journey evidence. */
module.exports=view=>{
 const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),run=scene.scenarioSession,m=scene.model,s=m.customerTalk,stage=m.incidentStage,K=OTR.fpCustomerTalk,S=OTR.fpIncidentStage;window.otrBenchmarkScene='FirstPersonScenarioScene';scene.keyboardMode=true;OTR.fpScenario.begin(run);scene.closePanel();
 scene.incidentBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 const node=view==='incidentdriver'?'n3b':view==='incidentwitness'?'n9':view==='incidentcab'?'n7':view==='incidentreport'||view==='incidentreply'?'n10':'n1';
 if(view==='incidentdriver'||view==='incidentwitness'){K.enter(s,'n3');S.apply(stage,s);}K.enter(s,node);S.apply(stage,s);
 m.mode=stage.site==='cab'?'cab':'walk';Object.assign(m.player,stage.site==='witness'?{x:10.8,z:-40.6}:stage.site==='driver'?{x:6,z:-39.1}:{x:-.3,z:-38});scene.sync();
 const t=stage.target,eye=scene.view.camera.position,yaw=Math.atan2(t.x-eye.x,-(t.z-eye.z));if(m.mode==='cab')m.van.look=yaw;else m.player.yaw=yaw;m.player.pitch=Math.atan2(eye.y-t.y,Math.hypot(t.x-eye.x,t.z-eye.z));scene.sync();scene.target=scene.art.pick();
 if(view==='incidentreply'||view==='incidentreport'){K.advance(s);OTR.fpCustomerScenario.present(scene,view==='incidentreport'?1:0);}
 if(view==='incidentcontrols')OTR.fpIncidentScenario.controls(scene,1);
 if(view==='incidenthandheld')OTR.fpIncidentScenario.handheld(run,scene);
 if(scene.panel)scene.panel.customer=false;m.paused=true;scene.sync();scene.refresh();
};
