/* Bounded collision presentation. Local licensed vehicles/people with procedural missing-file fallbacks. */
window.OTR=window.OTR||{};
OTR.fpIncidentWorld={
  build(parent,m,{cube=null,interactions=[],occluders=[],bank=null}={}){
    const T=THREE,high=OTR.gfx.high(),ownCube=!cube;if(!cube)cube=new T.BoxGeometry();const root=new T.Group();root.name='wellness-incident';parent.add(root);
    const paint=new T.MeshLambertMaterial(),personPaint=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}),proxyPaint=new T.MeshBasicMaterial(),fixed=new T.InstancedMesh(cube,paint,64),moving=new T.InstancedMesh(cube,paint,32);root.add(fixed,moving);
    fixed.frustumCulled=moving.frustumCulled=false;fixed.castShadow=moving.castShadow=high;fixed.receiveShadow=moving.receiveShadow=high;
    const scratch=new T.Object3D(),colour=new T.Color(),meshes=[fixed,moving],pools=[64,32].map(n=>Array.from({length:n},()=>({matrix:new T.Matrix4(),color:new T.Color(),sphere:new T.Sphere()}))),batches=meshes.map(mesh=>({mesh,entries:[]})),imports=[],people=[],sides=[-1,1];let stat=0,dynamic=0,disposed=false;
    fixed.setColorAt(0,colour);moving.setColorAt(0,colour);
    const box=(slot,i,x,y,z,w,h,d,c,angle=0)=>{const e=pools[slot][i];if(!e)throw Error('Incident geometry capacity exceeded');scratch.position.set(x,y,z);scratch.rotation.set(0,angle,0);scratch.scale.set(w,h,d);scratch.updateMatrix();const mesh=meshes[slot];mesh.setMatrixAt(i,scratch.matrix);colour.setHex(c);mesh.setColorAt(i,colour);e.matrix.copy(scratch.matrix);e.color.copy(colour);e.sphere.center.copy(scratch.position);e.sphere.radius=Math.hypot(w,h,d)/2;batches[slot].entries[i]=e;};
    const solid=(x,y,z,w,h,d,c,a=0)=>box(0,stat++,x,y,z,w,h,d,c,a),part=(x,y,z,w,h,d,c,a=0)=>box(1,dynamic++,x,y,z,w,h,d,c,a);
    const proxy=(x,y,z,w,h,d,id=null)=>{const o=new T.Mesh(cube,proxyPaint);o.layers.set(1);o.position.set(x,y,z);o.scale.set(w,h,d);o.userData.interaction=id;root.add(o);occluders.push(o);if(id)interactions.push(o);return o;};
    const imported=(use,placement)=>{const g=bank?.add(root,use,[placement]);if(!g)return null;imports.push(g);for(const b of g.userData.batches){b.mesh.frustumCulled=false;b.mesh.castShadow=b.mesh.receiveShadow=high;b.mesh.geometry.computeBoundingSphere();for(const e of b.entries)e.sphere=b.mesh.geometry.boundingSphere.clone().applyMatrix4(e.matrix);batches.push(b);}return g;};
    const stage=m.incidentStage,car=stage.car;
    const house=imported('town-house',{x:12,y:0,z:-47,w:7,h:5.8,d:4});if(!house){solid(12,2.8,-47,7,5.6,4,0xC9C4BA);solid(12,5.7,-47,7.3,.2,4.3,0x5B666E);solid(12,1,-44.95,.95,2,.06,0x4B6574);}proxy(12,2.8,-47,7,5.6,4);
    const sedan=imported('town-parked-car',{x:car.x,y:0,z:car.z,w:1.9,h:1.45,d:4.6,yaw:Math.PI/2});
    if(!sedan){solid(car.x,.55,car.z,4.6,.55,1.9,0x725552);solid(car.x-.3,1.02,car.z,2.35,.45,1.65,0x90A6AD);for(const x of [-1.4,1.4])for(const z of [-.9,.9])solid(car.x+x,.28,car.z+z,.62,.56,.17,0x303538);}
    proxy(car.x,.7,car.z,4.6,1.4,1.9);
    // Creased fender and scuffed bumper are actual supported surfaces, not floating labels.
    solid(1.1,.69,-37.77,.65,.28,.13,0x443F3A,-.14);solid(1.18,.81,-37.77,.48,.08,.16,0xA9A29B,.16);solid(1.6,.66,-38.23,.85,.12,.035,0x5E5954);
    solid(10.8,-.02,-42.6,2.8,.04,5,0xC8C3B7);
    // A fixed device on the existing dashboard, available through the cab interaction route.
    const phone=stage.points.cab;solid(phone.x,phone.y-.04,phone.z,.3,.28,.045,0x243845);solid(phone.x,phone.y-.02,phone.z+.027,.24,.19,.008,0x8EB9BB);
    for(const a of stage.actors){if(a.remote)continue;const p=a.person.portrait||{},woman=a.key==='neighbor',actor=high?OTR.fpActors?.character(bank?.models.get('resident-'+(woman?'women':'men')),personPaint,p.shirt||0x668A91,p.skin):null;if(actor){actor.mesh.name='incident:'+a.key;actor.mesh.castShadow=actor.mesh.receiveShadow=high;actor.mesh.frustumCulled=false;root.add(actor.mesh);}people.push({state:a,actor});}
    const target=proxy(0,0,0,.45,.5,.2,'customer-conversation');fixed.count=stat;fixed.instanceMatrix.needsUpdate=fixed.instanceColor.needsUpdate=true;moving.count=0;
    return {root,fixed,moving,batches,imports,people,target,sedan,house,
      sync(model,reduced=false){
        if(disposed)throw Error('Incident world was disposed');dynamic=0;const s=model.incidentStage,p=model.player,t=s.target;
        for(const entry of people){const a=entry.state,visible=a.visible;if(entry.actor){const actor=entry.actor;actor.mesh.visible=visible;if(visible){actor.mesh.position.set(a.x,0,a.z);actor.mesh.rotation.y=Math.atan2(p.x-a.x,p.z-a.z);actor.pose(s.speaker===a.key?'Interact':'Idle_Neutral',s.time,reduced,high);}}else if(visible){const c=a.person.portrait||{};part(a.x,1.08,a.z,.42,.6,.28,c.shirt||0x668A91);part(a.x,1.56,a.z,.27,.3,.26,c.skin||0xC9A681);for(const side of sides){part(a.x+side*.12,.4,a.z,.14,.8,.18,0x3B4D5A);part(a.x+side*.28,1.03,a.z,.13,.55,.16,c.shirt||0x668A91);}}}
        target.position.set(t.x,t.y,t.z);target.scale.set(t.kind==='damage'?.65:.45,t.kind==='person'?1.25:.25,.2);target.visible=s.site!=='cab'||model.mode==='cab';
        moving.count=dynamic;batches[1].entries.length=dynamic;moving.instanceMatrix.needsUpdate=moving.instanceColor.needsUpdate=true;root.updateMatrixWorld(true);
      },
      dispose(){if(disposed)return;disposed=true;for(const p of people)if(p.actor){p.actor.dispose();p.actor.geometry.dispose();}for(const g of imports)g.traverse(o=>{if(o.isInstancedMesh)o.dispose();});fixed.dispose();moving.dispose();paint.dispose();personPaint.dispose();proxyPaint.dispose();if(ownCube)cube.dispose();root.removeFromParent();}
    };
  }
};
