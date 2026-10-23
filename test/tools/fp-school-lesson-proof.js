/* Inspect the actual physical actor/mark and ray, alongside local-result and workday isolation. */
module.exports=function schoolLessonProof(name){
 const sc=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=sc.scenarioSession,m=sc.model,a=sc.art,b=m.bounds,before=window.schoolLessonBenchmarkBefore,T=THREE,cam=sc.view.camera,point=new T.Vector3();
 const visible=o=>{for(;o;o=o.parent)if(!o.visible)return false;return true;};let owner=null,device=false,sign=false;
 if(name==='schoolapproach'){const e=a.signs.entries.find(e=>e.sign.id==='school:north');point.set(e.x,2.35,e.z);sign=e.mainVisible;}
 else if(name==='schoolbus'){owner=sc.view.world.getObjectByName('traffic:school-bus');point.set(0,2.8,3.87).applyMatrix4(owner.matrixWorld);}
 else if(name==='schoolchildren'||name==='schoolclear'){owner=a.actors?.children||sc.view.world.getObjectByName('traffic:school-children-fallback');point.set(m.crossing.x,.8,m.crossing.z);}
 else if(name==='schoolfinish'){owner=a.lessonBayArt.mesh;point.set(m.stops[0].park.x,.075,m.stops[0].bay.z1);}
 else if(name==='schoolreverse'){owner=a.rear.screen;owner.getWorldPosition(point);}
 else device=true;
 let clear=device&&sc.handheld.isOpen,hit;const ndc=device?new T.Vector3():point.clone().project(cam);
 if(!device){const ray=new T.Raycaster(cam.position,point.clone().sub(cam.position).normalize(),0,cam.position.distanceTo(point)+.5);hit=ray.intersectObjects(sc.view.world.children,true).find(h=>visible(h.object)&&h.object.layers.test(cam.layers));for(let o=hit?.object;o;o=o.parent)if(o===owner){clear=true;break;}if(sign&&hit&&hit.point.distanceTo(point)<.35)clear=true;}
 return {source:'registered-school-adapter',id:r.id,key:r.scenario.scene3d,name,optional:r.scenario.optional===true,stops:m.stops.length,signs:OTR.fpSigns.enabled(m),traffic:!!m.trafficControl,navigation:!!m.navigation,day:m.routePlan.day,logItems:r.log.items.length,finished:m.schoolLesson.finished,
  bus:m.driving.bus.state,crossing:m.crossing.state,sourceChildren:!!a.actors?.children,reduced:OTR.fpAccess.reduced(),device:sc.handheld.isOpen,deviceVisits:m.schoolLesson.resourceDeviceVisits||0,
  marking:{instances:a.lessonBayArt.mesh.count,visible:a.lessonBayArt.mesh.visible,stop:a.lessonBayArt.stop===m.stops[0],texture:!!a.lessonBayArt.mesh.material.map},reverse:!!sc.view.mirror.rearOn,parking:OTR.fpDrivingLesson.parking(m.schoolLesson.parkingModel,m.stops[0]).ok,
  cue:{visible:device?sc.handheld.isOpen:sign||!!owner&&visible(owner),clear,x:ndc.x,y:ndc.y,z:ndc.z,hit:hit?.object.name||hit?.object.type||null},
  bounded:m.van.z>=b.z0+2.7&&m.van.z<=b.z1-2.7&&m.van.x>=b.x0+1.08&&m.van.x<=b.x1-1.08&&m.blocked(b.x0-1,b.z0)&&m.blocked(b.x1+1,b.z1),
  checkpointUnchanged:before.checkpoint===JSON.stringify(OTR.fpStore.read()),eventsUnchanged:before.events===JSON.stringify(OTR.workday.events),workdayUnchanged:before.workday===JSON.stringify(OTR.save.data.workday||null)};
};
