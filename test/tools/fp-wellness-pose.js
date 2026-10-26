/* Frozen whole-world poses of the unloaded safety component; no gameplay or assessment claim. */
module.exports=view=>{
 const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),run=scene.scenarioSession,m=scene.model,K=OTR.fpWellnessStop,B=OTR.fpCustomerStop,A=OTR.fpScannerStopScenario,d=m.customerStop;
 window.otrBenchmarkScene='FirstPersonScenarioScene';scene.keyboardMode=true;OTR.fpScenario.begin(run);scene.closePanel();
 scene.wellnessBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 d.index=['wellnessclutter','wellnesscharge','wellnesscarry'].includes(view)?1:['wellnessentry','wellnessfear','wellnessclinic'].includes(view)?2:0;
 B.prepare(d);K.prepare(d);A.configure(run,m);OTR.fpWellnessStage.create(m);m.solids.push(...OTR.fpWellnessStage.solids(m));B.begin(d);scene.rebuildWorld();m.mode='walk';B.exit(d,true);
 Object.assign(m.player,{x:8,z:-37.7,yaw:.55,pitch:.33});
 if(view==='wellnessclutter')Object.assign(m.player,{x:10.2,z:-38.9,yaw:.5,pitch:.52});
 if(view==='wellnessentry')Object.assign(m.player,{x:9,z:-39.6,yaw:.5,pitch:.28});
 if(['wellnessgate','wellnesscharge','wellnessfear'].includes(view)){
  Object.assign(m.player,{x:11.3,z:view==='wellnessgate'?-38.1:-39.4,yaw:.25,pitch:.25});const dog=d.wellness.ref.dog;dog.setAlpha(1);dog.x=d.wellness.ref.me.x+180;if(view==='wellnesscharge')dog.setMood('aggressive');if(view==='wellnessfear')dog.setMood('fearful');
  const pose=m.wellnessStage.dog;pose.sourceX=dog.x;pose.x=pose.goalX=12.2;pose.z=pose.goalZ=view==='wellnessgate'?-42.2:-41.6;
 }
 if(['wellnesscarry','wellnessclinic'].includes(view)){B.take(d,'p1');B.scan(d,'p1',true);d.state.answered=true;}
 if(view==='wellnessshade')Object.assign(m.player,{x:6,z:-37.5,yaw:.65,pitch:.05});
 if(view==='wellnesscarry')Object.assign(m.player,{x:9.5,z:-39,yaw:.5,pitch:.1});
 if(view==='wellnessclinic')Object.assign(m.player,{x:11.2,z:m.scannerStage.wall+3.8,yaw:.18,pitch:.05});
 m.customerStage.time=m.wellnessStage.time=100;m.paused=true;scene.sync();scene.refresh();
};
