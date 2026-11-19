"use strict";

/* ============================================================
   Kishaan Gidda — damped page scrolling
   ------------------------------------------------------------
   The wheel sets a target; the page eases toward it every
   frame. That is what makes a stop trail off instead of
   halting on the exact pixel the wheel left it at.

   It moves the REAL scroll position rather than translating a
   wrapper. The transform trick is the common way to do this and
   it would break everything this site is built on — position:
   sticky (the pinned work viewer), position: fixed (the chrome
   and the column grid), and every IntersectionObserver on the
   page. Driving window.scrollTo keeps all of that native.

   Not hijacked: touch (mobile momentum is already better than
   anything written here), keyboard, scrollbar dragging, and
   find-in-page — those move the page natively and this resyncs
   to them. Disabled outright under prefers-reduced-motion.
   ============================================================ */

(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // coarse pointers have real momentum scrolling; leave it alone
  if (window.matchMedia("(hover: none)").matches) return;

  const EASE = 0.09;    // per-frame approach; lower = longer glide
  const WHEEL = 0.82;   // < 1 so a notch travels less than native
  const EPS = 0.4;      // px at which the glide is called done

  let target = window.scrollY;
  let current = window.scrollY;
  let raf = 0;
  // the page's own speed, in px per ms, measured off its last frame
  // and its timestamp so it means the same at 60Hz and 144Hz
  let speed = 0;
  let lastT = 0;
  // a timed glide (below), or null while the page is easing freely
  let run = null;
  // where the wheel alone would have put the page. Easing freely it is
  // the target; while a stage snaps the page to a rest it runs on
  // separately, so a stage that snaps on every wheel event still lands
  // the same wheel total where it always would have.
  let aim = window.scrollY;

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const clamp = (v) => Math.min(maxScroll(), Math.max(0, v));
  const unit = (v) => Math.min(1, Math.max(0, v));

  function write(y) {
    // 'instant' so this never inherits a CSS scroll-behavior and
    // animates each individual frame
    window.scrollTo({ top: y, behavior: "instant" });
  }

  function stop() {
    raf = 0;
    run = null;
    speed = 0;
    lastT = 0;
  }

  /* where a timed glide is at s (0 → 1): a cubic that leaves at the
     speed the page already had and arrives at rest, so taking over a
     moving page never jolts it */
  function along(g, s) {
    const s2 = s * s;
    const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * g.from + (s3 - 2 * s2 + s) * g.lead + (3 * s2 - 2 * s3) * g.to;
  }

  function frame(now) {
    const dt = lastT ? Math.min(50, now - lastT) : 1000 / 60;
    lastT = now;

    if (run) {
      // a glide's clock starts on its first frame, one frame in, so
      // that frame moves the page — stamping it in the event handler
      // that asked for it lands after this frame's own time, and the
      // page would sit still for a frame and lose its speed
      if (run.t0 === null) run.t0 = now - dt;
      const s = unit((now - run.t0) / run.ms);
      // the curve may lean back a little before it goes (a negative
      // lead), which must never write past either end of the page:
      // the browser would clamp it and the resync below would end the
      // glide halfway
      const y = clamp(along(run, s));
      speed = (y - current) / dt;
      current = y;
      write(current);
      if (s >= 1) {
        // A glide only ends once the wheel has been quiet for its
        // whole length, at least 480ms, because every wheel event
        // during one re-times it from where the page is. So this is
        // also where the wheel's aim comes back to the page.
        current = target = aim = run.to;
        stop();
        return;
      }
      raf = requestAnimationFrame(frame);
      return;
    }

    const d = target - current;
    if (Math.abs(d) < EPS) {
      current = target;
      write(current);
      stop();
      return;
    }
    current += d * EASE;
    speed = (d * EASE) / dt;
    write(current);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function to(y) {
    run = null;
    target = aim = clamp(y);
    start();
  }

  /* A timed glide to y, for a stage finishing a move the visitor
     started. The glide above covers any distance in about a second
     and leaves at its fastest, so handing it a new target while the
     page is coasting makes the page lurch. This one carries on at the
     speed the page has and settles over a time set by the distance.
     The page's speed only ever leads it so far: enough to carry on
     without a seam, never so much that it sails past and comes back.
     A wheel during it keeps its notch (below); a key, the scrollbar
     or touch ends it, as they end the eased glide.

     A snap passes { snap: true }: it moves the page but not the aim,
     because it is a correction of where the wheel was going rather
     than a new place to go. Anything else — a link, a jump — moves
     both. */
  function glide(y, opts = {}) {
    const to = clamp(y);
    if (!opts.snap) aim = to;
    if (!raf) {
      current = window.scrollY;
      speed = 0;
    }
    const dist = to - current;
    if (Math.abs(dist) < EPS) {
      // already there: whatever glide was running is over, and the
      // page holds where it is
      run = null;
      target = to;
      if (!opts.snap) aim = to;
      start();
      return;
    }
    const dur = opts.ms || Math.min(1100, Math.max(480, 360 + Math.abs(dist) * 0.6));
    const ratio = Math.min(2.4, Math.max(-1, (speed * dur) / dist));
    run = { from: current, to, lead: dist * ratio, t0: null, ms: dur };
    target = to;
    start();
  }

  function sync() {
    cancelAnimationFrame(raf);
    stop();
    target = current = aim = window.scrollY;
  }

  /* Anything that moved the page without going through us —
     keyboard, scrollbar, find-in-page, the browser restoring a
     position — shows up as a gap between where we last wrote and
     where the page actually is. Our own writes match, so they
     fall through. */
  window.addEventListener(
    "scroll",
    () => {
      if (Math.abs(window.scrollY - current) > 3) sync();
    },
    { passive: true }
  );

  /* leave nested scrollers, zoom, and the locked page alone */
  function blocked(e) {
    if (document.body.style.overflow === "hidden") return true;
    let n = e.target;
    while (n && n !== document.body && n.nodeType === 1) {
      if (n.scrollHeight > n.clientHeight + 2) {
        const o = getComputedStyle(n).overflowY;
        if (o === "auto" || o === "scroll") return true;
      }
      n = n.parentElement;
    }
    return false;
  }

  window.addEventListener(
    "wheel",
    (e) => {
      if (e.ctrlKey || e.defaultPrevented || blocked(e)) return;
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 16;             // lines
      else if (e.deltaMode === 2) d *= window.innerHeight; // pages
      e.preventDefault();
      // a wheel during a timed glide sends the page where the wheel
      // alone would have taken it, re-timed from the page's own speed
      // (a stage listening after this may snap that again). Handing it
      // back to the eased glide instead would leave at that glide's
      // fastest, from however far off the target now was.
      if (run) {
        glide(aim + d * WHEEL);
        return;
      }
      target = aim = clamp(target + d * WHEEL);
      start();
    },
    { passive: false }
  );

  /* same-page links glide through the same easing, so a nav click
     and a wheel scroll feel like the same motion */
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    const el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const pad =
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    // and the target's own margin, as the browser's own jump honours it
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    to(el.getBoundingClientRect().top + window.scrollY - pad - margin);
    history.replaceState(null, "", "#" + id);
  });

  window.addEventListener("resize", sync, { passive: true });

  window.Scroller = {
    to,
    glide,
    sync,
    get target() { return target; },
    get aim() { return aim; },
  };
})();
