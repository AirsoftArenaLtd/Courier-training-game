/* Shared placeholder depot, cargo and town. Text stays in Phaser; no texture downloads. */
window.OTR = window.OTR || {};
OTR.fpWorld = {
  build(scene, model) {
    const T = THREE, view = scene.view, world = view.world, camera = view.camera;
    const cube = new T.BoxGeometry(1, 1, 1), plane = new T.PlaneGeometry(1,1).rotateX(-Math.PI/2), staticBatches=[], mats = new Map(), batches = new Map();
    const occluders = [], interactions = [], labels = [];
    const hub = new T.Group(), route = new T.Group(); world.add(hub, route);
    const material = color => {
      if (!mats.has(color)) mats.set(color, new T.MeshLambertMaterial({ color }));
      return mats.get(color);
    };
    function box(parent, x, y, z, w, h, d, color, id, solid) {
      const flat=h<=0.15&&(w>1||d>1);
      const mesh = new T.Mesh(flat?plane:cube, material(color)); mesh.position.set(x,y,z); mesh.scale.set(w,h,d);
      mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
      if (!id && !solid) {
        let pool = batches.get(parent); if (!pool) { pool = new Map(); batches.set(parent,pool); }
        const key=color+(flat?0x1000000:0);
        if (!pool.has(key)) pool.set(key,[]); pool.get(key).push(mesh.matrix.clone());
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

    const base = model || OTR.fpMission.create('campaign',1);
    const sceneryRadius=OTR.gfx.high()?95:55;let sceneryX=Infinity,sceneryZ=Infinity;
    if(world.fog){world.fog.near=base.town?sceneryRadius-20:65;world.fog.far=base.town?sceneryRadius:165;}
    if (!base.town) {
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
    }
    if (base.town) {
      const b=base.bounds,town=base.town,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
      box(route,cx,-0.12,cz,b.x1-b.x0,0.2,b.z1-b.z0,0x789069);
      town.xs.forEach(x=>box(route,x,-0.015,cz,town.road,0.06,b.z1-b.z0,0x4B5058));
      town.zs.forEach(z=>box(route,cx,-0.015,z,b.x1-b.x0,0.06,town.road,0x4B5058));
      box(route,9,0,5,15,0.1,24,0xC4C1B6);
      const half=town.road/2;
      // Every junction is stop-controlled in the pilot's 3D grid. Shared batches stay bounded.
      for(const x of town.xs) for(const z of town.zs) {
        box(route,x+half/2,0.05,z+half+0.25,half,0.02,0.2,0xEFEEE5);
        box(route,x-half/2,0.05,z-half-0.25,half,0.02,0.2,0xEFEEE5);
        box(route,x-half-0.25,0.05,z+half/2,0.2,0.02,half,0xEFEEE5);
        box(route,x+half+0.25,0.05,z-half/2,0.2,0.02,half,0xEFEEE5);
      }
      for(const x of town.xs)for(let z=b.z0+4;z<b.z1;z+=8){
        if(!town.zs.some(cz=>Math.abs(z-cz)<half+3))box(route,x,0.05,z,0.1,0.02,3,0xEDD385);
      }
      for(const z of town.zs)for(let x=b.x0+4;x<b.x1;x+=8){
        if(!town.xs.some(cx=>Math.abs(x-cx)<half+3))box(route,x,0.05,z,3,0.02,0.1,0xEDD385);
      }
      // One simple footprint per non-delivery lot; active facades are drawn below.
      town.lots.filter(l=>!base.stops.some(s=>s.lotId===l.id)).forEach(l=>box(route,l.x,l.h/2,l.z,l.w,l.h,l.d,0xBBC7BE));
    }
    base.solids.slice(0,4).forEach((s,i)=>box(route,s.x,s.h/2,s.z,s.w,s.h,s.d,i===3?0x9C8061:0xD7DDDB,null,true));
    const depotSide=base.town?-1:1;
    box(route,-13.8*depotSide,0.5,11,2,1,1.2,0x5D4777,'dispatch',true);
    box(route,-13.8*depotSide,0.48,5,1.8,0.96,1.6,0x608987,'returns',true);
    labels.push({parent:route,point:new T.Vector3(-13.8*depotSide,2,11),text:'Dispatch',max:18});
    labels.push({parent:route,point:new T.Vector3(-13.8*depotSide,1.9,5),text:'Returns',max:18});
    const colors=[0xC9BCAB,0xBBC7BE,0xD5C3B0];
    base.stops.forEach((s,i)=>{
      const l=base.town?base.town.lots.find(l=>l.id===s.lotId):{x:13,z:s.z,w:6,d:9,h:4.2};
      const side=s.side||1;
      box(route,l.x,l.h/2,l.z,l.w,l.h,l.d,colors[i%colors.length],null,true);
      box(route,l.x,l.h+0.15,l.z,l.w+0.5,0.3,l.d+0.5,0x65626B);
      box(route,s.x-side*1.7,0.08,s.z,3.4,0.15,2,0xC9C4B8);
      box(route,s.x,1.3,s.z,0.08,2.5,1.25,0x654B70,'door'+i);
      box(route,s.x-side*0.6,0.4,s.z+1.7,0.65,0.8,0.75,0x927557);
      labels.push({parent:route,point:new T.Vector3(s.x-side*0.15,3.2,s.z),text:s.address,max:30});
    });
    if (!base.town) {
      box(route,6,1.2,-24,0.12,2.4,0.12,0x6E737B);
      sign(route,6,2.6,-24,'STOP',0xB94649,1.15);
      box(route,6,1.2,-10,0.12,2.4,0.12,0x6E737B);
      sign(route,6,2.6,-10,'15 mph',0xE5E1D6,1.4);
    }
    if (OTR.gfx.high()&&!base.town) {
      (base.town?base.town.xs:[-15,16]).forEach(x=>[-18,-49,-81,-115].forEach(z=>{
        box(route,x+9,1.3,z,0.4,2.6,0.4,0x826B53);
        box(route,x+9,3.5,z,3.8,3.5,3.6,0x607D54);
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
      box(g,0,0,0,0.43,0.4,0.52,0xB68D5C,id,true);
      box(g,0,0.205,0,0.09,0.012,0.53,0xDEC9A4);
      const label=box(g,0,0,0.268,0.27,0.17,0.012,0xF2EEE3,id,true);
      label.userData.scanId=id;g.userData.barcode=label;
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
      const g=new T.Group();route.add(g);g.position.set(s.x-(s.side||1)*0.8,0,s.z);
      box(g,0,1.1,0,0.45,0.75,0.27,0x608987);box(g,0,1.65,0,0.3,0.32,0.3,0xB68F72);
      [-0.12,0.12].forEach(x=>box(g,x,0.38,0,0.16,0.75,0.19,0x43515E));return g;
    });
    let bus=null,emergency=null,busLamps=null,emergencyLamps=null;
    if(base.driving){
      bus=new T.Group();route.add(bus);
      box(bus,0,1.45,0,2.4,2.6,7.6,0xE4B64A,null,true);
      for(const x of [-1.21,1.21]){
        for(const z of [-2.4,-0.8,0.8,2.4])box(bus,x,2,z,0.04,0.7,1.05,0x343B46);
        for(const z of [-2.3,2.3])box(bus,x,0.45,z,0.15,0.8,0.8,0x343B46);
      }
      busLamps=new T.Group();bus.add(busLamps);
      for(const x of [-0.8,0.8])box(busLamps,x,2.8,3.83,0.3,0.3,0.08,0xE33E44);
      emergency=new T.Group();route.add(emergency);
      box(emergency,0,0.65,0,1.45,1.1,4,0xE5E9E8,null,true);
      box(emergency,0,1.3,-0.2,1.3,0.65,1.7,0x343B46);
      for(const x of [-0.75,0.75])for(const z of [-1.25,1.25])box(emergency,x,0.35,z,0.12,0.6,0.6,0x343B46);
      emergencyLamps=new T.Group();emergency.add(emergencyLamps);
      for(const x of [-0.4,0.4])box(emergencyLamps,x,1.75,-0.1,0.4,0.2,0.3,0xE33E44);
    }
    const flashRed=material(0xE33E44),flashBlue=material(0x3B89DC);
    // Batch static details by material and parent to keep draw calls small on integrated GPUs.
    batches.forEach((pool,parent)=>pool.forEach((matrices,color)=>{
      const mesh=new T.InstancedMesh(color>=0x1000000?plane:cube,material(color%0x1000000),matrices.length);
      matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;
      mesh.computeBoundingSphere();parent.add(mesh);
      if(base.town&&parent===route)staticBatches.push({mesh,matrices});
    }));
    const ray=new T.Raycaster();ray.far=2.65;
    const labelRay=new T.Raycaster(), direction=new T.Vector3(), scanNormal=new T.Vector3(), scanPoint=new T.Vector3(), scanRotation=new T.Quaternion();
    const scanObjects=[...new Set([...occluders,...interactions])];
    const api={hub,route,van,parcels,labels,occluders,interactions,ray,
      dispose() {
        const geometries=new Set();
        for(const root of [hub,route,carried,inspected,dash]) { root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.isInstancedMesh)o.dispose();});root.removeFromParent(); }
        geometries.add(cube);geometries.add(plane);geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
      },
      sync(model,hubPlayer,area) {
        const inHub=area==='hub';hub.visible=inHub;route.visible=!inHub;
        carried.visible=false;dash.visible=false;inspected.visible=false;
        if(inHub){camera.position.set(hubPlayer.x,1.65,hubPlayer.z);camera.rotation.set(-hubPlayer.pitch,-hubPlayer.yaw,0,'YXZ');view.mirror.on=false;}
        else if(model){
          const m=model,v=m.van,p=m.player,cx=m.mode==='cab'?v.x:p.x,cz=m.mode==='cab'?v.z:p.z;
          if(base.town&&(Math.abs(cx-sceneryX)>3||Math.abs(cz-sceneryZ)>3)){
            sceneryX=cx;sceneryZ=cz;
            // Compact nearby static instances in preallocated GPU buffers. Long street/ground planes always remain.
            for(const batch of staticBatches){let count=0;
              for(const matrix of batch.matrices){const e=matrix.elements;
                if(Math.max(Math.abs(e[0]),Math.abs(e[10]))>20 || (e[12]-cx)**2+(e[14]-cz)**2<sceneryRadius*sceneryRadius)batch.mesh.setMatrixAt(count++,matrix);
              }
              batch.mesh.count=count;batch.mesh.instanceMatrix.needsUpdate=true;
            }
          }
          if(base.town){
            for(const mesh of occluders)if(mesh.parent===route)mesh.visible=(mesh.position.x-cx)**2+(mesh.position.z-cz)**2<sceneryRadius*sceneryRadius;
            for(const mesh of interactions)if(mesh.parent===route)mesh.visible=(mesh.position.x-cx)**2+(mesh.position.z-cz)**2<sceneryRadius*sceneryRadius;
          }
          van.position.set(v.x,0,v.z);van.rotation.y=-v.yaw;van.visible=m.mode!=='cab';
          cargoDoor.visible=!m.cargoOpen;
          slotMeshes.forEach((mesh,i)=>mesh.visible=m.cargoOpen&&!m.parcels.some(p=>p.location===OTR.fpMission.slots[i].id));
          faultLamp.material=!m.repaired&&m.fault==='lights'?lampBad:lampGood;
          tyreBulge.visible=!m.repaired&&m.fault==='tyres';
          m.parcels.forEach((p,i)=>{
            const mesh=parcels[i],point=m.point(p.id);mesh.visible=!!point&&p.location!=='held'&&(!p.location.startsWith('slot')||m.cargoOpen)&&(!base.town||(point.x-cx)**2+(point.z-cz)**2<20*20);
            if(point){mesh.position.set(point.x,point.y,point.z);mesh.rotation.y=p.location.startsWith('slot')?-v.yaw:0;}
          });
          carried.visible=!!m.heldId&&m.mode==='walk';dash.visible=m.mode==='cab';wheel.rotation.z=-v.steer*3;
          const scanning=scene.handheld&&scene.handheld.aiming;
          carried.position.set(scanning?0:0.4,scanning?0:-0.48,-0.85);
          carried.userData.barcode.userData.scanId=scanning?m.heldId:null;
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
          if(bus&&m.driving){
            const b=m.driving.bus,e=m.driving.siren,flash=Math.floor(m.elapsed*3)%2===0;
            bus.visible=b.state==='flashing'||b.state==='leaving';bus.position.set(b.x,0,b.z);bus.rotation.y=-b.yaw;
            busLamps.visible=b.state==='flashing'&&flash;
            emergency.visible=e.state==='approaching'||e.state==='passing';emergency.position.set(e.x,0,e.z);emergency.rotation.y=-e.yaw;
            for(const lamp of emergencyLamps.children)lamp.material=flash?flashRed:flashBlue;
          }
          const eye=OTR.fp.local(v,-1.3,-1.55);
          view.mirror.camera.position.set(eye.x,2.1,eye.z);view.mirror.camera.rotation.set(0,Math.PI-v.yaw-0.18,0,'YXZ');
          view.mirror.on=m.mode==='cab'&&!m.paused&&m.elapsed-m.mirrorAt<3.5;
        }
        world.updateMatrixWorld(true);
      },
      pick(){return OTR.world3d.pick(camera,occluders,interactions,ray);},
      scanTarget(){
        ray.setFromCamera({x:0,y:0},camera);
        const visible=scanObjects.filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;});
        const hit=ray.intersectObjects(visible,false)[0];
        if(!hit||!hit.object.userData.scanId)return null;
        hit.object.getWorldQuaternion(scanRotation);hit.object.getWorldPosition(scanPoint);
        scanNormal.set(0,0,1).applyQuaternion(scanRotation);direction.copy(camera.position).sub(scanPoint).normalize();
        return scanNormal.dot(direction)>0.45?hit.object.userData.scanId:null;
      },
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
