"use strict";

/* ============================================================
   Kishaan Gidda — blog controller
   Reveals and the contents rail. Same motion rules as the
   home page: content arrives once and does not replay.
   ============================================================ */

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

/* ---- reveals ---- */
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
    { threshold: 0.1 }
  );
  items.forEach((el) => io.observe(el));
})();

/* ---- the contents rail follows the reader ---- */
(() => {
  const links = Array.from(document.querySelectorAll(".reading-index a[data-index]"));
  const sections = Array.from(document.querySelectorAll("section[data-section]"));
  if (!links.length || !sections.length) return;

  function setActive(i) {
    links.forEach((a) => a.classList.toggle("on", Number(a.dataset.index) === i));
  }
  setActive(0);

  const io = new IntersectionObserver(
    (entries) => {
      let best = null;
      entries.forEach((e) => {
        if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) {
          best = e;
        }
      });
      if (best) setActive(Number(best.target.dataset.section));
    },
    { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.2, 0.5, 1] }
  );
  sections.forEach((s) => io.observe(s));
})();
