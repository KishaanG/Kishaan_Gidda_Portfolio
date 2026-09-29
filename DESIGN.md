# DESIGN.md — the Silk system

Governs the **classic site**: `index.html`, `blog.html`, and the stylesheets
`site.css` / `home.css` / `blog.css`. **`village.*` is excluded** — it keeps its
own pixel world and none of these rules apply to it.

Pinned by the user to the register of `https://www.sreedesigns.com`: a generative
light-field behind quiet, wide-set serif type on an almost-empty white page.

---

## 1. Ground and light

The page is white. The only "image" the site owns is a **live silk light field** —
a WebGL fragment shader that reads as light moving through poured liquid, in blues.
It is not decoration and never a static gradient imitation: it renders, it drifts,
it is the reason the page feels alive.

On the home page it once appeared in exactly two places, the opening and the
close. On the user's instruction it now lights the whole way down the page, and
what keeps that from flattening is that each appearance is a different *depth*
of the same field, never a copy of it:

1. **The hero**, full-bleed, at full strength.
2. **The descent.** The field hangs on for `--descent` (58svh; 34svh on phones)
   past the hero's box, with nothing on it but the light going down, and
   darkens in Oklab into PoleLab's water. There is no edge anywhere: the hero's
   first viewport is untouched, and the work stage rises out of the deep
   (`bridge.js`, `bridge.css`).
3. **The work stage's water.** A second canvas behind the pinned stage computes
   its folds in the *hero's* frame on the same clock, so the folds carry on
   printed in each project's ground (§3), sliding past at 0.3× once pinned so
   the stage still reads as sinking while its content holds. It thins through
   CareRouter and is gone by CyberSci, whose ground is flat: the canvas hides
   and stops drawing there.
4. **The experience flight** (§6), a world built from the same shader — haze
   and ribbons rather than a full frame of cloth.
5. **About**, one viewport of silk stuck behind the section, ramping up out of
   the flight's ground at the top and back down to paper for the close.
6. **The close** (contact), rising from the bottom edge, at reduced strength.

So the rhythm is light, depth, light, haze, light, paper, light. Never more than
two canvases draw at once; each pauses off screen and on a hidden tab, and
resumes only if it is still on screen when the tab comes back.
The blog masthead carries the same field once, at 0.85, and the article below it
is paper.

### The committed field, and the four it was chosen against

The field's character comes down to **one ratio**: whether the fold phase is led
by position or by the turbulence. Position-led gives parallel ribbons with a
constant lean — woven cloth, and the closest fit to the pinned reference's
geometry. Turbulence-led gives broad molten folds that lose that geometry
entirely — poured liquid.

**The site ships the turbulence-led field (`marble`).** It is the smoothest and
least structured of the variants, and it was chosen for exactly that: the brief
asked for the reference's "video" quality above all, and this reads most like
moving light and least like a woven material. It is a **deliberate divergence**
from the reference's parallel-ribbon composition — picked over the closer-fitting
`silk` with that trade understood.

All five states live in `PRESETS` in `silk.js` and run side by side in
`silk-lab.html`. Switching is one word: `data-preset` on the canvas, or the
default in `mount()`. Nothing else in the system changes.

### How it is built, and why each choice is load-bearing

The material quality is the point: it has to read as **poured liquid**, not as a
blurred photograph of clouds. Three decisions carry that, and none of them is
interchangeable — they hold for every preset.

**The field is all sines.** Iterated sine turbulence — each pass folds the plane
back through itself — and *not* lattice noise. A value-noise fbm is only as smooth
as its interpolant: it carries a grid, an octave seam, and a derivative kink
wherever cells meet. Those artefacts are exactly what makes a shader look like
fog. A sum of sines of sines is analytic everywhere, so a fold keeps a clean edge
no matter how hard the light leans on it. This is the single change that separates
this field from the one it replaced.

**The palette is not monotone.** Six stops, and the fifth is a deep blue sitting
between the pale stop and the specular white, so every crest is born with its own
crease beside it. That inversion is what gives the cloth an edge; a plain
dark-to-light ramp can only ever produce haze. The crease is pitched at
`--display`, so the fold's shadow and the display serif are the same blue.

**It is mixed in Oklab, in linear light.** Blending blues through sRGB drags them
grey at the midpoint, which is what makes a gradient look muddy. The stops are
converted to Oklab once on the CPU and uploaded as uniforms, so the fragment pays
for one Oklab→linear on the way out and nothing else. All illumination — the lamp,
the pooled deeps, the reading light, both speculars — moves Oklab lightness and
chroma **together**, the way real light does: the lit face desaturates toward
white, the deep face saturates.

Interleaved gradient noise dithers the result at ±1.7/255. The flats here are very
wide, and banding is the one artefact that would give the whole illusion away.

### The reading light

Each mount declares where its own type sits, as `data-read="cx cy rx ry"`. The
field lights that patch so copy never lands in a crease — the same move the pinned
reference makes, where the type occupies the palest part of the frame.

It is a **floor under Oklab lightness, not a wash**: only the crease is dark enough
to threaten body copy, so only the crease is lifted. The folds keep their edges
where the type sits; they simply stop going deep there. Washing the area pale
instead bleaches that third of the frame flat, which is the opposite of the brief.

The zone is a **plateau**, sized to the whole type stack rather than to its centre,
so no line of copy sits on the shoulder of the falloff. This is what holds every
element on the field at ≥4.5:1 across the entire drift, at every breakpoint. If
the hero's copy ever moves, `data-read` moves with it.

**Fallback:** if WebGL is unavailable, a layered radial-gradient standing in at the
same colours. Under `prefers-reduced-motion`, the shader renders **one static
frame** — the field is still there, it simply stops moving.

**Budget:** DPR capped at 1.5; the shader pauses via `IntersectionObserver` when
its section leaves the viewport. It must never run offscreen. Measured at a locked
60fps (16.7ms median) on a 1.28M-pixel canvas.

## 2. The column grid

A **fixed, full-height hairline column grid** sits behind all content, spanning
the content container: 4 columns, 5 rules. It is the site's structural signature
and it is visible on every screen ≥ 900px. Content aligns to it; nothing floats
free of it. Below 900px the grid drops to a single centred column and the rules
hide.

Container: `min(1320px, 100% - 96px)`.

## 3. Colour

**Strategy: Restrained.** One blue family, white ground, no second hue. The silk
field carries all the colour energy the page needs; a second accent would fight it.

```
--paper       #ffffff   page ground
--paper-tint  #f5f9fd   inset panels, table stripes
--wash        #e8f2fc   quiet section bands

--display     #27517e   the display serif
--ink         #1b4c78   body text
--ink-soft    #5a82ab   secondary text, standfirsts
--ink-faint   #9ab6d1   labels, disabled index rows, meta

--rule        rgba(39, 81, 126, 0.13)   hairlines, borders, grid
--rule-soft   rgba(39, 81, 126, 0.06)   table stripes, hover grounds
--halo        rgba(39, 81, 126, 0.05)   focus + hover fills
```

**Status is carried by weight and a small filled dot, never by hue** — a
"Current" marker is `--display` at 500, not green.

**On the field, secondary text steps up one level.** `--ink-soft` is tuned for
paper; over the silk it cannot clear 4.5:1 at any point in the drift, so the hero,
the close and the masthead set their mono and their one exposed bracket in `--ink`.
The hierarchy is unchanged — it was already carried by size, tracking and case,
which is where it belongs.

**The fixed chrome steps up two.** The bars carry a paper scrim so body copy
scrolling past never collides with the nav, but over the field that scrim was a
blurred white slab banked across the top and bottom of the first viewport —
fogging the one thing the field is for. So it is painted only where it does that
job: `chrome.js` drops it whenever a bar's band sits over a field's solid range,
and the chrome sits on raw light instead. That leaves the nav as the only type on
the site with nothing under it at all, and `--ink` bottoms out at 3.97:1 in the
top-right corner where the field's own reading floor barely reaches. `--ink-field`
is one rung deeper and clears 4.5:1 across the whole drift. It appears nowhere
else; on paper the scrim is back and `--ink-soft` is correct again.

Each field declares where it is at full strength as `--field-from`/`--field-to`
and builds its own mask from those values, so the mask and the scrim can never
disagree about where the light starts.

**The veil.** The descent is the one place light turns to dark under the bars,
and across the middle of that turn neither ink holds 4.5:1 on bare cloth. So the
hero's field also declares `--field-veil`: from there down to `--field-to` a bar
keeps the field's ink but gets its paper scrim back, for about 90px of scroll.
Past `--field-to` the bar is over PoleLab's water and takes the ground's ink —
`work.js` reaches that far up above the stage (`--ground-above`) so the handover
happens where the water is already deep. On About's field the phone layout keeps
the scrim throughout, as the stacked work stage does, because copy scrolls under
the bars the whole way down.

### The work stage's grounds

The work stage (§7) is the one place the page goes to depth, and it does it
without leaving the family: each project stands on its own blue, and the change
of ground is what tells you the project changed.

```
[data-ground="pole"]  #0f2640 · title #eef5fc · text #c2d6ea · soft #a9c4df   deep water — PoleLab
[data-ground="care"]  #27517e · title #f4f8fd · text #dde9f6 · soft #c9dcf0   the display blue — CareRouter
[data-ground="ctf"]   #d9e8f7 · title #27517e · text #1b4c78 · soft #3a6590   the hero's light — CyberSci
```

The order is the point: out of the hero's light, down to depth, and back up to
light before the flight's haze. Every ink clears 4.5:1 on its own ground (the
lowest is 4.89:1).

**The grounds are water, not paint.** Pinned, each ground is the silk field's
folds printed in that ground's own colour (§1), and a fold may lift and sink the
ground only so far, in Oklab lightness: PoleLab `+0.15 / −0.09`, CareRouter
`+0.045 / −0.12`, CyberSci none. The lift is the cap that matters — it is set so
each ground's softest ink still clears 4.5:1 on the brightest crest (PoleLab
4.88:1, CareRouter 4.58:1). CyberSci's ground is left flat because it is the one
the section below meets. The grain blends between projects on the same curve as
the colour, so the texture moves with the ground rather than beside it. The values are written once, in `home.css`, and `work.js`
reads them back off the slides, then blends ground and inks on the stage between
projects — the ground in Oklab, for the same reason the field is mixed there,
and the inks across the middle third of a handover only, so type never sits on a
ground halfway to its own colour for longer than it must.

Grounds live **only** in the work stage. Do not spread them to sections, cards,
or chrome — the chrome only borrows a ground's ink while it is over one (below).

**The chrome over a ground.** Pinned, nothing scrolls under the bars, so they
drop the paper scrim and take the ground's title ink, exactly as they step up
over the field. On the stacked phone layout copy does scroll under them, so the
scrim stays — in the ground's colour rather than paper's. Over a card they keep
the paper scrim: the screenshots are paper-light and a ground's light ink would
vanish on them.

### Inside a card, the project speaks for itself

Each card is a **real screenshot** of the project's most important screen, and
inside it the project looks the way it ships: PoleLab's pit wall (carbon on
off-white, one warm red), CareRouter's chat (blush ground, Queen's navy, gold).
Restyling them in blues would make them pictures of this site. Nothing inside a
card leaks out of it — no red on the page, no navy or gold in the chrome.

## 4. Type

| Role | Face | Setting |
|---|---|---|
| Display | **Source Serif 4** | `opsz 60`, weight 400, `letter-spacing: -0.035em`, `line-height: 1.02` |
| UI + body | **Geist** | 300–600 |
| Labels, brackets, meta | **Geist Mono** | 400/500, `0.12em` tracking, uppercase |

Source Serif 4 is chosen deliberately: it is the reference's own declared fallback
for its licensed display face (Meraki), and its display optical size gives the
hairline thinness the composition needs at 100px+. Do not swap it for a
higher-contrast editorial serif — the world is calm, not dramatic.

**On Geist.** Automated checks flag Geist as a saturated face, and that is fair in
general. It stays here for a specific reason: it is the exact UI face the pinned
reference uses, the pin is the user's explicit instruction, and in this pairing
the serif carries all the identity while the sans is deliberately neutral
furniture. If the pin is ever lifted, this is the first thing to revisit.

The display face is reserved for: the hero line, section titles, the contact
address, project names on the work stage, blog article titles, and **every label in
the constellation**. **It never sets body copy, and it is never bolded** — weight
400, occasionally 300 at the largest sizes. Size comes from scale, not weight.

The constellation is the one place the serif is set small, and it is the reason
that diagram holds together: hub, topics and satellites are one face at three
sizes, the satellites in italic, so the whole fan reads as a single voice rather
than a diagram assembled from mono tags. Mono would have made it furniture.

**Separator.** Mono labels separate their parts with a middle dot: `01 · Selected
work`, `Next.js · Gemini · 2026`, `Previously · Product Team, AVTD at TrendAI`.
One separator glyph across the whole system; em-dashes stay in prose, where they
are punctuation rather than furniture.

## 5. The bracket

`[ Label ]` is the site's interactive notation, carried from the reference. Every
secondary action, nav item, and tag renders as monospace text between literal
brackets with a hairline hover ground. The brackets are **real characters in the
markup**, not pseudo-elements, so they survive copy-paste and screen readers read
them as written.

The primary action uses `↳ Label` instead — one turnstile arrow, no brackets, no
filled button. **There are no filled buttons anywhere on this site.** Affordance
comes from the bracket, the hairline, and the hover ground.

## 6. Motion

One idea: **things arrive by settling, and light never stops moving.**

- The silk field drifts continuously and slowly (`~0.088` time scale). It is the
  only perpetual motion on the page.

  Two things give that drift a beat instead of leaving it as noise morphing. A
  **broad sheen** pools on every crest, so the surface reads wet rather than matte.
  And a **raking glint** makes one slow pass across the folds every 21 seconds —
  the cloth turning under a lamp. Without it the field is smooth but inert; it is
  the difference the user asked for when they called the reference "video-like".

  The field **opens on a chosen frame** (`OPEN`), not on `t=0`. Every phase this
  shader reaches is a valid composition, but they are not equally good, and the
  first viewport is the most important frame on the page. Reduced-motion visitors
  are held on exactly that frame — the still *is* the opening, which is why there
  is one constant and not two.
- Content reveals once on entry — 24px rise, 700ms, `cubic-bezier(.22,1,.36,1)`,
  staggered by `--d`. **Reveals do not replay on scroll-back.** The old site
  re-animated every pass; that reads as restless here.
- Hover is a hairline or ground change, 160ms. Nothing scales, nothing tilts,
  nothing bounces.
- The constellation draws itself once when scrolled into view (below).

**The constellation is the one diagram that answers back, and the one that keeps
moving.** It is a spring field: every label but the hub floats the whole time the
section is on screen, drawn along by two slow waves per axis whose frequencies
never line up, so no label retraces a loop and the twelve never fall into step.
Satellites swing about ±11px, topics half that, the hub not at all. Every line
runs to one of two anchors on the hub, so the fan breathes with them.

Hovering any label lights its family and **drops it toward the cursor under
gravity** — no drag, no spring, so a label starts slowly and arrives fast, near
ones in half a second and far ones in three. Since every line runs to the hub,
that gather is the *only* way the groupings are legible, which is what earns it.

Two rules keep the fall honest. A label crossing the field passes *over* the
dimmed labels standing still — they are at a third opacity and it is on top of
them for a moment — but it never passes the hub or another label falling with it,
so the pile at the cursor is a real pile and the hub is never obscured. And the
field is a box: nothing leaves it, however hard it was falling.

This is a deliberate exception to §1 and §8, made on the user's instruction: the
silk field is no longer the only perpetual motion on the page. It survives on two
conditions — the drift is slow and small enough to read as buoyancy rather than
animation, and it never runs where it isn't wanted. The loop pauses off screen
and on a hidden tab, and under `prefers-reduced-motion` it never starts: that
visitor gets the drawn fan, already complete, exactly as §6 describes.

**Scroll drives three sections, and it must not drive them the same way.** On the
work stage scroll hands over a *project*: the section pins and each card gives
way to the next (below). In Experience scroll advances *time*, because it is a
chronology and the scroll axis is already the time axis: on desktop the flight
(below) carries a camera along a thread from one job to the next. In About scroll
*draws*: the flight's thread comes out of its frame and a pen carries it on down
the page (below).

Where the flight cannot run — phones, reduced motion, no WebGL — the ledger does
Experience's job flat, and only there is its header shown: a hairline is drawn down
the left column rule to the reading line, and each job's mark is a station on it.
Nothing pins at section scale there, and nothing fades. Two states, and the
difference is the rule above, not an inconsistency:

| State | Meaning | Reverts |
|---|---|---|
| `is-reached` | the line has been drawn past this job | never — it is a reveal |
| `is-reading` | which job you are in | yes — it is a position indicator, like the stage's rail |

The reading line is derived from the sticky offset rather than picked as a
fraction of the viewport, so the filled node always sits exactly at the drawn
end. Pen tip and ink are the same point; if they separate, the effect is wrong.

A company name arrives at **1.62×** the record scale and settles to 1× by the
time the line reaches its job, so the name lands at the instant its node lights.
Size comes from scale, never weight (§4). It is a `transform`, not a live
`font-size`: a font-size would reflow the bullets under it every frame, change
the ledger's height, and feed that height back into the spine maths. It grows
from `left bottom` so the overhang stays inside the row's own top padding, and
the heading's box is `fit-content` so scaling it does not throw its right edge
off screen behind the body's `overflow-x`.

**The work stage.** Pinned by the user to the scroll animation on
`https://johngearhart.me`. The runway is one table in `work.js` — a rest on each
project with a handover between each pair — and every frame
is a pure function of where scroll sits on it, so going back up plays it all in
reverse.

- **The arrival is already composed.** The stage rises out of the descent (§1)
  as the first project at rest — name, meta line, card, caption, rail — and
  pins. It never opens full bleed: the user ruled that out, because the first
  thing seen after the hero should be the composition, not a screenshot filling
  the screen.
- **The card is a transform, never a layout.** It rests in a slot sized to the
  height left between the name and the caption, and only ever leaves it by
  transform.
- **A handover.** The card leaving tips toward you and drops away, fading; the
  next rises from just behind it and straightens. The one leaving is in front,
  because it is coming toward you. Names and meta lines roll through their own
  line boxes — the meta a beat behind the name — and the caption hands over under
  them. The ground blends as §3 describes.
- **The snap.** When the wheel stops partway through a handover, the page glides
  on to the nearer rest *in the direction you were going*: past a tenth of the
  way, it carries on; short of that, it settles back. So a flick always finishes
  the move it started, as on the reference, but scroll is never taken away — the
  stage only ever moves where the page's own damped scroller would take it, and
  only after a wheel, never against touch, keys or the scrollbar.
- **Every way in lands at rest.** `[ Work ]`, `[ View work ]`, the rail and deep
  links to a project all go to that project resting and pinned, not to the
  section's top edge with the stage still rising.
- **While the stage has the viewport the column grid steps back.** The stage is
  the one surface the grid's rules do not pass across.
- **The card is only a link once it has landed.** Mid-flight it would take
  clicks meant for the one arriving.

Phones, and anyone under `prefers-reduced-motion`, get the same markup as a
stack of three grounds. On phones each project rolls in once as it arrives —
name up through its mask, card up from behind — and never replays; under
reduced motion it is simply there. On a phone each card goes square and its
screenshot is zoomed to a readable scale around the part that matters
(`--focus`, `--zoom`), rather than shrunk to a thumbnail nobody can read.

**The experience flight.** Pinned by the user to the 3D timeline on
`https://clevir.li`. Scroll carries a camera along a hairline thread — Ciena
2023, Hydro Ottawa 2025, TrendAI 2026 — through a world built from the hero's
own shader (`xp3d.js`, `xp3d-scenes.js`; the ribbon world). Each job is a station:
a wireframe cube, and a label as real text — the year in mono, the company in the
display serif, the role. While the camera rests on a job its detail — the
ledger's own bullets and tags, cloned — settles in on the right half, starting on
the grid's middle rule. A rail of `[ year · company ]` brackets marks where you
are and jumps.

- **It arrives straight after the work stage.** There is no header band between
  them. The stage rises carrying a band of CyberSci's ground across its top edge
  that shrinks to nothing as it pins, so the two grounds meet without a cut
  (scroll-driven, `animation-timeline: view()`; without it, the old hairline).
  The section's heading stays in the page for screen readers.
- **Every frame is a pure function of scroll**, so going back up flies it in
  reverse. When the wheel stops mid-flight the page is carried on to the next
  job, so the camera only ever comes to rest at one.
- **Every way in lands on the pinned opening frame**, as on the work stage.
- **The exit hands the thread on.** Over the last 34svh the camera holds on
  TrendAI, the panel and rail fade, and the thread drops out of the bottom of
  the frame at the x About picks it up on, to the same reading line (70% of the
  viewport) About's pen is drawn to. The frame's foot settles to its own ground,
  which is the colour About's ground starts on.

**About's line.** The flight's thread carries on down the section as one SVG
stroke, drawn by scroll with the pen tip on that 70% reading line, over About's
silk field. It swings down the page in long bends — the *river* — and each fact
sits in the crook of one, alternating sides. Above the toolkit it fans out onto
the grid's five rules and runs on as the warp the groups hang between, then fades
into the rules themselves, so the close is handed a hairline rather than an edge.
A station is an open ring until the pen passes it, then filled — the same two
states as the flight's cubes. Each fact rises in once as the pen reaches it and
never replays (`is-reached` latches). On phones the line runs straight down the
left edge of the single column, a station per block.

Every one of these is `prefers-reduced-motion` guarded. The spine's guard follows
the silk field's: under `reduce` the line is still there and still complete, it
simply arrives already drawn instead of scrubbing. About's line does the same, and
the flight does not run at all: that visitor gets the ledger.

## 7. Components

- **Card is not a component** — with one exception. The old world was built from
  bordered, shadowed, rounded cards. This world uses **hairline rules and
  whitespace** to separate things. Radius is `0` almost everywhere; `2px` where a
  surface truly must read as inset. There are no drop shadows.
  **The exception is the work stage's project card**, on the user's instruction to
  follow the reference: one rounded card per project (`--card-r`,
  `clamp(14px, 2vw, 30px)`), holding a screenshot and nothing else. No border, no
  shadow, no text inside it; hover is a hairline inside its own edge. It is not
  to be reused anywhere else on the site.
- **The work stage.** The signature layout: a full-viewport stage straight
  after the descent, one project at a time — its name in the display serif, a mono meta line, the card, and a caption
  with one bracket link. A rail on the left column rule marks where you are and
  jumps. Scroll hands each project to the next (§6); each stands on its own
  ground (§3).
- **Experience is a flight** on desktop (§6), and a **ledger** everywhere else.
  The ledger stays in the page as the record either way — the flight reads its
  jobs, bullets and tags off it, and screen readers read it. It is not a stack of
  cards: a hairline-ruled table of date / organisation / role, with detail
  underneath. Its left column — mark and date — sticks beside its own detail, so
  you never lose whose work you are reading; where it shows, its year readout is
  set in the same mono as the stage's rail, so the two sections' position
  readouts rhyme without repeating.
- **About is a river** (§6): the record the dossier always carried — education,
  focus, languages, off keyboard — and the toolkit, held on the thread the
  flight hands down. Each fact is set in the display serif in the crook of a
  bend, its label in mono above it; the toolkit's four groups sit on the page's
  four columns, marked entries carried by weight and the display blue.
- **Screenshots are real, never staged.** A project's card is a capture of the
  running product's most important screen: PoleLab's live strategy report for
  Spa; CareRouter's intake chat, run locally and answered with the intake from its
  own tests; CyberSci's results listing, cropped to its own box. Nothing is edited
  beyond cropping, and nothing may be styled to look like a product screen that
  does not exist. Where the real screen cannot be shown honestly — CareRouter's
  results page, whose map fails without Maps billing — a different real screen is
  used rather than a patched one. PRODUCT.md records where each came from.

## 8. Prohibitions

These name devices the *old* world used that this one refuses. They are not
generic bans.

- No thick ink outlines, no hard offset `box-shadow` "sticker" edges, no
  `border-radius: 22px` cards (the work stage's screenshot card is the one
  exception, §7), no comic halftone dot fields.
- No filled pill buttons, no gold. No hue outside the blue family. (Inside a work
  card's screenshot the project's own interface is shown as it ships, pills and
  gold included — §3. That exemption stops at the card's edge.)
- No emoji as interface furniture (📮, ☁️, 🏆, 📖 all go).
- No perpetual bobbing, bouncing, or rotating decoration.
- No `Fredoka`, `Nunito`, or `Press Start 2P` on the classic site. (`Press Start
  2P` remains correct and untouched inside the village.)
