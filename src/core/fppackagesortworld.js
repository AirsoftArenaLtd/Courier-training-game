/* Project-made conveyor, physical routing keys and a fixed parcel pool. Unwired until its adapter is ready. */
window.OTR=window.OTR||{};
OTR.fpPackageSortWorld={
  bins:['R1','R2','R3','PRI','EXC','DG','HVY'],
  belt:{x:-10,z:14.1,length:8.8,width:.85,height:.9},
  buttonPoint(index){return {x:-11.65+index*.55,y:1.02,z:15.48};},
  binPoint(index){return {x:-14.5+index*1.5,y:.65,z:8.7};},
  parcelPoint(parcel,out){const b=this.belt;out.x=b.x-b.length/2+(parcel.position+70)/1252*b.length;out.y=1.2;out.z=b.z;return out;},
  solids(){const b=this.belt;return [{x:b.x,z:b.z,w:b.length+.15,d:b.width+.18},{x:-10,z:15.1,w:4,d:.7},{x:-7.65,z:15.3,w:.4,d:.4},...this.bins.map((id,i)=>({...this.binPoint(i),w:1.25,d:1.1}))];},
  build(parent,{interactions=[],occluders=[],cube=null}={}){
    const T=THREE,A=this,b=A.belt,ownsCube=!cube;if(!cube)cube=new T.BoxGeometry(1,1,1);
    const root=new T.Group(),paint=new T.MeshLambertMaterial(),proxyPaint=new T.MeshBasicMaterial(),scratch=new T.Object3D(),colour=new T.Color(),position={x:0,y:0,z:0};root.name='package-sort-conveyor';parent.add(root);
    // Every parcel uses at most twelve cube parts. Counts, buffers and proxy objects never grow in sync().
    const plane=new T.PlaneGeometry(1,1),staticMesh=new T.InstancedMesh(cube,paint,192),parcelMesh=new T.InstancedMesh(cube,paint,16),markMesh=new T.InstancedMesh(plane,paint,512+16*12);
    staticMesh.frustumCulled=parcelMesh.frustumCulled=markMesh.frustumCulled=false;root.add(staticMesh,parcelMesh,markMesh);let staticCount=0,partCount=0,glyphCount=0,disposed=false;
    const put=(mesh,index,x,y,z,w,h,d,hex,rx=0,rz=0)=>{scratch.rotation.set(rx,0,rz);scratch.position.set(x,y,z);scratch.scale.set(w,h,d);scratch.updateMatrix();mesh.setMatrixAt(index,scratch.matrix);colour.setHex(hex);mesh.setColorAt(index,colour);};
    const box=(x,y,z,w,h,d,hex)=>{if(staticCount>=192)throw Error('Conveyor scenery capacity exceeded');put(staticMesh,staticCount++,x,y,z,w,h,d,hex);};
    const proxy=(id,x,y,z,w,h,d,interactive=true)=>{const p=new T.Mesh(cube,proxyPaint);p.position.set(x,y,z);p.scale.set(w,h,d);p.layers.set(1);p.userData.interaction=id;root.add(p);occluders.push(p);if(interactive)interactions.push(p);return p;};
    box(b.x,.78,b.z,b.length,.24,b.width,0x394950);for(const side of [-1,1])box(b.x,.98,b.z+side*.48,b.length+.1,.12,.08,0x7A898E);
    for(let i=0;i<19;i++)box(b.x-b.length/2+.15+i*(b.length-.3)/18,.92,b.z,.12,.045,.8,0x66777B);
    for(const x of [b.x-3.8,b.x,b.x+3.8])for(const z of [b.z-.35,b.z+.35])box(x,.4,z,.1,.8,.1,0x4A5C62);
    box(-10,.48,15.1,4,.96,.7,0x56676B);box(-10,.97,15.1,4.05,.07,.74,0xA4ACAA);
    const buttons=[];
    // Numerals are fixed routing symbols; their sentence readings remain in translated Phaser text.
    const number=(n,x,y,z,size)=>{const rows=OTR.fpSignLettering.rows[String(n)];for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(rows[row][col]==='1'){if(glyphCount>=512)throw Error('Conveyor symbol capacity exceeded');put(markMesh,glyphCount++,x+(col-2)*size,y+(3-row)*size,z,size,size,1,0x17282E);}};
    for(let i=0;i<A.bins.length;i++){
      const key=A.bins[i],p=A.buttonPoint(i),bin=A.binPoint(i),hex=[0x3DA5FF,0x2BC48A,0x72B1F8,0xD28E28,0xAC3B4E,0xB6A042,0x7A7690][i];
      box(p.x,p.y,p.z,.46,.33,.045,0xE9E8DE);number(i+1,p.x,p.y,p.z+.03,.034);buttons.push(proxy('sort-bin-'+key,p.x,p.y,p.z+.045,.46,.33,.06));
      box(bin.x,.47,bin.z,1.25,.94,1.1,0x52656B);box(bin.x,.98,bin.z,1.29,.08,1.14,hex);
      // A repeated numeral identifies the destination without relying on its colour.
      box(bin.x,.65,bin.z+.56,.35,.4,.025,0xE9E8DE);number(i+1,bin.x,.65,bin.z+.58,.035);
    }
    const restart=proxy('sort-jam',-7.65,.99,15.3,.3,.3,.24);box(-7.65,.98,15.3,.3,.3,.24,0xC24D43);box(-7.65,.42,15.3,.09,.84,.09,0x55676B);box(-7.65,.045,15.3,.4,.09,.4,0x55676B);
    const blockers=A.solids().map(s=>proxy(null,s.x,.45,s.z,s.w,.9,s.d,false));
    const slots=Array.from({length:16},()=>{const target=proxy(null,0,0,0,1,1,1);target.visible=false;return {target,id:null};});
    staticMesh.count=staticCount;staticMesh.instanceMatrix.needsUpdate=true;staticMesh.instanceColor.needsUpdate=true;parcelMesh.count=0;markMesh.count=glyphCount;markMesh.instanceMatrix.needsUpdate=true;markMesh.instanceColor.needsUpdate=true;
    const part=(x,y,z,w,h,hex,rx=0,rz=0)=>{if(partCount>=16*12)throw Error('Conveyor parcel capacity exceeded');put(markMesh,glyphCount+partCount++,x,y,z,w,h,1,hex,rx,rz);};
    return {root,staticMesh,parcelMesh,markMesh,slots,buttons,restart,blockers,
      sync(state){
        if(disposed)throw Error('The conveyor was disposed');if(state.packages.length>16)throw Error('Conveyor parcel capacity exceeded');partCount=0;
        for(let i=0;i<16;i++){
          const slot=slots[i],p=state.packages[i];slot.target.visible=!!p;if(!p){slot.id=null;continue;}slot.id=p.id;A.parcelPoint(p,position);
          const x=position.x,z=position.z,size=p.size==='s'?.32:p.size==='l'?.57:.44,h=size*.8,y=b.height+h/2+.04;
          slot.target.userData.interaction='sort-parcel-'+p.id;slot.target.position.set(x,y,z);slot.target.scale.set(size,h,size);
          put(parcelMesh,i,x,y,z,size,h,size,p.tint||0xC99A62);part(x,y,z+size/2+.006,size*.55,h*.7,0xF2EFE4);
          part(x,y+h/2+.003,z,size*.14,size,0xD5C096,-Math.PI/2);for(let bar=0;bar<5;bar++)part(x-size*.18+bar*size*.08,y+.015,z+size/2+.013,size*.025,h*.35,0x27393D);
          if(p.priority)part(x,y-h*.32,z+size/2+.016,size*.52,h*.09,0xD28E28);
          if(p.damage)part(x+size*.23,y+h*.28,z+size/2+.017,size*.25,h*.32,p.damage==='leak'?0x4E5946:0x604633);
          if(p.dg)part(x-size*.28,y+h*.29,z+size/2+.018,size*.18,size*.18,0xD5AD3F,0,Math.PI/4);
          if(p.heavy)part(x-size*.28,y-h*.26,z+size/2+.018,size*.2,h*.23,0x645D7B);
        }
        for(let i=0;i<buttons.length;i++)buttons[i].visible=state.wave?.bins.includes(A.bins[i])||false;restart.visible=!!state.jammed;
        parcelMesh.count=state.packages.length;markMesh.count=glyphCount+partCount;parcelMesh.instanceMatrix.needsUpdate=true;markMesh.instanceMatrix.needsUpdate=true;if(parcelMesh.instanceColor)parcelMesh.instanceColor.needsUpdate=true;markMesh.instanceColor.needsUpdate=true;root.updateMatrixWorld(true);
      },
      dispose(){if(disposed)return;disposed=true;staticMesh.dispose();parcelMesh.dispose();markMesh.dispose();plane.dispose();paint.dispose();proxyPaint.dispose();if(ownsCube)cube.dispose();root.removeFromParent();}
    };
  }
};
