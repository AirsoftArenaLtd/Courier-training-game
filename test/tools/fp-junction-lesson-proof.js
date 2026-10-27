/* Actual rendered sign/paint ray, fixed resource bounds, isolated session and absence of grading fixtures. */
module.exports=function junctionLessonProof(name){
 const sc=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=sc.scenarioSession,m=sc.model,s=m.junctionLesson,a=sc.art,T=THREE,before=window.junctionLessonBenchmarkBefore,device=name==='junctiondevice'||name==='junctioncycle',finish=name.startsWith('junctionfinish'),b=m.stops[0].bay,cam=sc.view.camera;
 const e=a.signs.entries.find(e=>e.sign.junction===s.control.index&&e.sign.approach===OTR.fpJunctionLesson.rounds[s.index].approach),point=new T.Vector3();
 if(finish)point.set(b.axis==='x'?b.x0:m.stops[0].park.x-1.3,.075,b.axis==='x'?b.z0:b.z1);else if(e)point.set(e.x,e.y,e.z);
 const visible=o=>{for(;o;o=o.parent)if(!o.visible)return false;return true;};let clear=device&&sc.handheld.isOpen,hit;
 if(!device){const ray=new T.Raycaster(cam.position,point.clone().sub(cam.position).normalize(),0,cam.position.distanceTo(point)+.5);hit=ray.intersectObjects(sc.view.world.children,true).find(h=>visible(h.object)&&h.object.layers.test(cam.layers));clear=!!hit&&(finish?hit.object===a.lessonBayArt.mesh:hit.point.distanceTo(point)<.6);}
 const ndc=device?new T.Vector3():point.clone().project(cam),control=OTR.fpTraffic.layout(m)[s.control.index];
 return {source:'registered-junction-adapter',id:r.id,key:r.scenario.scene3d,index:s.index,kind:control.kind,name,optional:r.scenario.optional===true,traffic:!!m.trafficControl,navigation:!!m.navigation,signs:OTR.fpSigns.enabled(m),day:m.routePlan.day,logItems:r.log.items.length,rounds:r.junctionLesson.rounds.length,observations:Object.keys(s.observations).length,
  reduced:OTR.fpAccess.reduced(),device:sc.handheld.isOpen,deviceVisits:s.resourceDeviceVisits||0,parking:OTR.fpJunctionLesson.parking(m).ok,aspect:OTR.fpTraffic.aspect(OTR.fpTraffic.signal(m.elapsed,control.offset),m.van.yaw),
  marking:{instances:a.lessonBayArt.mesh.count,visible:a.lessonBayArt.mesh.visible,stop:a.lessonBayArt.stop===m.stops[0],axis:b.axis||'z',texture:!!a.lessonBayArt.mesh.material.map},
  cue:{visible:device?sc.handheld.isOpen:finish?a.lessonBayArt.mesh.visible:!!e?.mainVisible,clear,x:ndc.x,y:ndc.y,z:ndc.z,hit:hit?.object.name||hit?.object.type||null},
  bounded:m.driveAllowed(m.van)&&m.van.x>=m.bounds.x0+2.7&&m.van.x<=m.bounds.x1-2.7&&m.van.z>=m.bounds.z0+2.7&&m.van.z<=m.bounds.z1-2.7,
  checkpointUnchanged:before.checkpoint===JSON.stringify(OTR.fpStore.read()),eventsUnchanged:before.events===JSON.stringify(OTR.workday.events),workdayUnchanged:before.workday===JSON.stringify(OTR.save.data.workday||null)};
};
