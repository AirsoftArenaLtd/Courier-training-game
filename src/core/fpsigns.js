/* Generated sign locations and bounded visual/readout adapters. Shared scoring stays separate. */
window.OTR = window.OTR || {};
OTR.fpSigns = {
  catalog(m) {
    if (!m || !m.town || !m.routePlan) return null;
    const source = OTR.town.build(m.routePlan.townSeed), scale = OTR.fpRoute.SCALE;
    const project = (x, y) => ({ x: (y - source.hy[0]) * scale, z: 8 - (x - source.depot.x) * scale });
    const streets = [], stops = [], numbers = [], half = m.town.road / 2;
    for (let row = 0; row < m.town.xs.length; row++) for (let col = 0; col < m.town.zs.length; col++) {
      const x = m.town.xs[row], z = m.town.zs[col], junction = row * m.town.zs.length + col;
      // The 3D grid already requires a stop on every approach, including source-town lights.
      // C-32 introduces functioning signals; decorative lights must not change that obligation.
      for (const [approach, yaw] of [['n', 0], ['e', Math.PI / 2], ['s', Math.PI], ['w', -Math.PI / 2]]) {
        const fx = Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = Math.sin(yaw);
        stops.push({ id: `stop:${row}:${col}:${approach}`, kind: 'stop', junction, approach, yaw,
          x: x - fx * (half + 1) + rx * (half + .7), z: z - fz * (half + 1) + rz * (half + .7),
          line: { x: x - fx * (half + .25), z: z - fz * (half + .25) } });
      }
      streets.push({ id: `street:${row}:${col}:x`, kind: 'street', axis: 'x', name: source.spec.streetsH[row], x: x + half + .7, z: z + half + .7 });
      streets.push({ id: `street:${row}:${col}:z`, kind: 'street', axis: 'z', name: source.spec.streetsV[col], x: x + half + .7, z: z + half + .7 });
    }
    for (const lot of source.lots) {
      const b = m.town.lots.find(b => b.id === lot.id);
      if (!b) continue;
      numbers.push({ id: `number:${lot.id}`, kind: 'number', lotId: lot.id, number: lot.number,
        street: lot.street, x: b.x - lot.side * (b.w / 2 + .08), z: b.z, side: lot.side });
    }
    const school = source.spec.schoolZone;
    const regulatory = [{id:'yield:depot',kind:'giveway',x:half+.7,z:-5,yaw:0},
      {id:'speed:depot',kind:'speed',limit:m.town.limit,x:half+.7,z:-14,yaw:0}];
    for(const [side,z,yaw] of [['north',m.town.school.z1+1,0],['south',m.town.school.z0-1,Math.PI]])regulatory.push({id:`school:${side}`,kind:'school',limit:m.town.schoolLimit,x:m.town.school.x+Math.cos(yaw)*(half+.7),z,yaw});
    if(m.roadworks)for(const [side,offset,yaw] of [['north',10,0],['south',-10,Math.PI]])regulatory.push({id:`works:${side}`,kind:'roadworks',x:m.roadworks.x+Math.cos(yaw)*(half+.7),z:m.roadworks.z+offset,yaw});
    // A peripheral cross-street segment remains reachable from either end; no delivery facade
    // lies on it. Day one keeps the existing two-way grid.
    if(m.routePlan.day>=3){const z=m.town.zs[0],from=m.town.xs[1],to=m.town.xs[2];
      regulatory.push({id:'oneway:edge',kind:'oneway',x:from+half+1,z:z+half+.7,yaw:Math.PI/2,from,to,roadZ:z});
      regulatory.push({id:'noentry:edge',kind:'noentry',x:to-half-1,z:z-half-.7,yaw:-Math.PI/2,from,to,roadZ:z});}
    return { streets, stops, numbers, regulatory, limit: m.town.limit, schoolLimit: m.town.schoolLimit,
      school: { from: project(source.vx[school.from], source.hy[school.row]), to: project(source.vx[school.to], source.hy[school.row]) } };
  },
  text(s){
    if(s.kind==='street')return `This is ${s.name}.`;
    if(s.kind==='number')return `This is number ${s.number} on ${s.street}.`;
    if(s.kind==='speed')return `The speed limit is ${s.limit} mph.`;
    if(s.kind==='school')return `The school-zone speed limit is ${s.limit} mph.`;
    return {stop:'Stop before the junction line.',giveway:'Give way to traffic before leaving the depot.',roadworks:'The street is closed. Follow another cross street.',oneway:'Traffic travels one way toward the next cross street.',noentry:'Do not enter this street from this end.'}[s.kind];
  },
  build(scene,m,route,add){
    const catalog=this.catalog(m);if(!catalog)return null;
    const T=THREE,entries=[],o=new T.Object3D(),sphere=new T.Sphere(),choices=Array(24).fill(null),distances=new Float64Array(24),high=OTR.gfx.high();
    const shapes={street:1,stop:2,giveway:3,speed:4,school:5,roadworks:6,oneway:7,noentry:8,number:9};
    for(const sign of [...catalog.stops,...catalog.regulatory,...catalog.streets,...catalog.numbers]){
      const number=sign.kind==='number',street=sign.kind==='street',yaw=number?-sign.side*Math.PI/2:street?(sign.axis==='x'?Math.PI/2:0): -sign.yaw;
      const w=number?.65:street?2.2:1.05,h=number?.3:street?2.9:2.7,y=number?2.7:h/2;
      o.position.set(sign.x,y,sign.z);o.rotation.set(Math.PI/2,yaw,0,'YXZ');o.scale.set(w,1,h);o.updateMatrix();
      const local=new T.Vector3(sign.x,number?y:h-.32,sign.z),normal=new T.Vector3(Math.sin(yaw),0,Math.cos(yaw));local.addScaledVector(normal,.025);
      const label={parent:route,local,normal,point:new T.Vector3(),max:32,text:this.text(sign)};
      const colour=number?0xE8E5DC:street?0x185950:sign.kind==='stop'||sign.kind==='noentry'?0xB42E37:sign.kind==='school'||sign.kind==='roadworks'?0xE7B541:0xF2EEE3;
      const radius=Math.hypot(w,h)/2,entry={matrix:o.matrix.clone(),color:new T.Color(colour),hex:colour,flat:true,bounded:true,sign,shape:shapes[sign.kind],label,normal,signChosen:false,mainVisible:false,x:sign.x,z:sign.z,y,radius,sphere:new T.Sphere(new T.Vector3(sign.x,y,sign.z),radius)};entries.push(entry);add(entry);
    }
    return {catalog,entries,limit:high?24:5,choices,
      choose(cam,frustum,main){let count=0;choices.fill(null);distances.fill(Infinity);
        for(const e of entries){e.signChosen=false;if(main)e.mainVisible=false;
          const dx=cam.position.x-e.x,dz=cam.position.z-e.z,d2=dx*dx+dz*dz;
          if(d2>(high?70:38)**2||dx*e.normal.x+dz*e.normal.z<.1)continue;
          sphere.center.set(e.x,e.y,e.z);sphere.radius=e.radius;if(!frustum.intersectsSphere(sphere))continue;
          const score=e.sign.kind==='number'?d2*1.35:e.sign.kind==='street'?d2*1.1:d2-350;let at=0;while(at<count&&distances[at]<=score)at++;
          if(at>=this.limit)continue;count=Math.min(count+1,this.limit);for(let i=count-1;i>at;i--){choices[i]=choices[i-1];distances[i]=distances[i-1];}choices[at]=e;distances[at]=score;
        }
        for(let i=0;i<count;i++)choices[i].signChosen=true;
      },dispose(){}
    };
  },
  decorate(mesh,entries){
    if(!entries.some(e=>e.sign))return null;
    const shapes=new THREE.InstancedBufferAttribute(new Float32Array(entries.length),1),geometry=mesh.geometry.clone(),paint=mesh.material.clone();geometry.setAttribute('otrSignShape',shapes);mesh.geometry=geometry;mesh.material=paint;
    paint.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float otrSignShape; varying float signShape; varying vec2 signUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nsignShape=otrSignShape;signUV=uv;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float signShape; varying vec2 signUV;').replace('#include <color_fragment>',`#include <color_fragment>
        if(signShape>.5){float bottom=signShape>8.5?0.:signShape<1.5?.83:.62;
          if(signUV.y<bottom){if(abs(signUV.x-.5)>.035)discard;diffuseColor.rgb=vec3(.32,.36,.38);}
          else{vec2 p=vec2(signUV.x,(signUV.y-bottom)/(1.-bottom));vec2 a=abs(p-.5);
            if(signShape>1.5&&signShape<2.5&&a.x+a.y>.72)discard;
            if(signShape>2.5&&signShape<3.5){if(a.x>p.y*.5)discard;if(a.x>p.y*.5-.055||p.y>.91)diffuseColor.rgb=vec3(.7,.12,.16);}
            if(signShape>3.5&&signShape<4.5){if(length(p-.5)>.5)discard;if(length(p-.5)>.43)diffuseColor.rgb=vec3(.7,.12,.16);}
            if(signShape>4.5&&signShape<6.5&&a.x+a.y>.5)discard;
            if(signShape>7.5&&signShape<8.5){if(length(p-.5)>.5)discard;if(a.y<.09&&a.x<.38)diffuseColor.rgb=vec3(.95);}
            if(signShape>6.5&&signShape<7.5){if((a.y<.065&&p.x>.15&&p.x<.72)||(p.x>.58&&abs(p.y-.5)<(.9-p.x)*.75))diffuseColor.rgb=vec3(.1,.15,.17);}
          }
        }`);
    };paint.customProgramCacheKey=()=> 'otr-sign-shapes-1';paint.needsUpdate=true;return shapes;
  },
  createUI(scene){
    scene.signUI={lastAt:-1000,readIndex:-1,occupied:[],pool:Array.from({length:5},()=>({back:scene.add.rectangle(0,0,1,1,0x10232E,.9).setDepth(9).setVisible(false),text:OTR.txt(scene,0,0,'',OTR.fpAccess.settings().large?22:18,'#ffffff',{wrap:220,align:'center'}).setDepth(10).setVisible(false),entry:null}))};
  },
  updateUI(scene,occupied){
    const ui=scene.signUI;if(!ui)return;const blocked=!scene.art.signs||scene.panel||scene.external||scene.transitioning||scene.handheld&&scene.handheld.isOpen;
    const top=Math.max(92,scene.soundCue.visible?scene.soundCue.y+scene.soundCue.displayHeight+10:92);
    if(!blocked&&scene.time.now-ui.lastAt<90&&ui.top===top&&ui.navX===scene.navRoot.x&&ui.navY===scene.navRoot.y&&ui.navVisible===scene.navRoot.visible)return;
    ui.top=top;ui.navX=scene.navRoot.x;ui.navY=scene.navRoot.y;ui.navVisible=scene.navRoot.visible;ui.lastAt=blocked?-1000:scene.time.now;
    for(const slot of ui.pool){slot.text.setVisible(false);slot.back.setVisible(false);slot.entry=null;}if(blocked)return;
    const bounds=[],point=ui.point||(ui.point=new THREE.Vector3());let count=0;
    // Keep projected text off the actual mirrors and live reversing screen, including when
    // the world sign itself sits beyond them along the same line of sight.
    for(const target of [...(scene.art.mirrors?scene.art.mirrors.targets:[]),...(scene.art.rear&&scene.art.rear.screen.visible?[scene.art.rear.screen]:[])]){
      const g=target.geometry.parameters,w=g.width||1,h=g.height||1;let left=Infinity,right=-Infinity,up=Infinity,down=-Infinity;
      for(const x of [-w/2,w/2])for(const y of [-h/2,h/2]){point.set(x,y,0).applyMatrix4(target.matrixWorld).project(scene.view.camera);if(point.z<-1||point.z>1)continue;const px=(point.x+1)*640,py=(1-point.y)*360;left=Math.min(left,px);right=Math.max(right,px);up=Math.min(up,py);down=Math.max(down,py);}
      if(Number.isFinite(left))bounds.push({x:(left+right)/2,y:(up+down)/2,w:right-left+12,h:down-up+12});
    }
    for(const e of scene.art.signs.entries){if(!e.mainVisible)continue;const p=scene.art.labelPosition(e.label);if(!p||p.y<top||p.y>490&&scene.model.mode==='cab'||p.y>615||occupied.some(q=>Math.abs(q.x-p.x)<170&&Math.abs(q.y-p.y)<45))continue;
      const slot=ui.pool[count],text=OTR.i18n?OTR.i18n.t(e.label.text):e.label.text;if(slot.text.text!==text)slot.text.setText(e.label.text);
      const w=slot.text.width+16,h=slot.text.height+10,x=p.x;let y=p.y-h/2-8;
      const nav=scene.navRoot.visible?scene.navRoot.getBounds():null,overlap=()=>bounds.some(b=>Math.abs(x-b.x)<(w+b.w)/2+6&&Math.abs(y-b.y)<(h+b.h)/2+6)||nav&&x+w/2>nav.x&&x-w/2<nav.right&&y+h/2>nav.y&&y-h/2<nav.bottom;
      for(let move=0;move<3&&overlap();move++)y-=h+6;
      if(overlap()||x-w/2<10||x+w/2>1270||y-h/2<top||y+h/2>620)continue;
      slot.entry=e;slot.text.setPosition(x,y).setVisible(true);slot.back.setPosition(x,y).setDisplaySize(w,h).setVisible(true);bounds.push({x,y,w,h});if(++count===ui.pool.length)break;
    }
  },
  read(scene){
    const visible=scene.signUI.pool.filter(s=>s.entry);if(!visible.length){scene.message('Look toward a road sign, then read it again.');return;}
    scene.signUI.readIndex=(scene.signUI.readIndex+1)%visible.length;scene.message(visible[scene.signUI.readIndex].entry.label.text);
  }
};
