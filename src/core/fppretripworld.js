/* Bounded inspection proxies on the van, with one small shared batch for cab safety equipment. */
window.OTR=window.OTR||{};
OTR.fpPretripWorld={
  build(scene,m,{van,chassis,cab,actors,cube,box}){
    const T=THREE,A=OTR.fpPretrip,s=m.pretripLesson,targets=[],body=actors?.vehicle?.parts.find(p=>p.name==='body');
    const surface=body?new T.Mesh(body.g):null,ray=new T.Raycaster(),origin=new T.Vector3(),direction=new T.Vector3();
    if(surface)surface.updateMatrixWorld(true);
    for(const it of s.content.items){
      const source=A.locations[it.id];if(!source)throw Error('No physical pre-trip location: '+it.id);
      const at=source.slice(),view=at[3],inside=view==='cab';
      if(surface&&!inside&&!it.id.startsWith('tire')&&it.kind!=='mirror'&&it.kind!=='leak'){
        if(view==='front'||view==='rear'){origin.set(at[0],at[1],view==='front'?-4:4);direction.set(0,0,view==='front'?1:-1);}
        else{origin.set(view==='driver'?-3:3,at[1],at[2]);direction.set(view==='driver'?1:-1,0,0);}
        ray.set(origin,direction);ray.far=4;const hit=ray.intersectObject(surface,false)[0];
        if(hit){if(view==='front'||view==='rear')at[2]=hit.point.z+(view==='front'?-.015:.015);else at[0]=hit.point.x+(view==='driver'?-.015:.015);}
      }
      const proxy=box(inside?cab.root:chassis,at[0],at[1],at[2],.18,.18,.18,0x6B7B86,'pretrip-'+it.id);
      proxy.layers.set(1);proxy.name='pretrip:'+it.id;targets.push(proxy);s.locations[it.id]=at;
    }
    const paint=new T.MeshLambertMaterial({color:0xFFFFFF}),parts=[
      [-.12,-.85,-.95,.15,.055,.2,0x35434C],
      [1.2,-.75,-.2,.14,.3,.14,0xB83B32],[1.2,-.56,-.2,.16,.045,.09,0x35434C],
      [1.2,-.68,-.28,.07,.07,.02,0xD3DAD5],[.85,-.75,.05,.36,.08,.2,0xBF6D43]
    ],mesh=new T.InstancedMesh(cube,paint,parts.length),scratch=new T.Object3D();
    mesh.name='pretrip:cab-safety-equipment';cab.root.add(mesh);
    for(let i=0;i<parts.length;i++){const p=parts[i];scratch.position.set(p[0],p[1],p[2]);scratch.scale.set(p[3],p[4],p[5]);scratch.updateMatrix();mesh.setMatrixAt(i,scratch.matrix);mesh.setColorAt(i,new T.Color(p[6]));}mesh.computeBoundingSphere();
    return {targets,mesh,sync(model){for(let i=0;i<targets.length;i++)targets[i].visible=A.canInspect(model,s.content.items[i].id);},dispose(){paint.dispose();}};
  }
};
