"use strict";

/* ============================================================
   CyberSci — the demo
   ------------------------------------------------------------
   A competition has no interface to replay, so this plate reads
   out the record instead: the real results listing, then the
   standing it records — first of thirteen — as a timing tower.

   The other twelve teams are not named. The only name the record
   carries is ours, and the tower does not put words in the gaps.
   ============================================================ */

(() => {
  if (!window.Demos) return;
  const { clamp, EASE, timeline } = window.Demos.kit;

  const TEAMS = 13;

  function build(screen) {
    const rows = Array.from({ length: TEAMS }, (_, i) => {
      const p = i + 1;
      return p === 1
        ? `<li class="ct-row ct-row--us"><span class="ct-pos">01</span><span class="ct-bar"><i></i></span><span class="ct-name"><b>The Off-By-Ones</b><em>Carleton University &middot; first of ${TEAMS}</em></span></li>`
        : `<li class="ct-row"><span class="ct-pos">${String(p).padStart(2, "0")}</span><span class="ct-bar"><i></i></span></li>`;
    }).join("");

    screen.innerHTML = `
      <div class="ct">
        <figure class="ct-record">
          <img src="images/CyberSci.png" alt="" width="383" height="267" />
          <figcaption>Competition results &middot; Ottawa region</figcaption>
        </figure>
        <div class="ct-board">
          <p class="ct-k">Final standing &middot; ${TEAMS} teams</p>
          <ol class="ct-tower">${rows}</ol>
        </div>
      </div>`;

    const root = screen.querySelector(".ct");
    const $ = (s) => root.querySelector(s);
    const record = $(".ct-record");
    const img = $(".ct-record img");
    const cap = $(".ct-record figcaption");
    const rowEls = Array.from(root.querySelectorAll(".ct-row"));
    const us = $(".ct-row--us");
    const name = $(".ct-name");
    const k = $(".ct-k");

    const tl = timeline()
      .at(0.1, 0.8, (e) => {
        img.style.clipPath = `inset(0 0 ${((1 - e) * 100).toFixed(2)}% 0)`;
        record.style.opacity = String(clamp(e * 4));
      }, EASE.expo)
      .at(0.7, 0.4, (e) => { cap.style.opacity = String(e); })
      .at(0.9, 0.35, (e) => { k.style.opacity = String(e); });

    /* the tower fills from the back of the field to the front */
    rowEls.slice().reverse().forEach((r, i) =>
      tl.at(1.0 + i * 0.075, 0.45, (e) => {
        r.style.opacity = String(e);
        r.querySelector(".ct-bar i").style.transform = `scaleX(${e})`;
      })
    );
    tl.at(2.05, 0.7, (e) => {
      us.classList.toggle("is-lit", e > 0);
      name.style.clipPath = `inset(0 ${((1 - e) * 100).toFixed(2)}% 0 0)`;
    }, EASE.expo);

    return {
      width: 1000,
      height: 560,
      duration: 3.6,
      bare: true,
      caption: "<strong>CyberSci</strong> &middot; Ottawa regional &middot; Team &ldquo;The Off-By-Ones&rdquo;",
      source:
        '<a class="br" href="https://cybersecuritychallenge.ca/en/" target="_blank" rel="noreferrer">[ CyberSci &#8599; ]</a>',
      chapters: [
        { t: 0, label: "The record" },
        { t: 2.05, label: "First of thirteen" },
      ],
      render: (t) => tl.render(t),
    };
  }

  window.Demos.define("ctf", build);
})();
