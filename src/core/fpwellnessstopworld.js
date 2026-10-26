/* Bounded safety surfaces over the existing fitted delivery stop. No decision, score or save writes. */
window.OTR=window.OTR||{};
OTR.fpWellnessStopWorld={
  build(parent,model,options={}){
    const T=THREE,S=OTR.fpWellnessStage,stage=model.wellnessStage||S.create(model),previous=new Set(stage.solids);
    const base=OTR.fpScannerStopWorld.build(parent,model,options);
    S.fit(model,model.scannerStage.wall,model.scannerStage.floor);model.solids=model.solids.filter(s=>!previous.has(s));model.solids.push(...stage.solids);
    const root=new T.Group();root.name='wellness-surfaces';base.root.add(root);
    const cube=options.cube||new T.BoxGeometry(),ownCube=!options.cube,paint=new T.MeshLambertMaterial(),proxyPaint=new T.MeshBasicMaterial(),fixed=new T.InstancedMesh(cube,paint,128),moving=new T.InstancedMesh(cube,paint,96),scratch=new T.Object3D(),colour=new T.Color();
    const batches=[{mesh:fixed,entries:[]},{mesh:moving,entries:[]}],pools=[128,96].map(n=>Array.from({length:n},()=>({matrix:new T.Matrix4(),color:new T.Color(),sphere:new T.Sphere()})));
    const high=OTR.gfx.high(),meshes=[fixed,moving],sides=[-1,1];let stat=0,dynamic=0,disposed=false;
    root.add(fixed,moving);for(const mesh of meshes){mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=high;mesh.setColorAt(0,colour);}
    const box=(slot,x,y,z,w,h,d,hex,angle=0)=>{
      const index=slot?dynamic++:stat++,mesh=meshes[slot],entry=pools[slot][index];if(!entry)throw Error('Wellness surface capacity exceeded');
      scratch.position.set(x,y,z);scratch.rotation.set(0,angle,0);scratch.scale.set(w,h,d);scratch.updateMatrix();mesh.setMatrixAt(index,scratch.matrix);colour.setHex(hex);mesh.setColorAt(index,colour);
      entry.matrix.copy(scratch.matrix);entry.color.copy(colour);entry.sphere.center.copy(scratch.position);entry.sphere.radius=Math.hypot(w,h,d)/2;batches[slot].entries[index]=entry;
    };
    const solid=(x,y,z,w,h,d,hex,angle=0)=>box(0,x,y,z,w,h,d,hex,angle),part=(x,y,z,w,h,d,hex,angle=0)=>box(1,x,y,z,w,h,d,hex,angle);
    const targets=[],proxy=(id,x,y,z,w,h,d)=>{const mesh=new T.Mesh(cube,proxyPaint);mesh.layers.set(1);mesh.userData.interaction=id;mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);if(id){options.interactions?.push(mesh);targets.push(mesh);}options.occluders?.push(mesh);return mesh;};
    // Join the public sidewalk to the existing entrance path beneath every source hazard.
    solid(8.5,-.015,-40.2,7.4,.03,2,0xC8C3B7);solid(12,-.015,-40.05,2.4,.03,1.7,0xC8C3B7);
    const hazards=stage.hazards.map(surface=>{
      const clearable=surface.type==='hose'||surface.type==='toys';
      const target=clearable?surface.type==='hose'?proxy('wellness-clear-'+surface.id,surface.x,surface.y+.04,surface.z-.45,.35,.12,.15):proxy('wellness-clear-'+surface.id,surface.x-.3,surface.y+.09,surface.z-.2,.25,.18,.3):null;
      let hose=null;
      if(surface.type==='hose'){
        const points=[[-.4,-.45],[.4,-.45],[.65,-.2],[.65,.2],[.4,.45],[-.4,.45],[-.65,.2],[-.65,-.2]];
        hose=points.map((point,i)=>{const next=points[(i+1)%points.length],dx=next[0]-point[0],dz=next[1]-point[1];return {x:(point[0]+next[0])/2,z:(point[1]+next[1])/2,w:Math.hypot(dx,dz)+.03,angle:-Math.atan2(dz,dx)};});
      }
      if(!clearable){
        const ice=surface.type==='ice',crack=surface.type==='crack',y=surface.y;
        solid(surface.x,y,surface.z,surface.w,.018,surface.d,ice?0x8BA7B4:crack?0x686A66:0x7C8E95);
        if(crack){solid(surface.x-surface.w*.24,y+.025,surface.z,surface.w*.46,.06,surface.d,0xA7A79E);solid(surface.x+surface.w*.25,y+.005,surface.z,surface.w*.46,.02,surface.d,0xBEBEB3);}
        else{solid(surface.x-surface.w*.08,y+.012,surface.z-surface.d*.15,surface.w*.75,.012,.025,ice?0xBECFD3:0x9AAEB4,.12);solid(surface.x+surface.w*.17,y+.012,surface.z+surface.d*.18,surface.w*.4,.012,.025,ice?0xB6C9CE:0x92A6AD,-.4);}
      }
      return {surface,target,hose};
    });
    const gate=model.customerStop.def.fence?proxy('wellness-gate',12,1,-40.53,1.5,.6,.15):null,gateBarrier=gate?proxy(null,12,.6,-40.6,1.5,1.2,.12):null;
    const words=OTR.fpMountedWords.build(root,{high,capacity:128});
    if(gate){
      for(const centre of [8.8,15.2]){solid(centre,.48,-40.6,4.9,.09,.1,0xDFDFD5);solid(centre,.93,-40.6,4.9,.09,.1,0xDFDFD5);for(let i=0;i<12;i++)solid(centre-2.2+i*.4,.63,-40.6,.1,1.22,.12,0xEEEDE2);proxy(null,centre,.63,-40.6,4.9,1.22,.12);}
      solid(11.1,1.01,-40.48,.62,.42,.04,0xEEE5C9);words.write('BEWARE OF DOG',11.1,1.01,-40.45,.56,.35);
      solid(14.6,.4,-43.1,1.1,.8,.9,0x9C7350);solid(14.6,.9,-43.1,1.3,.2,1.1,0x665349);solid(14.6,.26,-42.64,.5,.52,.015,0x292C2A);solid(14,.07,-42.6,.38,.14,.32,0x7095A7);
    }
    for(const shade of stage.shades){
      if(shade.kind==='porch')solid(shade.x,2.5+stage.floor,shade.z,shade.w,.14,shade.d,0x9B9888);
      else{
        const umbrella=shade.kind==='umbrella',x=shade.x+(umbrella?0:-.9);solid(x,1.22,shade.z,umbrella?.1:.3,2.44,umbrella?.1:.3,umbrella?0x837B6C:0x766148);
        solid(shade.x,umbrella?2.45:2.8,shade.z,shade.w,umbrella?.15:1.25,shade.d,umbrella?0xBD915F:0x63754B);
      }
      solid(shade.x,.006+(shade.kind==='porch'?stage.floor:0),shade.z,shade.w,.009,shade.d,0xA09F8D);
    }
    if(stage.interior){
      const wall=stage.wall,floor=stage.floor;
      solid(12,2.5+floor,wall+.58,5.05,.16,1.3,0xC1BDB0);proxy(null,12,2.5+floor,wall+.58,5.05,.16,1.3);
      for(const side of sides){solid(12+side*2.45,1.25+floor,wall+.55,.16,2.5,1.1,0xA7BBC1);solid(12+side*1.55,1.25+floor,wall+1.12,1.8,2.5,.12,0xA7BBC1);proxy(null,12+side*2.45,1.25+floor,wall+.55,.16,2.5,1.1);proxy(null,12+side*1.55,1.25+floor,wall+1.12,1.8,2.5,.12);}
      // No screen-space tint or hidden cooling volume: the walls and roof enclose the source reception stop.
      stage.interiorBuilt=true;
    }
    const bottle=model.customerStop.content.heat?proxy('wellness-water',stage.bottle.x,stage.bottle.y,stage.bottle.z,.18,.34,.18):null;
    if(bottle){solid(stage.bottle.x-.02,.89,stage.bottle.z,.24,.08,.26,0x555E61);solid(stage.bottle.x,stage.bottle.y,stage.bottle.z,.13,.27,.13,0xA6C5CF);solid(stage.bottle.x,stage.bottle.y+.15,stage.bottle.z,.09,.05,.09,0x3D6071);}
    words.finish();batches.push({mesh:words.mesh,entries:words.entries});fixed.count=stat;fixed.instanceMatrix.needsUpdate=true;fixed.instanceColor.needsUpdate=true;
    base.batches.push(...batches);const baseSync=base.sync,baseDispose=base.dispose;
    return Object.assign(base,{wellness:{root,fixed,moving,batches,targets,hazards,gate,gateBarrier,bottle,words},
      sync(m,reduced=false){
        if(disposed)throw Error('Wellness world was disposed');S.pose(m);const d=m.customerStop,w=d.wellness;
        const actor=m.customerStage.actors[0];if(actor){actor.visible=!!d.state.answered;actor.x=stage.owner.x;actor.z=stage.owner.z;OTR.fpCustomerStage.target(m.customerStage);}
        baseSync.call(base,m,reduced);dynamic=0;
        for(const item of hazards){
          const h=item.surface,state=d.state.hazards[h.id],cleared=state.state==='cleared';if(item.target)item.target.visible=!cleared;
          if(!item.target||cleared)continue;
          if(h.type==='hose'){
            for(const segment of item.hose)part(h.x+segment.x,h.y+.04,h.z+segment.z,segment.w,.07,.07,0x4F7758,segment.angle);
            part(h.x+.65,h.y+.04,h.z+.43,.07,.07,.5,0x4F7758);
          }else{part(h.x-.3,h.y+.09,h.z-.2,.25,.18,.3,0xC48A46);part(h.x+.28,h.y+.12,h.z+.18,.3,.24,.23,0x6B8D9D);part(h.x-.15,h.y+.16,h.z+.25,.16,.32,.16,0x956D7A);}
        }
        if(gate){
          gate.visible=!stage.gate.open;const open=stage.gate.open,g=stage.gate,x=open?g.x-g.w/2:g.x,z=open?g.z-g.w/2:g.z,angle=open?Math.PI/2:0;
          gateBarrier.position.set(g.solid.x,.6,g.solid.z);gateBarrier.scale.set(g.solid.w,1.2,g.solid.d);
          part(x,.45,z,1.5,.09,.12,0xE6E5DA,angle);part(x,.94,z,1.5,.09,.12,0xE6E5DA,angle);
          for(let i=0;i<4;i++)part(open?x:x-.6+i*.4,.64,open?g.z-.15-i*.4:z,.1,1.2,.12,0xEEEDE2);
        }
        const dog=stage.dog;
        if(dog.visible){
          const fur=d.def.dog.spec.fur||0x876C54,patch=d.def.dog.spec.patch||fur,fear=dog.mood==='fearful',bounce=!reduced&&dog.moving?Math.sin(stage.time*12)*.025:0,x=dog.x,z=dog.z,y=bounce+(fear?-.1:0);
          part(x,.51+y,z,.42,.38,.68,fur);part(x,.79+y,z+.25,.29,.3,.3,fur);part(x,.69+y,z+.43,.22,.13,.24,patch);
          for(const side of sides){part(x+side*(fear?.15:.11),(fear?.87:.96)+y,z+(fear?.12:.24),fear?.13:.09,fear?.06:.2,fear?.25:.14,fur);part(x+side*.17,fear?.15:.22+y,z-.21,.11,fear?.3:.45,.13,fur);part(x+side*.17,fear?.15:.22+y,z+.2,.11,fear?.3:.45,.13,fur);part(x+side*.085,.83+y,z+.407,.035,.035,.018,0x252A2B);}
          part(x,(fear?.4:.55)+y,z-(fear?.32:.46),.08,fear?.06:.36,fear?.24:.12,fur);part(x,.67+y,z+.21,.43,.07,.12,d.def.dog.spec.collar||0x6B8790);
        }
        moving.count=dynamic;batches[1].entries.length=dynamic;moving.instanceMatrix.needsUpdate=true;moving.instanceColor.needsUpdate=true;root.updateMatrixWorld(true);
      },
      dispose(){if(disposed)return;disposed=true;stage.interiorBuilt=false;words.dispose();for(const mesh of meshes)mesh.dispose();paint.dispose();proxyPaint.dispose();if(ownCube)cube.dispose();baseDispose.call(base);}
    });
  }
};
