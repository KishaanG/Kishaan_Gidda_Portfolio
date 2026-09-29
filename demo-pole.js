"use strict";

/* ============================================================
   PoleLab — the demo
   ------------------------------------------------------------
   The app at polelab.dev, in its own light theme: Titillium
   Web, carbon ink on off-white, red rationed to the one thing
   to press and the one line that matters. Seven seconds:

   1. Solve the lap. The real solved lap of Spa-Francorchamps
      from the app's own fixtures — 1:36.699, collocation. The
      line is drawn at the car's own relative pace, so the pen
      slows into La Source and runs down the Kemmel straight.
   2. Run the strategy. The report's real stage labels, with a
      ten-minute run shown in about a second.
   3. Read the call. The run's real result: a one-stop, soft to
      hard, tied with the plan a lap earlier — and one simulated
      race from that run, twenty identical cars, gap to the
      leader, yours in red.

   Data below: the circuit centreline and the solved line are
   normalised into one 1000-unit frame (rotated a quarter turn to
   sit landscape), speeds are km/h at each line point, and GAPS
   are tenths of a second behind the leader, per car, per lap.
   ============================================================ */

(() => {
  if (!window.Demos) return;
  const { clamp, lerp, EASE, timeline, cursor, press, centreIn, svg } = window.Demos.kit;

  const CENTER = [106,432,91,441,76,449,61,458,47,466,32,474,17,483,2,486,3,471,11,456,18,440,25,425,33,410,42,395,52,382,62,368,73,355,84,343,97,332,110,321,123,310,136,299,149,288,162,277,175,266,188,255,200,244,209,229,218,215,231,204,246,196,263,193,280,191,295,185,310,176,324,167,339,158,353,149,367,140,382,131,396,122,411,113,426,106,442,101,458,96,474,91,491,86,507,82,523,77,540,72,556,68,572,63,588,58,605,54,621,49,637,44,654,39,670,35,686,30,702,25,719,20,735,16,751,11,768,6,784,2,801,1,814,11,824,24,840,29,856,25,873,22,890,18,906,22,918,34,927,48,937,61,947,75,956,89,966,103,975,117,985,131,995,145,1000,161,994,176,979,184,963,180,952,167,943,153,934,138,925,124,913,113,896,112,880,117,864,123,848,128,832,134,816,138,799,141,782,145,766,148,749,151,732,154,716,157,699,160,682,163,667,171,656,183,650,199,648,215,647,232,648,249,654,265,663,279,675,291,690,300,705,306,721,313,737,319,752,325,768,331,784,338,800,344,815,350,831,357,845,367,852,382,853,398,846,414,838,429,837,445,843,461,855,472,870,481,884,491,898,500,912,509,927,518,939,530,941,546,933,561,923,574,913,588,903,602,890,612,874,618,857,618,841,613,825,607,810,601,795,592,781,583,768,572,756,560,744,548,732,536,721,523,712,509,703,494,695,479,688,464,680,449,672,434,664,419,655,405,644,392,631,381,618,370,603,362,588,355,572,348,557,341,541,334,525,328,509,326,492,329,476,335,460,341,444,347,429,353,413,359,397,365,381,370,364,374,347,377,331,379,314,380,297,381,280,382,263,383,251,376,251,359,237,355,223,364,208,373,194,382,179,390,164,399,150,407,135,415,120,424];
  const LINE = [106,433,95,439,84,446,73,452,63,458,52,465,41,471,30,478,19,483,7,486,2,480,4,468,8,456,15,445,21,434,27,423,34,413,40,402,47,391,54,381,61,371,69,362,77,352,86,343,96,335,105,327,114,318,124,310,133,302,142,293,152,285,161,277,171,268,180,260,189,252,198,243,206,233,213,224,221,214,231,206,241,200,253,196,265,193,277,190,289,186,299,180,310,174,321,168,332,161,343,155,354,149,364,142,375,136,386,130,397,123,408,117,419,111,430,106,442,102,454,99,466,95,478,92,490,88,502,84,514,81,526,77,538,74,550,70,562,66,574,63,586,59,598,56,610,52,622,48,634,45,646,41,658,37,670,34,682,30,694,27,706,23,718,19,730,16,742,12,754,9,766,5,778,2,791,1,802,3,812,10,820,19,830,25,842,28,855,26,866,22,879,19,891,19,903,22,913,28,922,37,929,47,936,58,944,68,951,78,958,89,965,99,972,109,979,120,986,130,993,141,997,153,998,164,994,175,984,182,972,182,961,177,952,169,944,158,940,147,934,135,927,125,917,117,907,113,894,112,882,115,870,119,858,123,846,127,834,131,822,134,810,137,798,140,786,142,773,145,761,147,749,149,736,152,724,154,712,156,699,158,687,161,676,167,666,174,658,183,652,193,648,205,646,218,646,230,649,243,652,255,656,266,663,276,671,285,681,293,691,298,703,303,714,308,726,313,738,317,749,322,761,327,773,332,784,336,796,341,808,346,819,350,830,356,840,364,847,374,851,385,852,397,849,409,843,419,839,431,838,443,841,455,847,465,856,475,867,481,878,487,889,494,900,500,911,506,921,512,931,520,938,531,940,542,938,554,932,565,924,575,917,585,909,595,900,604,890,611,878,615,867,617,854,617,842,614,831,609,819,604,808,598,798,592,787,585,778,577,768,569,759,561,750,552,741,543,733,534,725,524,717,514,711,504,704,493,698,482,692,471,686,460,679,449,673,439,667,428,661,417,654,407,646,397,637,388,628,380,618,373,607,367,596,361,585,356,573,350,562,345,551,340,539,335,528,330,516,328,503,329,491,331,480,335,468,339,456,343,444,347,432,351,420,355,409,359,397,363,385,367,373,370,361,373,348,375,336,377,324,379,311,381,299,383,286,384,274,384,261,383,253,377,250,365,246,356,235,356,224,361,213,368,203,375,192,381,181,387,170,394,160,400,149,407,138,413,127,420,117,426];
  const KMH = [303,308,312,316,319,321,262,196,133,65,72,126,174,203,224,240,253,264,273,281,288,295,300,305,310,314,317,321,324,326,329,331,333,335,337,338,340,341,342,344,345,345,346,347,348,349,349,350,350,351,351,352,352,352,353,353,353,354,354,354,354,354,355,355,355,355,355,355,355,356,356,356,356,356,356,356,356,356,356,356,356,356,356,356,327,268,205,168,153,155,165,162,170,189,214,217,211,211,219,236,250,262,271,280,287,294,299,304,263,206,159,126,107,109,128,154,188,213,231,231,185,171,171,187,212,231,245,258,268,277,284,291,297,303,307,312,315,319,322,325,318,310,306,307,311,315,319,322,325,328,330,332,334,336,337,339,340,342,343,344,345,346,347,347,347,291,240,207,186,177,178,190,208,199,194,196,209,228,244,256,267,276,275,209,165,147,148,167,198,219,236,250,262,271,280,287,293,299,304,309,313,317,320,323,326,328,331,333,335,336,338,339,341,342,343,344,345,346,347,348,348,349,350,350,351,351,352,352,352,353,353,353,354,354,354,354,354,355,355,355,355,355,355,355,356,356,356,356,356,356,347,291,227,162,108,94,97,62,102,156,191,215,233,247,259,269,278,285,292,298];
  const GAPS = [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,129,79,72,52,43,13,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[9,14,17,20,24,27,31,36,38,36,36,38,40,46,48,49,49,0,132,123,105,96,69,61,57,59,63,64,63,66,68,70,75,79,81,80,80,81,83,86,84,84,87,87,88],[13,17,20,25,28,31,34,41,44,45,46,49,51,56,60,64,71,34,7,185,168,157,128,117,111,109,111,108,105,105,105,104,106,107,105,102,98,95,93,94,92,90,92,94,96],[22,27,31,36,41,48,54,60,66,69,71,74,76,80,84,85,88,40,0,0,166,160,131,124,116,116,119,119,116,116,118,118,121,123,118,116,113,111,111,115,112,110,108,108,104],[24,24,25,28,29,34,38,44,48,49,52,55,57,62,66,73,80,45,22,42,66,244,213,199,193,190,192,192,188,189,190,188,194,196,195,191,185,181,181,183,181,192,195,198,199],[31,36,39,46,49,55,62,69,74,75,79,81,85,88,92,94,93,46,7,8,0,0,156,144,138,137,137,136,134,135,138,139,142,144,143,137,134,133,134,137,138,140,140,141,140],[32,32,34,41,43,45,45,49,52,54,57,60,62,67,72,80,88,54,29,54,76,113,141,329,320,315,316,314,309,311,311,307,307,307,302,298,292,290,288,288,282,280,276,273,270],[43,49,55,64,68,74,77,86,92,95,99,102,106,110,113,116,116,69,26,28,19,18,0,0,180,177,178,173,169,166,166,163,163,162,155,151,147,142,138,140,139,137,135,137,133],[40,42,45,49,52,58,74,76,81,80,85,90,92,99,104,110,119,84,64,86,111,154,184,245,323,509,509,503,500,509,506,502,500,498,493,486,483,479,476,474,469,463,462,458,454],[49,51,52,54,55,56,59,61,63,61,62,65,67,253,247,240,233,177,127,116,101,93,66,58,55,55,59,59,59,61,62,65,70,73,69,69,69,69,71,74,74,76,79,83,83],[53,57,58,61,63,65,67,72,78,78,82,87,88,96,99,106,113,74,54,80,104,145,172,230,302,391,494,675,669,666,664,659,657,654,647,638,632,627,625,624,618,611,606,599,594],[63,68,74,80,83,89,95,103,108,110,112,116,119,124,127,132,130,261,208,196,179,171,143,134,128,128,131,131,128,130,131,133,137,138,136,133,131,129,130,133,131,133,132,131,128],[64,65,64,68,71,77,82,86,87,87,88,93,96,103,108,113,124,89,227,219,201,189],[71],[72,83,83,86,88,90,92,94,97,98,111,119,122,128,133,139,148,112,90,113,293,283,254,242,235,234,236,235,233,231,229,229,229,230,227,223,219,216,217,220,219,220,219,218,215],[83,91,95,102,104,106,109,112,116,118,121,123,129,132,137,141,141,93,51,50,41,229,198,186,177,188,189,188,185,185,186,185,187,184,180,188,188,187,188,190,189,189,188,187,183],[84,85,86,89,91,93,98,100,103,105,106,109,110,117,118,122,129,96,75,97,120,163,321,309,299,295,296,294,289,287,286,284,285,285,281,276,272,268,266,265,263,261,259,256,251],[91,98,103,110,114,117,122,128,133,135,137,141,145,148,150,151,150,102,61,61,55,57,38,212,205,200,201,200,196,200,199,201,201,202,200,197,192,191,192,194,192,192,192,194,192],[94,95,98,105,107,110,113,118,121,122,124,129,133,138,143,151,163,126,103,128,151,189,220,280,456,452,451,446,442,440,441,436,435,432,425,420,415,409,407,405,401,397,395,391,398],[101,105,110,117,121,127,130,135,142,143,144,148,151,156,159,161,160,109,68,69,63,63,44,48,54,240,241,239,236,236,235,234,235,234,231,226,222,221,220,220,215,210,208,205,200]];

  const STAGES = [
    "Solving the base line and measuring the fuel effect",
    "Screening the plan space",
    "Evolving strategies",
    "Deduplicating finalists",
    "Judging finalists (invasion tournament)",
    "Explaining the result",
  ];

  /* "Also on the board", from the run's bands: signature, and how
     far behind the call in mean invasion edge, rounded as the app
     rounds it */
  const BOARD = [
    { stop: 13, gap: null },
    { stop: 15, gap: "+0.12" },
    { stop: 12, gap: "+0.31" },
    { stop: 16, gap: "+0.42" },
    { stop: 17, gap: "+0.89" },
  ];
  const LAPS = 45;

  const MARK =
    '<svg viewBox="4 4 40 40" width="22" height="22" aria-hidden="true"><circle cx="24" cy="24" r="13" fill="none" stroke="#15151e" stroke-width="3.4"/><g stroke="#15151e" stroke-width="3.4"><line x1="24" y1="5" x2="24" y2="16"/><line x1="24" y1="32" x2="24" y2="43"/><line x1="5" y1="24" x2="16" y2="24"/><line x1="32" y1="24" x2="43" y2="24"/></g><circle cx="24" cy="24" r="5.2" fill="#ff1e00"/></svg>';

  const pts = (a) => {
    const out = [];
    for (let i = 0; i < a.length; i += 2) out.push([a[i], a[i + 1]]);
    return out;
  };
  const pathOf = (p, close) =>
    "M" + p.map((q) => q[0] + " " + q[1]).join("L") + (close ? "Z" : "");

  function build(screen) {
    screen.innerHTML = `
      <div class="pl">
        <div class="pl-world"><svg class="pl-circuit" viewBox="-30 -30 1060 680"></svg></div>

        <div class="pl-brand">${MARK}<span>PoleLab</span></div>
        <nav class="pl-nav">
          <span>2D Editor</span><span class="on">3D Viewer</span><span>Map</span>
          <i></i><span>&#9790;</span><i></i><span>Sign in</span>
        </nav>

        <aside class="pl-panel">
          <p class="pl-tick">Result</p>
          <div class="pl-result">
            <p class="pl-empty">No line yet. Solve one below.</p>
            <p class="pl-lap"><b>1:36.699</b><span>Collocation &middot; solved in 2.2 s</span></p>
          </div>
          <p class="pl-tick">Loaded</p>
          <div class="pl-loaded">
            <div class="pl-loaded__row">
              <svg class="pl-thumb" viewBox="-40 -40 1080 700"></svg>
              <p><b>Circuit de Spa-Francorchamps</b><span>Round 12 &middot; Belgium</span></p>
            </div>
            <p class="pl-width"><b>9.21</b> m wide <span>measured</span></p>
            <dl class="pl-spec">
              <div><dt>Downforce</dt><dd>3.80 <i>ClA</i></dd></div>
              <div><dt>Power</dt><dd>775 <i>kW</i></dd></div>
              <div><dt>Drag</dt><dd>1.30 <i>CdA</i></dd></div>
              <div><dt>Grip</dt><dd>1.80 <i>&mu;</i></dd></div>
              <div><dt>Mass</dt><dd>798 <i>kg</i></dd></div>
              <div><dt>Braking</dt><dd>45 <i>m/s&sup2;</i></dd></div>
            </dl>
          </div>
          <span class="pl-primary pl-compute">Compute racing line</span>
          <span class="pl-textbtn pl-open">Open Analysis &rarr;</span>
        </aside>

        <div class="pl-hud">
          <p class="pl-tick">Circuit</p>
          <p class="pl-hud__big"><b>6,916</b><i>m</i></p>
          <p class="pl-hud__row"><span>Speed</span><b class="pl-speed">&ndash;</b></p>
          <p class="pl-hud__row"><span>Lap</span><b class="pl-hudlap">&ndash;</b></p>
        </div>

        <section class="pl-drawer">
          <header class="pl-dhead">
            <p class="pl-tick">Analysis &middot; collocation</p>
            <div class="pl-seg pl-seg--tabs"><span>Analysis</span><span class="on">Report <em class="pl-status">not run</em></span></div>
          </header>

          <div class="pl-pre">
            <p class="pl-tick">Strategy report</p>
            <h2 class="pl-h2"><span class="pl-h2a">Run the tyre strategy.</span><span class="pl-h2b">Running the tyre strategy.</span></h2>
            <p class="pl-lede">Twenty identical cars race every pit-stop plan against every other.</p>
            <div class="pl-controls">
              <span class="pl-primary pl-run"><span class="pl-run__a">Run strategy</span><span class="pl-run__b">Working&hellip;</span></span>
              <div class="pl-opt"><span class="pl-opt__k">Run size</span><span class="pl-seg"><span>Quick <i>1.5 min</i></span><span class="on">Standard <i>10 min</i></span><span>Full <i>1.6 h</i></span></span></div>
              <div class="pl-opt"><span class="pl-opt__k">Race</span><span class="pl-seg"><span class="on">Real race</span><span>Custom</span></span></div>
            </div>
            <div class="pl-progress">
              <p><i class="pl-live"></i><span class="pl-stage"></span><b class="pl-pct">0%</b></p>
              <div class="pl-bar"><i></i></div>
            </div>
          </div>

          <div class="pl-report">
            <nav class="pl-tabs"><span class="on">Call</span><span>Why</span><span>Versus</span><span>Now</span></nav>
            <p class="pl-metaline"><b>Call</b> tied &middot; 12 judged</p>
            <div class="pl-cols">
              <div class="pl-main">
                <p class="pl-hero"><b>One-stop</b><span>lap 13&ndash;14</span></p>
                <div class="pl-stint"><i class="pl-s"></i><i class="pl-h"></i></div>
                <div class="pl-ruler"><span style="left:0">1</span><span style="left:20.45%">10</span><span style="left:43.18%">20</span><span style="left:65.9%">30</span><span style="left:88.63%">40</span><span style="left:100%">45</span></div>
                <p class="pl-stintcap"><span class="pl-dot pl-dot--s"></span>Soft 1&ndash;13 &middot; <span class="pl-dot pl-dot--h"></span>Hard 14&ndash;45</p>
                <p class="pl-note">Tied with one other plan, closer than this run's resolution of 0.060 positions, so the order between them is noise and is not reported.</p>
                <p class="pl-tick pl-tick--trace">One race at these settings</p>
                <div class="pl-tracewrap">
                  <svg class="pl-trace" viewBox="0 0 560 150" preserveAspectRatio="none"></svg>
                  <span class="pl-lapcur"><b>Lap 1</b></span>
                </div>
                <div class="pl-xaxis"><span style="left:20.45%">10</span><span style="left:43.18%">20</span><span style="left:65.9%">30</span><span style="left:88.63%">40</span></div>
                <p class="pl-cap">One simulated race: gap to the leader. Your car is highlighted; a line that stops is a retirement.</p>
              </div>
              <aside class="pl-side">
                <p class="pl-tick">Also on the board</p>
                <ol class="pl-board"></ol>
              </aside>
            </div>
          </div>
        </section>
      </div>`;

    const root = screen.querySelector(".pl");
    const $ = (s) => root.querySelector(s);

    /* ---- the circuit ---- */
    const center = pts(CENTER);
    const line = pts(LINE);
    const circuit = $(".pl-circuit");
    svg("path", { d: pathOf(center, true), class: "pl-kerb" }, circuit);
    svg("path", { d: pathOf(center, true), class: "pl-road" }, circuit);
    svg("path", { d: pathOf(center, true), class: "pl-dash" }, circuit);
    const racing = svg("path", { d: pathOf(line, true), class: "pl-line", pathLength: "1" }, circuit);
    const s0 = line[0];
    svg("line", { x1: s0[0] - 14, y1: s0[1] - 18, x2: s0[0] + 14, y2: s0[1] + 18, class: "pl-sf" }, circuit);
    const head = svg("circle", { r: "9", class: "pl-head" }, circuit);
    svg("path", { d: pathOf(center, true), class: "pl-thumbline" }, $(".pl-thumb"));

    /* The pen moves at the car's pace: arc length against lap time.
       Each line point carries a speed, so time to the next point is
       distance over speed — accumulate both and the draw can be
       driven by time while the dash is set by distance. */
    const n = line.length;
    const arc = [0];
    const time = [0];
    for (let i = 1; i <= n; i++) {
      const a = line[i - 1];
      const b = line[i % n];
      const ds = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const v = (KMH[i - 1] + KMH[i % n]) / 2;
      arc.push(arc[i - 1] + ds);
      time.push(time[i - 1] + ds / v);
    }
    const ARC = arc[n];
    const LAP = time[n];

    function atTime(frac) {
      const target = frac * LAP;
      let i = 1;
      while (i < n && time[i] < target) i++;
      const k = clamp((target - time[i - 1]) / (time[i] - time[i - 1] || 1));
      const a = line[i - 1];
      const b = line[i % n];
      return {
        arc: lerp(arc[i - 1], arc[i], k) / ARC,
        x: lerp(a[0], b[0], k),
        y: lerp(a[1], b[1], k),
        kmh: Math.round(lerp(KMH[i - 1], KMH[i % n], k)),
      };
    }

    /* ---- the race trace ---- */
    const trace = $(".pl-trace");
    const W = 560;
    const H = 150;
    const defs = svg("defs", {}, trace);
    const clip = svg("clipPath", { id: "pl-reveal" }, defs);
    const reveal = svg("rect", { x: "-4", y: "-10", width: "0", height: H + 20 }, clip);
    const lanes = svg("g", { "clip-path": "url(#pl-reveal)" }, trace);
    [0.25, 0.5, 0.75].forEach((f) =>
      svg("line", { x1: 0, x2: W, y1: H * f, y2: H * f, class: "pl-grid" }, trace)
    );
    const xOf = (lap) => (lap / (LAPS - 1)) * W;
    // tenths of a second: 40 s spreads the leading pack, and the few
    // who fall further back run off the foot of the chart
    const MAXGAP = 400;
    const yOf = (g) => 4 + (g / MAXGAP) * (H - 8);
    GAPS.forEach((g, i) => {
      if (i === 9 || g.length < 2) return;
      svg("path", { d: "M" + g.map((v, l) => xOf(l).toFixed(1) + " " + yOf(v).toFixed(1)).join("L"), class: "pl-rival" }, lanes);
    });
    const you = GAPS[9];
    svg("path", { d: "M" + you.map((v, l) => xOf(l).toFixed(1) + " " + yOf(v).toFixed(1)).join("L"), class: "pl-you" }, lanes);
    // the one retirement that lasted past the start: a line that stops
    const dnf = GAPS[12];
    const dl = dnf.length - 1;
    svg("circle", { cx: xOf(dl), cy: yOf(dnf[dl]), r: "2.2", class: "pl-dnf" }, lanes);

    /* ---- also on the board ---- */
    const board = $(".pl-board");
    BOARD.forEach((b) => {
      const li = document.createElement("li");
      const soft = ((b.stop - 1) / LAPS) * 100;
      li.innerHTML =
        `<span class="pl-mini"><i style="width:${soft.toFixed(2)}%"></i></span>` +
        `<p><b>stop ${b.stop}</b> &middot; Soft 1&ndash;${b.stop - 1} &middot; Hard ${b.stop}&ndash;45</p>` +
        (b.gap
          ? `<p class="pl-worse">${b.gap} positions worse</p>`
          : `<p class="pl-tie">too close to call</p>`);
      board.appendChild(li);
    });
    const rows = Array.from(board.children);

    /* ---- where the hand goes ---- */
    const compute = $(".pl-compute");
    const open = $(".pl-open");
    const run = $(".pl-run");
    let aim = null;
    function measure() {
      const c = centreIn(compute, root);
      const o = centreIn(open, root);
      const r = centreIn(run, root);
      aim = [
        { t: 0, x: 600, y: 520 },
        { t: 0.3, x: 600, y: 520 },
        { t: 0.78, x: c.x - 30, y: c.y + 4 },
        { t: 2.2, x: c.x - 30, y: c.y + 4 },
        { t: 2.55, x: o.x - 8, y: o.y + 2 },
        { t: 2.95, x: o.x - 8, y: o.y + 2 },
        { t: 3.3, x: r.x - 12, y: r.y + 4 },
        { t: 4.6, x: r.x + 60, y: r.y + 70 },
      ];
    }
    measure();
    const hand = cursor(root, () => aim, [0.84, 2.62, 3.36], [0.15, 4.35]);

    /* ---- the timeline ---- */
    const el = {
      empty: $(".pl-empty"),
      lap: $(".pl-lap"),
      speed: $(".pl-speed"),
      hudlap: $(".pl-hudlap"),
      drawer: $(".pl-drawer"),
      status: $(".pl-status"),
      h2a: $(".pl-h2a"),
      h2b: $(".pl-h2b"),
      runA: $(".pl-run__a"),
      runB: $(".pl-run__b"),
      progress: $(".pl-progress"),
      stage: $(".pl-stage"),
      pct: $(".pl-pct"),
      bar: $(".pl-bar i"),
      pre: $(".pl-pre"),
      report: $(".pl-report"),
      stintS: $(".pl-stint .pl-s"),
      stintH: $(".pl-stint .pl-h"),
      note: $(".pl-note"),
      lapcur: $(".pl-lapcur"),
      lapcurB: $(".pl-lapcur b"),
    };

    // the drawer's top edge: low while the run needs only a line of
    // progress, then up under the tab bar once there is a report
    const DRAWER_RUN = 318;
    const DRAWER_FULL = 64;
    const DRAW = [0.95, 2.15];
    const RUN = [3.42, 4.46];
    const TRACE = [5.05, 6.45];

    const tl = timeline()
      .each(hand)
      .each((t) => {
        compute.style.transform = `scale(${press(t, 0.84)})`;
        run.style.transform = `scale(${press(t, 3.36)})`;
      })
      /* 1 · the lap */
      .at(DRAW[0], DRAW[1] - DRAW[0], (e, p) => {
        const at = atTime(p);
        racing.style.strokeDashoffset = String(1 - at.arc);
        racing.style.opacity = p > 0 ? "1" : "0";
        head.setAttribute("cx", at.x.toFixed(1));
        head.setAttribute("cy", at.y.toFixed(1));
        head.style.opacity = p > 0 && p < 1 ? "1" : "0";
        el.speed.textContent = p > 0 && p < 1 ? at.kmh + " km/h" : "–";
      }, EASE.linear)
      .at(2.1, 0.35, (e) => {
        el.empty.style.opacity = String(1 - e);
        el.lap.style.opacity = String(e);
        el.lap.style.transform = `translateY(${(1 - e) * 8}px)`;
        el.hudlap.textContent = e > 0 ? "1:36.699" : "–";
        open.style.opacity = String(0.4 + 0.6 * e);
      })
      /* 2 · the run */
      .at(2.68, 0.5, (e) => {
        el.drawer.style.transform = `translateY(${((1 - e) * 104).toFixed(2)}%)`;
      }, EASE.expo)
      .at(RUN[0], RUN[1] - RUN[0], (e, p, t) => {
        const on = t >= RUN[0];
        el.h2a.style.opacity = on ? "0" : "1";
        el.h2b.style.opacity = on ? "1" : "0";
        el.runA.style.opacity = on ? "0" : "1";
        el.runB.style.opacity = on ? "1" : "0";
        run.classList.toggle("is-working", on);
        el.progress.style.opacity = on ? "1" : "0";
        const i = Math.min(STAGES.length - 1, Math.floor(e * STAGES.length));
        el.stage.textContent = STAGES[i];
        const pct = Math.round(e * 100);
        el.pct.textContent = pct + "%";
        el.bar.style.transform = `scaleX(${e.toFixed(3)})`;
        el.status.textContent = t < RUN[0] ? "not run" : p < 1 ? pct + "%" : "ready";
      }, EASE.inOut)
      /* 3 · the call — the drawer opens up to hold the report */
      .at(4.42, 0.5, (e) => {
        el.drawer.style.top = lerp(DRAWER_RUN, DRAWER_FULL, e).toFixed(1) + "px";
      }, EASE.inOut)
      .at(4.55, 0.4, (e) => {
        el.pre.style.opacity = String(1 - e);
        el.report.style.opacity = String(e);
        el.report.style.transform = `translateY(${(1 - e) * 10}px)`;
      })
      .at(4.75, 0.6, (e) => {
        el.stintS.style.transform = `scaleX(${e})`;
        el.stintH.style.transform = `scaleX(${clamp(e * 1.4 - 0.4)})`;
      })
      .at(5.0, 0.4, (e) => { el.note.style.opacity = String(e); })
      .at(TRACE[0], TRACE[1] - TRACE[0], (e, p) => {
        const w = p * (W + 8);
        reveal.setAttribute("width", w.toFixed(1));
        el.lapcur.style.left = ((p * 100).toFixed(2)) + "%";
        el.lapcur.style.opacity = p > 0 && p < 1 ? "1" : "0";
        el.lapcurB.textContent = "Lap " + Math.max(1, Math.round(p * LAPS));
      }, EASE.linear);

    rows.forEach((r, i) =>
      tl.at(5.05 + i * 0.09, 0.4, (e) => {
        r.style.opacity = String(e);
        r.style.transform = `translateY(${(1 - e) * 6}px)`;
      })
    );

    return {
      width: 1260,
      height: 690,
      duration: 7.1,
      caption: "<strong>PoleLab</strong> &middot; Circuit de Spa-Francorchamps",
      source:
        '<span>Real run data</span><a class="br" href="https://polelab.dev" target="_blank" rel="noreferrer">[ polelab.dev &#8599; ]</a>',
      chapters: [
        { t: 0, label: "Solve the lap" },
        { t: 2.6, label: "Run the strategy · 10 min, shown in 1 s" },
        { t: 4.55, label: "Read the call" },
      ],
      render: (t) => tl.render(t),
      measure,
    };
  }

  window.Demos.define("pole", build);
})();
