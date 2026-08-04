"use strict";

/* ============================================================
   Kishaan Gidda — authored project visuals
   ------------------------------------------------------------
   Neither CareRouter nor the Racing Line App has a screenshot
   in this repo, so rather than fake one, each project is drawn
   in the site's own grammar — hairlines, one blue family — and
   each drawing shows the thing the project actually does.

   · routing  — the triage graph: intake, severity, destination
   · racingline — a circuit, and the minimum-lap-time line, found
     by actually minimising lap time here: a friction-limited speed
     profile over the path, optimised by projected gradient descent.
     Same objective the app gives IPOPT, with a simpler car and a
     simpler optimiser. The late apexes are not drawn in; they are
     what falls out of the physics.

   Both draw themselves once on entry, then hold. Under
   prefers-reduced-motion they appear complete immediately.
   ============================================================ */

(() => {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MAX_DPR = 2;

  /* Colours come from the slide's plate (see home.css), so a
     diagram always matches the ground it is drawn on. Read at
     draw time, not module load, because the plate is a CSS
     custom property and the fonts/theme settle after parse. */
  const FALLBACK = {
    ink: "#27517e",
    soft: "#547aa3",
    rule: "rgba(39, 81, 126, 0.28)",
    ruleSoft: "rgba(39, 81, 126, 0.14)",
  };

  function palette(canvas) {
    const cs = getComputedStyle(canvas);
    const read = (prop, fb) => cs.getPropertyValue(prop).trim() || fb;
    return {
      ink: read("--plate-ink", FALLBACK.ink),
      soft: read("--plate-soft", FALLBACK.soft),
      rule: read("--plate-rule", FALLBACK.rule),
      ruleSoft: read("--plate-rule-soft", FALLBACK.ruleSoft),
      plate: read("--plate", "#ffffff"),
    };
  }

  /* ---------- small helpers ---------- */

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  /* progress of one stage inside an overall 0..1 timeline */
  const stage = (t, from, to) => ease((t - from) / (to - from));

  function fit(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }

  function label(ctx, text, x, y, opts = {}) {
    ctx.save();
    ctx.globalAlpha = opts.alpha ?? 1;
    ctx.font = `${opts.size || 10}px "Geist Mono", ui-monospace, monospace`;
    ctx.fillStyle = opts.color || FALLBACK.soft;
    ctx.textAlign = opts.align || "left";
    ctx.textBaseline = opts.baseline || "middle";
    if (opts.tracking) {
      // canvas has no letter-spacing in older engines; step it manually
      let cx = x;
      const chars = [...text];
      const total = chars.reduce((s, c) => s + ctx.measureText(c).width + opts.tracking, -opts.tracking);
      if (opts.align === "center") cx = x - total / 2;
      if (opts.align === "right") cx = x - total;
      ctx.textAlign = "left";
      for (const c of chars) {
        ctx.fillText(c, cx, y);
        cx += ctx.measureText(c).width + opts.tracking;
      }
    } else {
      ctx.fillText(text, x, y);
    }
    ctx.restore();
  }

  function node(ctx, x, y, r, filled, alpha, opts = {}) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (filled) {
      ctx.fillStyle = opts.ink || FALLBACK.ink;
      ctx.fill();
    } else {
      ctx.fillStyle = opts.plate || "#ffffff";
      ctx.fill();
      ctx.strokeStyle = opts.rule || FALLBACK.rule;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* a hairline bezier from a to b, revealed 0..1 left to right */
  function wire(ctx, ax, ay, bx, by, p, opts = {}) {
    if (p <= 0) return;
    ctx.save();
    ctx.strokeStyle = opts.color || FALLBACK.ruleSoft;
    ctx.lineWidth = opts.width || 1;
    ctx.globalAlpha = opts.alpha ?? 1;
    const mx = (ax + bx) / 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    // sample the curve so we can stop partway through the reveal
    const steps = 40;
    const last = Math.max(1, Math.round(steps * clamp(p, 0, 1)));
    for (let i = 1; i <= last; i++) {
      const t = i / steps;
      const u = 1 - t;
      const x = u * u * u * ax + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * bx;
      const y = u * u * u * ay + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * by;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ============================================================
     1 · CareRouter — the triage routing graph
     ============================================================ */

  function drawRouting(canvas, t) {
    const { ctx, w, h } = fit(canvas);
    const P = palette(canvas);
    ctx.clearRect(0, 0, w, h);

    const pad = Math.min(w, h) * 0.1;
    const X = (n) => pad + (w - pad * 2) * n;
    const Y = (n) => pad + (h - pad * 2) * n;

    /* On a phone there is no room for a destination column to
       the right of the bands, so the destination becomes a
       second line under each band name instead of colliding
       with it, and the whole graph shifts left to keep the fan
       from collapsing into a vertical bar. */
    const narrow = w < 560;
    const R = narrow ? 20 : 26;   // radius of the assessment ring

    const intake = { x: X(0.02), y: Y(0.5) };
    const model = { x: X(narrow ? 0.22 : 0.31), y: Y(0.5) };

    const gates = [
      { y: 0.14, name: "LOW", to: "SELF-SERVE RESOURCES", short: "SELF-SERVE", crisis: false },
      { y: 0.38, name: "MODERATE", to: "COMMUNITY CLINIC", short: "CLINIC", crisis: false },
      { y: 0.62, name: "ELEVATED", to: "URGENT CARE · MATCHED", short: "URGENT CARE", crisis: false },
      { y: 0.86, name: "CRISIS", to: "CRISIS LINE · DIRECT", short: "CRISIS LINE", crisis: true },
    ].map((g) => ({ ...g, x: X(narrow ? 0.46 : 0.55), py: Y(g.y), dx: X(0.99) }));

    /* stage 1 — intake reaches the model */
    const p1 = stage(t, 0.0, 0.22);
    wire(ctx, intake.x, intake.y, model.x, model.y, p1, { color: P.rule, width: 1.2 });
    node(ctx, intake.x, intake.y, 3.5, true, ease(t / 0.08), P);
    label(ctx, "INTAKE", intake.x, intake.y - 16, { size: 9.5, tracking: 1.1, align: "left" , alpha: ease(t / 0.1) });

    /* stage 2 — the model node */
    const p2 = stage(t, 0.18, 0.34);
    if (p2 > 0) {
      ctx.save();
      ctx.globalAlpha = p2;
      ctx.strokeStyle = P.rule;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(model.x, model.y, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p2);
      ctx.stroke();
      ctx.restore();
      node(ctx, model.x, model.y, 3.5, true, p2, P);
      // centring this label would push it off the left edge on a phone
      label(ctx, "SEVERITY ASSESSMENT", narrow ? model.x - R : model.x, model.y - R - 16, {
        size: 9.5, tracking: 1.1, align: narrow ? "left" : "center", alpha: p2,
      });
      label(ctx, "gemini", narrow ? model.x - R : model.x, model.y + R + 16, {
        size: 9.5, tracking: 1.1, align: narrow ? "left" : "center", color: P.soft, alpha: p2,
      });
    }

    /* stage 3 — the model fans out into severity bands */
    gates.forEach((g, i) => {
      const from = 0.3 + i * 0.055;
      const p = stage(t, from, from + 0.2);
      if (p <= 0) return;
      const strong = g.crisis;
      wire(ctx, model.x + R, model.y, g.x, g.py, p, {
        color: strong ? P.ink : P.ruleSoft,
        width: strong ? 1.5 : 1,
        alpha: strong ? 0.85 : 1,
      });
      node(ctx, g.x, g.py, strong ? 4 : 3, strong, p, P);
      label(ctx, g.name, g.x + 11, g.py, {
        size: 9.5, tracking: 1.1,
        color: strong ? P.ink : P.ink,
        alpha: p,
      });
    });

    /* stage 4 — each band lands somewhere real */
    gates.forEach((g, i) => {
      const from = 0.58 + i * 0.05;
      const p = stage(t, from, from + 0.2);
      if (p <= 0) return;
      const strong = g.crisis;

      if (narrow) {
        label(ctx, g.short, g.x + 11, g.py + 13, {
          size: 9, tracking: 1.0,
          color: strong ? P.ink : P.soft,
          alpha: stage(t, from + 0.1, from + 0.22),
        });
        return;
      }

      ctx.font = '9.5px "Geist Mono", ui-monospace, monospace';
      const labelW = ctx.measureText(g.name).width + g.name.length * 1.1;
      const startX = g.x + 20 + labelW + 30;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.strokeStyle = strong ? P.ink : P.ruleSoft;
      ctx.lineWidth = strong ? 1.5 : 1;
      ctx.setLineDash(strong ? [] : [2, 3]);
      ctx.beginPath();
      ctx.moveTo(startX, g.py);
      ctx.lineTo(lerp(startX, g.dx, p), g.py);
      ctx.stroke();
      ctx.restore();
      if (p > 0.7) {
        label(ctx, g.to, g.dx, g.py - 13, {
          size: 9.5, tracking: 1.1, align: "right",
          color: strong ? P.ink : P.soft,
          alpha: stage(t, from + 0.14, from + 0.24),
        });
      }
    });

    /* the closing note — safety-first is the product's whole point */
    const p5 = stage(t, 0.84, 1);
    if (p5 > 0) {
      label(
        ctx,
        narrow ? "CRISIS NEVER QUEUES" : "SAFETY-FIRST ROUTING · CRISIS NEVER QUEUES",
        X(0.03),
        h - pad * 0.4,
        { size: 9.5, tracking: 1.1, color: P.ink, alpha: p5 * 0.8 }
      );
    }
  }

  /* ============================================================
     2 · Racing Line App — a circuit, and the minimum-time line
     The line is solved, not shaped: lapTime() scores a candidate
     path against a friction-limited speed profile and solveLine()
     minimises it over the lateral offsets the track allows. Wide
     entry, late apex and an opening exit are consequences of that
     objective, not rules written into the drawing.
     ============================================================ */

  /* A closed circuit: a long straight, a hairpin, a pair of
     sweepers and a slow final corner. Laid out roughly 1.6:1
     and fitted to whatever box it lands in. */
  const TRACK_HALF = 0.030;   // half the track width, normalised

  const CIRCUIT = [
    [0.05, 0.42], [0.09, 0.22], [0.24, 0.13], [0.44, 0.16],
    [0.60, 0.12], [0.78, 0.14], [0.93, 0.24], [0.95, 0.42],
    [0.84, 0.54], [0.68, 0.52], [0.56, 0.62], [0.38, 0.68],
    [0.22, 0.64], [0.12, 0.55],
  ];

  /* Centripetal Catmull-Rom (alpha = 0.5). Uniform Catmull-Rom
     cusps and self-intersects wherever the control points are
     unevenly spaced, which is exactly what a track outline is. */
  function catmull(pts, samples) {
    const out = [];
    const n = pts.length;
    const ALPHA = 0.5;
    const knot = (ti, a, b) => ti + Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), ALPHA);

    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];

      const t0 = 0;
      const t1 = knot(t0, p0, p1);
      const t2 = knot(t1, p1, p2);
      const t3 = knot(t2, p2, p3);

      for (let s = 0; s < samples; s++) {
        const t = t1 + ((t2 - t1) * s) / samples;
        const mix2 = (a, b, ta, tb) => {
          const d = tb - ta || 1e-6;
          return [
            ((tb - t) / d) * a[0] + ((t - ta) / d) * b[0],
            ((tb - t) / d) * a[1] + ((t - ta) / d) * b[1],
          ];
        };
        const a1 = mix2(p0, p1, t0, t1);
        const a2 = mix2(p1, p2, t1, t2);
        const a3 = mix2(p2, p3, t2, t3);
        const b1 = mix2(a1, a2, t0, t2);
        const b2 = mix2(a2, a3, t1, t3);
        out.push(mix2(b1, b2, t1, t2));
      }
    }
    return out;
  }

  /* signed curvature + inward normal at every sample */
  function frames(path) {
    const n = path.length;
    return path.map((p, i) => {
      const a = path[(i - 1 + n) % n];
      const b = path[(i + 1) % n];
      const tx = b[0] - a[0];
      const ty = b[1] - a[1];
      const len = Math.hypot(tx, ty) || 1;
      // left normal
      const nx = -ty / len;
      const ny = tx / len;
      // curvature from the turn angle across the neighbouring segments
      const v1x = p[0] - a[0], v1y = p[1] - a[1];
      const v2x = b[0] - p[0], v2y = b[1] - p[1];
      const cross = v1x * v2y - v1y * v2x;
      const d1 = Math.hypot(v1x, v1y) || 1;
      const d2 = Math.hypot(v2x, v2y) || 1;
      const k = cross / (d1 * d2);
      return { p, nx, ny, k };
    });
  }

  /* Smoothing with a deliberate backward bias. A symmetric kernel
     puts the apex at the geometric middle of the corner, which is
     what a pure curvature heuristic produces. The minimum-time
     solution apexes LATE: it gives up entry radius to straighten
     the exit, because exit speed is carried down the next straight.

     Weighting the past samples more heavily lags the response, and
     lag is exactly a later apex. Kernel centroid is
       ((-2)(1.6) + (-1)(2.6) + (0)(3) + (1)(1.4) + (2)(0.4)) / 9
     = -0.4 samples per pass, so 26 passes shift the apex ~10 of
     364 samples — around a fifth of a corner. The weights still
     sum to 9, so amplitude behaviour is unchanged and the
     track-containment normalisation below still holds. */
  function smooth(values, passes) {
    let v = values.slice();
    const n = v.length;
    for (let s = 0; s < passes; s++) {
      const next = new Array(n);
      for (let i = 0; i < n; i++) {
        next[i] = (v[(i - 2 + n) % n] + 2 * v[(i - 1 + n) % n] + 3 * v[i] +
                   2 * v[(i + 1) % n] + v[(i + 2) % n]) / 9;
      }
      v = next;
    }
    return v;
  }

  /* ---- the lap-time model ------------------------------------
     A point mass on a friction-limited tyre. Cornering speed is
     capped by lateral grip, then a forward pass caps how fast the
     car can have got there under traction and a backward pass caps
     how fast it can still stop for what is coming. Constants are in
     the circuit's own normalised units; only their ratios matter,
     and braking beats acceleration the way it does in a real car.

     This is the objective the app hands to IPOPT. Solved here with
     a much simpler vehicle and a much simpler optimiser — but the
     line comes out of the physics rather than being drawn to look
     like it did. */
  const A_LAT = 12;      // lateral grip
  const A_ACC = 7;       // traction-limited acceleration
  const A_BRK = 16;      // braking
  const V_MAX = 3.2;     // power-limited top speed
  const USABLE = TRACK_HALF * 0.82;   // the line may use the track, only the track

  function lapTime(path) {
    const n = path.length;
    const ds = new Array(n);
    const v = new Array(n);

    for (let i = 0; i < n; i++) {
      const a = path[(i - 1 + n) % n];
      const b = path[i];
      const c = path[(i + 1) % n];
      ds[i] = Math.hypot(c[0] - b[0], c[1] - b[1]);
      // curvature as the reciprocal circumradius: k = 4·area / (abc)
      const ab = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const bc = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const ca = Math.hypot(a[0] - c[0], a[1] - c[1]);
      const twiceArea = Math.abs(
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
      );
      const k = (2 * twiceArea) / (ab * bc * ca || 1e-9);
      v[i] = Math.min(V_MAX, Math.sqrt(A_LAT / Math.max(k, 1e-6)));
    }

    /* Twice around: the circuit is closed, so a single pass leaves
       the seam between the last sample and the first unconverged. */
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        const j = (i - 1 + n) % n;
        v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * A_ACC * ds[j]));
      }
      for (let i = n - 1; i >= 0; i--) {
        const j = (i + 1) % n;
        v[i] = Math.min(v[i], Math.sqrt(v[j] * v[j] + 2 * A_BRK * ds[i]));
      }
    }

    let T = 0;
    for (let i = 0; i < n; i++) T += ds[i] / Math.max(v[i], 1e-6);
    return T;
  }

  /* The line is parameterised as a lateral offset in [-1, 1] at a
     handful of control points, widened to every sample through a
     smoothstep and a few smoothing passes. Optimising the samples
     directly would let the solver buy lap time with a sawtooth,
     because curvature read off a jagged path is meaningless. */
  function expand(ctrl, n) {
    const m = ctrl.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const u = (i / n) * m;
      const a = Math.floor(u) % m;
      const f = u - Math.floor(u);
      const s = f * f * (3 - 2 * f);
      out[i] = ctrl[a] * (1 - s) + ctrl[(a + 1) % m] * s;
    }
    return smooth(out, 4);
  }

  let cachedLine = null;

  function solveLine() {
    if (cachedLine) return cachedLine;
    const centre = catmull(CIRCUIT, 26);
    const fr = frames(centre);
    const n = centre.length;

    const pathFrom = (offs) =>
      fr.map((f, i) => [
        f.p[0] + f.nx * offs[i] * USABLE,
        f.p[1] + f.ny * offs[i] * USABLE,
      ]);

    /* Projected gradient descent from the centreline. Finite
       differences because there is no analytic gradient through the
       forward/backward speed passes, and the parameter vector is
       small enough that it does not matter. The clamp to [-1, 1] is
       the track boundary, so no iterate can ever leave the circuit. */
    const M = 28;
    let ctrl = new Array(M).fill(0);
    let best = lapTime(pathFrom(expand(ctrl, n)));
    let step = 0.34;
    const EPS = 0.02;

    for (let it = 0; it < 48; it++) {
      const grad = new Array(M);
      for (let k = 0; k < M; k++) {
        const trial = ctrl.slice();
        trial[k] = clamp(trial[k] + EPS, -1, 1);
        grad[k] = (lapTime(pathFrom(expand(trial, n))) - best) / EPS;
      }
      const norm = Math.hypot(...grad) || 1;
      const next = ctrl.map((c, k) => clamp(c - (step * grad[k]) / norm, -1, 1));
      const t = lapTime(pathFrom(expand(next, n)));
      if (t < best) {
        best = t;
        ctrl = next;
      } else {
        step *= 0.6;          // overshot: shorten and try again
        if (step < 0.004) break;
      }
    }

    let offs = expand(ctrl, n);
    let line = pathFrom(offs);

    /* If the solve degenerated, fall back to the curvature heuristic
       rather than drawing a broken line. */
    if (!line.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))) {
      const maxK = Math.max(...fr.map((f) => Math.abs(f.k))) || 1;
      const raw = fr.map((f) => -Math.sign(f.k) * clamp(Math.abs(f.k) / maxK, 0, 1));
      const s = smooth(raw, 26);
      const pk = Math.max(...s.map(Math.abs)) || 1;
      offs = s.map((o) => o / pk);
      line = pathFrom(offs);
    }

    const peak = Math.max(...offs.map(Math.abs)) || 1;
    // apexes: local extremes of the offset, where the line kisses
    // the kerb. Deduped by distance on the track, not by sample
    // index, so two samples in one corner don't both get marked.
    const apexes = [];
    const MIN_GAP = 0.10;
    for (let i = 0; i < offs.length; i++) {
      const prev = offs[(i - 6 + offs.length) % offs.length];
      const next = offs[(i + 6) % offs.length];
      const cur = offs[i];
      if (Math.abs(cur) <= 0.52 * peak) continue;
      if (Math.abs(cur) < Math.abs(prev) || Math.abs(cur) <= Math.abs(next)) continue;
      const here = fr[i].p;
      const tooClose = apexes.some((j) => {
        const p = fr[j].p;
        return Math.hypot(p[0] - here[0], p[1] - here[1]) < MIN_GAP;
      });
      if (!tooClose) apexes.push(i);
    }

    /* bounding box of everything that gets drawn, so the fit
       accounts for the track edges rather than the centreline */
    const all = [
      ...fr.map((f) => [f.p[0] + f.nx * TRACK_HALF, f.p[1] + f.ny * TRACK_HALF]),
      ...fr.map((f) => [f.p[0] - f.nx * TRACK_HALF, f.p[1] - f.ny * TRACK_HALF]),
    ];
    const xs = all.map((p) => p[0]);
    const ys = all.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const bbox = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };

    cachedLine = { centre, fr, line, apexes, bbox };
    return cachedLine;
  }

  function drawRacing(canvas, t) {
    const { ctx, w, h } = fit(canvas);
    const P = palette(canvas);
    ctx.clearRect(0, 0, w, h);

    const { centre, fr, line, apexes, bbox } = solveLine();

    /* Fit the circuit uniformly. Scaling x and y independently
       would stretch the shape and, worse, make the track width
       vary with direction. */
    const padX = w * 0.05;
    const padTop = h * 0.05;
    const padBottom = h * 0.13;   // room for the legend
    const scale = Math.min(
      (w - padX * 2) / bbox.w,
      (h - padTop - padBottom) / bbox.h
    );
    const ox = (w - bbox.w * scale) / 2 - bbox.x * scale;
    const oy = padTop + (h - padTop - padBottom - bbox.h * scale) / 2 - bbox.y * scale;

    const HALF = TRACK_HALF;
    const X = (n) => ox + n * scale;
    const Y = (n) => oy + n * scale;

    function poly(points, from, to, close) {
      ctx.beginPath();
      const last = Math.max(1, Math.round(points.length * clamp(to, 0, 1)));
      const first = Math.round(points.length * clamp(from, 0, 1));
      for (let i = first; i < last; i++) {
        const p = points[i];
        const x = X(p[0]);
        const y = Y(p[1]);
        if (i === first) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (close && to >= 1) ctx.closePath();
      ctx.stroke();
    }

    /* stage 1 — the two track edges draw in together */
    const p1 = stage(t, 0, 0.42);
    if (p1 > 0) {
      const outer = fr.map((f) => [f.p[0] + f.nx * HALF, f.p[1] + f.ny * HALF]);
      const inner = fr.map((f) => [f.p[0] - f.nx * HALF, f.p[1] - f.ny * HALF]);
      ctx.save();
      ctx.strokeStyle = P.rule;
      ctx.lineWidth = 1;
      poly(outer, 0, p1, true);
      poly(inner, 0, p1, true);
      ctx.restore();
    }

    /* stage 2 — the geometric centreline, dotted: the naive path */
    const p2 = stage(t, 0.3, 0.58);
    if (p2 > 0) {
      ctx.save();
      ctx.strokeStyle = P.ruleSoft;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      poly(centre, 0, p2, true);
      ctx.restore();
    }

    /* stage 3 — the solved line sweeps around */
    const p3 = stage(t, 0.44, 0.95);
    if (p3 > 0) {
      ctx.save();
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      poly(line, 0, p3, true);

      // the solver's leading edge
      if (p3 < 1) {
        const idx = Math.min(line.length - 1, Math.round(line.length * p3));
        const p = line[idx];
        ctx.beginPath();
        ctx.arc(X(p[0]), Y(p[1]), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = P.ink;
        ctx.fill();
      }
      ctx.restore();
    }

    /* stage 4 — mark the apexes the solver found */
    const p4 = stage(t, 0.86, 1);
    if (p4 > 0) {
      apexes.forEach((i) => {
        const p = line[i];
        ctx.save();
        ctx.globalAlpha = p4;
        ctx.strokeStyle = P.ink;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(X(p[0]), Y(p[1]), 6.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
      // label the first apex on whichever side faces away from the track
      const a0 = line[apexes[0]];
      const onLeft = a0[0] < bbox.x + bbox.w / 2;
      label(ctx, "APEX", X(a0[0]) + (onLeft ? -13 : 13), Y(a0[1]) - 13, {
        size: 9.5, tracking: 1.1, color: P.ink, alpha: p4,
        align: onLeft ? "right" : "left",
      });
    }

    /* legend */
    const p5 = stage(t, 0.9, 1);
    if (p5 > 0) {
      const lx = padX;
      const ly = h - padBottom * 0.42;
      ctx.save();
      ctx.globalAlpha = p5;
      ctx.strokeStyle = P.ruleSoft;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 22, ly);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx + 132, ly);
      ctx.lineTo(lx + 154, ly);
      ctx.stroke();
      ctx.restore();
      label(ctx, "CENTRELINE", lx + 30, ly, { size: 9.5, tracking: 1.1, alpha: p5 });
      label(ctx, "MINIMUM-TIME LINE", lx + 162, ly, {
        size: 9.5, tracking: 1.1, color: P.ink, alpha: p5,
      });
    }
  }

  /* ============================================================
     Mount: replay the draw every time the visual comes back
     ============================================================ */

  const RENDERERS = { routing: drawRouting, racingline: drawRacing };

  function mount(canvas) {
    const draw = RENDERERS[canvas.dataset.visual];
    if (!draw) return;

    let progress = 0;
    let raf = 0;
    let started = false;

    const render = () => draw(canvas, progress);

    /* Restartable: every visual:play rewinds and draws again, so
       scrolling back to a project shows it solve itself rather
       than sitting there already finished. */
    function run() {
      cancelAnimationFrame(raf);
      started = true;
      if (REDUCED) {
        progress = 1;
        render();
        return;
      }
      const DURATION = 2200;
      const t0 = performance.now();
      progress = 0;
      const step = (now) => {
        progress = clamp((now - t0) / DURATION, 0, 1);
        render();
        if (progress < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }

    /* Inside a slideshow the page controller decides when a visual
       is actually showing and fires this; an observer here would
       start all of them at once behind the cross-fade. */
    canvas.addEventListener("visual:play", run);

    if (!canvas.closest("[data-slideshow]")) {
      // kept observing, so this replays on re-entry too
      const io = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.isIntersecting && run()),
        { threshold: 0.25 }
      );
      io.observe(canvas);
    }

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 120);
    }, { passive: true });

    // fonts land after first paint; redraw so the mono labels are right
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { if (started) render(); });
    }
  }

  document.querySelectorAll("canvas[data-visual]").forEach(mount);
})();
