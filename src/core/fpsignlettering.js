/* Face lettering stays in the existing sign batch. High borrows three spare atlas cells; Low uses procedural glyphs. */
window.OTR=window.OTR||{};
OTR.fpSignLettering={
  rows:{
    A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','11011','10001'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
    '0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],
    '-':['00000','00000','00000','11111','00000','00000','00000'],'.':['00000','00000','00000','00000','00000','00110','00110'],"'":['00100','00100','00000','00000','00000','00000','00000'],'?':['01110','10001','00001','00010','00100','00000','00100']
  },
  lines(s){
    if(s.kind==='street'){const name=s.name.toUpperCase();if(name.length<=9)return [name,''];const at=name.lastIndexOf(' ',9);return [name.slice(0,at>0?at:9),name.slice(at>0?at+1:9)];}
    if(s.kind==='number')return [String(s.number),''];
    if(s.kind==='speed')return [String(s.limit),'MPH'];
    if(s.kind==='school')return ['SCHOOL',String(s.limit)+' MPH'];
    return {stop:['STOP',''],giveway:['YIELD',''],'junction-yield':['YIELD',''],roadworks:['ROAD','CLOSED'],oneway:['ONE WAY','']}[s.kind]||['',''];
  },
  pack(text){
    if(text.length>9)throw Error('Sign face line exceeds its bounded lettering capacity');
    const out=new Float32Array(3);for(let i=0;i<text.length;i++){const code=text.charCodeAt(i)-32;out[Math.floor(i/3)]+=(code>=0&&code<64?code:31)*2**(i%3*6);}return out;
  },
  write(a,index,e){const w=e.words;if(w){const x=a.atlas?w.fontA:w.a,y=a.atlas?w.fontB:w.b;a.a.setXYZW(index,x[0],x[1],x[2],a.atlas?x[3]:w.lengths[0]);a.b.setXYZW(index,y[0],y[1],y[2],a.atlas?y[3]:w.lengths[1]);}else{a.a.setXYZW(index,0,0,0,0);a.b.setXYZW(index,0,0,0,0);}},
  dirty(a){a.a.needsUpdate=a.b.needsUpdate=true;},
  build(signs,surfaces){
    if(!signs)return null;const T=THREE,F=this,high=OTR.gfx.high(),paints=[];let atlas=null,owned=false,origin=new T.Vector2(0,0),size=new T.Vector2(512,512),disposed=false;const strength={value:1};
    for(const e of signs.entries){const lines=this.lines(e.sign);e.words={a:this.pack(lines[0]),b:this.pack(lines[1]),lengths:[lines[0].length,lines[1].length]};}
    const bits=Array.from({length:64},(_,code)=>{const rows=this.rows[String.fromCharCode(code+32)],v=new T.Vector2();if(rows)for(let r=0;r<7;r++)for(let x=0;x<5;x++)if(rows[r][x]==='1'){const bit=r*5+x;if(bit<20)v.x+=2**bit;else v.y+=2**(bit-20);}return v;});
    // Shared Phaser contexts can be WebGL 1: use constant vector components and glyph leaves.
    const select=(lo,hi)=>hi-lo===1?`vec2(${bits[lo].x}.,${bits[lo].y}.)`:`(code<${(lo+hi)/2}.?${select(lo,(lo+hi)/2)}:${select((lo+hi)/2,hi)})`,glyphTree=select(0,64);
    if(high){
      const canvas=surfaces?surfaces.atlas.image:document.createElement('canvas');if(surfaces){atlas=surfaces.atlas;origin.set(512,512);size.set(canvas.width,canvas.height);}else{canvas.width=2048;canvas.height=512;size.set(2048,512);atlas=new T.CanvasTexture(canvas);atlas.flipY=false;atlas.colorSpace=T.NoColorSpace;owned=true;}
      const ctx=canvas.getContext('2d');if(ctx){
        const limitX=canvas.width,limitY=canvas.height,fonts=new Map();let x=origin.x,y=origin.y;
        ctx.clearRect(origin.x,origin.y,limitX-origin.x,512);ctx.font='700 44px "Noto Sans", Arial, sans-serif';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#ffffff';
        const word=text=>{if(!text)return new Float32Array(4);if(fonts.has(text))return fonts.get(text);const width=Math.ceil(ctx.measureText(text).width)+8;if(x+width>limitX){x=origin.x;y+=64;}if(y+64>limitY)throw Error('Sign face atlas capacity exceeded');ctx.fillText(text,x+4,y+48);const uv=new Float32Array([x/size.x,y/size.y,width/size.x,64/size.y]);fonts.set(text,uv);x+=width;return uv;};
        for(const e of signs.entries){const lines=this.lines(e.sign);e.words.fontA=word(lines[0]);e.words.fontB=word(lines[1]);}atlas.needsUpdate=true;
      }else{if(owned)atlas.dispose();atlas=null;owned=false;}
    }
    return {atlas,strength,borrowed:!!atlas&&!owned,paints,
      decorate(mesh,entries){
        if(!entries.some(e=>e.sign&&e.words&&e.words.lengths.some(Boolean)))return null;
        const attrs={atlas:!!atlas,a:new T.InstancedBufferAttribute(new Float32Array(entries.length*4),4),b:new T.InstancedBufferAttribute(new Float32Array(entries.length*4),4)};
        mesh.geometry.setAttribute('otrSignWordsA',attrs.a);mesh.geometry.setAttribute('otrSignWordsB',attrs.b);entries.forEach((e,i)=>F.write(attrs,i,e));
        const previous=mesh.material,paint=previous.clone(),before=previous.onBeforeCompile,key=previous.customProgramCacheKey();paints.push(paint);mesh.material=paint;
        paint.onBeforeCompile=function(shader,renderer){before.call(this,shader,renderer);shader.uniforms.otrSignInk=strength;if(atlas){shader.uniforms.otrSignFont={value:atlas};shader.uniforms.otrSignFontSize={value:size};}
          shader.vertexShader='attribute vec4 otrSignWordsA;attribute vec4 otrSignWordsB;varying vec4 signWordsA;varying vec4 signWordsB;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsignWordsA=otrSignWordsA;signWordsB=otrSignWordsB;');
          const glyph=atlas?'uniform sampler2D otrSignFont;uniform vec2 otrSignFontSize;float signGlyph(vec4 run,vec2 p){return texture2D(otrSignFont,run.xy+vec2(p.x,1.-p.y)*run.zw).a;}':'float signGlyph(float code,vec2 p){float col=floor(p.x*6.),row=6.-floor(p.y*8.);if(col>4.||row<0.||row>6.)return 0.;float bit=row*5.+col;vec2 v='+glyphTree+';return mod(floor((bit<20.?v.x:v.y)/exp2(mod(bit,20.))),2.);}';
          const line=atlas?'if(run.z<=0.||run.w<=0.)return 0.;float ratio=run.z*otrSignFontSize.x/(run.w*otrSignFontSize.y);':'float count=run.w;if(count<.5)return 0.;float ratio=count*.75;';
          const sample=atlas?'return signGlyph(run,q);':'float x=q.x*count,index=floor(x);float wordPack=floor((index<3.?run.x:index<6.?run.y:run.z)+.25);float code=mod(floor(wordPack/exp2(mod(index,3.)*6.)),64.);return signGlyph(code,vec2(fract(x),q.y));';
          shader.fragmentShader='uniform float otrSignInk;varying vec4 signWordsA;varying vec4 signWordsB;\n'+glyph+'\nfloat signLine(vec2 p,vec4 run,vec4 area,float aspect){'+line+'vec2 extent=vec2(min(area.z,area.w*aspect*ratio),min(area.w,area.z/(aspect*ratio)));vec2 q=(p-area.xy-(area.zw-extent)*.5)/extent;if(q.x<0.||q.x>=1.||q.y<0.||q.y>=1.)return 0.;'+sample+'}\n'+shader.fragmentShader;
          // Insert after shape cutouts and before lighting. The original road and sign hooks stay intact.
          shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
            if(signShape>.5&&signShape<9.5){
              float bottom=signShape>8.5?0.:signShape<1.5?.83:.62;vec2 p=vec2(signUV.x,(signUV.y-bottom)/(1.-bottom));
              vec4 a=vec4(.07,.32,.86,.4),b=vec4(.2,.14,.6,.18);
              if(signShape<1.5){a=${atlas?'signWordsB.z>.0':'signWordsB.w>.5'}?vec4(.06,.48,.88,.44):vec4(.04,.12,.92,.78);b=vec4(.06,.03,.88,.44);}
              else if(signShape<2.5)a=vec4(.08,.29,.84,.44);
              else if(signShape<3.5)a=vec4(.2,.48,.6,.28);
              else if(signShape<4.5){a=vec4(.22,.3,.56,.58);b=vec4(.22,.1,.56,.23);}
              else if(signShape<6.5){a=vec4(.2,.49,.6,.3);b=vec4(.2,.21,.6,.3);}
              else if(signShape<7.5)a=vec4(.1,.7,.8,.25);
              else if(signShape>8.5)a=vec4(.04,.02,.92,.96);
              float aspect=signShape<1.5?.262727:signShape>8.5?.461538:.977143;float ink=max(signLine(p,signWordsA,a,aspect),signLine(p,signWordsB,b,aspect));
              vec3 colour=signShape<2.5?vec3(.94):signShape<3.5?vec3(.7,.12,.16):vec3(.025);
              diffuseColor.rgb=mix(diffuseColor.rgb,colour,ink*otrSignInk);
            }`);
        };paint.customProgramCacheKey=()=>key+'|otr-sign-letters-'+(atlas?'atlas':'procedural')+'-1';paint.needsUpdate=true;return attrs;
      },
      dispose(){if(disposed)return;disposed=true;paints.forEach(m=>m.dispose());if(owned){const canvas=atlas.image;atlas.dispose();canvas.width=canvas.height=1;}}
    };
  }
};
