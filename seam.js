"use strict";

/* ============================================================
   Kishaan Gidda — the seam between the work stage and the flight
   ------------------------------------------------------------
   The work stage used to let go of CyberSci and scroll away while
   the flight rose under it: two slabs passing, with a hard line
   where one ended. Now the two never pass. For one stretch of
   scroll both are pinned at once — the work stage on top, the
   flight already pinned underneath — and nothing crosses the
   screen at all.

   Over that stretch CyberSci hands over to the flight the way
   every project hands over to the next (work.js): its name and
   meta line roll up out of their masks, its copy lifts away, its
   card sinks back into the ground. The red lines settle out of the
   water, so no accent is left crossing the sky, and then the ground
   itself clears. Under it the flight is already gliding in, so the
   world arrives moving rather than switched on, and arrives on the
   flight's opening frame at the flight's own speed.

   Every frame is a pure function of scroll, through the flight's
   own camera lag, so going back up plays it all in reverse.
   ============================================================ */

(() => {
  const LEN = 120;      // svh of scroll the seam takes
  const LEAVE = 0.42;   // of the seam, the last project's handover
  const RELEASE = 0.55; // the bars take the flight's ink from here
  const GLIDE = 6;      // world units the camera glides in from

  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const smooth = (a, b, t) => {
    const x = clamp((t - a) / (b - a));
    return x * x * (3 - 2 * x);
  };
  const addS = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

  /* A cubic from rest at p0 to p1 arriving with velocity m1 (per
     unit of seam progress): the camera eases off and is handed to
     the flight at the speed the flight's first move leaves at. */
  function hermite(p0, p1, m1, u) {
    const c = -2 * u * u * u + 3 * u * u;
    const d = u * u * u - u * u;
    if (typeof p0 === "number") return p0 + c * (p1 - p0) + d * m1;
    return [0, 1, 2].map((i) => p0[i] + c * (p1[i] - p0[i]) + d * m1[i]);
  }

  window.XpSeam = {
    /* what the flight needs before it lays out its runway: the seam's
       length, or nothing where the work stage is not pinned */
    pick() {
      const work = document.querySelector(".work.is-pinned");
      if (!work || !window.WorkStage || !window.WorkStage.setSeam) return null;
      return { len: LEN };
    },

    /* The flight mounts the seam once it has its camera. f carries the
       flight's section, and its opening pose with that pose's velocity
       per svh of scroll. */
    attach(f) {
      const work = document.querySelector(".work");
      const stage = work && work.querySelector("[data-stage]");
      const Stage = window.WorkStage;
      if (!stage || !Stage) return null;

      const slides = stage.querySelectorAll(".stage-slide");
      const last = slides[slides.length - 1];
      // work.js never writes these two's opacity: the last project's
      // head (its name's descenders hang below the mask once it has
      // rolled out) and the rail, which counts projects the page has
      // left. Both go with the handover rather than with the ground.
      const parts = [last && last.querySelector(".stage-head"), stage.querySelector(".stage-rail")]
        .filter(Boolean);

      Stage.setSeam(LEN, LEAVE);
      work.classList.add("has-seam");
      f.sec.classList.add("has-seam");
      f.sec.style.setProperty("--seam-len", LEN + "svh");

      /* the camera: the opening pose, set back along its own direction
         of travel, gliding in from rest */
      const { end } = f;
      const k = GLIDE / (Math.hypot(...end.vel.eye) || 1);
      const from = { eye: addS(end.eye, end.vel.eye, -k), aim: addS(end.aim, end.vel.aim, -k) };
      const pose = (t) => {
        const u = clamp(t);
        return {
          eye: hermite(from.eye, end.eye, end.vel.eye.map((v) => v * LEN), u),
          aim: hermite(from.aim, end.aim, end.vel.aim.map((v) => v * LEN), u),
          roll: hermite(end.roll, end.roll, end.vel.roll * LEN, u),
        };
      };

      let state = "rest";
      function toRest() {
        if (state === "rest") return;
        state = "rest";
        stage.classList.remove("is-seam", "is-seam-gone");
        stage.style.removeProperty("opacity");
        parts.forEach((el) => el.style.removeProperty("opacity"));
        Stage.calm = 0;
        Stage.release(false);
      }
      function toGone() {
        if (state === "gone") return;
        state = "gone";
        stage.classList.add("is-seam", "is-seam-gone");
        Stage.release(true);
      }

      return {
        len: LEN,
        pose,

        /* t is the camera's progress (through the flight's lag), at the
           scroll's own, both seam fractions. Above the seam the stage is
           pinned and whole, whatever the camera is still catching up. */
        frame(t, at) {
          const p = at <= 0 ? 0 : clamp(t);
          if (p <= 0) return toRest();
          if (p >= 1) return toGone();
          state = "live";
          stage.classList.add("is-seam");
          stage.classList.remove("is-seam-gone");
          // the water stills while the card is sinking, before the
          // ground goes, so the red never crosses the sky
          Stage.calm = smooth(0.05, 0.35, p);
          stage.style.opacity = (1 - smooth(0.3, 0.82, p)).toFixed(3);
          const copy = (1 - smooth(0.12, 0.36, p)).toFixed(3);
          parts.forEach((el) => { el.style.opacity = copy; });
          Stage.release(p >= RELEASE);
        },

        /* the flight's readout, rail and panel arrive last */
        layers: (t) => ({ world: 1, ui: smooth(0.7, 1, t) }),

        /* the flight stopped drawing (scrolled well away): put the
           stage where scroll says it is, not where the lag left it */
        settle(at) {
          if (at <= 0) toRest();
          else if (at >= 1) toGone();
        },

        detach() {
          toRest();
          Stage.setSeam(0);
          work.classList.remove("has-seam");
          f.sec.classList.remove("has-seam");
          f.sec.style.removeProperty("--seam-len");
        },
      };
    },
  };
})();
