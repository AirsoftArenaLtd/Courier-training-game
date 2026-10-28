/* Unloaded physical fixtures. Boxes join the existing world batches; signs use its mounted-lettering batch. */
window.OTR=window.OTR||{};
OTR.fpProblemBlockedWorld={
  signs(m){
    const b=m.blockedProblem,s=b.state,access=s.unsafe?'unsafe':s.locked?'locked':'blocked';
    return [{id:'blocked-access',kind:'blocked-access',access,x:b.warning.x,z:b.warning.z,yaw:Math.PI/2},
      {id:'attempt-card',kind:'attempt-card',x:b.card.x,z:b.card.z,yaw:Math.PI/2}];
  },
  build(parent,m,{box,interactions}){
    const b=m.blockedProblem,c=b.car,card=b.card,sign=this.signs(m)[0],parts=[];
    const add=(x,y,z,w,h,d,color,id,solid=false)=>{const mesh=box(parent,x,y,z,w,h,d,color,id,solid);parts.push(mesh);return mesh;};
    add(c.x,.63,c.z,c.w,1.05,c.d,0xA07648,null,true);
    add(c.x,1.22,c.z-.25,c.w*.85,.55,c.d*.47,0x526672);
    for(const side of [-1,1]){
      for(const dz of [-1.4,1.4])add(c.x+side*c.w/2,.34,c.z+dz,.12,.62,.75,0x28333C);
      add(c.x,.62,c.z+side*c.d/2,c.w,.18,.12,0xD3D9D8);
    }
    if(b.state.unsafe){
      const h=b.hazard;add((h.x0+h.x1)/2,.105,(h.z0+h.z1)/2,h.x1-h.x0,.02,h.z1-h.z0,0x52676B);
      for(const z of [h.z0,h.z1]){add(h.x0,.17,z,.48,.24,.48,0xDF9D3D);add(h.x0,.46,z,.19,.48,.19,0xDF9D3D);}
    }
    for(const g of [b.gate,...b.fences].filter(Boolean)){
      add(g.x,.8,g.z,g.w,1.6,g.d,0x677D7E,null,true);
      add(g.x-.085,1.1,g.z,.025,.05,g.d,0xC6D1CB);
    }
    // The metal holder is a real shared-batch surface and an exact interaction/occlusion proxy.
    const target=add(card.x,card.y,card.z,.24,.78,.7,0xD4DBD7,null,true);target.userData.interaction='blocked-card';interactions.push(target);
    add(card.x-.135,card.y+.19,card.z,.035,.035,.5,0x26343C);
    const paper=add(card.x-.15,card.y-.08,card.z,.025,.36,.34,0xF1E7CF),paperEntry=paper.userData.fpBatchEntry;
    const warning=add(sign.x-.025,2.3,sign.z,.08,.82,.8,0xD9AE4B,'blocked-warning');warning.layers.set(1);
    if(paperEntry)paperEntry.visible=false;
    return {parts,targets:[target,warning],paperEntry,
      sync(model,camera,reduced=false){
        if(paperEntry)paperEntry.visible=!!model.blockedProblem.state.sequence.card;
        const at=model.blockedProblem.slipAt,t=at===null?2:model.blockedProblem.state.elapsed-at;
        if(camera&&!reduced&&model.mode==='walk'&&t>=0&&t<.7)camera.position.y-=Math.sin(t/.7*Math.PI)*.18;
      }
    };
  }
};
