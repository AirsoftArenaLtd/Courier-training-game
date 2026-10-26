/* Physical M8 facts and voluntary movement. Source callbacks own every safety check and result. */
window.OTR=window.OTR||{};
OTR.fpWellnessStage={
  inside(point,box){return Math.abs(point.x-box.x)<=box.w/2&&Math.abs(point.z-box.z)<=box.d/2;},
  create(model){
    const stop=model.customerStop;
    if(!stop?.wellness)throw Error('A prepared wellness stop is required');
    const stage={stop,wall:-45,floor:0,time:0,hazards:[],triggers:[],shades:[],solids:[],fitted:false,interiorBuilt:false,
      owner:{x:12.8,z:-43.9,floor:0},bottle:{x:.43,y:1.12,z:-41.9},walkGoal:null,walkTask:null,
      facts:{moving:false,shade:false,interior:false,atWalkGoal:false},
      dog:{x:14,z:-43.2,goalX:14,goalZ:-43.2,sourceX:NaN,visible:false,mood:'alert',moving:false,solid:{x:10000,z:10000,w:.7,d:.45}},
      gate:{x:12,z:-40.6,w:1.5,d:.12,open:false,solid:{x:12,z:-40.6,w:1.5,d:.12}},
      oldX:model.player.x,oldZ:model.player.z};
    model.wellnessStage=stage;
    this.fit(model,stage.wall,(stop.def.lot.spec.steps||0)*.17);
    return stage;
  },
  fit(model,wall,floor){
    const s=model.wellnessStage,d=s.stop;
    // Fit once per world build, including its imported facade; no object creation during walking.
    s.wall=wall;s.floor=floor;s.hazards.length=s.triggers.length=s.shades.length=s.solids.length=0;s.interiorBuilt=false;
    const slots={ice_walk:[8.3,-40.25,2.7,1.55],ice_path:[12,-42.05,2.3,1.5],hose:[11.7,-40.5,1.65,1.5],toys:[12.15,-42,1.1,.95],crack:[8.4,-40.6,1.6,1],puddle:[12,wall+.55,2.3,.85]};
    for(const hazard of d.wellness.hazards){
      const spot=slots[hazard.id];
      if(hazard.id==='steps'){
        for(let i=0;i<(d.def.lot.spec.steps||0);i++)s.hazards.push({id:hazard.id,type:hazard.type,label:hazard.label,x:12,z:wall+1.28+i*.36,y:((d.def.lot.spec.steps||0)-i)*.17+.014,w:2.4,d:.36,step:i});
      }else{
        if(!spot)throw Error('A safety hazard has no physical surface');
        s.hazards.push({id:hazard.id,type:hazard.type,label:hazard.label,x:spot[0],z:spot[1],y:hazard.id==='puddle'?floor:.014,w:spot[2],d:spot[3],step:-1});
      }
    }
    for(let i=0;i<d.wellness.triggers.length;i++){
      const trigger=d.wellness.triggers[i];if(trigger.on==='gate')continue;
      s.triggers.push({index:i,x:12,z:trigger.talk==='charge'?-41.7:wall+1.7,w:4,d:trigger.talk==='charge'?1.8:1.2,inside:false});
    }
    if(d.def.fence){
      s.solids.push({x:8.8,z:s.gate.z,w:4.9,d:.12},{x:15.2,z:s.gate.z,w:4.9,d:.12},s.gate.solid);
    }
    if(d.wellness.ref.dog)s.solids.push(s.dog.solid);
    if(d.content.heat){
      for(const prop of d.def.props||[])if(prop.shade){
        const umbrella=prop.type==='umbrella',x=umbrella?15.2:d.index===1?9:7.3,z=umbrella?wall+1.6:-40.7;
        s.shades.push({kind:prop.type,x,z,w:umbrella?2:3.1,d:umbrella?2:2.6});
        s.solids.push({x:x+(umbrella?0:-.9),z,w:umbrella?.12:.32,d:umbrella?.12:.32});
      }
      s.shades.push({kind:'porch',x:12,z:wall+.6,w:4.8,d:1.2});
    }
    s.owner.x=12.8;s.owner.z=wall+1.1;s.owner.floor=floor;
    if(d.def.lot.interior){
      s.owner.z=wall+.45;
      s.interior={x:12,z:wall+.57,w:4.6,d:.94};
      // This becomes cooling space only when the renderer confirms the actual enclosed vestibule.
      s.solids.push({x:9.55,z:wall+.55,w:.16,d:1.1},{x:14.45,z:wall+.55,w:.16,d:1.1},
        {x:10.45,z:wall+1.12,w:1.8,d:.12},{x:13.55,z:wall+1.12,w:1.8,d:.12});
    }else s.interior=null;
    s.fitted=true;return s;
  },
  solids(model){return model.wellnessStage.solids;},
  observe(model,input,seconds,active=true){
    const s=model.wellnessStage,d=s.stop,K=OTR.fpWellnessStop,p=model.player;
    if(!active||model.paused||!K.active(d))return false;
    const dt=Math.max(0,Math.min(.05,Number(seconds)||0)),facts=s.facts;
    facts.moving=model.mode==='walk'&&Math.hypot(p.x-s.oldX,p.z-s.oldZ)>1e-6;
    s.oldX=p.x;s.oldZ=p.z;s.time+=dt;facts.shade=facts.interior=facts.atWalkGoal=false;
    if(model.mode==='walk'){
      for(const shade of s.shades)if(this.inside(p,shade)){facts.shade=true;break;}
      facts.interior=!!(s.interiorBuilt&&s.interior&&this.inside(p,s.interior));
      // Stair treads share one source hazard: charge its timer once, even on a boundary between treads.
      for(const hazard of d.wellness.hazards){
        for(const box of s.hazards)if(box.id===hazard.id&&this.inside(p,box)){K.hazard(d,hazard.id,facts.moving,!!input.careful,dt);break;}
      }
      for(const trigger of s.triggers){const inside=this.inside(p,trigger);if(inside&&!trigger.inside)K.trigger(d,trigger.index);trigger.inside=inside;}
    }
    const w=d.wellness,r=w.ref;
    // The reference courier supplies relative action distances only. It never moves the real player or camera.
    const progress=OTR.fp.clamp((p.x-1.7)/10.3,0,1);
    r.me.x=r.van.doorX+70+progress*(r.lot.doorX-r.van.doorX-150);
    if(w.walkTask!==s.walkTask){
      s.walkTask=w.walkTask;s.walkGoal=null;
      if(w.walkTask){
        const task=w.walkTask,van=task.sourceX<=r.van.doorX+150;
        if(van)s.walkGoal={x:.05,z:-43.7};
        else if(task.act==='approach')s.walkGoal={x:12,z:s.wall+1.9};
        else{const dx=12-p.x,dz=s.wall+1.5-p.z,length=Math.max(.001,Math.hypot(dx,dz)),distance=Math.min(2.2,Math.max(.65,Math.abs(task.sourceX-r.me.x)/120));s.walkGoal={x:p.x-dx/length*distance,z:p.z-dz/length*distance};}
      }
    }
    if(s.walkGoal)facts.atWalkGoal=model.mode==='walk'&&Math.hypot(p.x-s.walkGoal.x,p.z-s.walkGoal.z)<.65;
    const ready=K.step(d,dt,true,facts);this.pose(model,dt);return ready;
  },
  pose(model,seconds=0){
    const s=model.wellnessStage,d=s.stop,w=d.wellness,r=w.ref,dog=s.dog;
    if(r.gate){s.gate.open=!!r.gate.open;const b=s.gate.solid;b.x=s.gate.open?s.gate.x-s.gate.w/2:s.gate.x;b.z=s.gate.open?s.gate.z-s.gate.w/2:s.gate.z;b.w=s.gate.open?s.gate.d:s.gate.w;b.d=s.gate.open?s.gate.w:s.gate.d;}
    s.owner.x=d.def.lot.interior?13.4:12.8;s.owner.z=w.ownerAtGate?s.gate.z-.22:s.wall+(d.def.lot.interior?.35:1.1);s.owner.floor=w.ownerAtGate?0:s.floor;
    if(r.dog){
      dog.visible=!r.dogGone&&r.dog.c.alpha>.5;dog.mood=r.dog.mood||'alert';
      if(dog.sourceX!==r.dog.x){
        dog.sourceX=r.dog.x;
        const p=model.player,dx=12-p.x,dz=s.wall+1-p.z,length=Math.max(.001,Math.hypot(dx,dz));
        const gap=Math.min(2.4,Math.max(.55,Math.abs(r.dog.x-r.me.x)/120));dog.goalX=p.x+dx/length*gap;dog.goalZ=p.z+dz/length*gap;
        if(r.gate&&!r.gate.open)dog.goalZ=Math.min(s.gate.z-.6,dog.goalZ);
        dog.goalX=OTR.fp.clamp(dog.goalX,7,15.8);dog.goalZ=OTR.fp.clamp(dog.goalZ,s.wall+.8,-39.5);
      }
      const dx=dog.goalX-dog.x,dz=dog.goalZ-dog.z,length=Math.hypot(dx,dz),step=Math.max(0,Math.min(.05,seconds))* (dog.mood==='aggressive'?3.4:1.5);
      dog.moving=dog.visible&&length>.015;if(length<=step){dog.x=dog.goalX;dog.z=dog.goalZ;dog.moving=false;}else if(step){dog.x+=dx/length*step;dog.z+=dz/length*step;}
      dog.solid.x=dog.visible?dog.x:10000;dog.solid.z=dog.visible?dog.z:10000;
    }
  },
  clear(model,id){
    const s=model.wellnessStage;if(model.mode!=='walk')return false;
    const box=s.hazards.find(h=>h.id===id);
    return !!box&&Math.hypot(model.player.x-box.x,model.player.z-box.z)<2.3&&OTR.fpWellnessStop.clear(s.stop,id);
  },
  water(model){const s=model.wellnessStage;return (model.mode==='cab'||model.mode==='walk'&&Math.hypot(model.player.x-s.bottle.x,model.player.z-s.bottle.z)<2.3)&&OTR.fpWellnessStop.water(s.stop);},
  rest(model){const s=model.wellnessStage;return (model.mode==='cab'||s.facts.shade)&&OTR.fpWellnessStop.rest(s.stop);}
};
