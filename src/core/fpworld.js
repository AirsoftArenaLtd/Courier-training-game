/* Shared placeholder depot, cargo and town. Text stays in Phaser; no texture downloads. */
window.OTR = window.OTR || {};
OTR.fpWorld = {
  build(scene) {
    const T = THREE, view = scene.view, world = view.world, camera = view.camera;
    const cube = new T.BoxGeometry(1, 1, 1), mats = new Map(), batches = new Map();
    const occluders = [], interactions = [], labels = [];
    const hub = new T.Group(), route = new T.Group(); world.add(hub, route);
    const material = color => {
      if (!mats.has(color)) mats.set(color, new T.MeshLambertMaterial({ color }));
      return mats.get(color);
    };
    function box(parent, x, y, z, w, h, d, color, id, solid) {
      const mesh = new T.Mesh(cube, material(color)); mesh.position.set(x,y,z); mesh.scale.set(w,h,d);
      mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
      if (!id && !solid) {
        let pool = batches.get(parent); if (!pool) { pool = new Map(); batches.set(parent,pool); }
        if (!pool.has(color)) pool.set(color,[]); pool.get(color).push(mesh.matrix.clone());
      } else {
        parent.add(mesh);
        if (solid) occluders.push(mesh);
        if (id) { mesh.userData.interaction = id; interactions.push(mesh); }
      }
      return mesh;
    }
    const sign = (parent,x,y,z,text,color,w) => {
      box(parent,x,y,z,w||1.4,0.85,0.08,color,null,false);
      labels.push({ parent, point:new T.Vector3(x,y,z+0.08), text, max:45 });
    };
    box(hub,0,-0.1,0,16,0.2,16,0xB9B5AC);
    box(hub,0,2,-6,16,4,0.2,0xDBE0DF,null,true);
    [-8,8].forEach(x=>box(hub,x,2,0,0.2,4,12,0xC5D0D4,null,true));
    box(hub,0,3.5,-5.84,16,0.25,0.1,0x5D4777);
    const station = (id,x,z,color,text) => {
      box(hub,x,0.55,z,1.8,1.1,0.8,0x4C515F,null,true);
      box(hub,x,1.55,z,1.9,0.9,0.2,color,id);
      labels.push({ parent:hub,point:new T.Vector3(x,2.2,z),text,max:18 });
    };
    station('hub-day',-4,-2.4,0xDD9844,'Workday');
    station('hub-practice',0,-3.3,0x6B538B,'Cargo practice');
    station('hub-record',4,-2.4,0x3E747B,'Last debrief');
    box(hub,0,0.025,3,2.2,0.04,3,0x6B538B);

    box(route,0,-0.12,-56,40,0.2,158,0x789069);
    box(route,0,-0.015,-57,11,0.06,155,0x4B5058);
    [-6.3,6.3].forEach(x=>box(route,x,0.05,-63,1.6,0.13,128,0xC2C0B6));
    [-27,-89].forEach(z=>box(route,0,0,z,40,0.08,8,0x4B5058));
    box(route,0,0,-124,27,0.1,17,0x4B5058);
    box(route,-9,0,5,15,0.1,24,0xC4C1B6);
    for (let z=14; z>-119; z-=6) {
      if (Math.abs(z+27)<7||Math.abs(z+89)<7) continue;
      box(route,0,0.04,z,0.09,0.018,2.7,0xEDD385);
    }
    for (let x=-4.7;x<5;x+=1.1) box(route,x,0.05,-57,0.5,0.02,2.6,0xEFEEE5);
    box(route,2.75,0.05,-24,5.4,0.02,0.28,0xEFEEE5);
    const base = OTR.fpMission.create('campaign',1);
    base.solids.slice(0,4).forEach((s,i)=>box(route,s.x,s.h/2,s.z,s.w,s.h,s.d,i===3?0x9C8061:0xD7DDDB,null,true));
    box(route,-13.8,0.5,11,2,1,1.2,0x5D4777,'dispatch',true);
    box(route,-13.8,0.48,5,1.8,0.96,1.6,0x608987,'returns',true);
    labels.push({parent:route,point:new T.Vector3(-13.8,2,11),text:'Dispatch',max:18});
    labels.push({parent:route,point:new T.Vector3(-13.8,1.9,5),text:'Returns',max:18});
    const colors=[0xC9BCAB,0xBBC7BE,0xD5C3B0];
    base.stops.forEach((s,i)=>{
      box(route,13,2.1,s.z,6,4.2,9,colors[i],null,true);
      box(route,13,4.35,s.z,6.7,0.5,9.7,0x65626B);
      box(route,8,0.08,s.z,4,0.15,3,0xC9C4B8);
      box(route,9.94,1.3,s.z,0.08,2.5,1.25,0x654B70,'door'+i);
      [-2.8,2.8].forEach(dz=>box(route,9.96,2.4,s.z+dz,0.06,1.1,1.25,0x68889A));
      box(route,9.4,0.4,s.z+1.7,0.65,0.8,0.75,0x927557);
      labels.push({parent:route,point:new T.Vector3(9.8,3.2,s.z),text:s.address,max:30});
    });
    box(route,6,1.2,-24,0.12,2.4,0.12,0x6E737B);
    sign(route,6,2.6,-24,'STOP',0xB94649,1.15);
    box(route,6,1.2,-10,0.12,2.4,0.12,0x6E737B);
    sign(route,6,2.6,-10,'15 mph',0xE5E1D6,1.4);
    if (OTR.gfx.high()) {
      [-15,16].forEach(x=>[-18,-49,-81,-115].forEach(z=>{
        box(route,x,1.3,z,0.4,2.6,0.4,0x826B53);
        box(route,x,3.5,z,3.8,3.5,3.6,0x607D54);
      }));
    }

    const van = new T.Group(); route.add(van);
    box(van,0,0.42,0,2.16,0.25,5.4,0x454955,null,true);
    box(van,0,0.75,-1.85,2.1,0.8,1.7,0xECE9E0,null,true);
    box(van,0,1.7,-0.95,2.1,2.55,0.15,0xE0DDD3,null,true);
    [-1.03,1.03].forEach(x=>box(van,x,1.78,0.8,0.12,2.65,3.5,0xE0DDD3,null,true));
    box(van,0,3.15,0.8,2.2,0.12,3.8,0xECE9E0,null,true);
    [-0.8,0.8].forEach(x=>box(van,x,1.06,0.9,0.48,0.12,3.3,0x827D74,null,true));
    [-1.09,1.09].forEach(x=>[-1.6,1.7].forEach(z=>box(van,x,0.42,z,0.22,0.7,0.7,0x2A2E35,x<0&&z<0?'tyres':null)));
    box(van,-1.08,1.65,-1.8,0.1,0.9,1.3,0x668193,'driver');
    box(van,0,0.96,-2.73,1.6,0.3,0.06,0xC9C8BD,'lights');
    const faultLamp=box(van,-0.68,1,-2.78,0.35,0.2,0.07,0xF8E8AE,'lights');
    box(van,0.68,1,-2.78,0.35,0.2,0.07,0xF8E8AE,'lights');
    const tyreBulge=box(van,-1.24,0.43,-1.6,0.17,0.28,0.3,0x555B65,'tyres');
    const lampGood=material(0xF8E8AE),lampBad=material(0x3D4148);
    const cargoDoor=box(van,0,1.8,2.62,1.9,2.5,0.08,0x65517F,'cargo',true);
    box(van,1.15,1.65,2.68,0.22,0.4,0.17,0xD9AE55,'cargo');
    box(van,0,0.8,2.5,0.6,0.22,0.13,0xDBAE55,'secure');
    const slotMeshes=OTR.fpMission.slots.map(s=>box(van,s.x,1.12,s.z,0.48,0.05,0.65,0xA6C2BF,s.id));

    function parcel(parent, id) {
      const g=new T.Group(); parent.add(g);
      box(g,0,0,0,0.43,0.4,0.52,0xB68D5C,id,!!id);
      box(g,0,0.205,0,0.09,0.012,0.53,0xDEC9A4);
      box(g,0,0,0.268,0.27,0.17,0.012,0xF2EEE3,id);
      for(let i=0;i<7;i++)box(g,-0.09+i*0.028,0,0.278,i%2?0.01:0.016,0.1,0.006,0x343638);
      return g;
    }
    const parcels=base.parcels.map(p=>parcel(route,p.id));
    const carried=parcel(camera,null); carried.position.set(0.4,-0.48,-0.85); carried.rotation.y=-0.15;
    const inspected=parcel(camera,null); inspected.position.set(-0.63,-0.02,-1.45); inspected.scale.setScalar(1.7);
    const dash=new T.Group();camera.add(dash);
    box(dash,0,-0.68,-1.1,2.5,0.25,0.5,0x383D47);
    const wheel=new T.Mesh(new T.TorusGeometry(0.18,0.022,6,18),material(0x242A31));
    wheel.position.set(-0.28,-0.5,-0.74);dash.add(wheel);
    const cars=base.traffic.map((c,i)=>{
      const g=new T.Group();route.add(g);
      box(g,0,0.55,0,1.7,0.8,3.5,i?0x74909D:0xBD8975,null,true);
      box(g,0,1.2,-0.2,1.5,0.55,1.65,0x506673);
      return g;
    });
    const person=new T.Group();route.add(person);
    box(person,0,1.1,0,0.45,0.75,0.25,0xBD9155);
    box(person,0,1.65,0,0.3,0.32,0.3,0xB68F72);
    [-0.12,0.12].forEach(x=>box(person,x,0.38,0,0.16,0.75,0.19,0x43515E));
    const residents=base.stops.map(s=>{
      const g=new T.Group();route.add(g);g.position.set(9.1,0,s.z);
      box(g,0,1.1,0,0.45,0.75,0.27,0x608987);box(g,0,1.65,0,0.3,0.32,0.3,0xB68F72);
      [-0.12,0.12].forEach(x=>box(g,x,0.38,0,0.16,0.75,0.19,0x43515E));return g;
    });
    // Batch static details by material and parent to keep draw calls small on integrated GPUs.
    batches.forEach((pool,parent)=>pool.forEach((matrices,color)=>{
      const mesh=new T.InstancedMesh(cube,material(color),matrices.length);
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;
      mesh.computeBoundingSphere();parent.add(mesh);
    }));
    const ray=new T.Raycaster();ray.far=2.65;
    const labelRay=new T.Raycaster(), direction=new T.Vector3();
    const api={hub,route,van,parcels,labels,occluders,interactions,ray,
      sync(model,hubPlayer,area) {
        const inHub=area==='hub';hub.visible=inHub;route.visible=!inHub;
        carried.visible=false;dash.visible=false;inspected.visible=false;
        if(inHub){camera.position.set(hubPlayer.x,1.65,hubPlayer.z);camera.rotation.set(-hubPlayer.pitch,-hubPlayer.yaw,0,'YXZ');view.mirror.on=false;}
        else if(model){
          const m=model,v=m.van,p=m.player;
          van.position.set(v.x,0,v.z);van.rotation.y=-v.yaw;van.visible=m.mode!=='cab';
          cargoDoor.visible=!m.cargoOpen;
          slotMeshes.forEach((mesh,i)=>mesh.visible=m.cargoOpen&&!m.parcels.some(p=>p.location===OTR.fpMission.slots[i].id));
          faultLamp.material=!m.repaired&&m.fault==='lights'?lampBad:lampGood;
          tyreBulge.visible=!m.repaired&&m.fault==='tyres';
          m.parcels.forEach((p,i)=>{
            const mesh=parcels[i],point=m.point(p.id);mesh.visible=!!point&&p.location!=='held';
            if(point){mesh.position.set(point.x,point.y,point.z);mesh.rotation.y=p.location.startsWith('slot')?-v.yaw:0;}
          });
          carried.visible=!!m.heldId&&m.mode==='walk';dash.visible=m.mode==='cab';wheel.rotation.z=-v.steer*3;
          inspected.visible=!!(scene.panel&&scene.panel.type==='inspect');inspected.rotation.y=scene.inspectAngle||0;
          if(inspected.visible)carried.visible=false;
          if(m.mode==='cab'){
            const eye=OTR.fp.local(v,-0.45,-1.85);camera.position.set(eye.x,2.05,eye.z);camera.rotation.set(-p.pitch,-v.yaw-v.look,0,'YXZ');
          }else{
            const local=OTR.fpMission.local(v,p),inside=m.cargoOpen&&Math.abs(local.x)<0.75&&local.z>-0.8&&local.z<2.6;
            camera.position.set(p.x,inside?2.15:1.65,p.z);camera.rotation.set(-p.pitch,-p.yaw,0,'YXZ');
          }
          m.traffic.forEach((c,i)=>{cars[i].visible=m.kind==='campaign';cars[i].position.set(c.x,0,c.z);cars[i].rotation.y=-c.yaw;});
          person.visible=m.kind==='campaign';person.position.set(m.crossing.x,0,m.crossing.z);
          m.stops.forEach((s,i)=>residents[i].visible=s.contacted&&s.service==='handover'&&!s.resolved);
          const eye=OTR.fp.local(v,-1.3,-1.55);
          view.mirror.camera.position.set(eye.x,2.1,eye.z);view.mirror.camera.rotation.set(0,Math.PI-v.yaw-0.18,0,'YXZ');
          view.mirror.on=m.mode==='cab'&&!m.paused&&m.elapsed-m.mirrorAt<3.5;
        }
        world.updateMatrixWorld(true);
      },
      pick(){return OTR.world3d.pick(camera,occluders,interactions,ray);},
      labelPosition(label){
        if(!label.parent.visible||camera.position.distanceTo(label.point)>label.max)return null;
        const p=label.point.clone().project(camera);
        if(p.z< -1||p.z>1||Math.abs(p.x)>0.83||p.y>0.65||p.y< -0.53)return null;
        direction.copy(label.point).sub(camera.position);const distance=direction.length();direction.normalize();
        labelRay.set(camera.position,direction);labelRay.far=distance-0.2;
        const objects=occluders.filter(o=>{for(let a=o;a;a=a.parent)if(!a.visible)return false;return true;});
        if(labelRay.intersectObjects(objects,false).length)return null;
        return {x:(p.x+1)*OTR.W/2,y:(1-p.y)*OTR.H/2};
      }
    };
    view.mirror.before=()=>{van.visible=true;dash.visible=false;world.updateMatrixWorld(true);};
    view.mirror.after=()=>{van.visible=false;dash.visible=true;};
    return api;
  }
};
