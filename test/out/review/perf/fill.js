/*
 * fill: raw WebGL fill-rate probe, independent of Phaser. Pauses the game, hides its canvas, and draws `layers`
 * full-screen textured quads per frame into a fresh 1280x720 canvas with the given context attributes.
 *   __fill({ aa: true, layers: 7, ms: 3000, blend: true, w: 1280, h: 720, pp: 'default' })
 *   -> { renderer, fps, msAvg, gpuMs }
 */
(() => {
  window.__fill = async function (o) {
    o = Object.assign({ aa: true, layers: 0, ms: 3000, blend: true, w: 1280, h: 720, pp: 'default', keepPhaser: false }, o || {});
    const game = OTR.game;
    game.loop.sleep();
    const pc = game.canvas, prevDisp = pc.style.display;
    if (!o.keepPhaser) pc.style.display = 'none';
    const c = document.createElement('canvas');
    c.width = o.w; c.height = o.h;
    c.style.cssText = 'position:absolute;left:0;top:0;width:1280px;height:720px;z-index:5';
    document.body.appendChild(c);
    const gl = c.getContext('webgl', { antialias: !!o.aa, alpha: false, premultipliedAlpha: true, stencil: true, depth: true, powerPreference: o.pp });
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '?';
    const vs = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
    const fs = 'precision mediump float; varying vec2 uv; uniform sampler2D t; uniform float a; void main(){ vec4 c = texture2D(t, uv); gl_FragColor = vec4(c.rgb * a, a); }';
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    // a 1280x720 texture with some content
    const tc = document.createElement('canvas'); tc.width = 1280; tc.height = 720;
    const x = tc.getContext('2d'); const gr = x.createLinearGradient(0, 0, 1280, 720); gr.addColorStop(0, '#48c'); gr.addColorStop(1, '#c84'); x.fillStyle = gr; x.fillRect(0, 0, 1280, 720);
    for (let i = 0; i < 400; i++) { x.fillStyle = `hsl(${i * 37 % 360},60%,50%)`; x.fillRect((i * 97) % 1280, (i * 53) % 720, 40, 30); }
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tc);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const ua = gl.getUniformLocation(pr, 'a');
    gl.viewport(0, 0, o.w, o.h);
    if (o.blend) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); } else gl.disable(gl.BLEND);
    const tq = gl.getExtension('EXT_disjoint_timer_query');
    const times = [], pend = [];
    const poll = () => { for (let i = pend.length - 1; i >= 0; i--) { if (tq.getQueryObjectEXT(pend[i], tq.QUERY_RESULT_AVAILABLE_EXT)) { times.push(tq.getQueryObjectEXT(pend[i], tq.QUERY_RESULT_EXT) / 1e6); tq.deleteQueryEXT(pend[i]); pend.splice(i, 1); } } };
    const stamps = [];
    const t0 = performance.now();
    await new Promise(res => {
      const tick = () => {
        stamps.push(performance.now());
        const q = tq ? tq.createQueryEXT() : null;
        if (q) tq.beginQueryEXT(tq.TIME_ELAPSED_EXT, q);
        gl.clearColor(0.1, 0.05, 0.2, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        for (let i = 0; i < o.layers; i++) { gl.uniform1f(ua, 0.5 + 0.5 * ((i % 2) ? 0.9 : 1)); gl.drawArrays(gl.TRIANGLES, 0, 6); }
        if (q) { tq.endQueryEXT(tq.TIME_ELAPSED_EXT); pend.push(q); }
        if (tq) poll();
        if (performance.now() - t0 < o.ms) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    await new Promise(r => setTimeout(r, 200)); if (tq) poll();
    const iv = []; for (let i = 1; i < stamps.length; i++) iv.push(stamps[i] - stamps[i - 1]);
    const msAvg = (stamps[stamps.length - 1] - stamps[0]) / (stamps.length - 1);
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    c.remove();
    pc.style.display = prevDisp;
    game.loop.wake();
    const r2 = (v) => Math.round(v * 100) / 100;
    const med = (a) => { const s = a.slice().sort((p, q) => p - q); return s[Math.floor(s.length / 2)] || 0; };
    return { renderer: renderer.replace(/ANGLE \(|Direct3D11.*$/g, ''), aa: o.aa, pp: o.pp, size: o.w + 'x' + o.h, layers: o.layers, fps: r2(1000 / msAvg), msAvg: r2(msAvg), gpuMs: r2(med(times)) };
  };
  return 'fill loaded';
})()
