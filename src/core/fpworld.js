/* Procedural depot, cargo and town, with optional locally bundled static models. Text stays in Phaser. */
window.OTR = window.OTR || {};
OTR.fpWorld = {
  build(scene, model) {
    const T = THREE, view = scene.view, world = view.world, camera = view.camera,brand=OTR.fpBrand.read();
    const cube = new T.BoxGeometry(1, 1, 1), plane = new T.PlaneGeometry(1,1).rotateX(-Math.PI/2), staticBatches=[], mats = new Map(), batches = new Map();
    const occluders = [], interactions = [], labels = [], assetGroups=[],exterior=[],stopDoors=[];let townArt=null,exteriorCapture=false;
    const hub = new T.Group(), route = new T.Group(); world.add(hub, route);
    const material = color => {
      if (!mats.has(color)) mats.set(color, new T.MeshLambertMaterial({ color }));
      return mats.get(color);
    };
    function box(parent, x, y, z, w, h, d, color, id, solid, surface=0) {
      const flat=h<=0.15&&(w>1||d>1);
      const mesh = new T.Mesh(flat?plane:cube, material(color)); mesh.position.set(x,y,z); mesh.scale.set(w,h,d);
      mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
      if (!id) {
        let pool = batches.get(parent); if (!pool) { pool = new Map(); batches.set(parent,pool); }
        // Keep flat surfaces and solid proxies in separate batches; colours are per instance.
        const key=(flat?'plane:':'box:')+(parent===route?'all':flat?color:'all')+(parent===route&&solid?':solid':'');
        const entry={matrix:mesh.matrix.clone(),color:new T.Color(color),hex:color,flat,bounded:!!solid,surface};
        if (!pool.has(key)) pool.set(key,[]); pool.get(key).push(entry);mesh.userData.fpBatchEntry=entry;
      }
      if(id||solid){
        parent.add(mesh);
        // Solid-only meshes remain exact raycast proxies. Their pixels come from the instance batch.
        if(!id)mesh.layers.set(1);
        if (solid) occluders.push(mesh);
        if (id) { mesh.userData.interaction = id; interactions.push(mesh); }
      }
      if(exteriorCapture){mesh.userData.fpParent=parent;exterior.push(mesh);}return mesh;
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
    if(base.trainingArea){
      const b=base.bounds,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
      box(route,cx,-.12,cz,b.x1-b.x0,.2,b.z1-b.z0,grassColour,null,false,3);
      const left=Math.max(b.x0,-5.5),right=Math.min(b.x1,5.5);
      if(right>left)box(route,(left+right)/2,-.015,cz,right-left,.06,b.z1-b.z0,roadColour,null,false,1);
      for(const x of [-6.3,6.3])if(x>b.x0&&x<b.x1)box(route,x,.05,cz,1.6,.13,b.z1-b.z0,0xC2C0B6,null,false,2);
      for(let z=Math.ceil(b.z0/6)*6;z<b.z1-2;z+=6)if(b.x0<0&&b.x1>0)box(route,0,.04,z,.09,.018,2.7,0xEDD385);
    }else if (!base.town) {
    box(route,0,-0.12,-56,40,0.2,158,grassColour,null,false,3);
    box(route,0,-0.015,-57,11,0.06,155,roadColour,null,false,1);
    [-6.3,6.3].forEach(x=>box(route,x,0.05,-63,1.6,0.13,128,0xC2C0B6,null,false,2));
    [-27,-89].forEach(z=>box(route,0,0,z,40,0.08,8,roadColour,null,false,1));
    box(route,0,0,-124,27,0.1,17,roadColour,null,false,1);
    box(route,-9,0,5,15,0.1,24,0xC4C1B6,null,false,2);
    for (let z=14; z>-119; z-=6) {
      if (Math.abs(z+27)<7||Math.abs(z+89)<7) continue;
      box(route,0,0.04,z,0.09,0.018,2.7,0xEDD385);
    }
    for (let x=-4.7;x<5;x+=1.1) box(route,x,0.05,-57,0.5,0.02,2.6,0xEFEEE5);
    box(route,2.75,0.05,-24,5.4,0.02,0.28,0xEFEEE5);
    }
    if (base.town) {
      const b=base.bounds,town=base.town,cx=(b.x0+b.x1)/2,cz=(b.z0+b.z1)/2;
      box(route,cx,-0.12,cz,b.x1-b.x0,0.2,b.z1-b.z0,grassColour,null,false,3);
      town.xs.forEach(x=>box(route,x,-0.015,cz,town.road,0.06,b.z1-b.z0,roadColour,null,false,1));
      town.zs.forEach(z=>box(route,cx,-0.015,z,b.x1-b.x0,0.06,town.road,roadColour,null,false,1));
      box(route,9,0,5,15,0.1,24,0xC4C1B6,null,false,2);
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
        if(!town.xs.some(cx=>Math.abs(x-cx)<half+3)){const oneWay=OTR.fpSigns&&OTR.fpSigns.enabled(base)&&base.routePlan.day>=3&&z===town.zs[0]&&x>town.xs[1]+half&&x<town.xs[2]-half;box(route,x,0.05,z,3,0.02,0.1,oneWay?0xEFEEE5:0xEDD385);}
      }
      if(base.trafficControl&&base.routePlan.day>=3){
        for(let i=0;i<7;i++)box(route,town.school.x-town.road/2+.8+i*(town.road-1.6)/6,.06,base.crossing.z,.6,.02,2,0xEFEEE5);
      }
      // Town models replace non-delivery visual pieces. Delivery facades/solids remain their own geometry.
      const lots=town.lots.filter(l=>!base.stops.some(s=>s.lotId===l.id));
      townArt=OTR.fpTown?OTR.fpTown.build(scene,base,route,box,material):null;
      if(townArt)assetGroups.push(...townArt.groups);
      else{
      const sample=lots.slice().sort((a,b)=>(a.x-4)**2+(a.z-8)**2-((b.x-4)**2+(b.z-8)**2)).slice(0,2);
      const group=scene.assetBank&&scene.assetBank.add(route,'town-garage',sample.map(l=>({x:l.x,z:l.z,w:l.w,h:l.h,d:l.d})));
      if(group)assetGroups.push(group);
      lots.forEach(l=>{if(!group||!sample.includes(l))box(route,l.x,l.h/2,l.z,l.w,l.h,l.d,0xBBC7BE);});
      }
    }
    if(!base.trainingArea||base.trainingArea.depot)base.solids.slice(0,4).forEach((s,i)=>box(route,s.x,s.h/2,s.z,s.w,s.h,s.d,i===3?0x9C8061:0xD7DDDB,null,true));
    if(base.parking){
      const b=base.parkingBay;for(const wall of base.parkingWalls)box(route,wall.x,wall.h/2,wall.z,wall.w,wall.h,wall.d,0xBBC7BE,null,true);
      box(route,0,.05,-57,b.width,.02,18,0x59666A);
      for(const side of [-1,1])box(route,b.x+side*1.3,.065,b.z,.07,.02,6,0xEFEEE5);
      for(const end of [-1,1])box(route,b.x,.065,b.z+end*3,2.6,.02,.07,0xEFEEE5);
      labels.push({parent:route,point:new T.Vector3(b.x,2.4,b.z+4),text:'Reverse into the marked bay and set the parking brake.',wrap:320,max:18});
    }
    const depotSide=base.town?-1:1;
    if(!base.trainingArea||base.trainingArea.depot){
    box(route,-13.8*depotSide,0.5,11,2,1,1.2,brand.primary,'dispatch',true);
    box(route,-13.8*depotSide,0.48,5,1.8,0.96,1.6,brand.accent,'returns',true);
    box(route,-13.8*depotSide,3.1,13,3.2,1.15,.1,brand.primary);
    labels.push({parent:route,point:new T.Vector3(-13.8*depotSide,3.1,13.08),text:brand.name,brand:true,max:24});
    labels.push({parent:route,point:new T.Vector3(-13.8*depotSide,2,11),text:'Dispatch',max:18});
    labels.push({parent:route,point:new T.Vector3(-13.8*depotSide,1.9,5),text:'Returns',max:18});
    }
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
    const particleCount=OTR.gfx.high()?36:base.routePlan&&base.routePlan.later===1?12:18;
    const weatherParticles=OTR.fpWeather&&(wet||snow||weather==='ice')?OTR.fpWeather.particles(scene,plane,weather,particleCount):null;
    const weatherDrops=weatherParticles?weatherParticles.mesh:(wet||snow)?new T.InstancedMesh(cube,material(snow?0xE7ECED:0xC4D7E1),particleCount):null;
    const dropMatrix=new T.Matrix4(),dropPosition=new T.Vector3(),dropScale=new T.Vector3(snow?.09:.025,snow?.09:.7,snow?.09:.025),dropRotation=new T.Quaternion();
    if(weatherDrops){weatherDrops.frustumCulled=false;route.add(weatherDrops);}
    const colors=[0xC9BCAB,0xBBC7BE,0xD5C3B0];
    base.stops.forEach((s,i)=>{
      if(base.trainingArea&&(s.x<base.bounds.x0||s.x>base.bounds.x1||s.z<base.bounds.z0||s.z>base.bounds.z1))return;
      const l=base.town?base.town.lots.find(l=>l.id===s.lotId):{x:13,z:s.z,w:6,d:9,h:4.2};
      const side=s.side||1;
      box(route,l.x,l.h/2,l.z,l.w,l.h,l.d,colors[i%colors.length],null,true,i%2?4:5);
      box(route,l.x,l.h+0.15,l.z,l.w+0.5,0.3,l.d+0.5,roofColour);
      box(route,s.x-side*1.7,0.08,s.z,3.4,0.15,2,0xC9C4B8,null,false,2);
      stopDoors[i]=box(route,s.x,1.3,s.z,0.08,2.5,1.25,0x654B70,'door'+i);
      const delivery=base._deliverySpecs&&base._deliverySpecs[i].protocol;
      if(!delivery||!['locker','reception'].includes(delivery.kind))box(route,s.x-side*0.6,0.4,s.z+1.7,0.65,0.8,0.75,base.routeDay&&base.routeDay.dispatch&&base.routeDay.dispatch.stop===i&&base.routeDay.dispatch.kind==='planter'?grassColour:0x927557);
      labels.push({parent:route,point:new T.Vector3(s.x-side*0.15,3.2,s.z),text:s.address,address:true,max:30});
    });
    if (!base.town&&!base.trainingArea) {
      box(route,6,1.2,-24,0.12,2.4,0.12,0x6E737B);
      sign(route,6,2.6,-24,'STOP',0xB94649,1.15);
      box(route,6,1.2,-10,0.12,2.4,0.12,0x6E737B);
      sign(route,6,2.6,-10,'15 mph',0xE5E1D6,1.4);
    }
    if (OTR.gfx.high()&&!base.town&&!base.trainingArea) {
      (base.town?base.town.xs:[-15,16]).forEach(x=>[-18,-49,-81,-115].forEach(z=>{
        box(route,x+9,1.3,z,0.4,2.6,0.4,0x826B53);
        box(route,x+9,3.5,z,3.8,3.5,3.6,0x607D54);
      }));
    }

    const van = new T.Group(); route.add(van);
    const chassis = new T.Group();van.add(chassis);exteriorCapture=true;
    box(chassis,0,0.42,0,2.16,0.25,5.4,0x454955,null,true);
    box(chassis,0,0.75,-1.85,2.1,0.8,1.7,brand.body,null,true);
    box(chassis,0,1.7,-0.95,2.1,2.55,0.15,brand.body,null,true);
    [-1.03,1.03].forEach(x=>box(chassis,x,1.78,0.8,0.12,2.65,3.5,brand.body,null,true));
    box(chassis,0,3.15,0.8,2.2,0.12,3.8,brand.body,null,true);
    exteriorCapture=false;
    let livery=null,liveryIndex=0;const liveryPart=new T.Object3D();
    if(!OTR.gfx.high()){const paint=new T.MeshLambertMaterial({side:T.DoubleSide});mats.set('livery-palette',paint);livery=new T.InstancedMesh(new T.PlaneGeometry(1,1),paint,4);chassis.add(livery);}
    for(const side of [-1,1]){
      if(livery)for(const [x,y,h,colour] of [[1.105,2.1,.8,brand.primary],[1.125,1.6,.12,brand.accent]]){
        liveryPart.position.set(side*x,y,.6);liveryPart.rotation.y=side*Math.PI/2;liveryPart.scale.set(2.1,h,1);liveryPart.updateMatrix();livery.setMatrixAt(liveryIndex,liveryPart.matrix);livery.setColorAt(liveryIndex++,new T.Color(colour));
      }else{box(chassis,side*1.105,2.1,.6,.025,.8,2.1,brand.primary);box(chassis,side*1.125,1.6,.6,.025,.12,2.1,brand.accent);}
      labels.push({parent:chassis,local:new T.Vector3(side*1.13,2.1,.6),point:new T.Vector3(),normal:new T.Vector3(side,0,0),text:brand.name,brand:true,max:16});
    }
    if(livery)livery.computeBoundingSphere();
    [-0.8,0.8].forEach(x=>box(chassis,x,1.06,0.9,0.48,0.12,3.3,0x827D74,null,true));
    exteriorCapture=true;
    [-1.09,1.09].forEach(x=>[-1.6,1.7].forEach(z=>box(van,x,0.42,z,0.22,0.7,0.7,0x2A2E35,x<0&&z<0?'tyres':null)));
    box(chassis,-1.08,1.65,-1.8,0.1,0.9,1.3,0x668193,'driver');exteriorCapture=false;
    box(chassis,0,0.96,-2.73,1.6,0.3,0.06,0xC9C8BD,'lights');
    const faultLamp=box(chassis,-0.68,1,-2.78,0.35,0.2,0.07,0xF8E8AE,'lights');
    box(chassis,0.68,1,-2.78,0.35,0.2,0.07,0xF8E8AE,'lights');
    const tyreBulge=box(van,-1.24,0.43,-1.6,0.17,0.28,0.3,0x555B65,'tyres');
    const lampGood=material(0xF8E8AE),lampBad=material(0x3D4148);
    const cargoDoor=box(chassis,0,1.8,2.62,1.9,2.5,0.08,brand.primary,'cargo',true);
    box(chassis,1.15,1.65,2.68,0.22,0.4,0.17,0xD9AE55,'cargo');
    const restraint=box(chassis,0,0.8,2.5,0.6,0.22,0.13,0xDBAE55,'secure');
    if(!OTR.gfx.high()){
      restraint.layers.set(1);const paint=new T.MeshLambertMaterial({color:0xDBAE55,side:T.DoubleSide});mats.set('restraint-surface',paint);
      const face=new T.Mesh(new T.PlaneGeometry(1,1),paint);face.position.set(0,.8,2.565);face.scale.set(.6,.22,1);chassis.add(face);
    }
    const slotMeshes=OTR.fpMission.slots.map(s=>box(chassis,s.x,1.12,s.z,0.48,0.05,0.65,0xA6C2BF,s.id));
    const slotBatch=new T.InstancedMesh(cube,material(0xA6C2BF),slotMeshes.length);let slotMask=-1;
    slotMeshes.forEach((mesh,i)=>{mesh.layers.set(1);slotBatch.setMatrixAt(i,mesh.matrix);});slotBatch.computeBoundingSphere();chassis.add(slotBatch);

    // All parcels share one palette mesh, while the original solid and barcode boxes remain
    // exact raycast proxies. On Low the printing/tape are surfaces, rather than seven tiny boxes.
    const parcelPositions=[],parcelNormals=[],parcelColours=[],parcelPlane=new T.PlaneGeometry(1,1);
    const parcelPart=(x,y,z,w,h,d,hex,printed=false,top=false)=>{
      const flat=printed&&!OTR.gfx.high(),geometry=(flat?parcelPlane:cube).clone();
      if(flat&&top)geometry.rotateX(-Math.PI/2);
      geometry.scale(w,flat&&top?1:h,flat?(top?d:1):d);geometry.translate(x,y,z);
      const source=geometry.index?geometry.toNonIndexed():geometry,colour=new T.Color(hex),positions=source.attributes.position.array,normals=source.attributes.normal.array;
      for(let i=0;i<positions.length;i++)parcelPositions.push(positions[i]);for(let i=0;i<normals.length;i++)parcelNormals.push(normals[i]);
      for(let i=0;i<positions.length/3;i++)parcelColours.push(colour.r,colour.g,colour.b);
      if(source!==geometry)source.dispose();geometry.dispose();
    };
    parcelPart(0,0,0,.43,.4,.52,0xB68D5C);
    parcelPart(0,OTR.gfx.high()?.205:.211,0,.09,.012,.53,0xDEC9A4,true,true);
    parcelPart(0,0,OTR.gfx.high()?.268:.274,.27,.17,.012,0xF2EEE3,true);
    for(let i=0;i<7;i++)parcelPart(-.09+i*.028,0,OTR.gfx.high()?.278:.281,i%2?.01:.016,.1,.006,0x343638,true);
    parcelPlane.dispose();const parcelGeometry=new T.BufferGeometry();
    parcelGeometry.setAttribute('position',new T.Float32BufferAttribute(parcelPositions,3));parcelGeometry.setAttribute('normal',new T.Float32BufferAttribute(parcelNormals,3));parcelGeometry.setAttribute('color',new T.Float32BufferAttribute(parcelColours,3));parcelGeometry.computeBoundingSphere();
    const parcelPaint=new T.MeshLambertMaterial({vertexColors:true});mats.set('parcel-palette',parcelPaint);
    function parcel(parent, id,draw=true) {
      const g=new T.Group();parent.add(g);if(draw){const visual=new T.Mesh(parcelGeometry,parcelPaint);visual.name='parcel-palette';g.add(visual);}
      const proxy=(y,z,w,h,d,hex)=>{const o=new T.Mesh(cube,material(hex));o.position.set(0,y,z);o.scale.set(w,h,d);o.updateMatrix();o.matrixAutoUpdate=false;o.layers.set(1);g.add(o);occluders.push(o);if(id){o.userData.interaction=id;interactions.push(o);}return o;};
      proxy(0,0,.43,.4,.52,0xB68D5C);const label=proxy(0,.268,.27,.17,.012,0xF2EEE3);
      label.userData.scanId=id;g.userData.barcode=label;return g;
    }
    const parcels=base.parcels.map(p=>parcel(route,p.id,false));
    const parcelEntries=parcels.map(mesh=>({matrix:mesh.matrix,sphere:new T.Sphere(),visible:false}));
    const parcelBatch=new T.InstancedMesh(parcelGeometry,parcelPaint,parcels.length);parcelBatch.name='route-parcels';parcelBatch.frustumCulled=false;route.add(parcelBatch);
    const carried=parcel(camera,null); carried.position.set(0.4,-0.48,-0.85); carried.rotation.y=-0.15;
    for(const x of [-.29,.29])box(carried,x,-.32,.1,.14,.25,.35,brand.uniform);
    const inspected=parcel(camera,null); inspected.position.set(-0.63,-0.02,-1.45); inspected.scale.setScalar(1.7);
    const dash=new T.Group();camera.add(dash);
    dash.name='cab-dashboard';const cameraRig=OTR.fpCamera?OTR.fpCamera.create():null,cabAnchor=new T.Object3D();
    if(cameraRig)dash.matrixAutoUpdate=false;
    const cab=OTR.fpCab?OTR.fpCab.build(dash,cube,interactions,labels,OTR.gfx.high()):null;
    let wheel=cab&&cab.wheel;
    if(!cab){
      box(dash,0,-0.68,-1.1,2.5,0.25,0.5,0x383D47);
      wheel=new T.Mesh(new T.TorusGeometry(0.18,0.022,OTR.gfx.high()?6:5,OTR.gfx.high()?18:16),material(0x242A31));
      wheel.position.set(-0.28,-0.5,-0.74);dash.add(wheel);
    }
    const cars=base.traffic.map((c,i)=>{
      const g=new T.Group();route.add(g);
      box(g,0,0.55,0,1.7,0.8,3.5,i?0x74909D:0xBD8975,null,true);
      box(g,0,1.2,-0.2,1.5,0.55,1.65,0x506673);
      return g;
    });
    const trafficBike=base.trafficControl&&base.routePlan.day>=4&&OTR.gfx.high()?new T.Group():null;
    if(trafficBike){
      route.add(trafficBike);trafficBike.name='traffic:bicycle';trafficBike.visible=false;
      box(trafficBike,0,.67,0,.08,.16,1.2,0x39667D);box(trafficBike,0,.45,0,.08,.16,1.1,0x39667D);
      box(trafficBike,0,.6,-.65,.08,.6,.08,0x89939B);box(trafficBike,0,.56,.6,.08,.45,.08,0x39667D);
      box(trafficBike,0,.94,-.65,.55,.16,.07,0x30373C);box(trafficBike,0,.78,.2,.3,.16,.3,0x30373C);
      const wheels=new T.InstancedMesh(new T.TorusGeometry(.31,.045,4,12).rotateY(Math.PI/2),material(0x30373C),2);
      for(let i=0;i<2;i++)wheels.setMatrixAt(i,new T.Matrix4().makeTranslation(0,.34,i?-.65:.65));trafficBike.add(wheels);
    }
    const person=new T.Group();route.add(person);
    const schoolChildren=base.trafficControl&&base.routePlan.day>=3?2:0;
    for(let i=0;i<(schoolChildren||1);i++){
      const z=i*1.1;box(person,0,1.1,z,.45,.75,.25,i?0x6B88A7:0xBD9155);box(person,0,1.65,z,.3,.32,.3,0xB68F72);
      if(schoolChildren)box(person,0,.38,z,.38,.75,.19,0x43515E);
      else[-.12,.12].forEach(x=>box(person,x,.38,z,.16,.75,.19,0x43515E));
    }
    if(schoolChildren)person.scale.setScalar(.72);
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
    const deliveryArt=OTR.fpStopScene?OTR.fpStopScene.build(base,route,box,labels):null;
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
    if(OTR.fpActors&&scene.assetBank&&scene.assetBank.models.has('van-exterior'))for(const side of [-1,1])box(chassis,side*1.18,1.76,-2.7,.25,.04,.58,0x303944);
    const actors=OTR.fpActors?OTR.fpActors.build(scene,base,route,van,chassis,brand,stopDoors):null;let innerVan=null;
    const ambient=OTR.fpAmbient?OTR.fpAmbient.build(scene,base,route,townArt,box,actors&&actors.paint):null;
    if(trafficBike&&!(actors&&actors.cyclist)){box(trafficBike,0,1.15,0,.4,.65,.25,0xE3B649);box(trafficBike,0,1.65,-.15,.28,.3,.28,0xB68F72);for(const x of [-.12,.12])box(trafficBike,x,.55,0,.16,.65,.16,0x43515E);}
    if(actors&&actors.vehicle){
      // The physical interior mirror stays at its C-23 location. Its view uses the retained cab shell,
      // since the source exterior's sloped windshield would sit between that camera and the cab.
      const entries=exterior.filter(mesh=>mesh.userData.fpParent===chassis&&mesh.userData.fpBatchEntry).map(mesh=>mesh.userData.fpBatchEntry);
      innerVan=new T.InstancedMesh(cube,material(0xFFFFFF),entries.length);for(let i=0;i<entries.length;i++){innerVan.setMatrixAt(i,entries[i].matrix);innerVan.setColorAt(i,entries[i].color);}innerVan.visible=false;innerVan.frustumCulled=false;innerVan.name='actor:retained-cab-shell';chassis.add(innerVan);
      for(const mesh of exterior.concat(cargoDoor)){if(mesh.parent)mesh.layers.set(1);const entry=mesh.userData.fpBatchEntry;if(entry){const pool=batches.get(mesh===cargoDoor?chassis:mesh.parent||mesh.userData.fpParent);if(pool)for(const entries of pool.values()){const at=entries.indexOf(entry);if(at>=0)entries.splice(at,1);}}}
    }
    const flashRed=material(0xE33E44),flashBlue=material(0x3B89DC);
    const addRoutePlane=entry=>{
      let pool=batches.get(route);if(!pool){pool=new Map();batches.set(route,pool);}if(!pool.has('plane:all'))pool.set('plane:all',[]);pool.get('plane:all').push(entry);
    };
    const signs=base.town&&OTR.fpSigns?OTR.fpSigns.build(scene,base,route,addRoutePlane):null;
    const trafficArt=OTR.fpTraffic?OTR.fpTraffic.art(base,addRoutePlane):null;
    const surfaces=OTR.fpMaterials?OTR.fpMaterials.build(scene,weather):null;
    const signLettering=OTR.fpSignLettering?OTR.fpSignLettering.build(signs,surfaces):null;
    if(surfaces&&townArt)for(const batch of townArt.batches)batch.surfaceKinds=surfaces.attach(batch.mesh,batch.entries);
    // Batch static details by material and parent to keep draw calls small on integrated GPUs.
    batches.forEach((pool,parent)=>pool.forEach(entries=>{
      if(!entries.length)return;
      const flat=entries[0].flat,coloured=parent!==route&&flat;
      const mesh=new T.InstancedMesh(flat?plane:cube,material(coloured?entries[0].hex:0xFFFFFF),entries.length);
      entries.forEach((entry,i)=>{mesh.setMatrixAt(i,entry.matrix);if(!coloured)mesh.setColorAt(i,entry.color);});mesh.instanceMatrix.needsUpdate=true;
      const signShapes=signs&&OTR.fpSigns.decorate(mesh,entries);if(signShapes)mats.set('sign-shapes',mesh.material);
      const surfaceKinds=surfaces&&parent===route?surfaces.attach(mesh,entries):null;
      const signWords=signLettering?signLettering.decorate(mesh,entries):null;
      mesh.computeBoundingSphere();parent.add(mesh);
      if(base.town&&parent===route)staticBatches.push({mesh,entries,bounded:entries[0].bounded,signShapes,surfaceKinds,signWords});
    }));
    const mirrors=OTR.fpMirrors?OTR.fpMirrors.build(scene,interactions):null;
    const rear=OTR.fpRear&&cab?OTR.fpRear.build(scene,cab.root,interactions,cab.navigation.local):null;
    const lighting=OTR.fpLighting?OTR.fpLighting.build(scene,{van,chassis,cab,cube,plane,weatherDrops,lampGood}):null;
    const weatherEffects=OTR.fpWeather&&cab?OTR.fpWeather.build(scene,cab,lighting,weather):null;
    const damage=OTR.fpDamageWorld?OTR.fpDamageWorld.build(scene,base,route,chassis,labels,actors):null;
    const walkVehicle=actors&&actors.vehicle,walkWheel=walkVehicle&&walkVehicle.parts.find(p=>p.name==='wheel-back-left'),walkDoor=walkVehicle&&walkVehicle.parts.find(p=>p.name==='door');
    // The loaded van's front profile differs from the fallback. Fit its lower inspection point once at build time.
    const walkBody=walkVehicle&&walkVehicle.parts.find(p=>p.name==='body');let walkFront=null;
    if(base.walkaround&&walkBody){
      const t=OTR.fpWalkaroundFlow.target('front'),surface=new T.Mesh(walkBody.g,walkVehicle.mesh.material);surface.updateMatrixWorld(true);
      const hit=new T.Raycaster(new T.Vector3(t.x,t.y,-4),new T.Vector3(0,0,1),0,2).intersectObject(surface,false)[0];
      if(hit)walkFront=hit.point.z-.008;
    }
    // Keep the retained cargo proxy behind the imported closed door's inspection surface.
    if(base.walkaround&&walkDoor){cargoDoor.position.z=walkDoor.g.boundingBox.max.z-.04;cargoDoor.updateMatrix();}

    const walkaroundTargets=base.walkaround?OTR.fpWalkaroundFlow.targets.map(t=>{
      const wheel=t.zone==='wheel'&&walkWheel,roof=t.zone==='roof'&&damage&&damage.roofSurface,parent=t.zone==='wheel'?van:chassis;
      const mesh=box(parent,wheel?wheel.g.boundingBox.min.x-.008:roof?roof.x:t.x,wheel?wheel.center.y:roof?roof.y:t.y,wheel?wheel.center.z:t.zone==='front'&&walkFront!==null?walkFront:t.zone==='rear'&&walkDoor?walkDoor.g.boundingBox.max.z+.008:t.z,t.w,t.h,t.d,0x4A4A46,'wear-'+t.zone);
      mesh.layers.set(1);mesh.name='walkaround-'+t.zone;return mesh;
    }):[];
    // Imported surfaces may lie inside the retained procedural pick shell (roof and wheel arches).
    // Only a visible, proximity-guarded wear target may pass that shell; other controls retain it.
    const walkShell=base.walkaround&&walkVehicle?new Set(exterior.filter(o=>occluders.includes(o))):null;
    const ray=new T.Raycaster();ray.far=2.65;ray.layers.enable(1);
    const labelRay=new T.Raycaster(), direction=new T.Vector3(), scanNormal=new T.Vector3(), scanPoint=new T.Vector3(), scanRotation=new T.Quaternion();
    labelRay.layers.enable(1);let residentMask=-1;
    const packageLabels=base.packageLabels&&OTR.fpPackageLabelWorld?OTR.fpPackageLabelWorld.build(route,{cube,interactions,occluders}):null;
    const packageSort=base.packageSort&&OTR.fpPackageSortWorld?OTR.fpPackageSortWorld.build(route,{cube,interactions,occluders}):null;
    const scanObjects=[...new Set([...occluders,...interactions])],visibleObjects=[],hits=[],projected=new T.Vector3();
    const cast=(ray,objects)=>{
      visibleObjects.length=0;hits.length=0;
      for(const object of objects){let visible=true;for(let p=object;p;p=p.parent)if(!p.visible){visible=false;break;}if(visible)visibleObjects.push(object);}
      return ray.intersectObjects(visibleObjects,false,hits);
    };
    const api={hub,route,surfaces,signLettering,van,chassis,cab,mirrors,rear,lighting,weatherEffects,weatherParticles,townArt,actors,ambient,innerVan,damage,walkaroundTargets,parcels,carried,brand,dogs,gates,hazards,deliveryArt,weatherDrops,busLamps,emergencyLamps,labels,occluders,interactions,assetGroups,ray,signs,trafficArt,trafficBike,schoolChildren,packageLabels,packageSort,
      dispose() {
        if(packageLabels)packageLabels.dispose();if(packageSort)packageSort.dispose();
        const geometries=new Set();if(ambient)ambient.dispose();if(damage)damage.dispose();if(weatherEffects)weatherEffects.dispose();if(weatherParticles)weatherParticles.dispose();if(rear)rear.dispose();if(lighting)lighting.dispose();if(townArt)townArt.dispose();if(actors)actors.dispose();if(cab)cab.dispose();if(mirrors)mirrors.dispose();view.mirror.before=view.mirror.after=null;view.mirror.on=false;
        for(const root of [hub,route,carried,inspected,dash]) { root.traverse(o=>{if(o.geometry&&!o.userData.fpAsset&&!o.geometry.userData.otrSurfaceOwned)geometries.add(o.geometry);if(o.isInstancedMesh)o.dispose();});root.removeFromParent(); }
        geometries.add(cube);geometries.add(plane);geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());if(signLettering)signLettering.dispose();if(surfaces)surfaces.dispose();
      },
      sync(model,hubPlayer,area) {
        if(packageLabels){const s=model.packageLabels;packageLabels.setItem(s.item);if(s.item&&packageLabels.currentFace()!==s.presentationFace)packageLabels.turn(s.presentationFace);}
        if(packageSort)packageSort.sync(model.packageSort);
        const inHub=area==='hub',reduced=OTR.fpAccess&&OTR.fpAccess.reduced();hub.visible=inHub;route.visible=!inHub;
        carried.visible=false;dash.visible=false;inspected.visible=false;
        if(inHub){camera.position.set(hubPlayer.x,1.65,hubPlayer.z);camera.rotation.set(-hubPlayer.pitch,-hubPlayer.yaw,0,'YXZ');view.mirror.on=false;}
        else if(model){
          const m=model,v=m.van,p=m.player,cx=m.mode==='cab'?v.x:p.x,cz=m.mode==='cab'?v.z:p.z;
          if(weatherDrops&&!weatherParticles){
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
            if(sceneryMoved){if(townArt)townArt.select(cx,cz);else if(scene.assetBank)for(const group of assetGroups)scene.assetBank.cull(group,cx,cz,sceneryRadius);}
            if(sceneryMoved){sceneryX=cx;sceneryZ=cz;}solidX=cx;solidZ=cz;
          }
          if(base.town){
            for(const mesh of occluders)if(mesh.parent===route)mesh.visible=(mesh.position.x-cx)**2+(mesh.position.z-cz)**2<sceneryRadius*sceneryRadius;
            for(const mesh of interactions)if(mesh.parent===route)mesh.visible=(mesh.position.x-cx)**2+(mesh.position.z-cz)**2<sceneryRadius*sceneryRadius;
          }
          const precise=!!(scene.panel&&scene.panel.type==='inspect'||m.mode!=='cab'&&scene.target||scene.handheld&&scene.handheld.aiming);
          const pose=cameraRig?OTR.fpCamera.update(cameraRig,m,!!reduced,OTR.gfx.high(),precise):null;
          van.position.set(v.x,0,v.z);van.rotation.y=-v.yaw;
          chassis.position.y=pose?pose.heave:0;chassis.rotation.set(pose?pose.bodyPitch:reduced?0:m.motion&&m.motion.pitch||0,0,pose?pose.bodyRoll:reduced?0:m.motion&&m.motion.roll||0);van.visible=m.mode!=='cab';
          cargoDoor.visible=!m.cargoOpen;
          let emptySlots=0;slotMeshes.forEach((mesh,i)=>{mesh.visible=m.cargoOpen&&!m.parcels.some(p=>p.location===OTR.fpMission.slots[i].id);if(mesh.visible)emptySlots|=1<<i;});
          if(emptySlots!==slotMask){slotMask=emptySlots;let count=0;for(const mesh of slotMeshes)if(mesh.visible)slotBatch.setMatrixAt(count++,mesh.matrix);slotBatch.count=count;slotBatch.visible=count>0;slotBatch.instanceMatrix.needsUpdate=true;}
          faultLamp.material=!m.repaired&&m.fault==='lights'?lampBad:lampGood;
          tyreBulge.visible=!m.repaired&&m.fault==='tyres';
          let parcelCount=0;m.parcels.forEach((p,i)=>{
            const mesh=parcels[i],point=m.point(p.id),locker=m.deliveryStops&&OTR.fpStopFlow.inLocker(m,p);mesh.visible=!!point&&(p.location!=='held'||locker)&&(!p.location.startsWith('slot')||m.cargoOpen)&&(!base.town||(point.x-cx)**2+(point.z-cz)**2<(m.mode==='cab'?cabParcelRange2:400));
            if(point){mesh.position.set(point.x,point.y,point.z);mesh.rotation.y=locker?-m.stops[p.stop].side*Math.PI/2:p.location.startsWith('slot')?-v.yaw:0;}
            if(point&&m.damage&&m.damage.enabled&&p.location.startsWith('slot')){
              const dx=m.damage.loadX*.03,dz=m.damage.loadZ*.035;
              mesh.position.x+=Math.cos(v.yaw)*dx-Math.sin(v.yaw)*dz;mesh.position.z+=Math.sin(v.yaw)*dx+Math.cos(v.yaw)*dz;
              mesh.rotation.y+=m.damage.loadX*.04;
            }
            const entry=parcelEntries[i];entry.visible=mesh.visible;
            if(mesh.visible){mesh.updateMatrix();entry.sphere.copy(parcelGeometry.boundingSphere).applyMatrix4(mesh.matrix);parcelBatch.setMatrixAt(parcelCount++,mesh.matrix);}
          });
          parcelBatch.count=parcelCount;parcelBatch.visible=parcelCount>0;parcelBatch.instanceMatrix.needsUpdate=true;
          carried.visible=!!m.heldId&&m.mode==='walk'&&(!m.deliveryStops||!OTR.fpStopFlow.inLocker(m,m.parcel(m.heldId)));dash.visible=m.mode==='cab';if(cab)cab.sync(m);else wheel.rotation.z=-v.steer*3;
          const scanning=scene.handheld&&scene.handheld.aiming;
          carried.position.set(scanning?0:0.4,scanning?0:-0.48,-0.85);
          carried.userData.barcode.userData.scanId=scanning?m.heldId:null;
          inspected.visible=!!(scene.panel&&scene.panel.type==='inspect');inspected.rotation.y=scene.inspectAngle||0;
          if(inspected.visible)carried.visible=false;
          if(pose){
            camera.position.set(pose.x,pose.y,pose.z);camera.rotation.set(pose.pitch,-pose.yaw,pose.roll,'YXZ');
            if(camera.fov!==pose.fov&&(reduced||precise||Math.abs(camera.fov-pose.fov)>.0001)){camera.fov=pose.fov;camera.updateProjectionMatrix();}
            // Anchor the cab even on foot so the interior mirror can reflect it from its physical position.
            const cc=Math.cos(v.yaw),ss=Math.sin(v.yaw);
            cabAnchor.position.set(v.x-.45*cc+1.85*ss,2.05+pose.bodyY,v.z-.45*ss-1.85*cc);cabAnchor.rotation.set(pose.bodyPitch,-v.yaw,pose.bodyRoll,'YXZ');cabAnchor.updateMatrix();camera.updateMatrix();dash.matrix.copy(camera.matrix).invert().multiply(cabAnchor.matrix);
          }else if(m.mode==='cab'){
            const eye=OTR.fp.local(v,-0.45,-1.45);camera.position.set(eye.x,2.05,eye.z);camera.rotation.set(-p.pitch,-v.yaw-v.look,0,'YXZ');
          }else{
            const local=OTR.fpMission.local(v,p),inside=m.cargoOpen&&Math.abs(local.x)<0.75&&local.z>-0.8&&local.z<2.6;
            camera.position.set(p.x,inside?2.15:1.65,p.z);camera.rotation.set(-p.pitch,-p.yaw,0,'YXZ');
          }
          m.traffic.forEach((c,i)=>{cars[i].visible=m.kind==='campaign';cars[i].position.set(c.x,0,c.z);cars[i].rotation.y=-c.yaw;});
          person.visible=m.kind==='campaign';person.position.set(m.crossing.x,0,m.crossing.z);
          if(trafficArt)trafficArt.sync(m);
          if(trafficBike){const c=m.trafficControl.cyclist;trafficBike.visible=(c.state==='beside'||c.state==='clear')&&Math.hypot(c.x-cx,c.z-cz)<35;trafficBike.position.set(c.x,0,c.z);trafficBike.rotation.y=-c.yaw;}
          if(actors)actors.sync(m,cx,cz,!!reduced);
          if(ambient)ambient.sync(m,cx,cz,!!reduced);
          if(actors&&actors.crossing)person.visible=false;
          let mask=0;for(const s of m.stops)if(s.contacted&&!s.resolved&&(m.doorsteps?m._doorSpecs[s.id].present:s.service==='handover')&&(s.x-cx)**2+(s.z-cz)**2<=sceneryRadius*sceneryRadius)mask|=1<<s.id;
          if(actors)mask&=~actors.residentMask;
          if(mask!==residentMask){let count=0;residentMask=mask;
            for(const part of residentParts)if(mask&(1<<part.id)){residentBatch.setMatrixAt(count,part.matrix);residentBatch.setColorAt(count++,part.color);}
            residentBatch.count=count;residentBatch.visible=count>0;residentBatch.instanceMatrix.needsUpdate=true;if(residentBatch.instanceColor)residentBatch.instanceColor.needsUpdate=true;
          }
          if(m.doorsteps)for(let i=0;i<m.stops.length;i++){const d=m.doorsteps.stops[i],s=m.stops[i];
            if(dogs[i]){const p=m._doorSolids[i].dog;dogs[i].visible=!d.dogSecured&&Math.hypot(p.x-cx,p.z-cz)<35;dogs[i].position.set(p.x,0,p.z);gates[i].visible=!d.gateOpen&&!d.dogSecured&&Math.hypot(s.x-cx,s.z-cz)<sceneryRadius;}
            if(hazards[i])hazards[i].visible=!d.hazardCleared&&Math.hypot(s.x-cx,s.z-cz)<sceneryRadius;
          }
          if(deliveryArt)deliveryArt.sync(m,cx,cz);
          if(bus&&m.driving){
            const b=m.driving.bus,e=m.driving.siren,flash=reduced||Math.floor(m.elapsed*2)%2===0;
            bus.visible=b.state==='flashing'||b.state==='leaving';bus.position.set(b.x,0,b.z);bus.rotation.y=-b.yaw;
            busLamps.visible=b.state==='flashing'&&flash;
            emergency.visible=e.state==='approaching'||e.state==='passing';emergency.position.set(e.x,0,e.z);emergency.rotation.y=-e.yaw;
            for(let i=0;i<emergencyLamps.children.length;i++)emergencyLamps.children[i].material=reduced?(i%2?flashBlue:flashRed):flash?flashRed:flashBlue;
          }
          if(!mirrors)view.mirror.on=false;
        }
        if(mirrors)mirrors.sync(model,area);
        if(weatherParticles&&model&&!inHub)weatherParticles.sync(model,reduced);
        if(damage&&model&&!inHub)damage.sync(model);
        for(let i=0;i<walkaroundTargets.length;i++)walkaroundTargets[i].visible=!!model&&!inHub&&OTR.fpWalkaroundFlow.canInspect(model,OTR.fpWalkaroundFlow.targets[i].zone);
        world.updateMatrixWorld(true);
        if(model&&!inHub){
          reflectFrustum.setFromProjectionMatrix(reflectMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
          if(signs)signs.choose(camera,reflectFrustum,true);
          // Use the same per-instance visibility in the main view as in reflections. A single
          // town-wide bounding sphere otherwise submits every nearby box behind the trainee.
          for(const batch of reflectBatches)compact(batch,reflectFrustum,true,model.mode==='cab'?model.van.x:model.player.x,model.mode==='cab'?model.van.z:model.player.z);
        }
        if(rear&&model)rear.sync(model,mirrors);else view.mirror.rearOn=false;
        if(lighting)lighting.sync(model||base,area);
        if(weatherEffects)weatherEffects.sync(model||base,area);
      },
      resetCamera(){if(cameraRig)cameraRig.model=null;},
      pick(){
        ray.setFromCamera({x:0,y:0},camera);let hit=cast(ray,scanObjects)[0];
        if(walkShell&&hit&&walkShell.has(hit.object))for(const candidate of hits){
          if(walkShell.has(candidate.object))continue;
          if((candidate.object.userData.interaction||'').startsWith('wear-'))hit=candidate;break;
        }
        return hit?hit.object.userData.interaction||null:null;
      },
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
        if(label.cab){label.point.copy(label.local);label.parent.localToWorld(label.point);}
        else if(label.local){label.point.copy(label.local);label.parent.localToWorld(label.point);direction.copy(label.normal).transformDirection(label.parent.matrixWorld);scanPoint.copy(camera.position).sub(label.point);if(direction.dot(scanPoint)<=0)return null;}
        if(camera.position.distanceTo(label.point)>label.max)return null;
        const p=projected.copy(label.point).project(camera);
        if(p.z< -1||p.z>1||Math.abs(p.x)>0.83||p.y>0.65||p.y< -0.53)return null;
        direction.copy(label.point).sub(camera.position);const distance=direction.length();direction.normalize();
        labelRay.set(camera.position,direction);labelRay.far=distance-0.2;
        if(cast(labelRay,occluders).length)return null;
        const screen=label.screen||(label.screen={x:0,y:0});screen.x=(p.x+1)*OTR.W/2;screen.y=(1-p.y)*OTR.H/2;return screen;
      }
    };
    // Reflection passes cull individual fixed instances, then restore the main-view buffers exactly.
    const reflectFrustum=new T.Frustum(),reflectMatrix=new T.Matrix4(),reflectSphere=new T.Sphere();
    const reflectBatches=staticBatches.concat(assetGroups.flatMap(g=>g.userData.batches),[{mesh:parcelBatch,entries:parcelEntries}],damage?[damage]:[]),cullMain=!OTR.gfx.high();
    const compact=(batch,frustum,main=false,cx=0,cz=0)=>{
      const mesh=batch.mesh;let count=0;
      for(const entry of batch.entries){if(entry.visible===false)continue;const e=entry.matrix.elements;
        if(main&&entry.damageVan&&model.mode==='cab')continue;
        if(entry.sign&&!entry.signChosen)continue;
        if(entry.town&&(mesh.userData.fpAsset?!entry.town.selected:townArt&&!townArt.fallback(entry)))continue;
        if(main&&entry.visible===undefined&&(entry.bounded||Math.max(Math.abs(e[0]),Math.abs(e[10]))<=20)&&(e[12]-cx)**2+(e[14]-cz)**2>=sceneryRadius*sceneryRadius)continue;
        reflectSphere.center.set(e[12],e[13],e[14]);reflectSphere.radius=Math.hypot(e[0],e[5],e[10])*.5;if(entry.sphere)reflectSphere.copy(entry.sphere);
        // High keeps offscreen shadow casters in the main batch. Reflections and Low have no
        // shadow pass that needs those instances, so their individual frusta can discard them.
        if((!main||cullMain)&&!frustum.intersectsSphere(reflectSphere))continue;mesh.setMatrixAt(count,entry.matrix);if(mesh.instanceColor)mesh.setColorAt(count,entry.color);if(batch.signShapes)batch.signShapes.setX(count,entry.shape||0);if(batch.surfaceKinds)batch.surfaceKinds.setX(count,entry.materialSurface||0);if(batch.signWords)OTR.fpSignLettering.write(batch.signWords,count,entry);if(main&&entry.sign)entry.mainVisible=true;count++;
      }
      mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      if(batch.signShapes)batch.signShapes.needsUpdate=true;if(batch.surfaceKinds)batch.surfaceKinds.needsUpdate=true;if(batch.signWords)OTR.fpSignLettering.dirty(batch.signWords);
    };
    for(const batch of reflectBatches){batch.mainMatrices=new Float32Array(batch.mesh.instanceMatrix.array.length);batch.mainColours=batch.mesh.instanceColor?new Float32Array(batch.mesh.instanceColor.array.length):null;batch.mainShapes=batch.signShapes?new Float32Array(batch.signShapes.array.length):null;batch.mainSurfaces=batch.surfaceKinds?new Float32Array(batch.surfaceKinds.array.length):null;batch.mainWords=batch.signWords?{a:new Float32Array(batch.signWords.a.array.length),b:new Float32Array(batch.signWords.b.array.length)}:null;}
    let vanWas=false,dashWas=false,screenWas=false,vehicleWas=false;
    view.mirror.before=(index=0)=>{
      if(view.mirror.cameras)view.mirror.camera=index===3?view.mirror.rearCamera:view.mirror.cameras[index];
      vanWas=van.visible;dashWas=dash.visible;van.visible=true;if(innerVan){vehicleWas=actors.vehicle.mesh.visible;if(index===2){actors.vehicle.mesh.visible=false;innerVan.visible=true;}}if(actors&&model)actors.reflect(true,model);dash.visible=index===2;if(mirrors)mirrors.hide(true);
      if(rear){screenWas=rear.screen.visible;rear.screen.visible=false;}
      const cam=view.mirror.camera;cam.updateMatrixWorld(true);reflectFrustum.setFromProjectionMatrix(reflectMatrix.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse));
      if(signs)signs.choose(cam,reflectFrustum,false);
      for(const batch of reflectBatches){const mesh=batch.mesh;batch.mainCount=mesh.count;batch.mainVisible=mesh.visible;batch.mainMatrices.set(mesh.instanceMatrix.array);if(batch.mainColours)batch.mainColours.set(mesh.instanceColor.array);if(batch.mainShapes)batch.mainShapes.set(batch.signShapes.array);if(batch.mainSurfaces)batch.mainSurfaces.set(batch.surfaceKinds.array);if(batch.mainWords){batch.mainWords.a.set(batch.signWords.a.array);batch.mainWords.b.set(batch.signWords.b.array);}compact(batch,reflectFrustum);}
      world.updateMatrixWorld(true);
    };
    view.mirror.after=()=>{
      van.visible=vanWas;if(innerVan){actors.vehicle.mesh.visible=vehicleWas;innerVan.visible=false;}if(actors&&model)actors.reflect(false,model);dash.visible=dashWas;if(mirrors)mirrors.hide(false);
      if(rear)rear.screen.visible=screenWas;
      for(const batch of reflectBatches){const mesh=batch.mesh;mesh.count=batch.mainCount;mesh.visible=batch.mainVisible;mesh.instanceMatrix.array.set(batch.mainMatrices);if(batch.mainColours)mesh.instanceColor.array.set(batch.mainColours);if(batch.mainShapes){batch.signShapes.array.set(batch.mainShapes);batch.signShapes.needsUpdate=true;}if(batch.mainSurfaces){batch.surfaceKinds.array.set(batch.mainSurfaces);batch.surfaceKinds.needsUpdate=true;}if(batch.mainWords){batch.signWords.a.array.set(batch.mainWords.a);batch.signWords.b.array.set(batch.mainWords.b);OTR.fpSignLettering.dirty(batch.signWords);}mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
      world.updateMatrixWorld(true);
    };
    return api;
  }
};
