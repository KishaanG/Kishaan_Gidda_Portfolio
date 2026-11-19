"use strict";

/* ============================================================
   Kishaan Gidda — home controller
   Reveals and the experience spine. The work stage lives in
   work.js.
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
  const watch = () => items.forEach((el) => io.observe(el));

  // the curtain (curtain.js) holds the entrance until its stairs go,
  // so the hero settles as they pull away rather than unseen beneath
  if (document.documentElement.dataset.curtain === "held") {
    document.addEventListener("curtain:lift", watch, { once: true });
  } else {
    watch();
  }
})();

/* ============================================================
   Experience — the spine

   The work stage's scroll hands over a project. This one
   advances time: the ledger is a chronology, so the scroll axis already
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
       stage's rail tracks whichever project is showing.

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

    // the flight (xp3d.js) has taken the section: the ledger is its
    // screen-reader record there, and nothing on it should move
    if (ledger.closest(".is-flight")) {
      ledger.classList.remove("is-traced");
      return;
    }

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

