/* Read-only projection of the actual physical label after static sampling. */
module.exports=()=>{
 const scene=OTR.game.scene.getScene('FirstPersonScenarioScene'),m=scene.model,camera=scene.view.camera,target=scene.art.pick(),p=scene.art.loading.parcels.find(p=>p.body.userData.interaction===target);
 if(!p)return {target,printed:false,legalFooting:!m.blocked(m.player.x,m.player.z)};
 camera.updateMatrixWorld(true);p.words.mesh.updateMatrixWorld(true);
 const xs=[],ys=[];let clipped=0;
 for(const e of p.words.entries){
  const matrix=new THREE.Matrix4().multiplyMatrices(p.words.mesh.matrixWorld,e.matrix);
  for(const x of [-.5,.5])for(const y of [-.5,.5]){
   const point=new THREE.Vector3(x,y,0).applyMatrix4(matrix).project(camera);
   if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.z< -1||point.z>1)clipped++;
   xs.push((point.x+1)*640);ys.push((1-point.y)*360);
  }
 }
 return {target,printed:p.printVisible,font:p.words.font,legalFooting:!m.blocked(m.player.x,m.player.z),quads:p.words.entries.length,clipped,width:1280,height:720,bounds:{left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)}};
};
