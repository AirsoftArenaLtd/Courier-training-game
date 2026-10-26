/* Texture-free sky and headlight illumination; optional High shadows and contact ambient occlusion. */
window.OTR=window.OTR||{};
OTR.fpLighting={
  times:['morning','midday','dusk','night'],
  time(m){
    const stop=m?.customerStop;if(stop?.wellness){const tod=stop.def?.tod||stop.content?.tod,mapped=tod==='evening'?'dusk':tod==='afternoon'?'midday':tod;if(this.times.includes(mapped))return mapped;}
    const plan=m&&m.routePlan,clock=((m&&m.briefing?m.briefing.clockMin:plan&&Number.isFinite(plan.clockMin)?plan.clockMin:480)+(m?m.elapsed:0)/60)%1440;
    let value=plan&&plan.timeOfDay|| (clock<360||clock>=1140?'night':clock<660?'morning':clock<1020?'midday':'dusk');
    if(value==='night'&&m&&m.workdayRules&&m.workdayRules.night===false)value='morning';return value;
  },
  caption(time,on,reducedVisibility=false){
    if(time==='night')return on?'It is night. The headlights are on.':'It is night. Switch on the headlights before moving.';
    if(time==='dusk')return on?'It is dusk. The headlights are on.':'It is dusk. Switch on the headlights before moving.';
    if(reducedVisibility)return on?'Visibility is reduced. The headlights are on.':'Visibility is reduced. Switch on the headlights before moving.';
    return time==='midday'?'It is midday.':'It is morning.';
  },
  build(scene,parts){
    const T=THREE,view=scene.view,world=view.world,high=OTR.gfx.high(),shadowSpan=high&&Number.isFinite(parts.shadowSpan)?Math.max(20,Math.min(90,parts.shadowSpan)):90,point=new T.Vector3(),sunDir=new T.Vector3(),rig=new T.Group();world.add(rig);
    const owned=!view.lights,lights=view.lights||{sky:new T.HemisphereLight(0xE9F1FF,0x63594C,1.5),sun:new T.DirectionalLight(0xFFF0DC,1.4)};
    if(owned){world.add(lights.sky,lights.sun,lights.sun.target);view.lights=lights;}
    const sun=lights.sun,ambient=lights.sky,original={sunColour:sun.color.clone(),sunIntensity:sun.intensity,sunPosition:sun.position.clone(),targetPosition:sun.target.position.clone(),skyColour:ambient.color.clone(),skyIntensity:ambient.intensity,background:world.background&&world.background.clone(),fog:world.fog&&world.fog.color.clone(),fogNear:world.fog&&world.fog.near,fogFar:world.fog&&world.fog.far};
    const presets=[{top:0x739ECB,horizon:0xE2CCB8,sun:0xFFF0D6,dir:[-.7,.48,.5],ambient:1.2,direct:1.75},
      {top:0x4F8ECA,horizon:0xC9DCE9,sun:0xFFF7E8,dir:[-.25,.95,-.18],ambient:1.3,direct:1.8},
      {top:0x3F537D,horizon:0xC19487,sun:0xFFCA91,dir:[.8,.13,.3],ambient:.7,direct:.8},
      {top:0x101C34,horizon:0x35465B,sun:0xB1CAE8,dir:[.3,.65,-.65],ambient:high?.3:.48,direct:.1}];
    for(const p of presets){p.top=new T.Color(p.top);p.horizon=new T.Color(p.horizon);p.sun=new T.Color(p.sun);}
    const skyUniforms={top:{value:new T.Color()},horizon:{value:new T.Color()},disc:{value:new T.Color()},sunDir:{value:sunDir},rotation:{value:new T.Matrix3()},projection:{value:new T.Vector2()},night:{value:0},cloud:{value:0},glare:{value:0}};
    const skyGeometry=new T.PlaneGeometry(2,2),skyMaterial=new T.ShaderMaterial({uniforms:skyUniforms,depthWrite:false,depthTest:false,
      vertexShader:'varying vec2 p; void main(){p=position.xy;gl_Position=vec4(position.xy,1.,1.);}',fragmentShader:`
        varying vec2 p; uniform vec3 top; uniform vec3 horizon; uniform vec3 disc; uniform vec3 sunDir; uniform mat3 rotation;
        uniform vec2 projection; uniform float night; uniform float cloud; uniform float glare;
        void main(){vec3 ray=normalize(rotation*vec3(p*projection,-1.));float up=pow(max(0.,ray.y),.55);vec3 colour=mix(horizon,top,up);
          float facing=max(0.,dot(ray,sunDir));float circle=smoothstep(night>.5?.9992:.99965,night>.5?.99965:.99986,facing);
          colour+=disc*(circle+pow(facing,64.)*glare);
          float band=sin(ray.x*13.+sin(ray.z*9.))*sin(ray.z*17.+ray.x*4.);colour=mix(colour,horizon,smoothstep(.2,.8,band)*cloud*max(0.,ray.y));
          ${high?'float star=fract(sin(dot(floor(ray.xz/max(.15,ray.y)*450.),vec2(12.9898,78.233)))*43758.5453);colour+=vec3(step(.9987,star)*night*smoothstep(.12,.3,ray.y)*.45);':''}
          gl_FragColor=vec4(colour,1.);\n#include <colorspace_fragment>\n}`});
    const sky=new T.Mesh(skyGeometry,skyMaterial);sky.frustumCulled=false;sky.renderOrder=-10000;sky.name='workday-sky';world.add(sky);
    sky.onBeforeRender=(_r,_s,camera)=>{skyUniforms.rotation.value.setFromMatrix4(camera.matrixWorld);skyUniforms.projection.value.set(1/camera.projectionMatrix.elements[0],1/camera.projectionMatrix.elements[5]);};
    const front=[],rear=new T.SpotLight(0xF5F0DA,0,18,.8,.6,2),interior=new T.PointLight(0xF7D5A5,0,3.2,2);
    for(const side of(high?[-.65,.65]:[0])){const light=new T.SpotLight(0xFFF1D4,0,55,.52,.55,2);light.userData.side=side;front.push(light);rig.add(light,light.target);}
    rig.add(rear,rear.target,interior);
    const paint=parts.cab&&parts.cab.batch.material,paintColour=paint&&paint.color.clone(),hooks=new Map(),rectangles=Array.from({length:8},()=>new T.Vector4(1e6,1e6,0,0));
    const ao={rectangles:{value:rectangles},strength:{value:high?1:0}},nearest=Array.from({length:7},()=>({distance:Infinity,rect:null}));
    const weatherPaint=new T.Color(),fogColour=new T.Color(),glowColour=new T.Color(),oldAfter=world.onAfterRender;
    let current=null,visible=false,time='morning',weather='',lastSelection=-100,shadowAt=-100,shadowWanted=false,shadowX=Infinity,shadowZ=Infinity,shadowYaw=Infinity,disposed=false;
    if(high){
      sun.shadow.mapSize.set(512,512);sun.shadow.camera.left=sun.shadow.camera.bottom=-shadowSpan/2;sun.shadow.camera.right=sun.shadow.camera.top=shadowSpan/2;sun.shadow.camera.near=.5;sun.shadow.camera.far=180;sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00015;sun.shadow.normalBias=.06;sun.shadow.radius=2;
      const vanMeshes=new Set();parts.van.traverse(o=>vanMeshes.add(o));
      world.traverse(o=>{if(!o.isMesh||o===parts.weatherDrops)return;const materials=Array.isArray(o.material)?o.material:[o.material];if(!materials.some(m=>m&&m.isMeshLambertMaterial))return;
        o.castShadow=!vanMeshes.has(o)&&o.geometry!==parts.plane;o.receiveShadow=true;
        for(const material of materials){if(!material.isMeshLambertMaterial||hooks.has(material))continue;const before=material.onBeforeCompile,key=material.customProgramCacheKey;hooks.set(material,{before,key});
          material.onBeforeCompile=function(shader,renderer){before.call(this,shader,renderer);shader.uniforms.otrAO=ao.rectangles;shader.uniforms.otrAOStrength=ao.strength;
            shader.vertexShader='varying vec3 otrWorld;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvec4 otrP=vec4(transformed,1.);\n#ifdef USE_INSTANCING\notrP=instanceMatrix*otrP;\n#endif\notrWorld=(modelMatrix*otrP).xyz;');
            shader.fragmentShader='varying vec3 otrWorld;uniform vec4 otrAO[8];uniform float otrAOStrength;\n'+shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
              float otrShade=1.;for(int i=0;i<8;i++){vec2 d=max(abs(otrWorld.xz-otrAO[i].xy)-otrAO[i].zw,vec2(0.));otrShade=min(otrShade,mix(.62,1.,smoothstep(0.,1.15,length(d))));}
              reflectedLight.indirectDiffuse*=mix(1.,otrShade,(1.-smoothstep(.15,.8,otrWorld.y))*otrAOStrength);`);
          };material.customProgramCacheKey=()=>key.call(material)+'|otr-contact-ao-1';material.needsUpdate=true;
        }
      });
      for(const o of vanMeshes)if(o.isMesh)o.castShadow=o.geometry!==parts.plane;
      world.onAfterRender=function(renderer,renderScene,camera){oldAfter.call(this,renderer,renderScene,camera);if(disposed||camera!==view.camera||!visible||!shadowWanted||!sun.castShadow||!view.renderSunShadow)return;
        const was=parts.van.visible;parts.van.visible=true;
        try{view.renderSunShadow();}finally{parts.van.visible=was;shadowWanted=false;shadowAt=current.elapsed;}
      };
    }
    function place(light,x,y,z,tx,ty,tz){point.set(x,y,z).applyMatrix4(parts.chassis.matrixWorld);light.position.copy(point);point.set(tx,ty,tz).applyMatrix4(parts.chassis.matrixWorld);light.target.position.copy(point);}
    const api={sky,front,rear,interior,sun,ambient,ao,time:'morning',
      restore(){shadowAt=-100;shadowWanted=high;},
      sync(m,area){
        current=m;visible=area!=='hub'&&!!m;sky.visible=rig.visible=visible;if(!visible){sun.castShadow=false;ambient.color.copy(original.skyColour);ambient.intensity=original.skyIntensity;sun.color.copy(original.sunColour);sun.intensity=original.sunIntensity;sun.position.copy(original.sunPosition);sun.target.position.copy(original.targetPosition);sun.updateMatrixWorld(true);sun.target.updateMatrixWorld(true);if(world.background&&original.background)world.background.copy(original.background);if(world.fog&&original.fog){world.fog.color.copy(original.fog);world.fog.near=original.fogNear;world.fog.far=original.fogFar;}ao.strength.value=0;return;}
        const next=OTR.fpLighting.time(m),index=OTR.fpLighting.times.indexOf(next),p=presets[index],condition=OTR.fpWeather?OTR.fpWeather.condition(m):m.routeDay?m.routeDay.weather:m.routePlan?m.routePlan.weather:'clear';
        const wet=condition==='storm'||condition==='rain'||condition==='fog'||condition==='snow',overcast=condition==='storm'?.9:condition==='fog'?.8:wet?.6:condition==='cloudy'?.35:.08;
        const phaseChanged=next!==time||condition!==weather;time=next;weather=condition;api.time=time;
        const dim=time==='night'?.52:time==='dusk'?.78:1;skyUniforms.top.value.copy(p.top);skyUniforms.horizon.value.copy(p.horizon);weatherPaint.setHex(time==='night'?0x344459:0xA1ADB6);skyUniforms.top.value.lerp(weatherPaint,overcast*.75);skyUniforms.horizon.value.lerp(weatherPaint,overcast*.65);
        skyUniforms.disc.value.copy(p.sun).multiplyScalar((1-overcast*.9)*(time==='night'?.45:1));skyUniforms.night.value=time==='night'?1:0;skyUniforms.cloud.value=overcast;skyUniforms.glare.value=OTR.fpAccess&&OTR.fpAccess.reduced()?0:high?.22:.08;
        sunDir.set(p.dir[0],p.dir[1],p.dir[2]).normalize();fogColour.copy(skyUniforms.horizon.value);if(world.background)world.background.copy(fogColour);if(world.fog)world.fog.color.copy(fogColour);
        ambient.color.copy(skyUniforms.horizon.value);if(time==='night')ambient.color.setHex(0x9AACCC);ambient.intensity=p.ambient*(1-overcast*.25);sun.color.copy(p.sun);sun.intensity=p.direct*(1-overcast*.8);sun.castShadow=high&&time!=='night';ao.strength.value=high?(time==='night'?.6:1):0;
        const v=m.van,c=Math.cos(v.yaw),s=Math.sin(v.yaw),on=!!v.headlights;
        if(world.fog){const dark=!!m.nightDrive&&time==='night';world.fog.near=dark?Math.min(original.fogNear,on?18:8):original.fogNear;world.fog.far=dark?Math.min(original.fogFar,on?(high?65:48):30):original.fogFar;}
        for(const light of front){const fault=!m.repaired&&m.fault==='lights',failed=high&&light.userData.side<0&&fault;light.intensity=on&&!failed?(high?650:fault?650:1200):0;place(light,light.userData.side,1,-2.8,light.userData.side,0,-28);}
        rear.intensity=v.gear===-1?55:0;place(rear,0,1.1,2.75,0,0,13);point.set(0,2.3,-1.6).applyMatrix4(parts.chassis.matrixWorld);interior.position.copy(point);interior.intensity=time==='night'||time==='dusk'?.45:0;rig.updateMatrixWorld(true);
        if(paint)paint.color.copy(paintColour).multiplyScalar(dim);if(parts.lampGood)parts.lampGood.emissive.copy(glowColour.setHex(on?0xD6B887:0x000000));
        const centre=m.mode==='walk'?m.player:v;
        rectangles[0].set(v.x,v.z,Math.abs(c)*1.08+Math.abs(s)*2.7,Math.abs(s)*1.08+Math.abs(c)*2.7);
        if(high&&(m.elapsed-lastSelection>.25||phaseChanged||Math.abs(centre.x-shadowX)>1||Math.abs(centre.z-shadowZ)>1)){
          for(const e of nearest){e.distance=Infinity;e.rect=null;}
          for(const box of m.solids){const dx=Math.max(0,Math.abs(centre.x-box.x)-box.w/2),dz=Math.max(0,Math.abs(centre.z-box.z)-box.d/2),distance=dx*dx+dz*dz;for(let i=0;i<7;i++){if(distance>=nearest[i].distance)continue;for(let j=6;j>i;j--){nearest[j].distance=nearest[j-1].distance;nearest[j].rect=nearest[j-1].rect;}nearest[i].distance=distance;nearest[i].rect=box;break;}}
          for(let i=0;i<7;i++){const box=nearest[i].rect;if(box)rectangles[i+1].set(box.x,box.z,box.w/2,box.d/2);else rectangles[i+1].set(1e6,1e6,0,0);}lastSelection=m.elapsed;
        }
        if(!high||phaseChanged||m.elapsed-shadowAt>=.125||Math.abs(centre.x-shadowX)>.5||Math.abs(centre.z-shadowZ)>.5||Math.abs(v.yaw-shadowYaw)>.03){
          const grid=shadowSpan/512,x=Math.round(centre.x/grid)*grid,z=Math.round(centre.z/grid)*grid;sun.target.position.set(x,0,z);sun.position.copy(sunDir).multiplyScalar(70).add(sun.target.position);sun.target.updateMatrixWorld(true);sun.updateMatrixWorld(true);shadowX=centre.x;shadowZ=centre.z;shadowYaw=v.yaw;shadowWanted=high;
        }
      },
      caption(){if(!visible)return '';const text=OTR.fpLighting.caption(time,!!current.van.headlights,!!current.nightDrive&&OTR.fpNight.required(current));return current.nightDrive&&time==='night'&&current.van.headlights?'It is night. The headlights are on. Drive within the distance they light.':text;},
      dispose(){disposed=true;world.onAfterRender=oldAfter;sky.removeFromParent();rig.removeFromParent();skyGeometry.dispose();skyMaterial.dispose();for(const [m,h] of hooks){m.onBeforeCompile=h.before;m.customProgramCacheKey=h.key;m.needsUpdate=true;}if(paint)paint.color.copy(paintColour);
        sun.castShadow=false;sun.shadow.dispose();sun.shadow.map=sun.shadow.mapPass=null;sun.color.copy(original.sunColour);sun.intensity=original.sunIntensity;sun.position.copy(original.sunPosition);sun.target.position.copy(original.targetPosition);if(world.background&&original.background)world.background.copy(original.background);if(world.fog&&original.fog){world.fog.color.copy(original.fog);world.fog.near=original.fogNear;world.fog.far=original.fogFar;}ambient.color.copy(original.skyColour);ambient.intensity=original.skyIntensity;if(owned){world.remove(sun,sun.target,ambient);view.lights=null;}}
    };return api;
  }
};
