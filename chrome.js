"use strict";

/* ============================================================
   Kishaan Gidda — the chrome over the field
   ------------------------------------------------------------
   The fixed bars carry a paper scrim so body copy scrolling
   underneath never collides with the nav. Over paper that scrim
   is doing real work. Over the silk field it was doing the
   opposite: a blurred white slab banked across the top and the
   bottom of the first viewport, fogging the one thing the field
   exists to show — a clean fold running edge to edge.

   So the scrim is painted only where it is needed. This watches
   each bar's band against every field's SOLID range — not the
   host's box, because two of the three mounts ramp in or out
   under a mask, and the ramp is paper, not light. Each host
   declares that range as --field-from/--field-to, and builds its
   own mask from the same values, so the two can never disagree.

   The test is on the band's midline rather than any overlap:
   overlap alone flips the scrim off while a one-pixel sliver of
   field is showing, which reads as a flicker. The midline
   crossing lands the 260ms fade where the eye expects it.

   A field whose light runs down into a ground (bridge.js) can
   also declare --field-veil: from there to --field-to the bar
   keeps the field's ink but gets its scrim back, because that is
   the stretch where the cloth is darkening and no ink would hold
   on it bare.
   ============================================================ */

(() => {
  const bars = Array.from(document.querySelectorAll(".bar"));
  // the experience flight is a field too while it has the viewport.
  // A field mounted inside a declared host (About's, which sticks to
  // the viewport inside it) is measured by that host, which knows
  // where its own ramps are.
  const fields = Array.from(document.querySelectorAll(".silk-host, [data-field-host]"))
    .filter((el) => !(el.parentElement && el.parentElement.closest("[data-field-host]")));
  if (!bars.length || !fields.length) return;

  /* "42%" or "120px" against the host's own height. Percentages are
     what the masks are authored in; px is accepted so a mount can
     pin its ramp to a fixed distance if one ever needs to. */
  function resolve(value, height) {
    const n = parseFloat(value);
    if (!isFinite(n)) return null;
    return value.indexOf("%") >= 0 ? (n / 100) * height : n;
  }

  function solidRange(host) {
    const rect = host.getBoundingClientRect();
    const cs = getComputedStyle(host);
    const from = resolve(cs.getPropertyValue("--field-from").trim(), rect.height);
    const to = resolve(cs.getPropertyValue("--field-to").trim(), rect.height);
    const veil = resolve(cs.getPropertyValue("--field-veil").trim(), rect.height);
    return {
      top: rect.top + (from === null ? 0 : from),
      bottom: rect.top + (to === null ? rect.height : to),
      veil: veil === null ? null : rect.top + veil,
    };
  }

  let queued = false;

  function sync() {
    queued = false;
    const ranges = fields.map(solidRange);

    bars.forEach((bar) => {
      const band = bar.getBoundingClientRect();
      const mid = band.top + band.height / 2;
      const lit = ranges.some((r) => mid >= r.top && mid <= r.bottom);
      const veiled = ranges.some((r) => r.veil !== null && mid >= r.veil && mid <= r.bottom);
      bar.classList.toggle("on-field", lit);
      bar.classList.toggle("on-field--veil", veiled);
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);
  }

  sync();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });

  /* the hero is 100svh and the close section is sized off the
     viewport too, so a late web font settling can move both */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
})();
