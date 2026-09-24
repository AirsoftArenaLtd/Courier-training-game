/*
 * proto: in-page prototypes of rendering fixes (no project file is touched).
 *   __proto.bakeBack(key, maxDepth, opts)  draw every visible object below maxDepth into one RenderTexture, hide them
 *   __proto.atmos1(key)                    replace the MULTIPLY tint + darkness rect + vignette with ONE multiply image
 *   __proto.hide(key, pred)                hide objects matching pred (for "what if this layer were gone")
 *   __proto.undo(key)                      restore everything the above changed
 */
(() => {
  const S = (key) => OTR.game.scene.getScene(key);
  const st = (s) => (s.__proto = s.__proto || { hidden: [], added: [] });
  window.__proto = {
    bakeBack(key, maxDepth, opts) {
      opts = opts || {};
      const s = S(key), P = st(s);
      const cam = s.cameras.main;
      const objs = s.children.list.filter(o => o.depth < maxDepth && o.visible && o.alpha > 0 && o.renderWebGL && !P.added.includes(o));
      const rt = s.add.renderTexture(0, 0, OTR.W, OTR.H).setOrigin(0).setDepth(-10000).setScrollFactor(0);
      // draw in the camera's current view
      // (camera must be at scroll 0: game objects are drawn at their own positions)
      rt.beginDraw(); objs.forEach(o => rt.batchDraw(o)); rt.endDraw();
      objs.forEach(o => { o.setVisible(false); P.hidden.push(o); });
      P.added.push(rt);
      return { baked: objs.length, types: objs.map(o => o.type + ':' + (o.texture ? o.texture.key : '') + ':d' + o.depth).slice(0, 30) };
    },
    /** walkable stages: every visible scrollFactor-1 object below maxDepth (no containers) into one world-wide RT */
    bakeWorld(key, maxDepth, worldW) {
      const s = S(key), P = st(s);
      const objs = s.children.list.filter(o => o.depth < maxDepth && o.visible && o.alpha > 0 && o.renderWebGL && o.type !== 'Container' && o.scrollFactorX === 1 && !P.added.includes(o));
      const rt = s.add.renderTexture(0, 0, worldW, OTR.H).setOrigin(0).setDepth(-50).setScrollFactor(1);
      rt.beginDraw(); objs.forEach(o => rt.batchDraw(o)); rt.endDraw();
      objs.forEach(o => { o.setVisible(false); P.hidden.push(o); });
      P.added.push(rt);
      return { baked: objs.length, w: worldW };
    },
    /** walkable stages: sky (sf 0) + far TileSprite (parallax factor f) into one wide RT that scrolls at f */
    bakeFar(key, f, worldW) {
      const s = S(key), P = st(s);
      const sky = s.children.list.find(o => o.type === 'Image' && o.texture.key.indexOf('sky_') === 0 && o.visible);
      const far = s.children.list.find(o => o.type === 'TileSprite' && o.scrollFactorX === 0 && o.visible);
      const W = Math.ceil(OTR.W + worldW * f);
      const rt = s.add.renderTexture(0, 0, W, OTR.H).setOrigin(0).setDepth(far.depth).setScrollFactor(f, 0);
      const tSky = s.add.image(0, 0, sky.texture.key, sky.frame.name).setOrigin(0).setDisplaySize(W, OTR.H);
      const tFar = s.add.tileSprite(0, far.y - far.displayHeight * far.originY, W, far.height, far.texture.key, far.frame.name).setOrigin(0);
      rt.beginDraw(); rt.batchDraw(tSky); rt.batchDraw(tFar); rt.endDraw();
      tSky.destroy(); tFar.destroy();
      [sky, far].forEach(o => { o.setVisible(false); P.hidden.push(o); });
      P.added.push(rt);
      return { W, skyKey: sky.texture.key, farY: far.y, farOrigin: far.originY };
    },
    atmos1(key) {
      const s = S(key), P = st(s);
      const L = s.children.list;
      const mul = L.find(o => o.type === 'Rectangle' && o.blendMode === Phaser.BlendModes.MULTIPLY && o.scrollFactorX === 0 && o.width >= OTR.W);
      const vig = L.find(o => o.type === 'Image' && o.texture && o.texture.key === 'atm_vignette');
      const dark = L.find(o => o.type === 'Rectangle' && o.blendMode === 0 && o.scrollFactorX === 0 && o.width >= OTR.W && vig && o.depth === vig.depth - 3);
      const c = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map(v => v / 255);
      let m = [1, 1, 1];
      if (mul) { const a = mul.fillAlpha * mul.alpha, T = c(mul.fillColor); m = m.map((v, i) => v * (1 - a + a * T[i])); }
      if (dark) { const d = dark.fillAlpha * dark.alpha; m = m.map(v => v * (1 - d)); }
      const w = 640, h = 360;
      const tk = 'proto_atm_' + Date.now();
      const ct = s.textures.createCanvas(tk, w, h);
      const ctx = ct.getContext();
      ctx.fillStyle = `rgb(${m.map(v => Math.round(v * 255)).join(',')})`;
      ctx.fillRect(0, 0, w, h);
      if (vig) { ctx.globalAlpha = vig.alpha; ctx.drawImage(vig.texture.getSourceImage(), 0, 0, w, h); ctx.globalAlpha = 1; }
      ct.refresh();
      const depth = (mul || dark || vig).depth;
      const img = s.add.image(OTR.W / 2, OTR.H / 2, tk).setDisplaySize(OTR.W, OTR.H).setScrollFactor(0).setDepth(depth).setBlendMode(Phaser.BlendModes.MULTIPLY);
      [mul, dark, vig].forEach(o => { if (o) { o.setVisible(false); P.hidden.push(o); } });
      P.added.push(img);
      return { mul: !!mul, dark: dark ? +(dark.fillAlpha * dark.alpha).toFixed(2) : 0, vig: vig ? vig.alpha : 0, m: m.map(v => +v.toFixed(3)), darkColor: dark ? dark.fillColor.toString(16) : null };
    },
    hide(key, pred) {
      const s = S(key), P = st(s);
      const objs = s.children.list.filter(o => o.visible && pred(o));
      objs.forEach(o => { o.setVisible(false); P.hidden.push(o); });
      return objs.length;
    },
    undo(key) {
      const s = S(key), P = st(s);
      P.hidden.forEach(o => o.setVisible(true));
      P.added.forEach(o => o.destroy());
      s.__proto = null;
      return 'undone';
    }
  };
  return 'proto loaded';
})()
