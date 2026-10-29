/* Declared parked/inspection poses for resource sampling; no encounter, verdict or result is injected. */
module.exports=function junctionLessonView(name){
 const sc=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=sc.scenarioSession,m=sc.model,stop=m.stops[0],s=m.junctionLesson;
 window.otrBenchmarkScene='FirstPersonScenarioScene';sc.keyboardMode=true;OTR.fpScenario.begin(r);sc.handheld.close(false);sc.closePanel(false);Object.assign(m.van,{belt:true,look:0});m.player.pitch=0;
 if(name.startsWith('junctionfinish')||name==='junctiondevice'||name==='junctioncycle'){
  Object.assign(m.van,stop.park,{speed:0,hand:true});
  if(name.startsWith('junctionfinish')){
   const b=stop.bay,point=b.axis==='x'?{x:b.x0,z:b.z0}:{x:stop.park.x-1.3,z:b.z1};
   m.mode='walk';Object.assign(m.player,{x:point.x-4,z:point.z+4,yaw:Math.PI/4,pitch:Math.atan2(1.585,Math.hypot(4,4))});
  }
 }else{
  const entry=sc.art.signs.entries.find(e=>e.sign.junction===s.control.index&&e.sign.approach===OTR.fpJunctionLesson.rounds[s.index].approach),seat=OTR.fpCamera.seat,eye=OTR.fp.local(m.van,seat.x,seat.z);
  if(!entry)throw Error('Missing actual junction control.');m.van.look=OTR.fp.clamp(OTR.fpCamera.angle(Math.atan2(entry.x-eye.x,-(entry.z-eye.z))-m.van.yaw),-1.5,1.5);m.player.pitch=Math.atan2(seat.y-entry.y,Math.hypot(entry.x-eye.x,entry.z-eye.z));
 }
 m.paused=true;sc.sync();sc.refresh();
 if(name==='junctiondevice'||name==='junctioncycle'){const visits=name==='junctioncycle'?20:1;for(let n=0;n<visits;n++){if(n)sc.handheld.close(false);OTR.fpJunctionLessonUI.show(sc);}s.resourceDeviceVisits=visits;}
 sc.sync();sc.refresh();sc.view.world.updateMatrixWorld(true);sc.view.camera.updateMatrixWorld(true);
};
