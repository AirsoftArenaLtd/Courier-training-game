/* Disclosed actor/parking resource poses use the actual controller; no verdict, result or score is injected. */
module.exports=function schoolLessonView(name){
 const sc=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=sc.scenarioSession,m=sc.model,v=m.van,s=m.schoolLesson;
 window.otrBenchmarkScene='FirstPersonScenarioScene';sc.keyboardMode=true;OTR.fpScenario.begin(r);sc.handheld.close(false);sc.closePanel(false);m.paused=false;
 Object.assign(v,{belt:true,look:0});m.player.pitch=0;
 if(name==='schoolbus'){
  v.hand=false;for(let n=0;n<300&&m.driving.bus.state==='waiting';n++)m.step({forward:v.speed<3},.05);
  if(m.driving.bus.state!=='flashing')throw Error('The live school bus did not enter the resource view.');v.speed=0;v.hand=true;
 }else if(name==='schoolchildren'||name==='schoolclear'){
  m.driving.bus.state='done';Object.assign(v,{x:m.town.school.x+m.town.road/4,z:m.crossing.z+16,yaw:0,speed:0,hand:true});
  for(let n=0;n<(name==='schoolclear'?500:120)&&m.crossing.state!=='resolved';n++)m.step({},.05);
 }else if(['schoolfinish','schoolreverse','schooldevice','schoolcycle'].includes(name)){
  Object.assign(v,m.stops[0].park,{speed:0,hand:true});
  if(name==='schoolfinish'){m.mode='walk';const stop=m.stops[0];Object.assign(m.player,{x:stop.park.x-4,z:stop.bay.z1+4,yaw:Math.PI/4,pitch:Math.atan2(1.585,Math.hypot(4,4))});}
  if(name==='schoolreverse'){v.gear=-1;v.steer=.22;v.look=.6;m.player.pitch=.45;}
 }
 m.paused=true;sc.sync();sc.refresh();
 if(name==='schooldevice'||name==='schoolcycle'){
  const visits=name==='schoolcycle'?20:1;for(let n=0;n<visits;n++){if(n)sc.handheld.close(false);OTR.fpSchoolLessonUI.show(sc);}s.resourceDeviceVisits=visits;
 }
 sc.sync();sc.refresh();sc.view.world.updateMatrixWorld(true);sc.view.camera.updateMatrixWorld(true);
};
