/* One reusable pool of imported cars, one person, and small procedural cues. No new texture or render pass. */
window.OTR=window.OTR||{};
OTR.fpHazardLessonWorld={
  build(scene,m,parent,cube){
    const T=THREE,root=new T.Group();root.name='hazard-clip-pool';parent.add(root);
    const paint=new T.MeshLambertMaterial({color:0xffffff,vertexColors:true}),dark=new T.MeshLambertMaterial({color:0x25323B}),red=new T.MeshBasicMaterial({color:0xB53235}),white=new T.MeshBasicMaterial({color:0xF5F5E8}),amber=new T.MeshLambertMaterial({color:0xD48C39});
    const car=new T.Group();root.add(car);
    const asset=scene.assetBank?.add(car,'town-parked-car',[{x:0,z:0,w:1.8,h:1.45,d:4.3},{x:0,z:6.8,w:1.8,h:1.45,d:4.3}]);
    const scratch=new T.Object3D(),colour=new T.Color(),fallback=asset?null:new T.InstancedMesh(cube,paint,4);if(fallback){fallback.frustumCulled=false;car.add(fallback);}
    const person=new T.Group();root.add(person);
    const actor=scene.assetBank&&OTR.fpActors?OTR.fpActors.character(scene.assetBank.models.get('resident-men'),paint,0x466D82,0xBC9476):null;
    const figure=actor?actor.mesh:new T.InstancedMesh(cube,paint,6);figure.frustumCulled=false;person.add(figure);
    const parts=[[-.12,.36,.16,.72,.2,0x354956],[.12,.36,.16,.72,.2,0x354956],[0,1.06,.46,.68,.27,0x466D82],[0,1.59,.29,.31,.28,0xBC9476],[-.31,1.05,.13,.62,.15,0x466D82],[.31,1.05,.13,.62,.15,0x466D82]];
    if(!actor)for(let i=0;i<parts.length;i++){const p=parts[i];scratch.position.set(p[0],p[1],0);scratch.rotation.set(0,0,0);scratch.scale.set(p[2],p[3],p[4]);scratch.updateMatrix();figure.setMatrixAt(i,scratch.matrix);figure.setColorAt(i,colour.setHex(p[5]));}
    if(fallback)for(let i=0;i<4;i++){const top=i%2;scratch.position.set(0,top?1.05:.48,i<2?0:6.8);scratch.rotation.set(0,0,0);scratch.scale.set(top?1.5:1.8,top?.55:.75,top?2.1:4.3);scratch.updateMatrix();fallback.setMatrixAt(i,scratch.matrix);fallback.setColorAt(i,colour.setHex(top?0x607B87:0x536F7B));}
    const ball=new T.Mesh(OTR.gfx.high()?new T.SphereGeometry(.24,12,8):new T.OctahedronGeometry(.24),red);root.add(ball);
    const door=new T.Group();door.position.set(-.92,1,-.7);const leaf=new T.Mesh(cube,amber);leaf.position.z=.45;leaf.scale.set(.06,.8,.9);door.add(leaf);car.add(door);
    const lamps=new T.InstancedMesh(cube,white,2);lamps.frustumCulled=false;car.add(lamps);for(let i=0;i<2;i++){scratch.position.set(i?.6:-.6,.7,2.16);scratch.rotation.set(0,0,0);scratch.scale.set(.24,.13,.035);scratch.updateMatrix();lamps.setMatrixAt(i,scratch.matrix);}
    const phone=new T.Mesh(cube,dark);phone.scale.set(.08,.14,.04);person.add(phone);
    const junction=new T.Group();root.add(junction);
    const road=new T.Mesh(cube,dark);road.scale.set(38,.04,8);road.position.y=-.005;junction.add(road);
    const line=new T.Mesh(cube,white);line.scale.set(.18,.025,3.2);line.position.set(7.8,.04,1.8);junction.add(line);
    const sign=new T.Group();sign.position.set(8,0,5);sign.rotation.y=Math.PI/2;junction.add(sign);
    const pole=new T.Mesh(cube,dark);pole.position.y=1.1;pole.scale.set(.06,2.2,.06);sign.add(pole);
    const face=new T.Mesh(new T.CircleGeometry(.58,8),red);face.position.set(0,2.15,.04);sign.add(face);
    const back=new T.Mesh(face.geometry,dark);back.rotation.y=Math.PI;back.position.set(0,2.15,.03);sign.add(back);
    // Reuse C-50's original glyph geometry data on the physical face. J reads the full translated meaning.
    const pixels=[];for(let ch=0;ch<4;ch++){const rows=OTR.fpSignLettering?.rows['STOP'[ch]];if(rows)for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(rows[y][x]==='1')pixels.push([(ch*6+x-11.5)*.035,2.15+(3-y)*.035]);}
    const ink=new T.InstancedMesh(cube,white,pixels.length);ink.frustumCulled=false;sign.add(ink);for(let i=0;i<pixels.length;i++){scratch.position.set(pixels[i][0],pixels[i][1],.048);scratch.rotation.set(0,0,0);scratch.scale.set(.029,.029,.008);scratch.updateMatrix();ink.setMatrixAt(i,scratch.matrix);}
    const api={root,asset,actor,car,person,ball,door,lamps,phone,junction,sign,ink,
      sync(model,reduced){
        const s=model.hazardLesson,c=s.clip;root.visible=true;car.visible=c.kind!=='phone';car.position.set(s.carX,0,s.carZ-(c.kind==='ball'?3.4:0));car.rotation.y=s.carYaw;
        if(asset)for(const {mesh} of asset.userData.batches)mesh.count=c.kind==='ball'?2:1;if(fallback)fallback.count=c.kind==='ball'?4:2;
        person.visible=s.personVisible;person.position.set(s.personX,0,s.personZ);person.rotation.y=-Math.PI/2;person.scale.setScalar(c.kind==='ball'?.72:1);
        if(actor&&person.visible)actor.pose(s.phone?'Interact':'Walk',s.time,reduced,OTR.gfx.high());
        ball.visible=s.ballVisible;ball.position.set(s.ballX,.24,s.cueZ);door.visible=c.kind==='door';door.rotation.y=s.doorAngle;
        lamps.visible=s.lamps;lamps.material=c.kind==='reversing'?white:red;phone.visible=s.phone;phone.position.set(-.3,1.25,.3);
        junction.visible=c.kind==='runner';junction.position.z=s.cueZ;
      },
      dispose(){if(actor)actor.dispose();paint.dispose();dark.dispose();red.dispose();white.dispose();amber.dispose();}
    };api.sync(m,!!m.hazardLesson.reduced);return api;
  }
};
