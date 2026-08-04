"use strict";

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   Footer year
   ============================================================ */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ============================================================
   Scroll reveals — IntersectionObserver, ~20% threshold.
   Elements opt in with .reveal (+ .reveal-left / .reveal-right)
   and stagger via the --d custom property.
   ============================================================ */
(() => {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length || REDUCED_MOTION) {
    targets.forEach((el) => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
})();

/* ============================================================
   Liquid nav pill — a single white pill that flows between
   links: it stretches to span its current and target spots,
   then contracts onto the target. Follows hover, falls back
   to the active section on pointer-leave.
   ============================================================ */
(() => {
  const nav = document.querySelector(".nav");
  const pill = document.querySelector(".nav-pill");
  if (!nav || !pill) return;

  const STRETCH_MS = 170;
  let stretchTimer = null;
  let isHovering = false;
  let pillTarget = null;

  const activeLink = () => nav.querySelector(".nav-link.active");

  function setPillBounds(left, width) {
    pill.style.left = `${left}px`;
    pill.style.width = `${width}px`;
  }

  function placePill(link, instant) {
    if (!link) return;
    pillTarget = link;
    const target = { left: link.offsetLeft, width: link.offsetWidth };

    nav.querySelectorAll(".nav-link").forEach((l) =>
      l.classList.toggle("on-pill", l === link)
    );

    pill.style.top = `${link.offsetTop}px`;
    pill.style.height = `${link.offsetHeight}px`;

    clearTimeout(stretchTimer);

    if (instant || REDUCED_MOTION) {
      const prev = pill.style.transition;
      pill.style.transition = "none";
      setPillBounds(target.left, target.width);
      void pill.offsetWidth; // flush so the next move animates
      pill.style.transition = prev;
      return;
    }

    // liquid stretch: cover both current and target, then contract
    const cur = { left: pill.offsetLeft, width: pill.offsetWidth };
    if (cur.left === target.left && cur.width === target.width) return;

    const stretchLeft = Math.min(cur.left, target.left);
    const stretchRight = Math.max(cur.left + cur.width, target.left + target.width);
    setPillBounds(stretchLeft, stretchRight - stretchLeft);

    stretchTimer = setTimeout(() => {
      setPillBounds(target.left, target.width);
    }, STRETCH_MS);
  }

  // init once layout is settled
  function init() {
    nav.classList.add("js-pill");
    placePill(activeLink(), true);
  }
  if (document.readyState === "complete") init();
  else window.addEventListener("load", init);

  window.addEventListener("resize", () =>
    placePill(isHovering ? pillTarget : activeLink(), true)
  );

  nav.addEventListener("pointerover", (e) => {
    const link = e.target.closest(".nav-link");
    if (!link) return;
    isHovering = true;
    placePill(link);
  });

  nav.addEventListener("pointerleave", () => {
    isHovering = false;
    placePill(activeLink());
  });

  // follow scroll-spy active changes while the pointer is away
  // (guarded against the class changes placePill makes itself)
  new MutationObserver(() => {
    const active = activeLink();
    if (!isHovering && active && active !== pillTarget) placePill(active);
  }).observe(nav, { subtree: true, attributeFilter: ["class"] });
})();

/* ============================================================
   Active-section nav highlighting
   ============================================================ */
(() => {
  const links = document.querySelectorAll(".nav-link[data-section]");
  if (!links.length) return;

  function setActive(id) {
    links.forEach((l) => l.classList.toggle("active", l.dataset.section === id));
  }

  const sections = ["about", "experience", "projects", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(entry.target.id);
      }
    },
    // a horizontal band around the middle of the viewport
    { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
  );

  sections.forEach((s) => observer.observe(s));

  // fall back to Home when scrolled back to the top
  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY < window.innerHeight * 0.4) setActive("top");
    },
    { passive: true }
  );
})();

/* ============================================================
   Header — shrink on scroll, hide on scroll-down
   ============================================================ */
(() => {
  const header = document.getElementById("siteHeader");
  if (!header) return;

  const SHRINK_AT = 60;
  const MIN_DELTA = 10;
  let lastY = window.scrollY;

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (Math.abs(delta) < MIN_DELTA) return;

      header.classList.toggle("shrunk", y > SHRINK_AT);
      header.classList.toggle("hidden", delta > 0 && y > SHRINK_AT);
      lastY = y;
    },
    { passive: true }
  );
})();

/* ============================================================
   Hover-to-play videos (soccer clip in About)
   ============================================================ */
(() => {
  document.querySelectorAll("video.hover-play").forEach((v) => {
    v.pause();
    v.addEventListener("loadedmetadata", () => {
      v.currentTime = 0.01;
      v.pause();
    });

    const play = () => v.play().catch(() => {});
    const stop = () => {
      v.pause();
      v.currentTime = 0;
    };

    v.addEventListener("mouseenter", play);
    v.addEventListener("mouseleave", stop);
    v.addEventListener("focus", play);
    v.addEventListener("blur", stop);
  });
})();

/* ============================================================
   Fullscreen video modal
   ============================================================ */
(() => {
  const modal = document.getElementById("videoModal");
  const modalVideo = document.getElementById("modalVideo");
  if (!modal || !modalVideo) return;

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    modalVideo.pause();
    modalVideo.removeAttribute("src");
    modalVideo.load();
  }

  document.querySelectorAll(".video-thumb").forEach((v) => {
    v.addEventListener("click", () => {
      const src = v.querySelector("source")?.getAttribute("src") || v.currentSrc;
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      modalVideo.src = src;
      modalVideo.currentTime = 0;
      modalVideo.play().catch(() => {});
    });
  });

  modal.addEventListener("click", (e) => {
    if (!e.target.closest(".video-modal__content")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  });
})();
