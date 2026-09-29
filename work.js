"use strict";

/* ============================================================
   Kishaan Gidda — the work viewer: a scroll-pinned slideshow

   Desktop: the section is a runway and .work-pin sticks inside
   it, so scrolling advances the viewer rather than scrolling
   past it. Partway through each project's stretch of runway its
   plate opens out of the viewer to nearly the whole viewport and
   a few seconds of the project plays (demos.js); the plate
   settles back into its slot before the viewer dissolves to the
   next project. Phones get the same markup as a plain stack,
   with each demo playing inline in its figure.
   ============================================================ */
(() => {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const work = document.querySelector(".work[data-slideshow]");
  if (!work) return;

  const pin = work.querySelector(".work-pin");
  const stage = work.querySelector(".work-stage");
  const links = Array.from(work.querySelectorAll(".work-index a[data-index]"));
  const slides = Array.from(work.querySelectorAll(".slide[data-slide]"));
  const counter = work.querySelector("[data-count-now]");
  if (!pin || !stage || !slides.length) return;

  const pinned = window.matchMedia("(min-width: 901px)");
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  let current = -1;
  let detach = null;
  let refresh = null;   // pinned mode's re-measure, while it is mounted

  const players = slides.map((s) => (window.Demos ? window.Demos.mount(s) : null));
  const hasDemos = players.some(Boolean);
  // the plate opening out is large, scroll-driven motion: reduced
  // motion keeps each demo in its slot instead, on its last frame
  const ZOOM = hasDemos && !REDUCED;
  if (ZOOM) work.classList.add("has-zoom");

  /* the drawn visuals hold their animation until their slide is
     actually showing — otherwise all three would play at once
     behind the fade and every one after the first would already
     be finished by the time you reached it */
  function play(slide) {
    slide.querySelectorAll("canvas[data-visual]").forEach((c) =>
      c.dispatchEvent(new Event("visual:play"))
    );
  }

  function activate(i) {
    if (i === current) return;
    current = i;
    slides.forEach((s, n) => s.classList.toggle("is-active", n === i));
    links.forEach((a, n) => {
      a.classList.toggle("on", n === i);
      if (n === i) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    if (counter) counter.textContent = String(i + 1).padStart(2, "0");
    play(slides[i]);
  }

  /* ---- the scroll-linked dissolve -------------------------------
     HOLD is how much of a segment a slide owns outright; the fade
     spans the rest. They are set so that at a handover both slides
     sit at half opacity and sum to a full frame — no flash of the
     ground between projects. DRIFT separates them while they
     overlap: the one leaving rises, the one arriving comes up to
     meet it, so it reads as a pass rather than a blur.

     With the zoom, each segment is longer and most of it belongs
     to the open plate, so the dissolve takes a smaller share of it
     — about the same distance of scroll as before.
     --------------------------------------------------------------- */
  const HOLD = ZOOM ? 0.4 : 0.34;
  const FADE = ZOOM ? 0.2 : 0.32;   // HOLD + FADE/2 === 0.5 keeps the sum at 1
  const DRIFT = 26;    // px

  /* ---- the zoom, in a slide's own 0 → 1 of runway ---------------
     The plate opens across OPEN and settles back across CLOSE.
     Between them it is open and the demo runs; either side is the
     viewer exactly as it was — the plate at rest in its slot, and
     the dissolve to the next project. */
  const OPEN = [0.13, 0.31];
  const CLOSE = [0.69, 0.87];
  // how open a plate is when what it covers has faded to nothing
  const COVERED = 0.4;

  const smoothstep = (t) => t * t * (3 - 2 * t);
  const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---- where the plate goes -------------------------------------
     Everything is in a slide's own coordinates, so the numbers hold
     while the pin sticks. The open plate is sized to the viewport
     between the two chrome bars and laid out at that size once; at
     rest it is the same plate scaled down to sit inside the slot.
     So an open plate is drawn at scale 1 — its type is sharp where
     it is read — and the zoom is only ever a transform. */
  const geo = [];

  function measure() {
    if (!ZOOM || !pinned.matches) return;
    const rootStyle = getComputedStyle(document.documentElement);
    const bar = parseFloat(rootStyle.getPropertyValue("--bar")) || 74;
    const barTop = parseFloat(rootStyle.getPropertyValue("--bar-top")) || bar;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const inset = Math.round(clamp(vw * 0.02, 16, 32));
    const T = {
      x: inset,
      y: barTop + 8,
      w: vw - inset * 2,
      h: Math.max(320, vh - barTop - bar - 16),
    };
    // the pin's origin while it sticks, which is the only time the
    // plate is ever open
    const ox = pin.getBoundingClientRect().left + stage.offsetLeft;
    const oy = (parseFloat(getComputedStyle(pin).top) || 0) + stage.offsetTop;

    players.forEach((p, i) => {
      if (!p) return;
      const f = p.figure;
      const slot = { x: f.offsetLeft, y: f.offsetTop, w: f.offsetWidth, h: f.offsetHeight };
      const s0 = Math.min(slot.w / T.w, slot.h / T.h);
      geo[i] = {
        s0,
        rest: { x: slot.x + (slot.w - T.w * s0) / 2, y: slot.y + (slot.h - T.h * s0) / 2 },
        open: { x: T.x - ox, y: T.y - oy },
      };
      p.fit(T.w, T.h);
    });
  }

  function place(i, e) {
    const g = geo[i];
    if (!g) return;
    // scale moves geometrically, and position follows the scale, so
    // the plate reads as a camera closing in rather than a box growing
    const s = e >= 1 ? 1 : g.s0 * Math.pow(1 / g.s0, e);
    const k = (s - g.s0) / (1 - g.s0 || 1);
    let x = lerp(g.rest.x, g.open.x, k);
    let y = lerp(g.rest.y, g.open.y, k);
    if (e >= 1) {
      x = Math.round(x);
      y = Math.round(y);
    }
    const layer = players[i].layer;
    layer.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(5)})`;
    layer.style.opacity = clamp(e / 0.22).toFixed(3);
  }

  /* one slide's plate at slide-local runway position u; returns how
     open it is */
  function drive(i, u) {
    const p = players[i];
    const s = slides[i];
    const z = Math.min(
      clamp((u - OPEN[0]) / (OPEN[1] - OPEN[0])),
      clamp((CLOSE[1] - u) / (CLOSE[1] - CLOSE[0]))
    );
    const e = inOut(z);
    const open = e >= 0.98;

    s.style.setProperty("--e", e.toFixed(3));
    s.classList.toggle("is-zoomed", e > 0);
    // past this the copy under the plate is all but gone; take it out
    // of reach too, or it stays clickable and tabbable while invisible
    s.classList.toggle("is-covered", e > COVERED);
    p.layer.classList.toggle("is-shown", e > 0);
    p.layer.classList.toggle("is-moving", e > 0 && e < 1);
    p.layer.classList.toggle("is-open", open);
    if (p.layer.inert === open) p.layer.inert = !open;

    if (e <= 0) {
      // closed: next time it opens, it plays from the top
      p.reset();
      return 0;
    }
    place(i, e);
    // Scroll may push the clock on, never hold it back; the last 15%
    // of the open stretch is left for the finished frame. Coming back
    // up into a plate from below, that puts it straight on its end
    // frame — it has been seen — while from above it waits to start.
    p.pushTo((u - OPEN[1]) / ((CLOSE[0] - OPEN[1]) * 0.85));
    if (z >= 0.9) p.play();
    return e;
  }

  function paint(pos) {
    const last = slides.length - 1;
    let open = 0;
    slides.forEach((s, i) => {
      let d = pos - (i + 0.5);
      // the first slide is fully lit from the moment the section
      // pins, and the last stays lit until it releases — otherwise
      // the viewer fades to nothing at both ends of the runway
      if (i === 0) d = Math.max(0, d);
      if (i === last) d = Math.min(0, d);

      const dist = Math.abs(d);
      const t = clamp((dist - HOLD) / FADE, 0, 1);
      const a = 1 - smoothstep(t);
      const e = ZOOM && players[i] ? drive(i, pos - i) : 0;
      open = Math.max(open, e);

      s.style.setProperty("--a", a.toFixed(3));
      // the drift belongs to the dissolve; an open plate holds still
      s.style.setProperty("--dy", (-d * DRIFT * (1 - e)).toFixed(1) + "px");
      s.classList.toggle("is-lit", a > 0.004);
    });
    if (ZOOM) {
      // the index and the column grid step back while a plate is open
      work.style.setProperty("--zoom", open.toFixed(3));
      work.classList.toggle("is-covered", open > COVERED);
      document.documentElement.style.setProperty("--grid-a", (1 - open).toFixed(3));
    }
  }

  /* how far the runway has been travelled, 0 → 1 */
  function progress() {
    const travel = work.offsetHeight - pin.offsetHeight;
    if (travel <= 0) return 0;
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    return clamp((top - work.getBoundingClientRect().top) / travel, 0, 0.99999);
  }

  function scrollToSlide(i) {
    const travel = work.offsetHeight - pin.offsetHeight;
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    const start = work.getBoundingClientRect().top + window.scrollY - top;
    // land where that project is open and its demo is starting;
    // without the zoom, in the middle of its segment
    const into = ZOOM ? OPEN[1] + 0.015 : 0.5;
    const target = start + travel * ((i + into) / slides.length);
    // go through the page's damped scroller when it is running, so
    // an index click glides exactly like a wheel scroll
    if (window.Scroller) window.Scroller.to(target);
    else window.scrollTo({ top: target, behavior: REDUCED ? "auto" : "smooth" });
  }

  /* ---- the plates' two homes ------------------------------------
     Zooming, a plate lives on its slide, free to open past the
     slot's edges. Otherwise it lives in the figure, in the
     diagram's place: on phones it plays when it scrolls into view,
     and under reduced motion it sits on its finished frame with a
     replay for anyone who wants the motion. */
  function dock(inline) {
    players.forEach((p) => {
      if (!p) return;
      p.figure.classList.toggle("has-inline", inline);
      p.layer.classList.toggle("is-inline", inline);
      p.layer.classList.remove("is-shown", "is-open", "is-moving");
      p.layer.style.transform = "";
      p.layer.style.opacity = "";
      p.layer.inert = !inline;
      (inline ? p.figure : p.slide).appendChild(p.layer);
    });
    if (!inline) return;
    work.style.removeProperty("--zoom");
    document.documentElement.style.removeProperty("--grid-a");
    slides.forEach((s) => s.style.removeProperty("--e"));
  }

  function fitInline() {
    players.forEach((p) => {
      if (!p) return;
      const w = p.figure.clientWidth;
      p.fit(w, pinned.matches ? p.figure.clientHeight : p.heightFor(w));
    });
  }

  function mountInline() {
    fitInline();
    const onResize = () => fitInline();
    window.addEventListener("resize", onResize, { passive: true });
    let io = null;
    if (REDUCED) {
      players.forEach((p) => p && p.finish());
    } else {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const p = players.find((q) => q && q.layer === e.target);
            if (p && !p.ended) p.play();
          });
        },
        { threshold: 0.55 }
      );
      players.forEach((p) => p && io.observe(p.layer));
    }
    return () => {
      window.removeEventListener("resize", onResize);
      if (io) io.disconnect();
    };
  }

  /* ---- pinned mode ---- */
  function mountPinned() {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const pos = progress() * slides.length;
        paint(pos);
        // the index follows whichever slide is nearest its centre,
        // so the highlight moves at the midpoint of the dissolve
        activate(clamp(Math.round(pos - 0.5), 0, slides.length - 1));
      });
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    onScroll();
    refresh = onResize;
    return () => {
      refresh = null;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }

  /* ---- stacked mode (phones) ---- */
  function mountStacked() {
    slides.forEach((s) => {
      // the scroll-linked vars mean nothing once the slides stack
      s.style.removeProperty("--a");
      s.style.removeProperty("--dy");
      s.classList.add("is-lit", "is-active");
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          play(e.target);
          const i = Number(e.target.dataset.slide);
          if (i === 0 || i > current) {
            current = i;
            if (counter) counter.textContent = String(i + 1).padStart(2, "0");
          }
        });
      },
      { threshold: 0.2 }
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }

  function mount() {
    if (detach) detach();
    current = -1;
    slides.forEach((s) => s.classList.remove("is-active", "is-lit", "is-zoomed", "is-covered"));
    work.classList.remove("is-covered");
    const zooming = ZOOM && pinned.matches;
    let undoInline = null;
    if (hasDemos) {
      dock(!zooming);
      if (!zooming) undoInline = mountInline();
    }
    const undoMode = pinned.matches ? mountPinned() : mountStacked();
    detach = () => {
      undoMode();
      if (undoInline) undoInline();
    };
  }

  mount();
  pinned.addEventListener("change", mount);

  // type settling can change a slot's height, and the plates are
  // measured against their slots
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (ZOOM && pinned.matches && refresh) refresh();
      else if (hasDemos) fitInline();
    });
  }

  /* clicking the index jumps to that project */
  links.forEach((a, i) => {
    a.addEventListener("click", (e) => {
      if (!pinned.matches) return; // stacked: let the anchor do its job
      e.preventDefault();
      scrollToSlide(i);
    });
  });

  /* a deep link to a slide has to become a scroll position, since
     in pinned mode the slides are all stacked at the same place */
  const deep = slides.findIndex((s) => s.id === (location.hash || "").slice(1));
  if (deep > -1 && pinned.matches) {
    requestAnimationFrame(() => scrollToSlide(deep));
  }
})();
