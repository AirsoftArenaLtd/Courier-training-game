/* Scene-owned town art. Generated lots, solids, doors and reports remain the mission's. */
window.OTR=window.OTR||{};
OTR.fpTown={
  build(scene,m,parent,box,material){
    if(!m.town)return null;
    const T=THREE,high=OTR.gfx.high(),bank=scene.assetBank,groups=[],choices=[],order=[],batches=[];
    const paint=new T.MeshLambertMaterial({color:0xFFFFFF,vertexColors:true}),detailPaint=[];
    const obstructions=OTR.fpNav?OTR.fpNav.obstacles(m):[];let obstructionIndex=0;
    const plans=new Map(),lots=m.town.lots.filter(l=>!m.stops.some(s=>s.lotId===l.id));
    const footprint=(model,p,parts)=>{
      const bounds=new T.Box3(),point=new T.Vector3(),matrix=new T.Matrix4();
      for(const [x,y,z,w,h,d] of parts){bounds.expandByPoint(point.set(x-w/2,y-h/2,z-d/2));bounds.expandByPoint(point.set(x+w/2,y+h/2,z+d/2));}
      if(model){const fit=new T.Matrix4().compose(new T.Vector3(p.x,p.y||0,p.z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),p.yaw||0),new T.Vector3(p.w/model.size.x,p.h/model.size.y,p.d/model.size.z)).multiply(model.origin);
        for(const part of model.parts){part.geometry.computeBoundingBox();bounds.union(part.geometry.boundingBox.clone().applyMatrix4(matrix.multiplyMatrices(fit,part.matrix)));}
      }
      return bounds.isEmpty()?null:{x:(bounds.min.x+bounds.max.x)/2,z:(bounds.min.z+bounds.max.z)/2,w:bounds.max.x-bounds.min.x,d:bounds.max.z-bounds.min.z,minY:bounds.min.y,maxY:bounds.max.y};
    };
    const fallback=(choice,parts)=>{for(const part of parts){const mesh=box(parent,...part);mesh.userData.fpBatchEntry.town=choice;}};
    const choice=(use,placement,house,parts)=>{
      const model=bank&&bank.models.get(use),available=!!model,c={use,x:placement.x,z:placement.z,house,lotId:placement.lotId||null,height:placement.h,available,selected:false,distance:0,cost:available?model.parts.reduce((n,p)=>n+(p.geometry.index?p.geometry.index.count:p.geometry.attributes.position.count)/3,0):parts.length*12};
      c.footprint=footprint(model,placement,parts);if(c.footprint)Object.assign(c.footprint,{kind:house?'house':'prop',lotId:c.lotId});choices.push(c);order.push(c);
      if(available){if(!plans.has(use))plans.set(use,[]);plans.get(use).push({...placement,choice:c});}
      fallback(c,parts);return c;
    };
    lots.forEach((l,i)=>{
      const hasCar=i%5===0,use=l.h>5?'town-shop':i%2?'town-house-wide':'town-house';
      const side=l.side||1;
      choice(use,{lotId:l.id,x:l.x+side*l.w*.13,z:l.z,w:l.d,h:l.h,d:l.w*.72,yaw:-side*Math.PI/2},true,[[l.x+side*l.w*.13,l.h/2,l.z,l.w*.72,l.h,l.d,0xBBC7BE]]);
      // Decoration stays inside already-solid non-delivery lots; the public paths stay clear.
      if(i%3===0){const x=l.x-side*l.w*.36,z=l.z+l.d*.34;choice('town-tree',{lotId:l.id,x,z,w:1.2,h:3.2,d:1.2},false,[[x,.7,z,.22,1.4,.22,0x826B53],[x,2,z,1.2,2.2,1.2,0x607D54]]);}
      if(i%2===0){const x=l.x-side*l.w*.36,z=l.z-l.d*.46;choice('town-fence',{lotId:l.id,x,z,w:l.w*.22,h:.8,d:.12},false,[[x,.4,z,l.w*.22,.8,.12,0x927557]]);}
      if(i%4===0){const x=l.x-side*l.w*.45,z=l.z-l.d*.35;choice('town-streetlight',{lotId:l.id,x,z,w:.18,h:3.5,d:1},false,[[x,1.75,z,.12,3.5,.12,0x6E737B],[x,3.4,z+.4,.18,.15,.9,0xD7DDDB]]);}
      if(hasCar){const o=obstructions[obstructionIndex++],x=o?o.x:l.x-side*l.w*.38,z=o?o.z:l.z,w=o?o.w:Math.min(1.7,l.w*.18),d=o?o.d:Math.min(3.8,l.d*.7);const c=choice('town-parked-car',{lotId:o?null:l.id,x,z,w,h:1.35,d},false,[[x,.4,z,w,.65,d,0x587C91],[x,.95,z,w*.8,.55,d*.5,0x668193]]);c.obstruction=!!o;}
    });
    const town=m.town;
    for(const x of town.xs)for(let i=1;i<town.zs.length;i++){
      const a=town.zs[i-1],b=town.zs[i],z=(a+b)/2,d=Math.abs(b-a)-town.road;
      if(d>1)choice('town-road',{x,z,y:.018,w:town.road,h:.025,d},false,[]);
    }
    for(const z of town.zs)for(let i=1;i<town.xs.length;i++){
      const a=town.xs[i-1],b=town.xs[i],x=(a+b)/2,w=Math.abs(b-a)-town.road;
      if(w>1)choice('town-road',{x,z,y:.018,w:town.road,h:.025,d:w,yaw:Math.PI/2},false,[]);
    }
    // A few source-detail benches stay in private unused yards, with actual source/fallback bounds.
    if(high&&bank&&bank.models.has('town-bench')){let count=0;for(let i=1;i<lots.length&&count<4;i+=6){const l=lots[i],side=l.side||1,p={lotId:l.id,x:l.x-side*l.w*.36,z:l.z-l.d*.3,w:1.6,h:.85,d:.6,yaw:-side*Math.PI/2},b=footprint(bank.models.get('town-bench'),p,[]);
      if(!b||Math.abs(b.x-l.x)+b.w/2>l.w/2-.15||Math.abs(b.z-l.z)+b.d/2>l.d/2-.15||choices.some(c=>{const a=c.footprint;return a&&a.minY<1.8&&a.maxY>.05&&Math.abs(a.x-b.x)<(a.w+b.w)/2+.15&&Math.abs(a.z-b.z)<(a.d+b.d)/2+.15;}))continue;
      choice('town-bench',p,false,[]);count++;
    }}
    if(bank)for(const [use,placements] of plans){
      const group=bank.add(parent,use,placements);if(!group)continue;groups.push(group);
      for(const batch of group.userData.batches){
        if(use==='town-bench'){const benchPaint=paint.clone();benchPaint.vertexColors=false;benchPaint.color.copy(batch.mesh.material.color);detailPaint.push(benchPaint);batch.mesh.material=benchPaint;}else batch.mesh.material=paint;batch.mesh.geometry.computeBoundingSphere();
        batch.entries.forEach((e,i)=>{e.town=placements[i].choice;e.sphere=batch.mesh.geometry.boundingSphere.clone().applyMatrix4(e.matrix);});
        batches.push(batch);
      }
    }
    // Cheap analytic road/kerb grain, without an image texture or an extra draw. Source roads add palette/kerb detail.
    const ground=material(0xFFFFFF),before=ground.onBeforeCompile,cache=ground.customProgramCacheKey;
    ground.onBeforeCompile=function(shader,renderer){before.call(this,shader,renderer);
      shader.vertexShader='varying vec3 otrTownPosition;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvec4 townP=vec4(transformed,1.);\n#ifdef USE_INSTANCING\ntownP=instanceMatrix*townP;\n#endif\notrTownPosition=(modelMatrix*townP).xyz;');
      shader.fragmentShader='varying vec3 otrTownPosition;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`if(otrTownPosition.y<.16&&otrTownPosition.y>-.08){float grain=fract(sin(dot(floor(otrTownPosition.xz*${high?'18.':'7.'}),vec2(12.9898,78.233)))*43758.5453);outgoingLight*=.96+grain*.08;}\n#include <opaque_fragment>`);
    };ground.customProgramCacheKey=()=>cache.call(ground)+'|otr-town-grain-1';ground.needsUpdate=true;
    paint.onBeforeCompile=ground.onBeforeCompile;paint.customProgramCacheKey=()=>cache.call(paint)+'|otr-town-grain-1';
    for(const p of detailPaint){p.onBeforeCompile=paint.onBeforeCompile;p.customProgramCacheKey=paint.customProgramCacheKey;}
    const compare=(a,b)=>a.distance-b.distance;
    // Reserve decorative geometry for the physical stop furniture and the located damage batch.
    return {groups,batches,choices,lots,paint,footprints:choices.map(c=>c.footprint).filter(Boolean),ambientReserve:0,ambientAllowed:true,triangleLimit:high?Infinity:m.deliveryStops?(m.damage?60:120):m.trafficControl&&m.routePlan.day>=3?180:obstructions.length?260:290,
      select(x,z){
        const radius=high?95:55;let remaining=this.triangleLimit;
        for(const c of choices){c.selected=false;c.distance=(c.x-x)**2+(c.z-z)**2;}
        order.sort((a,b)=>a.distance<radius*radius&&b.distance<radius*radius&&!!a.obstruction!==!!b.obstruction?(a.obstruction?-1:1):compare(a,b));
        // Collision-bearing cars keep their original priority. Ambient detail may use only what remains.
        for(const c of order)if(c.obstruction&&c.distance<radius*radius&&c.cost<=remaining){c.selected=true;remaining-=c.cost;}
        this.ambientAllowed=remaining>=this.ambientReserve;if(this.ambientAllowed)remaining-=this.ambientReserve;
        for(const c of order){if(c.distance>=radius*radius)break;if(c.obstruction||!c.available&&c.house)continue;if(c.cost>remaining)continue;c.selected=true;remaining-=c.cost;}
        for(const batch of batches){let count=0;for(const e of batch.entries)if(e.town.selected)batch.mesh.setMatrixAt(count++,e.matrix);batch.mesh.count=count;batch.mesh.visible=count>0;batch.mesh.instanceMatrix.needsUpdate=true;}
      },
      fallback(entry){const c=entry.town;return !c||c.house?(!c||!c.available||!c.selected):!c.available&&c.selected;},
      dispose(){ground.onBeforeCompile=before;ground.customProgramCacheKey=cache;ground.needsUpdate=true;paint.dispose();detailPaint.forEach(p=>p.dispose());}
    };
  }
};
