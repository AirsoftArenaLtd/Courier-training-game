/*
 * Fake-3D town (TownDriveScene): buildings with walls and trees with height, seen from a camera high above the van.
 *
 * Everything is still flat images; the 3D is in where they are drawn. A point at height h above the ground, seen from
 * a camera at altitude ALT over (cx, cy), lands at cam + (p - cam) * ALT / (ALT - h): a roof drifts away from the middle
 * of the screen and grows a little, and the walls are the quads between the footprint on the ground and the raised
 * roof. As the van drives, the buildings it passes turn to show their sides.
 *
 * Shadows are on the ground (the sun is up and to the left, as the art is lit), drawn once. Collisions use the
 * footprints, which do not move.
 *
 *   const city = OTR.b3d.install(scene)      after the roofs and trees are placed
 *   city.add({ img, fx0, fy0, fx1, fy1, h, walls, windows })
 *   city.tree(img, h)
 *   city.update()                            once a frame, after the camera has moved
 *
 * On the low graphics setting nothing moves: roofs stay where they are (the town as it was) and only the ground
 * shadows are added.
 */
window.OTR = window.OTR || {};

OTR.b3d = {
  ALT: 1600,            // the camera's height above the ground, in world px (20 px = 1 m)
  SUN: [0.55, 0.4],     // a shadow's reach per px of height: down and to the right

  /** Wall colours by building kind (a house by its variant). */
  WALLS: {
    house: [0xE6DED0, 0xD8D6D2, 0xEDE3CF, 0xCFC6B8],
    business: [0xBEB8AE, 0xC8BFAF],
    apartment: [0xA8604C],
    depot: [0xC4C8CE]
  },

  install(scene, o) {
    o = o || {};
    const high = OTR.gfx ? OTR.gfx.high() : true;
    const C = {
      scene, high, items: [], trees: [],
      walls: scene.add.graphics().setDepth(9.9),
      shadows: scene.add.graphics().setDepth(-79),
      shadowAlpha: o.shadowAlpha === undefined ? 0.22 : o.shadowAlpha,
      windowLight: 0,         // 0 (daylight, dark glass) to 1 (lit from inside); the lighting sets it at dusk

      /**
       * A building. Its image is drawn as it is now (the roof); fx0..fy1 is its footprint on the ground, h its height.
       * walls: a colour; windows: 'house' | 'floors' (a row per storey) | 'dock' (loading doors) | null.
       */
      add(b) {
        b.ax = b.img.x; b.ay = b.img.y; b.sx = b.img.scaleX; b.sy = b.img.scaleY;
        this.items.push(b);
        this.shadowOf(b.fx0, b.fy0, b.fx1, b.fy1, b.h);
        return b;
      },

      /** A tree: its canopy at height h, its shadow a soft disc on the ground. */
      tree(img, h, r) {
        const t = { img, ax: img.x, ay: img.y, sx: img.scaleX, sy: img.scaleY, h };
        this.trees.push(t);
        const [kx, ky] = OTR.b3d.SUN;
        this.shadows.fillStyle(0x000000, this.shadowAlpha * 0.8);
        this.shadows.fillEllipse(img.x + h * kx * 0.6, img.y + h * ky * 0.6, r * 1.8, r * 1.6);
        return t;
      },

      /** The ground shadow of a box: the footprint swept along the sun's direction. */
      shadowOf(x0, y0, x1, y1, h) {
        const [kx, ky] = OTR.b3d.SUN, dx = h * kx, dy = h * ky;
        // the hull of the footprint and its shifted copy (the sun is down-right, so this is its outline in order)
        this.shadows.fillStyle(0x000000, this.shadowAlpha);
        this.shadows.fillPoints([
          { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1 + dx, y: y0 + dy },
          { x: x1 + dx, y: y1 + dy }, { x: x0 + dx, y: y1 + dy }, { x: x0, y: y1 }
        ], true);
      },

      /** Snow on every roof and in every tree: a white copy laid over each, moved with it. */
      addSnow() {
        const over = (o, a) => { o.cover = scene.add.image(o.img.x, o.img.y, o.img.texture.key).setOrigin(o.img.originX, o.img.originY)
          .setScale(o.img.scaleX, o.img.scaleY).setFlip(o.img.flipX, o.img.flipY).setTintFill(0xFFFFFF).setAlpha(a).setDepth(o.img.depth + 0.05); };
        this.items.forEach(b => { if (!b.noSnow) over(b, 0.55); });
        this.trees.forEach(t => over(t, 0.4));
      },

      update() {
        if (!this.high) return;
        const cam = scene.cameras.main, v = cam.worldView;
        const cx = v.centerX, cy = v.centerY, A = OTR.b3d.ALT;
        const m = 260, vx0 = v.x - m, vy0 = v.y - m, vx1 = v.right + m, vy1 = v.bottom + m;
        const g = this.walls;
        g.clear();
        for (let i = 0; i < this.items.length; i++) {
          const b = this.items[i];
          if (b.fx1 < vx0 || b.fx0 > vx1 || b.fy1 < vy0 || b.fy0 > vy1) { b.img.setVisible(false); if (b.cover) b.cover.setVisible(false); continue; }
          b.img.setVisible(true);
          const s = A / (A - b.h);
          const up = (x, y) => ({ x: cx + (x - cx) * s, y: cy + (y - cy) * s });
          b.img.setPosition(cx + (b.ax - cx) * s, cy + (b.ay - cy) * s).setScale(b.sx * s, b.sy * s);
          if (b.cover) b.cover.setVisible(true).setPosition(b.img.x, b.img.y).setScale(b.img.scaleX, b.img.scaleY);
          // the four walls: corners on the ground, then the same corners raised. Only those facing the camera show
          // (the others are under the roof).
          const G = [{ x: b.fx0, y: b.fy0 }, { x: b.fx1, y: b.fy0 }, { x: b.fx1, y: b.fy1 }, { x: b.fx0, y: b.fy1 }];
          const U = G.map(p => up(p.x, p.y));
          // outward normals: north, east, south, west; lit from the top-left, so north and west faces are brighter
          const N = [[0, -1, 1.0], [1, 0, 0.78], [0, 1, 0.62], [-1, 0, 0.9]];
          for (let k = 0; k < 4; k++) {
            const a = G[k], c = G[(k + 1) % 4], au = U[k], cu = U[(k + 1) % 4];
            const mx = (a.x + c.x) / 2 - cx, my = (a.y + c.y) / 2 - cy;
            if (mx * N[k][0] + my * N[k][1] >= 0) continue;          // faces away from the camera
            g.fillStyle(OTR.b3d.shade(b.walls, N[k][2]), 1);
            g.fillPoints([a, c, cu, au], true);
            OTR.b3d.details(g, b, k, a, c, au, cu, this.windowLight);
          }
        }
        for (let i = 0; i < this.trees.length; i++) {
          const t = this.trees[i];
          if (t.ax < vx0 || t.ax > vx1 || t.ay < vy0 || t.ay > vy1) continue;
          const s = A / (A - t.h);
          t.img.setPosition(cx + (t.ax - cx) * s, cy + (t.ay - cy) * s).setScale(t.sx * s, t.sy * s);
          if (t.cover) t.cover.setPosition(t.img.x, t.img.y).setScale(t.img.scaleX, t.img.scaleY).setRotation(t.img.rotation);
        }
      },

      destroy() { this.walls.destroy(); this.shadows.destroy(); }
    };
    scene.events.once('shutdown', () => { C.items = []; C.trees = []; });
    return C;
  },

  /** A colour scaled towards black by f (1 = as it is). */
  shade(col, f) {
    const r = Math.round(((col >> 16) & 255) * f), g = Math.round(((col >> 8) & 255) * f), b = Math.round((col & 255) * f);
    return (r << 16) | (g << 8) | b;
  },

  /**
   * Windows and doors on one wall: a ground edge a→c and its raised edge au→cu. A point on the wall is (u along it,
   * v up it). Windows are dark glass by day and warm light as the lighting comes up (lit 0..1).
   */
  details(g, b, side, a, c, au, cu, lit) {
    const P = (u, v) => {
      const gx = a.x + (c.x - a.x) * u, gy = a.y + (c.y - a.y) * u;
      const ux = au.x + (cu.x - au.x) * u, uy = au.y + (cu.y - au.y) * u;
      return { x: gx + (ux - gx) * v, y: gy + (uy - gy) * v };
    };
    const quad = (u0, u1, v0, v1) => g.fillPoints([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], true);
    const len = Math.hypot(c.x - a.x, c.y - a.y);
    const glass = lit > 0 ? OTR.color.lerp(0x3E4E60, 0xFFD27A, lit) : 0x3E4E60;
    if (b.windows === 'house' || b.windows === 'floors') {
      const rows = b.windows === 'floors' ? [[0.1, 0.24], [0.42, 0.56], [0.74, 0.88]] : [[0.32, 0.72]];
      const n = Math.max(1, Math.floor(len / (b.windows === 'floors' ? 34 : 46)));
      g.fillStyle(glass, 0.9);
      rows.forEach(([v0, v1]) => {
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) / n, w = Math.min(0.32, 14 / len);
          quad(u - w, u + w, v0, v1);
        }
      });
      // a front door on a house's street side
      if (b.windows === 'house' && side === b.doorSide) { g.fillStyle(0x6A4A38, 1); quad(0.46, 0.56, 0, 0.62); }
    } else if (b.windows === 'dock' && side === 2) {
      const n = 5;
      g.fillStyle(0x5A5E66, 1);
      for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; quad(u - 0.07, u + 0.07, 0, 0.62); }
      g.fillStyle(glass, 0.85);
      for (let i = 0; i < 8; i++) { const u = (i + 0.5) / 8; quad(u - 0.03, u + 0.03, 0.78, 0.9); }
    } else if (b.windows === 'shop') {
      g.fillStyle(glass, 0.9);
      if (side === b.doorSide) quad(0.08, 0.92, 0.12, 0.7);
      else { const n = Math.max(1, Math.floor(len / 60)); for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; quad(u - 0.12, u + 0.12, 0.4, 0.7); } }
    }
  }
};
