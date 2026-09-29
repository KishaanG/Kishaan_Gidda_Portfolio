# PRODUCT.md — Kishaan Gidda, personal site

## What this is

A personal portfolio for **Kishaan Gidda**, a second-year computer science co-op
student at Carleton University (AI/ML stream), currently on a product team at
TrendAI. The site exists to get him hired: co-op placements, internships, and
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

**Experience**
- **TrendAI** — Product Team, AVTD. *Current.* Contributing to software
  development on the AVTD product team; identifying and resolving vulnerabilities.
- **Hydro Ottawa** — Cybersecurity Analyst Intern. *May – Aug 2025.* IR playbooks
  for AI data leaks, web exploits, ransomware, insider threats; Living-Off-The-Land
  simulation with MITRE ATT&CK + Caldera on Linux; AWS GuardDuty as IaC and S3/IAM
  hardening; Gemini REST API against Google Workspace data for quantified risk
  assessment; AWS Lambda quarantine workflow for malicious S3 files with SNS
  alerting; PowerShell + Cloudflare API DNS connection testing.
- **Ciena** — Software Developer Intern. *Feb – Aug 2023.* Automated Python report
  generator on Linux against Oracle databases; Angular/TypeScript front end;
  DevOps in Agile with Jira and Git.

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
(real team photo), `carleton_logo.png`, `github.png`, `linkedin.jpg`.
`videos/soccer.mp4`.

**There are no screenshots of CareRouter or PoleLab.** Their at-rest visuals are
authored in-world (see DESIGN.md) rather than faked. Their demos are rebuilt from
each project's real interface and real output — PoleLab's solved Spa lap and
strategy report from its own fixtures, CareRouter's questions and a test-suite
intake from its repo — and leave out anything that would have to be invented.
`images/carerouter-logo.png` is CareRouter's own logo, resized.

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
