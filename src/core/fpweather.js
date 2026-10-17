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
  build(scene,cab){
    const T=THREE,camera=scene.view.camera,hadLayer=camera.layers.isEnabled(2),state=this.create();camera.layers.enable(2);
    const uniforms={time:{value:0},water:{value:0},clear:{value:0},angle:{value:-1.35},glint:{value:new T.Color(0xD1E1E9)}};
    const geometry=new T.PlaneGeometry(1.7,.8),material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,
      vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 p;uniform float time;uniform float water;uniform float clear;uniform float angle;uniform vec3 glint;
        float hash(vec2 c){return fract(sin(dot(c,vec2(127.1,311.7)))*43758.5453);}
        float fan(vec2 q){float r=length(q);float a=atan(q.x,q.y);return (1.-smoothstep(.72,.9,r))*(1.-smoothstep(1.05,1.25,abs(a)));}
        float blade(vec2 q){vec2 end=vec2(sin(angle),cos(angle))*.74;float t=clamp(dot(q,end)/dot(end,end),.08,1.);return 1.-smoothstep(.006,.012,length(q-end*t));}
        void main(){vec2 q=vec2(p.x*1.7,p.y*.8);vec2 left=q-vec2(.37,-.025),right=q-vec2(1.12,-.025);
          float wiped=max(fan(left),fan(right))*clear;vec2 cell=floor((p+vec2(0.,time*.025))*vec2(13.,8.));
          vec2 local=fract((p+vec2(0.,time*.025))*vec2(13.,8.))-.5;
          local-=vec2(hash(cell)-.5,hash(cell+7.)-.5)*.5;float drop=(1.-smoothstep(.07,.18,length(local*vec2(1.25,.75))))*step(.22,hash(cell+19.));
          float wet=water*drop*(1.-wiped*.96),ink=max(blade(left),blade(right));float alpha=max(wet*.4,ink*.95);
          if(alpha<.005)discard;gl_FragColor=vec4(mix(glint,vec3(.025,.035,.04),ink),alpha);\n#include <colorspace_fragment>\n}`});
    const windscreen=new T.Mesh(geometry,material);windscreen.position.set(.12,.11,-1.045);windscreen.layers.set(2);windscreen.name='weather-windscreen';cab.root.add(windscreen);
    return {windscreen,uniforms,state,
      sync(m,area){
        const condition=OTR.fpWeather.condition(m),rain=condition==='storm'?1:condition==='rain'?.65:0,on=!!m.van.wipers;
        windscreen.visible=area!=='hub'&&m.mode==='cab'&&(rain>0||on);if(!windscreen.visible)return;
        const reduced=!!(OTR.fpAccess&&OTR.fpAccess.reduced());OTR.fpWeather.advance(state,m,reduced);
        uniforms.time.value=state.time;uniforms.water.value=rain;uniforms.clear.value=state.clear;uniforms.angle.value=state.angle;
        uniforms.glint.value.setHex(scene.art&&scene.art.lighting&&scene.art.lighting.time==='night'?0x7F9FB5:0xD1E1E9);
      },
      dispose(){windscreen.removeFromParent();geometry.dispose();material.dispose();if(!hadLayer)camera.layers.disable(2);}
    };
  }
};
