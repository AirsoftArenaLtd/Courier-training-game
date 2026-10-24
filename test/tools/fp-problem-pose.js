/* Frozen physical resource poses. They are deliberately separate from native-key protocol evidence. */
module.exports=name=>{
 const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=scene.scenarioSession,m=scene.model,s=m.customerTalk,K=OTR.fpCustomerTalk,S=OTR.fpProblemStage;window.otrBenchmarkScene='FirstPersonScenarioScene';scene.keyboardMode=true;OTR.fpScenario.begin(r);scene.closePanel();
 scene.problemBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 if(name==='problemisolation'){K.begin(s);K.advance(s);K.choose(s,s.choices.findIndex(c=>c.grade==='good'));K.advance(s);}
 else if(name==='problemflood'){K.enter(s,'n2_flood');S.apply(m.problemStage,s);K.enter(s,'n3f');}
 else if(name==='problemrecipient'){K.enter(s,'n3_ct');S.apply(m.problemStage,s);K.enter(s,'n4');}
 else K.enter(s,name==='problemrecovery'?'n2':name==='problemcargo'?'n3':name==='problemgate'?'n5':name==='problemreply'?'n2_412':s.content.start);
 S.apply(m.problemStage,s);S.step(m.problemStage,0);const site=m.problemStage.site;m.mode=site==='cab'?'cab':'walk';m.cargoOpen=site==='cargo';m.van.speed=0;
 Object.assign(m.player,{x:site==='cargo'?1.7:site==='gate'?14:site==='safe'?7.5:12,z:site==='cargo'?-36.4:site==='gate'?-41.4:site==='safe'?-37.8:site==='other'?-28.6:-42.6});scene.sync();
 const p=scene.view.camera.position,t=m.problemStage.target,yaw=Math.atan2(t.x-p.x,-(t.z-p.z));if(m.mode==='cab')m.van.look=yaw;else m.player.yaw=yaw;m.player.pitch=Math.atan2(p.y-t.y,Math.hypot(t.x-p.x,t.z-p.z));scene.sync();
 if(name==='problemreply'){K.advance(s);OTR.fpCustomerScenario.present(scene,s.choices.reduce((best,ch,i)=>ch.text.length>s.choices[best].text.length?i:best,0));}
 if(name==='problemhandheld')scene.showScanner();if(name==='problemcontrols')OTR.fpProblemScenario.controls(scene,1);
 // No decision or world clock may advance while this fixed render fixture is sampled.
 if(scene.panel)scene.panel.customer=false;m.paused=true;scene.sync();scene.refresh();
};
