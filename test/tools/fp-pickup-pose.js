/* Source-scoped static counter poses; not evidence of native walking, scoring, signature or record completion. */
module.exports=view=>{
 const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),run=scene.scenarioSession,m=scene.model,s=m.pickupTask,K=OTR.fpPickup,A=OTR.fpPickupScenario;window.otrBenchmarkScene='FirstPersonScenarioScene';scene.keyboardMode=true;OTR.fpScenario.begin(run);scene.closePanel();if(s.phase==='brief')K.begin(s);
 scene.pickupBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};
 Object.assign(m.player,{x:12,z:-45.2,yaw:0,pitch:0});
 if(!['pickupbusiness','pickupinternational','pickupdangerous','pickupcontrols'].includes(view)){
  let guard=0;while(s.stage==='talk'&&guard++<40){if(s.talk.phase==='choices')K.chooseTalk(s,s.talk.choices.findIndex(c=>c.grade==='good'));else K.advanceTalk(s);}
 }
 if(!['pickupbusiness','pickupinternational','pickupdangerous','pickupcontrols','pickupcart'].includes(view)){for(const p of s.pieces)K.count(s,p.id);K.answerCount(s,K.countChoices(s)[0].id);}
 if(['pickupfindings','pickupexception'].includes(view)){for(let i=0;i<s.content.docs.fields.length;i++)if(s.content.docs.fields[i].bad)K.flag(s,i);K.submitDocs(s);}
 if(['pickupreceipt','pickupsigned','pickupexception'].includes(view)){for(const p of s.pieces)K.decide(s,p.id,p.accept,p.reason||null);K.receipt(s);}
 if(['pickupcart','pickupinspection','pickupdeclared','pickuprefusal'].includes(view))Object.assign(m.player,{x:12,z:-41.7,yaw:0,pitch:.42});
 scene.sync();
 const aim=id=>{const p=scene.art.interactions.find(p=>p.userData.interaction===id),v=p.userData.fpFocusPoint?p.localToWorld(p.userData.fpFocusPoint.clone()):p.getWorldPosition(new THREE.Vector3()),eye=scene.view.camera.position;m.player.yaw=Math.atan2(v.x-m.player.x,-(v.z-m.player.z));m.player.pitch=Math.atan2(eye.y-v.y,Math.hypot(v.x-m.player.x,v.z-m.player.z));scene.sync();scene.target=scene.art.pick();scene.sync();};
 if(view==='pickupcart'){Object.assign(m.player,{x:13.95,z:-41.7});scene.sync();aim('pickup-parcel-b6');}
 if(view==='pickupcount'){Object.assign(m.player,{x:10.15,z:-45.2});scene.sync();aim('pickup-manifest');A.manifest(scene);}
 if(view==='pickupinspection'){Object.assign(m.player,{x:10.6,z:-41.7});scene.sync();aim('pickup-parcel-b2');A.piece(scene,'b2',1);}
 if(['pickupinvoice','pickupinvoicelast','pickupfindings'].includes(view)){Object.assign(m.player,{x:11,z:-45.2});scene.sync();aim('pickup-invoice');A.invoice(scene,view==='pickupinvoicelast'?10:view==='pickupfindings'?2:0);}
 if(view==='pickupdeclared'){Object.assign(m.player,{x:13.4,z:-41.7});scene.sync();aim('pickup-parcel-g3');A.piece(scene,'g3',1);}
 if(view==='pickuprefusal'){Object.assign(m.player,{x:12,z:-41.7});scene.sync();aim('pickup-parcel-g2');A.refuse(scene,'g2',3);}
 if(['pickupreceipt','pickupsigned','pickupexception'].includes(view)){Object.assign(m.player,{x:13.7,z:-45.2});scene.sync();aim('pickup-receipt');if(view==='pickupsigned')K.signed(s);A.receipt(scene);}
 if(view==='pickupcontrols')A.controls(scene,3);m.paused=true;scene.sync();scene.refresh();
};
