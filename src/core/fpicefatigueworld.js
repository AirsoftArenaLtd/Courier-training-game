/* Fixed surfaces and physical notices join the existing batches. One bounded lettering mesh, no new texture/pass. */
window.OTR=window.OTR||{};
OTR.fpIceFatigueWorld={
  build(parent,m,{box}){
    const a=m.iceFatigue,ice=a.kind==='ice',b=a.park,parts=[],high=OTR.gfx.high();
    const add=(x,y,z,w,h,d,color,id,solid=false)=>{const p=box(parent,x,y,z,w,h,d,color,id,solid);parts.push(p);return p;};
    for(const side of [-1,1])add(b.x+side*b.w/2,.075,b.z,.07,.02,b.d,0xEFEDE1);
    for(const side of [-1,1])add(b.x,.075,b.z+side*b.d/2,b.w,.02,.07,0xEFEDE1);
    const sx=a.notice.x,sz=a.notice.z;
    add(sx,.75,sz,.09,1.5,.09,0x66747A,null,true);add(sx,1.55,sz,.95,.72,.08,ice?0xE2BB53:0x527F98);
    const root=new THREE.Group();parent.add(root);const words=OTR.fpMountedWords.build(root,{high,capacity:high?3072:256});
    words.write(ice?'ICE':'REST',sx,1.65,sz+.047,.8,.2);words.write(ice?'USE GRIT':'PARK HERE',sx,1.39,sz+.047,.8,.15);words.finish();
    const notice=add(sx,1.55,sz+.01,.95,.72,.12,0xFFFFFF,'wellness-road-notice');notice.layers.set(1);
    let rail=null;
    if(ice){
      const i=a.ice.ice,g=a.ice.grit;
      add(i.x,.105,i.z,i.w,.018,i.d,0x95AFBC);add(g.x,.119,g.z,g.w,.015,g.d,0x8D7B60);
      for(let n=0;n<12;n++){const x=i.x-i.w/2+.16+n*.32;add(x,.126,g.z+(n%2?.16:-.12),.08,.014,.06,0xD1B985);}
      for(const x of [5.65,7.7,9.75])add(x,.55,-39.65,.09,1.1,.09,0x6B7E83,null,true);
      add(7.7,1.04,-39.65,4.2,.09,.09,0x697A80);
      rail=add(7.7,.98,-39.65,4.2,.24,.13,0xFFFFFF,'wellness-handrail');rail.layers.set(1);
    }
    return {parts,words,targets:rail?[notice,rail]:[notice],batches:[{mesh:words.mesh,entries:words.entries}],
      sync(model,camera,reduced){const s=model.iceFatigue.state,t=s.slipAt===null?2:s.time-s.slipAt;if(ice&&camera&&!reduced&&model.mode==='walk'&&t>=0&&t<.7)camera.position.y-=Math.sin(t/.7*Math.PI)*.18;},
      dispose(){words.dispose();root.removeFromParent();}
    };
  }
};
