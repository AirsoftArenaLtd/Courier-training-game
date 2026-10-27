/* Explicit static resource poses; no native movement/result acceptance. */
module.exports=name=>{
 const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=s.scenarioSession,m=s.model;
 s.closePanel(false);OTR.fpScenario.begin(r);window.otrReverseBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};m.paused=true;m.mode='cab';m.van.gear=name==='reversecab'?2:-1;m.reverseLesson.car.x=0;m.reverseLesson.car.z=-58;m.van.look=0;m.player.pitch=0;
 if(name==='reverseyard'){m.mode='walk';Object.assign(m.player,{x:-3.3,z:-63,yaw:Math.PI/2,pitch:.12});}
 if(name==='reversebay'){m.mode='walk';Object.assign(m.player,{x:-3.1,z:-52,yaw:Math.PI/2,pitch:.18});}
 s.sync();
 if(['reversemirrorleft','reversemirrorright','reversecamera'].includes(name)){
  const id=name==='reversecamera'?'cab-camera':name==='reversemirrorleft'?'mirror-left':'mirror-right',object=s.art.interactions.find(o=>o.userData.interaction===id);if(!object)throw Error('Missing reverse render target '+id);
  const p=object.getWorldPosition(new THREE.Vector3()),eye=s.view.camera.position;m.van.look=OTR.fp.clamp(Math.atan2(p.x-eye.x,-(p.z-eye.z))-m.van.yaw,-1.5,1.5);m.player.pitch=OTR.fp.clamp(Math.atan2(eye.y-p.y,Math.hypot(p.x-eye.x,p.z-eye.z)),-1.05,1.05);s.sync();if(s.art.pick()!==id)throw Error('Blocked reverse render target '+id+' '+s.art.pick());
 }
 if(name==='reversecontrols')OTR.fpReverseScenario.controls(r,s,3);
 if(name==='reversehandheld')OTR.fpReverseScenario.handheld(r,s);
 m.paused=true;s.sync();
};
