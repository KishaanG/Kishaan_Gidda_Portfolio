"use strict";

/* ============================================================
   Kishaan Gidda — project demos
   ------------------------------------------------------------
   Each project in the work viewer can open out of its slot to
   nearly the whole viewport and play a few seconds of the thing
   itself. This file owns the demo: its plate, its clock, and
   the chrome around it. work.js owns the zoom — where the plate
   sits and how open it is — and calls in here.

   The demos are rebuilt from each project's own interface: its
   type, its colours, its copy, and real output from a real run.
   Nothing on a plate is invented; where the product's own data
   would have to be made up (a live Places result, a rival
   team's name) the demo leaves it out rather than fill it in.

   Every demo is a timeline of pure tweens — render(t) can draw
   any instant directly. That is what lets the page's scroll
   push a demo forward, lets reduced motion be handed the last
   frame, and makes replay a matter of drawing t = 0 again.
   ============================================================ */

(() => {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const EASE = {
    linear: (t) => t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    expo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  };

  /* ---- timeline --------------------------------------------------
     A list of tweens. Each is called on every render with its own
     eased progress, its raw progress, and the absolute time, and
     must write the same properties whatever the input — so a frame
     never depends on the frame before it. One tween per property:
     two tweens writing the same property would fight. */
  function timeline() {
    const tracks = [];
    const api = {
      at(t0, dur, fn, ease = EASE.out) {
        tracks.push({ t0, dur, fn, ease });
        return api;
      },
      /* a free function of absolute time, for anything that is not
         a single ramp (a cursor path, a counter, a scroll) */
      each(fn) {
        tracks.push({ t0: 0, dur: 0, fn: (e, p, t) => fn(t), ease: EASE.linear });
        return api;
      },
      render(t) {
        for (const k of tracks) {
          const p = k.dur > 0 ? clamp((t - k.t0) / k.dur) : t >= k.t0 ? 1 : 0;
          k.fn(k.ease(p), p, t);
        }
      },
    };
    return api;
  }

  /* ---- a demo cursor ---------------------------------------------
     Keyframes of { t, x, y } in screen pixels, plus click times.
     Travel between keyframes eases in and out, as a hand does. */
  function cursor(root, keys, clicks, fade) {
    const el = document.createElement("div");
    el.className = "demo-cursor";
    el.innerHTML =
      '<svg viewBox="0 0 16 22" width="16" height="22"><path d="M1.5 1.5v16.2l4.1-3.9 2.7 6.3 2.6-1.1-2.7-6.2h5.6z" fill="#15151e" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg>' +
      '<i class="demo-cursor__ring"></i>';
    root.appendChild(el);
    const ring = el.querySelector(".demo-cursor__ring");

    return (t) => {
      const ks = typeof keys === "function" ? keys() : keys;
      let x = ks[0].x;
      let y = ks[0].y;
      for (let i = 1; i < ks.length; i++) {
        const a = ks[i - 1];
        const b = ks[i];
        if (t <= a.t) break;
        const p = EASE.inOut(clamp((t - a.t) / (b.t - a.t)));
        x = lerp(a.x, b.x, p);
        y = lerp(a.y, b.y, p);
      }
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.opacity = String(
        clamp((t - fade[0]) / 0.25) * (1 - clamp((t - fade[1]) / 0.3))
      );
      // the click: a hairline ring that opens and goes
      let r = 0;
      for (const c of clicks) {
        const p = (t - c) / 0.42;
        if (p >= 0 && p <= 1) r = p;
      }
      ring.style.opacity = r > 0 ? String(1 - r) : "0";
      ring.style.transform = `translate(-50%, -50%) scale(${0.3 + r * 1.2})`;
    };
  }

  /* a button's press: in 90ms, out over the next 220 */
  function press(t, at) {
    const p = t - at;
    if (p < 0 || p > 0.31) return 1;
    return p < 0.09 ? 1 - 0.045 * (p / 0.09) : 0.955 + 0.045 * ((p - 0.09) / 0.22);
  }

  /* position of el's centre inside root, ignoring transforms — the
     cursor aims at where a control rests, not where it is mid-slide */
  function centreIn(el, root) {
    let x = el.offsetWidth / 2;
    let y = el.offsetHeight / 2;
    let n = el;
    while (n && n !== root) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent;
    }
    return { x, y };
  }

  const NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  const kit = { clamp, lerp, EASE, timeline, cursor, press, centreIn, svg };

  /* ============================================================
     The player: one per slide that declares data-demo
     ============================================================ */

  const builders = Object.create(null);

  function define(name, build) {
    builders[name] = build;
  }

  const clock = (t) => "0:" + String(Math.floor(t)).padStart(2, "0");

  function mount(slide) {
    const build = builders[slide.dataset.demo];
    if (!build) return null;

    const layer = document.createElement("div");
    layer.className = "zoom";
    layer.innerHTML = `
      <div class="zoom-head">
        <p class="zoom-cap"></p>
        <p class="zoom-src"></p>
      </div>
      <div class="zoom-frame"><div class="zoom-fit"><div class="zoom-screen" aria-hidden="true"></div></div></div>
      <div class="zoom-foot">
        <p class="zoom-chapter"></p>
        <div class="zoom-track" aria-hidden="true"><i class="zoom-fill"></i></div>
        <p class="zoom-time" aria-hidden="true">0:00</p>
        <button class="br zoom-btn" type="button">[ Pause ]</button>
      </div>`;

    const $ = (sel) => layer.querySelector(sel);
    const frame = $(".zoom-frame");
    const fitBox = $(".zoom-fit");
    const screen = $(".zoom-screen");
    const fill = $(".zoom-fill");
    const track = $(".zoom-track");
    const timeEl = $(".zoom-time");
    const chapterEl = $(".zoom-chapter");
    const btn = $(".zoom-btn");

    // on the page before the build, so the build can measure itself
    slide.appendChild(layer);
    const demo = build(screen, kit);
    const T = demo.duration;

    layer.dataset.demo = slide.dataset.demo;
    if (demo.bare) layer.classList.add("is-bare");
    $(".zoom-cap").innerHTML = demo.caption;
    $(".zoom-src").innerHTML = demo.source;
    screen.style.width = demo.width + "px";
    screen.style.height = demo.height + "px";
    // the build measured itself before the screen had its size
    if (demo.measure) demo.measure();
    demo.chapters.forEach((c) => {
      if (c.t <= 0) return;
      const tick = document.createElement("b");
      tick.style.left = ((c.t / T) * 100).toFixed(2) + "%";
      track.appendChild(tick);
    });

    let t = 0;
    let floor = 0;
    let playing = false;
    let held = false;   // the visitor paused it; only they restart it
    let raf = 0;
    let last = 0;
    let chapter = -1;
    let drawn = -1;

    /* Scroll's claim on the clock is measured from where the clock
       last started under the visitor's own hand. A replay or a resume
       counts scroll from the position it was pressed at, so the next
       wheel tick cannot fling it on to wherever scroll alone would
       put it. Closing the plate puts both back to zero. */
    let scrollSeen = 0;
    let from = { p: 0, t: 0 };

    function draw() {
      if (t === drawn) return;
      drawn = t;
      demo.render(t);
      fill.style.transform = `scaleX(${(t / T).toFixed(4)})`;
      timeEl.textContent = clock(t);
      let c = 0;
      demo.chapters.forEach((ch, i) => { if (t >= ch.t) c = i; });
      if (c !== chapter) {
        chapter = c;
        chapterEl.textContent = demo.chapters[c].label;
      }
      label();
    }

    function label() {
      const ended = t >= T;
      layer.classList.toggle("is-ended", ended);
      btn.textContent = ended ? "[ Replay ]" : playing ? "[ Pause ]" : "[ Play ]";
    }

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      playing = false;
    }

    function tick(now) {
      // a background tab hands back one huge frame; never skip on it
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t = Math.min(T, Math.max(t + dt, floor));
      draw();
      if (t < T) raf = requestAnimationFrame(tick);
      else { stop(); label(); }
    }

    const api = {
      layer,
      slide,
      figure: slide.querySelector(".slide-figure"),
      design: { w: demo.width, h: demo.height },

      /* size the plate, then fit the demo inside its frame */
      fit(w, h) {
        layer.style.width = w + "px";
        layer.style.height = h + "px";
        const fw = frame.clientWidth;
        const fh = frame.clientHeight;
        if (!fw || !fh) return;
        const s = Math.min(fw / demo.width, fh / demo.height);
        fitBox.style.width = demo.width * s + "px";
        fitBox.style.height = demo.height * s + "px";
        screen.style.transform = `scale(${s})`;
      },

      /* the plate height a given width needs, for inline plates */
      heightFor(w) {
        const cs = getComputedStyle(layer);
        const px = parseFloat(cs.getPropertyValue("--pad-x")) || 0;
        const head = parseFloat(cs.getPropertyValue("--pad-head")) || 0;
        const foot = parseFloat(cs.getPropertyValue("--pad-foot")) || 0;
        return Math.round(head + foot + (w - px * 2) * (demo.height / demo.width));
      },

      play() {
        if (playing || held || t >= T) return;
        playing = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
        label();
      },

      /* scroll's claim on the clock: the demo may never be further
         behind than this fraction of its length. It only pushes —
         stop scrolling and the demo carries on at its own pace;
         scroll fast and it keeps up, so the plate never closes on
         a half-finished frame. */
      pushTo(p) {
        scrollSeen = clamp(p);
        if (held) return;
        const k = from.p >= 1 ? 0 : clamp((scrollSeen - from.p) / (1 - from.p));
        floor = from.t + k * (T - from.t);
        if (!playing && floor > t) {
          t = floor;
          draw();
        }
      },

      reset() {
        if (t === 0 && !playing && !held && drawn === 0 && from.p === 0) return;
        stop();
        held = false;
        t = 0;
        floor = 0;
        from = { p: 0, t: 0 };
        draw();
      },

      finish() {
        stop();
        held = false;
        t = T;
        draw();
      },

      get ended() { return t >= T; },
    };

    btn.addEventListener("click", () => {
      if (playing) {
        stop();
        held = true;
        floor = t;
        label();
        return;
      }
      if (t >= T) t = 0;   // replay from the top
      held = false;
      from = { p: scrollSeen, t };
      floor = t;
      api.play();
    });

    draw();
    // the fonts move text, and a few demos aim at controls by where
    // they sit — give them a chance to re-measure once type settles
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (demo.measure) demo.measure();
        drawn = -1;
        draw();
      });
    }
    return api;
  }

  window.Demos = { define, mount, kit, REDUCED };
})();
