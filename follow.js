"use strict";

/* ============================================================
   The disc — a lens that follows the cursor. One size always; it
   inverts the lightness of whatever is under it and keeps its hue,
   so the site's blue stays blue in it and a project's red stays
   red. Over the work stage it is no lens but the project's accent,
   see-through: PoleLab's and CyberSci's red, CareRouter's gold. The
   system cursor is hidden: the disc is the pointer, and trails the mouse, loosely, the
   way skiper-ui's "Hover members" does (skiper-ui.com/v1/skiper6).
   The disc is plain: the snap below says what is clickable.

   On a control it snaps, the way the pointer does on an iPad: it
   leaves the cursor, takes the control's own box, padding and
   corners, and sits over it as a faint tint in the control's ink,
   leaning a few px toward the mouse. A wide control (a project's
   card) takes a fainter tint.

   A press sinks it a little; three seconds without the mouse moving
   fades it out, and the next move brings it straight back.

   It is also what moves the water: silk.js reads it each frame as
   window.Disc and pushes the field's folds with its movement.

   Fine pointers only: on touch there is no cursor to follow. Under
   prefers-reduced-motion it sits on the cursor, or straight on the
   control, without a spring, and moves nothing.
   ============================================================ */

(() => {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  const SIZE = 40; // CSS px, off a control (user, 2026-11-19: was 60)
  // Off a link the disc drifts after the cursor and settles past it
  // a little; on one it closes in. ζ ≈ 0.84 and 0.94.
  const LOOSE = { k: 60, c: 13 };
  const CLOSE = { k: 220, c: 28 };
  const SHOW = { k: 260, c: 30 }; // coming in and going out of the window
  const SHAPE = { k: 320, c: 34 }; // the morph onto a control and off it
  const PRESS = { k: 700, c: 42 }; // the sink on a press, and the spring back
  const MAX_DT = 1 / 30; // s — a dropped frame must not fling it
  const REST = 0.05; // px (and px/s) close enough to let the loop sleep
  const SETTLE_SCROLL = 120; // ms after a scroll to look again
  const GROUND_SCROLL = 100; // ms between reads of the ground while it scrolls
  const IDLE_MS = 3000; // still this long, and it fades out
  const PRESSED = 0.92;

  // what it snaps to
  const CONTROLS = 'a[href], button, [role="button"], summary, label[for], [data-cursor="magnetic"]';
  const WIDE = { w: 480, h: 160 }; // past this: a fainter tint
  const PAD = 6; // px the tint stands out from the control's own box
  const MIN_R = 6; // px: the site's controls are square; the tint is not sharp
  const PULL = 0.12; // share of the cursor's offset the tint leans by
  const PULL_MAX = 6; // px
  // how far off a control the snap holds: crossing the gap between two
  // (the nav's brackets) the tint slides on to the next, never a lens
  const HOLD = 16; // px

  const disc = document.createElement("div");
  disc.className = "disc";
  disc.setAttribute("aria-hidden", "true");
  document.body.append(disc);
  // the disc is the pointer: the system cursor goes (site.css)
  root.classList.add("has-disc");

  let at = { x: 0, y: 0, in: false }; // the cursor, client px
  let pos = { x: 0, y: 0, vx: 0, vy: 0 }; // the disc's centre; v in px/s
  let shown = { s: 0, v: 0 }; // 0..1
  let shape = { w: SIZE, h: SIZE, r: SIZE / 2, vw: 0, vh: 0, vr: 0 };
  let press = { s: 1, v: 0, goal: 1 };
  let target = null; // the control it is snapped to
  let targetR = 0; // that control's own corner radius
  let look = true; // whether what is under the disc needs reading again
  let lookGround = false; // only the ground (stage or not), mid-scroll
  let groundAt = 0; // when the ground was last read mid-scroll
  let raf = 0;
  let last = 0;
  let settle = 0;
  let idle = 0;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* one step of a damped spring toward goal (semi-implicit Euler) */
  function spring(x, v, goal, { k, c }, dt) {
    const nv = v + (k * (goal - x) - c * v) * dt;
    return [x + nv * dt, nv];
  }

  /* A control's box: a link that wraps onto two lines has a box per
     line, and the tint takes the line the cursor is on. */
  function boxOf(el) {
    const rects = el.getClientRects();
    if (rects.length > 1) {
      for (const r of rects) {
        if (at.x >= r.left && at.x <= r.right && at.y >= r.top && at.y <= r.bottom) return r;
      }
    }
    return el.getBoundingClientRect();
  }

  const around = (b, s) =>
    at.x >= b.left - s && at.x <= b.right + s && at.y >= b.top - s && at.y <= b.bottom + s;

  const under = () => (at.in ? document.elementFromPoint(at.x, at.y) : null);
  // the ground under the cursor. Over the scrollbar there is no element
  // (elementFromPoint is null), so it reads the page's edge beside it:
  // that is what the disc, trailing in from the left, is over.
  const groundUnder = () => (at.in
    ? document.elementFromPoint(Math.min(at.x, root.clientWidth - 1), Math.min(at.y, root.clientHeight - 1))
    : null);

  /* Over the work stage the disc takes the project's accent. Pinned,
     work.js blends it on the root as the projects hand over; stacked,
     it is the accent of the ground under the cursor. With nothing to
     read (the cursor has left the window) it keeps the ground it had
     while it fades, rather than flashing to the lens (user, 2026-11-19). */
  function readGround(el) {
    lookGround = false;
    if (!el) return;
    const onStage = !!(el && el.closest("[data-stage]"));
    disc.classList.toggle("on-stage", onStage);
    const ground = onStage && el.closest("[data-ground]");
    if (ground) disc.style.setProperty("--disc-accent", getComputedStyle(ground).getPropertyValue("--st-accent").trim());
  }

  /* What is under the cursor: a control to snap to, or not. */
  function read() {
    look = false;
    const el = under();
    let control = el && el.closest(CONTROLS);
    if (!control && target && target.isConnected && at.in && around(boxOf(target), HOLD)) control = target;
    const was = target;
    target = control && boxOf(control).width > 0 ? control : null;
    const b = target && boxOf(target);
    const wide = !!b && (b.width > WIDE.w || b.height > WIDE.h);
    disc.classList.toggle("is-snapped", !!target);
    disc.classList.toggle("is-wide", wide);
    if (target && target !== was) {
      const cs = getComputedStyle(target);
      disc.style.setProperty("--snap-ink", cs.color);
      targetR = parseFloat(cs.borderTopLeftRadius) || 0;
    }
    readGround(el || groundUnder());
  }

  /* Where the disc is headed, and in what shape: the cursor as a
     circle, or the control's box, leaning toward the mouse. */
  function goalNow() {
    if (!target || !target.isConnected) {
      return { x: at.x, y: at.y, w: SIZE, h: SIZE, r: SIZE / 2 };
    }
    const b = boxOf(target);
    const cx = b.left + b.width / 2;
    const cy = b.top + b.height / 2;
    const h = b.height + PAD * 2;
    return {
      x: cx + clamp((at.x - cx) * PULL, -PULL_MAX, PULL_MAX),
      y: cy + clamp((at.y - cy) * PULL, -PULL_MAX, PULL_MAX),
      w: b.width + PAD * 2,
      h,
      r: Math.min(h / 2, Math.max(MIN_R, targetR + PAD)),
    };
  }

  function step(dt, goal, showGoal) {
    if (REDUCED) {
      pos = { x: goal.x, y: goal.y, vx: 0, vy: 0 };
      shown = { s: showGoal, v: 0 };
      shape = { w: goal.w, h: goal.h, r: goal.r, vw: 0, vh: 0, vr: 0 };
      press = { ...press, s: press.goal, v: 0 };
      return;
    }
    const feel = target ? CLOSE : LOOSE;
    const [x, vx] = spring(pos.x, pos.vx, goal.x, feel, dt);
    const [y, vy] = spring(pos.y, pos.vy, goal.y, feel, dt);
    const [s, v] = spring(shown.s, shown.v, showGoal, SHOW, dt);
    const [w, vw] = spring(shape.w, shape.vw, goal.w, SHAPE, dt);
    const [h, vh] = spring(shape.h, shape.vh, goal.h, SHAPE, dt);
    const [r, vr] = spring(shape.r, shape.vr, goal.r, SHAPE, dt);
    const [ps, pv] = spring(press.s, press.v, press.goal, PRESS, dt);
    pos = { x, y, vx, vy };
    shown = { s: clamp(s, 0, 1.08), v };
    shape = { w: Math.max(1, w), h: Math.max(1, h), r: Math.max(0, r), vw, vh, vr };
    press = { ...press, s: ps, v: pv };
  }

  const near = (a, b, v) => Math.abs(a - b) < REST && Math.abs(v) < REST;

  function frame() {
    const now = performance.now();
    const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
    last = now;
    if (look) read();
    else if (lookGround) readGround(groundUnder());

    // a disc that has gone comes back under the cursor, rather than
    // flying in from wherever it last was
    if (shown.s < 0.01 && at.in) pos = { x: at.x, y: at.y, vx: 0, vy: 0 };

    const goal = goalNow();
    const showGoal = at.in ? 1 : 0;
    step(dt, goal, showGoal);

    disc.style.width = `${shape.w.toFixed(2)}px`;
    disc.style.height = `${shape.h.toFixed(2)}px`;
    disc.style.borderRadius = `${shape.r.toFixed(2)}px`;
    disc.style.transform =
      `translate3d(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px, 0) translate(-50%, -50%) scale(${(shown.s * press.s).toFixed(4)})`;

    const still = near(pos.x, goal.x, pos.vx) && near(pos.y, goal.y, pos.vy);
    const formed = near(shape.w, goal.w, shape.vw) && near(shape.h, goal.h, shape.vh)
      && near(shape.r, goal.r, shape.vr) && Math.abs(press.s - press.goal) < 0.001 && Math.abs(press.v) < 0.01;
    const settled = Math.abs(showGoal - shown.s) < 0.001 && Math.abs(shown.v) < 0.01;
    const asleep = (still || !at.in) && formed && settled;

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

  /* any movement brings it back at once; stillness fades it out */
  function stir() {
    disc.classList.remove("is-idle");
    clearTimeout(idle);
    idle = setTimeout(() => disc.classList.add("is-idle"), IDLE_MS);
  }

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    at = { x: e.clientX, y: e.clientY, in: true };
    look = true;
    stir();
    wake();
  }, { passive: true });

  window.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    press = { ...press, goal: PRESSED };
    stir();
    wake();
  }, { passive: true });
  const release = () => { press = { ...press, goal: 1 }; wake(); };
  window.addEventListener("pointerup", release, { passive: true });
  window.addEventListener("pointercancel", release, { passive: true });

  // the page scrolls under a still disc: what it is over may have
  // changed. The ground is read every GROUND_SCROLL ms while it moves,
  // so the disc takes the stage's accent as the stage arrives, not a
  // second later when the glide ends (user, 2026-11-19); the snap waits
  // for the scroll to settle, so it never grabs links flying past. Not
  // on every frame, which would put a hit-test inside the work stage's
  // snap. A snapped tint follows its control meanwhile.
  window.addEventListener("scroll", () => {
    const now = performance.now();
    if (now - groundAt >= GROUND_SCROLL) {
      groundAt = now;
      lookGround = true;
      wake();
    } else if (target) wake();
    clearTimeout(settle);
    settle = setTimeout(() => { look = true; wake(); }, SETTLE_SCROLL);
  }, { passive: true });

  document.documentElement.addEventListener("mouseleave", () => {
    at = { ...at, in: false };
    look = true;
    wake();
  });
})();
