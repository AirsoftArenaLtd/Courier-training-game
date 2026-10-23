/* Geometry plus actual controller and UI state; no pixel-recognition or laptop-FPS claim. */
module.exports=function drivingLessonProof({kind,stage,index=0}){
 const sc=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=sc.scenarioSession,m=sc.model,s=m.drivingLesson,a=sc.art.drivingLessonArt,h=s.hazard,b=m.bounds,before=window.drivingLessonBenchmarkBefore,T=THREE,camera=sc.view.camera,point=new T.Vector3();
 const visible=o=>{for(;o;o=o.parent)if(!o.visible)return false;return true;};let target,owner,device=false;
 if(kind==='parking'||kind==='phone'&&stage==='clue'){target=owner=sc.art.rear.screen;target.getWorldPosition(point);}
 else if(kind==='phone'){device=true;point.set(0,0,0);}
 else if(kind==='ball'&&stage==='clue'){target=owner=a.pool.ball;target.getWorldPosition(point);}
 else if(kind==='ball'||kind==='crosswalk'){owner=target=a.pool.person;point.set(0,1,0).applyMatrix4(owner.matrixWorld);}
 else if(kind==='door'){owner=target=a.pool.door.children[0];target.getWorldPosition(point);}
 else if(kind==='water'){owner=target=a.water;target.getWorldPosition(point);}
 else if(kind==='bus'){owner=a.arm;target=a.arm.children[0];target.getWorldPosition(point);}
 const ndc=device?new T.Vector3():point.clone().project(camera);let hit,clear=device&&sc.handheld.isOpen;
 if(!device){const ray=new T.Raycaster(camera.position,point.clone().sub(camera.position).normalize(),0,camera.position.distanceTo(point)+.5);hit=ray.intersectObjects(sc.view.world.children,true).find(h=>visible(h.object)&&h.object.layers.test(camera.layers));for(let o=hit?.object;o;o=o.parent)if(o===owner){clear=true;break;}}
 const stop=m.stops[s.checkpoint];
 return {source:'registered-driving-adapter',id:r.id,key:r.scenario.scene3d,kind,stage,index:kind==='parking'?index:s.content.hazards.findIndex(v=>v.kind===kind),stops:m.stops.length,navigation:!!m.navigation,traffic:!!m.trafficControl,signs:OTR.fpSigns.enabled(m),day:m.routePlan.day,
  hazardActive:h.active,hazardKind:h.kind,hazardTime:h.t,hazardJudged:h.judged,logItems:r.log.items.length,results:s.results.length,
  loadedCar:!!a.pool.asset,loadedPerson:!!a.pool.actor,reduced:!!OTR.fpAccess.reduced(),weather:m.routePlan.weather,device:!!sc.handheld.isOpen,
  cue:{visible:device?sc.handheld.isOpen:visible(target),clear,x:ndc.x,y:ndc.y,z:ndc.z,hit:hit?.object.name||hit?.object.type||null,blocker:!clear&&hit?{point:hit.point.toArray(),instance:hit.instanceId,parents:(()=>{const names=[];for(let o=hit.object;o;o=o.parent)names.push(o.name||o.type);return names;})()}:null},
  parking:kind==='parking'?{ok:OTR.fpDrivingLesson.parking(m,stop).ok,reverse:!!sc.view.mirror.rearOn,steer:m.van.steer}:null,
  bounded:m.van.z>=b.z0+2.7&&m.van.z<=b.z1-2.7&&m.van.x>=b.x0+1.08&&m.van.x<=b.x1-1.08&&m.blocked(b.x0-1,b.z0)&&m.blocked(b.x1+1,b.z1),
  checkpointUnchanged:before.checkpoint===JSON.stringify(OTR.fpStore.read()),eventsUnchanged:before.events===JSON.stringify(OTR.workday.events),workdayUnchanged:before.workday===JSON.stringify(OTR.save.data.workday||null)};
};
