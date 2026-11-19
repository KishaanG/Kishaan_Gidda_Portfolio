"use strict";

/* ============================================================
   Kishaan Gidda — the experience flight's callouts
   ------------------------------------------------------------
   While the camera rests on a job, its points stand on an arc in
   the right half of the stage, and a hairline runs out from the
   station to each one. The leaders leave the station as one
   line, run on behind its label, and only part at the label's
   far edge, so the job reads as the thing its points come from
   (DESIGN.md §6).

   Built from the ledger, which stays the record: each callout is
   a ledger <li>, its text the résumé's own line and its label
   the li's data-key. xp3d.js owns the camera and the frame; this
   module builds the callouts, measures where they sit, and draws
   their leaders on the flight's hairline canvas.
   ============================================================ */

(() => {
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const smooth = (t) => t * t * (3 - 2 * t);

  const INK = "39, 81, 126";
  const GAP = 18; // px of air between a leader's end and its callout
  const SHIFT = 26; // xp3d.js lowers a detail this far while e = 0
  const STAGGER = 0.07; // each leader leaves this much later than the last
  const LEAD_N = 40; // segments per leader

  /* per job, filled at build and at measure */
  const jobs = [];

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ---- build: the callouts go into a job's detail, after its date
     line. They sit on an arc about the station, so the middle ones
     stand furthest out and every leader is about as long. ---- */
  function build(stop, detail, k) {
    const items = stop.list ? Array.from(stop.list.children) : [];
    const n = items.length;
    const ol = el("ol", "xp-calls");
    const calls = items.map((li, i) => {
      const call = el("li", "xp-call");
      call.style.setProperty("--off", (n > 1 ? Math.sin((Math.PI * i) / (n - 1)) : 0).toFixed(3));
      call.append(
        el("span", "xp-call-key", li.dataset.key || ""),
        el("p", "xp-call-text", li.textContent.replace(/\s+/g, " ").trim())
      );
      ol.append(call);
      return call;
    });
    detail.append(ol);
    jobs[k] = { detail, n, e: 0, calls, anchors: [], knocks: [] };
  }

  /* ---- measure: anchors and knock-outs in stage px, as the callouts
     sit at rest. The detail's own settle transform is lifted while
     they are read, and the frame adds it back. ---- */
  const rel = (r, sr) => [r.left - sr.left, r.top - sr.top, r.right - sr.left, r.bottom - sr.top];

  function measure(stage) {
    const sr = stage.getBoundingClientRect();
    jobs.forEach((j) => {
      if (!j) return;
      const was = j.detail.style.transform;
      j.detail.style.transform = "none";
      j.anchors = j.calls.map((c) => {
        const r = c.getBoundingClientRect();
        const key = c.querySelector(".xp-call-key").getBoundingClientRect();
        return [r.left - sr.left - GAP, (key.top + key.bottom) / 2 - sr.top];
      });
      // the type, but not the air between callouts, where the leaders run
      const typed = [
        ...j.calls,
        j.detail.querySelector(".xp-detail-when"),
        j.detail.querySelector(".tags"),
      ].filter((t) => t && t.offsetParent);
      j.knocks = typed.map((t) => rel(t.getBoundingClientRect(), sr));
      j.detail.style.transform = was;
    });
  }

  /* ---- the frame: e is the job's settle, 0 → 1 as the camera
     arrives. Each callout shows only once its leader has reached
     it, a beat after the one above. ---- */
  const reachOf = (j, i) =>
    smooth(clamp((j.e - STAGGER * i) / Math.max(0.3, 1 - STAGGER * (j.n - 1))));

  function update(k, e) {
    const j = jobs[k];
    if (!j) return;
    j.e = e;
    j.calls.forEach((c, i) => {
      c.style.opacity = clamp((reachOf(j, i) - 0.55) / 0.45).toFixed(3);
    });
  }

  /* ---- the leaders. Called after the thread and the cubes, before
     xp3d.js rubs the station's label out, so they pass behind it.
     First the callouts' type is cleared of the thread. ---- */
  function draw(ctx, stationAt, knockOut, tagRect) {
    jobs.forEach((j) => {
      if (!j || j.e < 0.02) return;
      const dy = (1 - j.e) * SHIFT;
      j.knocks.forEach((r) => knockOut([r[0], r[1] + dy, r[2], r[3] + dy], 8, 6));
    });
    jobs.forEach((j, k) => {
      if (!j || j.e < 0.02) return;
      const from = stationAt(k);
      if (!from) return;
      const fork = tagRect && tagRect[2] > from[0] ? [tagRect[2] - 12, from[1]] : from;
      const dy = (1 - j.e) * SHIFT;
      j.anchors.forEach((a, i) => {
        const reach = reachOf(j, i);
        if (reach > 0) drawLeader(ctx, from, fork, [a[0], a[1] + dy], reach, j.e);
      });
    });
  }

  /* straight from the station to the fork, then an S out to the
     callout, level at both ends; drawn as far as reach */
  function drawLeader(ctx, from, fork, to, reach, e) {
    const mx = fork[0] + (to[0] - fork[0]) * 0.5;
    const at = (t) => {
      const u = 1 - t;
      const lead = u * u * u + 3 * u * u * t;
      const tail = 3 * u * t * t + t * t * t;
      return [
        u * u * u * fork[0] + (3 * u * u * t + 3 * u * t * t) * mx + t * t * t * to[0],
        lead * fork[1] + tail * to[1],
      ];
    };
    ctx.strokeStyle = `rgba(${INK}, ${(0.55 * e).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(fork[0], fork[1]);
    for (let i = 1; i <= LEAD_N; i++) {
      const p = at((reach * i) / LEAD_N);
      ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke();
    if (reach < 0.999) return;
    ctx.fillStyle = `rgba(${INK}, ${(0.9 * e).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(to[0], to[1], 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  window.XpCallouts = { build, measure, update, draw };
})();
