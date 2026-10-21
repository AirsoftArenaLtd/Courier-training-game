/* One texture-free palette batch for located wear and the two clearance structures. */
window.OTR=window.OTR||{};
OTR.fpDamageWorld={
  build(scene,m,route,chassis,labels,actors=null){
    if(!m.damage)return null;
    const T=THREE,positions=[-.5,-.5,0,.42,-.35,0,.5,.12,0,-.5,-.5,0,.5,.12,0,.15,.5,0,-.5,-.5,0,.15,.5,0,-.42,.27,0],
      quads=[-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0,0,0,0,0,0,0,0,0,0],
      geometry=new T.BufferGeometry(),paint=new T.MeshLambertMaterial({side:T.DoubleSide});
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(Array.from({length:9},()=>[0,0,1]).flat(),3));
    geometry.setAttribute('damageQuad',new T.Float32BufferAttribute(quads,3));geometry.computeBoundingSphere();
    paint.onBeforeCompile=shader=>{
      shader.vertexShader='attribute vec3 damageQuad; attribute float damageShape;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
        'vec3 transformed = damageShape < 0.5 ? damageQuad : position;\n'+
        'if (damageShape > 1.5 && position.x > 0.35) transformed.z -= (damageShape - 1.0) * 0.06;');
    };
    paint.customProgramCacheKey=()=> 'otr-damage-palette-1';
    const entries=[],patches=[],matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),rotation=new T.Quaternion(),euler=new T.Euler(),
      vehicle=actors&&actors.vehicle,wheel=vehicle&&vehicle.parts.find(p=>p.name==='wheel-back-left'),door=vehicle&&vehicle.parts.find(p=>p.name==='door'),
      hinge=new T.Matrix4().makeTranslation(0,3.02,2.4),unhinge=new T.Matrix4().makeTranslation(0,-3.02,-2.4),doorRotation=new T.Matrix4();
    // The source van narrows near its roof. Anchor reachable wear to the actual upper wall.
    const body=vehicle&&vehicle.parts.find(p=>p.name==='body');
    let roofSurface=null;
    if(m.walkaround&&body){
      const surface=new T.Mesh(body.g,vehicle.mesh.material);surface.updateMatrixWorld(true);
      const hit=new T.Raycaster(new T.Vector3(-3,2.94,.6),new T.Vector3(1,0,0)).intersectObject(surface,false)[0];
      if(hit)roofSurface={x:hit.point.x-.008,y:hit.point.y,z:hit.point.z};
    }
    const add=(x,y,z,w,h,rx,ry,colour,damageVan=false)=>{
      position.set(x,y,z);scale.set(w,h,1);rotation.setFromEuler(euler.set(rx,ry,0));matrix.compose(position,rotation,scale);
      const entry={matrix:matrix.clone(),local:matrix.clone(),color:new T.Color(colour),sphere:new T.Sphere(new T.Vector3(),.8).applyMatrix4(matrix),visible:true,shape:0,damageVan};entries.push(entry);return entry;
    };
    patches.push(add(0,1,-2.81,.55,.24,0,Math.PI,0x4A4A46,true));
    patches.push(add(0,1.75,door?door.g.boundingBox.max.z+.008:2.668,.55,.28,0,0,0x4A4A46,true));
    patches.push(add(-1.14,1.78,.6,.65,.28,0,-Math.PI/2,0x4A4A46,true));
    patches.push(add(1.14,1.78,.6,.65,.28,0,Math.PI/2,0x4A4A46,true));
    // Walkaround days expose the roof condition on its upper edge, visible from the ground.
    // Reuse the same patch instance; older damage days keep their original top surface.
    patches.push(m.walkaround?add(roofSurface?roofSurface.x:-1.115,roofSurface?roofSurface.y:2.98,.6,.65,.18,0,-Math.PI/2,0x4A4A46,true):add(0,3.24,.6,.65,.4,-Math.PI/2,0,0x4A4A46,true));
    patches.push(add(wheel?wheel.g.boundingBox.min.x-.008:-1.208,wheel?wheel.center.y:.42,wheel?wheel.center.z:1.7,.3,.2,0,-Math.PI/2,0x4A4A46,true));
    patches.push(add(-1.27,1.79,-2.32,.2,.13,0,-Math.PI/2,0x4A4A46,true));
    for(const b of m._damageClearances){
      for(const p of b.posts)add(p.x,p.h/2,p.z,p.w,p.h,0,0,0x6D7375);
      add(b.x,b.h+.3,b.z,b.w+.7,.6,0,0,b.kind==='bridge'?0xB4AB99:0xDBAE55);
      add(b.x,b.h,b.z,b.w+.7,.65,-Math.PI/2,0,0x6D7375);
      for(const side of [-1,1])labels.push({parent:route,local:new T.Vector3(b.x,b.h+1.1,b.z+side*6),point:new T.Vector3(),normal:new T.Vector3(0,0,side),text:'The clearance is 8 feet 10 inches. Take another street.',wrap:300,max:40,clearance:b.id});
    }
    const shapes=new T.InstancedBufferAttribute(new Float32Array(entries.length),1);geometry.setAttribute('damageShape',shapes);
    const mesh=new T.InstancedMesh(geometry,paint,entries.length);mesh.name='damage-and-clearances';mesh.frustumCulled=false;route.add(mesh);
    entries.forEach((e,i)=>{mesh.setMatrixAt(i,e.matrix);mesh.setColorAt(i,e.color);});
    return {mesh,entries,roofSurface,signShapes:shapes,
      sync(model){
        chassis.updateWorldMatrix(true,false);
        for(let i=0;i<patches.length;i++){
          const e=patches[i],level=model.damage.enabled?Math.max(model.damage.baseline[i],model.damage.added[i]):0;
          e.visible=level>0&&(i!==1||!!vehicle||!model.cargoOpen);e.shape=level;
          // Imported wheels are unsprung; the imported rear door follows its real hinge.
          // The fallback removes its door while open, so it must remove the wear with it.
          e.matrix.copy(i===5?chassis.parent.matrixWorld:chassis.matrixWorld);
          if(i===1&&door)e.matrix.multiply(hinge).multiply(doorRotation.makeRotationX(actors.opening()*Math.PI/2)).multiply(unhinge);
          e.matrix.multiply(e.local);
          e.sphere.center.set(0,0,0);e.sphere.radius=.8;e.sphere.applyMatrix4(e.matrix);
          e.color.setHex(level===1?0x4A4A46:level===2?0x666568:0x3A302C);
        }
      },
      dispose(){paint.dispose();}
    };
  }
};
