/* Bounded physical drill cues: shared licensed cars/person, analytic water and a small school bus. */
window.OTR=window.OTR||{};
OTR.fpDrivingLessonWorld={
  reserve:{phone:0,ball:180,door:100,water:24,crosswalk:180,bus:350},
  build(scene,m,parent,cube){
    const T=THREE,high=OTR.gfx.high(),root=new T.Group();root.name='driving-drill-cues';parent.add(root);
    const visual={clip:{kind:'phone'},time:0,reduced:false,carX:0,carZ:0,carYaw:0,personX:0,personZ:0,personVisible:false,ballX:0,ballVisible:false,cueZ:0,doorAngle:0,lamps:false,phone:false},proxy={hazardLesson:visual};
    const pool=OTR.fpHazardLessonWorld.build(scene,proxy,root,cube),paint=new T.MeshLambertMaterial({color:0xffffff,vertexColors:true}),red=new T.MeshBasicMaterial({color:0xC52E35}),white=new T.MeshBasicMaterial({color:0xF5F5E9,side:T.DoubleSide});
    const waterPaint=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float time;void main(){float wave=pow(.5+.5*sin((p.x+p.y*.3)*88.+time),18.);gl_FragColor=vec4(mix(vec3(.07,.14,.19),vec3(.46,.59,.61),wave*.6),1.);}'});
    const water=new T.Mesh(new T.CircleGeometry(1,high?32:12),waterPaint);water.rotation.x=-Math.PI/2;water.scale.set(6.5,3.75,1);root.add(water);
    const bus=new T.Group();root.add(bus);const scratch=new T.Object3D(),color=new T.Color(),parts=[],faces=[],plane=new T.PlaneGeometry(1,1);
    const part=(x,y,z,w,h,d,c)=>parts.push({x,y,z,w,h,d,c}),face=(x,y,z,w,h,c,ry=0)=>faces.push({x,y,z,w,h,c,ry});
    part(0,1.6,0,2.6,2.5,12,0xE6B94F);for(const x of [-1.32,1.32])for(const z of [-4.4,4.4])part(x,.5,z,.18,.92,.92,0x29343A);
    for(const z of [-6.05,6.05])part(0,.55,z,2.65,.18,.1,0x53616A);
    for(const x of [-1.305,1.305]){
      if(high)for(let i=0;i<7;i++)face(x,2.05,-4.5+i*1.4,1.08,.7,0x2F4754,x<0?-Math.PI/2:Math.PI/2);
      else face(x,2.05,0,9.6,.7,0x2F4754,x<0?-Math.PI/2:Math.PI/2);
    }
    face(0,2.0,6.01,2.15,.85,0x2F4754);face(0,2.0,-6.01,1.6,.75,0x2F4754,Math.PI);
    for(const x of [-.85,.85]){face(x,.95,6.02,.3,.24,0xF5E5BA);face(x,.95,-6.02,.3,.24,0xBE343B,Math.PI);}
    const body=new T.InstancedMesh(cube,paint,parts.length),glass=new T.InstancedMesh(plane,paint,faces.length);body.frustumCulled=glass.frustumCulled=false;bus.add(body,glass);
    for(let i=0;i<parts.length;i++){const p=parts[i];scratch.position.set(p.x,p.y,p.z);scratch.rotation.set(0,0,0);scratch.scale.set(p.w,p.h,p.d);scratch.updateMatrix();body.setMatrixAt(i,scratch.matrix);body.setColorAt(i,color.setHex(p.c));}
    for(let i=0;i<faces.length;i++){const p=faces[i];scratch.position.set(p.x,p.y,p.z);scratch.rotation.set(0,p.ry,0);scratch.scale.set(p.w,p.h,1);scratch.updateMatrix();glass.setMatrixAt(i,scratch.matrix);glass.setColorAt(i,color.setHex(p.c));}
    const arm=new T.Group();arm.position.set(1.35,1.5,2.6);bus.add(arm);
    const sign=new T.Mesh(new T.CircleGeometry(.47,8),red);sign.material.side=T.DoubleSide;sign.position.x=.55;arm.add(sign);
    const pixels=[];for(let ch=0;ch<4;ch++){const rows=OTR.fpSignLettering.rows['STOP'[ch]];for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(rows[y][x]==='1')pixels.push([(ch*6+x-11.5)*.029,(3-y)*.029]);}
    const ink=new T.InstancedMesh(plane,white,pixels.length*2);ink.frustumCulled=false;arm.add(ink);
    for(let i=0;i<ink.count;i++){const p=pixels[i%pixels.length],back=i>=pixels.length;scratch.position.set(.55+(back?-p[0]:p[0]),p[1],back?-.01:.01);scratch.rotation.set(0,back?Math.PI:0,0);scratch.scale.set(.024,.024,1);scratch.updateMatrix();ink.setMatrixAt(i,scratch.matrix);}
    const lampGeometry=new T.PlaneGeometry(.27,.24),lamps=new T.InstancedMesh(lampGeometry,red,4);lamps.frustumCulled=false;bus.add(lamps);
    for(let i=0;i<4;i++){scratch.position.set(i%2?.87:-.87,2.6,i<2?6.025:-6.025);scratch.rotation.set(0,i<2?0:Math.PI,0);scratch.scale.set(1,1,1);scratch.updateMatrix();lamps.setMatrixAt(i,scratch.matrix);}
    const crossing=new T.InstancedMesh(cube,white,7);crossing.frustumCulled=false;root.add(crossing);for(let i=0;i<7;i++){scratch.position.set(-4.5+i*1.5,.055,0);scratch.rotation.set(0,0,0);scratch.scale.set(.7,.025,2);scratch.updateMatrix();crossing.setMatrixAt(i,scratch.matrix);}
    const api={root,pool,water,bus,arm,lamps,crossing,ink,baseDecor:null,reserve:-1,
      sync(model,reduced){
        const h=model.drivingLesson.hazard,dir=h.dir||1,town=scene.art?.townArt,reserve=h.active?(OTR.fpDrivingLessonWorld.reserve[h.kind]||0):0;
        if(!high&&town&&reserve!==this.reserve){if(this.baseDecor===null)this.baseDecor=town.triangleLimit;town.triangleLimit=Math.max(0,this.baseDecor-reserve);town.select(model.van.x,model.van.z);this.reserve=reserve;}
        root.visible=!!h.active;if(!h.active)return;
        const kind=h.kind;visual.clip.kind=kind==='crosswalk'?'phone':kind;visual.time=h.t;visual.reduced=!!reduced;
        visual.carX=kind==='door'?h.carX:h.street+dir*(model.town.road/2-.9);visual.carZ=h.z+(kind==='ball'?3.4*(1-dir):0);visual.carYaw=-h.yaw;
        visual.personX=h.personX;visual.personZ=h.personZ;visual.personVisible=h.personVisible;visual.ballX=h.ballX;visual.ballVisible=h.ballVisible;visual.cueZ=h.z;visual.doorAngle=-h.doorReach*1.2;visual.lamps=kind==='door'&&h.opened;visual.phone=h.phone;
        pool.sync(proxy,reduced);pool.root.visible=kind==='ball'||kind==='door'||kind==='crosswalk';pool.person.rotation.y=dir>0?-Math.PI/2:Math.PI/2;
        water.visible=kind==='water';water.position.set(h.x,.07,h.z);waterPaint.uniforms.time.value=reduced?0:h.t*.8;
        bus.visible=kind==='bus';bus.position.set(h.busX||h.x,0,h.busZ||h.z);bus.rotation.y=-h.yaw;arm.visible=!!h.armOut;lamps.visible=!!h.armOut&&(reduced||Math.floor(h.t*2.38)%2===0);
        crossing.visible=kind==='crosswalk';crossing.position.set(h.street,0,h.z);
      },
      dispose(){pool.dispose();paint.dispose();red.dispose();white.dispose();waterPaint.dispose();}
    };api.sync(m,false);return api;
  }
};
