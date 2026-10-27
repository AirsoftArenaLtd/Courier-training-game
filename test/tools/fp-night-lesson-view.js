/* Declared render-only night poses. No course progress, verdict or result is supplied. */
module.exports=function nightLessonView(name){
 const sc=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=sc.scenarioSession,m=sc.model,s=m.nightLesson,stop=m.stops[0];window.otrBenchmarkScene='FirstPersonScenarioScene';sc.keyboardMode=true;OTR.fpScenario.begin(r);sc.handheld.close(false);sc.closePanel(false);
 Object.assign(m.van,{belt:true,look:0,headlights:!['nightlessoninspect','nightlessoncaboff'].includes(name)});m.player.pitch=0;
 if(name==='nightlessoninspect'){sc.showInspection('lights');}
 else if(name==='nightlessonfinish'){
  Object.assign(m.van,stop.park,{speed:0,hand:true});const x=stop.park.x-1.3,z=stop.bay.z1;m.mode='walk';Object.assign(m.player,{x:x-4,z:z+4,yaw:Math.PI/4,pitch:Math.atan2(1.585,Math.hypot(4,4))});
 }else{
  m.mode='cab';m.repaired=true;
  if(['nightlessondevice','nightlessoncycle'].includes(name))Object.assign(m.van,stop.park,{speed:0,hand:true});
  else{
   sc.sync();const seat=OTR.fpCamera.seat,e=OTR.fp.local(m.van,seat.x,seat.z),point=name==='nightlessonlead'?{x:s.lead.x,y:1.1,z:s.lead.z}:sc.art.interactions.find(o=>o.userData.interaction==='cab-headlights').getWorldPosition(new THREE.Vector3());
   m.van.look=OTR.fp.clamp(OTR.fpCamera.angle(Math.atan2(point.x-e.x,-(point.z-e.z))-m.van.yaw),-1.5,1.5);m.player.pitch=Math.atan2(seat.y-point.y,Math.hypot(point.x-e.x,point.z-e.z));
  }
 }
 m.paused=true;sc.sync();sc.refresh();
 if(['nightlessondevice','nightlessoncycle'].includes(name)){const visits=name==='nightlessoncycle'?20:1;for(let i=0;i<visits;i++){if(i)sc.handheld.close(false);OTR.fpNightLessonUI.show(sc);}s.resourceDeviceVisits=visits;}
 sc.sync();sc.refresh();sc.view.world.updateMatrixWorld(true);sc.view.camera.updateMatrixWorld(true);
};
