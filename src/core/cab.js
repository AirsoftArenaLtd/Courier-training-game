/*
 * The cab view (a prototype): the town from the driver's seat, in 3D. V in a town drive switches between it and the
 * view from above.
 *
 * It is the same drive: the van, the traffic, the people, the signals and the time of day are the scene's own, read
 * every frame; only the picture changes. The town is built once, from the same data the top-down town is drawn
 * from: the streets and their markings painted on the ground, the buildings as boxes with their roofs on top, the
 * trees, lamps, signs and signals.
 *
 * three.js (lib/three.min.js, r158, MIT) is loaded the first time the view is opened, and draws into the game's own
 * WebGL context through a Phaser Extern object, under the HUD: the speedometer, the minimap, the hints and every
 * message stay on top of it as they are.
 *
 *   OTR.cab.toggle(scene)
 */
window.OTR = window.OTR || {};

OTR.cab = {
  /** Load three.js once. */
  load() {
    if (window.THREE) return Promise.resolve();
    if (this._loading) return this._loading;
    this._loading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'lib/three.min.js';
      s.onload = () => res(); s.onerror = () => rej(new Error('three.js did not load'));
      document.head.appendChild(s);
    });
    return this._loading;
  },

  toggle(scene) {
    const s = scene;
    if (s.cab && s.cab.on) { this.setOn(s, false); return; }
    if (!s.sys.game.renderer || s.sys.game.renderer.type !== Phaser.WEBGL) { s.toast('The cab view needs WebGL', 0xF0435A); return; }
    if (s.cab) { this.setOn(s, true); return; }
    s.toast('Cab view: loading…', 0xC9B3F0);
    this.load().then(() => {
      if (!s.sys.isActive() || s.leaving) return;
      try { s.cab = this.build(s); this.setOn(s, true); } catch (e) { console.warn('cab view', e); s.toast('The cab view could not start on this computer', 0xF0435A); }
    }, () => s.toast('The cab view could not load', 0xF0435A));
  },

  setOn(s, on) {
    const C = s.cab;
    C.on = on;
    C.extern.setVisible(on); C.frame.setVisible(on);
    s.cameras.main.setVisible(!on);                       // the view from above is not drawn under it
    if (s.lighting) s.lighting.rt.setVisible(!on);         // the light map is the top-down view's
    if (s.wx && s.wx.fogImg) s.wx.fogImg.setVisible(!on);  // and so is the fog round the screen (the cab's is in 3D)
    s.toast(on ? 'Cab view (V for the view from above)' : 'View from above (V for the cab)', 0xC9B3F0);
  },

  /** A colour from a texture: its average over the visible pixels (a roof or a tree's overall colour). */
  avg(key, fallback) {
    try {
      const src = OTR.game.textures.get(key).getSourceImage();
      const c = document.createElement('canvas'); c.width = 8; c.height = 8;
      const x = c.getContext('2d'); x.drawImage(src, 0, 0, 8, 8);
      const d = x.getImageData(0, 0, 8, 8).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      return n ? (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n) : fallback;
    } catch (e) { return fallback; }
  },

  /** The ground: lawns, streets, sidewalks with their rounded corners, the markings and the driveways. */
  groundCanvas(s) {
    const T = s.T, A = OTR.townArt, R = A.ROAD / 2, W = A.WALK, rc = A.CORNER, c = R + rc, k = 0.5;
    const cv = document.createElement('canvas'); cv.width = Math.round(T.W * k); cv.height = Math.round(T.H * k);
    const x = cv.getContext('2d'); x.scale(k, k);
    const snow = s.weather === 'snow', wet = s.weather === 'rain' || s.weather === 'storm';
    const LAWN = snow ? '#E9EEF6' : '#5F9A4E', WALKC = snow ? '#D6D9E2' : '#BDBAC4', ROADC = wet ? '#3E3C46' : '#4F4C57';
    x.fillStyle = LAWN; x.fillRect(0, 0, T.W, T.H);
    x.fillStyle = WALKC;
    T.hy.forEach(y => x.fillRect(0, y - R - W, T.W, 2 * (R + W)));
    T.vx.forEach(X => x.fillRect(X - R - W, 0, 2 * (R + W), T.H));
    x.fillStyle = '#B2AEB8';
    T.lots.forEach(l => x.fillRect(l.x + 60 - 35, Math.min(l.curb.y, l.y), 70, Math.abs(l.curb.y - l.y)));   // driveways
    x.fillStyle = ROADC;
    T.hy.forEach(y => x.fillRect(0, y - R, T.W, 2 * R));
    T.vx.forEach(X => x.fillRect(X - R, 0, 2 * R, T.H));
    // the kerb turning each corner
    T.inters.forEach(it => [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy]) => {
      const ox = it.x + sx * c, oy = it.y + sy * c;
      x.save(); x.beginPath(); x.rect(Math.min(it.x + sx * R, ox), Math.min(it.y + sy * R, oy), rc, rc); x.clip();
      x.fillStyle = ROADC; x.fillRect(it.x - c, it.y - c, 2 * c, 2 * c);
      x.fillStyle = WALKC; x.beginPath(); x.arc(ox, oy, rc, 0, Math.PI * 2); x.fill();
      x.fillStyle = LAWN; x.beginPath(); x.arc(ox, oy, rc - W, 0, Math.PI * 2); x.fill();
      x.restore();
    }));
    // centre lines (dashed yellow, not across the junctions), edge lines, crosswalks and stop lines
    const isJ = (a, cuts) => cuts.some(v => Math.abs(a - v) < R + 30);
    x.fillStyle = '#E8C547';
    T.hy.forEach(y => { for (let a = 0; a < T.W; a += 120) if (!isJ(a + 30, T.vx)) x.fillRect(a, y - 3, 70, 6); });
    T.vx.forEach(X => { for (let a = 0; a < T.H; a += 120) if (!isJ(a + 30, T.hy)) x.fillRect(X - 3, a, 6, 70); });
    x.fillStyle = 'rgba(235,235,240,0.85)';
    T.inters.forEach(it => {
      for (let i = -R + 12; i < R - 12; i += 26) {
        x.fillRect(it.x + i, it.y - R - 40, 14, 32); x.fillRect(it.x + i, it.y + R + 8, 14, 32);
        x.fillRect(it.x - R - 40, it.y + i, 32, 14); x.fillRect(it.x + R + 8, it.y + i, 32, 14);
      }
      // stop lines across the driver's own lane on each way in
      x.fillRect(it.x - R, it.y - R - A.STOP_LINE - 4, R, 8); x.fillRect(it.x, it.y + R + A.STOP_LINE - 4, R, 8);
      x.fillRect(it.x + R + A.STOP_LINE - 4, it.y - R, 8, R); x.fillRect(it.x - R - A.STOP_LINE - 4, it.y, 8, R);
    });
    return cv;
  },

  /** A wall: its colour with rows of windows (the window mask is the emissive map, lit after dark). */
  wallTex(color, rows, lit, windowColor) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
    const x = cv.getContext('2d');
    if (!lit) { x.fillStyle = OTR.color.css(color); x.fillRect(0, 0, 128, 128); }
    else { x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128); }
    const glass = lit ? (windowColor === undefined ? '#FFD98A' : OTR.color.css(windowColor)) : '#3A4A5C';
    rows.forEach(([v0, v1]) => { for (let i = 0; i < 2; i++) { x.fillStyle = glass; x.fillRect(18 + i * 64, 128 - v1 * 128, 28, (v1 - v0) * 128); } });
    if (!lit) { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, 120, 128, 8); }
    return new THREE.CanvasTexture(cv);
  },

  build(s) {
    const T = s.T, P = s.P, A = OTR.townArt, m = (px) => px / P;     // world px → metres
    const high = OTR.gfx.high();
    const gl = s.sys.game.renderer.gl, canvas = s.sys.game.canvas;
    const three = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false });
    three.autoClear = false;
    const scene3 = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(68, OTR.W / OTR.H, 0.1, 900);

    // light and sky by the time of day and the weather
    const tod = OTR.scenery.TOD[s.tod] || OTR.scenery.TOD.midday, dark = s.lighting ? s.lighting.dark : (tod.dark || 0);
    const skyCol = OTR.color.lerp(s.weather === 'clear' || s.weather === 'heat' ? 0x9CC8EE : 0xA8B0BC, tod.top || 0x4A9FE8, 0.35);
    const sky = new THREE.Color(OTR.color.lerp(skyCol, 0x0A0C1C, Math.min(1, dark * 1.3)));
    const haze = s.weather === 'fog' ? new THREE.Fog(0xC8CED6, 8, 55) : new THREE.Fog(sky.getHex(), 120, 420);
    scene3.fog = haze;
    const fogSky = s.weather === 'fog' ? new THREE.Color(0xC8CED6).lerp(new THREE.Color(0x101218), dark) : sky;
    const hemi = new THREE.HemisphereLight(0xDDE8FF, 0x4A5A3A, 1.1 * Math.max(0.12, 1 - dark * 1.35));
    scene3.add(hemi);
    const sun = new THREE.DirectionalLight(0xFFF4E0, 1.6 * (1 - dark) * (s.weather === 'clear' ? 1 : 0.55));
    sun.position.set(-60, 120, -40);                   // up and to the north-west, as the art is lit
    scene3.add(sun);

    // the ground
    const gtex = new THREE.CanvasTexture(this.groundCanvas(s));
    gtex.anisotropy = three.capabilities.getMaxAnisotropy();
    gtex.colorSpace = THREE.SRGBColorSpace;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(m(T.W), m(T.H)), new THREE.MeshLambertMaterial({ map: gtex }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(m(T.W) / 2, 0, m(T.H) / 2);
    scene3.add(ground);
    const below = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ color: s.weather === 'snow' ? 0xE9EEF6 : 0x5A9049 }));
    // well below the town's ground: the depth buffer is 16-bit, and 2 cm apart the two fought
    below.rotation.x = -Math.PI / 2; below.position.set(m(T.W) / 2, -0.6, m(T.H) / 2);
    scene3.add(below);

    const lit = s.city ? s.city.windowLight : 0;
    const roofMat = (key) => {
      const src = OTR.game.textures.get(key).getSourceImage();
      const t = new THREE.CanvasTexture(src); t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshLambertMaterial({ map: t });
    };
    const wallMat = (color, rows, x, y) => {
      const style = high ? OTR.b3d.windowStyle(x, y) : null;
      return new THREE.MeshLambertMaterial({
        map: this.wallTex(color, rows, false), emissiveMap: lit > 0 ? this.wallTex(color, rows, true, style ? style.color : undefined) : null,
        emissive: lit > 0 ? 0xFFFFFF : 0x000000, emissiveIntensity: lit * 0.9 * (style ? style.strength : 1)
      });
    };
    // a box building with its roof image on top (flat roofs), its walls round the sides
    const box = (x0, y0, x1, y1, h, walls, roof, crop) => {
      const w = m(x1 - x0), d = m(y1 - y0);
      const top = roof.clone(); top.map = roof.map.clone(); top.map.needsUpdate = true;
      if (crop) { top.map.repeat.set(crop[2], crop[3]); top.map.offset.set(crop[0], crop[1]); }
      const mats = [walls, walls, top, walls, walls, walls];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
      mesh.position.set(m(x0) + w / 2, h / 2, m(y0) + d / 2);
      scene3.add(mesh);
      return mesh;
    };
    // a texture's image sits in a box inside its canvas (src/core/assets.js): the crop to just the roof
    const cropOf = (key, bx, by, bw, bh) => { const src = OTR.game.textures.get(key).getSourceImage(); return [bx / src.width, 1 - (by + bh) / src.height, bw / src.width, bh / src.height]; };
    const W3 = OTR.b3d.WALLS, B = A.BUILDINGS;
    T.lots.forEach(l => {
      const [fw, fh] = OTR.town.size(l);
      const x0 = l.x - fw / 2, y0 = l.y - fh / 2, x1 = l.x + fw / 2, y1 = l.y + fh / 2;
      if (l.kind === 'house') {
        const v = l.variant % 4, key = 'td_house_' + v;
        const walls = wallMat(W3.house[v], [[0.25, 0.7]], l.x, l.y);
        const body = new THREE.Mesh(new THREE.BoxGeometry(m(fw), 4.6, m(fh)), walls);
        body.position.set(m(l.x), 2.3, m(l.y)); scene3.add(body);
        // a gable roof, its ridge running along the house's width, in the roof's own colour
        const shape = new THREE.Shape(); const hd = m(fh) / 2 + 0.4;
        shape.moveTo(-hd, 0); shape.lineTo(hd, 0); shape.lineTo(0, 2.4); shape.lineTo(-hd, 0);
        const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: m(fw) + 0.6, bevelEnabled: false }),
          new THREE.MeshLambertMaterial({ color: this.avg(key, 0x6A5A50) }));
        roof.rotation.y = Math.PI / 2; roof.position.set(m(x0) - 0.3, 4.6, m(l.y));
        scene3.add(roof);
      } else if (l.kind === 'business') {
        const v = l.variant % 2, key = 'td_biz_' + v, [bw, bh] = B.biz[v];
        box(x0, y0, x1, y1, 4.8, wallMat(W3.business[v], [[0.15, 0.62]], l.x, l.y), roofMat(key), cropOf(key, 14, 10, bw, bh));
      } else {
        const [bw, bh] = B.apt;
        box(x0, y0, x1, y1, 10.5, wallMat(W3.apartment[0], [[0.12, 0.26], [0.45, 0.59], [0.76, 0.9]], l.x, l.y), roofMat('td_apt'), cropOf('td_apt', 14, 10, bw, bh));
      }
    });
    const D = T.depot;
    box(D.x - D.w / 2, D.y - D.h / 2, D.x + D.w / 2, D.y + D.h / 2, 8.5, wallMat(W3.depot[0], [[0.7, 0.85]], D.x, D.y), roofMat('td_depot'), cropOf('td_depot', 16, 12, 660, 380));
    // the station's name on its street side
    {
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128; const x = cv.getContext('2d');
      x.fillStyle = '#4D148C'; x.fillRect(0, 0, 1024, 128); x.fillStyle = '#FF6600'; x.fillRect(0, 110, 1024, 18);
      x.fillStyle = '#fff'; x.font = '900 72px "Segoe UI", Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(OTR_DATA.config.brand ? OTR_DATA.config.brand.toUpperCase() + ' STATION' : 'DELIVERY STATION', 512, 58);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(m(D.w) * 0.8, m(D.w) * 0.1), new THREE.MeshBasicMaterial({ map: t }));
      // on the north wall, facing the street (a plane faces +z; turned round, it faces north and reads the right way)
      sign.rotation.y = Math.PI; sign.position.set(m(D.x), 6.4, m(D.y - D.h / 2) - 0.06);
      scene3.add(sign);
    }

    // trees: a trunk and a rounded canopy in the tree's own colour
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 3, 6), trunkMat = new THREE.MeshLambertMaterial({ color: 0x5A4030 });
    (s.city ? s.city.trees : []).forEach((t, i) => {
      const r = m(t.img.displayWidth / 2) * 0.85;
      const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.set(m(t.ax), 1.5, m(t.ay)); scene3.add(trunk);
      const col = s.weather === 'snow' ? 0xDDE6EE : this.avg(t.img.texture.key, 0x3E7A3A);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshLambertMaterial({ color: col, flatShading: true }));
      crown.position.set(m(t.ax), 3 + r * 0.8, m(t.ay)); crown.scale.y = 0.85; crown.rotation.y = i;
      scene3.add(crown);
    });

    // street lamps: a pole and a head; after dark the head glows and a pool of light lies under it
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 6.5, 6), poleMat = new THREE.MeshLambertMaterial({ color: 0x3A3D44 });
    const headMat = new THREE.MeshLambertMaterial({ color: 0xEDE6D0, emissive: 0xFFE2A0, emissiveIntensity: dark > 0.2 ? 1.2 : 0 });
    const pool = dark > 0.2 ? (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
      x.fillStyle = OTR.cv.rad(x, 32, 32, 0, 32, [[0, 'rgba(255,220,160,0.55)'], [1, 'rgba(255,220,160,0)']]); x.fillRect(0, 0, 64, 64);
      return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    })() : null;
    (s.lamps || []).forEach(l => {
      const px = l.px === undefined ? l.x : l.px, py = l.py === undefined ? l.y : l.py;
      const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.set(m(px), 3.25, m(py)); scene3.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.35), headMat); head.position.set(m(l.x), 6.4, m(l.y)); head.lookAt(m(px), 6.4, m(py)); scene3.add(head);
      if (pool) { const p = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), pool); p.rotation.x = -Math.PI / 2; p.position.set(m(l.x), 0.03, m(l.y)); scene3.add(p); }
    });

    // signs and signals at every junction, facing the drivers they are for
    const octa = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 8), red = new THREE.MeshLambertMaterial({ color: 0xC8243B });
    const sigBox = new THREE.BoxGeometry(0.35, 1.0, 0.3), sigMat = new THREE.MeshLambertMaterial({ color: 0x23252B });
    const lampGeo = new THREE.SphereGeometry(0.11, 8, 6);
    const signals = [];
    const FACE = { W: -Math.PI / 2, E: Math.PI / 2, N: Math.PI, S: 0 };   // which way a driver coming from there looks
    T.inters.forEach(it => Object.keys(it.signs || {}).forEach(dir => {
      const sg = it.signs[dir], x = m(sg.x), z = m(sg.y);
      const pole = new THREE.Mesh(poleGeo, poleMat); pole.scale.y = 0.45; pole.position.set(x, 1.45, z); scene3.add(pole);
      if (it.stop) {
        // the octagon faces along the street it stands on (it reads the same from both sides)
        const plate = new THREE.Mesh(octa, red); plate.rotation.x = Math.PI / 2;
        const g = new THREE.Group(); g.add(plate); g.position.set(x, 2.6, z); g.rotation.y = dir === 'W' || dir === 'E' ? Math.PI / 2 : 0;
        scene3.add(g);
      } else {
        const g = new THREE.Group(); g.position.set(x, 3.2, z); g.rotation.y = FACE[dir];
        g.add(new THREE.Mesh(sigBox, sigMat));
        const lamps = ['red', 'amber', 'green'].map((c, i) => {
          const mat = new THREE.MeshBasicMaterial({ color: 0x303030 });
          const l = new THREE.Mesh(lampGeo, mat); l.position.set(0, 0.3 - i * 0.3, 0.16); g.add(l); return { c, mat };
        });
        scene3.add(g);
        signals.push({ it, dir, lamps });
      }
    }));

    // traffic: a body and a glasshouse in the car's colour
    const carCol = (c) => { const k = c.img.texture.key; const n = +k.replace('car_top_', ''); return isFinite(n) ? n : 0x888888; };
    const glass = new THREE.MeshLambertMaterial({ color: 0x1E2630 });
    // Reuse the two car meshes' geometry. On high, slope the existing glasshouse's roof inwards to make a
    // windscreen and rear window; this changes the silhouette without adding vertices, meshes or draw calls.
    const carBodyGeo = new THREE.BoxGeometry(4.6, 0.85, 1.85), carTopGeo = new THREE.BoxGeometry(2.4, 0.6, 1.6);
    if (high) {
      const p = carTopGeo.getAttribute('position');
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * 0.66 - 0.12, p.getY(i), p.getZ(i) * 0.78);
      carTopGeo.computeVertexNormals();
    }
    const cars = s.cars.map(c => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(carBodyGeo, new THREE.MeshLambertMaterial({ color: carCol(c) }));
      body.position.y = 0.65; g.add(body);
      const top = new THREE.Mesh(carTopGeo, glass); top.position.set(-0.2, 1.35, 0); g.add(top);
      const tl = new THREE.MeshBasicMaterial({ color: 0x701018 });
      [-0.7, 0.7].forEach(zz => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.35), tl); t.position.set(-2.31, 0.85, zz); g.add(t); });
      scene3.add(g);
      return { c, g, tl };
    });

    // people: a body in their shirt colour and a head
    const skin = new THREE.MeshLambertMaterial({ color: 0xD9A57A }), legs = new THREE.MeshLambertMaterial({ color: 0x2F3546 });
    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.75, 8), legGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.85, 8), headGeo = new THREE.SphereGeometry(0.13, 10, 8);
    const personHeadMat = high ? new THREE.MeshLambertMaterial({ vertexColors: true }) : skin;
    const headsByLook = new Map(), trousers = new Map();
    const headOf = (skinColor, hairColor) => {
      const key = skinColor + '_' + hairColor;
      if (headsByLook.has(key)) return headsByLook.get(key);
      const geo = headGeo.clone(), p = geo.getAttribute('position'), colors = [];
      const face = new THREE.Color(skinColor), hair = new THREE.Color(hairColor);
      for (let i = 0; i < p.count; i++) {
        const c = p.getY(i) > 0.035 || p.getX(i) < -0.015 ? hair : face;
        colors.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      headsByLook.set(key, geo); return geo;
    };
    const person = (look, scale) => {
      const palette = (look && look.base || '').split('_');
      const shirt = +palette[1] || 0x3D6FB8, skinColor = +palette[2] || 0xD9A57A, hairColor = +palette[3] || 0x2A2018, legColor = +palette[4] || 0x2F3546;
      let legMat = legs;
      if (high) {
        if (!trousers.has(legColor)) trousers.set(legColor, new THREE.MeshLambertMaterial({ color: legColor }));
        legMat = trousers.get(legColor);
      }
      const g = new THREE.Group();
      const l = new THREE.Mesh(legGeo, legMat); l.position.y = 0.43; g.add(l);
      const b = new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: shirt })); b.position.y = 1.2; g.add(b);
      // Skin, hair and trousers match the top-down walkers. A vertex-coloured cap gives the simple head a facing
      // direction without adding a hair mesh, a texture lookup, or an animation step. Low keeps the original head.
      const h = new THREE.Mesh(high ? headOf(skinColor, hairColor) : headGeo, personHeadMat); h.position.y = 1.7; g.add(h);
      g.scale.setScalar(scale || 1); scene3.add(g); return g;
    };
    const people = [];
    (s.crowd ? s.crowd.walkers : []).forEach(w => people.push({ img: w.img, g: person(w.look, w.kind === 'child' ? 0.7 : 1) }));
    (s.peds || []).forEach(p => people.push({ img: p.img, g: person(p.look, 1) }));

    // the van's headlights: two spotlights from the front of the van, on when its lights are
    const heads = [-0.75, 0.75].map(() => {
      const L = new THREE.SpotLight(0xFFF4DD, 0, 70, 0.42, 0.6, 1.2);
      scene3.add(L); scene3.add(L.target); return L;
    });

    // Phaser draws the HUD over this: an Extern in the HUD camera, under the HUD's depth
    const extern = s.add.extern().setScrollFactor(0).setDepth(690);
    const C = { on: false, three, scene3, camera, extern, cars, people, signals, heads };
    // The game's canvas has no depth buffer (Phaser asks for none), so the 3D is drawn into a target of its own that
    // has one, then copied to the screen with a single full-screen quad.
    const bw = gl.drawingBufferWidth, bh = gl.drawingBufferHeight;
    const target = new THREE.WebGLRenderTarget(bw, bh, { depthBuffer: true, stencilBuffer: false });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const blitScene = new THREE.Scene(), blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: target.texture, depthTest: false, depthWrite: false })));
    extern.render = (renderer) => {
      if (!C.on) return;
      C.sync(s);
      renderer.pipelines.clear();
      three.resetState();
      three.setRenderTarget(target);
      three.setViewport(0, 0, bw, bh);
      three.setClearColor(fogSky, 1);
      three.clear(true, true, false);
      three.render(scene3, camera);
      three.setRenderTarget(null);
      three.setViewport(0, 0, bw, bh);
      three.render(blitScene, blitCam);
      three.resetState();
      renderer.pipelines.rebind();
    };

    /** Move everything to where the drive has it this frame. */
    C.sync = function (sc) {
      const V = OTR.vehicle, v = sc.van, g = v.g;
      // the driver's eye: on the left of the cab, high up as a step van's seat is
      const eye = V.point(v, g.nose - 1.3, -0.45), ahead = V.point(v, g.nose + 20, -0.45);
      camera.position.set(m(eye.x), 2.25, m(eye.y));
      camera.lookAt(m(ahead.x), 1.2, m(ahead.y));
      const on = !!sc.lights;
      heads.forEach((L, i) => {
        const p = V.point(v, g.nose, i ? 0.8 : -0.8), t = V.point(v, g.nose + 18, i ? 0.8 : -0.8);
        // dipped beams: they light the road ahead after dark and hardly show by day
        L.position.set(m(p.x), 0.9, m(p.y)); L.target.position.set(m(t.x), 0, m(t.y)); L.intensity = on ? 40 + 220 * dark : 0;
      });
      cars.forEach(o => {
        o.g.position.set(m(o.c.x), 0, m(o.c.y)); o.g.rotation.y = -o.c.heading;
        o.tl.color.setHex(o.c.speed < 20 || dark > 0.2 ? 0xFF2030 : 0x701018);
      });
      people.forEach(o => { o.g.visible = o.img.visible !== false; o.g.position.set(m(o.img.x), 0, m(o.img.y)); o.g.rotation.y = -o.img.rotation; });
      signals.forEach(o => {
        const st = (o.dir === 'W' || o.dir === 'E') ? o.it.lightH : o.it.lightV;
        o.lamps.forEach(l => l.mat.color.setHex(l.c === st ? (st === 'red' ? 0xFF2A2A : st === 'amber' ? 0xFFB020 : 0x30FF80) : 0x303030));
      });
    };

    // the cab round the windscreen: the dash, the pillars and the wheel
    const fr = s.add.graphics().setScrollFactor(0).setDepth(691);
    const W = OTR.W, H = OTR.H;
    fr.fillStyle(0x1A1820, 1);
    fr.fillPoints([{ x: 0, y: H }, { x: 0, y: H - 150 }, { x: W * 0.3, y: H - 175 }, { x: W * 0.7, y: H - 175 }, { x: W, y: H - 150 }, { x: W, y: H }], true);
    fr.fillStyle(0x24222C, 1);
    fr.fillPoints([{ x: 0, y: 58 }, { x: 70, y: 58 }, { x: 34, y: H - 150 }, { x: 0, y: H - 150 }], true);
    fr.fillPoints([{ x: W, y: 58 }, { x: W - 70, y: 58 }, { x: W - 34, y: H - 150 }, { x: W, y: H - 150 }], true);
    fr.lineStyle(26, 0x101014, 1); fr.beginPath(); fr.arc(W * 0.3, H + 40, 190, Math.PI * 1.15, Math.PI * 1.85); fr.strokePath();
    fr.lineStyle(14, 0x101014, 1); fr.lineBetween(W * 0.3, H - 60, W * 0.3 - 150, H - 40); fr.lineBetween(W * 0.3, H - 60, W * 0.3 + 150, H - 40);
    C.frame = fr;
    // These are three.js resources, not Phaser textures. Release only this view's objects on scene shutdown;
    // never lose the shared GL context. A restarted drive must build a fresh cab rather than reuse destroyed HUD
    // objects and the previous town's cars/people.
    s.events.once('shutdown', () => {
      C.on = false;
      const geometries = new Set(), materials = new Set(), textures = new Set();
      [scene3, blitScene].forEach(root => root.traverse(o => {
        if (o.geometry) geometries.add(o.geometry);
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach(mat => {
          materials.add(mat);
          Object.keys(mat).forEach(k => { const t = mat[k]; if (t && t.isTexture && t !== target.texture) textures.add(t); });
        });
      }));
      geometries.forEach(g => g.dispose());
      textures.forEach(t => t.dispose());
      materials.forEach(mat => mat.dispose());
      target.dispose(); three.dispose();
      if (s.cab === C) s.cab = null;
    });
    s.syncCameras();
    return C;
  }
};
