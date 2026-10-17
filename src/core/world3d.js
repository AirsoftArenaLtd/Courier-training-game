/* Owned 3D render target on Phaser's shared GL context. Classic scripts, local three.js. */
window.OTR = window.OTR || {};
OTR.world3d = {
  load() { return OTR.cab.load(); },
  pick(camera, occluders, interactions, ray) {
    const visible = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    ray.setFromCamera({ x: 0, y: 0 }, camera);
    const hits = ray.intersectObjects([...occluders, ...interactions].filter(visible), false);
    return hits.length ? hits[0].object.userData.interaction || null : null;
  },
  create(scene) {
    const phaser = scene.sys.game.renderer, gl = phaser.gl;
    if (!gl) throw new Error('WebGL is required');
    const renderer = new THREE.WebGLRenderer({ canvas: scene.sys.game.canvas, context: gl, antialias: false });
    renderer.autoClear = false;
    // Count the whole frame: reflection update, world and final composite.
    renderer.info.autoReset = false;
    const diagnostics = { calls:0, triangles:0, textures:0, geometries:0, targetWidth:0, targetHeight:0, attachmentBytes:0 };
    const world = new THREE.Scene();
    world.background = new THREE.Color(0xA7C7DE);
    world.fog = new THREE.Fog(0xA7C7DE, 65, 165);
    const camera = new THREE.PerspectiveCamera(68, OTR.W / OTR.H, 0.08, 180);
    camera.rotation.order = 'YXZ'; world.add(camera);
    const hemisphere=new THREE.HemisphereLight(0xE9F1FF, 0x63594C, 1.5);world.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xFFF0DC, 1.4);
    sun.position.set(-12, 25, 8); world.add(sun,sun.target);
    if(renderer.shadowMap){renderer.shadowMap.enabled=OTR.gfx.high();renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;}
    const shadowLights=[sun],renderSunShadow=()=>{if(renderer.shadowMap){renderer.shadowMap.needsUpdate=true;renderer.shadowMap.render(shadowLights,world,camera);}};
    const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true, stencilBuffer: false });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    // Transform each existing composite, including the mirror. No extra target, texture or render pass.
    const colour={value:0};
    const composite=texture=>{
      const material=new THREE.MeshBasicMaterial({map:texture,depthTest:false,depthWrite:false,toneMapped:false});
      material.onBeforeCompile=shader=>{shader.uniforms.otrColour=colour;shader.fragmentShader='uniform float otrColour;\n'+shader.fragmentShader.replace('#include <dithering_fragment>',
        '#include <dithering_fragment>\nif (otrColour > 0.5) { vec3 c = gl_FragColor.rgb; gl_FragColor.rgb = clamp(vec3(c.r, dot(c, vec3(0.163,0.725,0.112)), dot(c, vec3(0.455,-0.645,1.191))), 0.0, 1.0); }');};
      material.customProgramCacheKey=()=> 'otr-colour-v1';return material;
    };
    const screen = new THREE.Scene(), screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    screen.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), composite(target.texture)));
    // Physical mirrors sample three tiles from one atlas. At most one reflection pass runs in a frame.
    const mirrorTarget=new THREE.WebGLRenderTarget(384,144,{depthBuffer:true,stencilBuffer:false});
    mirrorTarget.texture.colorSpace=THREE.SRGBColorSpace;
    const mirrorCameras=[0,1,2].map(i=>{const c=new THREE.PerspectiveCamera(i===2?45:65,i===2?8/3:2/3,.08,i===2?(OTR.gfx.high()?24:12):(OTR.gfx.high()?75:40));c.rotation.order='YXZ';return c;});
    const mirror={on:false,physical:false,texture:mirrorTarget.texture,camera:mirrorCameras[0],cameras:mirrorCameras,before:null,after:null,
      next:0,nextAt:0,filled:0,updated:[-100,-100,-100],updates:[0,0,0]};
    const tiles=[{x:0,y:0,w:96,h:144},{x:96,y:0,w:96,h:144},{x:192,y:0,w:192,h:72},{x:192,y:72,w:192,h:72}];
    const extern = scene.add.extern().setDepth(-100);
    let width = 0, height = 0, disposed = false;
    extern.render = function () {
      if (disposed) return;
      colour.value=OTR.a11y&&OTR.a11y.settings().colour?1:0;
      const scale = OTR.gfx.high() ? 1 : 0.65;
      const w = Math.max(1, Math.round(gl.drawingBufferWidth * scale));
      const h = Math.max(1, Math.round(gl.drawingBufferHeight * scale));
      if (w !== width || h !== height) {
        width = w; height = h; target.setSize(w, h);
        camera.aspect = gl.drawingBufferWidth / gl.drawingBufferHeight; camera.updateProjectionMatrix();
      }
      phaser.pipelines.clear();
      try {
        renderer.info.reset(); renderer.resetState(); renderer.setScissorTest(false);
        const now=(typeof performance!=='undefined'?performance.now():Date.now())/1000;
        if(mirror.on&&((mirror.filled&7)!==7||mirror.rearOn&&!(mirror.filled&8)||now>=mirror.nextAt)){
          const scale=OTR.gfx.high()?2:1,mw=384*scale,mh=144*scale;
          if(mirrorTarget.width!==mw||mirrorTarget.height!==mh){mirrorTarget.setSize(mw,mh);mirror.filled=0;}
          renderer.setRenderTarget(mirrorTarget);
          if(!mirror.filled){renderer.setViewport(0,0,mw,mh);renderer.clear(true,true,false);}
          const index=mirror.rearOn&&mirror.last!==3?3:mirror.next,cell=tiles[index];mirror.camera=index===3?mirror.rearCamera:mirror.cameras[index];
          try{
            if(mirror.before)mirror.before(index);
            renderer.setRenderTarget(mirrorTarget);renderer.setViewport(cell.x*scale,cell.y*scale,cell.w*scale,cell.h*scale);
            renderer.setScissor(cell.x*scale,cell.y*scale,cell.w*scale,cell.h*scale);renderer.setScissorTest(true);
            renderer.clear(true,true,false);renderer.render(world,mirror.camera);
            mirror.filled|=1<<index;mirror.updated[index]=now;mirror.updates[index]++;mirror.last=index;if(index<3)mirror.next=(index+1)%3;mirror.nextAt=now+(OTR.gfx.high()?1/90:1/30);
          }finally{if(mirror.after)mirror.after(index);}
        }
        renderer.setScissorTest(false);renderer.setRenderTarget(target);renderer.setViewport(0,0,w,h);
        renderer.clear(true,true,false);renderer.render(world,camera);
        renderer.setRenderTarget(null); renderer.setViewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        renderer.render(screen, screenCamera);
        diagnostics.calls=renderer.info.render.calls;diagnostics.triangles=renderer.info.render.triangles;
        diagnostics.textures=renderer.info.memory.textures;diagnostics.geometries=renderer.info.memory.geometries;
        diagnostics.targetWidth=w;diagnostics.targetHeight=h;
        // RGBA8 plus up-to-32-bit depth, including the allocated mirror target while off.
        diagnostics.attachmentBytes=(w*h+mirrorTarget.width*mirrorTarget.height)*8;
        for(const light of shadowLights){const shadow=light.shadow;if(shadow.map)diagnostics.attachmentBytes+=shadow.map.width*shadow.map.height*8;if(shadow.mapPass)diagnostics.attachmentBytes+=shadow.mapPass.width*shadow.mapPass.height*8;}
      } finally { renderer.resetState(); phaser.pipelines.rebind(); }
    };
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      const geometries = new Set(), materials = new Set(), textures = new Set();
      [world, screen].forEach(root => root.traverse(o => {
        if (o.isInstancedMesh) o.dispose();
        if (o.geometry) geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(mat => {
          materials.add(mat);
          Object.values(mat).forEach(value => { if (value && value.isTexture && value !== target.texture && value !== mirrorTarget.texture) textures.add(value); });
        });
      }));
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      target.dispose(); mirrorTarget.dispose(); renderer.dispose(); // Never call forceContextLoss on the shared context.
    };
    scene.events.once('shutdown', dispose);
    return { world, camera, mirror, extern, dispose, diagnostics, colour,lights:{sky:hemisphere,sun},renderSunShadow };
  }
};
