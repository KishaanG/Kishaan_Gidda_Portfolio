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

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const clamp = (v) => Math.min(maxScroll(), Math.max(0, v));

  function write(y) {
    // 'instant' so this never inherits a CSS scroll-behavior and
    // animates each individual frame
    window.scrollTo({ top: y, behavior: "instant" });
  }

  function frame() {
    const d = target - current;
    if (Math.abs(d) < EPS) {
      current = target;
      write(current);
      raf = 0;
      return;
    }
    current += d * EASE;
    write(current);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function to(y) {
    target = clamp(y);
    start();
  }

  function sync() {
    cancelAnimationFrame(raf);
    raf = 0;
    target = current = window.scrollY;
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
      target = clamp(target + d * WHEEL);
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
    sync,
    get target() { return target; },
  };
})();
