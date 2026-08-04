"use strict";

/* ============================================================
   Kishaan Gidda — the silk light field
   ------------------------------------------------------------
   A WebGL fragment shader: two-stage domain-warped fbm noise
   read as light through folded satin. This is the site's only
   image, and it is generated rather than pictured — see
   DESIGN.md §1.

   Mounts on any <canvas data-silk>. Falls back to a layered
   CSS gradient (.silk-fallback on the host) when WebGL is
   unavailable, and renders a single static frame under
   prefers-reduced-motion. Pauses whenever it leaves the
   viewport, so it never burns a GPU offscreen.
   ============================================================ */

(() => {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MAX_DPR = 1.5;

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    uniform vec2  uRes;
    uniform float uTime;
    uniform float uStrength;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    /* Three octaves only. More than that reads as marble or
       water; satin has almost no high-frequency detail. */
    float fbm(vec2 p) {
      float v = 0.0, a = 0.55;
      mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
      for (int i = 0; i < 3; i++) {
        v += a * noise(p);
        p = rot * p * 2.07;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 px = gl_FragCoord.xy / uRes;
      vec2 uv = px;
      uv.x *= uRes.x / uRes.y;

      float t = uTime * 0.040;

      /* one low-frequency domain warp. The whole look lives in
         keeping this soft: big folds, long wavelengths. */
      vec2 q = vec2(fbm(uv * 0.95 + vec2(0.0, t)),
                    fbm(uv * 0.95 + vec2(4.1, 1.2) - t * 0.7));
      float f = fbm(uv * 1.15 + 2.4 * q);

      /* Broad bands sheared steeply down the frame. The noise
         term inside the argument is what bends them: without
         it these are ruler-straight stripes, with it they
         undulate like cloth. */
      float fold = sin((uv.x * 1.25 - uv.y * 1.35 + f * 3.6) * 4.2 + t * 0.5);
      fold = smoothstep(0.08, 0.92, fold * 0.5 + 0.5);

      float shade = 0.22 + f * 0.40 + fold * 0.44;

      /* a broad lamp in the upper right, the way the reference is lit */
      shade += smoothstep(1.60, 0.25, distance(px, vec2(0.90, 1.05))) * 0.22;
      /* and the lower left settles into the deepest blue */
      shade -= smoothstep(1.00, 0.00, distance(px, vec2(0.02, 0.20))) * 0.14;

      vec3 deep  = vec3(0.435, 0.671, 0.878);
      vec3 mid   = vec3(0.639, 0.812, 0.949);
      vec3 pale  = vec3(0.867, 0.933, 0.988);
      vec3 white = vec3(0.992, 0.998, 1.000);

      vec3 col = mix(deep, mid,   smoothstep(0.00, 0.44, shade));
      col = mix(col, pale,  smoothstep(0.36, 0.74, shade));
      col = mix(col, white, pow(smoothstep(0.62, 1.02, shade), 1.35));

      /* two or three long specular streaks, not a vein network.
         Warped by the same noise, so they curve with the cloth
         instead of ruling straight across it. */
      float streak = smoothstep(0.955, 1.0,
        sin((uv.x * 1.50 + uv.y * 2.20 + f * 2.60) * 3.6 + t * 0.6));
      col = mix(col, white, streak * 0.50);

      /* dither, so these very wide flats don't band on 8-bit panels */
      col += (hash(gl_FragCoord.xy) - 0.5) * 0.0055;

      col = mix(vec3(1.0), col, uStrength);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function mount(canvas) {
    const host = canvas.parentElement || canvas;
    const strength = parseFloat(canvas.dataset.silk) || 1;

    let gl = null;
    try {
      gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      });
    } catch (_) {
      gl = null;
    }
    if (!gl) return host.classList.add("silk-fallback");

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return host.classList.add("silk-fallback");

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      return host.classList.add("silk-fallback");
    }
    gl.useProgram(prog);

    // one full-screen triangle — cheaper than a quad, no seam
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uStrength = gl.getUniformLocation(prog, "uStrength");
    gl.uniform1f(uStrength, strength);

    let w = 0;
    let h = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const rect = canvas.getBoundingClientRect();
      const nw = Math.max(1, Math.round(rect.width * dpr));
      const nh = Math.max(1, Math.round(rect.height * dpr));
      if (nw === w && nh === h) return false;
      w = canvas.width = nw;
      h = canvas.height = nh;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      return true;
    }

    function draw(seconds) {
      gl.uniform1f(uTime, seconds);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    resize();
    host.classList.add("silk-live");

    if (REDUCED) {
      // the field is still there — it simply stops moving
      draw(18);
      window.addEventListener("resize", () => { if (resize()) draw(18); }, { passive: true });
      return;
    }

    let raf = 0;
    let running = false;
    const start = performance.now();

    function frame(now) {
      if (!running) return;
      resize();
      draw((now - start) / 1000);
      raf = requestAnimationFrame(frame);
    }

    function play() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    }

    function pause() {
      running = false;
      cancelAnimationFrame(raf);
    }

    // never render a field nobody is looking at
    new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? play() : pause())),
      { rootMargin: "120px" }
    ).observe(host);

    document.addEventListener("visibilitychange", () =>
      document.hidden ? pause() : play()
    );

    window.addEventListener("resize", () => { if (!running) { resize(); draw(18); } }, { passive: true });
  }

  document.querySelectorAll("canvas[data-silk]").forEach(mount);
})();
