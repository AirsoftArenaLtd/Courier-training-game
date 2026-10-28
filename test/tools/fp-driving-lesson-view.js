/* Frozen resource poses for the registered adapter; never write a mark, verdict, score or result. */
module.exports=function drivingLessonView({kind,stage,index=0}){
 const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=scene.scenarioSession,m=scene.model,s=m.drivingLesson,H=OTR.fpDrivingLessonHazards;
 window.otrBenchmarkScene='FirstPersonScenarioScene';scene.keyboardMode=true;OTR.fpScenario.begin(r);scene.handheld.close(false);scene.closePanel(false);H.hide(m);
 const at=kind==='parking'?index:s.content.hazards.findIndex(h=>h.kind===kind),stop=m.stops[at];s.checkpoint=at;m.activeStop=at;m.leg=at;s.armed={};m.elapsed=60+at*30;
 m.routePlan.weather=at>=s.content.rainFrom?'rain':'clear';m.routePlan.timeOfDay=at>=s.content.rainFrom?'dusk':'midday';m.briefing.weather=m.routePlan.weather;scene.rebuildWorld();
 Object.assign(m.van,{x:stop.bay.streetX+stop.side*m.town.road/4,yaw:stop.park.yaw,look:0,speed:3,gear:1,hand:false,belt:true,headlights:true,wipers:at>=s.content.rainFrom});m.player.pitch=0;
 if(kind==='parking'){Object.assign(m.van,stop.park,{speed:0,gear:-1,hand:true,steer:.22,look:.6});m.player.pitch=.45;}
 else{
  const distance=13.75,dir=stop.side;let found=false;
  for(let back=8;back<100;back+=.25){const z=stop.park.z+dir*back,cue=z-dir*distance;if(z<m.bounds.z0+2.7||z>m.bounds.z1-2.7||cue<m.bounds.z0+6||cue>m.bounds.z1-6||(cue-stop.park.z)*dir<3||m.town.zs.some(j=>Math.abs(z-j)<m.town.road/2+2.5||Math.abs(cue-j)<m.town.road/2+7.5))continue;m.van.z=z;found=true;break;}
  if(!found)throw Error('No bounded resource approach for '+kind);m.paused=false;if(!H.arm(r))throw Error('The registered controller did not arm '+kind);
  const times={phone:[1,10],ball:[1,3.1],door:[1.8,2.5],water:[.1,2],crosswalk:[2,6],bus:[1,3]},time=times[kind][stage==='clue'?0:1];
  for(let n=0;n<Math.ceil(time/.01);n++)H.advance(r,{},Math.min(.01,time-n*.01));
  if(kind==='phone'){m.van.hand=true;m.van.speed=0;m.van.look=.6;m.player.pitch=.45;}
 }
 m.paused=true;scene.sync();scene.refresh();if(kind==='phone'&&stage==='after')OTR.fpDrivingLessonUI.show(scene);
 scene.sync();scene.refresh();scene.view.world.updateMatrixWorld(true);scene.view.camera.updateMatrixWorld(true);
};
