/* Physical cab actions and texture-free, batched interior. Shared settings and scoring stay outside this module. */
window.OTR=window.OTR||{};
OTR.fpCab={
  gears:{'cab-park':2,'cab-reverse':-1,'cab-neutral':0,'cab-drive':1},
  gearName(gear){return gear===2?'P':gear===0?'N':gear===-1?'R':'D';},
  gearReport(m,ok){
    if(m.kind!=='campaign')return;const v=m.van;v.shifts=(v.shifts||0)+1;
    if(OTR.workday)OTR.workday.report('drive.gear',{key:'gear'+v.shifts,stop:m.activeStop+1,ok,where:{x:v.x,z:v.z,mph:Math.abs(v.speed)*2.23694}});
  },
  act(m,id){
    if(!m||m.mode!=='cab')return null;const v=m.van;
    if(Object.hasOwn(this.gears,id))return m.selectGear(this.gears[id])?'':'Stop before selecting a different gear.';
    if(id==='cab-handbrake')v.hand=!v.hand;
    else if(id==='cab-belt')v.belt=!v.belt;
    else if(id==='cab-signal-left')m.signal=m.signal===-1?0:-1;
    else if(id==='cab-signal-right')m.signal=m.signal===1?0:1;
    else if(id==='cab-headlights')v.headlights=!v.headlights;
    else if(id==='cab-wipers')v.wipers=!v.wipers;
    else return null;
    m.touch();return '';
  },
  hint(id,m,key){
    if(id==='cab-park')return m.van.gear===2?'Park is selected.':`Press ${key} to select park (P).`;
    if(id==='cab-reverse')return m.van.gear===-1?'Reverse is selected.':`Press ${key} to select reverse (R).`;
    if(id==='cab-neutral')return m.van.gear===0?'Neutral is selected.':`Press ${key} to select neutral (N).`;
    if(id==='cab-drive')return m.van.gear===1?'Drive is selected.':`Press ${key} to select drive (D).`;
    if(id==='cab-handbrake')return m.van.hand?`The parking brake is on. Press ${key} to release it.`:`The parking brake is off. Press ${key} to set it.`;
    if(id==='cab-belt')return m.van.belt?`The seatbelt is fastened. Press ${key} to release it.`:`The seatbelt is unfastened. Press ${key} to fasten it.`;
    if(id==='cab-headlights')return m.van.headlights?`The headlights are on. Press ${key} to switch them off.`:`The headlights are off. Press ${key} to switch them on.`;
    if(id==='cab-wipers')return m.van.wipers?`The wipers are on. Press ${key} to switch them off.`:`The wipers are off. Press ${key} to switch them on.`;
    if(id==='cab-signal-left')return m.signal===-1?`The left signal is on. Press ${key} to cancel it.`:`Press ${key} to signal left.`;
    if(id==='cab-signal-right')return m.signal===1?`The right signal is on. Press ${key} to cancel it.`:`Press ${key} to signal right.`;
    if(id==='cab-exit')return `Press ${key} to open the cab door and get out.`;
    return '';
  },
  build(root,cube,interactions,labels,high){
    const T=THREE,parts=[],sheets=[],scratch=new T.Object3D(),colour=new T.Color();
    const sheet=new T.PlaneGeometry(1,1),paint=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}),rimPaint=new T.MeshBasicMaterial({color:0x151D24,side:T.DoubleSide});
    function part(x,y,z,w,h,d,color,id,rx=0,ry=0,rz=0){
      scratch.position.set(x,y,z);scratch.rotation.set(rx,ry,rz);scratch.scale.set(w,h,d);scratch.updateMatrix();
      const p={matrix:scratch.matrix.clone(),color:new T.Color(color),x,y,z,w,h,d,rx,ry,rz};parts.push(p);
      if(id){const o=new T.Mesh(cube,paint);o.matrix.copy(p.matrix);o.matrixAutoUpdate=false;o.layers.set(1);o.userData.interaction=id;root.add(o);interactions.push(o);}
      return p;
    }
    function face(x,y,z,w,h,color,rx=0,ry=0,rz=0){scratch.position.set(x,y,z);scratch.rotation.set(rx,ry,rz);scratch.scale.set(w,h,1);scratch.updateMatrix();sheets.push({matrix:scratch.matrix.clone(),color:new T.Color(color)});}
    function target(id,x,y,z,w,h,d){const o=new T.Mesh(cube,paint);o.position.set(x,y,z);o.scale.set(w,h,d);o.userData.interaction=id;o.layers.set(1);root.add(o);interactions.push(o);return o;}
    // Open windscreen, door trim and passenger backrest. High adds the seat base and console.
    if(high)part(-.72,-.4,-.15,.09,.65,.85,0x303E48);else face(-.675,-.4,-.15,.85,.65,0x303E48,0,Math.PI/2);if(high)part(.86,-.55,.08,.48,.75,.15,0x43545E);else face(.86,-.55,.08,.48,.75,0x43545E);
    if(high){part(-.72,.08,-1.02,.055,.92,.055,0x4D5D66,null,0,0,-.12);part(1,.08,-1.02,.055,.92,.055,0x4D5D66,null,0,0,.12);}
    else{face(-.72,.08,-.993,.055,.92,0x4D5D66,0,0,-.12);face(1,.08,-.993,.055,.92,0x4D5D66,0,0,.12);}
    face(.12,-.4,-1.02,1.7,.28,0x354650);face(.12,-.29,-1.12,1.7,.28,0x26343F,-Math.PI/2);
    face(.78,-.085,-1.025,.61,.25,0x17252F);face(.78,-.27,-1.03,.055,.12,0x354650);
    if(high){part(.86,-.88,-.08,.5,.15,.58,0x43545E);part(.5,-.77,-.7,.27,.22,.55,0x26343F);part(.12,.52,-1.02,1.7,.055,.06,0x4D5D66);}
    part(.48,-.42,-.95,.27,.52,.1,0x17252F);
    const shifter=part(.48,-.58,-.86,.09,.08,.08,0xE2CFA4);
    for(const [i,id] of ['cab-park','cab-reverse','cab-neutral','cab-drive'].entries()){
      const y=-.25-i*.11;face(.48,y,-.892,.21,.085,0x455863);target(id,.48,y,-.875,.21,.09,.04);
      labels.push({parent:root,cab:true,gear:true,local:new T.Vector3(.61,y,-.86),point:new T.Vector3(),text:['P','R','N','D'][i],max:2.5});
    }
    const brake=part(.5,-.62,-.48,.06,.08,.27,0xC8BDA1,'cab-handbrake',-.4);
    const left=part(-.23,-.34,-.75,.18,.035,.04,0xD0D8D9,'cab-signal-left');
    face(-.23,-.25,-.75,.18,.045,0xA2B1B9);target('cab-signal-right',-.23,-.25,-.75,.18,.045,.05);
    const wipers=part(.23,-.34,-.75,.18,.035,.04,0xD0D8D9,'cab-wipers');
    const lights=part(-.48,-.29,-1,.08,.09,.07,0xD0D8D9,'cab-headlights');
    const belt=part(.27,-.66,-.37,.1,.12,.09,0xF5BD63,'cab-belt');
    part(-.65,-.45,-.36,.055,.055,.2,0xD0D8D9,'cab-exit');
    const batch=new T.InstancedMesh(cube,paint,parts.length);batch.frustumCulled=false;root.add(batch);
    for(let i=0;i<parts.length;i++){batch.setMatrixAt(i,parts[i].matrix);batch.setColorAt(i,parts[i].color);parts[i].index=i;}
    const panels=new T.InstancedMesh(sheet,paint,sheets.length);panels.frustumCulled=false;root.add(panels);
    sheets.forEach((p,i)=>{panels.setMatrixAt(i,p.matrix);panels.setColorAt(i,p.color);});
    const wheel=new T.Group();wheel.position.set(0,-.39,-.7);root.add(wheel);
    const rim=new T.Mesh(high?new T.TorusGeometry(.18,.023,6,18):new T.RingGeometry(.157,.183,16),rimPaint);wheel.add(rim);
    if(high){const hub=new T.Mesh(cube,rimPaint);hub.scale.set(.075,.065,.035);wheel.add(hub);}
    const spokes=new T.InstancedMesh(sheet,rimPaint,high?3:4);spokes.frustumCulled=false;wheel.add(spokes);
    for(let i=0;i<3;i++){const a=i*2*Math.PI/3;scratch.position.set(Math.sin(a)*.08,Math.cos(a)*.08,0);scratch.rotation.set(0,0,-a);scratch.scale.set(.018,.16,1);scratch.updateMatrix();spokes.setMatrixAt(i,scratch.matrix);}
    if(!high){scratch.position.set(0,0,0);scratch.rotation.set(0,0,0);scratch.scale.set(.075,.065,1);scratch.updateMatrix();spokes.setMatrixAt(3,scratch.matrix);}
    const gaugePaint=new T.ShaderMaterial({uniforms:{speed:{value:0},rpm:{value:.2}},vertexShader:'varying vec2 p; void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
      precision mediump float; varying vec2 p; uniform float speed; uniform float rpm;
      float dial(vec2 v,float value){float r=length(v);float ring=smoothstep(.96,.9,r)*smoothstep(.8,.85,r);
        float a=mix(-2.35,2.35,clamp(value,0.,1.));vec2 n=vec2(sin(a),-cos(a));
        float t=clamp(dot(v,n),0.,.72);float needle=1.-smoothstep(.025,.045,length(v-n*t));
        float ticks=step(.91,fract(atan(v.x,v.y)*1.91))*step(.7,r)*step(r,.86);return max(needle,max(ring,ticks));}
      void main(){vec2 a=(p-vec2(.25,.5))*vec2(4.,2.);vec2 b=(p-vec2(.75,.5))*vec2(4.,2.);
        float ink=max(dial(a,speed),dial(b,rpm));gl_FragColor=vec4(mix(vec3(.045,.075,.09),vec3(.95,.87,.65),ink),1.);}`});
    const gauges=new T.Mesh(sheet,gaugePaint);gauges.position.set(0,-.235,-1.005);gauges.scale.set(.61,.18,1);root.add(gauges);
    labels.push({parent:root,cab:true,gauge:'speed',wrap:260,local:new T.Vector3(-.16,-.34,-.99),point:new T.Vector3(),text:'The speed is 0 mph.',max:2.5});
    labels.push({parent:root,cab:true,gauge:'rpm',wrap:260,local:new T.Vector3(.16,-.47,-.99),point:new T.Vector3(),text:'The engine is at 800 RPM.',max:2.5});
    function change(p,rx,rz,color,y=p.y,z=p.z){
      scratch.position.set(p.x,y,z);scratch.rotation.set(rx,p.ry,rz);scratch.scale.set(p.w,p.h,p.d);scratch.updateMatrix();
      batch.setMatrixAt(p.index,scratch.matrix);colour.setHex(color);batch.setColorAt(p.index,colour);
    }
    const navigation={parent:root,cab:true,local:new T.Vector3(.78,-.085,-1.005),point:new T.Vector3(),max:2.5};
    let state=-1;return {root,wheel,gauges,parts,batch,navigation,
      sync(m){
        const v=m.van;wheel.rotation.z=-v.steer*3;gaugePaint.uniforms.speed.value=Math.abs(v.speed)/17.8816;gaugePaint.uniforms.rpm.value=(m.motion?m.motion.rpm:800)/4000;
        const next=v.gear+1+4*Number(v.hand)+8*Number(v.belt)+16*Number(!!v.headlights)+32*Number(!!v.wipers)+64*(m.signal+1);if(next===state)return;state=next;
        change(shifter,0,0,0xE2CFA4,-.25-(v.gear===2?0:v.gear+2)*.11,shifter.z);
        change(brake,v.hand?-.4:0,0,v.hand?0xE2CFA4:0xA2B1B9);change(left,0,m.signal*.32,m.signal?0xF5BD63:0xD0D8D9,left.y+m.signal*.045);
        change(wipers,0,v.wipers?.28:0,v.wipers?0xF5BD63:0xD0D8D9);change(lights,0,v.headlights?.6:0,v.headlights?0xE2E9CC:0xD0D8D9);
        change(belt,0,0,v.belt?0xD0D8D9:0xF5BD63,belt.y,v.belt?-.42:-.37);
        batch.instanceMatrix.needsUpdate=true;batch.instanceColor.needsUpdate=true;
      },
      dispose(){paint.dispose();rimPaint.dispose();gaugePaint.dispose();}
    };
  }
};
