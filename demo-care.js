"use strict";

/* ============================================================
   CareRouter — the demo
   ------------------------------------------------------------
   The app as it ships: a chat intake on the blush ground, Queen's
   navy, gold for the person on the other end. Six seconds:

   1. The last two questions of the six, word for word from
      data/questions.ts, answered with the intake from the repo's
      own location-finder test (Kingston, near Queen's).
   2. The pathway that intake produces. That test scores it
      mental_health / soon / severity 4 — and severity 4 is the
      rule, in plain Python and never the model, that puts 9-1-1
      and 9-8-8 at the head of the list. The helplines after them
      are the ones locationsFinder.py returns for that issue.

   The three recommended facilities come from a live Places search,
   so there is no real list to show. The map marks where they
   landed and does not put names to them.
   ============================================================ */

(() => {
  if (!window.Demos) return;
  const { clamp, EASE, timeline, cursor, press, centreIn } = window.Demos.kit;

  // already answered when the demo opens, so the log reads as the
  // middle of a conversation rather than the start of one
  const HISTORY = [
    ["bot", ["How much is this affecting your ability to function day-to-day?", "Consider work, school, self-care, and social life."]],
    ["you", "I can't get out of bed or attend my lectures."],
    ["bot", ["How soon do you feel you need support?", "Is this something you need urgent help with?"]],
    ["you", "I need to talk to someone this week."],
  ];
  const Q5 = [
    "Which statement best describes your safety right now?",
    "It's important to be honest here. This helps us connect you to the right resources.",
  ];
  const A5 = "I have no plans to hurt myself, but I feel very hopeless.";
  const Q6 = [
    "What could make it hard for you to get help?",
    "Think about things like cost, transportation, language, work schedule, childcare, insurance, or past experiences.",
  ];
  const A6 = "Must be within walking distance or bus-accessible. No private high-cost clinics.";
  const DONE = ["Thank you!", "I'm creating your personalized support pathway now..."];

  const CONTACTS = [
    ["Emergency Services (9-1-1)", "9-1-1", true],
    ["9-8-8 Suicide & Crisis Lifeline", "9-8-8", true],
    ["ConnexOntario", "1-866-531-2600"],
    ["Wellness Together", "1-866-585-0445"],
    ["Good2Talk", "1-866-925-5454"],
    ["Kids Help Phone", "1-800-668-6868"],
  ];

  const BOT =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>';
  const SPEAKER =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';
  const MIC =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#002452" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>';
  const SEND =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>';
  const CHECK =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#4A7C59" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>';

  const bot = (lines, time) => `
    <div class="cr-msg cr-msg--bot">
      <span class="cr-ava cr-ava--bot">${BOT}</span>
      <div><div class="cr-bubble"><span class="cr-say">${SPEAKER}</span><b>${lines[0]}</b><br><br>${lines[1]}</div><p class="cr-stamp">${time}</p></div>
    </div>`;
  const you = (text, time) => `
    <div class="cr-msg cr-msg--you">
      <div><div class="cr-bubble">${text}</div><p class="cr-stamp">${time}</p></div>
      <span class="cr-ava cr-ava--you">You</span>
    </div>`;

  function build(screen) {
    screen.innerHTML = `
      <div class="cr">
        <div class="cr-chat">
          <header class="cr-head">
            <img src="images/carerouter-logo.png" alt="" width="110" height="80" />
            <h3>Hi there, how can I help you today?</h3>
            <p class="cr-q">Question <span class="cr-qn">5</span> of 6</p>
          </header>
          <div class="cr-log"><div class="cr-log__in">
            ${HISTORY.map(([who, m]) => (who === "bot" ? bot(m, "10:40 AM") : you(m, "10:40 AM"))).join("")}
            ${bot(Q5, "10:41 AM")}
            ${you(A5, "10:41 AM")}
            ${bot(Q6, "10:42 AM")}
            ${you(A6, "10:42 AM")}
            <div class="cr-msg cr-msg--bot cr-msg--done">
              <span class="cr-ava cr-ava--bot">${BOT}</span>
              <div><div class="cr-bubble"><b>${DONE[0]}</b><br><br>${DONE[1]}</div></div>
            </div>
          </div>
          <div class="cr-typing"><span class="cr-ava cr-ava--bot">${BOT}</span><div class="cr-bubble"><i></i><i></i><i></i></div></div>
          </div>
          <div class="cr-inputbar">
            <span class="cr-mic">${MIC}</span>
            <div class="cr-input"><span class="cr-ph">Tell me what's on your mind...</span><span class="cr-typed"></span></div>
            <span class="cr-send">${SEND}</span>
          </div>
          <p class="cr-foot">This tool does not diagnose or replace professional care. Crisis support: call 988</p>
        </div>

        <div class="cr-results">
          <div class="cr-contacts">
            <span class="cr-contacts__k">Quick Contacts</span>
            ${CONTACTS.map((c) => `<span class="cr-chip${c[2] ? " cr-chip--crisis" : ""}"><b>${c[0]}</b>${c[1]}</span>`).join("")}
          </div>
          <div class="cr-body">
            <aside class="cr-left">
              <p class="cr-count">3 Locations Recommended</p>
              <h3 class="cr-title">Support Pathway</h3>
              <div class="cr-card cr-card--note">
                <p class="cr-card__k">${CHECK} Message for You</p>
                <p>It sounds like you're going through a very heavy time at school.</p>
              </div>
              <div class="cr-card cr-card--sum">
                <p class="cr-card__k">Assessment Summary</p>
                <dl>
                  <div><dt>Issue</dt><dd>Mental health</dd></div>
                  <div><dt>Urgency</dt><dd><span class="cr-pill cr-pill--soon">soon</span></dd></div>
                  <div><dt>Severity</dt><dd><span class="cr-pill cr-pill--sev">4/4</span></dd></div>
                </dl>
                <p class="cr-alert">Immediate support recommended.</p>
              </div>
              <p class="cr-hint">Click a location to see it on the map</p>
              <p class="cr-why"><span>Why these recommendations?</span><em>Confidence: 92%</em></p>
              <p class="cr-important"><b>Important:</b> In crisis, call 988 or 911.</p>
            </aside>
            <div class="cr-map">
              <svg viewBox="0 0 700 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <rect width="700" height="520" fill="#f2efe9"/>
                <g class="cr-streets">
                  <path d="M-40 120 L760 -40 M-40 200 L760 40 M-40 280 L760 120 M-40 360 L760 200 M-40 440 L760 280"/>
                  <path d="M90 -40 L210 560 M220 -40 L340 560 M350 -40 L470 560 M480 -40 L600 560 M610 -40 L730 560"/>
                </g>
                <path class="cr-park" d="M300 250 l70 -14 16 78 -70 14z"/>
                <g class="cr-arterials"><path d="M-40 250 L760 90"/><path d="M280 -40 L410 560"/></g>
                <path class="cr-water" d="M-20 430 C 90 410 160 440 250 418 S 420 380 520 400 S 640 360 720 330 L720 560 L-20 560 Z"/>
                <path class="cr-water" d="M640 -20 C 620 80 660 160 630 240 S 660 320 720 330 L720 -20 Z"/>
                <text x="120" y="494" class="cr-maplabel">Lake Ontario</text>
              </svg>
              <div class="cr-me"><i></i><span>You are here</span></div>
              <span class="cr-pin" style="left:57%;top:27%"></span>
              <span class="cr-pin" style="left:72%;top:52%"></span>
              <span class="cr-pin" style="left:31%;top:36%"></span>
              <div class="cr-mapbtns"><span>List</span><span>Center map</span></div>
            </div>
          </div>
        </div>
      </div>`;

    const root = screen.querySelector(".cr");
    const $ = (s) => root.querySelector(s);
    const $$ = (s) => Array.from(root.querySelectorAll(s));

    const msgs = $$(".cr-log__in > .cr-msg");
    const logIn = $(".cr-log__in");
    const log = $(".cr-log");
    const typing = $(".cr-typing");
    const typed = $(".cr-typed");
    const ph = $(".cr-ph");
    const send = $(".cr-send");
    const qn = $(".cr-qn");

    /* when each message lands: the history and Q5 are already there */
    const OPEN = HISTORY.length;   // index of Q5
    const AT = [...HISTORY.map(() => 0), 0, 1.32, 2.2, 3.12, 3.72];
    // the bot is typing before each of its messages
    const TYPING = [[1.5, 2.2], [3.28, 3.72]];
    const TYPED_BY = { [OPEN + 2]: 0, [OPEN + 4]: 1 };

    /* The log is laid out once, complete. What changes over time is
       only which messages are showing and how far it has scrolled —
       to keep the newest message at the bottom, as a chat does. */
    let bottoms = [];
    let tops = [];
    let view = 0;
    function measure() {
      view = log.clientHeight;
      tops = msgs.map((m) => m.offsetTop);
      bottoms = msgs.map((m) => m.offsetTop + m.offsetHeight);
    }
    measure();

    /* the bot's typing dots take the first slice of the space its
       reply will need, so the log makes room for the dots and then
       carries straight on into the reply without stepping back */
    function scrollAt(t) {
      let y = bottoms[OPEN];
      for (let i = OPEN + 1; i < msgs.length; i++) {
        const grow = bottoms[i] - bottoms[i - 1];
        const arrive = EASE.out(clamp((t - AT[i]) / 0.4));
        const k = TYPED_BY[i];
        if (k === undefined) {
          y += grow * arrive;
          continue;
        }
        const room = Math.min(64, grow) / grow;
        const dots = EASE.out(clamp((t - TYPING[k][0]) / 0.3));
        y += grow * (room * dots + (1 - room) * arrive);
      }
      return Math.max(0, y - view);
    }

    let aim = null;
    function aimAt() {
      const s = centreIn(send, root);
      aim = [
        { t: 0, x: s.x - 60, y: s.y + 40 },
        { t: 0.9, x: s.x - 2, y: s.y + 4 },
        { t: 2.7, x: s.x - 2, y: s.y + 4 },
      ];
    }
    aimAt();
    const hand = cursor(root, () => aim, [1.24, 3.04], [0.2, 3.4]);

    const type = (t, a, b, text) => {
      const p = clamp((t - a) / (b - a));
      return text.slice(0, Math.round(p * text.length));
    };

    const chips = $$(".cr-chip");
    const cards = [$(".cr-count"), $(".cr-title"), $(".cr-card--note"), $(".cr-card--sum"), $(".cr-hint"), $(".cr-why"), $(".cr-important")];
    const pins = $$(".cr-pin");
    const me = $(".cr-me");
    const alert = $(".cr-alert");
    const pills = $$(".cr-pill");

    const tl = timeline()
      .each(hand)
      .each((t) => {
        send.style.transform = `scale(${Math.min(press(t, 1.24), press(t, 3.04))})`;
        msgs.forEach((m, i) => {
          const e = EASE.out(clamp((t - AT[i]) / 0.4));
          const pre = i <= OPEN;
          m.style.opacity = pre ? "1" : String(e);
          m.style.transform = pre ? "none" : `translateY(${(1 - e) * 20}px)`;
        });
        logIn.style.transform = `translateY(${-scrollAt(t).toFixed(1)}px)`;

        let dots = 0;
        TYPING.forEach(([a, b], k) => {
          if (t >= a && t < b) {
            dots = 1;
            const next = OPEN + (k === 0 ? 2 : 4);
            typing.style.top = (tops[next] - scrollAt(t)).toFixed(1) + "px";
          }
        });
        typing.style.opacity = String(dots);
        typing.classList.toggle("is-on", dots > 0);

        // the input: typed, sent, cleared
        let text = "";
        if (t >= 0.15 && t < 1.28) text = type(t, 0.15, 1.1, A5);
        else if (t >= 2.3 && t < 3.08) text = type(t, 2.3, 2.95, A6);
        typed.textContent = text;
        ph.style.opacity = text ? "0" : "1";
        qn.textContent = t >= AT[OPEN + 2] ? "6" : "5";
      })
      /* the hand-off to the pathway */
      .at(3.95, 0.45, (e) => {
        $(".cr-chat").style.opacity = String(1 - e);
        $(".cr-chat").style.transform = `translateY(${-e * 14}px)`;
        $(".cr-results").style.opacity = String(e);
      })
      .at(4.35, 0.5, (e) => { $(".cr-map").style.opacity = String(e); });

    chips.forEach((c, i) =>
      tl.at(4.25 + i * 0.08, 0.35, (e) => {
        c.style.opacity = String(e);
        c.style.transform = `translateY(${(1 - e) * -6}px)`;
      })
    );
    cards.forEach((c, i) =>
      tl.at(4.3 + i * 0.1, 0.4, (e) => {
        c.style.opacity = String(e);
        c.style.transform = `translateY(${(1 - e) * 12}px)`;
      })
    );
    pills.forEach((p, i) =>
      tl.at(4.75 + i * 0.1, 0.3, (e) => { p.style.transform = `scale(${0.6 + 0.4 * e})`; p.style.opacity = String(e); }, EASE.expo)
    );
    tl.at(5.0, 0.35, (e) => { alert.style.opacity = String(e); })
      .at(4.6, 0.4, (e, p, t) => {
        me.style.opacity = String(e);
        me.classList.toggle("is-on", t >= 4.6);
      });
    pins.forEach((p, i) =>
      tl.at(5.05 + i * 0.16, 0.4, (e) => {
        p.style.opacity = String(clamp(e * 3));
        p.style.transform = `translate(-50%, -100%) translateY(${(1 - e) * -26}px)`;
      })
    );

    return {
      width: 1260,
      height: 690,
      duration: 6.3,
      caption: "<strong>CareRouter</strong> &middot; the last two questions, then the pathway",
      source:
        '<span>Intake from the repo&rsquo;s own tests</span><a class="br" href="https://github.com/KishaanG/CareRouter" target="_blank" rel="noreferrer">[ Source &#8599; ]</a>',
      chapters: [
        { t: 0, label: "Intake, in their own words" },
        { t: 3.95, label: "Severity 4 · crisis lines first, by rule" },
      ],
      render: (t) => tl.render(t),
      measure() { measure(); aimAt(); },
    };
  }

  window.Demos.define("care", build);
})();
