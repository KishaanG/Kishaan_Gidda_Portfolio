"use strict";

/* ============================================================
   Kishaan Gidda — the work stage

   Desktop: the section is a runway and the stage sticks inside
   it. It rises under the hero already composed — PoleLab at rest,
   its name and copy at the top, its card across the container and
   running off the bottom of the screen — and pins. From there
   scroll hands each project to the next. The next card comes up
   from under the fold, over the one at rest, and settles where it
   was; the one it covers sinks back a little and dims into the
   ground. The names roll over through their masks, and the ground
   blends from one blue to the next. Every frame is a pure function
   of scroll position, so going back up plays it all in reverse.

   When the wheel stops partway through a handover, the page is
   carried on to the nearer rest in the direction it was going —
   decided from where the page is headed, while it is still moving,
   and glided there at the speed it already has, so a flick
   finishes the move it started without the page ever stopping
   first.

   Phones, reduced motion and no script get the same markup as a
   stack of three grounds (home.css). On phones each project rolls
   in once as it arrives; under reduced motion it is simply there.
   ============================================================ */
(() => {
  const work = document.querySelector(".work");
  const stage = work && work.querySelector("[data-stage]");
  if (!stage) return;

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wide = window.matchMedia("(min-width: 901px)");
  const root = document.documentElement;

  const slides = Array.from(stage.querySelectorAll(".stage-slide"));
  const n = slides.length;
  const part = (sel) => slides.map((s) => s.querySelector(sel));
  const cards = part(".stage-card");
  const frames = part(".stage-frame");
  const heads = part(".stage-head");
  const titles = part(".stage-title .roll");
  const metas = part(".stage-meta .roll");
  const captions = part(".stage-caption");
  const railLinks = Array.from(stage.querySelectorAll(".stage-rail a[data-go]"));
  const bars = Array.from(document.querySelectorAll(".bar"));
  if (!n || cards.some((c) => !c)) return;

  /* ---- the runway, in svh ---------------------------------------
     A rest on each project with a handover between each pair. The
     rests are what the snap lands on. */
  const REST = 36;
  const HAND = 85;
  const SEGS = [];
  for (let k = 0; k < n; k++) {
    SEGS.push({ kind: "rest", len: REST, k });
    if (k < n - 1) SEGS.push({ kind: "hand", len: HAND, k });
  }
  let acc = 0;
  SEGS.forEach((s) => { s.from = acc; acc += s.len; });
  const TOTAL = acc;

  /* ---- the handover's shape -------------------------------------
     Everything in a handover rides one sine curve, so the card, the
     names and the ground all cross at its middle together. The card
     coming up starts below the fold; the one it covers sinks back
     this far: a little smaller, a little lower, and most of the way
     into the ground. */
  const SINK = { scale: 0.06, drop: 18, dim: 0.6 };
  // how far below the frame's bottom edge the arriving card starts,
  // so not even its corner shows before it is due
  const UNDER = 12;
  // how far into a handover the wheel has to carry the page before
  // the snap finishes it rather than settling back
  const COMMIT = 0.1;
  // the quiet after the last wheel event at which the snap decides
  const SNAP_IDLE = 140;

  /* ---- maths ---- */
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  // the page's handovers ride on sine curves: their steepest point
  // moves things about one and a half times as fast as the scroll
  // does, where a cubic moved them three times as fast
  const inOut = (t) => (1 - Math.cos(Math.PI * t)) / 2;
  const band = (a, b, t) => {
    const x = clamp((t - a) / (b - a));
    return x * x * (3 - 2 * x);
  };

  /* ---- colour -----------------------------------------------------
     Grounds blend in Oklab, the same reason the silk field is mixed
     there: two blues crossed in sRGB go grey at the midpoint. */
  const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

  function parse(str) {
    const s = str.trim();
    if (s[0] === "#") {
      const v = parseInt(s.slice(1), 16);
      return [(v >> 16) & 255, (v >> 8) & 255, v & 255, 1];
    }
    const m = s.match(/[\d.]+/g) || [0, 0, 0];
    return [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]];
  }

  function oklab([r, g, b]) {
    const [R, G, B] = [r, g, b].map((c) => toLin(c / 255));
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  }

  function css([L, a, b]) {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
    const rgb = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map((c) => Math.round(clamp(toSrgb(clamp(c))) * 255));
    return `rgb(${rgb.join(", ")})`;
  }

  const INKS = ["--st-ground", "--st-title", "--st-text", "--st-soft", "--st-accent"];

  /* read each ground's values off its slide — home.css is the only
     place they are written — while the slides still carry them */
  function readPalettes() {
    grounds = slides.map((s) => getComputedStyle(s).getPropertyValue("--st-ground").trim());
    accents = slides.map((s) => getComputedStyle(s).getPropertyValue("--st-accent").trim());
    return slides.map((s) => {
      const cs = getComputedStyle(s);
      const p = {};
      INKS.forEach((k) => { p[k] = oklab(parse(cs.getPropertyValue(k))); });
      p.halo = parse(cs.getPropertyValue("--st-halo"));
      return p;
    });
  }

  /* the ground follows the handover; the inks switch across its
     middle third, so type is never set on a ground halfway to its
     own colour for longer than it has to be */
  function mix(a, b, t) {
    const e = inOut(t);
    const f = band(0.35, 0.65, t);
    const out = {};
    INKS.forEach((k) => {
      const w = k === "--st-ground" ? e : f;
      out[k] = css(a[k].map((v, i) => lerp(v, b[k][i], w)));
    });
    const h = a.halo.map((v, i) => lerp(v, b.halo[i], f));
    out["--st-halo"] = `rgba(${h.slice(0, 3).map(Math.round).join(", ")}, ${h[3].toFixed(3)})`;
    return out;
  }

  function flat(p) {
    return mix(p, p, 0);
  }

  /* ---- shared state ---- */
  let pal = [];
  let detach = null;
  let geo = null;
  let colours = null;
  let at = 0;
  let grounds = [];
  let accents = [];

  /* for whatever paints behind the stage (bridge.js): where the
     runway is, the ground it has blended to, and each project's own */
  window.WorkStage = {
    get at() { return at; },
    get ground() { return colours ? colours["--st-ground"] : null; },
    groundOf: (k) => grounds[k] || null,
    // the colour of the sharp lines in the ground's folds: blended
    // with the inks, so it changes over as the names do
    get accent() { return colours ? colours["--st-accent"] : null; },
    accentOf: (k) => accents[k] || null,
  };

  /* how far the first ground reaches up past the stage. A bridge
     that darkens the way down to it sets this (bridge.js), so the
     chrome takes the ground's ink as soon as it is over deep water
     rather than when the stage's own edge arrives. */
  const reach = () => parseFloat(work.style.getPropertyValue("--ground-above")) || 0;

  /* ---- the chrome over a ground ---------------------------------
     The bars take a ground's ink, exactly as they step up over the
     field (chrome.js). Pinned, nothing scrolls under them, so the
     paper scrim goes and they sit on the ground itself — the footer
     included, because the stage sinks its cards into the ground
     across the footer's band (home.css). Stacked, copy does scroll
     under them, so the scrim stays — in the ground's own colour,
     passed as bg. Over a stacked card they keep the paper scrim:
     the screenshots are paper-light, and a ground's light ink would
     vanish on them. Each bar is only written when what it shows
     changes. */
  const shown = new Map();
  function setBar(bar, ink, halo, bg) {
    const key = ink ? `${ink}|${halo}|${bg || ""}` : "";
    if (shown.get(bar) === key) return;
    shown.set(bar, key);
    bar.classList.toggle("on-ground", !!ink);
    bar.classList.toggle("on-ground--scrim", !!(ink && bg));
    if (!ink) return;
    bar.style.setProperty("--ground-ink", ink);
    bar.style.setProperty("--ground-halo", halo);
    if (bg) bar.style.setProperty("--ground-bg", bg);
  }

  function clearBars() {
    bars.forEach((b) => {
      b.classList.remove("on-ground", "on-ground--scrim");
      shown.delete(b);
      ["--ground-ink", "--ground-halo", "--ground-bg"].forEach((k) => b.style.removeProperty(k));
    });
  }

  // the bars are fixed, so where their middles sit only changes
  // with the window
  const barMids = () => bars.map((b) => {
    const r = b.getBoundingClientRect();
    return r.top + r.height / 2;
  });

  /* the column grid steps back by however much of the viewport the
     grounds are covering */
  function fadeGrid(r = stage.getBoundingClientRect()) {
    const vh = window.innerHeight;
    const cover = clamp((Math.min(vh, r.bottom) - Math.max(0, r.top - reach())) / vh);
    root.style.setProperty("--grid-a", (1 - cover).toFixed(3));
  }

  /* ================================================================
     PINNED
     ================================================================ */

  /* Every slide's head and caption take the tallest one's height, so
     a name that wraps or a longer paragraph cannot push one card off
     the line the others hang from. The card's width is the
     container's and its height is the rest of the screen, so nothing
     else here needs sizing. */
  function measure() {
    stage.style.removeProperty("--head-h");
    stage.style.removeProperty("--cap-h");
    const headH = Math.max(...heads.map((h) => h.offsetHeight));
    const capH = Math.max(...captions.map((c) => c.offsetHeight));
    stage.style.setProperty("--head-h", headH + "px");
    stage.style.setProperty("--cap-h", capH + "px");

    geo = {
      // from resting to wholly under the fold
      rise: frames[0].offsetHeight + UNDER,
      travel: work.offsetHeight - stage.offsetHeight,
      mids: barMids(),
    };
  }

  /* where the runway is, `into` px past the section's top: which
     segment, and how far through it */
  function locate(into) {
    // still rising under the hero: the first project, at rest
    if (into <= 0 || !geo.travel) return { seg: SEGS[0], t: 0, P: 0 };
    const x = clamp(into / geo.travel) * TOTAL;
    let seg = SEGS[SEGS.length - 1];
    for (const s of SEGS) {
      if (x < s.from + s.len) { seg = s; break; }
    }
    const t = clamp((x - seg.from) / seg.len);
    const P = seg.kind === "rest" ? seg.k : seg.k + t;
    return { seg, t, P };
  }

  /* one card, at d = how far past it the stage is (-1 arriving,
     0 resting, 1 gone) */
  function placeCard(i, d) {
    const c = cards[i];
    let ty = 0;
    let sc = 1;
    let op = 1;

    if (d > -1 && d < 0) {
      // arriving: up from under the fold, over the one at rest,
      // settling as it lands
      ty = (1 - inOut(1 + d)) * geo.rise;
    } else if (d > 0 && d < 1) {
      // covered: sinks back under the one arriving
      const e = inOut(d);
      sc = 1 - SINK.scale * e;
      ty = SINK.drop * e;
      op = 1 - SINK.dim * e;
    } else if (d !== 0) {
      op = 0;
    }

    c.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) scale(${sc.toFixed(4)})`;
    c.style.opacity = op.toFixed(3);
  }

  /* a title or meta line rolling through its mask: -1 → 0 comes up
     from below, 0 → 1 carries on up and out */
  function roll(el, d, lagIn, lagOut) {
    let y;
    if (d <= -1) y = 108;
    else if (d < 0) y = (1 - inOut(clamp((1 + d - lagIn) / (1 - lagIn)))) * 108;
    else if (d < 1) y = -inOut(clamp(d / (1 - lagOut))) * 108;
    else y = -108;
    el.style.transform = `translateY(${y.toFixed(2)}%)`;
  }

  function paintSlide(i, P) {
    const d = P - i;
    const lit = d > -1 && d < 1;
    const s = slides[i];
    s.classList.toggle("is-live", Math.abs(d) < 0.02);
    if (!lit) {
      // out of frame: put it in its waiting (or gone) state once, so a
      // fast scroll that skips past can never leave it half drawn
      const side = d <= -1 ? -1 : 1;
      if (s.dataset.out === String(side)) return;
      s.dataset.out = String(side);
      cards[i].style.opacity = "0";
      roll(titles[i], side, 0, 0);
      roll(metas[i], side, 0, 0);
      captions[i].style.opacity = "0";
      return;
    }
    delete s.dataset.out;

    placeCard(i, d);
    roll(titles[i], d, 0.2, 0.2);
    roll(metas[i], d, 0.35, 0.35);

    const a = d < 0 ? band(0.55, 1, 1 + d) : 1 - band(0, 0.4, d);
    const cap = captions[i];
    cap.style.opacity = a.toFixed(3);
    cap.style.transform = `translateY(${((1 - a) * (d < 0 ? 10 : -10)).toFixed(1)}px)`;
  }

  /* the bars sit over the stage's ground, or off the stage entirely.
     While the stage is still rising or letting go, its copy moves
     under the bars, so they keep a scrim in the ground's colour;
     pinned, nothing moves under them and they sit on the ground
     itself. */
  function paintChrome(sr) {
    const moving = Math.abs(sr.top) > 0.5;
    const above = reach();
    bars.forEach((bar, j) => {
      const mid = geo.mids[j];
      if (mid < sr.top - above || mid > sr.bottom) return setBar(bar, null);
      setBar(bar, colours["--st-title"], colours["--st-halo"], moving ? colours["--st-ground"] : null);
    });
  }

  // the stage's colours, written only when the blend has moved them
  const written = {};
  function writeColours() {
    Object.keys(colours).forEach((k) => {
      if (written[k] === colours[k]) return;
      written[k] = colours[k];
      stage.style.setProperty(k, colours[k]);
    });
  }

  /* every read comes before every write, so a frame never forces the
     page to lay itself out halfway through */
  function paint() {
    if (!geo) return;
    const into = -work.getBoundingClientRect().top;
    const sr = stage.getBoundingClientRect();
    const { P } = locate(into);
    at = P;
    const i = clamp(Math.floor(P), 0, n - 2);
    colours = mix(pal[i], pal[i + 1], clamp(P - i));
    writeColours();

    for (let j = 0; j < n; j++) paintSlide(j, P);

    const on = clamp(Math.round(P), 0, n - 1);
    railLinks.forEach((a, j) => {
      a.classList.toggle("on", j === on);
      if (j === on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });

    paintChrome(sr);
    fadeGrid(sr);
  }

  /* ---- scrolling to a place on the runway ---- */
  const workTop = () => work.getBoundingClientRect().top + window.scrollY;
  const yAt = (x) => workTop() + (x / TOTAL) * geo.travel;

  // a snap corrects where the wheel was going and leaves the wheel's
  // own aim alone; a jump (the rail, a link, focus) is a new place to go
  function glide(y, snap = false) {
    const S = window.Scroller;
    if (S && S.glide) S.glide(y, { snap });
    else if (S) S.to(y);
    else window.scrollTo({ top: y, behavior: "smooth" });
  }

  // a rest, a little way in, so a landing never sits on a boundary
  function restX(k) {
    const s = SEGS.find((g) => g.kind === "rest" && g.k === k);
    return s.from + s.len * 0.12;
  }

  const goTo = (k) => glide(yAt(restX(k)));

  /* the snap: a move the wheel leaves unfinished is finished. Past a
     tenth of a handover in the direction you were going, it carries
     on; short of that, it settles back where you came from. `into`
     is where the page is headed, not where it is. */
  function snapTo(dir, into) {
    if (!geo) return null;
    const { seg, t } = locate(into);
    if (seg.kind === "rest" || t <= 0.002 || t >= 0.998) return null;
    // how far the page has come in the direction it is going
    const come = dir > 0 ? t : 1 - t;
    const commit = come > COMMIT;
    const later = dir > 0 ? commit : !commit;
    return { commit, y: yAt(later ? restX(seg.k + 1) : seg.from - REST * 0.12) };
  }

  function snap(dir, into) {
    const s = snapTo(dir, into);
    if (s) glide(s.y, true);
  }

  /* The pictures are big now, and a 2880px screenshot decoded for the
     first time on the frame it comes up costs that frame. Decode them
     all as the stage mounts. A picture that fails to load has nothing
     to recover here: the card shows the browser's own broken image,
     as it would without this. */
  function warm() {
    cards.forEach((c) => {
      const img = c.querySelector("img");
      if (!img) return;
      img.loading = "eager";
      if (img.decode) img.decode().catch(() => {});
    });
  }

  function mountPinned() {
    work.classList.remove("is-pinned");
    pal = readPalettes();
    work.classList.add("is-pinned");
    work.style.setProperty("--runway", `calc(100svh + ${TOTAL}svh)`);
    measure();
    warm();

    let ticking = false;
    let lastY = window.scrollY;
    let dir = 1;
    let lastKey = -1e9;
    let wheelIdle = 0;
    let keyIdle = 0;

    const onScroll = () => {
      const y = window.scrollY;
      if (y !== lastY) dir = y > lastY ? 1 : -1;
      lastY = y;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          paint();
        });
      }
      // a scrolling key moves the page natively, with no target to
      // read ahead, so its snap waits for the page to come to rest
      if (performance.now() - lastKey < 1500) {
        clearTimeout(keyIdle);
        const d = dir;
        keyIdle = setTimeout(() => {
          const s = snapTo(d, -work.getBoundingClientRect().top);
          if (s) glide(s.y);
        }, 170);
      }
    };
    // The wheel's snap reads where the wheel alone would have put the
    // page (Scroller.aim), not where it is. A wheel that carries that
    // past the commit point finishes the handover there and then,
    // while the page still has the speed to hand on, so the move never
    // slows and picks up again. One that stops short waits for the
    // wheel to go quiet, then settles back. Reading the aim rather
    // than the snap's own destination is what keeps a wheel's travel
    // what it always was: notches after a snap count from where the
    // wheel had got to, not from the rest the snap is heading for.
    // Never after touch, whose own momentum it would fight.
    const headed = () => {
      const S = window.Scroller;
      const y = S ? (S.aim !== undefined ? S.aim : S.target) : window.scrollY;
      return y - workTop();
    };
    const onWheel = (e) => {
      if (e.ctrlKey || !e.deltaY) return;
      // the page's scroller takes a wheel by cancelling it; one it
      // left alone (a nested scroller, a locked page) is not the
      // page's to move
      if (window.Scroller && !e.defaultPrevented) return;
      const d = e.deltaY > 0 ? 1 : -1;
      dir = d;
      clearTimeout(wheelIdle);
      const s = snapTo(d, headed());
      if (s && s.commit) return glide(s.y, true);
      wheelIdle = setTimeout(() => snap(d, headed()), SNAP_IDLE);
    };
    const SCROLL_KEYS = new Set([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"]);
    const onKey = (e) => { if (SCROLL_KEYS.has(e.key)) lastKey = performance.now(); };
    // tabbing into a project that is not showing brings it on stage
    const onFocus = (e) => {
      const k = slides.findIndex((s) => s.contains(e.target));
      if (k < 0 || slides[k].classList.contains("is-live")) return;
      goTo(k);
    };
    const onResize = () => {
      measure();
      paint();
    };
    // every way into the section lands on its project at rest, pinned,
    // rather than on the section's top edge with the stage still rising
    const onClick = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href").slice(1);
      const k = id === "work" ? 0 : slides.findIndex((s) => s.id === id);
      if (k < 0) return;
      e.preventDefault();
      goTo(k);
      history.replaceState(null, "", "#" + id);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("click", onClick, true);
    stage.addEventListener("focusin", onFocus);
    paint();

    return () => {
      clearTimeout(wheelIdle);
      clearTimeout(keyIdle);
      // a glide still heading for a rest on the runway being taken
      // down would land somewhere that no longer means anything
      if (window.Scroller) window.Scroller.sync();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("click", onClick, true);
      stage.removeEventListener("focusin", onFocus);
      work.classList.remove("is-pinned");
      work.style.removeProperty("--runway");
      INKS.concat("--st-halo", "--head-h", "--cap-h").forEach((k) => stage.style.removeProperty(k));
      Object.keys(written).forEach((k) => delete written[k]);
      slides.forEach((s) => {
        s.classList.remove("is-live");
        delete s.dataset.out;
      });
      [...cards, ...titles, ...metas, ...captions].forEach((el) => {
        el.style.removeProperty("transform");
        el.style.removeProperty("opacity");
      });
      railLinks.forEach((a) => { a.classList.remove("on"); a.removeAttribute("aria-current"); });
      geo = null;
    };
  }

  /* ================================================================
     STACKED
     ================================================================ */

  function mountStacked() {
    pal = readPalettes().map(flat);
    let io = null;
    if (!REDUCED) {
      work.classList.add("is-reveal");
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          });
        },
        { threshold: 0.3 }
      );
      slides.forEach((s) => io.observe(s));
    }

    let ticking = false;
    const sync = () => {
      ticking = false;
      bars.forEach((bar) => {
        const b = bar.getBoundingClientRect();
        const mid = b.top + b.height / 2;
        const above = reach();
        const i = slides.findIndex((s, k) => {
          const r = s.getBoundingClientRect();
          return mid >= r.top - (k ? 0 : above) && mid <= r.bottom;
        });
        if (i < 0) return setBar(bar, null);
        const c = cards[i].getBoundingClientRect();
        if (mid >= c.top && mid <= c.bottom) return setBar(bar, null);
        setBar(bar, pal[i]["--st-title"], pal[i]["--st-halo"], pal[i]["--st-ground"]);
      });
      fadeGrid();
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    sync();

    return () => {
      if (io) io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      work.classList.remove("is-reveal");
    };
  }

  /* ================================================================ */

  function mount() {
    if (detach) detach();
    clearBars();
    root.style.removeProperty("--grid-a");
    detach = wide.matches && !REDUCED ? mountPinned() : mountStacked();
  }

  mount();
  wide.addEventListener("change", mount);

  // the copy's height sets where the cards hang, and it settles with
  // the web font
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (!geo) return;
      measure();
      paint();
    });
  }

  // a deep link to a project has to become a place on the runway.
  // The browser makes its own jump to the anchor once the page has
  // loaded, which would land mid-handover, so this goes after it. A
  // reload or a back/forward restores its own position, and that wins:
  // the hash is only where the visitor was when they clicked.
  const hash = (location.hash || "").slice(1);
  const deep = hash === "work" ? 0 : slides.findIndex((s) => s.id === hash);
  const nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  const restored = nav && (nav.type === "reload" || nav.type === "back_forward");
  if (deep > -1 && !restored) {
    const land = () => {
      if (!geo) return;
      window.scrollTo(0, yAt(restX(deep)));
      if (window.Scroller) window.Scroller.sync();
    };
    if (document.readyState === "complete") requestAnimationFrame(land);
    else window.addEventListener("load", () => requestAnimationFrame(land), { once: true });
  }
})();
