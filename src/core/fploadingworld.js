/* The M6 cargo fit-out: fixed-capacity shelves, cart, parcels, restraints and physical label ink. */
window.OTR=window.OTR||{};
OTR.fpLoadingWorld={
  dimensions(p){return p.size==='env'?[.48,.08,.32]:p.size==='l'?[.5,.48,.5]:p.size==='s'?[.32,.24,.3]:[.42,.36,.4];},
  layout(state,van){
    return state.slots.map(s=>{
      const floor=s.level==='floor',section={A:1.85,B:.75,C:-.35},base={bottom:.66,mid:1.34,top:2.04};
      return {id:s.id,slot:s,x:van.x+(floor?0:s.id.endsWith('-0')?-.8:.8),y:floor?.6:base[s.level],z:van.z+(floor?s.id==='haz'?1.95:s.id==='floor-0'?-.1:.9:section[s.col]),w:floor?.68:.5,d:floor?.64:.86};
    });
  },
  build(parent,m,{cube=null,interactions=[],occluders=[]}={}){
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
    const slots=W.layout(state,m.van),slotById=new Map(slots.map(s=>[s.id,s])),cart={x:m.van.x-4,z:m.van.z+2.4,w:1.9,d:2.25,y:.72};
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
    for(const x of [-1.02,1.02])for(const z of [-.82,.23,1.33,2.3])solid(m.van.x+x,1.65,m.van.z+z,.035,2.12,.045,0xA5A9A3);
    for(const [section,z]of [['A',1.85],['B',.75],['C',-.35]])signs.push(marked(section,m.van.x-.78,2.8,m.van.z+z,.1,.12));
    const cargoFixedCount=staticCount;
    solid(cart.x,cart.y-.04,cart.z,cart.w,.08,cart.d,0x6D7C82);
    for(const side of [-1,1])for(const end of [-1,1]){
      solid(cart.x+side*.78,.32,cart.z+end*.94,.055,.7,.055,0x89969B);
      solid(cart.x+side*.78,.12,cart.z+end*.94,.16,.24,.24,0x303A40);
    }
    solid(cart.x,.9,cart.z-cart.d/2,.06,.4,.06,0x89969B);solid(cart.x,1.1,cart.z-cart.d/2,.8,.055,.055,0x303A40);
    const cartTarget=proxy('loading-cart',cart.x,cart.y,cart.z+cart.d/2+.03,cart.w,.18,.08);
    const restraint=proxy('loading-restraints',m.van.x+.3,.83,m.van.z+2.48,.3,.18,.08);
    solid(restraint.position.x,restraint.position.y,restraint.position.z,.28,.14,.055,0xDBAE55);
    const parcels=state.pkgs.map((p,index)=>{
      const [w,h,d]=W.dimensions(p),body=proxy('loading-parcel-'+p.id,0,0,0,w,h,d),words=OTR.fpMountedWords.build(root,{high,capacity:high?4096:1024}),lineHeight=.043;
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
    return {root,fixed,moving,sheets,batches,slots,slotById,cart,cartTarget,restraint,parcels,signs,proxies,
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
          if(held){b.x=p.x+sy*.65;b.y=1.05;b.z=p.z-cy*.65;b.angle=-p.yaw;}
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
          labelTransform.position.set(lx,ly,lz);labelTransform.rotation.set(env?-Math.PI/2:0,b.angle,0,'YXZ');labelTransform.scale.set(1,1,1);labelTransform.updateMatrix();b.matrix.copy(labelTransform.matrix);
        }
        for(const b of parcels){
          b.printVisible=b.visible&&(high||b===closest);b.words.mesh.visible=b.printVisible;
          for(let i=0;i<b.batch.entries.length;i++){const e=b.batch.entries[i];e.visible=b.printVisible;if(!b.printVisible)continue;e.matrix.multiplyMatrices(b.matrix,b.locals[i]);e.sphere.center.setFromMatrixPosition(e.matrix);b.words.mesh.setMatrixAt(i,e.matrix);}
          if(b.printVisible){b.words.mesh.count=b.words.count;b.words.mesh.instanceMatrix.needsUpdate=true;}
        }
        if(s.strapped&&model.cargoOpen)for(let k=0;k<2;k++)part(v.x,.65,v.z+.4+k,1.8,.035,.055,0xD4A83F);
        moving.count=dynamicCount;batches[1].entries.length=dynamicCount;moving.instanceMatrix.needsUpdate=true;moving.instanceColor.needsUpdate=true;sheets.count=sheetCount;batches[2].entries.length=sheetCount;sheets.instanceMatrix.needsUpdate=true;sheets.instanceColor.needsUpdate=true;root.updateMatrixWorld(true);
      },
      dispose(){if(disposed)return;disposed=true;for(const b of parcels)b.words.dispose();for(const words of signs)words.dispose();fixed.dispose();moving.dispose();sheets.dispose();sheetGeometry.dispose();paint.dispose();proxyPaint.dispose();if(ownsCube)cube.dispose();root.removeFromParent();}
    };
  }
};
