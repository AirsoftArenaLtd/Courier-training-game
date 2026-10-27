/* Explicit static resource poses; no native movement/result acceptance. */
module.exports=name=>{
 const s=OTR.game.scene.getScene('FirstPersonScenarioScene'),r=s.scenarioSession,m=s.model;
 s.closePanel(false);OTR.fpScenario.begin(r);window.otrReverseBefore={checkpoint:JSON.stringify(OTR.fpStore.read()),events:JSON.stringify(OTR.workday.events),workday:JSON.stringify(OTR.save.data.workday||null)};m.paused=true;m.mode='cab';m.van.gear=name==='reversecab'?2:-1;m.reverseLesson.car.x=0;m.reverseLesson.car.z=-58;m.van.look=0;m.player.pitch=0;
 if(name==='reverseyard'){m.mode='walk';Object.assign(m.player,{x:-5,z:-63,yaw:Math.atan2(5,-5),pitch:.12});}
 if(name==='reversebay'){m.mode='walk';Object.assign(m.player,{x:-4.5,z:-60,yaw:Math.atan2(4.5,-7),pitch:.12});}
 s.sync();
 if(['reversemirrorleft','reversemirrorright','reversecamera'].includes(name)){
  const id=name==='reversecamera'?'cab-camera':name==='reversemirrorleft'?'mirror-left':'mirror-right',object=s.art.interactions.find(o=>o.userData.interaction===id);if(!object)throw Error('Missing reverse render target '+id);
  const p=object.getWorldPosition(new THREE.Vector3()),eye=s.view.camera.position;m.van.look=OTR.fp.clamp(Math.atan2(p.x-eye.x,-(p.z-eye.z))-m.van.yaw,-1.5,1.5);m.player.pitch=OTR.fp.clamp(Math.atan2(eye.y-p.y,Math.hypot(p.x-eye.x,p.z-eye.z)),-1.05,1.05);s.sync();if(s.art.pick()!==id)throw Error('Blocked reverse render target '+id+' '+s.art.pick());
 }
 if(name==='reversecontrols')OTR.fpReverseScenario.controls(r,s,3);
 if(name==='reversehandheld')OTR.fpReverseScenario.handheld(r,s);
 m.paused=true;s.sync();
 const target=new THREE.Vector3(m.parkingBay.x,.1,m.parkingBay.z),eye=s.view.camera.position,delta=target.clone().sub(eye),ray=new THREE.Raycaster(eye,delta.clone().normalize(),0,delta.length()-.1);ray.layers.enable(1);s.view.world.updateMatrixWorld(true);
 s.reverseBayRay={clear:ray.intersectObjects(s.art.occluders.filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}),false).length===0,eye:{x:eye.x,y:eye.y,z:eye.z},target:{x:target.x,y:target.y,z:target.z}};
 if(name==='reversebay'&&!s.reverseBayRay.clear)throw Error('The actual bay ray is blocked');
};
