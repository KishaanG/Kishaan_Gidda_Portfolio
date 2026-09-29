"use strict";

/* ============================================================
   Kishaan Gidda — About: the line goes on
   ------------------------------------------------------------
   The experience flight lets its thread drop out of the bottom
   of its frame (xp3d.js) at the x About marks with
   [data-thread-in]. This picks the thread up at that point and
   keeps drawing it down the section, pen tip on the same
   reading line the drop was drawn to, so the two read as one
   stroke. Scroll draws; nothing here moves on its own.

   The river: the line swings down the page in long bends, each
   fact in the crook of one, then fans onto the grid's five rules
   and runs on through the toolkit. On one column it simply runs
   down the left edge, a station per block.

   This file loads before silk.js on purpose: the section's field
   is told where its type sits (data-read) before it mounts.
   ============================================================ */

(() => {
  const sec = document.getElementById("about");
  if (!sec) return;

  /* The reading light. The field is one viewport stuck behind the
     whole section, so type crosses every height of it; the plateau
     covers the full frame, which only lifts the crease (silk.js) —
     the folds keep their edges everywhere. */
  const canvas = sec.querySelector(".about-silk canvas");
  if (canvas) canvas.dataset.read = "0.50 0.50 0.86 0.92";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wide = window.matchMedia("(min-width: 901px)");
  const NS = "http://www.w3.org/2000/svg";

  const svg = sec.querySelector(".about-line");
  const mark = sec.querySelector("[data-thread-in]");
  const field = sec.querySelector(".about-field");
  const inner = sec.querySelector(".about-inner");
  if (!svg || !mark || !inner) return;

  /* the same reading line the flight's drop is drawn to */
  const READ = parseFloat(mark.dataset.threadIn) || 0.7;
  /* type rises in a little ahead of the pen, so it is settling as
     the line arrives rather than appearing after it has passed */
  const LEAD = 90;

  /* ---- geometry, in section coordinates ----
     Layout boxes, not rendered ones: a station waiting for the pen
     is still translated down for its arrival, and the line has to
     be drawn where the type will settle, not where it is waiting. */
  function box(el) {
    let l = 0;
    let t = 0;
    for (let e = el; e && e !== sec; e = e.offsetParent) {
      l += e.offsetLeft;
      t += e.offsetTop;
    }
    return { l, t, r: l + el.offsetWidth, b: t + el.offsetHeight };
  }
  /* the grid's five rules, on the half pixel so a 1px stroke lands
     on the same column of pixels the fixed grid draws */
  function rules() {
    const b = box(inner);
    return [0, 1, 2, 3, 4].map((k) => Math.round(b.l + ((b.r - b.l) * k) / 4) + 0.5);
  }
  const midY = (el) => { const b = box(el); return (b.t + b.b) / 2; };
  const anchorOf = (st) => st.querySelector("[data-anchor]") || st;

  /* where the flight's drop lands, and so where every line starts:
     the same rounding xp3d.js applies to the same element, taken in
     the section's own coordinates like every other path point */
  const entryX = () =>
    Math.round(mark.getBoundingClientRect().left - sec.getBoundingClientRect().left) + 0.5;

  /* ================================================================
     THE PATHS — each returns { paths: [d], nodes: [{x, y}] }
     plus which station element each node belongs to
     ================================================================ */

  function river(stations, H) {
    const R = rules();
    const start = [entryX(), 0];
    const bends = [];
    let kit = null;
    const nodes = [];
    stations.forEach((st) => {
      if (st.hasAttribute("data-kit")) { kit = st; return; }
      if (!st.classList.contains("rv-st")) {
        // the heading sits on the first bend as it leaves the entry
        nodes.push({ st, x: start[0], y: midY(anchorOf(st)), snap: true });
        return;
      }
      const right = st.classList.contains("rv-st--r");
      // the bend's apex stands a column clear of the text it holds,
      // level with the middle of the text itself (not the padding
      // above it that spaces the bends out)
      const top = box(st.querySelector("dt") || st).t;
      const bottom = box(st.querySelector("dd") || st).b;
      const apex = [right ? R[1] : R[3], (top + bottom) / 2];
      bends.push(apex);
      nodes.push({ st, x: apex[0], y: apex[1] });
    });

    /* vertical tangents at every apex, so each is the far point of a
       bend and the crossing between two falls in the gap between
       their facts */
    const through = [start, ...bends];
    let d = `M ${start[0]} ${start[1]}`;
    const seg = (a, b) => {
      const k = (b[1] - a[1]) * 0.55;
      return ` C ${a[0]} ${a[1] + k} ${b[0]} ${b[1] - k} ${b[0]} ${b[1]}`;
    };
    for (let i = 1; i < through.length; i++) d += seg(through[i - 1], through[i]);

    const paths = [];
    if (kit) {
      /* the delta: the thread comes to the middle rule above the
         toolkit and fans out onto all five, running on as the warp
         the groups hang between */
      const top = box(kit).t - 8;
      const split = [R[2], top - 150];
      d += seg(through[through.length - 1], split);
      nodes.push({ st: kit, x: split[0], y: split[1] });
      paths.push(d);
      R.forEach((x) => {
        const k = (top - split[1]) * 0.6;
        paths.push(
          `M ${split[0]} ${split[1]} C ${split[0]} ${split[1] + k} ${x} ${top - k} ${x} ${top} L ${x} ${H}`
        );
      });
    } else {
      d += ` L ${through[through.length - 1][0]} ${H}`;
      paths.push(d);
    }
    return { paths, nodes };
  }

  /* one column: the line down the left edge, a station per block */
  function narrow(stations, H) {
    const x = Math.round(box(inner).l) + 0.5;
    return {
      paths: [`M ${x} 0 L ${x} ${H}`],
      nodes: stations.map((st) => ({ st, x, y: box(anchorOf(st)).t + 14 })),
    };
  }

  /* ================================================================
     THE PEN
     ================================================================ */
  let lines = [];    // { el, total, lens[], ys[], drawn, target }
  let nodes = [];    // { el, st, line, at, on }
  let stations = [];
  let tip = null;
  let built = false;

  function allStations() {
    return [
      sec.querySelector(".about-head"),
      ...sec.querySelectorAll(".rv-st"),
      sec.querySelector(".about-kit"),
    ].filter(Boolean);
  }

  function sample(el) {
    const total = el.getTotalLength();
    const lens = [];
    const ys = [];
    let top = -Infinity;
    const step = 4;
    for (let s = 0; s <= total + step; s += step) {
      const at = Math.min(s, total);
      const p = el.getPointAtLength(at);
      // never let the path read as climbing, even by a rounding error
      top = Math.max(top, p.y);
      lens.push(at);
      ys.push(top);
      if (at === total) break;
    }
    return { total, lens, ys };
  }

  /* how far along a line the pen is when its tip is at height y */
  function lengthAt(line, y) {
    const { ys, lens } = line;
    if (y < ys[0]) return 0;
    let lo = 0;
    let hi = ys.length - 1;
    if (y >= ys[hi]) return line.total;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (ys[m] <= y) lo = m;
      else hi = m;
    }
    return lens[lo];
  }

  function nearest(line, x, y) {
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < line.lens.length; i++) {
      const p = line.el.getPointAtLength(line.lens[i]);
      const dd = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (dd < bd) { bd = dd; best = line.lens[i]; }
    }
    return best;
  }

  function build() {
    const H = sec.offsetHeight;
    const vh = window.innerHeight;
    svg.setAttribute("viewBox", `0 0 ${sec.offsetWidth} ${H}`);
    svg.textContent = "";

    /* The field's ramps, in px. On wide screens chrome.js reads the
       same two numbers the mask is built from, so the bars drop their
       scrim exactly where the light is solid. On phones copy scrolls
       under the bars the whole way down, so — as on the stacked work
       stage — the scrim stays: the range is declared empty. */
    if (field) {
      const from = `${Math.round(vh * 0.5)}px`;
      const to = `${Math.round(H - vh * 0.38)}px`;
      field.style.setProperty("--ramp-top", from);
      field.style.setProperty("--ramp-bottom", to);
      field.style.setProperty("--field-from", wide.matches ? from : "100%");
      field.style.setProperty("--field-to", wide.matches ? to : "0px");
    }

    stations = allStations();
    stations.forEach((st) => { st.aboutTop = box(anchorOf(st)).t; });
    const plan = (wide.matches ? river : narrow)(stations, H);

    const prev = lines;
    lines = plan.paths.map((d, i) => {
      const el = document.createElementNS(NS, "path");
      el.setAttribute("d", d);
      svg.append(el);
      const line = { el, ...sample(el) };
      line.drawn = prev[i] ? Math.min(prev[i].drawn, line.total) : 0;
      line.target = line.drawn;
      el.style.strokeDasharray = `${line.total} ${line.total + 2}`;
      return line;
    });

    nodes = plan.nodes.map((n) => {
      if (n.snap) {
        const at = lengthAt(lines[0], n.y);
        n.x = lines[0].el.getPointAtLength(at).x;
      }
      const el = document.createElementNS(NS, "circle");
      el.setAttribute("class", "node");
      el.setAttribute("cx", n.x);
      el.setAttribute("cy", n.y);
      el.setAttribute("r", "3");
      svg.append(el);
      // every station sits on the first line; how far along it
      const line = lines[0];
      return { el, st: n.st, y: n.y, line, at: nearest(line, n.x, n.y), on: false };
    });

    tip = document.createElementNS(NS, "circle");
    tip.setAttribute("class", "tip");
    tip.setAttribute("r", "2.6");
    svg.append(tip);
    built = true;
  }

  /* ---- a frame ---- */
  const LAG = 0.2;
  let last = 0;
  let raf = 0;

  function penY() {
    return READ * window.innerHeight - sec.getBoundingClientRect().top;
  }

  function paint(now) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    const y = penY();
    let moving = false;
    let lead = null;

    lines.forEach((line) => {
      line.target = REDUCED ? line.total : lengthAt(line, y);
      if (REDUCED) line.drawn = line.total;
      else {
        line.drawn += (line.target - line.drawn) * (1 - Math.exp(-dt / LAG));
        if (Math.abs(line.target - line.drawn) < 0.5) line.drawn = line.target;
        else moving = true;
      }
      line.el.style.strokeDashoffset = String(line.total - line.drawn);
      // the pen is the stroke still being laid, the lowest of them
      if (line.drawn > 0.5 && line.drawn < line.total - 0.5) {
        const p = line.el.getPointAtLength(line.drawn);
        if (!lead || p.y > lead.y) lead = p;
      }
    });

    if (tip) {
      tip.style.opacity = lead ? "1" : "0";
      if (lead) {
        tip.setAttribute("cx", lead.x.toFixed(1));
        tip.setAttribute("cy", lead.y.toFixed(1));
      }
    }

    nodes.forEach((n) => {
      const on = n.line.drawn >= n.at - 1;
      if (on !== n.on) {
        n.on = on;
        n.el.classList.toggle("on", on);
      }
    });

    // arrival latches: a reveal never replays (DESIGN.md §6)
    stations.forEach((st) => {
      if (st.classList.contains("is-reached")) return;
      if (REDUCED || y >= st.aboutTop - LEAD) st.classList.add("is-reached");
    });
    return moving;
  }

  function frame(now) {
    raf = 0;
    if (paint(now)) raf = requestAnimationFrame(frame);
  }
  const schedule = () => {
    if (!raf && built) raf = requestAnimationFrame(frame);
  };

  function rebuild() {
    build();
    last = performance.now();
    paint(last);
    schedule();
  }

  /* ================================================================
     MOUNT — deferred scripts run while the document is still
     "interactive", so this mounts before the flight below it in the
     script order has laid itself out. Every path point but the
     entry is section-relative, and the ResizeObserver and
     fonts.ready rebuild once the page's height is final.
     ================================================================ */
  function mount() {
    if (!REDUCED) sec.classList.add("is-live");
    rebuild();

    window.addEventListener("scroll", schedule, { passive: true });
    let t = 0;
    window.addEventListener("resize", () => {
      clearTimeout(t);
      t = setTimeout(rebuild, 120);
    }, { passive: true });
    wide.addEventListener("change", rebuild);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
    // anything that changes the section's height moves the line
    if ("ResizeObserver" in window) {
      let h = sec.offsetHeight;
      new ResizeObserver(() => {
        if (sec.offsetHeight === h) return;
        h = sec.offsetHeight;
        clearTimeout(t);
        t = setTimeout(rebuild, 60);
      }).observe(sec);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();
