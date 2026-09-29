"use strict";

/* ============================================================
   Kishaan Gidda — the experience flight
   ------------------------------------------------------------
   Pinned by the user to the 3D timeline on clevir.li: scroll
   carries a camera along a hairline thread, and each job is a
   station on it — a wireframe cube, the year, the company in
   the display serif, the role — that the camera flies up to,
   settles beside, and leaves.

   Scroll advances TIME here (DESIGN.md §6), so the thread runs
   forward: Ciena, then Hydro Ottawa, then TrendAI, now. Every
   frame is a pure function of where scroll sits on the runway,
   so going back up flies it in reverse.

   The world the camera moves through is the ribbon in
   xp3d-scenes.js. Phones, reduced motion and no WebGL keep the
   ledger exactly as it was: the ledger is the record, and it
   stays in the page for screen readers even while the flight
   is showing.

   Layers, back to front: the WebGL world, a 2D canvas for the
   hairlines (thread, cubes, pane edges — crisp at one pixel,
   which WebGL lines are not), the station labels as real text,
   then the detail panel and the rail.
   ============================================================ */

(() => {
  const sec = document.getElementById("experience");
  const flight = sec && sec.querySelector("[data-flight]");
  const Scenes = window.XpScenes;
  if (!flight || !Scenes) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const wide = window.matchMedia("(min-width: 901px)");
  if (!wide.matches) return;

  const stage = flight.querySelector(".xp-stage");
  const glCanvas = stage.querySelector(".xp-gl");
  const lineCanvas = stage.querySelector(".xp-lines");
  const ctx = lineCanvas.getContext("2d");
  let gl = null;
  try {
    gl = glCanvas.getContext("webgl", {
      alpha: true, premultipliedAlpha: true, antialias: true, depth: true,
    });
  } catch (_) {
    gl = null;
  }
  if (!gl || !ctx) return;

  /* ---- vector maths ---- */
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const mid = (a, b) => mul(add(a, b), 0.5);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const norm = (a) => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
  const { catmull } = Scenes;

  /* ---- the record, read off the ledger: one source of truth ---- */
  const rows = Array.from(sec.querySelectorAll(".ledger-row")).reverse();
  const stops = rows.map((r) => ({
    year: r.dataset.year || "",
    name: r.querySelector(".ledger-what h3").textContent.trim(),
    role: r.querySelector(".ledger-role").textContent.trim(),
    when: r.querySelector(".ledger-date").textContent.trim(),
    current: !!r.querySelector(".ledger-date .dot"),
    list: r.querySelector(".ledger-list"),
    tags: r.querySelector(".tags"),
  }));
  const n = stops.length;
  if (!n) return;

  /* ================================================================
     THE WORLD — stations, the thread, and the camera's own path
     ================================================================ */

  const LEAN = [0, 6, -1, 5, -2];
  const ST = stops.map((_, k) => [LEAN[k % LEAN.length], 1.3 + (k % 2) * 0.4, -22 * k]);

  /* at rest the camera stands back, left and a little high, and
     looks past the station to its right: the label sits in the
     left half and the detail panel has the right half to itself. */
  const REST_EYE = [-2.3, 1.0, 7.0];
  const REST_AIM = [4.6, -0.1, -0.6];
  const OV_EYE = [-8.5, 7.8, 19];
  const OV_AIM = [1.2, 0.2, -24];

  const restEye = (k) => add(ST[k], REST_EYE);
  const restAim = (k) => add(ST[k], REST_AIM);

  /* the thread: in from behind the camera, through every station,
     on past the last one into the haze — the part not lived yet */
  const TH = [add(ST[0], [-3.2, -1.1, 14])];
  for (let k = 0; k < n; k++) {
    TH.push(ST[k]);
    if (k < n - 1) TH.push(add(mid(ST[k], ST[k + 1]), [k % 2 ? -1.4 : 1.8, 0.7, 0]));
  }
  TH.push(add(ST[n - 1], [-5, -0.2, -24]));
  const TH_N = 520;
  const THREAD = [];
  for (let i = 0; i <= TH_N; i++) {
    const u = (i / TH_N) * (TH.length - 1);
    THREAD.push({ u, p: catmull(TH, u) });
  }

  /* keyframe 0 is the establishing shot — the whole career ahead,
     receding into the light — then one keyframe per station, with
     a via point between each pair. The via swings the camera out
     and up, so the move is an arc, never a dolly on a rail. */
  const EYES = [OV_EYE];
  const AIMS = [OV_AIM];
  for (let k = 0; k < n; k++) {
    const e0 = k ? restEye(k - 1) : OV_EYE;
    const a0 = k ? restAim(k - 1) : OV_AIM;
    const swing = k ? [k % 2 ? -1.9 : 2.3, 1.3, 0] : [2.4, 0.4, 0];
    EYES.push(add(mid(e0, restEye(k)), swing), restEye(k));
    AIMS.push(add(mul(a0, 0.4), mul(restAim(k), 0.6)), restAim(k));
  }

  const scene = Scenes.build(gl);
  if (!scene) return;

  /* ================================================================
     THE RUNWAY — in svh. The camera is already moving the moment the
     stage pins: the opening shot is where the first flight starts,
     not a stop. After that it only ever slows to a stop at a job.
     ================================================================ */
  const FLY_IN = 180;
  const FLY = 280;
  const REST = 28;
  const REST_LAST = 48;
  const SEGS = [];
  for (let k = 0; k < n; k++) {
    SEGS.push({ kind: "fly", len: k ? FLY : FLY_IN, j: k });
    SEGS.push({ kind: "rest", len: k === n - 1 ? REST_LAST : REST, j: k + 1 });
  }

  /* The hand-off. About marks where it picks the thread up with
     [data-thread-in] (about.js); when it is there, the runway ends
     on a stretch where nothing flies — the camera holds on the
     present and the thread drops out of the bottom of the frame to
     that x, pen tip on the reading line About draws to. */
  const handoff = document.querySelector("[data-thread-in]");
  const READ = handoff ? parseFloat(handoff.dataset.threadIn) || 0.7 : 0;
  const EXIT = handoff ? 34 : 0;
  if (EXIT) SEGS.push({ kind: "exit", len: EXIT, j: n });
  let acc = 0;
  SEGS.forEach((s) => { s.from = acc; acc += s.len; });
  const TOTAL = acc;

  /* Sine easing, not a steeper curve: its peak speed is only π/2 of
     the average, so the middle of a flight never rushes. The flight
     in has no start to ease — the camera is already moving — so it
     only decelerates into the first job. */
  const easeInOut = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
  const easeOut = (t) => Math.sin((Math.PI / 2) * t);

  function locate(x) {
    for (const s of SEGS) {
      if (x <= s.from + s.len) return { seg: s, t: clamp((x - s.from) / s.len) };
    }
    const last = SEGS[SEGS.length - 1];
    return { seg: last, t: 1 };
  }

  /* keyframe position, fractional between keyframes while flying */
  function keyAt(x) {
    const { seg, t } = locate(x);
    if (seg.kind !== "fly") return seg.j;
    return seg.j + (seg.j ? easeInOut(t) : easeOut(t));
  }

  /* ---- constant speed ------------------------------------------
     The path's control points are not evenly spaced, so walking the
     spline's own parameter speeds the camera up on a long stretch
     and slows it on a short one — a lurch in the middle of every
     flight. Each flight is re-timed by arc length instead, so the
     easing above is the only thing that changes the speed. */
  const ARC_N = 240;
  const ARCS = [];
  for (let j = 0; j < n; j++) {
    const lens = [0];
    let prev = catmull(EYES, 2 * j);
    for (let i = 1; i <= ARC_N; i++) {
      const p = catmull(EYES, 2 * j + (2 * i) / ARC_N);
      lens.push(lens[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]));
      prev = p;
    }
    ARCS.push(lens.map((l) => l / lens[ARC_N]));
  }

  /* spline parameter at a fraction of the way along flight j */
  function uAlong(j, s) {
    const lens = ARCS[j];
    let lo = 0;
    let hi = ARC_N;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (lens[m] < s) lo = m;
      else hi = m;
    }
    const span = lens[hi] - lens[lo] || 1;
    return 2 * j + (2 * (lo + (s - lens[lo]) / span)) / ARC_N;
  }

  /* ================================================================
     THE DOM — labels, the detail panel, the rail
     ================================================================ */
  const tagLayer = stage.querySelector(".xp-tags");
  const panel = stage.querySelector(".xp-panel");
  const rail = stage.querySelector(".xp-rail");
  const readout = stage.querySelector("[data-xp-year]");

  const tags = stops.map((s) => {
    const el = document.createElement("div");
    el.className = "xp-tag";
    const year = document.createElement("span");
    year.className = "xp-tag-year";
    year.textContent = s.current ? `${s.year} · Now` : s.year;
    const name = document.createElement("span");
    name.className = "xp-tag-name";
    name.textContent = s.name;
    const role = document.createElement("span");
    role.className = "xp-tag-role";
    role.textContent = s.role;
    el.append(year, name, role);
    tagLayer.append(el);
    return { el, w: 0, h: 0, rect: null };
  });

  const details = stops.map((s) => {
    const el = document.createElement("div");
    el.className = "xp-detail";
    const when = document.createElement("p");
    when.className = "xp-detail-when";
    if (s.current) {
      const dot = document.createElement("span");
      dot.className = "dot";
      when.append(dot);
    }
    when.append(document.createTextNode(`${s.when} · ${s.role}`));
    el.append(when);
    if (s.list) el.append(s.list.cloneNode(true));
    if (s.tags) el.append(s.tags.cloneNode(true));
    panel.append(el);
    return el;
  });

  const railLinks = stops.map((s, k) => {
    const a = document.createElement("a");
    a.className = "br br--mono";
    a.href = "#experience";
    a.dataset.go = String(k);
    a.textContent = `[ ${s.current ? "Now" : s.year} · ${s.name} ]`;
    rail.append(a);
    return a;
  });

  /* ================================================================
     SIZE
     ================================================================ */
  const MAX_DPR = 1.5;
  const FOV = (46 * Math.PI) / 180;
  const NEAR = 0.25;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let focal = 1;
  let panelRect = null;
  let railRect = null;
  let dropX = 0;

  function measure() {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    W = stage.clientWidth;
    H = stage.clientHeight;
    focal = H / 2 / Math.tan(FOV / 2);
    [glCanvas, lineCanvas].forEach((c) => {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    });
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sr = stage.getBoundingClientRect();
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return [r.left - sr.left, r.top - sr.top, r.right - sr.left, r.bottom - sr.top];
    };
    panelRect = box(panel);
    railRect = box(rail);
    // the same rounding about.js applies to the same element
    if (handoff) dropX = Math.round(handoff.getBoundingClientRect().left) + 0.5 - sr.left;
    // labels are measured at scale 1 and scaled by transform after
    tags.forEach((t) => {
      t.el.style.transform = "none";
      t.w = t.el.offsetWidth;
      t.h = t.el.offsetHeight;
    });
    flight.style.setProperty("--xp-runway", `calc(100svh + ${TOTAL}svh)`);
  }

  /* ================================================================
     THE CAMERA
     ================================================================ */
  function cameraAt(key) {
    const j = Math.min(n - 1, Math.floor(key));
    const f = key - j;
    const u = f >= 1 ? 2 * key : uAlong(j, f);
    const eye = catmull(EYES, u);
    const aim = catmull(AIMS, u);
    // a slight bank through each turn, never at rest
    const roll = Math.sin(Math.PI * Math.min(1, f)) * 0.045 * (j % 2 ? -1 : 1);
    const fwd = norm(sub(aim, eye));
    const r0 = norm(cross(fwd, [0, 1, 0]));
    const u0 = cross(r0, fwd);
    const c = Math.cos(roll);
    const s = Math.sin(roll);
    const right = add(mul(r0, c), mul(u0, s));
    const up = sub(mul(u0, c), mul(r0, s));
    return { eye, fwd, right, up };
  }

  function matrices(cam) {
    const { eye, fwd: f, right: r, up: u } = cam;
    const view = [
      r[0], u[0], -f[0], 0,
      r[1], u[1], -f[1], 0,
      r[2], u[2], -f[2], 0,
      -dot(r, eye), -dot(u, eye), dot(f, eye), 1,
    ];
    const far = 400;
    const t = 1 / Math.tan(FOV / 2);
    const a = W / H;
    const proj = [
      t / a, 0, 0, 0,
      0, t, 0, 0,
      0, 0, (far + NEAR) / (NEAR - far), -1,
      0, 0, (2 * far * NEAR) / (NEAR - far), 0,
    ];
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let rr = 0; rr < 4; rr++) {
        let v = 0;
        for (let k = 0; k < 4; k++) v += proj[k * 4 + rr] * view[c * 4 + k];
        out[c * 4 + rr] = v;
      }
    }
    return out;
  }

  /* world → camera space: x right, y up, z = depth ahead */
  const toView = (cam, p) => {
    const d = sub(p, cam.eye);
    return [dot(d, cam.right), dot(d, cam.up), dot(d, cam.fwd)];
  };
  const toScreen = (v) => [W / 2 + (v[0] * focal) / v[2], H / 2 - (v[1] * focal) / v[2]];

  /* a segment in camera space, clipped to the near plane, or null */
  function clipSeg(a, b) {
    if (a[2] < NEAR && b[2] < NEAR) return null;
    if (a[2] < NEAR) a = lerpV(b, a, (b[2] - NEAR) / (b[2] - a[2]));
    else if (b[2] < NEAR) b = lerpV(a, b, (a[2] - NEAR) / (a[2] - b[2]));
    return [toScreen(a), toScreen(b), (a[2] + b[2]) / 2];
  }
  const lerpV = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  /* ================================================================
     THE HAIRLINES
     ================================================================ */
  const INK = "39, 81, 126";
  const FAINT = "120, 156, 192";
  const depthAlpha = (z) => clamp(Math.exp(-(z - 7) * 0.03), 0.07, 1);

  function strokeSegs(segs, rgb, base, dash) {
    ctx.setLineDash(dash || []);
    let offset = 0;
    for (let i = 0; i < segs.length; i += 6) {
      const run = segs.slice(i, i + 6).filter(Boolean);
      if (!run.length) continue;
      ctx.strokeStyle = `rgba(${rgb}, ${(base * depthAlpha(run[0][2])).toFixed(3)})`;
      ctx.lineDashOffset = -offset;
      ctx.beginPath();
      run.forEach(([a, b]) => {
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        offset += Math.hypot(b[0] - a[0], b[1] - a[1]);
      });
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawThread(cam, drawn) {
    const view = THREAD.map((t) => toView(cam, t.p));
    const solid = [];
    const ahead = [];
    for (let i = 0; i < TH_N; i++) {
      const seg = clipSeg(view[i], view[i + 1]);
      (THREAD[i].u < drawn ? solid : ahead).push(seg);
    }
    // the part not lived yet gives way to the drop into About
    strokeSegs(ahead, INK, 0.42 * (1 - exitP), [3, 6]);
    strokeSegs(solid, INK, 0.9);
  }

  const CUBE = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ];
  const EDGES = [
    [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6],
    [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  function drawCube(cam, k, key) {
    const at = ST[k];
    const reached = key >= k + 1 - 1e-3;
    // it turns only as you scroll — never on its own
    const yaw = 0.7 + k * 0.9 + key * 0.8;
    const pitch = 0.42;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const pts = CUBE.map(([x, y, z]) => {
      const s = 0.3;
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y2 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      return toView(cam, add(at, [x1 * s, y2 * s, z2 * s]));
    });
    const segs = EDGES.map(([a, b]) => clipSeg(pts[a], pts[b]));
    strokeSegs(segs, reached ? INK : FAINT, reached ? 0.95 : 0.8);

    const c = toView(cam, at);
    if (reached && c[2] > NEAR) {
      const [sx, sy2] = toScreen(c);
      ctx.fillStyle = `rgba(${INK}, ${(0.95 * depthAlpha(c[2])).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* the hairlines never cross type: they are rubbed out, softly,
     from under the detail and under the label being read */
  function knockOut(rect, pad, blur) {
    if (!rect) return;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = "#000";
    ctx.fillRect(rect[0] - pad, rect[1] - pad, rect[2] - rect[0] + pad * 2, rect[3] - rect[1] + pad * 2);
    ctx.restore();
  }

  function drawLines(cam, key, tagRect) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    const drawn = key <= 1 ? lerp(0.3, 1, key) : 1 + 2 * (key - 1);
    drawThread(cam, drawn);
    ST.forEach((_, k) => drawCube(cam, k, key));
    knockOut(panelRect, 20, 16);
    if (tagRect) knockOut([tagRect[0] + 4, tagRect[1], tagRect[2], tagRect[3]], 4, 6);
    drawDrop(cam);
  }

  /* ---- the drop -------------------------------------------------
     From the present's station, straight down and across to where
     About starts. Pinned, the pen draws it as far as the reading
     line; once the stage lets go and rises, the pen stays on that
     line and the rest of the drop runs out beneath it, so at the
     frame's foot the stroke carries straight on into About's. */
  let exitP = 0;
  let past = 0;
  const DROP_N = 48;

  function drawDrop(cam) {
    if (!EXIT || (exitP <= 0 && past <= 0)) return;
    const c = toView(cam, ST[n - 1]);
    if (c[2] < NEAR) return;
    const yR = READ * H;
    const [sx, sy0] = toScreen(c);
    const sy = Math.min(sy0, yR - 24);
    const h = yR - sy;
    // leaves the station straight down, arrives on dropX straight down
    const pts = [];
    let len = 0;
    for (let i = 0; i <= DROP_N; i++) {
      const t = i / DROP_N;
      const u = 1 - t;
      const s = 3 * u * t * t + t * t * t;
      const p = [
        sx + (dropX - sx) * s,
        u * u * u * sy + 3 * u * u * t * (sy + h * 0.55) + 3 * u * t * t * (yR - h * 0.45) + t * t * t * yR,
      ];
      if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      pts.push(p);
    }
    let left = (past > 0 ? 1 : exitP) * len;
    ctx.strokeStyle = `rgba(${INK}, 0.9)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    let end = pts[0];
    for (let i = 1; i <= DROP_N && left > 0; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const f = Math.min(1, left / (seg || 1));
      end = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
      ctx.lineTo(end[0], end[1]);
      left -= seg;
    }
    if (past > 0) {
      end = [dropX, Math.min(H + 1, yR + past)];
      ctx.lineTo(end[0], end[1]);
    }
    ctx.stroke();
    // the pen, while it is still in the frame
    if (end[1] < H) {
      ctx.fillStyle = `rgba(${INK}, 0.95)`;
      ctx.beginPath();
      ctx.arc(end[0], end[1], 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ================================================================
     THE LABELS — real text, placed by the same projection
     ================================================================ */
  const REST_DEPTH = Math.hypot(REST_EYE[0], REST_EYE[1], REST_EYE[2]) * 0.93;

  function placeTags(cam) {
    let near = null;
    tags.forEach((t, k) => {
      const v = toView(cam, add(ST[k], [0.46, 0.02, 0]));
      if (v[2] < NEAR) {
        t.el.style.opacity = "0";
        t.rect = null;
        return;
      }
      const [x, y] = toScreen(v);
      const s = clamp(REST_DEPTH / v[2], 0.1, 2.4);
      // far ones fade into the haze; one you are passing fades out
      const a = depthAlpha(v[2]) * clamp((v[2] - 2.4) / 2.2);
      t.el.style.opacity = a.toFixed(3);
      t.el.style.zIndex = String(1000 - Math.round(v[2] * 10));
      t.el.style.transform =
        `translate3d(${x.toFixed(1)}px, ${(y - (t.h * s) / 2).toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
      t.rect = a > 0.2 ? [x, y - (t.h * s) / 2, x + t.w * s, y + (t.h * s) / 2] : null;
      if (t.rect && (!near || v[2] < near.z)) near = { z: v[2], rect: t.rect };
    });
    return near && near.rect;
  }

  /* ================================================================
     THE PANEL AND THE RAIL
     ================================================================ */
  let shown = -1;

  function placePanel(key) {
    details.forEach((el, k) => {
      // it settles in as the camera arrives and clears quickly as it
      // leaves, before the name it belongs to swells past it
      const d = key - (k + 1);
      const r = 1 - clamp(Math.abs(d) / (d > 0 ? 0.12 : 0.26));
      // and the present's clears as the thread drops away from it, so
      // no copy is left to rise under the chrome as the stage lets go
      const e = r * r * (3 - 2 * r) * (1 - clamp(exitP * 1.6));
      el.style.opacity = e.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - e) * 26).toFixed(1)}px, 0)`;
      el.style.pointerEvents = e > 0.9 ? "auto" : "none";
    });
    const now = clamp(Math.round(key) - 1, 0, n - 1);
    if (now !== shown) {
      shown = now;
      railLinks.forEach((a, k) => a.classList.toggle("on", k === now));
      if (readout) readout.textContent = stops[now].current ? "Now" : stops[now].year;
    }
    rail.style.setProperty("--xp-progress", clamp(key / n).toFixed(4));
  }

  function zones(tagRect) {
    const z = new Float32Array(12);
    const put = (i, r) => {
      if (!r) return;
      z[i * 4] = r[0] * dpr;
      z[i * 4 + 1] = (H - r[3]) * dpr;
      z[i * 4 + 2] = r[2] * dpr;
      z[i * 4 + 3] = (H - r[1]) * dpr;
    };
    put(0, panelRect);
    put(1, tagRect);
    put(2, railRect);
    return z;
  }

  /* ================================================================
     THE FRAME
     ================================================================ */
  const svh = () => window.innerHeight / 100;
  const t0 = performance.now();

  /* The camera follows scroll through a short exponential lag, so a
     run of wheel notches reads as one glide rather than a series of
     jolts. It is on top of the page's own damping, and short enough
     that the camera never feels detached from the hand. */
  const LAG = 0.14;
  let shownX = null;
  let lastNow = 0;

  function runwayX() {
    return clamp(-flight.getBoundingClientRect().top / svh(), 0, TOTAL);
  }

  function paint(now) {
    const target = runwayX();
    // the drop follows the page itself, not the camera's lag: it is
    // stroke, and the stroke has to meet About's on the same line
    if (EXIT) {
      exitP = easeInOut(clamp((target - (TOTAL - EXIT)) / EXIT));
      past = Math.max(0, -flight.getBoundingClientRect().top - TOTAL * svh());
      if (veil) veil.style.opacity = exitP.toFixed(3);
      rail.style.opacity = (1 - clamp(exitP * 2.2)).toFixed(3);
      // faded out, it is out of the tab order too, not just unclickable
      rail.style.visibility = exitP > 0.45 ? "hidden" : "";
    }
    const dt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    if (shownX === null) shownX = target;
    shownX += (target - shownX) * (1 - Math.exp(-dt / LAG));
    if (Math.abs(target - shownX) < 0.02) shownX = target;
    const key = keyAt(shownX);
    const cam = cameraAt(key);
    const tagRect = placeTags(cam);
    placePanel(key);
    drawLines(cam, key, tagRect);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    scene.draw({
      vp: matrices(cam),
      eye: cam.eye,
      time: (now - t0) / 1000 + 40,
      w: glCanvas.width, h: glCanvas.height, dpr,
      zones: zones(tagRect),
    });
  }

  let raf = 0;
  let running = false;
  function frame(now) {
    if (!running) return;
    paint(now);
    raf = requestAnimationFrame(frame);
  }
  const play = () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } };
  const pause = () => { running = false; cancelAnimationFrame(raf); };

  /* ---- scrolling to a place on the runway ---- */
  const yAt = (x) => flight.getBoundingClientRect().top + window.scrollY + x * svh();

  /* A flight to a job is timed, not left to the page's glide: the
     glide covers any distance in about a second and ends on a long
     tail, which races a whole flight. This moves the page at an even
     rate over a set time, and because the camera's own easing is
     already sine in-out across the flight, an even scroll gives an
     even flight that slows to a stop at the job. Any wheel, key or
     touch takes the page straight back. */
  const FLIGHT_S = 4.2;
  let tween = 0;

  // a wheel that interrupts a flight must keep its own notch, so the
  // page's glide is only resynced when nothing else is taking over
  function stopFlight(resync = true) {
    if (!tween) return;
    cancelAnimationFrame(tween);
    tween = 0;
    if (resync && window.Scroller) window.Scroller.sync();
  }

  function flyTo(y, seconds) {
    stopFlight();
    if (window.Scroller) window.Scroller.sync();
    const y0 = window.scrollY;
    const start = performance.now();
    const step = (now) => {
      const p = clamp((now - start) / (seconds * 1000));
      window.scrollTo({ top: y0 + (y - y0) * p, behavior: "instant" });
      if (p < 1) tween = requestAnimationFrame(step);
      else { tween = 0; if (window.Scroller) window.Scroller.sync(); }
    };
    tween = requestAnimationFrame(step);
  }

  // a flight takes the same time per svh whichever way it is entered
  const secondsFor = (dx) => clamp((Math.abs(dx) / FLY) * FLIGHT_S, 0.8, 7);

  // a job, in the middle of its rest: a notch either way stays on it,
  // so reading is never interrupted, and the next one flies on
  function restX(k) {
    const seg = SEGS.find((s) => s.kind === "rest" && s.j === k + 1);
    return seg.from + seg.len * 0.5;
  }

  /* ---- the rail jumps to a job ---- */
  rail.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-go]");
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    const x = restX(Number(a.dataset.go));
    flyTo(yAt(x), secondsFor(x - runwayX()));
  });

  /* ---- the snap -------------------------------------------------
     The camera only comes to rest at a job. When the wheel stops with
     the page headed into a flight, the flight is finished for you in
     the direction you were going: the next job down, or back to the
     last one up. Scrolling that never leaves a job's rest moves
     nothing, so reading one is never interrupted. Wheel and scrolling
     keys arm it, never touch, whose own momentum it would fight. */
  let dir = 1;
  let wheelIdle = 0;
  let keyIdle = 0;

  function snap(fromX) {
    const { seg, t } = locate(fromX);
    if (seg.kind !== "fly" || t <= 0.002 || t >= 0.998) return;
    const x = runwayX();
    const to = dir > 0 ? restX(seg.j) : (seg.j ? restX(seg.j - 1) : 0);
    flyTo(yAt(to), secondsFor(to - x));
  }

  function headedX() {
    const y = window.Scroller ? window.Scroller.target : window.scrollY;
    return clamp((y - yAt(0)) / svh(), -1, TOTAL + 1);
  }

  function inRunway() {
    const x = runwayX();
    const r = flight.getBoundingClientRect();
    return r.top <= 1 && r.bottom >= window.innerHeight - 1 && x > 0 && x < TOTAL;
  }

  window.addEventListener("touchstart", () => stopFlight(), { passive: true });
  window.addEventListener("wheel", (e) => {
    stopFlight(false);
    if (e.ctrlKey || !inRunway()) return;
    dir = e.deltaY >= 0 ? 1 : -1;
    clearTimeout(wheelIdle);
    wheelIdle = setTimeout(() => {
      const x = headedX();
      if (x > 0 && x < TOTAL) snap(x);
    }, 150);
  }, { passive: true });

  const SCROLL_KEYS = new Set([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp"]);
  window.addEventListener("keydown", (e) => {
    if (!SCROLL_KEYS.has(e.key)) return;
    stopFlight();
    if (!inRunway()) return;
    dir = e.key === "PageUp" || e.key === "ArrowUp" || (e.key === " " && e.shiftKey) ? -1 : 1;
    clearTimeout(keyIdle);
    keyIdle = setTimeout(() => snap(runwayX()), 260);
  });

  /* ================================================================
     MOUNT
     ================================================================ */
  sec.classList.add("is-flight");
  flight.hidden = false;
  // the frame's foot settles to the stage's own ground as the thread
  // drops, so it meets About's ground rather than a cut through cloth
  const veil = EXIT ? document.createElement("div") : null;
  if (veil) {
    veil.className = "xp-veil";
    stage.insertBefore(veil, lineCanvas);
  }
  measure();

  // a tab coming back resumes the loop only if the flight is on
  // screen: the observer will not fire again for a view that never
  // changed while the tab was away
  let inView = false;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      inView = e.isIntersecting;
      if (inView && !document.hidden) play();
      else pause();
    }),
    { rootMargin: "200px" }
  );
  io.observe(flight);
  const onVis = () => (document.hidden || !inView ? pause() : play());
  const onResize = () => { measure(); if (!running) paint(performance.now()); };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("resize", onResize, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (!flight.hidden) { measure(); paint(performance.now()); } });
  }

  /* dropping below the desktop breakpoint hands back to the ledger
     for the rest of the visit: nothing here runs again until reload */
  wide.addEventListener("change", () => {
    if (wide.matches) return;
    pause();
    io.disconnect();
    inView = false;
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("resize", onResize);
    sec.classList.remove("is-flight");
    flight.hidden = true;
  });
})();
