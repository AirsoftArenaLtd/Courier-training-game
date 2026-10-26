/* A bounded counter, outgoing table, physical paperwork and shipper. No scoring, saves or camera control. */
window.OTR=window.OTR||{};
OTR.fpPickupWorld={
  layout(state){
    return state.pieces.map((p,i)=>({data:p,x:10.6+(i%3)*1.4+(i>=3?.55:0),y:.78+(p.size==='l'?.52:.34)/2,z:-43.12-Math.floor(i/3)*.72,w:p.size==='l'?.64:.52,h:p.size==='l'?.52:.34,d:p.size==='env'?.07:.4}));
  },
  solids(){return [{x:8.4,z:-44.3,w:.2,d:8.4,h:3.2},{x:15.6,z:-44.3,w:.2,d:8.4,h:3.2},{x:12,z:-48.4,w:7.4,d:.2,h:3.2},{x:12,z:-46.6,w:4.8,d:.8,h:1.1},{x:12,z:-43.5,w:4.6,d:1.6,h:.78},{x:12,z:-47.55,w:.55,d:.45,h:1.8}];},
  build(parent,m,{cube=null,interactions=[],occluders=[],bank=null,focus=()=>null}={}){
    const T=THREE,high=OTR.gfx.high(),ownsCube=!cube;if(!cube)cube=new T.BoxGeometry();
    const root=new T.Group();root.name='pickup-counter';parent.add(root);const paint=new T.MeshLambertMaterial(),proxyPaint=new T.MeshBasicMaterial(),fixed=new T.InstancedMesh(cube,paint,64),scratch=new T.Object3D(),colour=new T.Color(),entries=[],words=[],batches=[{mesh:fixed,entries}],actors=[];let count=0,disposed=false,lastFocus=Symbol();
    root.add(fixed);fixed.frustumCulled=false;fixed.castShadow=fixed.receiveShadow=high;
    const box=(x,y,z,w,h,d,hex,angle=0)=>{if(count>=64)throw Error('Pickup geometry capacity exceeded');scratch.position.set(x,y,z);scratch.rotation.set(0,0,angle);scratch.scale.set(w,h,d);scratch.updateMatrix();fixed.setMatrixAt(count,scratch.matrix);colour.setHex(hex);fixed.setColorAt(count++,colour);entries.push({matrix:scratch.matrix.clone(),color:colour.clone(),sphere:new T.Sphere(new T.Vector3(x,y,z),Math.hypot(w,h,d)/2)});return entries.at(-1);};
    const proxy=(id,x,y,z,w,h,d)=>{const mesh=new T.Mesh(cube,proxyPaint);mesh.layers.set(1);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);if(id){mesh.userData.interaction=id;interactions.push(mesh);}root.add(mesh);occluders.push(mesh);return mesh;};
    const ink=(lines,x,y,z,w,h,always=true)=>{const label=OTR.fpMountedWords.build(root,{high,capacity:high?2048:1024});for(let i=0;i<lines.length;i++)label.write(lines[i],x,y+(lines.length-1-i)*h,z,w,h*.85);label.finish();const batch={mesh:label.mesh,entries:label.entries};batches.push(batch);words.push(label);if(!always)for(const e of label.entries)e.visible=high;return label;};
    for(const wall of OTR.fpPickupWorld.solids().slice(0,3)){box(wall.x,wall.h/2,wall.z,wall.w,wall.h,wall.d,0xC8CBC4);proxy(null,wall.x,wall.h/2,wall.z,wall.w,wall.h,wall.d);}
    box(12,.025,-44.3,7.1,.05,8.3,0x9C9C90);box(12,.52,-46.6,4.8,1.04,.8,0x596C74);box(12,1.09,-46.6,4.94,.1,.95,0xBEAE90);proxy(null,12,.57,-46.6,4.94,1.14,.95);
    box(12,.74,-43.5,4.6,.08,1.6,0x929B98);proxy(null,12,.39,-43.5,4.6,.78,1.6);for(const x of [10.05,13.95])for(const z of [-44.05,-42.95])box(x,.35,z,.1,.7,.1,0x56666A);
    box(12,2.45,-48.25,3.5,.45,.05,0xE4E4D9);ink([m.pickupTask.content.place.sign],12,2.45,-48.218,3.2,.27);
    const stands=[];for(const [id,x] of [['pickup-manifest',10.15],['pickup-invoice',11],['pickup-receipt',13.7]]){
      if(id==='pickup-invoice'&&!m.pickupTask.content.docs)continue;
      box(x,1.27,-46.06,.6,.34,.04,0xF4F1E6);box(x,1.12,-46.12,.08,.18,.14,0x666C6B);const p=proxy(id,x,1.27,-46.025,.6,.34,.035);stands.push(p);
      ink([id==='pickup-manifest'?'MANIFEST':id==='pickup-invoice'?'INVOICE':'RECEIPT'],x,1.26,-46.035,.52,.1);
    }
    const parcels=OTR.fpPickupWorld.layout(m.pickupTask).map(b=>{
      const p=b.data,issues=p.issues||[],crushed=issues.includes('crushed'),noLabel=issues.includes('no_label');box(b.x,b.y,b.z,b.w,b.h,b.d,p.color||0xBD9568);box(b.x,b.y+b.h/2+.003,b.z,.06,.006,b.d,0xD6BC8A);
      if(crushed)box(b.x+b.w*.32,b.y+b.h*.35,b.z+b.d/2+.005,b.w*.26,.04,.012,0x644D34);
      const hit=proxy('pickup-parcel-'+p.id,b.x,b.y,b.z,b.w,b.h,b.d);hit.userData.fpFocusPoint=new T.Vector3(0,0,.5);
      let label=null;if(!noLabel){box(b.x,b.y,b.z+b.d/2+.006,b.w*.82,b.h*.76,.008,0xEEECE3);label=ink([p.number,p.street.slice(0,16),String(p.weight)+' LB'],b.x,b.y-b.h*.21,b.z+b.d/2+.012,b.w*.72,b.h*.18,false);}
      if(p.marks?.includes('class3')){box(b.x-b.w*.33,b.y+b.h*.34,b.z+b.d/2+.013,.075,.075,.01,0xD86744);}
      const marks=[box(b.x+b.w*.25,b.y+b.h*.31,b.z+b.d/2+.025,.04,.013,.008,0x285C82,-.7),box(b.x+b.w*.32,b.y+b.h*.33,b.z+b.d/2+.025,.075,.013,.008,0x285C82,.8)];for(const mark of marks)mark.visible=false;
      return {...b,proxy:hit,label,noLabel,marks};
    });
    const person=proxy('pickup-shipper',12,1.5,-47.4,.55,.6,.45),portrait=m.pickupTask.content.shipper.spec,female=['long','bun','ponytail'].includes(portrait.hairStyle),actorPaint=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}),human=high&&OTR.fpActors?.character(bank?.models.get('resident-'+(female?'women':'men')),actorPaint,portrait.shirt,portrait.skin);
    if(human){root.add(human.mesh);human.mesh.position.set(12,0,-47.4);human.mesh.rotation.y=0;human.mesh.castShadow=human.mesh.receiveShadow=high;actors.push(human);}
    else{box(12,1.08,-47.4,.42,.6,.28,portrait.shirt);box(12,1.57,-47.4,.27,.3,.26,portrait.skin);for(const side of [-1,1]){box(12+side*.12,.4,-47.4,.14,.8,.18,0x394E60);box(12+side*.28,1.04,-47.4,.13,.55,.16,portrait.shirt);}}
    fixed.count=count;fixed.instanceMatrix.needsUpdate=true;fixed.instanceColor.needsUpdate=true;root.updateMatrixWorld(true);
    return {root,fixed,batches,words,parcels,person,stands,human,
      sync(model,reduced=false){
        if(disposed)throw Error('Pickup world was disposed');for(const b of parcels)for(const mark of b.marks)mark.visible=!!model.pickupTask.counted[b.data.id];const selected=focus();if(selected!==lastFocus){lastFocus=selected;for(const b of parcels)if(b.label){const visible=high||selected===b.proxy.userData.interaction;for(const e of b.label.entries)e.visible=visible;b.label.mesh.visible=visible;}}
        if(human){human.pose(model.pickupTask.stage==='talk'?'Interact':'Idle_Neutral',model.elapsed,reduced,high);human.mesh.rotation.y=Math.atan2(model.player.x-12,model.player.z+47.4);}root.updateMatrixWorld(true);
      },
      dispose(){if(disposed)return;disposed=true;for(const label of words)label.dispose();for(const a of actors){a.dispose();a.geometry.dispose();}fixed.dispose();paint.dispose();proxyPaint.dispose();actorPaint.dispose();if(ownsCube)cube.dispose();root.removeFromParent();}
    };
  }
};
