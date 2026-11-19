# PRODUCT.md — Kishaan Gidda, personal site

## What this is

A personal portfolio for **Kishaan Gidda**, a second-year computer science co-op
student at Carleton University (AI/ML stream), most recently on a product team at
TrendAI (May – Aug 2026). The site exists to get him hired: co-op placements, internships, and
security/AI roles.

It ships as **two parallel front doors** to the same person:

| Surface | Files | Purpose |
|---|---|---|
| **Classic site** | `index.html`, `blog.html` | The résumé-grade site. The one recruiters read. |
| **Village** | `village.html` | A pixel-art RPG overworld you walk around. An easter egg, linked quietly from the classic nav. **Out of scope for the classic site's design system — it has its own world and must not be touched.** |

## Audience and mode

- **Primary:** recruiters, hiring managers, and engineers evaluating him for a
  co-op or internship. They arrive from a résumé link or LinkedIn, skim on a
  laptop in daylight, and decide in well under a minute.
- **Secondary:** peers and CTF teammates.
- **Mode: Persuade.** The visitor must, in seconds, know what he does, believe
  he's done real work, and have an obvious way to reach him.

## Product truth (facts — do not invent or alter)

**Positioning:** Aspiring Cybersecurity Analyst & AI/ML Engineer. The through-line
is that he ships software *and* breaks it — development plus vulnerability work.

**Experience** — the points the site shows are the lines of the user's résumé
(*Kishaan_Gidda_AI_Developer.pdf*, supplied 2026-11-19), word for word. Each
one's mono label on the site (Agents, Incident, …) is not résumé wording.
- **TrendAI** — Product Team, AVTD. *May – Aug 2026.* (The résumé names this
  role Software Engineer (Co-op), Trend Micro, Vision One Cloud Security; the
  site keeps the names above until the user says otherwise.)
  - A lightweight, read-only agent on the Claude Agent SDK wrapping the Vision
    One API in 6 custom MCP tools, pulling only the alert data each prompt
    needs to keep token costs low.
  - Restored 30+ stuck scans as sole responder to a two-region production
    outage, then fixed the root cause in Go.
  - Launched vulnerability scanning in a new AWS region end to end, from
    CloudFormation to CI/CD and tests.
  - Fixed 270+ critical/high SAST/SCA findings in 23 repos; scaled Black
    Duck/Fortify to 52 repos.
  - Halved a 9-service disaster-recovery drill from 10 hours to 5 using AI
    subagents to fix its automation.
- **Hydro Ottawa** — Cybersecurity Analyst Intern. *May – Aug 2025.*
  - An LLM pipeline using Gemini to score the security risk of third-party
    Google Workspace apps.
  - Co-wrote 4 incident-response playbooks (NIST SP 800-61) the security team
    adopted.
  - Emulated Living-off-the-Land attacks in MITRE Caldera, chaining 10–25
    ATT&CK techniques.
  - Deployed AWS security controls in Terraform, like GuardDuty and Lambda
    auto-quarantine of malicious files.
- **Ciena** — Software Developer Intern (the résumé says Co-op). *Feb – Aug
  2023.* Automated daily test-result reports for every deploying team with a
  Python and SQL tool that is still in use. (Earlier copy also listed an
  Angular/TypeScript front end and DevOps in Agile; the résumé drops them, and
  so does the site.)

**Projects**
- **CareRouter** — AI mental-health triage and navigation. Next.js / Gemini.
  Gemini-based severity assessment, location-matched facilities, safety-first
  crisis routing. → `https://github.com/KishaanG/CareRouter`
- **PoleLab** (formerly the Racing Line App) — a race-strategy optimizer, live
  at `https://polelab.dev`. React / Three.js / FastAPI / CasADi-IPOPT. Solves the
  physics-optimal lap around a real or hand-drawn circuit (one solver: IPOPT
  collocation), then uses that lap to breed pit-stop plans (genetic search),
  race twenty identical cars through them across Web Workers (Monte Carlo), and
  judge the survivors in an invasion tournament. Tyre wear and compound pace are
  fitted to 52,185 laps of real F1 timing; circuit constants to 183 fastf1
  sessions. Ties are reported as ties. 2026 season globe with circuit fly-ins.
  The strategy search itself is simulation and search, not a trained model —
  the learned part is the fitted tyre and circuit models. RL training and the
  heuristic solver were removed from the product and are not claimed.

  **Since then (read from its source, 2026-11-18):** its own homepage now
  says thousands of pit plans are "raced against a full grid of twenty cars"
  (still twenty copies of the visitor's car, by design), with weather, safety
  cars, pit loss, tyres and grid pace modelled. It has accounts (free: one
  quick report a day; Pro: the full search), and a Now tab that makes the
  in-race call, run on replayed races. Its **2026 season re-run** (measured
  2026-10-20: one report per dry race, called before the race, each race held
  out of the tyre-wear fit) is the track record the site may quote:
  - right number of stops on **5 of 7** dry races whose stops were made under
    green flag (of 16 dry races re-run);
  - on the **6** of those where Pirelli made a race-eve call, PoleLab and
    Pirelli were each right on **4** — "as often as Pirelli did", never better;
  - the Now tab's mid-race call matched most of the pit lane at **5 of 5** full
    safety cars. Across all 22 SC and VSC periods it matched 17, one fewer than
    the box-under-SC, stay-out-under-VSC rule of thumb, so do not headline the
    22.
- **CyberSci Ottawa Regional — 1st of 13 teams.** Capture-the-flag competition.
  Team: *The Off-By-Ones*. → `https://cybersecuritychallenge.ca/en/`

**Toolkit:** Python, C++, TypeScript, Angular, AWS, Linux, PowerShell, Git.

**Personal:** soccer (Liverpool), gym, reading about AI advances. There is a real
`videos/soccer.mp4` clip.

**Contact:** `kishaangidda@gmail.com` ·
`https://github.com/kishaang` · `https://www.linkedin.com/in/kishaan-gidda/`

**Blog:** one published article — *"Your Earbuds Are Not Private: Inside the
WhisperPair Attack"*, January 20, 2026.

## Assets on hand

`images/` — `trendai.png`, `hydro ottawa.png`, `ciena.png`, `CyberSci.png`
(a crop of the results listing: Ottawa Region, Carleton University, Team "The
Off-By-Ones"), `carleton_logo.png`, `github.png`, `linkedin.jpg`.
`videos/soccer.mp4`.

**Project screenshots (2026-09-28).** Each project's card in the work stage is a
real capture of its most important screen, taken from the running product:

- `polelab-home.webp` (1999×922, plus a 1440 copy) — the live polelab.dev
  home page: "Race strategy for the next generation of Formula 1.", the
  next-race countdown (Las Vegas Grand Prix) and the season globe. Supplied by
  the user on 2026-11-18, used whole; its card takes the screenshot's own
  shape rather than 16:10. It replaced the Spa strategy-report capture.
- `carerouter-results.webp` (1456×910) — CareRouter's support pathway for a
  gambling intake: the message, the assessment summary (urgency soon, severity
  2/4), the exercise toolbox, the quick contacts, and the Kingston map. Supplied
  by the user at 1918×911 and cropped to 16:10 from the left edge, dropping the
  1px browser line along its top. It replaced the intake-chat capture, which
  stood in while the map had no Maps billing.
- `cybersci-listing.png` — `CyberSci.png` cropped to the listing's own red box.
  cybersci.ca has no higher-resolution copy of the Off-By-Ones listing.

Nothing in them is staged or edited beyond cropping.

## Constraints

- Static site. No build step, no framework, no bundler. Hand-written HTML/CSS/JS
  served as files. Keep it that way.
- Google Fonts is the only third-party dependency.
- Must hold up on a phone; recruiters open links on phones.
- `village.*` is a separate world and is never restyled to match the classic site.

## Brand commitments

- The visual world is pinned by the user to the register of
  **https://www.sreedesigns.com** — see DESIGN.md.
- The village stays cartoon/pixel. The split is intentional.
