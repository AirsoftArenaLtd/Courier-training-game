/* One scene-owned High atlas. Source bitmaps stay in the asset bank; Low keeps its existing palette. */
window.OTR=window.OTR||{};
OTR.fpMaterials={
  uses:['asphalt','pavement','grass','plaster','brick'],
  kind(entry){
    if(entry.surface)return entry.surface;
    const t=entry.town;if(!t)return 0;
    return t.use==='town-road'?1:t.house?(Math.abs(Math.floor(t.x/8)+Math.floor(t.z/8))%2?4:5):0;
  },
  build(scene,weather){
    const bank=scene.assetBank;if(!OTR.gfx.high()||!bank||!this.uses.some(u=>bank.textures.has('surface-'+u)))return null;
    const T=THREE,canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;
    const ctx=canvas.getContext('2d');if(!ctx)return null;
    const available=[false],paints=[],geometries=[],F=this;
    // Four pixels of edge padding protect adjacent tiles through the ordinary mip levels.
    for(let i=0;i<this.uses.length;i++){
      const source=bank.textures.get('surface-'+this.uses[i]),image=source&&source.image;available.push(!!image);
      if(!image)continue;
      const x=i%4*512,y=Math.floor(i/4)*512,w=image.width,h=image.height;
      ctx.drawImage(image,0,0,w,h,x+4,y+4,504,504);
      ctx.drawImage(image,0,0,w,1,x+4,y,504,4);ctx.drawImage(image,0,h-1,w,1,x+4,y+508,504,4);
      ctx.drawImage(image,0,0,1,h,x,y+4,4,504);ctx.drawImage(image,w-1,0,1,h,x+508,y+4,4,504);
      for(const [sx,sy,dx,dy] of [[0,0,x,y],[w-1,0,x+508,y],[0,h-1,x,y+508],[w-1,h-1,x+508,y+508]])ctx.drawImage(image,sx,sy,1,1,dx,dy,4,4);
    }
    const atlas=new T.CanvasTexture(canvas);atlas.name='uploaded-surface-atlas';atlas.flipY=false;atlas.colorSpace=T.NoColorSpace;atlas.anisotropy=2;
    // The custom uniform sampler decodes sRGB once in GLSL; keep its upload in NoColorSpace.
    const strength={value:weather==='snow'?.08:weather==='ice'?.18:.74};let disposed=false;
    return {atlas,available,strength,bytes:canvas.width*canvas.height*4,paints,geometries,
      attach(mesh,entries){
        const kinds=entries.map(e=>{const kind=F.kind(e);e.materialSurface=available[kind]?kind:0;return e.materialSurface;});
        if(!kinds.some(Boolean))return null;
        // Sign geometry is already unique. Keep its live shape attribute rather than cloning it away.
        if(!mesh.geometry.hasAttribute('otrSignShape')){mesh.geometry=mesh.geometry.clone();mesh.geometry.userData.otrSurfaceOwned=true;geometries.push(mesh.geometry);}
        const ids=new T.InstancedBufferAttribute(new Float32Array(kinds),1);mesh.geometry.setAttribute('otrSurfaceKind',ids);
        const source=mesh.material,paint=source.clone(),before=source.onBeforeCompile,key=source.customProgramCacheKey();paints.push(paint);mesh.material=paint;
        paint.onBeforeCompile=function(shader,renderer){
          before.call(this,shader,renderer);shader.uniforms.otrSurfaceAtlas={value:atlas};shader.uniforms.otrSurfaceMix=strength;
          shader.vertexShader='attribute float otrSurfaceKind; varying float surfaceKind; varying vec3 surfacePoint; varying vec3 surfaceNormal;\n'+shader.vertexShader.replace('#include <defaultnormal_vertex>','#include <defaultnormal_vertex>\nsurfaceNormal=inverseTransformDirection(transformedNormal,viewMatrix);').replace('#include <project_vertex>','#include <project_vertex>\nsurfaceKind=otrSurfaceKind;vec4 surfaceP=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nsurfaceP=instanceMatrix*surfaceP;\n#endif\nsurfacePoint=(modelMatrix*surfaceP).xyz;');
          shader.fragmentShader='uniform sampler2D otrSurfaceAtlas; uniform float otrSurfaceMix; varying float surfaceKind; varying vec3 surfacePoint; varying vec3 surfaceNormal;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
            if(surfaceKind>.5){
              vec3 n=abs(normalize(surfaceNormal));bool wall=surfaceKind>3.5;
              float mask=wall?(1.-step(.35,n.y))*step(.18,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))):1.;
              vec2 p=wall?(n.x>n.z?surfacePoint.zy:surfacePoint.xy):surfacePoint.xz;
              float scale=surfaceKind<1.5?.7:surfaceKind<2.5?.5:surfaceKind<3.5?.6:surfaceKind>4.5?1.1:.65;
              float tile=floor(surfaceKind+.1)-1.;vec2 uv=(vec2(mod(tile,4.)*512.,floor(tile/4.)*512.)+4.+fract(p*scale)*504.)/vec2(2048.,1024.);
              vec3 tex=texture2D(otrSurfaceAtlas,uv).rgb;
              tex=mix(tex/12.92,pow((tex+.055)/1.055,vec3(2.4)),step(vec3(.04045),tex));
              float distanceFade=1.-smoothstep(25.,55.,length(surfacePoint-cameraPosition));
              diffuseColor.rgb*=mix(vec3(1.),tex*2.,mask*otrSurfaceMix*distanceFade);
            }`);
        };
        paint.customProgramCacheKey=()=>key+'|otr-uploaded-surfaces-1';paint.needsUpdate=true;return ids;
      },
      dispose(){if(disposed)return;disposed=true;paints.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());atlas.dispose();canvas.width=canvas.height=1;}
    };
  }
};
