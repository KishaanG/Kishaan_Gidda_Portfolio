"use strict";

/* ============================================================
   Kishaan Gidda — the flight's world
   ------------------------------------------------------------
   The experience flight (xp3d.js) carries a camera along a
   hairline thread from one job to the next. This file is the
   space it flies through: the ribbon, the hero's field as a
   length of cloth in 3D, twisting under a lamp, that the
   thread runs above. It is built from the hero's own material
   — the same iterated-sine field, the same six stops with the
   crease at stop five, the same Oklab mixing — and only what
   the field is laid ON changes.

   Hand-written WebGL, like silk.js: no library, no build step.
   The world exposes draw(frame).
   ============================================================ */

(() => {
  /* the hero's high-key stops, crease at five — see silk.js */
  const PALETTE = ["#6BA6DE", "#8FBFEA", "#B9DAF5", "#E4F1FD", "#3F7CB8", "#FBFDFF"];

  /* the stage's own ground. home.css paints the same two stops
     behind the canvas, and fog resolves to exactly these, so a
     fogged surface and the sky it sits in can never disagree. */
  const SKY_TOP = "#fbfdff";
  const SKY_LOW = "#e3effb";

  function hexToOklab(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.pow(((n >> 16) & 255) / 255, 2.2);
    const g = Math.pow(((n >> 8) & 255) / 255, 2.2);
    const b = Math.pow((n & 255) / 255, 2.2);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  }
  const srgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  const LAB = new Float32Array(PALETTE.flatMap(hexToOklab));

  /* ---- GLSL shared by the world's programs ---------------------
     silkField() is the hero's 'marble' preset, reproduced exactly;
     only its domain is now a surface coordinate instead of the
     screen. The lamp and the reading light become per-scene. */
  const CHUNK = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    uniform vec3  uLab[6];
    uniform float uTime;
    uniform vec2  uRes;
    uniform float uDpr;
    uniform vec3  uSkyTop;
    uniform vec3  uSkyLow;
    uniform vec4  uZone[3];   // screen rects the type sits in, device px, y up

    vec3 oklabToLinear(vec3 c) {
      float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
      float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
      float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
      l = l * l * l; m = m * m * m; s = s * s * s;
      return vec3(
         4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
    }

    vec3 ramp(float t) {
      float u = clamp(t, 0.0, 1.0) * 5.0;
      float fi = min(floor(u), 4.0);
      float f = u - fi;
      int idx = int(fi);
      vec3 a = uLab[0];
      vec3 b = uLab[1];
      for (int k = 0; k < 5; k++) {
        if (k == idx) { a = uLab[k]; b = uLab[k + 1]; }
      }
      return mix(a, b, f);
    }

    float ign(vec2 p) {
      return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
    }

    float silkField(vec2 p, float t) {
      const vec2 F = vec2(0.9205, 0.3907);
      float sum = 0.0;
      float wsum = 0.0;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 q = p * 0.30;
        float a =  1.7 + fi * 0.90;
        float d = -0.6 + fi * 1.30;
        for (int j = 2; j < 9; j++) {
          float fj = float(j);
          a += cos(fj + d * 1.2 + q.x * 2.0 - t);
          d += sin(fj * q.y + a - t * 0.8);
        }
        vec2 w = q + vec2(a, d) * 0.21;
        float band = dot(p, F) * 1.38 + dot(vec2(a, d), F) * 0.966 + length(w) * 0.55;
        float weight = 1.0 - fi * 0.28;
        sum  += (0.5 + 0.5 * sin(band + fi * fi)) * weight;
        wsum += weight;
      }
      return clamp((sum / wsum - 0.30) / 0.42, 0.0, 1.0);
    }

    vec3 sky(float y) { return mix(uSkyLow, uSkyTop, clamp(y, 0.0, 1.0)); }

    /* 1 inside a rect, falling to 0 over 'soft' px outside it */
    float boxZone(vec4 r, vec2 px, float soft) {
      if (r.z <= r.x) return 0.0;
      vec2 d = max(r.xy - px, px - r.zw);
      return 1.0 - smoothstep(0.0, soft, max(d.x, d.y));
    }

    /* The reading floor from the hero: a floor under Oklab lightness
       where type sits, not a wash. Only the crease can threaten copy,
       so only the crease is lifted; the folds keep their edges. */
    vec3 readFloor(vec3 lab) {
      vec2 px = gl_FragCoord.xy;
      float soft = 110.0 * uDpr;
      float z = max(boxZone(uZone[0], px, soft),
                max(boxZone(uZone[1], px, soft), boxZone(uZone[2], px, soft)));
      float lifted = mix(lab.x, max(lab.x, 0.905), z);
      lab.yz *= 1.0 - clamp((lifted - lab.x) * 1.8, 0.0, 0.72);
      lab.x = lifted;
      return lab;
    }

    vec3 toSrgb(vec3 lab) {
      return pow(clamp(oklabToLinear(lab), 0.0, 1.0), vec3(0.45454545));
    }

    vec4 dithered(vec3 col) {
      col += (ign(gl_FragCoord.xy) - 0.5) * (1.7 / 255.0);
      return vec4(col, 1.0);
    }
  `;

  /* ---- plumbing ------------------------------------------------ */
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

  function program(gl, vs, fs) {
    const v = compile(gl, gl.VERTEX_SHADER, vs);
    const f = compile(gl, gl.FRAGMENT_SHADER, CHUNK + fs);
    if (!v || !f) return null;
    const p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    const cache = new Map();
    p.u = (name) => {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name));
      return cache.get(name);
    };
    return p;
  }

  /* the uniforms the world's shaders share, set once per frame */
  function common(gl, p, f) {
    gl.uniform3fv(p.u("uLab[0]"), LAB);
    gl.uniform1f(p.u("uTime"), f.time);
    gl.uniform2f(p.u("uRes"), f.w, f.h);
    gl.uniform1f(p.u("uDpr"), f.dpr);
    gl.uniform3fv(p.u("uSkyTop"), srgb(SKY_TOP));
    gl.uniform3fv(p.u("uSkyLow"), srgb(SKY_LOW));
    gl.uniform4fv(p.u("uZone[0]"), f.zones);
  }

  function buffer(gl, data, target = gl.ARRAY_BUFFER) {
    const b = gl.createBuffer();
    gl.bindBuffer(target, b);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return b;
  }

  function attrib(gl, p, name, buf, size) {
    const loc = gl.getAttribLocation(p, name);
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }

  /* ---- a little vector maths ---- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const norm = (a) => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

  function catmull(pts, u) {
    const n = pts.length;
    const i = Math.min(n - 2, Math.max(0, Math.floor(u)));
    const t = u - i;
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const t2 = t * t;
    const t3 = t2 * t;
    return [0, 1, 2].map((c) => 0.5 * (
      2 * p1[c] +
      (-p0[c] + p2[c]) * t +
      (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 +
      (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3));
  }

  /* ==============================================================
     RIBBON — the field as a length of cloth
     ============================================================== */

  const MESH_VS = `
    attribute vec3 aPos;
    attribute vec3 aNor;
    attribute vec2 aUv;
    uniform mat4 uVP;
    varying vec3 vPos;
    varying vec3 vNor;
    varying vec2 vUv;
    void main() {
      vPos = aPos; vNor = aNor; vUv = aUv;
      gl_Position = uVP * vec4(aPos, 1.0);
    }
  `;

  const RIBBON_FS = `
    uniform vec3  uEye;
    uniform float uFogK;
    uniform float uSeed;
    uniform float uWidth;
    varying vec3 vPos;
    varying vec3 vNor;
    varying vec2 vUv;

    void main() {
      float t = uTime * 0.088 + uSeed;
      /* along the cloth, then across it: the folds run lengthwise
         the way weight pulls a hung length of silk */
      vec2 p = vec2(vUv.x * 0.21, (vUv.y - 0.5) * uWidth * 0.34);
      float val = silkField(p, t);
      vec3 lab = ramp(val);

      vec3 n = normalize(vNor);
      vec3 V = normalize(uEye - vPos);
      if (dot(n, V) < 0.0) n = -n;
      vec3 L = normalize(vec3(-0.35, 0.85, 0.40));
      float ndl = clamp(dot(n, L), 0.0, 1.0);

      /* the cloth's own turn under the lamp, in Oklab like the field:
         the lit face lifts and whitens, the turned face deepens */
      float lift = 0.24 * ndl;
      float sink = 0.34 * (1.0 - ndl);
      lab.x = mix(lab.x, 0.975, lift);
      lab.x = mix(lab.x, lab.x * 0.82, sink);
      lab.yz *= (1.0 - lift * 0.55) * (1.0 + sink * 0.40);

      vec3 H = normalize(L + V);
      float spec = pow(clamp(dot(n, H), 0.0, 1.0), 42.0);
      float crest = smoothstep(0.60, 1.0, val);
      lab.x += crest * 0.035 + spec * 0.13;
      lab.yz *= 1.0 - clamp(crest * 0.12 + spec * 0.55, 0.0, 0.8);

      lab = readFloor(lab);
      vec3 col = toSrgb(lab);

      float fog = 1.0 - exp(-length(uEye - vPos) * uFogK);
      float selvedge = smoothstep(0.0, 0.035, vUv.y) * smoothstep(1.0, 0.965, vUv.y);
      col = mix(sky(gl_FragCoord.y / uRes.y), col, (1.0 - fog) * selvedge);
      gl_FragColor = dithered(col);
    }
  `;

  function ribbonMesh(gl, pts, o) {
    const SEG = o.seg || 520;
    const ACROSS = 12;
    const span = pts.length - 1;
    const pos = [];
    const nor = [];
    const uv = [];
    let s = 0;
    let prev = null;
    for (let i = 0; i <= SEG; i++) {
      const u = (i / SEG) * span;
      const c = catmull(pts, u);
      if (prev) s += Math.hypot(c[0] - prev[0], c[1] - prev[1], c[2] - prev[2]);
      prev = c;
      const T = norm(sub(catmull(pts, Math.min(span, u + 0.01)), catmull(pts, Math.max(0, u - 0.01))));
      const B = norm(cross(T, [0, 1, 0]));
      const N0 = cross(B, T);
      const th = o.twist(u);
      const side = add(mul(B, Math.cos(th)), mul(N0, Math.sin(th)));
      const up = sub(mul(N0, Math.cos(th)), mul(B, Math.sin(th)));
      for (let j = 0; j <= ACROSS; j++) {
        const off = j / ACROSS - 0.5;
        /* a slight cup across the width: hung cloth never lies flat */
        const P = add(add(c, mul(side, off * o.width)), mul(up, off * off * o.width * o.curl));
        const N = norm(sub(up, mul(side, 2 * off * o.curl)));
        pos.push(...P);
        nor.push(...N);
        uv.push(s, j / ACROSS);
      }
    }
    const idx = [];
    const row = ACROSS + 1;
    for (let i = 0; i < SEG; i++) {
      for (let j = 0; j < ACROSS; j++) {
        const a = i * row + j;
        idx.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
      }
    }
    return {
      pos: buffer(gl, new Float32Array(pos)),
      nor: buffer(gl, new Float32Array(nor)),
      uv: buffer(gl, new Float32Array(uv)),
      idx: buffer(gl, new Uint16Array(idx), gl.ELEMENT_ARRAY_BUFFER),
      count: idx.length,
      width: o.width,
      seed: o.seed,
      fog: o.fog,
    };
  }

  function ribbon(gl) {
    const p = program(gl, MESH_VS, RIBBON_FS);
    if (!p) return null;

    /* the main length runs under the thread, from behind the camera
       to past the present; two more hang far off in the haze so the
       space has depth on both sides */
    const cloths = [
      ribbonMesh(gl, [
        [-10, -3.0, 34], [-4, -2.1, 16], [1.2, -1.5, 2], [5.6, -1.3, -12],
        [7.2, -1.4, -24], [3.0, -1.2, -36], [-2.4, -1.4, -48], [-6.5, -2.0, -64], [-4, -2.8, -92],
      ], { width: 5.4, curl: 0.3, seed: 0.0, fog: 0.017,
           twist: (u) => 0.72 * Math.sin(u * 1.1 + 0.5) + 0.18 * Math.sin(u * 2.6) }),
      ribbonMesh(gl, [
        [-60, 4, 0], [-48, 3, -30], [-54, 5, -62], [-44, 3.5, -96],
      ], { width: 9, curl: 0.22, seed: 3.7, fog: 0.016,
           twist: (u) => 0.45 * Math.sin(u * 1.3 + 1.2) }),
      ribbonMesh(gl, [
        [54, -5, -4], [44, -3.5, -34], [52, -4.5, -66], [42, -3, -100],
      ], { width: 9, curl: 0.22, seed: 7.1, fog: 0.016,
           twist: (u) => 0.4 * Math.sin(u * 1.2 + 2.4) }),
    ];

    return {
      draw(f) {
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.useProgram(p);
        common(gl, p, f);
        gl.uniformMatrix4fv(p.u("uVP"), false, f.vp);
        gl.uniform3fv(p.u("uEye"), f.eye);
        // far cloths first, so the near one wins any overlap cleanly
        for (let i = cloths.length - 1; i >= 0; i--) {
          const c = cloths[i];
          attrib(gl, p, "aPos", c.pos, 3);
          attrib(gl, p, "aNor", c.nor, 3);
          attrib(gl, p, "aUv", c.uv, 2);
          gl.uniform1f(p.u("uFogK"), c.fog);
          gl.uniform1f(p.u("uSeed"), c.seed);
          gl.uniform1f(p.u("uWidth"), c.width);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, c.idx);
          gl.drawElements(gl.TRIANGLES, c.count, gl.UNSIGNED_SHORT, 0);
        }
      },
    };
  }

  window.XpScenes = {
    build: ribbon,
    catmull,
    SKY_TOP,
    SKY_LOW,
  };
})();
