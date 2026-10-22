/* Derived ambient placements and poses. Mission geometry, stops, reports and saves stay read-only. */
window.OTR=window.OTR||{};
OTR.fpAmbient={
  limit(high){return high?2:1;},
  hash(seed,id){let h=(seed>>>0)^2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619);return h>>>0;},
  plan(m,footprints,radius=.45){
    if(!m||m.kind!=='campaign'||!m.town||!Array.isArray(m.town.lots)||!Array.isArray(m.stops)||!Array.isArray(footprints)||!Number.isFinite(radius)||radius<=0||radius>.9)return [];
    const valid=b=>b&&[b.x,b.z,b.w,b.d].every(Number.isFinite)&&b.w>0&&b.d>0;
    // The renderer supplies the union of imported and procedural bounds, including props.
    for(const b of footprints)if(!valid(b)||!Number.isFinite(b.minY??0)||!Number.isFinite(b.maxY??b.h??3))return [];
    const plans=[],padding=.15,seed=m.seed||0;
    for(const lot of m.town.lots){
      if(plans.length>=256)break;
      if(!valid(lot)||lot.id==='depot'||lot.kind==='depot'||m.stops.some(s=>s.lotId===lot.id))continue;
      if(!footprints.some(b=>b.kind==='house'&&b.lotId===lot.id))continue;
      const side=lot.side===-1?-1:1,span=Math.min(1.2,lot.d*.1);let chosen=null;
      for(const travel of [span,0]){
        for(const across of [.4,.34,.28]){
          for(const along of [0,.22,-.22]){
            const x=lot.x-side*lot.w*across,z=lot.z+lot.d*along,w=radius*2,d=(radius+travel)*2;
            if(Math.abs(x-lot.x)+w/2>lot.w/2-padding||Math.abs(z-lot.z)+d/2>lot.d/2-padding)continue;
            let clear=true;
            for(const b of footprints){
              if((b.minY??0)>1.8||(b.maxY??b.h??3)<.05)continue;
              if(Math.abs(x-b.x)<(w+b.w)/2+padding&&Math.abs(z-b.z)<(d+b.d)/2+padding){clear=false;break;}
            }
            if(clear){const rank=this.hash(seed,lot.id);chosen={lotId:lot.id,x,z,span:travel,radius,streetYaw:-side*Math.PI/2,phase:(rank%8000)/1000,rank};break;}
          }
          if(chosen)break;
        }
        if(chosen)break;
      }
      if(chosen)plans.push(chosen);
    }
    return plans;
  },
  sample(site,time,reduced,out){
    out.x=site.x;out.y=0;out.z=site.z;out.yaw=site.streetYaw;out.walking=false;
    if(reduced||!site.span)return out;
    const phase=((Number.isFinite(time)?Math.max(0,time):0)+site.phase)%8;
    const along=phase<3?-1+phase*2/3:phase<4?1:phase<7?1-(phase-4)*2/3:-1;
    out.z+=site.span*along;out.walking=phase<3||phase>=4&&phase<7;
    // Turn during each one-second pause; there is no orientation jump at the loop boundary.
    out.yaw=phase<3?0:phase<4?(phase-3)*Math.PI:phase<7?Math.PI:Math.PI+(phase-7)*Math.PI;
    return out;
  },
  build(scene,m,parent,town,box,paint){
    if(!town)return null;
    const T=THREE,high=OTR.gfx.high(),selection=this.create(m,town.footprints,high,high?.6:.45),people=[],fallbacks=[],ownedPaint=!paint;
    if(!selection.sites.length)return null;
    paint=paint||new T.MeshLambertMaterial({color:0xffffff,vertexColors:true,side:T.DoubleSide});
    const bank=scene.assetBank,models=bank&&bank.models,root=new T.Object3D(),up=new T.Vector3(0,1,0);
    for(let i=0;i<selection.slots.length;i++){
      const model=high&&models&&models.get(i?'ambient-adult-b':'ambient-adult-a'),a=model&&OTR.fpActors.character(model,paint,0xffffff);
      if(a){a.mesh.name='actor:ambient-'+i;a.mesh.scale.copy(OTR.fpActors.ambientScale(model));a.mesh.frustumCulled=true;a.geometry.boundingSphere=new T.Sphere(new T.Vector3(0,1/a.mesh.scale.y,0),1.4/Math.min(a.mesh.scale.x,a.mesh.scale.y,a.mesh.scale.z));parent.add(a.mesh);a.mesh.visible=false;}
      people.push(a||null);const parts=[];
      if(!a)for(const [y,w,h,d,color] of [[1.1,.45,.75,.27,i?0x846997:0x608987],[1.65,.3,.32,.3,0xB68F72],[.38,.38,.75,.19,0x43515E]]){
        const mesh=box(parent,0,y,0,w,h,d,color),entry=mesh.userData.fpBatchEntry;entry.visible=false;entry.sphere=new T.Sphere(new T.Vector3(),Math.hypot(w,h,d)/2);parts.push({entry,local:entry.matrix.clone(),y});
      }
      fallbacks.push(parts);
    }
    // The Low silhouette uses three cubes in the existing route draw (36 triangles).
    // Whole-frame loaded/fallback sweeps, rather than this reservation alone, are the gate.
    const reserved=high?0:36;town.ambientReserve=reserved;
    return {selection,people,fallbacks,reserved,
      sync(model,x,z,reduced){
        const slots=selection.select(model,x,z,reduced);
        if(!town.ambientAllowed)for(const slot of slots)slot.visible=false;
        for(let i=0;i<slots.length;i++){
          const slot=slots[i],a=people[i];if(a){a.mesh.visible=slot.visible;if(slot.visible){a.mesh.position.set(slot.x,0,slot.z);a.mesh.rotation.y=slot.yaw;a.pose(slot.walking?'Walk':'Idle_Neutral',model.elapsed,reduced,true);}}
          if(!fallbacks[i].length)continue;root.position.set(slot.x,0,slot.z);root.quaternion.setFromAxisAngle(up,slot.yaw);root.updateMatrix();
          for(const part of fallbacks[i]){part.entry.visible=slot.visible;if(slot.visible){part.entry.matrix.multiplyMatrices(root.matrix,part.local);part.entry.sphere.center.set(slot.x,part.y,slot.z);}}
        }
      },
      dispose(){selection.dispose();for(const a of people)if(a)a.dispose();if(ownedPaint)paint.dispose();}
    };
  },
  create(model,footprints,high=false,radius=.45){
    const F=this,sites=F.plan(model,footprints,radius),limit=F.limit(high),range2=(high?35:22)**2;
    const slots=Array.from({length:limit},()=>({site:null,distance:range2,visible:false,x:0,y:0,z:0,yaw:0,walking:false}));let closed=false;
    return {sites,slots,
      select(m,x,z,reduced=false){
        for(const slot of slots){slot.site=null;slot.distance=range2;slot.visible=false;}
        if(closed||!m||m.kind!=='campaign'||!Array.isArray(m.stops)||!Number.isFinite(x)||!Number.isFinite(z))return slots;
        for(const site of sites){
          // A dispatch update can turn a previously unused lot into a delivery without rebuilding this cache.
          let delivery=false;for(const stop of m.stops)if(stop.lotId===site.lotId){delivery=true;break;}if(delivery)continue;
          const distance=(site.x-x)**2+(site.z-z)**2;if(distance>=range2)continue;
          for(let at=0;at<limit;at++)if(distance<slots[at].distance||distance===slots[at].distance&&slots[at].site&&site.rank<slots[at].site.rank){
            for(let next=limit-1;next>at;next--){slots[next].site=slots[next-1].site;slots[next].distance=slots[next-1].distance;}
            slots[at].site=site;slots[at].distance=distance;break;
          }
        }
        for(const slot of slots)if(slot.site){slot.visible=true;F.sample(slot.site,m.elapsed,reduced,slot);}
        return slots;
      },
      dispose(){closed=true;sites.length=0;for(const slot of slots){slot.site=null;slot.visible=false;}}
    };
  }
};
