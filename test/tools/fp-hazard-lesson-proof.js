/* Browser-side geometry proof: a cue must lie in the windshield and have an unobstructed sightline.
 * This is geometry evidence, not a pixel-recognition or Intel frame-rate claim. */
module.exports=function hazardLessonProof(stage){
 const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=s.scenarioSession,m=s.model,h=m.hazardLesson,a=s.art.hazardLessonArt,b=m.bounds,before=window.hazardLessonBenchmarkBefore;
 const T=THREE,camera=s.view.camera,point=new T.Vector3(),matrix=new T.Matrix4();let target,owner;
 if(h.clip.kind==='ball'&&stage!=='before'){target=a.ball;target.getWorldPosition(point);owner=target;}
 else if(h.clip.kind==='phone'&&stage!=='before'){target=a.phone;target.getWorldPosition(point);owner=target;}
 else if(['reversing','door'].includes(h.clip.kind)&&stage==='clue'){
  target=a.lamps;target.getMatrixAt(0,matrix);point.setFromMatrixPosition(matrix).applyMatrix4(target.matrixWorld);owner=target;
 }else if(h.clip.kind==='door'&&stage==='after'){target=a.door.children[0];target.getWorldPosition(point);owner=target;}
 else {owner=h.clip.kind==='phone'?a.person:a.car;point.set(0,.85,0).applyMatrix4(owner.matrixWorld);target=owner;}
 const ndc=point.clone().project(camera),visible=o=>{for(;o;o=o.parent)if(!o.visible)return false;return true;};
 const ray=new T.Raycaster(camera.position,point.clone().sub(camera.position).normalize(),0,camera.position.distanceTo(point)+.5);
 const hit=ray.intersectObjects(s.view.world.children,true).find(hit=>visible(hit.object)&&hit.object.layers.test(camera.layers));
 let clear=false;for(let o=hit?.object;o;o=o.parent)if(o===owner){clear=true;break;}
 return {source:'registered-hazard-adapter',id:r.id,key:r.scenario.scene3d,clips:h.content.clips.length,kind:h.clip.kind,stage,
  time:h.time,at:h.clip.at,logItems:r.log.items.length,flags:h.presses,reduced:h.reduced,loadedCar:!!a.asset,loadedPerson:!!a.actor,
  cue:{visible:visible(target),x:ndc.x,y:ndc.y,z:ndc.z,clear,hit:hit?.object.name||hit?.object.type||null,blocker:!clear&&hit?{point:hit.point.toArray(),instance:hit.instanceId,parents:(()=>{const a=[];for(let o=hit.object;o;o=o.parent)a.push(o.name||o.type);return a;})()}:null},
  bounded:m.blocked(b.x0-1,b.z0)&&m.blocked(b.x1+1,b.z1),checkpointUnchanged:before.checkpoint===JSON.stringify(OTR.fpStore.read()),eventsUnchanged:before.events===JSON.stringify(OTR.workday.events),workdayUnchanged:before.workday===JSON.stringify(OTR.save.data.workday||null)};
};
