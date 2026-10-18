/* Scene-private actors. Rigs drive ordinary CPU-deformed meshes: no bone texture or extra pass. */
window.OTR=window.OTR||{};
OTR.fpActors={
  character(model,paint,uniform,skin){
    if(!model||!model.animated)return null;
    const T=THREE,rig=model.gltf.scene.clone(true),original=[],cloned=[],boneMap=new Map(),skinMap=new Map();
    model.gltf.scene.traverse(o=>original.push(o));rig.traverse(o=>cloned.push(o));
    for(let i=0;i<original.length;i++)boneMap.set(original[i],cloned[i]);
    for(let i=0;i<original.length;i++)if(original[i].isSkinnedMesh){const a=original[i],b=cloned[i];if(!skinMap.has(a.skeleton))skinMap.set(a.skeleton,new T.Skeleton(a.skeleton.bones.map(o=>boneMap.get(o)),a.skeleton.boneInverses));b.skeleton=skinMap.get(a.skeleton);b.bindMatrix.copy(a.bindMatrix);b.bindMatrixInverse.copy(a.bindMatrixInverse);}
    rig.updateMatrixWorld(true);
    const parts=[],indices=[],skeletons=[];let count=0;rig.traverse(o=>{if(!o.isSkinnedMesh)return;const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,colour=g.attributes.color,j=g.attributes.skinIndex,w=g.attributes.skinWeight,base=count;
      const clothes=/Casual.*Body/i.test(o.name+' '+(o.parent?o.parent.name:''))&&!(colour&&colour.itemSize===3)&&!/^skin/i.test(o.material.name);
      const tint=clothes||/vest|shirt/i.test(o.material.name)?new T.Color(uniform):/^skin/i.test(o.material.name)&&skin!==undefined?new T.Color(skin).multiplyScalar(/darker/i.test(o.material.name)?.8:1):o.material.color;
      parts.push({o,g,base,p,n,j,w,colour,tint,clothes});if(!skeletons.includes(o.skeleton))skeletons.push(o.skeleton);count+=p.count;for(let i=0;i<(g.index?g.index.count:p.count);i++)indices.push(base+(g.index?g.index.getX(i):i));
    });
    const geometry=new T.BufferGeometry(),position=new T.BufferAttribute(new Float32Array(count*3),3),normal=new T.BufferAttribute(new Float32Array(count*3),3),colours=new T.BufferAttribute(new Float32Array(count*3),3);
    position.setUsage(T.DynamicDrawUsage);normal.setUsage(T.DynamicDrawUsage);geometry.setAttribute('position',position);geometry.setAttribute('normal',normal);geometry.setAttribute('color',colours);geometry.setIndex(indices);
    const uniformColour=new T.Color(uniform),skinColour=skin===undefined?null:new T.Color(skin);
    for(const part of parts)for(let i=0;i<part.p.count;i++){
      const c=part.colour,at=c?i*c.itemSize:0,divisor=c&&c.normalized?(c.array.BYTES_PER_ELEMENT===1?255:65535):1;
      const r=c?c.array[at]/divisor:1,g=c?c.array[at+1]/divisor:1,b=c?c.array[at+2]/divisor:1;
      const lowUniform=c&&c.itemSize===3&&Math.abs(r-.133)<.01&&Math.abs(g-.184)<.02,lowSkin=c&&c.itemSize===3&&r>.4&&g>.2;
      const tint=lowUniform?uniformColour:lowSkin&&skinColour?skinColour:part.tint,override=part.clothes||lowUniform||lowSkin&&skinColour;
      colours.setXYZ(part.base+i,override?tint.r:r*tint.r,override?tint.g:g*tint.g,override?tint.b:b*tint.b);
    }
    const mesh=new T.Mesh(geometry,paint);mesh.name='actor:character';mesh.frustumCulled=false;mesh.userData.fpActor=true;
    const mixer=new T.AnimationMixer(rig),actions=new Map(model.gltf.animations.map(c=>[c.name,mixer.clipAction(c)])),v=new T.Vector3(),n=new T.Vector3(),sum=new T.Vector3(),nsum=new T.Vector3(),bone=new T.Matrix4(),after=new T.Matrix4(),before=new T.Matrix3();let active=null,lastTime=-Infinity,lastClip='',lastReduced=null;
    const api={mesh,rig,geometry,pose(clip,time,reduced=false,high=false){
      const stamp=reduced?0:Math.floor(time*(high?20:10))/(high?20:10);if(lastTime===stamp&&lastClip===clip&&lastReduced===reduced)return false;
      lastTime=stamp;lastClip=clip;lastReduced=reduced;const action=actions.get(reduced?'Idle_Neutral':clip)||actions.get('Idle_Neutral');if(active!==action){if(active)active.stop();active=action;active.play();}
      mixer.setTime(stamp);rig.updateMatrixWorld(true);
      for(const skeleton of skeletons)skeleton.update();for(const part of parts){const o=part.o,skeleton=o.skeleton;after.multiplyMatrices(o.matrixWorld,o.bindMatrixInverse);before.setFromMatrix4(o.bindMatrix);
        for(let i=0;i<part.p.count;i++){
          v.fromBufferAttribute(part.p,i).applyMatrix4(o.bindMatrix);n.fromBufferAttribute(part.n,i).applyMatrix3(before);sum.set(0,0,0);nsum.set(0,0,0);
          for(let k=0;k<4;k++){const weight=part.w.array[i*4+k];if(!weight)continue;bone.fromArray(skeleton.boneMatrices,part.j.array[i*4+k]*16);const e=bone.elements,x=v.x,y=v.y,z=v.z;
            sum.x+=weight*(e[0]*x+e[4]*y+e[8]*z+e[12]);sum.y+=weight*(e[1]*x+e[5]*y+e[9]*z+e[13]);sum.z+=weight*(e[2]*x+e[6]*y+e[10]*z+e[14]);
            nsum.x+=weight*(e[0]*n.x+e[4]*n.y+e[8]*n.z);nsum.y+=weight*(e[1]*n.x+e[5]*n.y+e[9]*n.z);nsum.z+=weight*(e[2]*n.x+e[6]*n.y+e[10]*n.z);
          }
          sum.applyMatrix4(after);nsum.transformDirection(after);position.setXYZ(part.base+i,sum.x,sum.y,sum.z);normal.setXYZ(part.base+i,nsum.x,nsum.y,nsum.z);
        }
      }position.needsUpdate=true;normal.needsUpdate=true;return true;
    },dispose(){mixer.stopAllAction();mixer.uncacheRoot(rig);skeletons.forEach(s=>s.dispose());}};
    api.pose('Idle_Neutral',0);return api;
  },
  vehicle(model,paint,brand){
    if(!model||model.animated)return null;
    const T=THREE,geometry=new T.BufferGeometry(),parts=[],indices=[];let count=0;
    const fit=new T.Matrix4().makeScale(-2.16/model.size.x,3.18/model.size.y,-5.4/model.size.z).multiply(model.origin);
    for(const part of model.parts){const g=part.geometry.clone().applyMatrix4(part.matrix),p=g.attributes.position,base=count;g.applyMatrix4(fit);parts.push({g,p:g.attributes.position,n:g.attributes.normal,base,name:part.name});count+=p.count;for(let i=0;i<(g.index?g.index.count:p.count);i++)indices.push(base+(g.index?g.index.getX(i):i));}
    const position=new T.BufferAttribute(new Float32Array(count*3),3),normal=new T.BufferAttribute(new Float32Array(count*3),3),colour=new T.BufferAttribute(new Float32Array(count*3),3),body=new T.Color(brand.body);
    position.setUsage(T.DynamicDrawUsage);normal.setUsage(T.DynamicDrawUsage);geometry.setAttribute('position',position);geometry.setAttribute('normal',normal);geometry.setAttribute('color',colour);geometry.setIndex(indices);
    for(const part of parts){const c=part.g.attributes.color;for(let i=0;i<part.p.count;i++){const x=c.getX(i),y=c.getY(i),z=c.getZ(i),glass=part.p.getZ(i)<-1.1&&part.p.getY(i)>1.7,coated=!part.name.startsWith('wheel')&&!glass&&(z>x*1.12&&y>.07||x>.4);
      colour.setXYZ(part.base+i,coated?body.r:x,coated?body.g:y,coated?body.b:z);
    }}
    const mesh=new T.Mesh(geometry,paint);mesh.name='actor:van';mesh.frustumCulled=false;mesh.userData.fpActor=true;
    const point=new T.Vector3(),norm=new T.Vector3(),matrix=new T.Matrix4(),hinge=new T.Matrix4(),rotation=new T.Matrix4(),suspension=new T.Matrix4(),q=new T.Quaternion(),euler=new T.Euler(),scale=new T.Vector3(1,1,1);let previousTime=null,spin=0,lastSteer=NaN,lastSpin=NaN,lastOpening=NaN,lastY=NaN,lastPitch=NaN,lastRoll=NaN;
    for(const p of parts){p.g.computeBoundingBox();p.center=p.g.boundingBox.getCenter(new T.Vector3());}
    return {mesh,geometry,parts,sync(m,chassis,opening,reduced){
      const steering=reduced?0:m.van.steer,dt=previousTime===null?0:Math.max(0,Math.min(.1,m.elapsed-previousTime));previousTime=m.elapsed;if(!reduced)spin=(spin+dt*m.van.speed/.4)%(Math.PI*2);else spin=0;
      if(steering===lastSteer&&spin===lastSpin&&opening===lastOpening&&chassis.position.y===lastY&&chassis.rotation.x===lastPitch&&chassis.rotation.z===lastRoll)return;lastSteer=steering;lastSpin=spin;lastOpening=opening;lastY=chassis.position.y;lastPitch=chassis.rotation.x;lastRoll=chassis.rotation.z;
      suspension.compose(chassis.position,chassis.quaternion,scale);
      for(const part of parts){const wheel=part.name.startsWith('wheel'),door=part.name==='door';matrix.identity();
        if(wheel){q.setFromEuler(euler.set(spin,part.name.includes('front')?steering:0,0));matrix.makeTranslation(part.center.x,part.center.y,part.center.z).multiply(rotation.makeRotationFromQuaternion(q)).multiply(hinge.makeTranslation(-part.center.x,-part.center.y,-part.center.z));}
        else {matrix.copy(suspension);if(door)matrix.multiply(hinge.makeTranslation(0,3.02,2.4)).multiply(rotation.makeRotationX(opening*Math.PI/2)).multiply(hinge.makeTranslation(0,-3.02,-2.4));}
        for(let i=0;i<part.p.count;i++){point.fromBufferAttribute(part.p,i).applyMatrix4(matrix);norm.fromBufferAttribute(part.n,i).transformDirection(matrix);position.setXYZ(part.base+i,point.x,point.y,point.z);normal.setXYZ(part.base+i,norm.x,norm.y,norm.z);}
      }position.needsUpdate=true;normal.needsUpdate=true;
    },dispose(){for(const p of parts)p.g.dispose();}};
  },
  build(scene,m,route,van,chassis,brand,doors){
    if(!scene.assetBank)return null;const T=THREE,models=scene.assetBank.models,high=OTR.gfx.high(),paint=new T.MeshLambertMaterial({color:0xffffff,vertexColors:true,side:T.DoubleSide}),vehicle=this.vehicle(models.get('van-exterior'),paint,brand),people=[],start=new Map(m.stops.filter(s=>s.contacted).map(s=>[s.id,m.elapsed-4])),doorOpen=m.stops.map(s=>s.contacted?1:0),initial=m.stops.map(s=>s.contacted);let cargo=m.cargoOpen?1:0,lastTime=m.elapsed,lastX=m.player.x,lastZ=m.player.z,walkUntil=0;
    const make=(kind,uniform,skin,role='resident')=>{const a=this.character(models.get(role+'-'+kind),paint,uniform,skin);if(a){route.add(a.mesh);a.mesh.visible=false;people.push(a);}return a;};
    const courier=make(m.seed%2?'men':'women',brand.uniform,undefined,'worker'),crossing=make('women',0x728e9a),residents=m.stops.map((s,i)=>{const a=m._doorSpecs&&m._doorSpecs[i];return make(i%2?'men':'women',a?a.shirt:0x608987,a&&a.skin);});
    if(vehicle)van.add(vehicle.mesh);
    const doorGeometry=high?null:new T.PlaneGeometry(1,1).rotateY(Math.PI/2),doorPaint=high?null:new T.MeshLambertMaterial({color:0x654B70,side:T.DoubleSide});
    const panels=doors.map((proxy,i)=>{if(!residents[i])return null;const s=m.stops[i],root=new T.Group(),panel=new T.Mesh(doorGeometry||proxy.geometry,doorPaint||proxy.material);root.position.set(s.x,0,s.z-.625);panel.position.set(0,1.3,.625);panel.scale.copy(proxy.scale);root.add(panel);route.add(root);proxy.layers.set(1);return root;});
    const doorCount=panels.filter(Boolean).length,recessPaint=new T.MeshLambertMaterial({color:0x202832}),recess=doorCount?new T.InstancedMesh(new T.PlaneGeometry(1,1),recessPaint,doorCount):null;
    if(recess){const matrix=new T.Matrix4(),rotation=new T.Quaternion(),size=new T.Vector3(1.25,2.5,1),position=new T.Vector3();let at=0;for(const s of m.stops)if(panels[s.id]){position.set(s.x+s.side*.045,1.3,s.z);rotation.setFromAxisAngle(new T.Vector3(0,1,0),-s.side*Math.PI/2);matrix.compose(position,rotation,size);recess.setMatrixAt(at++,matrix);}recess.frustumCulled=false;recess.name='actor:door-recesses';route.add(recess);}
    const api={vehicle,courier,crossing,residents,paint,people,panels,recess,residentMask:0,opening:()=>cargo,
      sync(model,cx,cz,reduced){const time=model.elapsed,dt=Math.max(0,Math.min(.1,time-lastTime));lastTime=time;cargo=reduced?(model.cargoOpen?1:0):T.MathUtils.damp(cargo,model.cargoOpen?1:0,12,dt);if(vehicle)vehicle.sync(model,chassis,cargo,reduced);
        const p=model.player,moved=Math.hypot(p.x-lastX,p.z-lastZ)>.001;lastX=p.x;lastZ=p.z;if(moved)walkUntil=time+.15;
        if(courier){courier.mesh.visible=false;courier.mesh.position.set(p.x,0,p.z);courier.mesh.rotation.y=Math.PI-p.yaw;if(model.mode==='walk'&&Math.hypot(p.x-model.van.x,p.z-model.van.z)<35)courier.pose(time<walkUntil?'Walk':'Idle_Neutral',time,reduced,high);}
        if(crossing){const c=model.crossing,visible=model.kind==='campaign'&&Math.hypot(c.x-cx,c.z-cz)<35;crossing.mesh.visible=visible;crossing.mesh.position.set(c.x,0,c.z);crossing.mesh.rotation.y=Math.PI/2;if(visible)crossing.pose(c.state==='crossing'?'Walk':'Idle_Neutral',time,reduced,high);}
        let nearest=-1,distance=high?35*35:22*22;for(const s of model.stops)if(residents[s.id]&&s.contacted&&!s.resolved&&(model.doorsteps?model._doorSpecs[s.id].present:s.service==='handover')){const d=(s.x-cx)**2+(s.z-cz)**2;if(d<distance){nearest=s.id;distance=d;}}
        api.residentMask=0;
        for(const s of model.stops){const a=residents[s.id],present=s.contacted&&(model.doorsteps?model._doorSpecs[s.id].present:s.service==='handover'),open=present&&!s.resolved;
          if(open&&!initial[s.id]&&!start.has(s.id))start.set(s.id,time);initial[s.id]=s.contacted;
          doorOpen[s.id]=reduced?(open?1:0):T.MathUtils.damp(doorOpen[s.id],open?1:0,10,dt);if(panels[s.id])panels[s.id].rotation.y=s.side*doorOpen[s.id]*1.25;
          if(!a)continue;a.mesh.visible=s.id===nearest;if(!a.mesh.visible)continue;api.residentMask|=1<<s.id;const age=start.has(s.id)?time-start.get(s.id):4,progress=reduced?1:Math.min(1,Math.max(0,(age-.25)/.65));
          a.mesh.position.set(s.x-s.side*.8*progress,0,s.z);a.mesh.rotation.y=-s.side*Math.PI/2;a.pose(age<.9?'Walk':age<3.2?'Wave':'Interact',age,reduced,high);
        }
      },reflect(on,model){if(courier)courier.mesh.visible=!!(on&&model.mode==='walk'&&Math.hypot(model.player.x-model.van.x,model.player.z-model.van.z)<35);},dispose(){people.forEach(p=>p.dispose());if(vehicle)vehicle.dispose();paint.dispose();recessPaint.dispose();if(doorPaint)doorPaint.dispose();if(doorGeometry&&!panels.some(Boolean))doorGeometry.dispose();}
    };return api;
  }
};
