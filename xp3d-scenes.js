"use strict";

/* ============================================================
   Kishaan Gidda — the flight's three worlds
   ------------------------------------------------------------
   The experience flight (xp3d.js) carries a camera along a
   hairline thread from one job to the next. This file is the
   space it flies through, and all three candidates are built
   from the hero's own material: the same iterated-sine field,
   the same six stops with the crease at stop five, the same
   Oklab mixing. Only what the field is laid ON changes.

     ribbon  — the field as a length of cloth in 3D, twisting
               under a lamp, that the thread runs above
     horizon — the field laid flat as a sea of light, skimmed
               low, fogging to a pale sky at the horizon
     panes   — the field cut into framed panes, one at every
               year boundary, that the camera flies through

   Hand-written WebGL, like silk.js: no library, no build step.
   Each scene exposes draw(frame) and, where it has hairline
   furniture of its own (pane edges), frames().
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

  /* ---- GLSL shared by every scene -------------------------------
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

  /* the uniforms every scene shares, set once per frame */
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
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
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

  /* ==============================================================
     HORIZON — the field laid flat as a sea of light
     One full-screen triangle; every pixel casts a ray, and where
     it meets the plane y = 0 the field is read at that point.
     ============================================================== */

  const FULL_VS = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const HORIZON_FS = `
    uniform vec3  uEye;
    uniform vec3  uFwd;
    uniform vec3  uRight;
    uniform vec3  uUp;
    uniform float uTan;
    uniform float uAspect;

    void main() {
      vec2 ndc = gl_FragCoord.xy / uRes * 2.0 - 1.0;
      vec3 dir = normalize(uFwd + uRight * ndc.x * uTan * uAspect + uUp * ndc.y * uTan);
      float y01 = gl_FragCoord.y / uRes.y;
      vec3 haze = sky(y01);

      /* a pale band where sea and sky meet, so the horizon is a
         soft light rather than a hard line */
      float glow = exp(-abs(dir.y) * 38.0);
      haze = mix(haze, vec3(0.992, 0.996, 1.0), glow * 0.65);

      if (dir.y > -0.0008) { gl_FragColor = dithered(haze); return; }

      float dist = -uEye.y / dir.y;
      vec3 P = uEye + dir * dist;
      float t = uTime * 0.088;

      vec2 p = P.xz * 0.075;
      float val = silkField(p, t);
      /* far off the folds go finer than a pixel: settle them to the
         pale flat before they can shimmer, then let the fog finish */
      val = mix(val, 0.50, smoothstep(26.0, 95.0, dist));
      vec3 lab = ramp(val);

      /* a sea reflects the sky at a glance: the grazing view lifts
         toward white, the steep view keeps its blue */
      float graze = pow(1.0 - abs(dir.y), 5.0);
      lab.x = mix(lab.x, 0.975, graze * 0.30);
      lab.yz *= 1.0 - graze * 0.34;

      /* one broad glint, low on the water, where the lamp would sit */
      vec3 L = normalize(vec3(-0.30, 0.34, -1.0));
      vec3 R = reflect(dir, vec3(0.0, 1.0, 0.0));
      float glint = pow(clamp(dot(R, L), 0.0, 1.0), 22.0);
      float crest = smoothstep(0.60, 1.0, val);
      lab.x += glint * (0.05 + crest * 0.10) + crest * 0.03;
      lab.yz *= 1.0 - clamp(glint * 0.5 + crest * 0.1, 0.0, 0.7);

      lab = readFloor(lab);
      vec3 col = toSrgb(lab);
      float fog = 1.0 - exp(-dist * 0.017);
      col = mix(col, haze, fog);
      gl_FragColor = dithered(col);
    }
  `;

  function horizon(gl) {
    const p = program(gl, FULL_VS, HORIZON_FS);
    if (!p) return null;
    const tri = buffer(gl, new Float32Array([-1, -1, 3, -1, -1, 3]));
    return {
      mirror: true,
      stem: true,
      draw(f) {
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(p);
        common(gl, p, f);
        attrib(gl, p, "aPos", tri, 2);
        gl.uniform3fv(p.u("uEye"), f.eye);
        gl.uniform3fv(p.u("uFwd"), f.fwd);
        gl.uniform3fv(p.u("uRight"), f.right);
        gl.uniform3fv(p.u("uUp"), f.up);
        gl.uniform1f(p.u("uTan"), Math.tan(f.fovY / 2));
        gl.uniform1f(p.u("uAspect"), f.w / f.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
  }

  /* ==============================================================
     PANES — the field cut into framed windows of light
     Each year boundary is a pane of the hero, composed the way the
     hero is (lamp high left, the deep pooled right), standing
     across the flight path. The camera flies through each one.
     ============================================================== */

  const PANE_FS = `
    uniform vec3  uEye;
    uniform float uFogK;
    uniform float uSeed;
    uniform float uAspect;
    varying vec3 vPos;
    varying vec3 vNor;
    varying vec2 vUv;

    float zone(vec2 px, vec2 c, vec2 r, float plateau, float edge) {
      return smoothstep(edge, plateau, length((px - c) / r));
    }

    void main() {
      float t = uTime * 0.088 + uSeed;
      vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.0;
      float val = silkField(p, t);
      vec3 lab = ramp(val);

      /* the hero's own lamp, pool and sill, in the pane's frame */
      float lamp = zone(vUv, vec2(0.20, 0.96), vec2(1.00, 0.84), 0.10, 1.28);
      float pool = zone(vUv, vec2(1.04, 0.34), vec2(0.70, 1.00), 0.05, 1.02);
      float sill = zone(vUv, vec2(0.02, -0.08), vec2(0.78, 0.70), 0.00, 0.92);
      float lift = clamp(0.16 * lamp, 0.0, 0.34);
      float sink = clamp(0.30 * pool + 0.16 * sill, 0.0, 0.40);
      lab.x = mix(lab.x, 0.965, lift);
      lab.x = mix(lab.x, lab.x * 0.87, sink);
      lab.yz *= (1.0 - lift * 0.55) * (1.0 + sink * 0.34);

      float crest = smoothstep(0.60, 1.0, val);
      float sweep = mix(-0.55, 1.55, fract(uTime / 21.0));
      float x = (dot(vUv - 0.5, vec2(0.9205, 0.3907)) + 0.5 - sweep) * 3.0;
      float rake = exp(-x * x);
      lab.x += crest * (0.030 + 0.075 * rake);
      lab.yz *= 1.0 - crest * (0.10 + 0.26 * rake);

      lab = readFloor(lab);
      vec3 col = toSrgb(lab);
      float fog = 1.0 - exp(-length(uEye - vPos) * uFogK);
      col = mix(col, sky(gl_FragCoord.y / uRes.y), fog);
      gl_FragColor = dithered(col);
    }
  `;

  /* a pane as four world corners: centre, facing, size, and a lean */
  function paneCorners(c, facing, w, h, roll) {
    const n = norm(facing);
    let r = norm(cross([0, 1, 0], n));
    let u = cross(n, r);
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const r2 = add(mul(r, cr), mul(u, sr));
    const u2 = sub(mul(u, cr), mul(r, sr));
    r = mul(r2, w / 2);
    u = mul(u2, h / 2);
    return [
      sub(sub(c, r), u), add(sub(c, u), r),
      add(add(c, r), u), add(sub(c, r), u),
    ];
  }

  function panes(gl, layout) {
    const p = program(gl, MESH_VS, PANE_FS);
    if (!p) return null;

    /* one pane behind every station; the engine routes the camera
       through each on its way to the next (TUNE.panes.through) */
    const list = layout.gates.map((g, i) => ({
      corners: paneCorners(g.at, g.facing, 8.4, 5.25, (i % 2 ? -1 : 1) * 0.035),
      aspect: 1.6, seed: i * 2.3, fog: 0.022, frame: true,
    }));

    /* and a scatter of small ones in the haze, for depth */
    const scatter = [
      [-15, 6.5, -6, 0.5], [13, 5.2, -14, -0.7], [-19, 2.4, -30, 0.3],
      [17, 8.4, -38, -0.4], [-12, 9.2, -52, 0.6], [15, 1.6, -58, -0.2],
      [-24, 4.2, -70, 0.4], [9, 11, -80, -0.5],
    ];
    scatter.forEach(([x, y, z, yaw], i) => {
      const s = 1.6 + (i % 3) * 0.7;
      list.push({
        corners: paneCorners([x, y, z], [Math.sin(yaw), 0.08, Math.cos(yaw)], s * 1.6, s, 0.05 * (i % 2 ? 1 : -1)),
        aspect: 1.6, seed: 11 + i * 1.7, fog: 0.03, frame: true,
      });
    });

    list.forEach((q) => {
      const [a, b, c, d] = q.corners;
      const n = norm(cross(sub(b, a), sub(d, a)));
      q.pos = buffer(gl, new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]));
      q.nor = buffer(gl, new Float32Array([...n, ...n, ...n, ...n, ...n, ...n]));
      q.uv = buffer(gl, new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]));
    });

    return {
      frames: () => list.filter((q) => q.frame).map((q) => q.corners),
      draw(f) {
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.useProgram(p);
        common(gl, p, f);
        gl.uniformMatrix4fv(p.u("uVP"), false, f.vp);
        gl.uniform3fv(p.u("uEye"), f.eye);
        list.forEach((q) => {
          attrib(gl, p, "aPos", q.pos, 3);
          attrib(gl, p, "aNor", q.nor, 3);
          attrib(gl, p, "aUv", q.uv, 2);
          gl.uniform1f(p.u("uFogK"), q.fog);
          gl.uniform1f(p.u("uSeed"), q.seed);
          gl.uniform1f(p.u("uAspect"), q.aspect);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        });
      },
    };
  }

  const BUILD = { ribbon, horizon, panes };

  /* where each world wants the camera. The sea is skimmed: eye low,
     level with the stations, so the horizon crosses the frame and
     the names float on it. The others fly the default. */
  const TUNE = {
    panes: { through: true },
    horizon: {
      restEye: [-2.3, 0.5, 7.2],
      restAim: [4.6, 0.32, -0.6],
      ovEye: [-7, 3.2, 21],
      ovAim: [1.0, 1.1, -30],
    },
  };

  window.XpScenes = {
    has: (name) => Object.prototype.hasOwnProperty.call(BUILD, name),
    build: (name, gl, layout) => BUILD[name](gl, layout),
    tune: (name) => TUNE[name] || {},
    catmull,
    SKY_TOP,
    SKY_LOW,
  };
})();
