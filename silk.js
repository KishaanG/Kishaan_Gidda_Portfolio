"use strict";

/* ============================================================
   Kishaan Gidda — the silk light field
   ------------------------------------------------------------
   The site's only image, generated rather than pictured. See
   DESIGN.md §1.

   Three things make it read as poured liquid rather than as a
   blurred photograph, and all three matter:

   1. THE FIELD IS ALL SINES. Iterated sine turbulence — each
      pass folds the plane back through itself — instead of
      lattice noise. A value-noise fbm is only as smooth as its
      interpolant and carries a grid, an octave seam and a
      derivative kink wherever cells meet; those artefacts are
      what make a shader look like fog. A sum of sines of sines
      is analytic everywhere, so every fold has a continuous
      edge no matter how far you lean into it.

   2. THE PALETTE IS NOT MONOTONE. Stop 5 of 6 is a deep blue
      sitting between the pale stop and the specular white, so
      each crest is born with its own crease beside it. That
      single inversion is what gives the cloth an edge; a plain
      dark-to-light ramp can only ever produce haze.

   3. IT IS MIXED IN OKLAB, IN LINEAR LIGHT. Blending blues
      through sRGB drags them grey at the midpoint. The stops
      are converted once on the CPU, so the fragment pays for
      one Oklab→linear on the way out and nothing else.

   Mounts on any <canvas data-silk="strength">. Falls back to a
   layered CSS gradient (.silk-fallback on the host) when WebGL
   is unavailable, renders a single static frame under
   prefers-reduced-motion, and pauses whenever it leaves the
   viewport so it never burns a GPU offscreen.
   ============================================================ */

(() => {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MAX_DPR = 1.5;

  /* The phase the field opens on. Every frame this shader can reach is
     a valid composition, but they are not equally good, and the first
     viewport is the most important frame on the page — so it is chosen
     rather than left to whatever t=0 happens to land on. Reduced-motion
     visitors are held on exactly this frame: the still IS the opening,
     which is why there is one constant here and not two. */
  const OPEN = 120.0;

  /* ------------------------------------------------------------
     The cloth, in order of increasing light. Read either as a
     section through one fold: body, half-light, pale, then the
     crease, then the specular that the crease sets off.

     Both end on a crease at 0.8 — that inversion is the mechanism
     and it is not optional. They differ in how much of the range
     is spent on blue before the pale flat arrives.
     ------------------------------------------------------------ */
  const PALETTE_HIGH = [
    "#6BA6DE", "#8FBFEA", "#B9DAF5",
    "#E4F1FD", // pale flat, nearly white — more of the frame reads bright
    "#3F7CB8", // the crease
    "#FBFDFF", // specular
  ];

  const PALETTE_DEEP = [
    "#5E9BD6", // a deeper body: more blue mass across the frame
    "#82B5E6", "#A8CFF1",
    "#D8EBFB", // pale flat, still legibly blue rather than white
    "#3F7CB8", // the crease, pitched at --display so the fold's
    //            shadow and the display serif are the same blue
    "#FAFDFF", // specular
  ];

  /* ------------------------------------------------------------
     PRESETS — the field's character, as authored variants.

     These are the real iteration states this shader passed
     through, with their field maths reproduced exactly. The one
     thing they do NOT differ in is the reading light: every
     preset gets the corrected version, because the early wash
     that bleached the type column was a defect, not a look. So
     the choice here is purely the character of the cloth.

     Pick one with data-preset on the canvas. Default: marble.
     silk-lab.html runs all five live, side by side.
     ------------------------------------------------------------ */
  const PRESETS = {
    /* Broad, near-horizontal sweeps. Calm and very high-key — the
       most restrained of the five, and the least like cloth. */
    drift: {
      scale: 0.30, fold: [0.3907, -0.9205],
      freq: 0.945, fan: 0.0, chaosDir: 0.6615, radial: 0.42,
      wa: 0.0, wd: 0.0, fall: 0.28,
      window: [0.30, 0.42], crest: 0.60, palette: PALETTE_HIGH,
    },
    /* LIVE — this is the field the site ships.

       Turbulence leads instead of position, so the plane resolves
       into broad molten folds rather than parallel ribbons. It is the
       smoothest and least structured of the five, and that is exactly
       why it is the one: the brief asked for the reference's "video"
       quality, and this reads most like poured light and least like a
       woven material. The trade is that it gives up the reference's
       parallel-ribbon geometry — a deliberate divergence, chosen by
       the user over the closer-fitting 'ribbon'. */
    marble: {
      scale: 0.30, fold: [0.9205, 0.3907],
      freq: 1.38, fan: 0.0, chaosDir: 0.966, radial: 0.55,
      wa: 0.0, wd: 0.0, fall: 0.28,
      window: [0.30, 0.42], crest: 0.60, palette: PALETTE_HIGH,
    },
    /* Position leads, so the ribbons run long and parallel and keep
       their lean. High-key palette and a wide contrast window put a
       lot of white on the frame — the brightest, crispest variant. */
    ribbon: {
      scale: 0.22, fold: [0.9205, -0.3907],
      freq: 6.4, fan: 0.85, chaosDir: 0.0, radial: 0.0,
      wa: 0.42, wd: 0.30, fall: 0.38,
      window: [0.30, 0.42], crest: 0.60, palette: PALETTE_HIGH,
    },
    /* Ribbon's structure on the deep palette: fewer, wider folds and
       real blue mass. Warmer and heavier; the most "fabric" of them. */
    satin: {
      scale: 0.22, fold: [0.9205, -0.3907],
      freq: 5.3, fan: 1.15, chaosDir: 0.0, radial: 0.0,
      wa: 0.55, wd: 0.42, fall: 0.38,
      window: [0.33, 0.46], crest: 0.66, palette: PALETTE_DEEP,
    },
    /* Satin with the third layer pulled back, which takes out the
       moiré ripple three even layers beat into the lower half. The
       closest of the five to the pinned reference's geometry. */
    silk: {
      scale: 0.22, fold: [0.9205, -0.3907],
      freq: 5.3, fan: 1.15, chaosDir: 0.0, radial: 0.0,
      wa: 0.50, wd: 0.36, fall: 0.44,
      window: [0.33, 0.46], crest: 0.66, palette: PALETTE_DEEP,
    },
  };

  /* sRGB hex → Oklab. Ottosson's matrices; the 2.2 transfer here is
     the exact inverse of the 1/2.2 the fragment encodes with, so the
     round trip is closed. */
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

  const LAB_CACHE = new Map();
  function labFor(palette) {
    const key = palette.join("");
    if (!LAB_CACHE.has(key)) LAB_CACHE.set(key, new Float32Array(palette.flatMap(hexToOklab)));
    return LAB_CACHE.get(key);
  }

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    uniform vec2  uRes;
    uniform float uTime;
    uniform float uStrength;
    uniform vec4  uRead;      // where the type sits: cx, cy, rx, ry
    uniform vec3  uLab[6];

    /* the preset — see PRESETS in the JS above */
    uniform float uScale;     // how far the domain is scaled down
    uniform vec2  uFold;      // direction the fold phase climbs
    uniform vec4  uBand;      // freq, fan, chaosDir, radial
    uniform vec2  uWarp;      // how much a and d bend the ribbons
    uniform float uFall;      // layer weight falloff
    uniform vec2  uWindow;    // contrast stretch: lo, span
    uniform float uCrest;     // where the specular starts

    /* Oklab → linear sRGB. The palette arrives already in Oklab, so
       this is the only colour-space conversion the fragment does. */
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

    /* Six stops, five segments, mixed in Oklab. The loop is here
       because GLSL ES 1.00 will only index a uniform array with a
       loop counter — it costs five compares and nothing else. */
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

    /* Interleaved gradient noise — the standard ordered dither for
       exactly this job. At the same amplitude it is far less visible
       than white noise, because its error is spatially decorrelated
       rather than random. */
    float ign(vec2 p) {
      return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
    }

    /* soft elliptical field, 1 inside the plateau, 0 past the edge */
    float zone(vec2 px, vec2 c, vec2 r, float plateau, float edge) {
      return smoothstep(edge, plateau, length((px - c) / r));
    }

    void main() {
      vec2 px = gl_FragCoord.xy / uRes;                   // 0..1, y up
      vec2 p  = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;  // centred, aspect-true

      float t = uTime * 0.088;

      /* --------------------------------------------------------
         Three layers of iterated sine turbulence. The domain is
         scaled right down on purpose: the chaos comes from
         iterating, not from spatial frequency, so the folds stay
         enormous and long-wavelength instead of busy.
         -------------------------------------------------------- */
      float sum = 0.0;
      float wsum = 0.0;

      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 q = p * uScale;
        float a =  1.7 + fi * 0.90;
        float d = -0.6 + fi * 1.30;

        for (int j = 2; j < 9; j++) {
          float fj = float(j);
          a += cos(fj + d * 1.2 + q.x * 2.0 - t);
          d += sin(fj * q.y + a - t * 0.8);
        }

        /* The ribbon phase, and the balance that decides the whole
           character of the field. When the positional term (uBand.x)
           LEADS, the folds stay parallel and keep a constant lean —
           woven cloth. When the turbulence leads instead (uBand.z up,
           uBand.x down) the folds go molten and lose that geometry —
           poured liquid. That one ratio is the whole difference
           between the 'ribbon' and 'marble' presets, and the site is
           set to the latter.

           uBand.y fans the folds wider toward the bottom of the
           frame, the way weight opens cloth as it falls. */
        vec2 w = q + vec2(a, d) * 0.21;
        float band = dot(p, uFold) * (uBand.x + p.y * uBand.y)
                   + dot(vec2(a, d), uFold) * uBand.z
                   + length(w) * uBand.w
                   + a * uWarp.x + d * uWarp.y;

        /* Steep falloff matters. Three layers at even weights beat
           against each other and the interference reads as moiré
           ripple, not cloth; the higher uFall is, the more the second
           layer only varies fold widths and the third only softens
           edges. */
        float weight = 1.0 - fi * uFall;
        sum  += (0.5 + 0.5 * sin(band + fi * fi)) * weight;
        wsum += weight;
      }

      /* Stretch the middle of the range and let both ends clip. The
         flat white plateaus and the pooled deep blues are what make
         this satin rather than a gradient. */
      float val = clamp((sum / wsum - uWindow.x) / uWindow.y, 0.0, 1.0);

      vec3 lab = ramp(val);

      /* --------------------------------------------------------
         Illumination, done in Oklab so it behaves like light: the
         lit face rises in lightness and desaturates toward white,
         the deep face drops and saturates. Two scalars carry the
         whole composition.
         -------------------------------------------------------- */
      float lamp = zone(px, vec2(0.20, 0.96), vec2(1.00, 0.84), 0.10, 1.28);
      float pool = zone(px, vec2(1.04, 0.34), vec2(0.70, 1.00), 0.05, 1.02);
      float sill = zone(px, vec2(0.02, -0.08), vec2(0.78, 0.70), 0.00, 0.92);
      /* Sized to the whole type stack — eyebrow down to the status
         line — not to its centre, so no line of copy sits on the
         shoulder of the falloff. Each mount declares its own, because
         the three surfaces that carry the field set their type in
         three different places. */
      float read = zone(px, uRead.xy, uRead.zw, 0.80, 1.60);

      float lift = clamp(0.16 * lamp + 0.18 * read, 0.0, 0.34);
      float sink = clamp(0.30 * pool + 0.16 * sill, 0.0, 0.40) * (1.0 - read * 0.80);

      lab.x = mix(lab.x, 0.965, lift);
      lab.x = mix(lab.x, lab.x * 0.87, sink);
      lab.yz *= (1.0 - lift * 0.55) * (1.0 + sink * 0.34);

      /* The reading floor. Only the crease is dark enough to threaten
         body copy, so only the crease is lifted — a floor under Oklab
         lightness where the type sits, not a wash over that whole
         quarter of the frame. The folds keep their edges there; they
         simply stop going deep. Washing instead would have bleached
         the left third flat, which is the opposite of the brief. */
      float lifted = mix(lab.x, max(lab.x, 0.860), read);
      lab.yz *= 1.0 - clamp((lifted - lab.x) * 1.5, 0.0, 0.55);
      lab.x = lifted;

      /* --------------------------------------------------------
         Two speculars. The broad one pools on every crest so the
         surface reads wet rather than matte. The raking one is a
         single slow pass of light across the folds, and it is what
         turns continuous drift into something with a beat — without
         it the motion reads as noise morphing, with it the cloth is
         turning under a lamp.
         -------------------------------------------------------- */
      float crest = smoothstep(uCrest, 1.00, val);
      float across = dot(px - 0.5, uFold) + 0.5;  /* travels across the folds */
      float sweep = mix(-0.55, 1.55, fract(uTime / 21.0));
      float x = (across - sweep) * 3.0;
      float rake = exp(-x * x);   /* never pow() — the base goes negative */

      float sheen = crest * (0.030 + 0.075 * rake);
      lab.x += sheen;
      lab.yz *= 1.0 - crest * (0.10 + 0.26 * rake);

      /* strength, also in Oklab: a clean fade toward paper */
      lab.x = mix(1.0, lab.x, uStrength);
      lab.yz *= uStrength;

      vec3 col = pow(clamp(oklabToLinear(lab), 0.0, 1.0), vec3(0.45454545));

      /* the flats here are very wide — without this they band on
         8-bit panels, and banding is the one thing that would give
         the whole illusion away */
      col += (ign(gl_FragCoord.xy) - 0.5) * (1.7 / 255.0);

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
    const P = PRESETS[canvas.dataset.preset] || PRESETS.marble;

    gl.uniform1f(gl.getUniformLocation(prog, "uStrength"), strength);
    gl.uniform3fv(gl.getUniformLocation(prog, "uLab[0]"), labFor(P.palette));
    gl.uniform1f(gl.getUniformLocation(prog, "uScale"), P.scale);
    gl.uniform2f(gl.getUniformLocation(prog, "uFold"), P.fold[0], P.fold[1]);
    gl.uniform4f(gl.getUniformLocation(prog, "uBand"), P.freq, P.fan, P.chaosDir, P.radial);
    gl.uniform2f(gl.getUniformLocation(prog, "uWarp"), P.wa, P.wd);
    gl.uniform1f(gl.getUniformLocation(prog, "uFall"), P.fall);
    gl.uniform2f(gl.getUniformLocation(prog, "uWindow"), P.window[0], P.window[1]);
    gl.uniform1f(gl.getUniformLocation(prog, "uCrest"), P.crest);

    /* Where this surface puts its type, as "cx cy rx ry" in 0..1 with
       y measured up from the bottom. The field lights that patch so
       copy never lands in a crease. Default is the hero's. */
    const read = (canvas.dataset.read || "0.34 0.45 0.72 0.62")
      .trim().split(/[\s,]+/).map(Number);
    gl.uniform4f(gl.getUniformLocation(prog, "uRead"),
      read[0] || 0.34, read[1] || 0.45, read[2] || 0.72, read[3] || 0.62);

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
      draw(OPEN);
      const onResize = () => { if (resize()) draw(OPEN); };
      window.addEventListener("resize", onResize, { passive: true });
      return { stop() { window.removeEventListener("resize", onResize); } };
    }

    let raf = 0;
    let running = false;
    const start = performance.now();

    function frame(now) {
      if (!running) return;
      resize();
      draw((now - start) / 1000 + OPEN);
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
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? play() : pause())),
      { rootMargin: "120px" }
    );
    io.observe(host);

    const onVis = () => (document.hidden ? pause() : play());
    document.addEventListener("visibilitychange", onVis);

    const onResize = () => { if (!running) { resize(); draw(OPEN); } };
    window.addEventListener("resize", onResize, { passive: true });

    return {
      stop() {
        pause();
        io.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("resize", onResize);
        const ext = gl.getExtension("WEBGL_lose_context");
        if (ext) ext.loseContext();
      },
    };
  }

  document.querySelectorAll("canvas[data-silk]").forEach(mount);

  /* the variant lab drives these; the site itself never touches them */
  window.Silk = { mount, PRESETS };
})();
