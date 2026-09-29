"use strict";

/* ============================================================
   Kishaan Gidda — the way down from the hero
   ------------------------------------------------------------
   The hero's silk used to stop dead at the fold, with PoleLab's
   deep ground starting on the very next pixel. Now there is no
   edge anywhere: the field runs on past the hero, over a stretch
   with nothing on it but the light going down (bridge.css,
   --descent), and PoleLab rises out of the deep.

   The stage gets a second silk canvas behind its slides, and
   that canvas computes its folds in the HERO's frame, on the same
   clock (silk.js), so the light crosses the join without a seam.
   Below the surface the same folds are printed in each project's
   ground (look.depth), so the water PoleLab stands in keeps
   moving.

   The stage's motion is untouched. This reads where the runway
   is (window.WorkStage) and paints behind it, nothing more. The
   texture thins through CareRouter and has gone by CyberSci,
   whose ground is left exactly as it was: the canvas hides and
   stops drawing there, and the stage's own flat ground shows.
   ============================================================ */

(() => {
  const Silk = window.Silk;
  const Stage = window.WorkStage;
  const hero = document.querySelector(".hero");
  const work = document.querySelector(".work");
  const stage = work && work.querySelector("[data-stage]");
  const heroCanvas = hero && hero.querySelector("canvas[data-silk]");
  if (!Silk || !Stage || !stage || !heroCanvas) return;

  const wide = window.matchMedia("(min-width: 901px)");
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const heroHost = heroCanvas.parentElement;
  const heroSilk = heroCanvas.silk || null;
  const kinds = Array.from(stage.querySelectorAll(".stage-slide")).map((s) => s.dataset.ground);

  /* How far a fold may lift and sink each ground, in Oklab
     lightness. The lift is the ceiling that matters: it is set so
     the ground's softest ink still clears 4.5:1 on the brightest
     crest (PoleLab 4.88:1, CareRouter 4.58:1 at the cap). CyberSci
     carries none: its ground is the one the section below meets. */
  const GRAIN = { pole: [0.15, 0.09], care: [0.045, 0.12], ctf: [0, 0] };

  /* Pinned, the water slides past at this fraction of the scroll,
     so the stage still feels like it is sinking while its content
     holds still. Up to the pin it is 1: the field is one surface. */
  const PARALLAX = 0.3;

  /* ---- maths ---- */
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // the same curve work.js blends the ground on, so the grain moves
  // with the colour rather than beside it
  const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function lab(str) {
    const s = (str || "").trim();
    if (s[0] === "#") {
      const v = parseInt(s.slice(1), 16);
      return Silk.oklab((v >> 16) & 255, (v >> 8) & 255, v & 255);
    }
    const m = s.match(/[\d.]+/g);
    return m ? Silk.oklab(+m[0], +m[1], +m[2]) : null;
  }

  function grainAt(P) {
    const i = clamp(Math.floor(P), 0, kinds.length - 2);
    const e = inOut(clamp(P - i));
    const a = GRAIN[kinds[i]];
    const b = GRAIN[kinds[i + 1]];
    return a.map((v, k) => lerp(v, b[k], e));
  }

  const descent = () => parseFloat(getComputedStyle(hero).marginBottom) || 0;

  /* the band where light turns to water, in the hero's frame —
     CSS px down from the hero's top: the whole descent, its edge
     carried a little way on the folds */
  function water(heroH) {
    const d = descent();
    return [heroH, heroH + d, Math.min(24, d * 0.05)];
  }

  /* ================================================================
     THE HERO — its first viewport left exactly as it is; the field
     hangs on below it and goes down to PoleLab's water
     ================================================================ */

  let bars = null;   // the fixed bars' heights, where the field reads under them

  function measureBars() {
    const bar = (sel) => (document.querySelector(sel) || { offsetHeight: 0 }).offsetHeight;
    bars = { top: bar(".bar--top"), bottom: bar(".bar--bottom") };
  }

  // the bars are fixed to the viewport, so while the canvas is
  // moving they cross it partway down: the bands follow them, not
  // its edges
  function barBands(sr) {
    if (!bars || !sr.height) return [0, 0, 0, 0];
    const H = sr.height;
    const vh = window.innerHeight;
    return [
      -sr.top / H, (bars.top - sr.top) / H,
      (vh - bars.bottom - sr.top) / H, (vh - sr.top) / H,
    ];
  }

  function lookHero() {
    const d = descent();
    const heroH = hero.offsetHeight;
    const [a, b, w] = water(heroH);
    /* The chrome crossing the water (chrome.js, work.js). Any soft
       edge between light and dark has a stretch where neither ink
       holds 4.5:1 on bare cloth, so across it the bars bring their
       scrim back. Above the handover the field's ink keeps working
       up to a depth of about 0.21 of the way down (the reading floor
       holds it), and past that on its paper scrim. Below it, the
       ground's ink on its own colour holds from 0.32 (work.js keeps
       that scrim while the stage moves). So the handover sits where
       even the shallowest fold across the line is 0.32 down, and the
       veil starts where even the deepest is still under 0.21: the
       smoothstep reaches those at 0.38 and 0.30 of the band, and w
       is how far the folds carry the edge either way. Under reduced
       motion the field under the bars cannot follow them, so there
       the veil starts at the hero's edge. */
    if (b > a) {
      const span = b - a;
      const lean = w / span;
      const mid = a + Math.min(1, 0.38 + lean) * span;
      const veil = REDUCED ? heroH : a + Math.max(0, 0.3 - lean) * span;
      heroHost.style.setProperty("--field-to", `${mid}px`);
      heroHost.style.setProperty("--field-veil", `${veil}px`);
      work.style.setProperty("--ground-above", `${heroH + d - mid}px`);
    }
    if (!heroSilk) return;
    const L = heroSilk.look;
    L.depth = 1;
    L.ground = lab(Stage.groundOf(0)) || L.ground;
    L.grain = GRAIN.pole;
    L.water = [a, b, w];
    // the canvas runs below the hero, but its folds are still the
    // hero's: computed in the hero's own box, not the taller one
    L.ref = d ? [0, -d, hero.offsetWidth, heroH] : null;
    // below the hero the cloth has none of the hero's own light, so
    // the descent lifts it under the bars as they pass — and only
    // there: the hero above the line is left as it is
    if (d && !REDUCED) {
      L.own = [heroH, 60];
      heroSilk.before = (h) => {
        h.look.bars = barBands(heroHost.getBoundingClientRect());
        return true;
      };
    }
    heroSilk.refresh();
  }

  /* ================================================================
     THE STAGE — a second canvas, pinned desktop only
     ================================================================ */

  let stageSilk = null;

  function paintStage(h) {
    const P = Stage.at;
    const grain = grainAt(P);
    // no folds left: the flat ground under the canvas is exactly
    // this, so stop drawing and let it show
    const flat = grain[0] < 0.0005 && grain[1] < 0.0005;
    h.canvas.classList.toggle("is-on", !flat);
    if (flat) return false;

    const hr = hero.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    const wr = work.getBoundingClientRect();
    // the hero-frame row at the canvas's top edge: with the page up
    // to the pin, at a fraction of it after
    const refTop = wr.top - hr.top + (sr.top - wr.top) * PARALLAX;

    const L = h.look;
    L.ref = [sr.left - hr.left, hr.height - refTop - sr.height, hr.width, hr.height];
    L.ground = lab(Stage.ground) || L.ground;
    L.grain = grain;
    L.depth = 1;
    L.water = water(hr.height);
    return true;
  }

  function mountStage() {
    if (stageSilk || !work.classList.contains("is-pinned")) return;
    const c = document.createElement("canvas");
    c.className = "stage-silk";
    c.setAttribute("aria-hidden", "true");
    c.dataset.silk = "1";
    c.dataset.res = "0.66";
    stage.prepend(c);
    stageSilk = Silk.mount(c);
    // mount() marks its host; the stage is not a silk host
    stage.classList.remove("silk-live", "silk-fallback");
    if (!stageSilk) {
      c.remove();
      return;
    }
    stageSilk.canvas = c;
    stageSilk.before = paintStage;
  }

  function unmountStage() {
    if (!stageSilk) return;
    stageSilk.stop();
    stageSilk.canvas.remove();
    stageSilk = null;
  }

  /* ================================================================ */

  function mount() {
    unmountStage();
    measureBars();
    mountStage();
    heroHost.classList.toggle("is-stacked", !work.classList.contains("is-pinned"));
    lookHero();
  }

  mount();
  // work.js listens first, so the stage is already pinned or
  // stacked by the time this runs
  wide.addEventListener("change", mount);
  window.addEventListener("resize", () => {
    measureBars();
    lookHero();
  }, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measureBars();
      lookHero();
    });
  }
})();
