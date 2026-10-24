/* Project-made lifting bay, hands, trolley and gauges; reuses an uploaded coworker rig when available. */
window.OTR=window.OTR||{};
OTR.fpPackageLiftWorld={
  solids(){return [{x:-13.4,z:12.65,w:2.4,d:.6},{x:-9.4,z:12.65,w:2.5,d:.8},{x:-10,z:15.35,w:.8,d:.45}];},
  build(parent,{cube=null,interactions=[],occluders=[],models=null,uniform=0x34738C}={}){
    const T=THREE,ownsCube=!cube;if(!cube)cube=new T.BoxGeometry();
    const root=new T.Group(),paint=new T.MeshLambertMaterial(),proxyPaint=new T.MeshBasicMaterial(),actorPaint=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}),scratch=new T.Object3D(),colour=new T.Color();parent.add(root);root.name='package-lifting-bay';
    const fixed=new T.InstancedMesh(cube,paint,64),moving=new T.InstancedMesh(cube,paint,96);root.add(fixed,moving);fixed.frustumCulled=moving.frustumCulled=false;fixed.setColorAt(0,colour);moving.setColorAt(0,colour);
    const pools=[Array.from({length:64},()=>({matrix:new T.Matrix4(),color:new T.Color(),sphere:new T.Sphere()})),Array.from({length:96},()=>({matrix:new T.Matrix4(),color:new T.Color(),sphere:new T.Sphere()}))],batches=[{mesh:fixed,entries:[]},{mesh:moving,entries:[]}];let count=0,dynamic=0,disposed=false;
    const box=(mesh,index,x,y,z,w,h,d,hex,rz=0)=>{scratch.position.set(x,y,z);scratch.rotation.set(0,0,rz);scratch.scale.set(w,h,d);scratch.updateMatrix();mesh.setMatrixAt(index,scratch.matrix);colour.setHex(hex);mesh.setColorAt(index,colour);const n=mesh===fixed?0:1,e=pools[n][index];if(!e)throw Error('Lifting bay capacity exceeded');e.matrix.copy(scratch.matrix);e.color.copy(colour);e.sphere.center.copy(scratch.position);e.sphere.radius=Math.hypot(w,h,d)/2;batches[n].entries[index]=e;};
    const stat=(x,y,z,w,h,d,c,rz=0)=>box(fixed,count++,x,y,z,w,h,d,c,rz),part=(x,y,z,w,h,d,c,rz=0)=>box(moving,dynamic++,x,y,z,w,h,d,c,rz);
    const sides=[-1,1],shelfXs=[-10.5,-8.3],platformXs=[-10.28,-9.72];
    const proxy=(id,x,y,z,w,h,d)=>{const p=new T.Mesh(cube,proxyPaint);p.layers.set(1);p.position.set(x,y,z);p.scale.set(w,h,d);p.userData.interaction=id;root.add(p);occluders.push(p);if(id)interactions.push(p);return p;};
    for(let i=0;i<6;i++)stat(-14.4+i*.4,.15,12.65,.32,.06,.6,0xAE8C57);for(const x of [-14.4,-13.4,-12.4])stat(x,.07,12.65,.14,.14,.6,0x806A49);
    stat(-10,.6,15.35,.12,1.2,.12,0x596C73);stat(-10,1.25,15.35,.8,.5,.16,0xD5D9D2);stat(-10,1.27,15.445,.65,.05,.025,0x314C54);stat(-10,1.34,15.46,.025,.15,.025,0xD5A942);
    const assist=proxy('lift-help',-10.24,1.08,15.46,.2,.14,.05),gauge=proxy('lift-gauge',-9.98,1.32,15.46,.55,.3,.05);
    stat(-10.24,1.08,15.48,.2,.14,.025,0x34738C);for(const x of [-10.3,-10.24,-10.18])stat(x,1.08,15.5,.025,.08,.02,0xD8E2DA);
    const parcel=proxy('lift-parcel',0,0,0,1,1,1),handle=proxy('lift-truck',0,0,0,.24,.45,.5);const blocks=[];
    for(const s of this.solids())blocks.push(proxy(null,s.x,.08,s.z,s.w,.16,s.d));
    fixed.count=count;moving.count=0;fixed.instanceMatrix.needsUpdate=true;fixed.instanceColor.needsUpdate=true;
    const worker=OTR.fpActors?.character(models?.get('worker-men'),actorPaint,uniform,0xB98C6A)||null;if(worker){root.add(worker.mesh);worker.mesh.frustumCulled=true;worker.geometry.boundingSphere=new T.Sphere(new T.Vector3(0,.9,0),1.5);}
    return {root,fixed,moving,batches,parcel,handle,assist,gauge,blocks,worker,
      sync(s,time=0,reduced=false,high=false){
        if(disposed)throw Error('Lifting bay was disposed');dynamic=0;if(!s.lift){parcel.visible=handle.visible=false;moving.count=0;return;}
        OTR.fpPackageLiftBay.project(s);const b=s.bay,p=b.parcel,L=s.lift,P=s.pose;
        part(p.x,p.y,p.z,p.w,p.h,p.d,L.color);part(p.x,p.y,p.z+p.d/2+.008,Math.min(.38,p.w*.7),p.h*.5,.012,0xF2EFE4);for(let i=0;i<5;i++)part(p.x-.13+i*.055,p.y,p.z+p.d/2+.018,.025,p.h*.3,.008,0x26393E);
        part(p.x,p.y+p.h/2+.006,p.z,.08,.012,p.d,0xC6AF7B);
        parcel.position.set(p.x,p.y,p.z);parcel.scale.set(p.w,p.h,p.d);parcel.visible=true;
        if(L.high){for(const x of shelfXs)part(x,1,12.65,.07,2,.6,0x64747A);part(-9.4,1.96,12.65,2.5,.08,.8,0x859495);}
        if(L.high&&P.elevate>0){part(-10,.58,13.45,.7,.04,.5,0xBE8B3D);for(const x of platformXs)part(x,.28,13.45,.07,.56,.4,0x637478);part(-10,.28,13.75,.65,.05,.25,0xBE8B3D);}
        const tx=b.truck.x,tz=b.truck.z;part(tx,.07,tz,1.1,.1,.55,0x667C83);for(const side of sides)part(tx+.55,.2,tz+side*.3,.28,.28,.11,0x26383F);for(const side of sides)part(tx+.62,.72,tz+side*.25,.06,1.05,.06,0x899C9D);part(tx+.62,1.25,tz,.08,.08,.58,0x354C55);
        handle.position.set(tx+.62,1.17,tz);handle.visible=b.mode==='equipment'||b.mode==='unload';
        const needle=b.mode==='posture'&&s.measure.reachable?OTR.util.clamp01(s.measure.load):0;part(-10.3+needle*.6,1.27,15.49,.025,.16,.02,0x334A52);
        const ready=b.helperReady,wx=ready?p.x+P.dir*(p.w/2+.35):-7.3,wz=ready?p.z-.65:10.4;
        if(worker){worker.mesh.visible=true;worker.mesh.position.set(wx,0,wz);worker.mesh.rotation.y=ready?-P.dir*Math.PI/2:0;worker.pose(ready?'Interact':'Idle_Neutral',time,reduced,high);}
        else{part(wx,1.05,wz,.4,.58,.28,uniform);part(wx,1.56,wz,.26,.3,.26,0xB98C6A);for(const side of sides){part(wx+side*.12,.4,wz,.14,.8,.18,0x354754);part(wx+side*.27,1,wz,.12,.55,.14,uniform);}}
        if(P.hold){for(const side of sides){part(p.x+side*Math.min(.3,p.w*.36),p.y,p.z+.28,.12,.11,.14,0xB98C6A);part(p.x+side*Math.min(.3,p.w*.36),p.y+.03,p.z+.42,.14,.14,.22,uniform);}}
        moving.count=dynamic;batches[1].entries.length=dynamic;moving.instanceMatrix.needsUpdate=true;moving.instanceColor.needsUpdate=true;root.updateMatrixWorld(true);
      },
      dispose(){if(disposed)return;disposed=true;if(worker){worker.dispose();worker.geometry.dispose();}fixed.dispose();moving.dispose();paint.dispose();proxyPaint.dispose();actorPaint.dispose();if(ownsCube)cube.dispose();root.removeFromParent();}
    };
  }
};
