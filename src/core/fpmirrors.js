/* Three physical mirrors, one shared reflection atlas, and gaze evidence. No scoring is calculated here. */
window.OTR=window.OTR||{};
OTR.fpMirrors={
  specs:[{id:'mirror-left',x:-1.22,y:2.13,z:-2.3,w:.27,h:.4,angle:1.05,view:-.18},
    {id:'mirror-right',x:1.22,y:2.13,z:-2.3,w:.27,h:.4,angle:-1.3,view:.18},
    {id:'mirror-interior',x:.05,y:2.35,z:-2.7,w:.4,h:.14,angle:.48,view:0}],
  state(m){return m.van.mirrors||(m.van.mirrors=[-100,-100,-100,-1,0]);},
  valid(v,elapsed){return v===undefined||Array.isArray(v)&&v.length===5&&v.slice(0,3).every(t=>Number.isFinite(t)&&t>=-100&&t<=elapsed)&&Number.isInteger(v[3])&&v[3]>=-1&&v[3]<=2&&Number.isFinite(v[4])&&v[4]>=0&&v[4]<=.4;},
  recent(m,index,at=m.elapsed){const v=m.van.mirrors;return !!v&&at-v[index]>=0&&at-v[index]<=4;},
  reset(m){if(m&&m.van.mirrors){m.van.mirrors[3]=-1;m.van.mirrors[4]=0;}},
  looking(m){
    if(m.mode!=='cab'||m.paused||m.mirrorVisible===false)return -1;
    const pose=m.cameraMotion,yaw=pose?pose.yaw-m.van.yaw:m.van.look,pitch=pose?-pose.pitch:m.player.pitch;
    const cp=Math.cos(pitch),x=Math.sin(yaw)*cp,y=-Math.sin(pitch),z=-Math.cos(yaw)*cp;
    let index=-1,closest=Math.cos(.21);
    for(let i=0;i<3;i++){const s=this.specs[i],dx=s.x+.45,dy=s.y-2.05,dz=s.z+1.85,dot=(dx*x+dy*y+dz*z)/Math.hypot(dx,dy,dz);if(dot>closest){closest=dot;index=i;}}
    return index;
  },
  tick(m,dt){
    const v=this.state(m),index=this.looking(m);if(index<0){v[3]=-1;v[4]=0;return;}
    v[4]=Math.min(.4,(v[3]===index?v[4]:0)+dt);v[3]=index;
    if(v[4]>=.4-1e-8){v[index]=m.elapsed;if(index===0)m.mirrorAt=m.elapsed;}
  },
  validTurn(v,elapsed){return v===undefined||Array.isArray(v)&&v.length===8&&[-1,0,1].includes(v[0])&&v.slice(1,5).every(Number.isFinite)&&v[4]<=elapsed&&typeof v[5]==='boolean'&&typeof v[6]==='boolean'&&Number.isSafeInteger(v[7])&&v[7]>=0;},
  maneuvers(m){
    const v=m.van,d=m.driving,t=d.mirrorTurn||(d.mirrorTurn=[0,v.yaw,v.x,v.z,m.elapsed,false,false,0]);
    const side=Math.abs(v.speed)>.5&&Math.abs(v.steer)>.06?Math.sign(v.speed*v.steer):0;
    if(Math.abs(v.speed)<.3||Math.abs(v.steer)<.035){t[0]=0;return;}
    if(side&&side!==t[0]){t[0]=side;t[1]=v.yaw;t[2]=v.x;t[3]=v.z;t[4]=m.elapsed;t[5]=this.recent(m,side<0?0:1);t[6]=false;}
    if(!t[0]||t[6])return;
    const angle=Math.abs(Math.atan2(Math.sin(v.yaw-t[1]),Math.cos(v.yaw-t[1]))),lateral=Math.abs((v.x-t[2])*Math.cos(t[1])+(v.z-t[3])*Math.sin(t[1]));
    if(angle<.06&&lateral<.6)return;
    t[6]=true;t[7]++;OTR.fpDriving.fire(m,'drive.mirrors',`turn:${m.leg}:${t[7]}`,t[5],t[5]?'Checked the matching mirror before turning or changing lanes.':'Turned or changed lanes without a current check of the matching mirror.');
  },
  hint(id,m){
    const i=id==='mirror-left'?0:id==='mirror-right'?1:id==='mirror-interior'?2:-1;if(i<0)return '';
    if(i===0)return this.recent(m,0)?'Your left mirror check is current.':'Look at the left mirror for a moment to check it.';
    if(i===1)return this.recent(m,1)?'Your right mirror check is current.':'Look at the right mirror for a moment to check it.';
    return this.recent(m,2)?'Your interior mirror check is current.':'Look at the interior mirror for a moment to check it.';
  },
  build(scene,interactions){
    const specs=this.specs,T=THREE,view=scene.view,mirror=view.mirror,high=OTR.gfx.high(),root=new T.Group();view.world.add(root);root.name='physical-mirrors';
    const plane=new T.PlaneGeometry(1,1),cube=high?new T.BoxGeometry(1,1,1):null,paint=new T.MeshBasicMaterial({color:0x23313C,side:T.DoubleSide});
    const surface=new T.ShaderMaterial({uniforms:{atlas:{value:mirror.texture||null},texel:{value:new T.Vector2(1/(high?768:384),1/(high?288:144))}},side:T.FrontSide,
      vertexShader:'attribute vec4 mirrorTile; varying vec2 p; varying vec4 tile; void main(){p=uv;tile=mirrorTile;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
      fragmentShader:'uniform sampler2D atlas; uniform vec2 texel; varying vec2 p; varying vec4 tile; void main(){vec2 uv=tile.xy+texel*.5+vec2(1.-p.x,p.y)*(tile.zw-texel);gl_FragColor=texture2D(atlas,uv);\n#include <colorspace_fragment>\n}'});
    plane.setAttribute('mirrorTile',new T.InstancedBufferAttribute(new Float32Array([0,0,.25,1,.25,0,.25,1,.5,0,.5,.5]),4));
    const faces=new T.InstancedMesh(plane,surface,3),frames=new T.InstancedMesh(high?cube:plane,paint,high?3:5);faces.frustumCulled=frames.frustumCulled=false;root.add(frames,faces);
    const mounts=high?new T.InstancedMesh(plane,paint,2):frames,scratch=new T.Object3D();mounts.frustumCulled=false;if(high)root.add(mounts);
    if(!mirror.cameras)mirror.cameras=this.specs.map((s,i)=>new T.PerspectiveCamera(i===2?45:65,i===2?8/3:2/3,.08,i===2?(high?24:12):(high?75:40)));
    mirror.camera=mirror.cameras[0];mirror.physical=true;
    const targets=[];
    for(let i=0;i<3;i++){
      const s=this.specs[i];scratch.position.set(s.x,s.y,s.z);scratch.rotation.set(0,s.angle,0);scratch.scale.set(s.w,s.h,1);scratch.updateMatrix();faces.setMatrixAt(i,scratch.matrix);
      // Keep the entire High housing behind the reflective plane, including its front half.
      scratch.position.add(new T.Vector3(0,0,high?-.025:-.008).applyAxisAngle(new T.Vector3(0,1,0),s.angle));scratch.scale.set(s.w*1.14,s.h*1.12,high?.025:1);scratch.updateMatrix();frames.setMatrixAt(i,scratch.matrix);
      const target=new T.Mesh(new T.PlaneGeometry(s.w,s.h),paint);target.position.set(s.x,s.y,s.z);target.rotation.y=s.angle;target.layers.set(1);target.userData.interaction=s.id;root.add(target);interactions.push(target);targets.push(target);
      if(i<2){scratch.position.set(s.x,s.y-.3,s.z-.02);scratch.rotation.set(0,s.angle,0);scratch.scale.set(.035,.2,1);scratch.updateMatrix();mounts.setMatrixAt(high?i:i+3,scratch.matrix);}
    }
    const rotations=specs.map((s,i)=>new T.Quaternion().setFromEuler(new T.Euler(i===2?-.18:0,Math.PI+s.view,0,'YXZ')));
    mirror.filled=0;mirror.next=0;mirror.nextAt=0;
    let hidden=false;return {root,faces,frames,mounts,targets,
      sync(m,area){root.visible=area!=='hub'&&!!m&&!hidden;mirror.on=root.visible;if(!m)return;
        const p=m.cameraMotion;root.position.set(m.van.x,p?p.heave:0,m.van.z);root.rotation.set(p?p.bodyPitch:0,-m.van.yaw,p?p.bodyRoll:0,'YXZ');root.updateMatrixWorld(true);
        for(let i=0;i<3;i++){const s=specs[i],cam=mirror.cameras[i];cam.position.set(s.x,s.y,s.z);root.localToWorld(cam.position);cam.quaternion.copy(root.quaternion).multiply(rotations[i]);cam.updateMatrixWorld(true);}
      },
      hide(value){hidden=value;root.visible=!value;},
      dispose(){paint.dispose();surface.dispose();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&o.geometry!==plane&&o.geometry!==cube)o.geometry.dispose();});plane.dispose();if(cube)cube.dispose();root.removeFromParent();}
    };
  }
};
