/* Generated sign locations and bounded visual/readout adapters. Shared scoring stays separate. */
window.OTR = window.OTR || {};
OTR.fpSigns = {
  enabled(m){return !!(m&&m.kind==='campaign'&&m.town&&m.routePlan&&m.routePlan.signs===1);},
  prepare(plan){const out=OTR.fpMission.clone(plan);out.signs=1;return out;},
  runtime(m){
    if(!this.cache)this.cache=new WeakMap();let data=this.cache.get(m);if(data)return data;
    const catalog=this.catalog(m),grades=new Map(),types={stop:'drive.sign-stop',speed:'drive.sign-speed',school:'drive.sign-school',giveway:'drive.sign-giveway',roadworks:'drive.sign-roadworks',oneway:'drive.sign-oneway',noentry:'drive.sign-noentry'};
    for(const s of [...catalog.stops,...catalog.regulatory])if(types[s.kind])grades.set(s.id,{...s,type:types[s.kind],event:`driver:${types[s.kind]}:${s.id}`,seen:`sign-seen:${s.id}`});
    data={catalog,grades,limit:grades.get('speed:depot'),north:grades.get('school:north'),south:grades.get('school:south'),yield:grades.get('yield:depot'),oneway:grades.get('oneway:edge'),noentry:grades.get('noentry:edge'),worksN:grades.get('works:north'),worksS:grades.get('works:south')};this.cache.set(m,data);return data;
  },
  stopId(m,index,approach){return this.runtime(m).catalog.stops[index*4+{n:0,e:1,s:2,w:3}[approach]].id;},
  school(m,p){const s=m.town.school;return Math.abs(p.x-s.x)<=m.town.road/2&&p.z>=s.z0&&p.z<=s.z1;},
  onOneWay(m){const g=this.runtime(m).oneway,v=m.van;return !!g&&v.x>g.from+m.town.road/2&&v.x<g.to-m.town.road/2&&Math.abs(v.z-g.roadZ)<=m.town.road/2;},
  wrongWay(m){return this.onOneWay(m)&&m.van.speed*Math.sin(m.van.yaw)<-.1;},
  emit(m,g,ok,atSign=false){
    if(!g||m.events[g.event])return;const words={speed:['Kept to the posted speed limit.','Exceeded the posted speed limit.'],school:['Kept to the school-zone speed limit.','Exceeded the school-zone speed limit.'],giveway:['Gave way to traffic when leaving the depot.','Left the depot without giving way to nearby traffic.'],roadworks:['Used another street around the road closure.','Contacted the closure instead of following the diversion.'],oneway:['','Entered a one-way street against its direction.'],noentry:['','Entered a street from its prohibited end.']};
    m.log(g.event,'driving',ok?'good':'needs',words[g.kind][ok?0:1]);
    if(OTR.workday)OTR.workday.report(g.type,{key:g.id,stop:m.phase==='route'?m.activeStop+1:undefined,ok,where:{x:atSign?g.x:m.van.x,z:atSign?g.z:m.van.z,mph:atSign?0:Math.abs(m.van.speed)*2.2369362921}});
  },
  seen(m,g){if(g&&!m.events[g.seen]){m.events[g.seen]=true;m.touch();}},
  barrierContact(m){return !!(this.enabled(m)&&m.roadworks&&m.motion&&m.motion.contact&&OTR.fp.vanBox(m._motorPose||m.van,m.roadworks));},
  finish(m){if(!this.enabled(m))return;for(const g of this.runtime(m).grades.values())if(['speed','school'].includes(g.kind)&&m.events[g.seen])this.emit(m,g,true,true);},
  tick(m,old){
    if(!this.enabled(m)||m.mode!=='cab'||!m.departed||m.paused)return;
    const d=this.runtime(m),v=m.van,speed=Math.abs(v.speed),inSchool=this.school(m,v),wasSchool=this.school(m,old);
    if(inSchool){if(!m.events['sign-active:north']&&!m.events['sign-active:south']){m.events[(v.speed<0?-1:1)*Math.cos(v.yaw)>=0?'sign-active:north':'sign-active:south']=true;m.touch();}}
    else if(wasSchool||m.events['sign-active:north']||m.events['sign-active:south']){delete m.events['sign-active:north'];delete m.events['sign-active:south'];m.touch();}
    const grade=inSchool?(m.events['sign-active:north']?d.north:d.south):d.limit;
    if(speed>.3&&OTR.fpRoute.onStreet(m,v.x,v.z)){this.seen(m,grade);if(speed>OTR.fpRoute.limit(m)/2.2369362921)this.emit(m,grade,false);}
    // The posted give-way belongs to departure from the loading bay, not through traffic.
    if(m.leg===0&&Math.hypot(old.x-2.84,old.z-8)<=3&&Math.hypot(v.x-2.84,v.z-8)>3){
      let clear=true;for(const car of m.traffic){const dx=car.x-v.x,dz=car.z-v.z,c=Math.cos(v.yaw),s=Math.sin(v.yaw),across=c*dx+s*dz,along=-s*dx+c*dz;if(Math.abs(across)<2.5&&Math.abs(along)<Math.max(6,Math.abs(car.speed)*2))clear=false;}this.emit(m,d.yield,clear);
    }
    if(d.oneway){const g=d.oneway,half=m.town.road/2,dx=v.x-old.x,inRoad=Math.abs(v.z-g.roadZ)<=half;
      const extent=Math.abs(Math.cos(v.yaw))*1.08+Math.abs(Math.sin(v.yaw))*2.7,gate=d.noentry.x;
      if(inRoad&&dx<-.00001&&old.x-extent>gate&&v.x-extent<=gate)this.emit(m,d.noentry,false);
      else if(inRoad&&dx<-.00001&&v.x>g.from+half&&v.x<g.to-half&&!m.events[d.noentry.event])this.emit(m,d.oneway,false);
    }
    if(m.roadworks){const r=m.roadworks,side=old.z>=r.z?'north':'south',grade=side==='north'?d.worksN:d.worksS,seen=side==='north'?'sign-works:north':'sign-works:south';
      if((r.z-old.z)*(v.z-old.z)>0&&Math.abs(v.x-r.x)<m.town.road/2+1&&Math.abs(v.z-r.z)<28&&!m.events[seen]){m.events[seen]=true;m.touch();}
      if(this.barrierContact(m))this.emit(m,grade,false);
      if((old.z-r.z)*(v.z-r.z)<0&&Math.abs(v.x-r.x)>r.w/2+1.1&&m.events[seen])this.emit(m,grade,true);
    }
  },
  catalog(m) {
    if (!m || !m.town || !m.routePlan) return null;
    const source = OTR.town.build(m.routePlan.townSeed), scale = OTR.fpRoute.SCALE;
    const project = (x, y) => ({ x: (y - source.hy[0]) * scale, z: 8 - (x - source.depot.x) * scale });
    const streets = [], stops = [], numbers = [], half = m.town.road / 2;
    for (let row = 0; row < m.town.xs.length; row++) for (let col = 0; col < m.town.zs.length; col++) {
      const x = m.town.xs[row], z = m.town.zs[col], junction = row * m.town.zs.length + col;
      const control=OTR.fpTraffic&&OTR.fpTraffic.enabled(m)?OTR.fpTraffic.layout(m)[junction]:null;
      for (const [approach, yaw] of [['n', 0], ['e', Math.PI / 2], ['s', Math.PI], ['w', -Math.PI / 2]]) {
        const fx = Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = Math.sin(yaw);
        const kind=control&&control.kind==='signal'?'signal':control&&control.kind==='giveway'?(approach==='e'||approach==='w'?'junction-yield':'priority'):'stop';
        stops.push({ id: `stop:${row}:${col}:${approach}`, kind, control, junction, approach, yaw,
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
    const regulatory = [{id:'yield:depot',kind:'giveway',x:8,z:2,yaw:0},
      {id:'speed:depot',kind:'speed',limit:m.town.limit,x:half+.7,z:-1,yaw:0}];
    for(const [side,z,yaw] of [['north',m.town.school.z1+14,0],['south',m.town.school.z0-14,Math.PI]])regulatory.push({id:`school:${side}`,kind:'school',limit:m.town.schoolLimit,x:m.town.school.x+Math.cos(yaw)*(half+.7),z,yaw});
    if(m.roadworks){const advance=Math.min(18,Math.abs(m.town.zs[m.roadworks.to]-m.town.zs[m.roadworks.from])/2-half-1);for(const [side,offset,yaw] of [['north',advance,0],['south',-advance,Math.PI]])regulatory.push({id:`works:${side}`,kind:'roadworks',x:m.roadworks.x+Math.cos(yaw)*(half+2.2),z:m.roadworks.z+offset,yaw});}
    // A peripheral cross-street segment remains reachable from either end; no delivery facade
    // lies on it. Day one keeps the existing two-way grid.
    if(m.routePlan.day>=3&&this.enabled(m)){const z=m.town.zs[0],from=m.town.xs[1],to=m.town.xs[2];
      regulatory.push({id:'oneway:edge',kind:'oneway',x:from+half+1,z:z-half-.7,yaw:0,from,to,roadZ:z,street:source.spec.streetsV[0]});
      regulatory.push({id:'noentry:edge',kind:'noentry',x:to-half-1,z:z-half-.7,yaw:-Math.PI/2,from,to,roadZ:z});}
    return { streets, stops, numbers, regulatory, limit: m.town.limit, schoolLimit: m.town.schoolLimit,
      school: { from: project(source.vx[school.from], source.hy[school.row]), to: project(source.vx[school.to], source.hy[school.row]) } };
  },
  text(s){
    if(s.kind==='signal')return OTR.fpTraffic.signalText(s.aspect||'red');
    if(s.kind==='junction-yield')return 'Give way to traffic before entering the junction.';
    if(s.kind==='street')return `This is ${s.name}.`;
    if(s.kind==='number')return `This is number ${s.number} on ${s.street}.`;
    if(s.kind==='speed')return `The speed limit is ${s.limit} mph.`;
    if(s.kind==='school')return `A school zone starts ahead. Its speed limit is ${s.limit} mph.`;
    if(s.kind==='oneway')return `Traffic travels east on ${s.street}.`;
    return {stop:'Stop before the junction line.',giveway:'Give way to traffic before leaving the depot.',roadworks:'The street is closed. Follow another cross street.',noentry:'Do not enter this street from this end.'}[s.kind];
  },
  build(scene,m,route,add){
    const catalog=this.catalog(m);if(!catalog)return null;
    const T=THREE,entries=[],o=new T.Object3D(),sphere=new T.Sphere(),choices=Array(24).fill(null),distances=new Float64Array(24),high=OTR.gfx.high();
    const shapes={street:1,stop:2,giveway:3,'junction-yield':3,speed:4,school:5,roadworks:6,oneway:7,noentry:8,number:9,signal:10};
    for(const sign of [...catalog.stops,...catalog.regulatory,...catalog.streets,...catalog.numbers]){
      if(sign.kind==='priority')continue;
      const number=sign.kind==='number',street=sign.kind==='street',yaw=number?-sign.side*Math.PI/2:street?(sign.axis==='x'?Math.PI/2:0): -sign.yaw;
      const w=number?.65:street?2.2:1.05,h=number?.3:street?3.4:2.7,y=number?2.7:h/2;
      o.position.set(sign.x,y,sign.z);o.rotation.set(Math.PI/2,yaw,0,'YXZ');o.scale.set(w,1,h);o.updateMatrix();
      const local=new T.Vector3(sign.x,number?y:h-.32,sign.z),normal=new T.Vector3(Math.sin(yaw),0,Math.cos(yaw));local.addScaledVector(normal,.025);
      const label={parent:route,local,normal,point:new T.Vector3(),max:32,text:this.text(sign)};
      const colour=number?0xE8E5DC:street?0x185950:sign.kind==='stop'||sign.kind==='noentry'?0xB42E37:sign.kind==='school'||sign.kind==='roadworks'?0xE7B541:0xF2EEE3;
      const radius=Math.hypot(w,h)/2,entry={matrix:o.matrix.clone(),color:new T.Color(colour),hex:colour,flat:true,bounded:true,sign,shape:shapes[sign.kind],label,normal,signChosen:false,mainVisible:false,x:sign.x,z:sign.z,y,radius,sphere:new T.Sphere(new T.Vector3(sign.x,y,sign.z),radius)};entries.push(entry);add(entry);
    }
    return {catalog,entries,limit:high?24:5,choices,
      choose(cam,frustum,main){let count=0;choices.fill(null);distances.fill(Infinity);
        for(const e of entries){e.signChosen=false;if(main)e.mainVisible=false;
          if(e.sign.kind==='signal'){const aspect=OTR.fpTraffic.aspect(OTR.fpTraffic.signal(m.elapsed,e.sign.control.offset),e.sign.yaw);e.shape=aspect==='green'?12:aspect==='amber'?11:10;if(aspect!==e.sign.aspect){e.sign.aspect=aspect;e.label.text=OTR.fpTraffic.signalText(aspect);}}
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
    const previous=mesh.material,before=previous.onBeforeCompile,cache=previous.customProgramCacheKey();
    const shapes=new THREE.InstancedBufferAttribute(new Float32Array(entries.length),1),geometry=mesh.geometry.clone(),paint=mesh.material.clone();geometry.setAttribute('otrSignShape',shapes);mesh.geometry=geometry;mesh.material=paint;
    paint.onBeforeCompile=function(shader,renderer){before.call(this,shader,renderer);
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute float otrSignShape; varying float signShape; varying vec2 signUV;').replace('#include <begin_vertex>','#include <begin_vertex>\nsignShape=otrSignShape;signUV=uv;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float signShape; varying vec2 signUV;').replace('#include <color_fragment>',`#include <color_fragment>
        if(signShape>.5){float bottom=signShape>12.5?0.:signShape>9.5?.48:signShape>8.5?0.:signShape<1.5?.83:.62;
          if(signUV.y<bottom){if(abs(signUV.x-.5)>.035)discard;diffuseColor.rgb=vec3(.32,.36,.38);}
          else{vec2 p=vec2(signUV.x,(signUV.y-bottom)/(1.-bottom));vec2 a=abs(p-.5);
            if(signShape>1.5&&signShape<2.5&&a.x+a.y>.72)discard;
            if(signShape>2.5&&signShape<3.5){if(a.x>p.y*.5)discard;if(a.x>p.y*.5-.055||p.y>.91)diffuseColor.rgb=vec3(.7,.12,.16);}
            if(signShape>3.5&&signShape<4.5){if(length(p-.5)>.5)discard;if(length(p-.5)>.43)diffuseColor.rgb=vec3(.7,.12,.16);}
            if(signShape>4.5&&signShape<6.5&&a.x+a.y>.5)discard;
            if(signShape>7.5&&signShape<8.5){if(length(p-.5)>.5)discard;if(a.y<.09&&a.x<.38)diffuseColor.rgb=vec3(.95);}
            if(signShape>6.5&&signShape<7.5){if((a.y<.065&&p.x>.15&&p.x<.72)||(p.x>.58&&abs(p.y-.5)<(.9-p.x)*.75))diffuseColor.rgb=vec3(.1,.15,.17);}
            if(signShape>9.5&&signShape<12.5){if(a.x>.3)discard;diffuseColor.rgb=vec3(.07,.09,.1);float lamp=signShape<10.5?.8:signShape<11.5?.5:.2;
              for(int i=0;i<3;i++){float y=.8-float(i)*.3;if(length(vec2((p.x-.5)*1.5,p.y-y))<.115){diffuseColor.rgb=vec3(.2);if(abs(y-lamp)<.01)diffuseColor.rgb=i==0?vec3(1.,.12,.12):i==1?vec3(1.,.65,.05):vec3(.12,1.,.5);}}
            }
            if(signShape>12.5){float ink=0.;
              if(signShape<13.5){vec2 p1=p-vec2(.2,.18),p2=p-vec2(.8,.18);float wheel=min(abs(length(vec2(p1.x,p1.y*.8))-.14),abs(length(vec2(p2.x,p2.y*.8))-.14));
                if(wheel<.022)ink=1.;if(p.y>.18&&p.y<.46&&(abs(p.x-(.2+(p.y-.18)*.95))<.025||abs(p.x-(.8-(p.y-.18)*.95))<.025||abs(p.y-.18)<.025))ink=1.;
                if(length((p-vec2(.59,.84))*vec2(1.,.8))<.065)ink=2.;if(p.y>.47&&p.y<.77&&abs(p.x-(.46+(p.y-.47)*.38))<.055)ink=3.;
                if(p.y>.2&&p.y<.5&&abs(p.x-(.55-(p.y-.2)*.32))<.035)ink=1.;if(p.y>.53&&p.y<.7&&abs(p.x-(.83-(p.y-.53)*1.45))<.03)ink=2.;
              }else{if(abs(p.x-.5)<.04&&p.y<.45)ink=1.;if(p.y>.2&&p.y<.28&&a.x<.35)ink=1.;if(length((p-vec2(.5,.84))*vec2(1.,.8))<.13)ink=2.;if(p.y>.38&&p.y<.76&&a.x<.2)ink=3.;}
              if(ink<.5)discard;diffuseColor.rgb=ink>2.5?vec3(.95,.7,.16):ink>1.5?vec3(.68,.44,.3):vec3(.12,.17,.2);
            }
          }
        }`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        if(signShape>9.5&&signShape<12.5&&signUV.y>.48){vec2 p=vec2(signUV.x,(signUV.y-.48)/.52);float lamp=signShape<10.5?.8:signShape<11.5?.5:.2;
          if(length(vec2((p.x-.5)*1.5,p.y-lamp))<.115)totalEmissiveRadiance+=diffuseColor.rgb*.65;}
      `);
    };paint.customProgramCacheKey=()=>cache+'|otr-sign-shapes-2';paint.needsUpdate=true;return shapes;
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
    const visible=scene.art&&scene.art.signs?scene.art.signs.entries.filter(e=>e.mainVisible&&scene.art.labelPosition(e.label)):[];if(!visible.length){scene.message('Look toward a road sign, then read it again.');return;}
    scene.signUI.readIndex=(scene.signUI.readIndex+1)%visible.length;scene.message(visible[scene.signUI.readIndex].label.text);
  }
};
