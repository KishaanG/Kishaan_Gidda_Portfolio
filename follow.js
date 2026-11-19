"use strict";

/* ============================================================
   The disc — a lens that follows the cursor. One size always; it
   inverts the lightness of whatever is under it and keeps its hue,
   so the site's blue stays blue in it and a project's red stays
   red. Over a link an arrow turns in it toward where the link goes.
   The cursor itself stays as it is: the disc trails it, loosely,
   the way skiper-ui's "Hover members" does (skiper-ui.com/v1/
   skiper6), and closes in on a link so the arrow sits on it.

   It is also what moves the water: silk.js reads it each frame as
   window.Disc and pushes the field's folds with its movement.

   Fine pointers only: on touch there is no cursor to follow. Under
   prefers-reduced-motion it sits on the cursor, without a spring,
   and moves nothing.
   ============================================================ */

(() => {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SIZE = 80; // CSS px, always
  // Off a link the disc drifts after the cursor and settles past it
  // a little; on one it closes in. ζ ≈ 0.84 and 0.94.
  const LOOSE = { k: 60, c: 13 };
  const CLOSE = { k: 220, c: 28 };
  const SHOW = { k: 260, c: 30 }; // coming in and going out of the window
  const MAX_DT = 1 / 30; // s — a dropped frame must not fling it
  const REST = 0.05; // px (and px/s) close enough to let the loop sleep
  const SETTLE_SCROLL = 120; // ms after a scroll to look again
  const LINKS = 'a[href], button, [role="button"], summary, label[for]';

  const disc = document.createElement("div");
  disc.className = "disc";
  disc.setAttribute("aria-hidden", "true");
  // the arrow is white on a dark keyline, so it reads whatever the lens
  // turns the ground under it into: a screenshot's white goes black in
  // it, a project's carbon goes pale
  const ARROW = "M4.5 12h14M13 6.5l5.5 5.5-5.5 5.5";
  disc.innerHTML =
    '<svg viewBox="0 0 24 24" focusable="false" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    `<path d="${ARROW}" stroke="rgba(11, 13, 20, 0.6)" stroke-width="4.4"/>` +
    `<path d="${ARROW}" stroke="#ffffff" stroke-width="1.7"/></svg>`;
  document.body.append(disc);

  let at = { x: 0, y: 0, in: false }; // the cursor, client px
  let pos = { x: 0, y: 0, vx: 0, vy: 0 }; // the disc; v in px/s
  let shown = { s: 0, v: 0 }; // 0..1
  let onLink = false;
  let look = true; // whether what is under the disc needs reading again
  let raf = 0;
  let last = 0;
  let settle = 0;

  /* one step of a damped spring toward goal (semi-implicit Euler) */
  function spring(x, v, goal, { k, c }, dt) {
    const nv = v + (k * (goal - x) - c * v) * dt;
    return [x + nv * dt, nv];
  }

  /* The arrow points where the link goes: down or up the page to an
     anchor, out (↗) to anything else. */
  function turnFor(link) {
    const href = link.getAttribute("href") || "";
    if (href.length > 1 && href.startsWith("#")) {
      const target = document.getElementById(decodeURIComponent(href.slice(1)));
      if (target) return target.getBoundingClientRect().top < 0 ? -90 : 90;
    }
    return -45;
  }

  /* What is under the cursor: a link, or not. */
  function read() {
    look = false;
    const el = at.in ? document.elementFromPoint(at.x, at.y) : null;
    const link = el && el.closest(LINKS);
    onLink = !!link;
    disc.classList.toggle("is-link", onLink);
    if (link) disc.style.setProperty("--turn", `${turnFor(link)}deg`);
  }

  function frame() {
    const now = performance.now();
    const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;
    if (look) read();

    // a disc that has gone comes back under the cursor, rather than
    // flying in from wherever it last was
    if (shown.s < 0.01 && at.in) pos = { x: at.x, y: at.y, vx: 0, vy: 0 };

    const goal = at.in ? 1 : 0;
    if (REDUCED) {
      pos = { x: at.x, y: at.y, vx: 0, vy: 0 };
      shown = { s: goal, v: 0 };
    } else {
      const feel = onLink ? CLOSE : LOOSE;
      const [x, vx] = spring(pos.x, pos.vx, at.x, feel, dt);
      const [y, vy] = spring(pos.y, pos.vy, at.y, feel, dt);
      const [s, v] = spring(shown.s, shown.v, goal, SHOW, dt);
      pos = { x, y, vx, vy };
      shown = { s: Math.min(1.08, Math.max(0, s)), v };
    }

    disc.style.transform =
      `translate3d(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${shown.s.toFixed(4)})`;

    const still = Math.abs(at.x - pos.x) < REST && Math.abs(at.y - pos.y) < REST
      && Math.abs(pos.vx) < REST && Math.abs(pos.vy) < REST;
    const settled = Math.abs(goal - shown.s) < 0.001 && Math.abs(shown.v) < 0.01;
    const asleep = (still || !at.in) && settled;

    // what the water reads (silk.js): where the disc is, how fast it
    // is going (px/s), its radius, and how far it is shown
    window.Disc = {
      x: pos.x, y: pos.y,
      vx: asleep || REDUCED ? 0 : pos.vx, vy: asleep || REDUCED ? 0 : pos.vy,
      r: SIZE / 2, s: shown.s,
    };

    if (asleep) {
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    at = { x: e.clientX, y: e.clientY, in: true };
    look = true;
    wake();
  }, { passive: true });

  // the page scrolls under a still disc: what it is over may have
  // changed, so look once the scroll settles — not on every frame,
  // which would put a hit-test inside the work stage's snap
  window.addEventListener("scroll", () => {
    clearTimeout(settle);
    settle = setTimeout(() => { look = true; wake(); }, SETTLE_SCROLL);
  }, { passive: true });

  document.documentElement.addEventListener("mouseleave", () => {
    at = { ...at, in: false };
    look = true;
    wake();
  });
})();
