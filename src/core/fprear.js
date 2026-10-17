/* Automatic rear view, bounded parking sensors and optional reversing practice. Scores stay in workday. */
window.OTR=window.OTR||{};
OTR.fpRear={
  spots:['alley','dock','tight-drive'],
  names:['Practice reversing in the alley.','Practice reversing to the dock.','Practice reversing in the tight driveway.'],
  valid(v,elapsed){return v===undefined||Array.isArray(v)&&v.length===3&&Number.isFinite(v[0])&&v[0]>=0&&v[0]<=elapsed+.05&&typeof v[1]==='boolean'&&typeof v[2]==='boolean';},
  setupPractice(m){
    const index=(m.seed-1)%3,width=[4.8,6,3.2][index];
    m.parking={done:false};m.parkingSpot=this.spots[index];m.parkingBay={x:0,z:-53,yaw:0,width};
    m.parkingWalls=[{x:-width/2,z:-56,w:.18,d:14,h:1.5},{x:width/2,z:-56,w:.18,d:14,h:1.5},{x:0,z:-49,w:width,d:.2,h:index===1?2:1.2}];
    m.solids.push(...m.parkingWalls);m.parcels=[];m.phase='route';m.mode='cab';m.departed=m.secured=true;
    Object.assign(m.van,{x:0,z:-65,yaw:0,gear:2,hand:true,belt:true});m.traffic.forEach((c,i)=>Object.assign(c,{x:i?18:-18,z:-130,speed:0}));
    m.crossing.state='resolved';
    OTR.fpDriving.configure(m);
  },
  ray(x,z,dx,dz,b,padX=0,padZ=0){
    let near=0,far=6;
    for(let axis=0;axis<2;axis++){
      const at=axis?z:x,dir=axis?dz:dx,centre=axis?b.z:b.x,half=(axis?b.d:b.w)/2+(axis?padZ:padX);
      if(Math.abs(dir)<1e-8){if(at<centre-half||at>centre+half)return 6;continue;}
      let a=(centre-half-at)/dir,c=(centre+half-at)/dir;if(a>c){const t=a;a=c;c=t;}near=Math.max(near,a);far=Math.min(far,c);if(near>far)return 6;
    }
    return near;
  },
  sense(m){
    const r=m.rearSense||(m.rearSense={left:6,centre:6,right:6,distance:6,band:0}),v=m.van,c=Math.cos(v.yaw),s=Math.sin(v.yaw);
    const dynamic=m._rearBox||(m._rearBox={x:0,z:0,w:0,d:0});
    for(let i=0;i<3;i++){
      const side=(i-1)*.75,x=v.x+c*side-s*2.72,z=v.z+s*side+c*2.72,padX=Math.abs(c)*.45,padZ=Math.abs(s)*.45;let distance=6;
      for(const b of m.solids)distance=Math.min(distance,this.ray(x,z,-s,c,b,padX,padZ));
      for(const car of m.traffic){const vertical=Math.abs(Math.cos(car.yaw))>.7;dynamic.x=car.x;dynamic.z=car.z;dynamic.w=vertical?1.8:3.6;dynamic.d=vertical?3.6:1.8;distance=Math.min(distance,this.ray(x,z,-s,c,dynamic,padX,padZ));}
      if(m.crossing.state==='crossing'){dynamic.x=m.crossing.x;dynamic.z=m.crossing.z;dynamic.w=dynamic.d=.8;distance=Math.min(distance,this.ray(x,z,-s,c,dynamic,padX,padZ));}
      if(i===0)r.left=distance;else if(i===1)r.centre=distance;else r.right=distance;
    }
    r.distance=Math.min(r.left,r.centre,r.right);r.band=r.distance<.5?3:r.distance<1.5?2:r.distance<3?1:0;return r;
  },
  checked(m){const d=m.driving,v=m.van;return !!d&&d.goalClear&&m.elapsed-d.goalAt>=0&&m.elapsed-d.goalAt<=60&&Math.hypot(v.x-d.goalX,v.z-d.goalZ)<2&&Math.abs(Math.atan2(Math.sin(v.yaw-d.goalYaw),Math.cos(v.yaw-d.goalYaw)))<.2;},
  requiresWalk(m){return !!(m.workdayRules&&m.workdayRules.walkaround==='required'&&m.parkingSpot==='tight-drive');},
  finish(m){
    const d=m.driving;if(!d||!d.reverseActive)return;
    const seconds=d.backing?d.backing[0]:0;
    OTR.fpDriving.fire(m,'drive.backing',d.reverseCount,d.reverseSafe,d.reverseSafe?'Reversed at a safe speed without contact.':'Contacted an obstacle or exceeded 5 mph while reversing.',{cameraSeconds:Math.round(seconds*100)/100});
    d.reverseActive=false;d.reverseSafe=false;if(d.backing)d.backing[0]=0;
  },
  tick(m,dt,old){
    const d=m.driving,v=m.van;if(!d)return;
    if(m.mode==='cab'&&v.gear===-1){
      const b=d.backing||(d.backing=[0,false,false]);
      if(m.rearVisible!==false)b[0]+=dt;
      if(!d.reverseActive&&(!v.hand&&(v.speed<-.01||old.speed<-.01||m.motion&&m.motion.contact)||m._rearContact)){
        d.reverseActive=true;d.reverseCount++;d.reverseSafe=true;
        b[1]=this.requiresWalk(m);b[2]=this.checked(m);d.goalAt=-100;
        if(b[1])OTR.fpDriving.fire(m,'drive.backing-walkaround',d.reverseCount,b[2],b[2]?'Checked the tight reversing space on foot before backing.':'Reversed in a required tight space without checking it on foot.');
      }
    }
    if(d.reverseActive){
      if(Math.max(-v.speed,-old.speed)>5/2.2369362921||v.gear===-1&&(m._rearContact||m.motion&&m.motion.contact)){
        d.reverseSafe=false;OTR.fpDriving.fire(m,'drive.backing',d.reverseCount,false,'Contacted an obstacle or exceeded 5 mph while reversing.',{cameraSeconds:Math.round((d.backing?d.backing[0]:0)*100)/100});
      }
      if(v.gear!==-1||v.hand&&Math.abs(v.speed)<.015||m.mode!=='cab')this.finish(m);
    }
    if(v.gear!==-1)delete d.backing;
    if(m.parking&&!m.parking.done&&m.parked()&&Math.hypot(v.x-m.parkingBay.x,v.z-m.parkingBay.z)<.7&&Math.abs(v.yaw)<.12){
      m.parking.done=true;m.log('parking-complete','driving','good','Parked inside the practice bay and set the parking brake.');m.touch();
    }
  },
  hint(m){
    if(!m||m.mode!=='cab'||m.van.gear!==-1)return 'The rear camera switches on automatically in reverse.';
    const r=m.rearSense;if(!r)return 'The rear camera is live. Reverse slowly and keep watching the path.';
    if(r.distance<.5)return 'Stop. A rear obstacle is within 0.5 meters.';
    if(r.distance>=6)return 'The rear camera is live. The rear sensors detect no obstacle within six meters.';
    if(Math.round(r.distance*10)===10)return 'The rear camera is live. The nearest rear obstacle is one meter away.';
    return `The rear camera is live. The nearest rear obstacle is ${Math.round(r.distance*10)/10} meters away.`;
  },
  path(steer,side,distance,out){
    const k=Math.tan(steer)/3.3,a=-k*distance,c=Math.cos(a),s=Math.sin(a);
    out.x=Math.abs(k)<1e-6?side:(1-c)/k+c*side-s*2.7;out.y=.045;out.z=Math.abs(k)<1e-6?2.7+distance:Math.sin(k*distance)/k+s*side+c*2.7;return out;
  },
  build(scene,root,interactions){
    const T=THREE,v=scene.view,atlas=v.mirror,plane=new T.PlaneGeometry(1,1),point=new T.Vector3(),pathPoint=new T.Vector3();
    const camera=new T.PerspectiveCamera(60,8/3,.08,OTR.gfx.high()?60:35);atlas.rearCamera=camera;atlas.updated=atlas.updated||[-100,-100,-100];atlas.updates=atlas.updates||[0,0,0];atlas.updated[3]=-100;atlas.updates[3]=0;atlas.last=-1;
    const uniform={atlas:{value:atlas.texture||null},active:{value:0},distances:{value:new T.Vector3(6,6,6)},guides:{value:Array.from({length:18},()=>new T.Vector2(-10,-10))},texel:{value:new T.Vector2(1/(OTR.gfx.high()?768:384),1/(OTR.gfx.high()?288:144))}};
    const material=new T.ShaderMaterial({uniforms:uniform,side:T.DoubleSide,vertexShader:'varying vec2 p; void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
      varying vec2 p; uniform sampler2D atlas; uniform float active; uniform vec3 distances; uniform vec2 guides[18]; uniform vec2 texel;
      float segment(vec2 a,vec2 b){vec2 ab=b-a;float t=clamp(dot(p-a,ab)/max(.00001,dot(ab,ab)),0.,1.);return 1.-smoothstep(.004,.009,length(p-a-t*ab));}
      void main(){vec3 colour=vec3(.035,.055,.065);if(active>.5){
        colour=texture2D(atlas,vec2(.5,.5)+texel*.5+vec2(1.-p.x,p.y)*(vec2(.5,.5)-texel)).rgb;
        for(int i=0;i<8;i++){vec3 ink=i<2?vec3(1.,.25,.2):i<5?vec3(1.,.8,.2):vec3(.3,1.,.6);float line=max(segment(guides[i],guides[i+1]),segment(guides[i+9],guides[i+10]));colour=mix(colour,ink,line*.9);}
        for(int i=0;i<3;i++){vec3 ink=i==0?vec3(1.,.25,.2):i==1?vec3(1.,.8,.2):vec3(.3,1.,.6);colour=mix(colour,ink,segment(guides[i*3+1],guides[i*3+10])*.8);}
        if(p.y<.12){float sector=floor(p.x*3.);float d=sector<1.?distances.x:sector<2.?distances.y:distances.z;float level=d<.5?3.:d<1.5?2.:d<3.?1.:0.;
          float edge=step(.07,fract(p.x*3.))*step(fract(p.x*3.),.93);float bars=step(fract(p.y*32.),.65)*step(p.y,.025+level*.027);vec3 ink=level>2.?vec3(1.,.25,.2):level>1.?vec3(1.,.8,.2):vec3(.3,1.,.6);colour=mix(colour,ink,bars*edge*.85);}
      }gl_FragColor=vec4(colour,1.);\n#include <colorspace_fragment>\n}`});
    const screen=new T.Mesh(plane,material);screen.name='rear-camera-screen';screen.position.set(.78,-.085,-1.015);screen.scale.set(.56,.21,1);root.add(screen);
    const target=new T.Mesh(plane,material);target.position.copy(screen.position);target.scale.copy(screen.scale);target.position.z+=.004;target.layers.set(1);target.userData.interaction='cab-camera';root.add(target);interactions.push(target);
    const rotation=new T.Quaternion().setFromEuler(new T.Euler(-.35,Math.PI,0,'YXZ'));
    const api={screen,camera,inView:false,
      sync(m,mirrors){
        const on=m.mode==='cab'&&m.van.gear===-1;atlas.rearOn=on;uniform.active.value=on?1:0;
        if(on){const r=OTR.fpRear.sense(m);uniform.distances.value.set(r.left,r.centre,r.right);}
        const anchor=mirrors&&mirrors.root;if(!anchor)return;
        camera.position.set(0,2.4,2.8);anchor.localToWorld(camera.position);camera.quaternion.copy(anchor.quaternion).multiply(rotation);camera.updateMatrixWorld(true);
        root.updateWorldMatrix(true,true);screen.getWorldPosition(point).project(v.camera);api.inView=on&&point.z>=-1&&point.z<=1&&Math.abs(point.x)<1&&Math.abs(point.y)<1;
        if(on)for(let side=0;side<2;side++)for(let i=0;i<9;i++){
          OTR.fpRear.path(m.van.steer,side?1.1:-1.1,.35+i*.7,pathPoint);anchor.localToWorld(pathPoint);pathPoint.project(camera);uniform.guides.value[side*9+i].set((1-pathPoint.x)*.5,(pathPoint.y+1)*.5);
        }
      },
      dispose(){atlas.rearOn=false;atlas.rearCamera=null;target.removeFromParent();screen.removeFromParent();plane.dispose();material.dispose();}
    };return api;
  }
};
