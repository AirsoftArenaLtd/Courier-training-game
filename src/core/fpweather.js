/* Cosmetic weather follows mission time and the existing saved wiper switch. It never grades or saves. */
window.OTR=window.OTR||{};
OTR.fpWeather={
  condition(m){return m.routeDay?m.routeDay.weather:m.routePlan?m.routePlan.weather:'clear';},
  create(){return {model:null,elapsed:0,time:0,clear:0,angle:-1.35};},
  advance(state,m,reduced){
    if(state.model!==m){state.model=m;state.elapsed=m.elapsed;state.time=state.clear=0;state.angle=-1.35;}
    const dt=m.paused?0:Math.max(0,Math.min(.1,m.elapsed-state.elapsed));state.elapsed=m.elapsed;
    if(!reduced)state.time+=dt;
    const on=!!m.van.wipers;
    state.clear=on?1:Math.max(0,state.clear-dt*.6);
    state.angle=on&&!reduced?-.15+1.05*Math.sin(state.time*Math.PI*1.3):-1.35;
    return state;
  },
  particles(scene,plane,condition,count){
    const T=THREE,snow=condition==='snow',cold=snow||condition==='ice',ice=condition==='ice',geometry=plane.clone().rotateX(Math.PI/2),ids=new Float32Array(count);
    for(let i=0;i<count;i++)ids[i]=i;geometry.setAttribute('particleId',new T.InstancedBufferAttribute(ids,1));
    const uniforms=T.UniformsUtils.merge([T.UniformsLib.fog,{clock:{value:0},walking:{value:0},spraying:{value:0},cold:{value:cold?1:0},snow:{value:snow?1:0},tint:{value:new T.Color(0xCBD9E0)}}]);
    const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,fog:true,
      vertexShader:`attribute float particleId;varying vec2 p;varying float kind;varying float life;uniform float clock;uniform float walking;uniform float spraying;uniform float cold;uniform float snow;
        #include <fog_pars_vertex>
        void main(){p=uv;float breath=cold*walking*(1.-step(4.,particleId));float spray=spraying*(1.-step(6.,particleId));kind=breath>.5?2.:spray>.5?3.:snow;
          life=fract(clock*.8+particleId*.173);vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader:`varying vec2 p;varying float kind;varying float life;uniform vec3 tint;
        #include <fog_pars_fragment>
        void main(){float r=length((p-.5)*2.);float alpha=kind<.5?(1.-smoothstep(.2,1.,abs(p.x-.5)*2.))*.35:kind<1.5?(1.-smoothstep(.4,1.,r))*.7:pow(max(0.,1.-r),2.)*(1.-life)*.55;
          if(alpha<.005)discard;gl_FragColor=vec4(tint,alpha);
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`});
    const mesh=new T.InstancedMesh(geometry,material,count);mesh.frustumCulled=false;mesh.name='weather-particles';
    const matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3(),rotation=new T.Quaternion();
    return {mesh,uniforms,
      sync(m,reduced){
        const v=m.van,p=m.player,walk=m.mode==='walk',speed=Math.abs(v.speed),spray=!walk&&speed>.6,time=reduced?0:m.elapsed,c=Math.cos(v.yaw),s=Math.sin(v.yaw),cx=walk?p.x:v.x,cz=walk?p.z:v.z;
        mesh.visible=!ice||walk||spray;uniforms.clock.value=time;uniforms.walking.value=walk?1:0;uniforms.spraying.value=spray?1:0;
        const night=scene.art&&scene.art.lighting&&scene.art.lighting.time==='night';uniforms.tint.value.setHex(night?0x819BAF:0xCBD9E0);rotation.copy(scene.view.camera.quaternion);
        for(let i=0;i<count;i++){
          const life=(time*.8+i*.173)%1;
          if(cold&&walk&&i<4){const forward=.6+life*.75,side=(i-1.5)*.07;position.set(p.x+Math.sin(p.yaw)*forward+Math.cos(p.yaw)*side,1.47+life*.22,p.z-Math.cos(p.yaw)*forward+Math.sin(p.yaw)*side);scale.setScalar(.15+life*.32);}
          else if(spray&&i<6){const side=(i%2?1:-1)*(1.12+life*.4),behind=(i<4?1.7:-1.6)+Math.sign(v.speed)*life*(.8+speed*.16);position.set(v.x+c*side-s*behind,.22+Math.sin(life*Math.PI)*.32,v.z+s*side+c*behind);scale.set(.25+life*.45,.18+life*.35,1);}
          else if(ice){position.set(0,-10,0);scale.setScalar(0);}
          else{let x=(i*7.31)%18-9,z=(i*11.73)%18-9;if(!walk&&Math.abs(x*c+z*s)<1.5&&Math.abs(-x*s+z*c)<3){x+=c*3;z+=s*3;}
            position.set(cx+x+(snow?Math.sin(time+i)*.3:0),.3+(((i*.63-time*(snow?.7:9))%8+8)%8),cz+z);scale.set(snow?.15:.045,snow?.15:.7,1);}
          matrix.compose(position,rotation,scale);mesh.setMatrixAt(i,matrix);
        }mesh.instanceMatrix.needsUpdate=true;
      },
      dispose(){mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();}
    };
  },
  surfaces(scene,lighting,condition){
    if(!lighting||!scene.view.world||!['rain','storm','snow','ice','fog'].includes(condition))return null;
    const T=THREE,high=OTR.gfx.high(),hooks=new Map(),sky=lighting.sky.material.uniforms;
    const uniforms={wet:{value:0},snow:{value:0},ice:{value:0},mist:{value:0},clock:{value:0},horizon:sky.horizon,top:sky.top,sun:sky.disc,direction:sky.sunDir};
    scene.view.world.traverse(o=>{if(!o.isMesh)return;const materials=Array.isArray(o.material)?o.material:[o.material];for(const material of materials){if(!material.isMeshLambertMaterial||hooks.has(material))continue;
      const before=material.onBeforeCompile,key=material.customProgramCacheKey;hooks.set(material,{before,key});
      material.onBeforeCompile=function(shader,renderer){before.call(this,shader,renderer);shader.uniforms.otrWet=uniforms.wet;shader.uniforms.otrSnow=uniforms.snow;shader.uniforms.otrIce=uniforms.ice;shader.uniforms.otrMist=uniforms.mist;shader.uniforms.otrWeatherClock=uniforms.clock;shader.uniforms.otrWetHorizon=uniforms.horizon;shader.uniforms.otrWetTop=uniforms.top;shader.uniforms.otrWetSun=uniforms.sun;shader.uniforms.otrWetDirection=uniforms.direction;
        shader.vertexShader='varying vec3 otrWeatherPosition;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvec4 otrWeatherP=vec4(transformed,1.);\n#ifdef USE_INSTANCING\notrWeatherP=instanceMatrix*otrWeatherP;\n#endif\notrWeatherPosition=(modelMatrix*otrWeatherP).xyz;');
        shader.fragmentShader='varying vec3 otrWeatherPosition;uniform float otrWet;uniform float otrSnow;uniform float otrIce;uniform float otrMist;uniform float otrWeatherClock;uniform vec3 otrWetHorizon;uniform vec3 otrWetTop;uniform vec3 otrWetSun;uniform vec3 otrWetDirection;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
          if(otrWet+otrSnow+otrIce+otrMist>.01){vec3 wn=inverseTransformDirection(normal,viewMatrix);float up=smoothstep(.65,.95,wn.y);float ground=up*(1.-smoothstep(.15,.4,otrWeatherPosition.y));vec2 at=otrWeatherPosition.xz;
            if(ground>.01&&otrWet>.01){vec3 look=normalize(cameraPosition-otrWeatherPosition);vec3 reflected=reflect(-look,wn);float fresnel=pow(1.-max(0.,dot(look,wn)),3.);
            vec3 reflectedSky=mix(otrWetHorizon,otrWetTop,pow(max(0.,reflected.y),.55));
            ${high?'float ripple=sin(at.x*8.+sin(at.y*11.)+otrWeatherClock*.5)*.012*(1.-otrIce);reflected=normalize(reflected+vec3(ripple,0.,-ripple));':''}
            float shine=pow(max(0.,dot(reflected,otrWetDirection)),${high?'96.':'32.'});float puddle=.5+.5*sin(at.x*.47+sin(at.y*.8));
            outgoingLight=mix(outgoingLight,outgoingLight*.85+reflectedSky*(${high?'.12':'.05'}+fresnel*${high?'.5':'.22'})+otrWetSun*shine*.5,ground*otrWet*(.45+.55*puddle));}
            if(ground>.01&&otrIce>.01){float puddle=.5+.5*sin(at.x*.47+sin(at.y*.8));float iceLine=smoothstep(.965,1.,sin(at.x*8.+sin(at.y*5.))*sin(at.y*7.));outgoingLight=mix(outgoingLight,outgoingLight+vec3(.13,.2,.24)*(.25+puddle*.25+iceLine*.6),ground*otrIce);}
            float roof=up*smoothstep(3.3,3.5,otrWeatherPosition.y);if(otrSnow>.01&&ground+roof>.01){float snowPatch=smoothstep(-.3,.8,sin(at.x*.8+sin(at.y*1.4))*sin(at.y*.7));outgoingLight=mix(outgoingLight,vec3(.66,.72,.74),otrSnow*(ground*.42*snowPatch+roof*.55));}
            if(otrMist>.01){float haze=smoothstep(6.,28.,distance(cameraPosition,otrWeatherPosition))*(1.-smoothstep(.3,2.,otrWeatherPosition.y));outgoingLight=mix(outgoingLight,otrWetHorizon,otrMist*haze*.08);}
          }
          #include <opaque_fragment>`);
      };material.customProgramCacheKey=()=>key.call(material)+'|otr-weather-surfaces-1';material.needsUpdate=true;
    }});
    return {uniforms,hooks,
      sync(m,area,reduced){const w=OTR.fpWeather.condition(m),enabled=area!=='hub';uniforms.wet.value=enabled?(w==='rain'?.65:w==='storm'?1:w==='ice'?.75:0):0;uniforms.snow.value=enabled&&w==='snow'?1:0;uniforms.ice.value=enabled&&w==='ice'?1:0;uniforms.mist.value=enabled&&w==='fog'?1:0;uniforms.clock.value=reduced?0:m.elapsed;},
      dispose(){for(const [m,h] of hooks){m.onBeforeCompile=h.before;m.customProgramCacheKey=h.key;m.needsUpdate=true;}}
    };
  },
  build(scene,cab,lighting,condition='clear'){
    const T=THREE,camera=scene.view.camera,hadLayer=camera.layers.isEnabled(2),state=this.create();camera.layers.enable(2);
    const surfaces=this.surfaces(scene,lighting,condition),uniforms={time:{value:0},water:{value:0},frost:{value:0},clear:{value:0},angle:{value:-1.35},glint:{value:new T.Color(0xD1E1E9)}};
    const geometry=new T.PlaneGeometry(1.7,.8),material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,
      vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 p;uniform float time;uniform float water;uniform float frost;uniform float clear;uniform float angle;uniform vec3 glint;
        float hash(vec2 c){return fract(sin(dot(c,vec2(127.1,311.7)))*43758.5453);}
        float fan(vec2 q){float r=length(q);float a=atan(q.x,q.y);return (1.-smoothstep(.72,.9,r))*(1.-smoothstep(1.05,1.25,abs(a)));}
        float blade(vec2 q){vec2 end=vec2(sin(angle),cos(angle))*.74;float t=clamp(dot(q,end)/dot(end,end),.08,1.);return 1.-smoothstep(.006,.012,length(q-end*t));}
        void main(){vec2 q=vec2(p.x*1.7,p.y*.8);vec2 left=q-vec2(.37,-.025),right=q-vec2(1.12,-.025);
          float wiped=max(fan(left),fan(right))*clear;vec2 cell=floor((p+vec2(0.,time*.025))*vec2(13.,8.));
          vec2 local=fract((p+vec2(0.,time*.025))*vec2(13.,8.))-.5;
          local-=vec2(hash(cell)-.5,hash(cell+7.)-.5)*.5;float drop=(1.-smoothstep(.07,.18,length(local*vec2(1.25,.75))))*step(.22,hash(cell+19.));
          float edge=1.-smoothstep(0.,.13,min(min(p.x,1.-p.x),min(p.y,1.-p.y)));float wet=water*drop*(1.-wiped*.96),ink=max(blade(left),blade(right));float alpha=max(max(wet*.4,edge*frost*.22),ink*.95);
          if(alpha<.005)discard;gl_FragColor=vec4(mix(glint,vec3(.025,.035,.04),ink),alpha);\n#include <colorspace_fragment>\n}`});
    const windscreen=new T.Mesh(geometry,material);windscreen.position.set(.12,.11,-1.045);windscreen.layers.set(2);windscreen.name='weather-windscreen';cab.root.add(windscreen);
    return {windscreen,uniforms,state,surfaces,
      sync(m,area){
        const condition=OTR.fpWeather.condition(m),rain=condition==='storm'?1:condition==='rain'?.65:condition==='snow'?.25:0,cold=condition==='snow'||condition==='ice',on=!!m.van.wipers;
        const reduced=!!(OTR.fpAccess&&OTR.fpAccess.reduced());if(surfaces)surfaces.sync(m,area,reduced);
        windscreen.visible=area!=='hub'&&m.mode==='cab'&&(rain>0||cold||on);if(!windscreen.visible)return;
        OTR.fpWeather.advance(state,m,reduced);uniforms.frost.value=cold?1:0;
        uniforms.time.value=state.time;uniforms.water.value=rain;uniforms.clear.value=state.clear;uniforms.angle.value=state.angle;
        uniforms.glint.value.setHex(scene.art&&scene.art.lighting&&scene.art.lighting.time==='night'?0x7F9FB5:0xD1E1E9);
      },
      dispose(){if(surfaces)surfaces.dispose();windscreen.removeFromParent();geometry.dispose();material.dispose();if(!hadLayer)camera.layers.disable(2);}
    };
  }
};
