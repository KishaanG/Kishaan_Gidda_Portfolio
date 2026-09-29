"use strict";

/* ============================================================
   Kishaan Gidda — the work stage

   Desktop: the section is a runway and the stage sticks inside
   it. The first thing under the hero is PoleLab itself, full
   bleed; the stage pins and pulls back from it until it is a
   card with its name rolled up over it. From there scroll hands
   each project to the next. The card leaving tips toward you and
   drops away, the next rises from behind it, the names roll over
   through their masks, and the ground blends from one blue to the
   next. Every frame is a pure function of scroll position, so
   going back up plays it all in reverse.

   When the wheel stops mid-handover the page glides on to the
   nearer rest in the direction it was going, so a flick always
   finishes the move it started — the reference's feel, without
   ever taking the scroll away from you.

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
  const rail = stage.querySelector(".stage-rail");
  const railLinks = Array.from(stage.querySelectorAll(".stage-rail a[data-go]"));
  const bars = Array.from(document.querySelectorAll(".bar"));
  if (!n || cards.some((c) => !c)) return;

  /* ---- the runway, in svh ---------------------------------------
     The pull-back, then a rest on each project with a handover
     between each pair. The rests are what the snap lands on. */
  const INTRO = 80;
  const REST = 36;
  const HAND = 85;
  const SEGS = [{ kind: "intro", len: INTRO, k: 0 }];
  for (let k = 0; k < n; k++) {
    SEGS.push({ kind: "rest", len: REST, k });
    if (k < n - 1) SEGS.push({ kind: "hand", len: HAND, k });
  }
  let acc = 0;
  SEGS.forEach((s) => { s.from = acc; acc += s.len; });
  const TOTAL = acc;

  /* ---- maths ---- */
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
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

  const INKS = ["--st-ground", "--st-title", "--st-text", "--st-soft"];

  /* read each ground's values off its slide — home.css is the only
     place they are written — while the slides still carry them */
  function readPalettes() {
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

  /* ---- the chrome over a ground ---------------------------------
     The bars take a ground's ink, exactly as they step up over the
     field (chrome.js). Pinned, nothing scrolls under them, so the
     paper scrim goes and they sit on the ground itself. Stacked, copy
     does scroll under them, so the scrim stays — in the ground's own
     colour, passed as bg. Over a card they keep the paper scrim: the
     screenshots are paper-light, and a ground's light ink would
     vanish on them. */
  function setBar(bar, ink, halo, bg) {
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
      ["--ground-ink", "--ground-halo", "--ground-bg"].forEach((k) => b.style.removeProperty(k));
    });
  }

  /* the column grid steps back by however much of the viewport the
     grounds are covering */
  function fadeGrid() {
    const r = stage.getBoundingClientRect();
    const vh = window.innerHeight;
    const cover = clamp((Math.min(vh, r.bottom) - Math.max(0, r.top)) / vh);
    root.style.setProperty("--grid-a", (1 - cover).toFixed(3));
  }

  /* ================================================================
     PINNED
     ================================================================ */

  function measure() {
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    const cs = getComputedStyle(slides[0]);
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const gap = parseFloat(cs.rowGap) || 0;
    // every slide's head and caption take the tallest one's height,
    // so a name that wraps cannot push its card out of line with the
    // others — they all rest in exactly the same slot
    stage.style.removeProperty("--head-h");
    stage.style.removeProperty("--cap-h");
    const headH = Math.max(...heads.map((h) => h.offsetHeight));
    stage.style.setProperty("--head-h", headH + "px");
    // the card keeps clear of the rail, and stays centred, so the
    // same margin comes off both sides
    const side = rail.offsetLeft + rail.offsetWidth + 40;
    const availW = Math.max(320, vw - side * 2);

    // the caption's height depends on the card's width, which depends
    // on the caption's height. A narrower card can only wrap the
    // caption onto more lines, so keeping the tallest height seen
    // walks one way to a width that fits, in a pass or two. The
    // caption never goes narrower than CAP_MIN, or on a short screen
    // that walk runs away — each extra line shrinks the card, which
    // wraps the caption again.
    const CAP_MIN = Math.min(600, availW);
    let capH = 0;
    let w = 0;
    for (let pass = 0; pass < 4; pass++) {
      const availH = vh - pad - headH - capH - gap * 2;
      w = Math.round(Math.max(280, Math.min(availW, availH * 1.6)));
      stage.style.setProperty("--card-w", w + "px");
      stage.style.setProperty("--cap-w", Math.max(w, CAP_MIN) + "px");
      const next = Math.max(...captions.map((c) => c.offsetHeight));
      if (next <= capH) break;
      capH = next;
    }
    // if the walk ran out of passes, size the card for the caption
    // height that is actually being reserved
    const fit = Math.round(Math.max(280, Math.min(availW, (vh - pad - headH - capH - gap * 2) * 1.6)));
    if (fit !== w) {
      w = fit;
      stage.style.setProperty("--card-w", w + "px");
      stage.style.setProperty("--cap-w", Math.max(w, CAP_MIN) + "px");
    }
    stage.style.setProperty("--cap-h", capH + "px");

    const sr = stage.getBoundingClientRect();
    const fr = frames[0].getBoundingClientRect();
    const slot = { x: fr.left - sr.left, y: fr.top - sr.top, w: fr.width, h: fr.height };
    // the first card is laid out large enough to cover the stage, so
    // it can open the section full bleed and be drawn down from there
    const S = Math.max(vw / slot.w, vh / slot.h) * 1.002;
    cards.forEach((c, i) => c.style.setProperty("--L", i === 0 ? S.toFixed(4) : "1"));
    const R = clamp(window.innerWidth * 0.02, 14, 30);

    geo = {
      vw, vh, slot, S, R,
      dx: vw / 2 - (slot.x + slot.w / 2),
      dy: vh / 2 - (slot.y + slot.h / 2),
      travel: work.offsetHeight - stage.offsetHeight,
    };
  }

  /* where the runway is: which segment, and how far through it */
  function locate() {
    const into = -work.getBoundingClientRect().top;
    if (into <= 0 || !geo.travel) return { seg: SEGS[0], t: 0, P: -1 };
    const x = clamp(into / geo.travel) * TOTAL;
    let seg = SEGS[SEGS.length - 1];
    for (const s of SEGS) {
      if (x < s.from + s.len) { seg = s; break; }
    }
    const t = clamp((x - seg.from) / seg.len);
    const P = seg.kind === "intro" ? t - 1 : seg.kind === "rest" ? seg.k : seg.k + t;
    return { seg, t, P };
  }

  /* one card, at d = how far past it the stage is (-1 arriving,
     0 resting, 1 gone) */
  function placeCard(i, d, P) {
    const c = cards[i];
    const { S, R, slot, dx, dy } = geo;
    const L = i === 0 ? S : 1;
    let s = 1 / L;
    let tx = 0, ty = 0, tz = 0, rx = 0, op = 1;
    let r = R * L;

    if (i === 0 && P < 0) {
      // the pull-back: scale moves geometrically and position follows
      // it, so this reads as a camera drawing back, not a box shrinking
      const e = inOut(P + 1);
      s = Math.pow(S, -e);
      const k = (S * s - 1) / (S - 1);
      tx = k * dx;
      ty = k * dy;
      r = (R * e) / s;
    } else if (d > -1 && d < 0) {
      // arriving: up from behind the one leaving, and straightening
      const t = 1 + d;
      const e = inOut(t);
      tz = -(1 - e) * 140;
      rx = (1 - e) * 9;
      op = band(0, 0.55, t);
    } else if (d > 0 && d < 1) {
      // leaving: tips toward you and drops away
      const e = inOut(d);
      ty = e * slot.h * 0.7;
      tz = e * 160;
      rx = -e * 22;
      op = 1 - band(0.15, 0.8, d);
    } else if (d !== 0) {
      op = 0;
    }

    c.style.transform =
      `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, ${tz.toFixed(1)}px) ` +
      `rotateX(${rx.toFixed(2)}deg) scale(${s.toFixed(5)})`;
    c.style.opacity = op.toFixed(3);
    c.style.setProperty("--r-l", r.toFixed(2) + "px");
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
    const intro = i === 0 && P < 0;
    const lit = intro || (d > -1 && d < 1);
    const s = slides[i];
    s.classList.toggle("is-leaving", d > 0 && d < 1);
    s.classList.toggle("is-live", P >= 0 && Math.abs(d) < 0.02);
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

    placeCard(i, d, P);
    // in the pull-back the name waits for the card to clear its line
    const u = P + 1;
    const dt = intro ? -1 + band(0.45, 1, u) : d;
    const dm = intro ? -1 + band(0.62, 1, u) : d;
    roll(titles[i], dt, intro ? 0 : 0.2, 0.2);
    roll(metas[i], dm, intro ? 0 : 0.4, 0.4);

    let a;
    if (intro) a = band(0.75, 1, u);
    else if (d < 0) a = band(0.6, 1, 1 + d);
    else a = 1 - band(0, 0.35, d);
    const cap = captions[i];
    cap.style.opacity = a.toFixed(3);
    cap.style.transform = `translateY(${((1 - a) * (d < 0 || intro ? 12 : -12)).toFixed(1)}px)`;
  }

  function paintChrome(P) {
    const sr = stage.getBoundingClientRect();
    const intro = P < 0;
    // the first card's drawn box while it is being pulled back
    let card = null;
    if (intro) {
      const e = inOut(P + 1);
      const s = Math.pow(geo.S, -e) * geo.S;
      const k = (s - 1) / (geo.S - 1);
      const h = geo.slot.h * s;
      const w = geo.slot.w * s;
      const cy = sr.top + geo.slot.y + geo.slot.h / 2 + k * geo.dy;
      card = { top: cy - h / 2, bottom: cy + h / 2, wide: w > geo.vw * 0.8 };
    }
    bars.forEach((bar) => {
      const b = bar.getBoundingClientRect();
      const mid = b.top + b.height / 2;
      if (mid < sr.top || mid > sr.bottom) return setBar(bar, null);
      if (card && card.wide && mid >= card.top && mid <= card.bottom) return setBar(bar, null);
      setBar(bar, colours["--st-title"], colours["--st-halo"]);
    });
  }

  function paint() {
    if (!geo) return;
    const { P } = locate();
    const i = clamp(Math.floor(P), 0, n - 2);
    colours = P <= 0 ? flat(pal[0]) : mix(pal[i], pal[i + 1], clamp(P - i));
    Object.keys(colours).forEach((k) => stage.style.setProperty(k, colours[k]));

    for (let j = 0; j < n; j++) paintSlide(j, P);

    const on = clamp(Math.round(P), 0, n - 1);
    railLinks.forEach((a, j) => {
      a.classList.toggle("on", j === on);
      if (j === on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    const ra = P < 0 ? band(0.7, 1, P + 1) : 1;
    stage.style.setProperty("--rail-a", ra.toFixed(3));
    rail.classList.toggle("is-hidden", ra < 0.01);

    paintChrome(P);
    fadeGrid();
  }

  /* ---- scrolling to a place on the runway ---- */
  function yAt(x) {
    const top = work.getBoundingClientRect().top + window.scrollY;
    return top + (x / TOTAL) * geo.travel;
  }

  function glide(y) {
    if (window.Scroller) window.Scroller.to(y);
    else window.scrollTo({ top: y, behavior: "smooth" });
  }

  // a rest, a little way in, so a landing never sits on a boundary
  function restX(k) {
    const s = SEGS.find((g) => g.kind === "rest" && g.k === k);
    return s.from + s.len * 0.12;
  }

  const goTo = (k) => glide(yAt(restX(k)));

  /* the snap: a wheel that stops mid-move finishes it. Past a tenth
     of a handover in the direction you were going, it carries on;
     short of that, it settles back where you came from. */
  function snap(dir) {
    const { seg, t } = locate();
    if (seg.kind === "rest" || t <= 0.002 || t >= 0.998) return;
    const on = dir > 0 ? t > 0.1 : t > 0.9;
    let x;
    if (seg.kind === "intro") x = on ? restX(0) : 0;
    else x = on ? restX(seg.k + 1) : seg.from - REST * 0.12;
    glide(yAt(x));
  }

  function mountPinned() {
    work.classList.remove("is-pinned");
    pal = readPalettes();
    work.classList.add("is-pinned");
    work.style.setProperty("--runway", `calc(100svh + ${TOTAL}svh)`);
    measure();

    let ticking = false;
    let lastY = window.scrollY;
    let dir = 1;
    let lastInput = -1e9;
    let idle = 0;

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
      clearTimeout(idle);
      if (performance.now() - lastInput < 1500) idle = setTimeout(() => snap(dir), 170);
    };
    // the snap arms after a wheel or a scrolling key — never after touch,
    // whose own momentum it would fight
    const arm = () => { lastInput = performance.now(); };
    const SCROLL_KEYS = new Set([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"]);
    const onKey = (e) => { if (SCROLL_KEYS.has(e.key)) arm(); };
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
    // every way into the section lands on the first project at rest,
    // not on the top of the runway with the card still full bleed
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
    window.addEventListener("wheel", arm, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("click", onClick, true);
    stage.addEventListener("focusin", onFocus);
    paint();

    return () => {
      clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", arm);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("click", onClick, true);
      stage.removeEventListener("focusin", onFocus);
      work.classList.remove("is-pinned");
      work.style.removeProperty("--runway");
      INKS.concat("--st-halo", "--card-w", "--cap-w", "--rail-a", "--head-h", "--cap-h").forEach((k) => stage.style.removeProperty(k));
      slides.forEach((s) => {
        s.classList.remove("is-leaving", "is-live");
        delete s.dataset.out;
      });
      rail.classList.remove("is-hidden");
      [...cards, ...titles, ...metas, ...captions].forEach((el) => {
        el.style.removeProperty("transform");
        el.style.removeProperty("opacity");
      });
      cards.forEach((c) => { c.style.removeProperty("--L"); c.style.removeProperty("--r-l"); });
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
        const i = slides.findIndex((s) => {
          const r = s.getBoundingClientRect();
          return mid >= r.top && mid <= r.bottom;
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

  // the title's height feeds the card's size, and it settles with
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
