"use strict";

/* ============================================================
   Kishaan Gidda — the curtain (curtain.css, DESIGN.md §6)
   ------------------------------------------------------------
   Pinned by the user to skiper-ui's "Stairs preloader"
   (skiper-ui.com/v1/skiper9), rebuilt here without React.

   The page is up from the first paint behind it. The name sets
   once its face has arrived; the curtain lifts when the page has
   loaded and the hero's silk has drawn its first frame, and never
   before the name has fully set. Whatever is still loading, it is
   gone by MAX_HOLD.

   The order of the lift is the reference's: the words fade out in
   reading order, and STAIRS_AFTER later the stairs collapse to the
   top, right column first. That is also the moment the page's own
   entrance starts (home.js waits for "curtain:lift"), so the hero
   settles while the stairs pull away instead of under them.

   This runs first of the deferred scripts, so its listeners are
   in place before silk.js can announce a frame.
   ============================================================ */

(() => {
  const root = document.documentElement;
  const curtain = document.querySelector(".curtain");
  if (!curtain || !root.classList.contains("curtain-up")) return;

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* The timings, measured off the reference frame by frame. They are
     handed to curtain.css as custom properties, so they live only
     here. */
  const WORD_MS = 900;       // one word's fade in
  const WORD_GAP = 200;      // between one word and the next
  /* Out is quicker than the reference's, which fades out as slowly
     as it fades in: here the stairs uncover the hero's heading right
     where the name sits, and a name still half there reads as a ghost
     over it. */
  const WORD_OUT_MS = 560;
  const WORD_OUT_GAP = 120;
  const STAIR_MS = 480;      // one stair's collapse
  const STAIR_GAP = 50;      // between stairs, right to left
  const STAIRS_AFTER = 420;  // the words have been fading this long when the stairs go
  const HOLD_MS = 250;       // the set name sits this long before anything leaves
  const FADE_MS = 300;       // reduced motion: the one fade
  const FONT_WAIT = 1200;    // the longest the name waits for its face (cold: ~0.6s after this runs)
  const MAX_HOLD = 4500;     // ms since navigation: up no later than this, ready or not

  const words = curtain.querySelectorAll(".curtain-words > span");
  const stairs = curtain.querySelectorAll(".curtain-stairs > i");
  const lastWord = Math.max(0, words.length - 1);
  const lastStair = Math.max(0, stairs.length - 1);

  const ms = (n) => `${n}ms`;
  curtain.style.setProperty("--word-ms", ms(WORD_MS));
  curtain.style.setProperty("--word-gap", ms(WORD_GAP));
  curtain.style.setProperty("--word-out-ms", ms(WORD_OUT_MS));
  curtain.style.setProperty("--word-out-gap", ms(WORD_OUT_GAP));
  curtain.style.setProperty("--stair-ms", ms(STAIR_MS));
  curtain.style.setProperty("--stair-gap", ms(STAIR_GAP));
  curtain.style.setProperty("--fade-ms", ms(FADE_MS));

  /* from the moment the stairs go to the moment the last of either
     the words or the stairs is out */
  const OPEN_MS = REDUCED
    ? FADE_MS
    : Math.max(
        WORD_OUT_MS + WORD_OUT_GAP * lastWord - STAIRS_AFTER,
        STAIR_MS + STAIR_GAP * lastStair
      );
  /* from the moment the name starts setting to the moment it has */
  const SET_MS = REDUCED ? 0 : WORD_MS + WORD_GAP * lastWord;

  const after = (n) => new Promise((done) => setTimeout(done, Math.max(0, n)));
  const twoFrames = () =>
    new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));

  /* ---- hold the page still while it is covered ----
     Input, not overflow: hiding the scrollbar would reflow the page
     twice, once going up and again, visibly, coming down. The wheel
     listener runs ahead of smooth-scroll.js's, which stands down on
     a wheel that has already been handled. */
  const KEYS = new Set([" ", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);
  const covered = () => root.classList.contains("curtain-up");
  const holdPointer = (e) => {
    if (covered() && !e.ctrlKey) e.preventDefault(); // ctrl+wheel is zoom
  };
  const holdKey = (e) => {
    if (covered() && KEYS.has(e.key)) e.preventDefault();
  };
  window.addEventListener("wheel", holdPointer, { passive: false });
  window.addEventListener("touchmove", holdPointer, { passive: false });
  window.addEventListener("keydown", holdKey);
  const release = () => {
    window.removeEventListener("wheel", holdPointer);
    window.removeEventListener("touchmove", holdPointer);
    window.removeEventListener("keydown", holdKey);
  };

  /* ---- the name: set once its face is in ----
     The webfont loads with display=swap, so setting it any earlier
     would change face halfway through the fade. */
  const face = document.fonts && document.fonts.load
    ? document.fonts
        .load(`400 48px "Source Serif 4"`, curtain.textContent.trim())
        .catch(() => {})
    : Promise.resolve();
  const set = Promise.race([face, after(FONT_WAIT)]).then(() => {
    // a fade needs a style at opacity 0 to start from, and on a warm
    // load this can run before the curtain has ever been styled
    if (words[0]) void getComputedStyle(words[0]).opacity;
    curtain.classList.add("is-set");
  });

  /* ---- the page: loaded, and the hero lit ---- */
  const loaded = new Promise((done) => {
    if (document.readyState === "complete") done();
    else window.addEventListener("load", done, { once: true });
  });
  const hero = document.querySelector(".hero canvas[data-silk]");
  const lit = new Promise((done) => {
    if (!hero || hero.dataset.silkReady) done();
    else hero.addEventListener("silk:ready", done, { once: true });
  });

  let lifted = false;

  function done() {
    curtain.remove();
    root.classList.remove("curtain-up");
  }

  function open() {
    curtain.classList.add("is-open");
    release();
    delete root.dataset.curtain;
    document.dispatchEvent(new Event("curtain:lift"));
    setTimeout(done, OPEN_MS);
  }

  function lift() {
    if (lifted) return;
    lifted = true;
    curtain.classList.add("is-lifting");
    if (REDUCED) open();
    else setTimeout(open, STAIRS_AFTER);
  }

  /* home.js holds its entrance while this is set */
  root.dataset.curtain = "held";

  Promise.race([
    Promise.all([loaded, lit, set.then(() => after(SET_MS + HOLD_MS))]).then(twoFrames),
    after(MAX_HOLD - performance.now()),
  ]).then(lift);
})();
