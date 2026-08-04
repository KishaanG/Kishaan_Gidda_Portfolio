"use strict";

/* ============================================================
   SkyClouds — shared vertical cloud-poof reveal
   As a target scrolls into view, clouds billow up around it
   and its .rise content settles into place. Used by both the
   home panels and the blog article.
   ============================================================ */

window.SkyClouds = (() => {
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CLOUDS_PER_BURST = 5;

  function addBurst(el) {
    if (el.querySelector(":scope > .cloud-burst")) return;
    el.classList.add("cloud-scene");
    const burst = document.createElement("span");
    burst.className = "cloud-burst";
    burst.setAttribute("aria-hidden", "true");
    for (let i = 0; i < CLOUDS_PER_BURST; i++) {
      const c = document.createElement("span");
      c.className = "bcloud";
      burst.appendChild(c);
    }
    // insert first so it stays behind the content
    el.insertBefore(burst, el.firstChild);
  }

  /**
   * mount({ targets, root, replay })
   *   targets : NodeList | Array | selector string
   *   root    : scroll container for the observer (null = viewport)
   *   replay  : re-run the poof each time the target re-enters view
   */
  function mount({ targets, root = null, replay = false } = {}) {
    const els =
      typeof targets === "string"
        ? Array.from((root || document).querySelectorAll(targets))
        : Array.from(targets || []);
    if (!els.length) return;

    els.forEach(addBurst);

    if (REDUCED) {
      els.forEach((el) => el.classList.add("shown"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("shown");
            if (!replay) io.unobserve(e.target);
          } else if (replay) {
            e.target.classList.remove("shown");
          }
        }
      },
      { root, threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    els.forEach((el) => io.observe(el));
    return io;
  }

  return { mount };
})();
