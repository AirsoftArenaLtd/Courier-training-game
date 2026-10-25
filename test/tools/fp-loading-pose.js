/* Static M6 resource poses are distinct from real-key gameplay evidence. */
module.exports=view=>{
 const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),run=scene.scenarioSession,m=scene.model,s=m.loading,K=OTR.fpLoading,A=OTR.fpLoadingScenario;window.otrBenchmarkScene='FirstPersonScenarioScene';scene.keyboardMode=true;OTR.fpScenario.begin(run);scene.closePanel();if(s.phase==='brief')K.begin(s);
 scene.loadingBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 m.cargoOpen=!['loadclosed','loadcart','loadcontrols'].includes(view);Object.assign(m.player,{x:2.84,z:12.2,yaw:0,pitch:0});
 const plan={l1:'A-mid-0',l2:'A-top-0',l3:'A-bottom-0',l4:'B-top-0',l5:'B-bottom-0',l6:'B-mid-0',l7:'C-mid-0',l8:'C-bottom-0',l9:'haz',l10:'A-mid-1',l11:'B-top-1',l12:'C-top-0'};
 if(['loadtop','loadbottom','loadcarried','loadstrapped','loadunsafe','loadreport'].includes(view)){
  if(['loadunsafe','loadreport'].includes(view)){plan.l3='A-top-1';plan.l6='floor-0';plan.l9='C-mid-1';}
  for(const [id,slot]of Object.entries(plan)){K.take(s,id);K.place(s,slot);}
 }
 if(view==='loadcart')Object.assign(m.player,{x:-1.16,z:12.3,yaw:0,pitch:.45});
 if(view==='loadtop')Object.assign(m.player,{x:2.84,z:9.85,yaw:-Math.PI/2,pitch:-.25});
 if(view==='loadbottom')Object.assign(m.player,{x:2.84,z:10.7,yaw:-.75,pitch:.6});
 if(view==='loadcarried'){K.take(s,'l1');Object.assign(m.player,{x:2.84,z:9.85,yaw:0,pitch:.15});}
 if(view==='loadstrapped')K.strap(s);
 if(view==='loadreport'){K.review(s);A.review(scene,1);}if(view==='loadhandheld')A.handheld(run,scene);if(view==='loadcontrols')A.controls(run,scene,0);
 if(view.startsWith('find'))Object.assign(m.player,{x:2.84,z:9.7,yaw:0,pitch:.12});
 if(view==='findunit'){s.roundIndex=3;K.nextRound(s);const p=scene.art.loading.parcels.find(p=>p.data.id==='f10');m.player.yaw=Math.atan2(p.x-m.player.x,-(p.z-m.player.z));}
 if(view==='findhelp'){s.elapsed=45;run.definition.tick(run,scene,.05,true);}
 // Static captures freeze elapsed time, so settle the imported door pose before pausing.
 // Native gameplay must still advance its normal animation through real controls.
 if(scene.art.actors)scene.art.actors.sync(m,m.player.x,m.player.z,true);
 m.paused=true;scene.sync();scene.refresh();
};
