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
- **Racing Line App** — physics-optimal racing lines in 3D. React / FastAPI /
  Three.js. Draw a track on flat ground or real terrain; a physics optimizer
  computes the minimum-lap-time line; orbit it or drive it from a driver's-eye
  camera. Two solvers (fast heuristic + IPOPT optimal-control), an in-browser RL
  driver, and a 2026 F1 season globe with circuit fly-ins. **No public link.**
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

**There are no screenshots of CareRouter or the Racing Line App.** Their visuals
are authored in-world (see DESIGN.md) rather than faked — nothing on the page
claims to be a product screenshot that isn't one.

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
