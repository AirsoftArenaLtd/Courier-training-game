/* One four-instance road marking, shared by the driving, school and junction bays. */
window.OTR=window.OTR||{};
OTR.fpLessonBays={
  build(parent,cube,m){
    const T=THREE,paint=new T.MeshBasicMaterial({color:0xEFEEE5}),mesh=new T.InstancedMesh(cube,paint,4),pose=new T.Object3D();
    mesh.name='module-finish-bay';mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(mesh);
    const api={mesh,stop:null,updates:0,
      sync(model){
        const stop=model.stops[model.drivingLesson?.checkpoint||0];mesh.visible=!!stop?.bay;if(!mesh.visible||stop===this.stop)return;
        this.stop=stop;this.updates++;const b=stop.bay,horizontal=b.axis==='x',z=(b.z0+b.z1)/2,length=horizontal?b.x1-b.x0:b.z1-b.z0,x=horizontal?(b.x0+b.x1)/2:stop.park.x;
        for(let i=0;i<4;i++){
          if(horizontal){pose.position.set(i<2?x:i===2?b.x0:b.x1,.065,i<2?z+(i?1:-1)*1.3:z);pose.scale.set(i<2?length:.07,.02,i<2?.07:2.6);}
          else{pose.position.set(i<2?x+(i?1:-1)*1.3:x,.065,i<2?z:i===2?b.z0:b.z1);pose.scale.set(i<2?.07:2.6,.02,i<2?length:.07);}
          pose.rotation.set(0,0,0);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
        }
        mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
      },
      dispose(){paint.dispose();}
    };api.sync(m);return api;
  }
};
