"use strict";

/* ============================================================
   Kishaan Gidda — home controller
   Reveals, the experience spine, and the constellation line
   layer. The work viewer lives in work.js.
   Motion rules live in DESIGN.md §6: content arrives once,
   and reveals do not replay on scroll-back.
   ============================================================ */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- colophon year ---- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

/* ============================================================
   Reveals — once, on entry
   ============================================================ */
(() => {
  const items = document.querySelectorAll(".rise");
  if (!items.length) return;

  if (REDUCED) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        obs.unobserve(e.target);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
  );
  items.forEach((el) => io.observe(el));
})();

/* ============================================================
   Experience — the spine

   The work viewer's scroll advances a slide. This one advances
   time: the ledger is a chronology, so the scroll axis already
   is the time axis, and the section is drawn rather than
   dissolved. A hairline runs the ledger on the left column rule
   and is drawn to the reading line; each job's mark is a station
   on it; and because the mark column sticks, the reading job's
   node sits exactly at the drawn end. Pen tip and ink are the
   same point, which is why the reading line is derived from the
   sticky offset rather than picked as a fraction of the viewport.

   Two states, and the difference is deliberate:
     is-reached — the line has been drawn past this job. Latches,
       and never reverts (DESIGN.md §6: reveals do not replay).
     is-reading — which job you are in. Reverts, exactly as the
       work index tracks whichever project is showing.

   Everything is gated on .is-traced so that no JS, a phone, or a
   stylesheet on its own leaves the ledger exactly as authored.
   ============================================================ */
(() => {
  const ledger = document.querySelector(".ledger");
  if (!ledger) return;

  const rows = Array.from(ledger.querySelectorAll(".ledger-row"));
  const scale = document.querySelector("[data-scale-now]");
  if (!rows.length) return;

  const years = rows.map((r) => r.dataset.year || "");
  const wide = window.matchMedia("(min-width: 901px)");
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smoothstep = (t) => t * t * (3 - 2 * t);

  /* how much larger a company name is on arrival than in the
     record. It clears the ledger's own scale plainly and still
     sits well under the section title, which is what keeps the
     hierarchy of the page intact. */
  const NAME_BIG = 1.62;
  const NAME_FROM = 0.8;   // fraction of the viewport it starts settling at

  let reading = -1;
  let line = 0;
  let detach = null;
  // under reduced motion the line is there, it is simply already
  // finished — the same bargain the silk field strikes when it
  // renders one static frame instead of disappearing
  let frozen = false;

  /* Where on screen the ledger is being read: the centre of a
     mark once its column has stuck. Measured rather than assumed,
     since the sticky offset is a calc() off the chrome height and
     that changes with the breakpoint. */
  function measure() {
    const when = rows[0].querySelector(".ledger-when");
    const mark = rows[0].querySelector(".ledger-mark");
    const top = when ? parseFloat(getComputedStyle(when).top) || 0 : 0;
    line = top + (mark ? mark.offsetHeight : 54) / 2;
  }

  /* A company name is full size when it arrives and has settled to
     record size by the time the line reaches its job, so the name
     lands at the same instant its node lights.

     The name's own position is read from offsetTop rather than a
     client rect: a rect is post-transform, so scaling the heading
     would move the number that decides the scale, and the two
     would chase each other frame to frame. offsetTop is layout,
     and layout is what this is actually keyed to. */
  function settle(row, ledgerTop, from, span) {
    const name = row.querySelector(".ledger-what h3");
    if (!name) return;
    const t = clamp((from - (ledgerTop + name.offsetTop)) / span, 0, 1);
    row.classList.toggle("is-settled", t >= 1);
    // clear rather than write 1: the class and the value then say
    // the same thing, instead of a stale scale sitting under a
    // transform: none that happens to be hiding it
    if (t >= 1) name.style.removeProperty("--name");
    else name.style.setProperty("--name", (1 + (NAME_BIG - 1) * (1 - smoothstep(t))).toFixed(4));
  }

  function trace() {
    const box = ledger.getBoundingClientRect();
    if (box.height <= 0) return;

    if (!frozen) {
      // the drawn length is line - box.top, so the tip of the ink
      // lands on the reading line at every scroll position
      ledger.style.setProperty(
        "--spine",
        clamp((line - box.top) / box.height, 0, 1).toFixed(4)
      );
    }

    const from = window.innerHeight * NAME_FROM;
    const span = Math.max(1, from - line);

    let now = -1;
    rows.forEach((row, i) => {
      if (!frozen) {
        const mark = row.querySelector(".ledger-mark");
        const m = (mark || row).getBoundingClientRect();
        if (m.top + m.height / 2 <= line) row.classList.add("is-reached");
        settle(row, box.top, from, span);
      }
      const r = row.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) now = i;
    });

    // above the ledger or past it, hold the nearest end rather
    // than blanking the readout
    if (now < 0) now = box.top > line ? 0 : rows.length - 1;
    if (now === reading) return;
    reading = now;
    rows.forEach((row, i) => row.classList.toggle("is-reading", i === now));
    if (scale) scale.textContent = years[now] || "";
  }

  function mountTraced() {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        trace();
      });
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    measure();
    trace();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }

  function mount() {
    if (detach) detach();
    detach = null;
    reading = -1;
    rows.forEach((r) => {
      r.classList.remove("is-reached", "is-reading", "is-settled");
      r.querySelector(".ledger-what h3")?.style.removeProperty("--name");
    });
    ledger.style.removeProperty("--spine");

    if (!wide.matches) {
      ledger.classList.remove("is-traced");
      if (scale) scale.textContent = years[0] || "";
      return;
    }

    ledger.classList.add("is-traced");
    // the spine is this section's entrance, so the rows skip the
    // page-wide fade-up — two arrivals on one element would just
    // be the same reveal every other section already does, and a
    // live transform on the row would fight the sticky column
    rows.forEach((r) => r.classList.add("in"));

    if (REDUCED) {
      frozen = true;
      ledger.style.setProperty("--spine", "1");
      // names arrive already at record size; nothing scales
      rows.forEach((r) => r.classList.add("is-reached", "is-settled"));
      // the readout and the filled node are state, not motion, so
      // they still follow along; nothing on screen travels
      detach = mountTraced();
      return;
    }
    frozen = false;
    detach = mountTraced();
  }

  mount();
  wide.addEventListener("change", mount);

  // the marks are images and the dates are webfont text; both
  // change the geometry the reading line is measured against
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (wide.matches) {
        measure();
        trace();
      }
    });
  }
})();

/* ============================================================
   Constellation — one fixed point, everything else hung off it

   Every line runs to the hub, so at rest the diagram is a single
   fan and the families are invisible. Hovering any label gathers
   its family toward the cursor and lights that slice of the fan:
   the grouping is the reward for touching it, not a thing the
   composition has to spell out.

   Everything but the hub floats the whole time it is on screen —
   the one authored exception to DESIGN.md §6, written down there.
   The loop therefore never sleeps; it pauses on leaving the
   viewport and on a hidden tab, and never starts at all under
   prefers-reduced-motion.
   ============================================================ */
(() => {
  const scene = document.querySelector(".constellation");
  if (!scene) return;
  const svg = scene.querySelector(".constellation-lines");
  const group = svg && svg.querySelector("g");
  if (!group) return;

  const NS = "http://www.w3.org/2000/svg";
  const labels = Array.from(scene.querySelectorAll(".cn-hub, .cn-node, .cn-sat"));
  if (labels.length < 2) return;

  /* ---- field constants (px, seconds) ---- */
  const SPRING = 22;       // pull back to the authored position
  const DAMP = 6.6;        // just under critical, so it eases in
  const SEP_PUSH = 2200;   // labels holding each other off
  const SEP_PAD_X = 22;    // breathing room around a label box
  const SEP_PAD_Y = 15;
  const HOVER_PAD_X = 14;  // how generous the hover box is
  const HOVER_PAD_Y = 12;

  /* The hovered label pulls its family like a mass. What matters is
     the feel of falling — slow at first, accelerating the closer it
     gets, then arrested by the pile — so the family's home spring is
     released entirely while it falls and the only force is this one.
     Falloff is 1/d rather than 1/d²: across a field a thousand pixels
     wide an inverse square is 140× weaker at the far edge than the
     near one, and the far labels simply never arrive. */
  const GRAV = 3.4e5;
  const GRAV_SOFT = 130;
  const GRAV_MAX = 1400;
  // home keeps half its claim on a falling label, so the pull settles
  // at a distance instead of collapsing the family onto one point:
  // near labels come most of the way, far ones only lean
  const FALL_HOME = 0.55;
  // and it falls against light drag — enough to settle, little enough
  // that the approach still reads as gathering speed
  const FALL_DAMP = 3;
  const SLIDE = 0.85;          // how much blocked speed turns sideways
  const FALL_SPEED_MAX = 1500; // px/s, so nothing ever teleports

  // topics are heavier than their satellites, so the small mono
  // labels do most of the travelling and the composition holds
  const bodies = labels.map((el, i) => {
    const isHub = el.classList.contains("cn-hub");
    const isNode = el.classList.contains("cn-node");
    return {
      el,
      id: el.dataset.node || "",
      of: el.dataset.of || "",
      // the family a label answers to — a topic owns its own name
      family: isNode ? el.dataset.node : isHub ? "" : el.dataset.of,
      fixed: isHub,
      mass: isNode ? 1.8 : 1,
      // as a share of the field's width, so a label can always reach
      // what is pulling it however wide the window is. It is a guard
      // against runaway, not a leash.
      maxScale: isNode ? 0.55 : 1.15,
      maxOffset: 0,
      // where a line stops short of this label's type; the hub is a
      // display size and needs the room
      padX: isHub ? 16 : 9,
      padY: isHub ? 12 : 6,
      // the float: two slow waves per axis at frequencies that never
      // line up, so no label ever traces the same loop twice and the
      // twelve of them never fall into step with each other
      driftX: isNode ? 15 : 25,
      driftY: isNode ? 9 : 15,
      // ~14–19s and ~10–11s: slow enough to read as buoyancy, quick
      // enough that a label visibly travels while you look at it
      w1: 0.34 + (i % 4) * 0.04,
      w2: 0.55 + (i % 3) * 0.05,
      phase: i * 2.399, // golden angle — spreads the starts evenly
      hx: 0, hy: 0, hw: 0, hh: 0,
      x: 0, y: 0, vx: 0, vy: 0, fx: 0, fy: 0,
    };
  });
  const byId = new Map(bodies.filter((b) => b.id).map((b) => [b.id, b]));
  const links = [];
  // whatever the breakpoint is currently showing
  let active = [];

  // below 620px the stylesheet switches to the phone coordinates, so
  // the field has to read the same pair it is laid out from
  const compact = window.matchMedia("(max-width: 620px)");
  const pct = (el, prop) => (parseFloat(el.style.getPropertyValue(prop)) || 0) / 100;
  const pos = (el, wide, narrow) =>
    compact.matches && el.style.getPropertyValue(narrow) ? pct(el, narrow) : pct(el, wide);

  /* ---- homes come from the authored --x/--y, not from the live
     rect, so a body can drift without dragging its rest position
     along with it ---- */
  function measure() {
    const base = scene.getBoundingClientRect();
    if (!base.width) return false;
    bodies.forEach((b) => {
      const r = b.el.getBoundingClientRect();
      // a label the breakpoint has hidden measures zero, and leaves
      // the field along with its line
      b.off = !r.width;
      b.hw = r.width / 2;
      b.hh = r.height / 2;
      b.hx = pos(b.el, "--x", "--cx") * base.width;
      b.hy = pos(b.el, "--y", "--cy") * base.height;
      b.maxOffset = b.maxScale * base.width;
      b.x = b.hx;
      b.y = b.hy;
      b.vx = 0;
      b.vy = 0;
    });
    active = bodies.filter((b) => !b.off);
    return true;
  }

  // stop a line at the edge of the label's own box rather than a fixed
  // distance from its centre — the hub is far bigger than a satellite
  function clip(b, ux, uy) {
    const tx = Math.abs(ux) > 1e-4 ? (b.hw + b.padX) / Math.abs(ux) : Infinity;
    const ty = Math.abs(uy) > 1e-4 ? (b.hh + b.padY) / Math.abs(uy) : Infinity;
    const t = Math.min(tx, ty);
    return { x: b.x + ux * t, y: b.y + uy * t };
  }

  /* ---- both ends are clipped to their own label, so a line meets the
     hub wherever its label happens to be looking from. The endpoints
     slide around the word as the field drifts instead of being pinned
     to a pair of fixed points ---- */
  function endpoints(link) {
    const a = link.from;
    const b = link.to;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    const p = clip(a, ux, uy);
    const q = clip(b, -ux, -uy);
    return { ax: p.x, ay: p.y, bx: q.x, by: q.y };
  }

  function build() {
    if (!measure()) return;
    group.textContent = "";
    links.length = 0;

    // the hub arrives first, then its topics, then the satellites —
    // and every line is drawn to the hub, never between labels
    const hub = byId.get("hub");
    if (!hub) return;
    let i = 0;
    active.forEach((b) => {
      if (b.fixed) {
        b.el.style.setProperty("--delay", "0s");
        return;
      }

      const isNode = b.el.classList.contains("cn-node");
      const delay = isNode ? 0.18 + i * 0.09 : 0.46 + i * 0.045;
      i++;

      const path = document.createElementNS(NS, "path");
      path.setAttribute("data-rank", isNode ? "node" : "sat");
      path.style.setProperty("--delay", `${(delay - 0.06).toFixed(3)}s`);
      group.appendChild(path);
      b.el.style.setProperty("--delay", `${delay.toFixed(3)}s`);

      const link = { path, from: b, to: hub, family: b.family };
      links.push(link);

      const e = endpoints(link);
      // the draw-on needs a dash the length of the line it reveals
      path.style.setProperty("--len", Math.hypot(e.bx - e.ax, e.by - e.ay).toFixed(1));
    });

    drawBodies();
    drawLines();
  }

  function drawBodies() {
    active.forEach((b) => {
      if (b.fixed) return;
      b.el.style.setProperty("--dx", `${(b.x - b.hx).toFixed(2)}px`);
      b.el.style.setProperty("--dy", `${(b.y - b.hy).toFixed(2)}px`);
    });
  }

  function drawLines() {
    links.forEach((link) => {
      const { ax, ay, bx, by } = endpoints(link);
      link.path.setAttribute(
        "d",
        `M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}`
      );
    });
  }

  build();

  // set by the live section below; a no-op when motion isn't wanted
  let goLive = () => {};

  if (REDUCED) {
    scene.classList.add("in");
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          build();
          scene.classList.add("in");
          goLive();
          obs.unobserve(e.target);
        });
      },
      { threshold: 0.3 }
    );
    io.observe(scene);
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 140);
  }, { passive: true });

  // the labels move once the real fonts land
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

  /* ---- the live field. The float runs wherever motion is welcome;
     the hover half simply never fires without a cursor ---- */
  if (REDUCED) return;

  let px = -1e5;
  let py = -1e5;
  let hovered = null;
  let family = "";

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    px = e.clientX;
    py = e.clientY;
    run(); // the field sleeps when it is settled; the cursor wakes it
  }, { passive: true });

  document.addEventListener("pointerleave", () => {
    px = -1e5;
    py = -1e5;
    run();
  }, { passive: true });

  const inside = (b, cx, cy) =>
    Math.abs(cx - b.x) <= b.hw + HOVER_PAD_X && Math.abs(cy - b.y) <= b.hh + HOVER_PAD_Y;

  /* ---- who is under the cursor. A label already held keeps the
     hover until the cursor actually leaves it, so a family arriving
     around the cursor can't steal it mid-pull ---- */
  function pick(cx, cy) {
    if (hovered && inside(hovered, cx, cy)) return hovered;
    let best = null;
    let bestD = Infinity;
    active.forEach((b) => {
      if (!inside(b, cx, cy)) return;
      const d = Math.hypot(cx - b.x, cy - b.y);
      if (d < bestD) { bestD = d; best = b; }
    });
    return best;
  }

  // the hub lights the whole diagram; anything else lights its family
  function paint() {
    const all = family === "*";
    active.forEach((b) => {
      if (b.fixed) return;
      const on = all || b.family === family;
      b.el.classList.toggle("on", !!family && on);
      b.el.classList.toggle("dim", !!family && !on);
    });
    links.forEach((l) => {
      const on = all || l.family === family;
      l.path.classList.toggle("on", !!family && on);
      l.path.classList.toggle("dim", !!family && !on);
    });
  }

  // well past anything the drift can reach, so this only ever means
  // "on its way somewhere" — falling in, or on its way back
  const travelling = (b) => Math.hypot(b.x - b.hx, b.y - b.hy) > 60;

  /* ---- what a body does with the speed a collision just took from
     it. Anything at rest simply stops. A body that is falling turns
     it sideways instead and slides along whatever is in the way,
     towards what it is falling to — otherwise the far half of a
     family queues up behind the hub and never arrives ---- */
  function block(b, axis) {
    const falling = hovered && family && family !== "*" && b.family === family && b !== hovered;
    if (!falling) {
      if (axis === "x") b.vx = 0;
      else b.vy = 0;
      return;
    }
    if (axis === "x") {
      const carried = Math.abs(b.vx) * SLIDE;
      b.vx = 0;
      b.vy += (hovered.y < b.y ? -1 : 1) * carried;
    } else {
      const carried = Math.abs(b.vy) * SLIDE;
      b.vy = 0;
      b.vx += (hovered.x < b.x ? -1 : 1) * carried;
    }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > FALL_SPEED_MAX) {
      const k = FALL_SPEED_MAX / sp;
      b.vx *= k;
      b.vy *= k;
    }
  }

  function step(dt, t) {
    const base = scene.getBoundingClientRect();
    const cx = px - base.left;
    const cy = py - base.top;

    hovered = pick(cx, cy);
    const want = !hovered ? "" : hovered.fixed ? "*" : hovered.family;
    if (want !== family) {
      family = want;
      paint();
    }

    // adrift around home — and when a family is called, falling
    // toward the label under the cursor
    const pulling = hovered && family && family !== "*";
    active.forEach((b) => {
      if (b.fixed) return;
      const p = b.phase;
      const tx = b.hx + b.driftX * (0.62 * Math.sin(b.w1 * t + p) + 0.38 * Math.sin(b.w2 * t + p * 1.7));
      const ty = b.hy + b.driftY * (0.62 * Math.cos(b.w2 * t + p * 1.3) + 0.38 * Math.sin(b.w1 * 1.4 * t + p));

      const falls = pulling && hovered !== b && b.family === family;

      const k = falls ? SPRING * FALL_HOME : SPRING;
      const damp = falls ? FALL_DAMP : DAMP;
      b.fx = k * (tx - b.x) - damp * b.vx;
      b.fy = k * (ty - b.y) - damp * b.vy;

      if (!falls) return;
      const gx = hovered.x - b.x;
      const gy = hovered.y - b.y;
      const d = Math.hypot(gx, gy) || 1;
      const a = Math.min(GRAV / (d + GRAV_SOFT), GRAV_MAX) / b.mass;
      b.fx += (gx / d) * a;
      b.fy += (gy / d) * a;
    });

    // and hold each other off, on an ellipse sized to the two label
    // boxes — wide mono type needs far more room across than down.
    // The hub takes part but never yields.
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i];
        const b = active[j];
        if (a.fixed && b.fixed) continue;
        const rx = a.hw + b.hw + SEP_PAD_X;
        const ry = a.hh + b.hh + SEP_PAD_Y;
        const nx = (b.x - a.x) / rx;
        const ny = (b.y - a.y) / ry;
        const d = Math.hypot(nx, ny);
        if (d >= 1) continue;

        // push along the gradient of that ellipse, not the raw gap
        let ux = nx / rx;
        let uy = ny / ry;
        const ul = Math.hypot(ux, uy);
        if (ul < 1e-6) { ux = 0; uy = 1; } else { ux /= ul; uy /= ul; }

        const push = SEP_PUSH * (1 - d);
        if (!a.fixed) { a.fx -= (ux * push) / a.mass; a.fy -= (uy * push) / a.mass; }
        if (!b.fixed) { b.fx += (ux * push) / b.mass; b.fy += (uy * push) / b.mass; }
      }
    }

    active.forEach((b) => {
      if (b.fixed) return;
      b.vx += b.fx * dt;
      b.vy += b.fy * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // never let a label wander far enough to break the composition
      const ox = b.x - b.hx;
      const oy = b.y - b.hy;
      const off = Math.hypot(ox, oy);
      if (off > b.maxOffset) {
        const s = b.maxOffset / off;
        b.x = b.hx + ox * s;
        b.y = b.hy + oy * s;
        b.vx *= 0.5;
        b.vy *= 0.5;
      }

      // and the field is a box: nothing crosses into the type above or
      // below it, however hard it was falling
      const lx = b.hw + 2;
      const ly = b.hh + 2;
      if (b.x < lx) { b.x = lx; if (b.vx < 0) b.vx = 0; }
      else if (b.x > base.width - lx) { b.x = base.width - lx; if (b.vx > 0) b.vx = 0; }
      if (b.y < ly) { b.y = ly; if (b.vy < 0) b.vy = 0; }
      else if (b.y > base.height - ly) { b.y = base.height - ly; if (b.vy > 0) b.vy = 0; }
    });

    // Forces alone lose to a hard pull — a label gathering across the
    // page will sit inside the hub if nothing stops it. So the last
    // word is positional, and it is the box that has to clear, not the
    // ellipse: two boxes touching on the ellipse still overlap at the
    // diagonals. Push out along whichever axis is cheaper, kill the
    // velocity that drove them together, and let the hub give nothing.
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const a = active[i];
          const b = active[j];
          if (a.fixed && b.fixed) continue;

          // A label crossing the field passes over the ones standing
          // still — they are dimmed and it is there for a moment. What
          // it must never pass is the hub, or another label travelling
          // with it, which is what makes the pile a pile.
          if (!a.fixed && !b.fixed && travelling(a) !== travelling(b)) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const gapX = a.hw + b.hw + SEP_PAD_X - Math.abs(dx);
          const gapY = a.hh + b.hh + SEP_PAD_Y - Math.abs(dy);
          if (gapX <= 0 || gapY <= 0) continue;

          const wa = a.fixed ? 0 : b.fixed ? 1 : 0.5;
          const wb = b.fixed ? 0 : a.fixed ? 1 : 0.5;

          if (gapX < gapY) {
            const s = (dx < 0 ? -1 : 1) * gapX;
            a.x -= s * wa;
            b.x += s * wb;
            if (!a.fixed) block(a, "x");
            if (!b.fixed) block(b, "x");
          } else {
            const s = (dy < 0 ? -1 : 1) * gapY;
            a.y -= s * wa;
            b.y += s * wb;
            if (!a.fixed) block(a, "y");
            if (!b.fixed) block(b, "y");
          }
        }
      }
    }
  }

  let raf = 0;
  let last = 0;
  let onScreen = false;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = last ? Math.min(0.032, (now - last) / 1000) : 0.016;
    last = now;
    step(dt, now / 1000);
    drawBodies();
    drawLines();
  }

  function run() {
    if (raf || !onScreen || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function halt() {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
    // don't leave a family lit while nothing is running
    if (family) {
      family = "";
      hovered = null;
      paint();
    }
  }

  // hand the lines over from the draw-on only once it has finished,
  // and only after the section has actually been revealed
  let handed = false;
  goLive = () => {
    if (handed) return;
    handed = true;
    setTimeout(() => {
      scene.classList.add("live");
      new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          onScreen = e.isIntersecting;
          onScreen ? run() : halt();
        }),
        { threshold: 0 }
      ).observe(scene);
      document.addEventListener("visibilitychange", () => (document.hidden ? halt() : run()));
    }, 2100);
  };
})();

