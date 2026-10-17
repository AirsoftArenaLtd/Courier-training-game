/* Procedural depot, cargo and town, with optional locally bundled static models. Text stays in Phaser. */
window.OTR = window.OTR || {};
OTR.fpWorld = {
  build(scene, model) {
    const T = THREE, view = scene.view, world = view.world, camera = view.camera,brand=OTR.fpBrand.read();
    const cube = new T.BoxGeometry(1, 1, 1), plane = new T.PlaneGeometry(1,1).rotateX(-Math.PI/2), staticBatches=[], mats = new Map(), batches = new Map();
    const occluders = [], interactions = [], labels = [], assetGroups=[];
    const hub = new T.Group(), route = new T.Group(); world.add(hub, route);
    const material = color => {
      if (!mats.has(color)) mats.set(color, new T.MeshLambertMaterial({ color }));
      return mats.get(color);
    };
    function box(parent, x, y, z, w, h, d, color, id, solid) {
      const flat=h<=0.15&&(w>1||d>1);
      const mesh = new T.Mesh(flat?plane:cube, material(color)); mesh.position.set(x,y,z); mesh.scale.set(w,h,d);
      mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
      if (!id) {
        let pool = batches.get(parent); if (!pool) { pool = new Map(); batches.set(parent,pool); }
        // Ground/scenery retain material ordering, including distant depth ties with the ground box.
        const key=(flat?'plane:':'box:')+(parent===route||flat?color:'all')+(parent===route&&solid?':solid':'');
        if (!pool.has(key)) pool.set(key,[]); pool.get(key).push({matrix:mesh.matrix.clone(),color:new T.Color(color),hex:color,flat,bounded:!!solid});
      }
      if(id||solid){
        parent.add(mesh);
        // Solid-only meshes remain exact raycast proxies. Their pixels come from the instance batch.
        if(!id)mesh.layers.set(1);
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
    box(hub,0,3.5,-5.84,16,0.25,0.1,brand.primary);
    const station = (id,x,z,color,text) => {
      box(hub,x,0.55,z,1.8,1.1,0.8,0x4C515F,null,true);
      box(hub,x,1.55,z,1.9,0.9,0.2,color,id);
      labels.push({ parent:hub,point:new T.Vector3(x,2.2,z),text,max:18 });
    };
    station('hub-day',-4,-2.4,brand.accent,'Workday');
    station('hub-practice',0,-3.3,brand.primary,'Cargo practice');
    station('hub-record',4,-2.4,brand.primary,'Last debrief');
    box(hub,0,0.025,3,2.2,0.04,3,brand.primary);

    const base = model || OTR.fpMission.create('campaign',1);
    const weather=base.routeDay?base.routeDay.weather:'clear',wet=weather==='rain'||weather==='storm',snow=weather==='snow';
    const roadColour=weather==='ice'?0x718D9A:wet?0x3D4951:snow?0x7B8994:0x4B5058,grassColour=wet?0x6A806C:snow?0xE0E5E4:0x789069,roofColour=snow?0xC5CFD3:0x65626B;
    const sky=weather==='fog'?0xB8C3C8:weather==='ice'?0xC7D4DD:weather==='storm'?0x778697:weather==='rain'?0x9DAFBE:snow?0xD4DDE2:weather==='heat'?0xDFC8A4:weather==='cloudy'?0xB5C5CE:0xA7C7DE;
    if(world.background)world.background.setHex(sky);if(world.fog)world.fog.color.setHex(sky);
    const cabParcelRange2=OTR.gfx.high()?400:64;
    const sceneryRadius=OTR.gfx.high()?95:55;let sceneryX=Infinity,sceneryZ=Infinity,solidX=Infinity,solidZ=Infinity;
    if(world.fog){world.fog.near=base.town?sceneryRadius-20:65;world.fog.far=base.town?sceneryRadius:165;if(weather==='fog'){world.fog.near=6;world.fog.far=28;}else if(weather==='storm'){world.fog.near=12;world.fog.far=40;}else if(weather==='heat'){world.fog.near=25;world.fog.far=50;}}
    if (!base.town) {
    box(route,0,-0.12,-56,40,0.2,158,grassColour);
    box(route,0,-0.015,-57,11,0.06,155,roadColour);
    [-6.3,6.3].forEach(x=>box(route,x,0.05,-63,1.6,0.13,128,0xC2C0B6));
    [-27,-89].forEach(z=>box(route,0,0,z,40,0.08,8,roadColour));
    box(route,0,0,-124,27,0.1,17,roadColour);
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
      box(route,cx,-0.12,cz,b.x1-b.x0,0.2,b.z1-b.z0,grassColour);
      town.xs.forEach(x=>box(route,x,-0.015,cz,town.road,0.06,b.z1-b.z0,roadColour));
      town.zs.forEach(z=>box(route,cx,-0.015,z,b.x1-b.x0,0.06,town.road,roadColour));
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
      // A small pipeline example; the full town pass is C-27. Delivery facades/solids remain their own geometry.
      const lots=town.lots.filter(l=>!base.stops.some(s=>s.lotId===l.id));
      const sample=lots.slice().sort((a,b)=>(a.x-4)**2+(a.z-8)**2-((b.x-4)**2+(b.z-8)**2)).slice(0,2);
      const group=scene.assetBank&&scene.assetBank.add(route,'town-garage',sample.map(l=>({x:l.x,z:l.z,w:l.w,h:l.h,d:l.d})));
      if(group)assetGroups.push(group);
      lots.forEach(l=>{if(!group||!sample.includes(l))box(route,l.x,l.h/2,l.z,l.w,l.h,l.d,0xBBC7BE);});
    }
    base.solids.slice(0,4).forEach((s,i)=>box(route,s.x,s.h/2,s.z,s.w,s.h,s.d,i===3?0x9C8061:0xD7DDDB,null,true));
    const depotSide=base.town?-1:1;
    box(route,-13.8*depotSide,0.5,11,2,1,1.2,brand.primary,'dispatch',true);
    box(route,-13.8*depotSide,0.48,5,1.8,0.96,1.6,brand.accent,'returns',true);
    box(route,-13.8*depotSide,3.1,13,3.2,1.15,.1,brand.primary);
    labels.push({parent:route,point:new T.Vector3(-13.8*depotSide,3.1,13.08),text:brand.name,brand:true,max:24});
    labels.push({parent:route,point:new T.Vector3(-13.8*depotSide,2,11),text:'Dispatch',max:18});
    labels.push({parent:route,point:new T.Vector3(-13.8*depotSide,1.9,5),text:'Returns',max:18});
    if(base.roadworks){
      const r=base.roadworks;
      if(OTR.gfx.high()){
        box(route,r.x,.8,r.z,r.w,.6,.4,0xF2B84B,null,true);
        for(const dx of [-r.w/2+.6,r.w/2-.6])box(route,r.x+dx,.5,r.z,.3,1,.8,0x42556A);
        box(route,r.x,.8,r.z,r.w*.85,.18,.42,0xEFEEE5);
      }else{
        box(route,r.x,.55,r.z,r.w,1.1,1,0xF2B84B,null,true);
        box(route,r.x,1.115,r.z,r.w,.03,1.03,0xEFEEE5);
      }
      labels.push({parent:route,point:new T.Vector3(r.x,1.6,r.z),text:'This street is closed.',wrap:216,max:25});
    }
    const weatherDrops=(wet||snow)?new T.InstancedMesh(cube,material(snow?0xE7ECED:0xC4D7E1),OTR.gfx.high()?36:base.routePlan&&base.routePlan.later===1?12:18):null;
    const dropMatrix=new T.Matrix4(),dropPosition=new T.Vector3(),dropScale=new T.Vector3(snow?.09:.025,snow?.09:.7,snow?.09:.025),dropRotation=new T.Quaternion();
    if(weatherDrops){weatherDrops.frustumCulled=false;route.add(weatherDrops);}
    const colors=[0xC9BCAB,0xBBC7BE,0xD5C3B0];
    base.stops.forEach((s,i)=>{
      const l=base.town?base.town.lots.find(l=>l.id===s.lotId):{x:13,z:s.z,w:6,d:9,h:4.2};
      const side=s.side||1;
      box(route,l.x,l.h/2,l.z,l.w,l.h,l.d,colors[i%colors.length],null,true);
      box(route,l.x,l.h+0.15,l.z,l.w+0.5,0.3,l.d+0.5,roofColour);
      box(route,s.x-side*1.7,0.08,s.z,3.4,0.15,2,0xC9C4B8);
      box(route,s.x,1.3,s.z,0.08,2.5,1.25,0x654B70,'door'+i);
      box(route,s.x-side*0.6,0.4,s.z+1.7,0.65,0.8,0.75,base.routeDay&&base.routeDay.dispatch&&base.routeDay.dispatch.stop===i&&base.routeDay.dispatch.kind==='planter'?grassColour:0x927557);
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
    const chassis = new T.Group();van.add(chassis);
    box(chassis,0,0.42,0,2.16,0.25,5.4,0x454955,null,true);
    box(chassis,0,0.75,-1.85,2.1,0.8,1.7,brand.body,null,true);
    box(chassis,0,1.7,-0.95,2.1,2.55,0.15,brand.body,null,true);
    [-1.03,1.03].forEach(x=>box(chassis,x,1.78,0.8,0.12,2.65,3.5,brand.body,null,true));
    box(chassis,0,3.15,0.8,2.2,0.12,3.8,brand.body,null,true);
    for(const side of [-1,1]){
      box(chassis,side*1.105,2.1,.6,.025,.8,2.1,brand.primary);
      box(chassis,side*1.125,1.6,.6,.025,.12,2.1,brand.accent);
      labels.push({parent:chassis,local:new T.Vector3(side*1.13,2.1,.6),point:new T.Vector3(),normal:new T.Vector3(side,0,0),text:brand.name,brand:true,max:16});
    }
    [-0.8,0.8].forEach(x=>box(chassis,x,1.06,0.9,0.48,0.12,3.3,0x827D74,null,true));
    [-1.09,1.09].forEach(x=>[-1.6,1.7].forEach(z=>box(van,x,0.42,z,0.22,0.7,0.7,0x2A2E35,x<0&&z<0?'tyres':null)));
    box(chassis,-1.08,1.65,-1.8,0.1,0.9,1.3,0x668193,'driver');
    box(chassis,0,0.96,-2.73,1.6,0.3,0.06,0xC9C8BD,'lights');
    const faultLamp=box(chassis,-0.68,1,-2.78,0.35,0.2,0.07,0xF8E8AE,'lights');
    box(chassis,0.68,1,-2.78,0.35,0.2,0.07,0xF8E8AE,'lights');
    const tyreBulge=box(van,-1.24,0.43,-1.6,0.17,0.28,0.3,0x555B65,'tyres');
    const lampGood=material(0xF8E8AE),lampBad=material(0x3D4148);
    const cargoDoor=box(chassis,0,1.8,2.62,1.9,2.5,0.08,brand.primary,'cargo',true);
    box(chassis,1.15,1.65,2.68,0.22,0.4,0.17,0xD9AE55,'cargo');
    box(chassis,0,0.8,2.5,0.6,0.22,0.13,0xDBAE55,'secure');
    const slotMeshes=OTR.fpMission.slots.map(s=>box(chassis,s.x,1.12,s.z,0.48,0.05,0.65,0xA6C2BF,s.id));

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
    for(const x of [-.29,.29])box(carried,x,-.32,.1,.14,.25,.35,brand.uniform);
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
    const residentParts=[],residentBatch=new T.InstancedMesh(cube,material(0xFFFFFF),base.stops.length*4);
    residentBatch.frustumCulled=false;residentBatch.count=0;route.add(residentBatch);
    for(const stop of base.stops){
      const a=base.doorsteps?base._doorSpecs[stop.id]:null,x=stop.x-(stop.side||1)*.8;
      const part=(dx,y,w,h,d,color)=>{const matrix=new T.Matrix4().compose(new T.Vector3(x+dx,y,stop.z),new T.Quaternion(),new T.Vector3(w,h,d));residentParts.push({id:stop.id,matrix,color:new T.Color(color)});};
      part(0,1.1,.45,.75,.27,a?a.shirt:0x608987);part(0,1.65,.3,.32,.3,a?a.skin:0xB68F72);
      if(OTR.gfx.high()){part(-.12,.38,.16,.75,.19,0x43515E);part(.12,.38,.16,.75,.19,0x43515E);}else part(0,.38,.38,.75,.19,0x43515E);
    }
    const dogs=[],gates=[],hazards=[];
    if(base.doorsteps)for(let i=0;i<base.stops.length;i++){
      const s=base.stops[i],a=base._doorSpecs[i];
      if(a.dog){
        const p=OTR.fpDoors.point(base,i,'gate');gates[i]=box(route,p.x,.6,p.z,.16,1.2,4.8,roofColour,'gate'+i,true);
        for(const z of [-3.1,3.1])box(route,p.x,.6,s.z+z,.16,1.2,1.4,roofColour);
        labels.push({parent:route,point:new T.Vector3(p.x,1.8,p.z),text:'Keep the gate shut. A dog is loose.',max:15});
        const dog=new T.Group();route.add(dog);dogs[i]=dog;const fur=a.fur;
        box(dog,0,.45,0,.85,.4,.35,fur);box(dog,-.45,.65,0,.38,.36,.36,fur);box(dog,-.64,.57,0,.28,.18,.25,fur);
        for(const x of [-.3,.3])for(const z of [-.13,.13])box(dog,x,.18,z,.12,.36,.12,fur);
        box(dog,.49,.65,0,.35,.12,.12,fur);box(dog,-.42,.9,.1,.13,.22,.12,fur);box(dog,-.42,.9,-.1,.13,.22,.12,fur);
        dog.rotation.y=s.side>0?0:Math.PI;
      }
      if(a.hazard){const p=OTR.fpDoors.point(base,i,'hazard'),slippery=a.hazard==='ice'||a.hazard==='wet';hazards[i]=box(route,p.x,.11,p.z,slippery?1.15:.95,slippery?.04:.1,slippery?1.2:.8,slippery?0x506673:0x927557,'hazard'+i);}
    }
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
    batches.forEach((pool,parent)=>pool.forEach(entries=>{
      const flat=entries[0].flat,coloured=parent===route||flat;
      const mesh=new T.InstancedMesh(flat?plane:cube,material(coloured?entries[0].hex:0xFFFFFF),entries.length);
      entries.forEach((entry,i)=>{mesh.setMatrixAt(i,entry.matrix);if(!coloured)mesh.setColorAt(i,entry.color);});mesh.instanceMatrix.needsUpdate=true;
      mesh.computeBoundingSphere();parent.add(mesh);
      if(base.town&&parent===route)staticBatches.push({mesh,entries,bounded:entries[0].bounded});
    }));
    const ray=new T.Raycaster();ray.far=2.65;ray.layers.enable(1);
    const labelRay=new T.Raycaster(), direction=new T.Vector3(), scanNormal=new T.Vector3(), scanPoint=new T.Vector3(), scanRotation=new T.Quaternion();
    labelRay.layers.enable(1);let residentMask=-1;
    const scanObjects=[...new Set([...occluders,...interactions])],visibleObjects=[],hits=[],projected=new T.Vector3();
    const cast=(ray,objects)=>{
      visibleObjects.length=0;hits.length=0;
      for(const object of objects){let visible=true;for(let p=object;p;p=p.parent)if(!p.visible){visible=false;break;}if(visible)visibleObjects.push(object);}
      return ray.intersectObjects(visibleObjects,false,hits);
    };
    const api={hub,route,van,chassis,parcels,carried,brand,dogs,gates,hazards,weatherDrops,busLamps,emergencyLamps,labels,occluders,interactions,assetGroups,ray,
      dispose() {
        const geometries=new Set();
        for(const root of [hub,route,carried,inspected,dash]) { root.traverse(o=>{if(o.geometry&&!o.userData.fpAsset)geometries.add(o.geometry);if(o.isInstancedMesh)o.dispose();});root.removeFromParent(); }
        geometries.add(cube);geometries.add(plane);geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
      },
      sync(model,hubPlayer,area) {
        const inHub=area==='hub',reduced=OTR.fpAccess&&OTR.fpAccess.reduced();hub.visible=inHub;route.visible=!inHub;
        carried.visible=false;dash.visible=false;inspected.visible=false;
        if(inHub){camera.position.set(hubPlayer.x,1.65,hubPlayer.z);camera.rotation.set(-hubPlayer.pitch,-hubPlayer.yaw,0,'YXZ');view.mirror.on=false;}
        else if(model){
          const m=model,v=m.van,p=m.player,cx=m.mode==='cab'?v.x:p.x,cz=m.mode==='cab'?v.z:p.z;
          if(weatherDrops){
            for(let i=0;i<weatherDrops.count;i++){
              const time=reduced?0:m.elapsed;
              const t=time*(snow?.7:9),c=Math.cos(v.yaw),s=Math.sin(v.yaw);let x=((i*7.31)%18)-9,z=((i*11.73)%18)-9;
              if(m.mode==='cab'&&Math.abs(x*c+z*s)<1.5&&Math.abs(-x*s+z*c)<3){x+=c*3;z+=s*3;}
              dropPosition.set(cx+x+(snow?Math.sin(time+i)*.3:0),.3+((i*.63-t)%8+8)%8,cz+z);
              dropMatrix.compose(dropPosition,dropRotation,dropScale);weatherDrops.setMatrixAt(i,dropMatrix);
            }
            weatherDrops.instanceMatrix.needsUpdate=true;
          }
          const sceneryMoved=Math.abs(cx-sceneryX)>3||Math.abs(cz-sceneryZ)>3,solidMoved=cx!==solidX||cz!==solidZ;
          if(base.town&&(sceneryMoved||solidMoved)){
            if(sceneryMoved&&scene.assetBank)for(const group of assetGroups)scene.assetBank.cull(group,cx,cz,sceneryRadius);
            if(sceneryMoved){sceneryX=cx;sceneryZ=cz;}solidX=cx;solidZ=cz;
            // Compact nearby static instances in preallocated GPU buffers. Long street/ground planes always remain.
            for(const batch of staticBatches){if(!sceneryMoved&&!batch.bounded)continue;let count=0;
              for(const entry of batch.entries){const e=entry.matrix.elements;
                if((!entry.bounded&&Math.max(Math.abs(e[0]),Math.abs(e[10]))>20) || (e[12]-cx)**2+(e[14]-cz)**2<sceneryRadius*sceneryRadius){batch.mesh.setMatrixAt(count,entry.matrix);if(batch.mesh.instanceColor)batch.mesh.setColorAt(count,entry.color);count++;}
              }
              batch.mesh.count=count;batch.mesh.visible=count>0;batch.mesh.instanceMatrix.needsUpdate=true;if(batch.mesh.instanceColor)batch.mesh.instanceColor.needsUpdate=true;
            }
          }
          if(base.town){
            for(const mesh of occluders)if(mesh.parent===route)mesh.visible=(mesh.position.x-cx)**2+(mesh.position.z-cz)**2<sceneryRadius*sceneryRadius;
            for(const mesh of interactions)if(mesh.parent===route)mesh.visible=(mesh.position.x-cx)**2+(mesh.position.z-cz)**2<sceneryRadius*sceneryRadius;
          }
          van.position.set(v.x,0,v.z);van.rotation.y=-v.yaw;chassis.rotation.set(reduced?0:m.motion&&m.motion.pitch||0,0,reduced?0:m.motion&&m.motion.roll||0);van.visible=m.mode!=='cab';
          cargoDoor.visible=!m.cargoOpen;
          slotMeshes.forEach((mesh,i)=>mesh.visible=m.cargoOpen&&!m.parcels.some(p=>p.location===OTR.fpMission.slots[i].id));
          faultLamp.material=!m.repaired&&m.fault==='lights'?lampBad:lampGood;
          tyreBulge.visible=!m.repaired&&m.fault==='tyres';
          m.parcels.forEach((p,i)=>{
            const mesh=parcels[i],point=m.point(p.id);mesh.visible=!!point&&p.location!=='held'&&(!p.location.startsWith('slot')||m.cargoOpen)&&(!base.town||(point.x-cx)**2+(point.z-cz)**2<(m.mode==='cab'?cabParcelRange2:400));
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
          let mask=0;for(const s of m.stops)if(s.contacted&&!s.resolved&&(m.doorsteps?m._doorSpecs[s.id].present:s.service==='handover')&&(s.x-cx)**2+(s.z-cz)**2<=sceneryRadius*sceneryRadius)mask|=1<<s.id;
          if(mask!==residentMask){let count=0;residentMask=mask;
            for(const part of residentParts)if(mask&(1<<part.id)){residentBatch.setMatrixAt(count,part.matrix);residentBatch.setColorAt(count++,part.color);}
            residentBatch.count=count;residentBatch.visible=count>0;residentBatch.instanceMatrix.needsUpdate=true;if(residentBatch.instanceColor)residentBatch.instanceColor.needsUpdate=true;
          }
          if(m.doorsteps)for(let i=0;i<m.stops.length;i++){const d=m.doorsteps.stops[i],s=m.stops[i];
            if(dogs[i]){const p=m._doorSolids[i].dog;dogs[i].visible=!d.dogSecured&&Math.hypot(p.x-cx,p.z-cz)<35;dogs[i].position.set(p.x,0,p.z);gates[i].visible=!d.gateOpen&&!d.dogSecured&&Math.hypot(s.x-cx,s.z-cz)<sceneryRadius;}
            if(hazards[i])hazards[i].visible=!d.hazardCleared&&Math.hypot(s.x-cx,s.z-cz)<sceneryRadius;
          }
          if(bus&&m.driving){
            const b=m.driving.bus,e=m.driving.siren,flash=reduced||Math.floor(m.elapsed*2)%2===0;
            bus.visible=b.state==='flashing'||b.state==='leaving';bus.position.set(b.x,0,b.z);bus.rotation.y=-b.yaw;
            busLamps.visible=b.state==='flashing'&&flash;
            emergency.visible=e.state==='approaching'||e.state==='passing';emergency.position.set(e.x,0,e.z);emergency.rotation.y=-e.yaw;
            for(let i=0;i<emergencyLamps.children.length;i++)emergencyLamps.children[i].material=reduced?(i%2?flashBlue:flashRed):flash?flashRed:flashBlue;
          }
          const eye=OTR.fp.local(v,-1.3,-1.55);
          view.mirror.camera.position.set(eye.x,2.1,eye.z);view.mirror.camera.rotation.set(0,Math.PI-v.yaw-0.18,0,'YXZ');
          view.mirror.on=m.mode==='cab'&&!m.paused&&m.elapsed-m.mirrorAt<3.5;
        }
        world.updateMatrixWorld(true);
      },
      pick(){ray.setFromCamera({x:0,y:0},camera);const hit=cast(ray,scanObjects)[0];return hit?hit.object.userData.interaction||null:null;},
      scanTarget(){
        ray.setFromCamera({x:0,y:0},camera);
        const hit=cast(ray,scanObjects)[0];
        if(!hit||!hit.object.userData.scanId)return null;
        hit.object.getWorldQuaternion(scanRotation);hit.object.getWorldPosition(scanPoint);
        scanNormal.set(0,0,1).applyQuaternion(scanRotation);direction.copy(camera.position).sub(scanPoint).normalize();
        return scanNormal.dot(direction)>0.45?hit.object.userData.scanId:null;
      },
      labelPosition(label){
        if(!label.parent.visible)return null;
        if(label.local){label.point.copy(label.local);label.parent.localToWorld(label.point);direction.copy(label.normal).transformDirection(label.parent.matrixWorld);scanPoint.copy(camera.position).sub(label.point);if(direction.dot(scanPoint)<=0)return null;}
        if(camera.position.distanceTo(label.point)>label.max)return null;
        const p=projected.copy(label.point).project(camera);
        if(p.z< -1||p.z>1||Math.abs(p.x)>0.83||p.y>0.65||p.y< -0.53)return null;
        direction.copy(label.point).sub(camera.position);const distance=direction.length();direction.normalize();
        labelRay.set(camera.position,direction);labelRay.far=distance-0.2;
        if(cast(labelRay,occluders).length)return null;
        const screen=label.screen||(label.screen={x:0,y:0});screen.x=(p.x+1)*OTR.W/2;screen.y=(1-p.y)*OTR.H/2;return screen;
      }
    };
    view.mirror.before=()=>{van.visible=true;dash.visible=false;world.updateMatrixWorld(true);};
    view.mirror.after=()=>{van.visible=false;dash.visible=true;};
    return api;
  }
};
