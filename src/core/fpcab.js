/* Physical cab actions and texture-free, batched interior. Shared settings and scoring stay outside this module. */
window.OTR=window.OTR||{};
OTR.fpCab={
  gears:{'cab-park':2,'cab-reverse':-1,'cab-neutral':0,'cab-drive':1},
  gearName(gear){return gear===2?'P':gear===0?'N':gear===-1?'R':'D';},
  gearReport(m,ok){
    if(m.kind!=='campaign')return;const v=m.van;v.shifts=(v.shifts||0)+1;
    if(OTR.workday)OTR.fpMission.emit(m,'drive.gear',{key:'gear'+v.shifts,stop:m.activeStop+1,ok,where:{x:v.x,z:v.z,mph:Math.abs(v.speed)*2.23694}});
  },
  act(m,id){
    if(!m||m.mode!=='cab')return null;const v=m.van;
    if(Object.hasOwn(this.gears,id))return m.selectGear(this.gears[id])?'':'Stop before selecting a different gear.';
    if(id==='cab-handbrake')v.hand=!v.hand;
    else if(id==='cab-belt')v.belt=!v.belt;
    else if(id==='cab-signal-left'){const next=m.signal===-1?0:-1;if(OTR.fpSignal)OTR.fpSignal.change(m,next);else m.signal=next;}
    else if(id==='cab-signal-right'){const next=m.signal===1?0:1;if(OTR.fpSignal)OTR.fpSignal.change(m,next);else m.signal=next;}
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
    if(id==='cab-signal-left')return m.signal===-1?`The left signal is on. Signal for at least three seconds before moving. Press ${key} to cancel it.`:`Press ${key} to signal left.`;
    if(id==='cab-signal-right')return m.signal===1?`The right signal is on. Signal for at least three seconds before moving. Press ${key} to cancel it.`:`Press ${key} to signal right.`;
    if(id==='cab-exit')return `Press ${key} to open the cab door and get out.`;
    return '';
  },
  build(root,cube,interactions,labels,high){
    const T=THREE,parts=[],sheets=[],scratch=new T.Object3D(),colour=new T.Color();
    const sheet=new T.PlaneGeometry(1,1),paint=high?new T.MeshStandardMaterial({color:0xffffff,side:T.DoubleSide,roughness:.8,metalness:.08}):new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}),rimPaint=high?new T.MeshStandardMaterial({color:0x151D24,side:T.DoubleSide,roughness:.65,metalness:.12}):new T.MeshBasicMaterial({color:0x151D24,side:T.DoubleSide});
    function part(x,y,z,w,h,d,color,id,rx=0,ry=0,rz=0){
      scratch.position.set(x,y,z);scratch.rotation.set(rx,ry,rz);scratch.scale.set(w,h,d);scratch.updateMatrix();
      const p={matrix:scratch.matrix.clone(),color:new T.Color(color),x,y,z,w,h,d,rx,ry,rz};parts.push(p);
      if(id){const o=new T.Mesh(cube,paint);o.matrix.copy(p.matrix);o.matrixAutoUpdate=false;o.layers.set(1);o.userData.interaction=id;root.add(o);interactions.push(o);}
      return p;
    }
    function face(x,y,z,w,h,color,rx=0,ry=0,rz=0){scratch.position.set(x,y,z);scratch.rotation.set(rx,ry,rz);scratch.scale.set(w,h,1);scratch.updateMatrix();sheets.push({matrix:scratch.matrix.clone(),color:new T.Color(color)});}
    function target(id,x,y,z,w,h,d){const o=new T.Mesh(cube,paint);o.position.set(x,y,z);o.scale.set(w,h,d);o.userData.interaction=id;o.layers.set(1);root.add(o);interactions.push(o);return o;}
    // Open windscreen, door trim and passenger backrest. High adds the seat base and console.
    if(high)part(-.72,-.4,-.15,.09,.65,.85,0x303E48);else face(-.675,-.4,-.15,.85,.65,0x303E48,0,Math.PI/2);if(high)part(1.13,-.55,.08,.48,.75,.15,0x43545E);else face(1.13,-.55,.08,.48,.75,0x43545E);
    if(high){part(-.72,.08,-1.02,.055,.92,.055,0x4D5D66,null,0,0,-.12);part(1.55,.08,-1.02,.055,.92,.055,0x4D5D66,null,0,0,.12);}
    else{face(-.72,.08,-.993,.055,.92,0x4D5D66,0,0,-.12);face(1.55,.08,-.993,.055,.92,0x4D5D66,0,0,.12);}
    face(.415,-.4,-1.02,2.27,.28,0x354650);face(.415,-.29,-1.12,2.27,.28,0x26343F,-Math.PI/2);
    // Continuous lining and a floor close the cab around the seated eye, including side glances.
    face(.415,.55,-.12,2.27,1.8,0x56616A,Math.PI/2);face(.415,-.95,-.12,2.27,1.8,0x263139,-Math.PI/2);
    if(high)part(1.55,-.4,-.15,.09,.65,.85,0x303E48);else face(1.505,-.4,-.15,.85,.65,0x303E48,0,Math.PI/2);
    // Keep the mounted display below the windscreen and clear of the physical PRND selector.
    const navX=1.12,navY=-.54;
    face(navX,navY,-1.025,.61,.38,0x17252F);face(navX,navY-.25,-1.03,.055,.12,0x354650);
    let hood=null;
    if(high){part(1.13,-.88,-.08,.5,.15,.58,0x43545E);part(.5,-.77,-.7,.27,.22,.55,0x26343F);part(.415,.52,-1.02,2.27,.055,.06,0x4D5D66);
      // Recessed vents, a gauge hood and glovebox give the dash depth without another batch or texture.
      hood=part(0,-.1,-1.025,.72,.03,.15,0x17252F);part(1.15,-.47,-1,.56,.035,.06,0x17252F);
      part(-.05,.435,-1.005,.48,.11,.035,0x3A444C);part(1.05,.435,-1.005,.48,.11,.035,0x3A444C);
      for(const x of [-.48,.48,1.35]){face(x,-.345,-.953,.16,.075,0x101B23);for(let i=0;i<3;i++)face(x,-.37+i*.025,-.949,.15,.006,0x687780);}
    }
    part(.48,-.42,-.95,.27,.52,.1,0x17252F);
    const shifter=part(.48,-.58,-.86,.09,.08,.08,0x96A5AD);
    for(const [i,id] of ['cab-park','cab-reverse','cab-neutral','cab-drive'].entries()){
      const y=-.25-i*.11;face(.48,y,-.892,.21,.085,0x455863);target(id,.48,y,-.875,.21,.09,.04);
      labels.push({parent:root,cab:true,gear:true,local:new T.Vector3(.35,y,-.86),point:new T.Vector3(),text:['P','R','N','D'][i],max:2.5});
    }
    const brake=part(.5,-.62,-.48,.06,.08,.27,0x657780,'cab-handbrake',-.4);
    const left=part(-.23,-.34,-.75,.18,.035,.04,0x899BA5,'cab-signal-left');
    face(-.23,-.25,-.75,.18,.045,0xA2B1B9);target('cab-signal-right',-.23,-.25,-.75,.18,.045,.05);
    const wipers=part(.23,-.34,-.75,.18,.035,.04,0x899BA5,'cab-wipers');
    const lights=part(-.48,-.29,-1,.08,.09,.07,0x899BA5,'cab-headlights');
    const belt=part(.27,-.66,-.37,.1,.12,.09,0xC6644B,'cab-belt');
    part(-.65,-.45,-.36,.055,.055,.2,0x899BA5,'cab-exit');
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
    // Both presets share the existing two-triangle instrument face. Scales, digits and backlighting
    // are analytic artwork, with no image, text canvas, animation timer or additional render pass.
    const gaugePaint=new T.ShaderMaterial({uniforms:{speed:{value:0},rpm:{value:.2},lit:{value:0}},vertexShader:'varying vec2 p; void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
      precision mediump float; varying vec2 p; uniform float speed; uniform float rpm; uniform float lit;
      float band(float x,float a,float b){return smoothstep(a-.012,a+.012,x)*(1.-smoothstep(b-.012,b+.012,x));}
      float stroke(vec2 q,vec2 a,vec2 b,float w){vec2 d=b-a;float t=clamp(dot(q-a,d)/dot(d,d),0.,1.);return 1.-smoothstep(w,w+.018,length(q-a-d*t));}
      float digit(vec2 q,float n){
        if(abs(q.x)>.34||abs(q.y)>.56)return 0.;
        float a=step(.5,abs(n-1.))*step(.5,abs(n-4.));
        float b=step(.5,abs(n-5.))*step(.5,abs(n-6.));
        float c=step(.5,abs(n-2.));
        float d=step(.5,abs(n-1.))*step(.5,abs(n-4.))*step(.5,abs(n-7.));
        float e=1.-step(.5,min(min(abs(n),abs(n-2.)),min(abs(n-6.),abs(n-8.))));
        float f=step(.5,abs(n-1.))*step(.5,abs(n-2.))*step(.5,abs(n-3.))*step(.5,abs(n-7.));
        float g=step(.5,abs(n))*step(.5,abs(n-1.))*step(.5,abs(n-7.));
        return max(max(max(a*stroke(q,vec2(-.23,.45),vec2(.23,.45),.025),d*stroke(q,vec2(-.23,-.45),vec2(.23,-.45),.025)),g*stroke(q,vec2(-.23,0.),vec2(.23,0.),.025)),
          max(max(b*stroke(q,vec2(.26,.05),vec2(.26,.4),.025),c*stroke(q,vec2(.26,-.05),vec2(.26,-.4),.025)),max(e*stroke(q,vec2(-.26,-.05),vec2(-.26,-.4),.025),f*stroke(q,vec2(-.26,.05),vec2(-.26,.4),.025))));
      }
      vec3 dial(vec2 q,float value,float number,float redline){
        float r=length(q),angle=atan(q.x,q.y),u=(angle+2.35)/4.7,arc=step(0.,u)*step(u,1.);
        vec3 face=mix(vec3(.018,.029,.037),vec3(.065,.083,.092),clamp(1.-r,0.,1.));
        vec3 ink=mix(vec3(.68,.75,.76),vec3(.79,.94,.86),lit);
        float minor=1.-smoothstep(.035,.075,abs(fract(u*40.+.5)-.5));
        float major=1.-smoothstep(.025,.065,abs(fract(u*8.+.5)-.5));
        float ticks=max(minor*band(r,.79,.86),major*band(r,.7,.86))*arc;
        face=mix(face,ink,ticks);
        face=mix(face,vec3(.75,.23,.16),band(r,.87,.9)*arc*step(.8,u)*redline);
        float rim=band(r,.94,.985);face=mix(face,vec3(.33,.39,.42)*(1.+q.y*.2),rim);
        float a=mix(-2.35,2.35,clamp(value,0.,1.));vec2 n=vec2(sin(a),cos(a));
        float needle=stroke(q,n*(-.13),n*.72,.018);face=mix(face,vec3(1.,.42,.2),needle);
        face=mix(face,vec3(.57,.65,.66),1.-smoothstep(.065,.09,r));
        float num=clamp(floor(number+.5),0.,9999.),digits;
        if(redline>.5){vec2 read=(q-vec2(0.,-.4))*vec2(8.,8.5);
          digits=max(max(digit(read+vec2(1.05,0.),floor(num/1000.))*step(1000.,num),digit(read+vec2(.35,0.),mod(floor(num/100.),10.))*step(100.,num)),
            max(digit(read-vec2(.35,0.),mod(floor(num/10.),10.))*step(10.,num),digit(read-vec2(1.05,0.),mod(num,10.))));
        }else{vec2 read=(q-vec2(0.,-.4))*vec2(5.,7.);digits=max(digit(read+vec2(.4,0.),floor(num/10.))*step(10.,num),digit(read-vec2(.4,0.),mod(num,10.)));}
        face=mix(face,ink,digits);return mix(vec3(.025,.038,.047),face,1.-smoothstep(1.,1.025,r));
      }
      void main(){
        vec2 left=(p-vec2(.25,.5))*vec2(7.2,2.54),right=(p-vec2(.75,.5))*vec2(7.2,2.54);
        vec3 colour=p.x<.5?dial(left,speed,speed*40.,0.):dial(right,rpm,rpm*4000.,1.);
        float edge=band(p.x,.008,.992)*band(p.y,.025,.975);colour=mix(vec3(.14,.18,.2),colour,edge);
        gl_FragColor=vec4(colour,1.);
      }`});
    const gauges=new T.Mesh(sheet,gaugePaint);gauges.name='cab-instrument-face';gauges.position.set(0,-.235,-1.005);gauges.scale.set(.61,.215,1);root.add(gauges);
    labels.push({parent:root,cab:true,gauge:'speed',wrap:260,local:new T.Vector3(-.16,-.34,-.99),point:new T.Vector3(),text:'The speed is 0 mph.',max:2.5});
    labels.push({parent:root,cab:true,gauge:'rpm',wrap:260,local:new T.Vector3(.16,-.47,-.99),point:new T.Vector3(),text:'The engine is at 800 RPM.',max:2.5});
    function change(p,rx,rz,color,y=p.y,z=p.z){
      scratch.position.set(p.x,y,z);scratch.rotation.set(rx,p.ry,rz);scratch.scale.set(p.w,p.h,p.d);scratch.updateMatrix();
      batch.setMatrixAt(p.index,scratch.matrix);colour.setHex(color);batch.setColorAt(p.index,colour);
    }
    const navigation={parent:root,cab:true,local:new T.Vector3(navX,navY,-1.005),point:new T.Vector3(),max:2.5};
    let state=-1;return {root,wheel,gauges,hood,parts,batch,navigation,
      sync(m){
        const v=m.van;wheel.rotation.z=-v.steer*3;gaugePaint.uniforms.speed.value=Math.abs(v.speed)/17.8816;gaugePaint.uniforms.rpm.value=(m.motion?m.motion.rpm:800)/4000;gaugePaint.uniforms.lit.value=v.headlights?1:0;
        const next=v.gear+1+4*Number(v.hand)+8*Number(v.belt)+16*Number(!!v.headlights)+32*Number(!!v.wipers)+64*(m.signal+1);if(next===state)return;state=next;
        change(shifter,0,0,0x96A5AD,-.25-(v.gear===2?0:v.gear+2)*.11,shifter.z);
        change(brake,v.hand?-.4:0,0,v.hand?0x96A5AD:0x657780);change(left,0,m.signal*.32,m.signal?0xF5BD63:0x899BA5,left.y+m.signal*.045);
        change(wipers,0,v.wipers?.28:0,v.wipers?0xF5BD63:0x899BA5);change(lights,0,v.headlights?.6:0,v.headlights?0xBFE1D6:0x899BA5);
        change(belt,0,0,v.belt?0x899BA5:0xC6644B,belt.y,v.belt?-.42:-.37);
        batch.instanceMatrix.needsUpdate=true;batch.instanceColor.needsUpdate=true;
      },
      dispose(){paint.dispose();rimPaint.dispose();gaugePaint.dispose();}
    };
  }
};
