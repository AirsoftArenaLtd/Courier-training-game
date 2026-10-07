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
    const world = new THREE.Scene();
    world.background = new THREE.Color(0xA7C7DE);
    world.fog = new THREE.Fog(0xA7C7DE, 65, 165);
    const camera = new THREE.PerspectiveCamera(68, OTR.W / OTR.H, 0.08, 180);
    camera.rotation.order = 'YXZ'; world.add(camera);
    world.add(new THREE.HemisphereLight(0xE9F1FF, 0x63594C, 1.5));
    const sun = new THREE.DirectionalLight(0xFFF0DC, 1.4);
    sun.position.set(-12, 25, 8); world.add(sun);
    const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true, stencilBuffer: false });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Scene(), screenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    screen.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({map:target.texture,depthTest:false,depthWrite:false,toneMapped:false})));
    // One live mirror while requested. It observes the same actors and uses its own depth target.
    const mirrorTarget = new THREE.WebGLRenderTarget(320, 180, { depthBuffer: true, stencilBuffer: false });
    mirrorTarget.texture.colorSpace = THREE.SRGBColorSpace;
    const mirrorCamera = new THREE.PerspectiveCamera(55, 16 / 9, 0.08, 100);
    mirrorCamera.rotation.order = 'YXZ';
    const mirrorQuad = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({map:mirrorTarget.texture,depthTest:false,depthWrite:false,toneMapped:false}));
    mirrorQuad.position.set(-0.7125, 0.4111, 0); mirrorQuad.scale.x = -1;
    mirrorQuad.material.side = THREE.DoubleSide; mirrorQuad.renderOrder = 1;
    screen.add(mirrorQuad);
    const mirror = { on: false, camera: mirrorCamera, before: null, after: null };
    const extern = scene.add.extern().setDepth(-100);
    let width = 0, height = 0, disposed = false;
    extern.render = function () {
      if (disposed) return;
      const scale = OTR.gfx.high() ? 1 : 0.65;
      const w = Math.max(1, Math.round(gl.drawingBufferWidth * scale));
      const h = Math.max(1, Math.round(gl.drawingBufferHeight * scale));
      if (w !== width || h !== height) {
        width = w; height = h; target.setSize(w, h);
        camera.aspect = gl.drawingBufferWidth / gl.drawingBufferHeight; camera.updateProjectionMatrix();
      }
      phaser.pipelines.clear();
      try {
        renderer.resetState(); renderer.setScissorTest(false);
        renderer.setRenderTarget(target); renderer.setViewport(0, 0, w, h);
        renderer.clear(true, true, false); renderer.render(world, camera);
        mirrorQuad.visible = mirror.on;
        if (mirror.on) {
          const mw = OTR.gfx.high() ? 480 : 320, mh = mw * 9 / 16;
          if (mirrorTarget.width !== mw) mirrorTarget.setSize(mw, mh);
          try {
            if (mirror.before) mirror.before();
            renderer.setRenderTarget(mirrorTarget); renderer.setViewport(0, 0, mw, mh);
            renderer.clear(true, true, false); renderer.render(world, mirrorCamera);
          } finally { if (mirror.after) mirror.after(); }
        }
        renderer.setRenderTarget(null); renderer.setViewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        renderer.render(screen, screenCamera);
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
    return { world, camera, mirror, extern, dispose };
  }
};
