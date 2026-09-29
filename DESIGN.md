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

On the home page it appears in exactly **two places**, and nowhere else:

1. **The hero**, full-bleed, at full strength.
2. **The close** (contact), rising from the bottom edge, at reduced strength.

Everything between those two is white paper. That contrast is the whole rhythm:
light, paper, light. Adding a third silk field to the home page would flatten it.
The blog masthead carries the same field once, at 0.85, and the article below it
is paper — the same rhythm, one beat shorter.

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

### The one exception: work plates

The pinned work viewer is the single place that leaves the blue family. Each
project's plate carries its subject, and the change of ground is what tells you
the slide advanced. The drawn diagrams read these same properties, so a diagram
always matches the ground it sits on.

```
[data-plate="track"]  #e9edec / ink #24343a   asphalt — PoleLab
[data-plate="care"]   #e6efe9 / ink #1f4a39   clinical calm — CareRouter
[data-plate="ctf"]    #f4ece9 / ink #5e2a24   the record — CyberSci
```

Each plate declares four values (`--plate`, `--plate-ink`, `--plate-soft`,
`--plate-rule`, `--plate-rule-soft`) written out rather than derived, so canvas
can read them back directly. Rules: low-chroma tints only — the viewer stays
paper under glass, never three coloured boxes; every ink clears 4.5:1 on its own
plate; and plates live **only** in the work viewer. Do not spread them to
sections, cards, or chrome.

### Inside an open plate, the project speaks for itself

When a plate opens (§6) it carries a few seconds of the project, and inside the
demo's frame the project uses **its own** design language, not this one:
PoleLab's pit wall (Titillium Web, carbon on off-white, one warm red),
CareRouter's chat (blush ground, Queen's navy, gold). That is the point of the
demo — it shows what the thing is like to use — and restyling it in blues would
make it a picture of this site, not of the project. Titillium Web is loaded for
that frame and nothing else.

Everything around the frame stays in this system: the plate's own ground, mono
captions, one hairline for time, and a bracket for the only control. Nothing
inside the frame leaks out of it — no red on the page, no navy in the chrome.

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
address, project names in the viewer, blog article titles, and **every label in
the constellation**. **It never sets body copy, and it is never bolded** — weight
400, occasionally 300 at the largest sizes. Size comes from scale, not weight.

The constellation is the one place the serif is set small, and it is the reason
that diagram holds together: hub, topics and satellites are one face at three
sizes, the satellites in italic, so the whole fan reads as a single voice rather
than a diagram assembled from mono tags. Mono would have made it furniture.

**Separator.** Mono labels separate their parts with a middle dot: `01 · Selected
work`, `Next.js · Gemini · 2026`, `Currently · Product Team, AVTD at TrendAI`.
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
- Authored diagrams (routing graph, racing line, constellation) draw themselves
  once when scrolled into view, then hold.

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

**Scroll drives two sections, and it must not drive them the same way.** In the
work viewer scroll advances a *slide*: the section pins and the viewer
cross-dissolves — and partway through each slide, the plate **opens**. In the
ledger scroll advances *time*, because the ledger is a
chronology and the scroll axis is already the time axis: a hairline is drawn down
the left column rule to the reading line, and each job's mark is a station on it.
Nothing pins at section scale there, and nothing fades. Two states, and the
difference is the rule above, not an inconsistency:

| State | Meaning | Reverts |
|---|---|---|
| `is-reached` | the line has been drawn past this job | never — it is a reveal |
| `is-reading` | which job you are in | yes — it is a position indicator, like the work index |

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

**The plate that opens.** Each project gets a longer stretch of runway
(`170svh`, against `92svh` without demos), and in the middle of it the plate
lifts out of its slot and opens to nearly the whole viewport, between the two
chrome bars. A few seconds of the project plays inside (`demos.js`), then the
plate settles back into its slot before the viewer dissolves to the next one —
so either side of every demo is the viewer exactly as it always was.

- **The zoom is a transform, never a layout.** The open plate is laid out once at
  its open size and drawn at scale 1, so the type is sharp where it is read; at
  rest it is the same plate scaled down to sit in the slot. Scale moves
  geometrically and position follows it, so it reads as a camera closing in
  rather than a box growing.
- **While a plate is open, the rest of the viewer steps back.** The index, the
  slide's copy and the column grid fade with how open it is, and the drift of
  the dissolve is suspended. The plate is the one surface the grid's rules do not
  pass across.
- **The clock is time; scroll can only push it.** A demo plays at its own pace
  once the plate lands, and keeps playing if you stop scrolling. Scroll faster
  than it plays and it is carried forward, so a plate never closes on a
  half-finished frame. Coming back up into a plate from below puts it straight on
  its finished frame; coming down into it again plays it from the top.
- **Every demo is a seekable timeline** of pure tweens — any instant can be drawn
  directly. That is what makes the scroll push, the reduced-motion still and the
  replay all the same code.
- **One control:** `[ Pause ]` while it plays, `[ Play ]` when paused,
  `[ Replay ]` at the end. Time is a single hairline with a tick where each
  chapter starts, and the chapter's name reads beside it.

Phones get the plate inline, in the diagram's place, and it plays once when it
scrolls into view. Under `prefers-reduced-motion` the plate never opens: it sits
in the slot on its **finished frame**, with a replay for anyone who wants it.

Every one of these is `prefers-reduced-motion` guarded. The spine's guard follows
the silk field's: under `reduce` the line is still there and still complete, it
simply arrives already drawn instead of scrubbing.

## 7. Components

- **Card is not a component.** The old world was built from bordered, shadowed,
  rounded cards. This world uses **hairline rules and whitespace** to separate
  things. Radius is `0` almost everywhere; `2px` where a surface truly must read
  as inset. There are no drop shadows.
- **Work index + viewer.** The signature layout: a sticky left column listing the
  work, with the active entry in `--display` and the rest in `--ink-faint`; the
  right three columns hold that entry's full-bleed visual. Scroll drives which
  entry is active, and opens each entry's plate into its demo (§6).
- **Experience is a ledger**, not a stack of cards: a hairline-ruled table of
  date / organisation / role, with detail underneath. Its left column — mark and
  date — sticks beside its own detail, so you never lose whose work you are
  reading; the year readout is set exactly as the viewer's `01 / 03` counter so
  the two sections rhyme without repeating.
- **Authored visuals only.** Where there is no real screenshot, the visual is
  drawn in the site's own grammar — hairlines, blues, the display serif — never a
  gradient placeholder, a glass panel, or a generic icon tile. Nothing may be
  styled to look like a product screenshot that does not exist.
- **Demos are rebuilt, never invented.** A plate's demo is rebuilt from the
  project's real interface — its type, colours and copy, read out of its source —
  and every figure in it is real output: PoleLab's solved lap of Spa and the
  strategy report from the app's own fixtures, CareRouter's questions word for
  word and the intake from its own tests. Where the product's data would have to
  be made up — a live Places result, a rival team's name — the demo leaves it
  out rather than fill it in. Each plate says where its data came from, and
  compressed time is labelled as compressed.

## 8. Prohibitions

These name devices the *old* world used that this one refuses. They are not
generic bans.

- No thick ink outlines, no hard offset `box-shadow` "sticker" edges, no
  `border-radius: 22px` cards, no comic halftone dot fields.
- No filled pill buttons, no gold. No hue outside the blue family except the
  work plates above. (Inside an open plate's frame the project's own interface is
  shown as it ships, pills and gold included — §3. That exemption stops at the
  frame's edge.)
- No emoji as interface furniture (📮, ☁️, 🏆, 📖 all go).
- No perpetual bobbing, bouncing, or rotating decoration.
- No `Fredoka`, `Nunito`, or `Press Start 2P` on the classic site. (`Press Start
  2P` remains correct and untouched inside the village.)
