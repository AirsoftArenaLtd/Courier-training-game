/* The M6 cargo fit-out: fixed-capacity shelves, cart, parcels, restraints and physical label ink. */
window.OTR=window.OTR||{};
OTR.fpLoadingWorld={
  dimensions(p){return p.size==='env'?[.48,.08,.32]:p.size==='l'?[.5,.48,.5]:p.size==='s'?[.32,.24,.3]:[.42,.36,.4];},
  fit(vehicle){
    const fallback={floor:.6,bottom:.66,mid:1.34,top:2.04,side:.8,depth:.86,sections:{A:1.85,B:.75,C:-.35}};if(!vehicle)return fallback;
    // Sample the fitted, parked exterior once. Both source vans have wheel housings;
    // the High van also has a raised centre floor. No per-frame rays or allocations.
    const T=THREE,root=new T.Group(),paint=new T.MeshBasicMaterial({side:T.DoubleSide}),ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0),0,1.5);
    const door=vehicle.parts.find(p=>p.name==='door'),bounds=door?.g.boundingBox,halfWidth=bounds?Math.min(-bounds.min.x,bounds.max.x):1.065;
    // This exterior pack includes tall passenger-style side benches. On this owned
    // cargo-only clone, lower their caps to just above the actual wheels so three
    // parcel shelves fit below the roof. The source pack and workday van stay intact.
    let wheelTop=0;for(const p of vehicle.parts)if(p.name.startsWith('wheel'))wheelTop=Math.max(wheelTop,p.g.boundingBox.max.y);
    const wheelCap=Math.ceil((wheelTop+.01)*100)/100;
    if(!vehicle.loadingCapsFitted){let changed=0;for(const p of vehicle.parts)if(p.name==='body'){
      for(let i=0;i<p.p.count;i++){const y=p.p.getY(i),z=p.p.getZ(i);if(y>wheelCap&&y<wheelCap+.25&&Math.abs(p.p.getX(i))<=halfWidth+.001&&z>-.5&&z<2.4){p.p.setY(i,wheelCap);changed++;}}
      p.p.needsUpdate=true;p.g.computeBoundingBox();p.g.computeBoundingSphere();
    }vehicle.loadingCapsFitted=true;vehicle.loadingCapVertices=changed;}
    for(const p of vehicle.parts)if(p.name!=='door')root.add(new T.Mesh(p.g,paint));root.updateMatrixWorld(true);
    const support=(x,z)=>{ray.ray.origin.set(x,1.5,z);return ray.intersectObject(root,true)[0]?.point.y||0;};
    try{
      const side=halfWidth-.265;
      let floor=.6,bottom=.66;
      for(const x of [-.3,0,.3])for(const z of [-.35,-.1,.15,.65,.9,1.15,1.7,1.95,2.2])floor=Math.max(floor,support(x,z)+.012);
      floor=Math.ceil(floor*100)/100;
      for(const sign of [-1,1])for(const dx of [-.2,0,.2])for(const z of [.03,.4,.77,.83,1.2,1.57,1.63,2,2.37])bottom=Math.max(bottom,support(sign*(side+dx),z)+.025);
      bottom=Math.ceil(Math.max(bottom,floor+.06)*100)/100;
      return {floor,bottom,mid:bottom+.59,top:bottom+1.18,side,depth:.74,sections:{A:2,B:1.2,C:.4},wheelCap,capVertices:vehicle.loadingCapVertices};
    }finally{paint.dispose();root.clear();}
  },
  layout(state,van,fit={floor:.6,bottom:.66,mid:1.34,top:2.04,side:.8,depth:.86,sections:{A:1.85,B:.75,C:-.35}}){
    return state.slots.map(s=>{
      const floor=s.level==='floor';
      return {id:s.id,slot:s,x:van.x+(floor?0:s.id.endsWith('-0')?-fit.side:fit.side),y:floor?fit.floor:fit[s.level],z:van.z+(floor?s.id==='haz'?1.95:s.id==='floor-0'?-.1:.9:fit.sections[s.col]),w:floor?.68:.5,d:floor?.64:fit.depth};
    });
  },
  build(parent,m,{cube=null,interactions=[],occluders=[],vehicle=null}={}){
    const T=THREE,W=this,state=m.loading,high=OTR.gfx.high(),ownsCube=!cube;if(!state?.pkgs.length||state.pkgs.length>12)throw Error('Invalid physical loading set');if(!cube)cube=new T.BoxGeometry();
    const root=new T.Group();root.name='module-loading-cargo';parent.add(root);
    const paint=new T.MeshLambertMaterial(),proxyPaint=new T.MeshBasicMaterial(),sheetGeometry=new T.PlaneGeometry(),fixed=new T.InstancedMesh(cube,paint,96),moving=new T.InstancedMesh(cube,paint,128),sheets=new T.InstancedMesh(sheetGeometry,paint,128),scratch=new T.Object3D(),colour=new T.Color(),batches=[],proxies=[];
    let staticCount=0,dynamicCount=0,sheetCount=0,disposed=false;
    for(const mesh of [fixed,moving,sheets]){mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=high;mesh.setColorAt(0,colour);root.add(mesh);batches.push({mesh,entries:[]});}
    const pools=[96,128,128].map(n=>Array.from({length:n},()=>({matrix:new T.Matrix4(),color:new T.Color(),sphere:new T.Sphere(),visible:true})));
    const box=(which,index,x,y,z,w,h,d,hex,angle=0,flat=false)=>{
      const mesh=which===2?sheets:which?moving:fixed,e=pools[which][index];if(!e)throw Error('Loading cargo geometry capacity exceeded');
      scratch.position.set(x,y,z);scratch.rotation.set(flat===-1?Math.PI/2:flat?-Math.PI/2:0,angle,0,'YXZ');scratch.scale.set(w,h,d);scratch.updateMatrix();mesh.setMatrixAt(index,scratch.matrix);colour.setHex(hex);mesh.setColorAt(index,colour);
      e.matrix.copy(scratch.matrix);e.color.copy(colour);e.sphere.center.copy(scratch.position);e.sphere.radius=Math.hypot(w,h,which===2?0:d)/2;e.visible=true;batches[which].entries[index]=e;
    };
    const solid=(...args)=>box(0,staticCount++,...args),part=(x,y,z,w,h,d,hex,angle=0)=>box(1,dynamicCount++,x,y,z,w,h,d,hex,angle);
    const paper=(x,y,z,w,h,hex,angle=0,flat=false)=>box(2,sheetCount++,x,y,z,w,h,1,hex,angle,flat);
    const proxy=(id,x,y,z,w,h,d,angle=0)=>{
      const mesh=new T.Mesh(cube,proxyPaint);mesh.layers.set(1);mesh.position.set(x,y,z);mesh.rotation.y=angle;mesh.scale.set(w,h,d);
      if(id){mesh.userData.interaction=id;interactions.push(mesh);}occluders.push(mesh);proxies.push(mesh);root.add(mesh);return mesh;
    };
    const fit=W.fit(vehicle),slots=W.layout(state,m.van,fit),slotById=new Map(slots.map(s=>[s.id,s])),cart={x:m.van.x-4,z:m.van.z+2.4,w:1.9,d:2.25,y:.72};
    if(m.loadingShelfSolids)for(let i=0;i<2;i++)Object.assign(m.loadingShelfSolids[i],{x:m.van.x+(i?fit.side:-fit.side),z:m.van.z+(fit.sections.A+fit.sections.C)/2,d:fit.sections.A-fit.sections.C+fit.depth});
    const marked=(value,x,y,z,w,h)=>{
      if(high)solid(x,y,z,w+.025,h+.02,.012,0xE6E5DA);const words=OTR.fpMountedWords.build(root,{high,capacity:high?2048:512});words.write(value,x,y,z+.009,w,h);words.finish();words.plaque={x,y,z,w:w+.025,h:h+.02};batches.push({mesh:words.mesh,entries:words.entries});return words;
    };
    const signs=[];
    // Section A is at the rear doors; section C is nearest the bulkhead. Both sides share each section.
    for(const s of slots){
      if(s.slot.level!=='floor'){
        if(high)solid(s.x,s.y-.025,s.z,s.w,.05,s.d,0x7D8688);proxy(null,s.x,s.y-.025,s.z,s.w,.05,s.d);
        const edge=s.x>m.van.x?s.x-s.w/2-.012:s.x+s.w/2+.012;
        s.target=proxy('loading-slot-'+s.id,edge,s.y+.04,s.z,.035,.12,.28);
        if(high)solid(edge,s.y+.04,s.z,.025,.1,.26,0xD0D7CD);
      }else{
        if(high)solid(s.x,s.y-.004,s.z,s.w,.008,s.d,s.id==='haz'?0x9C7846:0x686E68);
        s.target=proxy('loading-slot-'+s.id,s.x,s.y+.012,s.z+s.d/2-.04,s.w,.03,.08);
      }
    }
    for(const side of [-1,1])for(const z of [fit.sections.C-fit.depth/2,fit.sections.C+fit.depth/2,fit.sections.B+fit.depth/2,fit.sections.A+fit.depth/2])solid(m.van.x+side*(fit.side+.23),(fit.floor+2.85)/2,m.van.z+z,.035,2.85-fit.floor,.045,0xA5A9A3);
    for(const [section,z]of Object.entries(fit.sections))signs.push(marked(section,m.van.x-fit.side,fit.top-.03,m.van.z+z+fit.depth/2+.01,.1,.12));
    const cargoFixedCount=staticCount;
    solid(cart.x,cart.y-.04,cart.z,cart.w,.08,cart.d,0x6D7C82);
    for(const side of [-1,1])for(const end of [-1,1]){
      solid(cart.x+side*.78,.32,cart.z+end*.94,.055,.7,.055,0x89969B);
      solid(cart.x+side*.78,.12,cart.z+end*.94,.16,.24,.24,0x303A40);
    }
    solid(cart.x,.9,cart.z-cart.d/2,.06,.4,.06,0x89969B);solid(cart.x,1.1,cart.z-cart.d/2,.8,.055,.055,0x303A40);
    const cartTarget=proxy('loading-cart',cart.x,cart.y,cart.z+cart.d/2+.03,cart.w,.18,.08);
    const restraint=proxy('loading-restraints',m.van.x+.3,fit.floor+.12,m.van.z+2.48,.3,.18,.08);
    solid(restraint.position.x,fit.floor+.03,restraint.position.z,.07,.06,.055,0x89969B);
    solid(restraint.position.x,restraint.position.y,restraint.position.z,.28,.14,.055,0xDBAE55);
    const parcels=state.pkgs.map((p,index)=>{
      const [w,h,d]=W.dimensions(p),body=proxy('loading-parcel-'+p.id,0,0,0,w,h,d),words=OTR.fpMountedWords.build(root,{high,capacity:high?4096:1024}),lineHeight=.043;
      body.userData.fpFocusPoint=p.size==='env'?new T.Vector3(0,.5,0):new T.Vector3(0,0,.5);
      words.write(p.number+(p.unit?' #'+p.unit:''),0,.064,0,w*.8,lineHeight);
      words.write(p.street,0,.003,0,w*.8,lineHeight);
      // Low keeps the address on the physical face. Stop/weight details remain complete in
      // the accessible label panel; High also prints them on the package itself.
      if(high)words.write(state.mode==='load'?`${p.stop} / ${p.weight} LB`:`${p.weight} LB`,0,-.058,0,w*.8,lineHeight);words.finish();
      // Low mirrors retain the real parcel and paper face; sub-centimeter address strokes
      // are submitted in the main view only, where the trainee can actually read them.
      if(!high)for(const e of words.entries)e.mainOnly=true;
      const batch={mesh:words.mesh,entries:words.entries};batches.push(batch);
      const locals=words.entries.map(e=>e.matrix.clone());
      return {data:p,index,w,h,d,body,words,batch,locals,matrix:new T.Matrix4(),x:0,y:0,z:0,angle:0,visible:false,printVisible:false};
    });
    fixed.count=staticCount;fixed.instanceMatrix.needsUpdate=true;fixed.instanceColor.needsUpdate=true;moving.count=sheets.count=0;
    const labelTransform=new T.Object3D();
    return {root,fixed,moving,sheets,batches,slots,slotById,fit,cart,cartTarget,restraint,parcels,signs,proxies,
      sync(model){
        if(disposed)throw Error('Loading cargo world was disposed');dynamicCount=sheetCount=0;const s=model.loading,p=model.player,v=model.van,sy=Math.sin(p.yaw),cy=Math.cos(p.yaw);let closest=null,best=Infinity;
        // The opaque sides and bulkhead hide these parts from outside. Low only submits the
        // cargo fit-out from its aisle or beyond the open rear aperture; the cart stays visible.
        const cargoVisible=model.cargoOpen&&(high||model.mode!=='cab'&&(p.z-v.z>2.62||Math.abs(p.x-v.x)<1.05&&p.z-v.z>-.9));
        for(let i=0;i<cargoFixedCount;i++)pools[0][i].visible=cargoVisible;
        for(const words of signs){words.mesh.visible=cargoVisible;for(const e of words.entries)e.visible=cargoVisible;if(!high&&cargoVisible){const b=words.plaque;paper(b.x,b.y,b.z,b.w,b.h,0xE6E5DA);}}
        for(const slot of slots){slot.target.visible=model.cargoOpen;if(!high&&cargoVisible){if(slot.slot.level==='floor')paper(slot.x,slot.y,slot.z,slot.w,slot.d,slot.id==='haz'?0x9C7846:0x686E68,0,true);else{const angle=slot.x>v.x?-Math.PI/2:Math.PI/2;paper(slot.x,slot.y,slot.z,slot.w,slot.d,0x7D8688,0,true);paper(slot.x,slot.y-.05,slot.z,slot.w,slot.d,0x7D8688,0,-1);paper(slot.target.position.x,slot.y-.025,slot.z,slot.d,.05,0x7D8688,angle);paper(slot.target.position.x,slot.target.position.y,slot.z,.26,.1,0xD0D7CD,angle);}}}
        restraint.visible=model.cargoOpen;cartTarget.visible=s.mode==='load';
        for(const b of parcels){
          const q=b.data,held=s.held===q.id,slot=q.slotRef&&slotById.get(q.slotRef.id),inCart=s.cart.includes(q);b.visible=(!q.pulled||slot?.slot.pkg===q)&&(held||inCart||!!slot&&cargoVisible);
          if(held){const inside=model.cargoOpen&&Math.abs(p.x-v.x)<fit.side-.25&&p.z-v.z<2.6&&p.z-v.z>fit.sections.C-fit.depth/2;b.x=p.x+sy*.65;b.y=inside?Math.max(1.05,fit.floor+.5):1.05;b.z=p.z-cy*.65;b.angle=-p.yaw;}
          else if(slot){b.x=slot.x;b.y=slot.y+b.h/2;b.z=slot.z;b.angle=slot.slot.level==='floor'?0:slot.x<v.x?Math.PI/2:-Math.PI/2;}
          else{b.x=cart.x+(b.index%3-1)*.58;b.y=cart.y+b.h/2;b.z=cart.z+(Math.floor(b.index/3)-1.5)*.53;b.angle=0;}
          b.body.visible=b.visible&&!held&&!q.pulled;b.body.position.set(b.x,b.y,b.z);b.body.rotation.y=b.angle;
          if(!b.visible)continue;
          const highlighted=model.loadingCoaching&&s.hint?.kind==='shown'&&s.hint.id===q.id;
          part(b.x,b.y,b.z,b.w,b.h,b.d,highlighted?0xE3CA69:q.hazmat?0xBFA77D:0xBE965E,b.angle);
          const sn=Math.sin(b.angle),cs=Math.cos(b.angle),env=q.size==='env',labelDepth=env?0:b.d/2+.006;
          const lx=b.x+sn*labelDepth,lz=b.z+cs*labelDepth,ly=env?b.y+b.h/2+.006:b.y;
          if(high){if(env)part(b.x,ly,b.z,b.w*.88,.008,.23,0xF0EEE6,b.angle);else part(lx,ly,lz,b.w*.88,b.h*.78,.008,0xF0EEE6,b.angle);part(b.x,b.y+b.h/2+.003,b.z,.055,.006,b.d,0xD9C098,b.angle);}
          else{if(env)paper(b.x,ly,b.z,b.w*.88,.23,0xF0EEE6,b.angle,true);else paper(lx,ly,lz,b.w*.88,b.h*.78,0xF0EEE6,b.angle);paper(b.x,b.y+b.h/2+.003,b.z,.055,b.d,0xD9C098,b.angle,true);}
          const range=(p.x-lx)**2+(p.z-lz)**2;
          const facing=env||(p.x-lx)*sn+(p.z-lz)*cs>0;
          if(held||highlighted){closest=b;best=-1;}else if(facing&&range<best&&range<2.65**2){closest=b;best=range;}
          // High paper is 8mm thick; ink must sit outside its front, never inside it.
          const ink=high?.006:.002;
          labelTransform.position.set(lx+(env?0:sn*ink),ly+(env?ink:0),lz+(env?0:cs*ink));labelTransform.rotation.set(env?-Math.PI/2:0,b.angle,0,'YXZ');labelTransform.scale.set(1,1,1);labelTransform.updateMatrix();b.matrix.copy(labelTransform.matrix);
        }
        for(const b of parcels){
          b.printVisible=b.visible&&(high||b===closest);b.words.mesh.visible=b.printVisible;
          for(let i=0;i<b.batch.entries.length;i++){const e=b.batch.entries[i];e.visible=b.printVisible;if(!b.printVisible)continue;e.matrix.multiplyMatrices(b.matrix,b.locals[i]);e.sphere.center.setFromMatrixPosition(e.matrix);b.words.mesh.setMatrixAt(i,e.matrix);}
          if(b.printVisible){b.words.mesh.count=b.words.count;b.words.mesh.instanceMatrix.needsUpdate=true;}
        }
        if(s.strapped&&model.cargoOpen)for(const b of parcels){
          if(!b.visible||b.data.slotRef?.level!=='floor')continue;
          const y=b.y+b.h/2+.015,w=b.w+.04,h=y-fit.floor;
          if(high){part(b.x,y,b.z,w,.025,.055,0xD4A83F);part(b.x-w/2,fit.floor+h/2,b.z,.025,h,.055,0xD4A83F);part(b.x+w/2,fit.floor+h/2,b.z,.025,h,.055,0xD4A83F);}
          else{paper(b.x,y,b.z,w,.055,0xD4A83F,0,true);paper(b.x-w/2,fit.floor+h/2,b.z,.055,h,0xD4A83F,Math.PI/2);paper(b.x+w/2,fit.floor+h/2,b.z,.055,h,0xD4A83F,-Math.PI/2);}
        }
        moving.count=dynamicCount;batches[1].entries.length=dynamicCount;moving.instanceMatrix.needsUpdate=true;moving.instanceColor.needsUpdate=true;sheets.count=sheetCount;batches[2].entries.length=sheetCount;sheets.instanceMatrix.needsUpdate=true;sheets.instanceColor.needsUpdate=true;root.updateMatrixWorld(true);
      },
      dispose(){if(disposed)return;disposed=true;for(const b of parcels)b.words.dispose();for(const words of signs)words.dispose();fixed.dispose();moving.dispose();sheets.dispose();sheetGeometry.dispose();paint.dispose();proxyPaint.dispose();if(ownsCube)cube.dispose();root.removeFromParent();}
    };
  }
};
