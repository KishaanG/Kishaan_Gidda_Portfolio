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
   the stage still reads as sinking while its content holds. It runs through all
   three grounds, each in its own colour, with each ground's accent on its
   sharp lines (§3).
4. **The experience flight** (§6), a world built from the same shader — haze
   and ribbons rather than a full frame of cloth.
5. **About**, one viewport of silk stuck behind the section, ramping up out of
   the flight's ground at the top and back down to paper for the close.
6. **The close** (contact), at reduced strength, filling the section from its
   top rule. It rises out of About's paper over a short fixed ramp (96px), so
   the seam is not an edge and there is no band of bare paper above the type.

So the rhythm is light, depth, light, haze, light, paper, light. Never more than
two canvases draw at once; each pauses off screen and on a hidden tab, and
resumes only if it is still on screen when the tab comes back.
The blog masthead carries the same field once, at 0.85, and the article below it
is paper.

### The committed field, and the five it was chosen against

**The site ships `drape`: one fold system, not three.** Every earlier preset
sums three turbulences that start from three different phases, so each frame
holds three unrelated sets of folds laid over one another. Where they cross, the
cloth curdles into eddies. On 2026-11-19 the user called the field that shipped
then (`marble`) "too disorganized" and asked for the pinned reference's
smoothness.

The reference gets that smoothness from structure, not from its settings. Its
layers all run the same turbulence and differ only by a constant phase, so they
add up to a single wave. `drape` does the same thing directly:

- **One turbulence** (`layers: 1`), so every fold in the frame belongs to the
  same system and they all run the same way.
- **Read through a distance, not a direction.** The band is `length()` of the
  plane warped by the turbulence at 0.21 (`radial` 4.0). That gives long sweeping
  arcs, where `marble` fed the turbulence straight into the phase
  (`chaosDir` 0.966) at twice the gain.
- **The warp crosses axes** (`cross`): each oscillator bends the other axis. This
  is what turns closed lenses into long drapes.
- **A wider contrast window** (`[0.18, 0.64]`). A single wave clips harder than
  three that partly cancel. At the reference's own window the frame split into
  flat blue and white slabs with hard edges.
- **`turn` −1.10 and `pace` 1.8.** The turn sets the drapes' diagonal lean, and
  the pace brings the drift close to the reference's speed.

The trade is `marble`'s molten eddies, which are gone. Some stretches of the
drift also carry broad white plateaus; that is the specular stop, as in the
reference.

All six states live in `PRESETS` in `silk.js` and run side by side in
`silk-lab.html` (keys 1–6). Switching is one word: `data-preset` on the canvas, or
`DEFAULT` in `silk.js`. `layers`, `turn`, `pace`, `cross` and `edge` default to
the old behaviour, so the first five run the same maths as before. `marble` and
`satin` measured pixel-identical; the other three differ by GPU rounding at a
few steep edges.

**The accent's threshold belongs to the field** (`edge`). The work stage's sharp
lines (§3) take the accent wherever the water's shading turns over faster than
`edge` per CSS px. One wave sweeps the whole palette at every fold edge, crossing
its crease three times, so at `marble`'s threshold (0.08–0.26) each edge drew a
triple red stripe, some across the stage's copy. `drape` sets it at 0.20–0.42,
which brings the lines back to about the density they had before.

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

### The stir: the disc moves the cloth

The disc (§7) is the one thing on the page that touches the field. The user asked
for the cursor to *move the water*, and everything tried before the stir failed
the same way, which is the rule this section exists to keep.

`folds(p, t)` is a closed formula: a point and a time in, a value out. So anything
laid over its output — a ripple, a wake, a swell, a comb, tilted lines, a flowmap,
a height-field of waves, a trail line drawn into the ribbons — plays over a
picture that carries on unchanged underneath, and the user reads it at once as
**a layer over a video**. Each of those was built, looked at and refused. A local
effect that returns to rest is the same mistake whatever it looks like.

What shipped instead moves the field's own phase. Each stretch of the disc's
travel leaves a **deposit**: a broad offset (σ 0.6 in p units, where the frame is
2 high) to the two oscillators the turbulence iterates on, signed by the
direction the disc went. It enters only inside the turbulence loop's `cos` and
`sin`, so every pass after it carries it on, and the waves themselves evolve
differently where the disc has been. A deposit holds for 3s, then spreads until,
at 7s, it belongs to the whole field and is folded into one offset for every
point. That offset is never taken back: a stirred field is a different field from
then on, not one that relaxes to what it was.

What keeps it from turning back into a layer:

- **It is only ever a phase inside the turbulence.** Never add to the ribbon
  band, the palette value, `p` or `q`.
- **It is broad and persistent.** Nothing path-shaped: no feature narrower than a
  deposit, nothing that traces where the cursor went.
- **It grows only by the disc's own movement**, so scrolling past a still disc
  stirs nothing. It is kept in the frame each canvas computes its folds in, so it
  stays on the cloth as the page scrolls.
- **One state is shared by every canvas**; only the canvas the disc is over takes
  its movement. The work stage's sharp lines (§3) sample `folds()` too, so lines
  the stir makes take the accent like any other.

Tune it only through `STIRRING` in `silk.js`. The user approved the feel at gain
0.6, 16 deposits and a 7s life (2026-11-19). On `drape` the same gain moved whole
drapes, about half the frame per sweep, so the user had it weakened and gain is
now 0.3 (2026-11-20). There is no stir on touch or under
`prefers-reduced-motion`.

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
the hero's copy ever moves, `data-read` moves with it. The hero's is
`0.5 0.4 0.7 0.6`, in the hero's own box: the centred stack, and the two foot
lines down in its corners (below 900px they stack, centred under it). A smaller
zone around the stack alone left the foot lines on the shoulder (measured
2026-11-19, while the field itself was being reworked: every element of the
stack and the foot ≥5.25:1 at 1440×900 across the samples taken). Re-measure
once the field settles.

**Fallback:** if WebGL is unavailable, a layered radial-gradient standing in at the
same colours. Under `prefers-reduced-motion`, the shader renders **one static
frame** — the field is still there, it simply stops moving, and the disc does not
stir it.

**Budget:** DPR capped at 1.5; the shader pauses via `IntersectionObserver` when
its section leaves the viewport. It must never run offscreen. Measured at a locked
60fps (16.7ms median) on a 1.28M-pixel canvas, before the stir. The stir adds up
to 16 gaussians to every `folds()` call, and the work stage's line sampling calls
`folds()` up to three times a pixel; that cost has not yet been measured on
integrated graphics. `drape` runs one turbulence per `folds()` call where the
earlier presets ran three, so the shader got cheaper with it.

## 2. The column grid

Content sits on a **4-column grid** spanning the content container, and nothing
floats free of it. Below 900px it drops to a single centred column.

**The grid is not drawn.** Until 2026-11-19 five fixed, full-height hairline
rules marked it on every screen ≥ 900px, over all content. The user removed them.
Don't bring them back. The columns remain as positions: the work stage, the
ledger, About's river and the curtain's stairs still land on them. The hero is
a centred title card and does not.

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
is one rung deeper and clears 4.5:1 across the whole drift. As type it appears
nowhere else; on paper the scrim is back and `--ink-soft` is correct again. Its
one other use is as a ground: the curtain (§6), the deepest blue the family has,
standing in for the reference's black.

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

**The disc inverts lightness, never hue.** Its lens is `invert(0.75)
hue-rotate(180deg)`: the inversion turns the hue round and the rotation turns it
back, so the site's blue stays blue inside the disc and a project's red stays
red. It inverts three-quarters, not fully (user, 2026-11-19): a full inversion
turned the page's near-white near-black; at 0.75 it is a soft charcoal. That is why it can pass over the field, paper and every ground without
bringing a second hue onto the page. Its arrow is white on a dark keyline, so it
reads on whatever the lens turns the ground into: a screenshot's white goes black
in it, PoleLab's carbon goes pale. Without `backdrop-filter` it falls back to a
plain `difference` inversion, hue and all.

**On a control the disc snaps, iPad-style** (user, 2026-11-19). Over any link
or button it leaves the cursor and takes the control's own box, plus 6px
padding and the control's corners (never sharper than 6px). It sits over the
control as a faint tint in the control's ink (13%; on the stage, the accent at
32%), and leans toward the mouse by up to 6px. A project's card snaps too, on the user's word. Because it is
wider than 480×160 it takes half the tint. The lens no longer carries an arrow: the
snap is what says a thing is clickable. A press sinks the disc to 0.92. Three seconds
without the mouse moving fades it out. Under reduced motion it snaps without a
spring. The system cursor is hidden wherever the disc runs: the disc is the pointer
(user, 2026-11-19), 40px off a control (it was 60px).

**Over the work stage the disc is the project's accent, at 42%** (user,
2026-11-19): PoleLab's and CyberSci's red, CareRouter's gold. There the lens
gives way to a see-through fill (the user asked to see through it), because
the stage already carries each project's hue.
Pinned, `work.js` writes the blended accent to the root as `--stage-accent`, so
the disc turns from red to gold across a handover with the names. Stacked, it
takes the accent of the ground under the cursor. Off the stage it is the lens
again.

### The work stage's grounds

The work stage (§7) is the one place the page goes to depth: each project
stands on its own ground, and the change of ground is what tells you the
project changed.

```
[data-ground="pole"]  #0b0d14 · title #f2f4f8 · text #c6ccd6 · soft #aab3c0 · accent #ff1e00   carbon — PoleLab
[data-ground="care"]  #3a4a5c · title #f5f7fa · text #dfe5ec · soft #c8d1dc · accent #f5b800   grey-blue — CareRouter
[data-ground="ctf"]   #f4f5f7 · title #16181d · text #2a2f38 · soft #4a5260 · accent #e0241b   white — CyberSci
```

The order is the point: out of the hero's light, down to depth, and back up to
light before the flight's haze. Every ink clears 4.5:1 on its own ground (the
lowest is 4.89:1).

**PoleLab's ground is its screenshot's, not the page's** (user, 2026-11-18). It
was deep navy water, and when PoleLab's card became its near-black home page the
descent read as a hard cut: light silk falling into saturated blue, then a black
slab dropped on it. So that ground is now PoleLab's own carbon — a blue-black
`#0b0d14`, a shade above the screenshot's black so the card keeps an edge, with
the faintest cool cast so the hero's blue can fall into it — and its inks are the
screenshot's silver rather than the page's blue-whites. Its folds lift to the
grey of the screenshot's horizon (`#323540` at the cap), not to blue.

**Every ground now takes its project's world, accent and all** (user,
2026-11-18): PoleLab carbon with its Warm Red, CareRouter grey-blue with Queen's
gold, CyberSci white with red. The accent is never a fill or a glow on the
stage itself (a red aura behind PoleLab's card was tried and refused). It lives
in exactly three places: the disc while it is over the stage (above), the
rail's active tick, and **the sharp lines in the ground's folds** — the
places where the water's shading turns over in a few pixels, a crest pinched
against its crease. The broad waves keep the ground's own colour. `silk.js`
finds those lines by steepness, sampling the fold field one CSS px either way
wherever a cheap 2×2 derivative says a line is near (the derivative alone is
blocky at the stage's 0.66 render scale), so they stay smooth at any scale and
cost nothing in the broad water. PoleLab's red lines run up the descent too, so
the water has them before the stage arrives. `--st-accent` blends with the
inks between projects. Each accent clears 3:1 for a graphical object on its
ground's brightest or darkest fold.

**The grounds are water, not paint.** Pinned, each ground is the silk field's
folds printed in that ground's own colour (§1), and a fold may lift and sink the
ground only so far, in Oklab lightness: PoleLab `+0.17 / −0.06`, CareRouter
`+0.06 / −0.10`, CyberSci `0 / −0.05` (white can only sink). The lift is the cap that matters — it is set so
each ground's softest ink still clears 4.5:1 on the brightest crest (PoleLab
5.77:1, CareRouter 4.54:1). CyberSci's ground is left flat because it is the one
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
over the field. That holds for the footer too, although the pinned cards run
under it: the stage lays a band of its own ground across the cards' width at
the bottom of the screen, solid as high as the footer's tallest item reaches,
so the cards sink into the ground there rather than putting a screenshot under
the footer's type (worst pixel 5.28:1, CareRouter at 1280×720). On the stacked
phone layout copy does scroll under the bars, so the scrim stays — in the
ground's colour rather than paper's. Over a stacked card they keep the paper
scrim: the screenshots are paper-light and a ground's light ink would vanish on
them.

### Inside a card, the project speaks for itself

Each card is a **real screenshot** of the project's most important screen, and
inside it the project looks the way it ships: PoleLab's home page (carbon black,
one warm red, the season globe), CareRouter's support pathway (white panels, Queen's navy, the map).
Restyling them in blues would make them pictures of this site. Nothing inside a
card leaks out of it as a fill: the grounds borrow each project's world (above),
but only as their ground, their inks and an accent drawn in lines — never a
coloured panel, glow or badge.

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

The display face is reserved for: the hero's name, section titles, the contact
address, project names on the work stage, and blog article titles. **It never
sets body copy, and it is never bolded** — weight 400, occasionally 300 at the
largest sizes. Size comes from scale, not weight.

**Separator.** Mono labels separate their parts with a middle dot: `01 · Selected
work`, `Next.js · Gemini · 2026`, `Previously · Software Engineer at TrendAI`.
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
  nothing bounces. The disc (below) is the one exception, because it is not a
  hover state of anything: it follows the cursor everywhere.
- The close is type alone. Until 2026-11-19 a constellation sat above it: "The
  Work" as a hub, with a floating fan of topics and skills that gathered toward
  the cursor. The user removed it because it didn't fit. Don't bring it back.

**The disc follows the cursor; it does not replace it.** Pinned by the user to
skiper-ui's "Hover members" (`https://skiper-ui.com/v1/skiper6`). It trails the
cursor on a loose spring (ζ ≈ 0.84), so it drifts after it and settles a little
past; over a link it closes in on a stiffer one (ζ ≈ 0.94), so the arrow sits on
the link. It scales in when the cursor comes into the window and out when it
leaves, and comes back under the cursor rather than flying in from where it last
was. When the cursor stops, the disc settles and its loop sleeps, so it is not
perpetual motion. Its movement is what stirs the silk (§1). Under
`prefers-reduced-motion` it sits exactly on the cursor, with no spring, and stirs
nothing.

**The curtain covers the load, and lifts in stairs.** Pinned by the user on
2026-11-19 to skiper-ui's "Stairs preloader" (`https://skiper-ui.com/v1/skiper9`),
because a cold load was slow. Home page only (`curtain.css`, `curtain.js`). The
name sets word by word, white serif on `--ink-field`; then the words fade out
in reading order and the ground collapses to the top in stairs, the right
column leading. The reference's motion was measured frame by frame and kept:
a 900ms fade in, 200ms apart, and stairs 480ms each with an ease-out, 50ms apart,
starting 420ms into the exit. Three things are adapted:

- **Four stairs on the page's own grid**, not the reference's five equal ones.
  The inner two are one grid column each and the outer two take the margins, so
  the steps open along the columns the content is set on.
- **The exit fade is quicker** (560ms, 120ms apart). The stairs uncover the hero's
  heading right where the name sits, and a name still half there reads as a
  ghost over it.
- **The hero's heading is the name, on the curtain's spot** (user, 2026-11-19,
  when the old display line "I build the thing, then I try to break it." was
  dropped). It is set at the curtain's size, centred by the hero's
  `1fr auto 1fr` rows, and its word space is widened to the curtain's 0.26em
  gap, so it lands on the curtain's words to within a couple of pixels. It
  fades in where it stands rather than taking the 24px rise: the lift reads as
  the name changing ink, not a second name arriving. On phones the hero is
  92svh, so it sits about 10px above the curtain's name.
- **It lifts on readiness, not a timer.** It waits for `load` and for the hero's
  silk to have a first frame (`silk:ready`, which fires on every path out of
  `mount`, the fallback included), and never before the name has fully set.
  Whatever is still loading, it lifts by 4.5s. The name waits for Source Serif 4
  (up to 1.2s), because `display=swap` would otherwise change its face halfway
  through the fade.

The page's entrance waits for it: `home.js` holds the `.rise` reveals until
`curtain:lift`, so the hero settles while the stairs pull away. Scroll input is
held while it is up. Hiding the scrollbar would reflow the page twice. It sits
over the chrome and under the disc, which stays the pointer. Under
`prefers-reduced-motion` the name is simply there and the whole curtain fades. With
no script it never shows: an inline script in the head raises it, and also takes
it down at 7s if `curtain.js` never does.

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
  as the first project at rest — name, meta line, copy, rail, card — and
  pins. It never opens full bleed: the user ruled that out, because the first
  thing seen after the hero should be the composition, not a screenshot filling
  the screen.
- **The picture is as big as the width allows.** On the user's sketch
  (2026-11-18) the name and copy sit at the top and the card takes the
  container's whole width below them, running on off the bottom of the screen.
  The card hangs from one line shared by every project (each head and caption
  takes the tallest one's height), keeps its screenshot's own shape
  (`--card-ratio`: 16:10 unless the slide says otherwise; PoleLab's home page is
  1999:922, and forcing it to 16:10 would crop away its headline or its
  countdown), and is cut by the screen's edge, not fitted to it. The listing
  has no shape to keep, so its card fills what shows and the listing sits in
  the middle of it.
- **The card is a transform, never a layout.** It hangs from its line and only
  ever leaves it by transform.
- **A handover.** The next card comes up from under the fold, over the one at
  rest, and lands where it was; the one it covers sinks back — 6% smaller, 18px
  lower, and 60% of the way into the ground — and is wholly covered by the time
  the new one lands. The one arriving is in front because it is the one coming
  up. Names and meta lines roll through their own line boxes — the meta a beat
  behind the name — and the copy hands over under them. The ground blends as §3
  describes. Card, names and ground all ride one sine curve, so they cross the
  middle together and nothing moves faster than about one and a half times the
  scroll. (The cubic this replaced moved things at three times the scroll
  through the middle of a handover, which read as a lurch.)
- **The snap.** A wheel that stops partway through a handover has the page
  carried on to the nearer rest *in the direction you were going*: past a tenth
  of the way, it carries on; short of that, it settles back. So a flick always
  finishes the move it started, as on the reference, but scroll is never taken
  away — only after a wheel, never against touch, keys or the scrollbar, and a
  wheel that keeps going goes straight through.

  It is decided from where the wheel alone would have put the page
  (`Scroller.aim`), not where the page is or where a snap is taking it, so the
  same wheel total lands on the same rest as a plain accumulate-then-snap would
  (checked for 8 and 12 notches, two touchpad-style streams, and a reversal
  mid-glide). A wheel that commits finishes the handover on that event, while
  the page still has its speed. The glide that finishes it (`Scroller.glide`) is a
  cubic that leaves at the page's own measured speed and arrives at rest, timed
  by distance (480–1100ms). The old snap waited for the page to stop, then
  started the damped glide at its fastest: measured, the page came to a dead
  stop for ~300ms and then lurched at 4.8 px/ms, three times its own scrolling
  speed. Now a four-notch scroll into a handover is one rise and fall peaking
  at 1.35 px/ms. A wheel during a glide adds its notch to where the glide is
  going and re-times it, rather than dropping back to the damped glide, which
  would leave at its fastest.
- **Every way in lands at rest.** `[ Work ]`, `[ View work ]`, the rail and deep
  links to a project all go to that project resting and pinned, not to the
  section's top edge with the stage still rising.
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
own shader (`xp3d.js`, `xp3d-scenes.js`; the ribbon world). Its cloth runs the
hero's `drape` field (§1) at turn 0, so on the ribbon the folds run along its
length (user, 2026-11-20). Each job is a station:
a wireframe cube, and a label as real text — the year in mono, the company in the
display serif, the role. While the camera rests on a job its detail settles in
on the right half, starting on the grid's middle rule: the date line, the job's
points as **callouts**, then its tags. A rail of `[ year · company ]` brackets
marks where you are and jumps.

- **The points are callouts, not a list** (user, 2026-11-19; chosen over a
  hung-figure list, a lede with labelled pairs, a hover index and a
  scroll-stepped sequence). A bulleted list in a box read as notes pasted into
  the scene. Each point is the ledger's own line under a mono label (`data-key`),
  and they stand on an arc about the station, the middle ones furthest out, so
  every leader is about as long (`xp3d-callouts.js`). A hairline runs from the
  station's own point to each callout. The leaders leave the station as one
  line, run on behind its label (rubbed out, like the thread), and only part at
  the label's far edge, so the fan opens from the company's name. They draw out
  as the camera settles, a beat apart, and each callout shows only once its
  leader reaches it. They are drawn on the flight's hairline canvas, in the
  thread's ink at a lighter weight; nothing is knocked out between the
  callouts, because that air is where the leaders run.
- **On a short screen it gives up air, then the tags.** At 780px tall or less
  the tags are dropped from the flight (never from the ledger): each names
  something a callout already says.

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
the grid's five column lines and runs on as the warp the groups hang between, then
fades out above the close, so the ink ends softly rather than at an edge.
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
  to be reused anywhere else on the site. Pinned, it runs off the bottom of the
  screen, so only its top corners are ever seen.
- **The work stage.** The signature layout: a full-viewport stage straight
  after the descent, one project at a time. At the top, on the grid's second
  rule: its name in the display serif, a mono meta line, and a few lines of copy
  with one bracket link beside them. Below, the card across all four columns,
  running off the bottom of the screen. The markup is in that same order, so
  reading order and visual order agree. A rail in the first column, beside the
  name, marks where you are and jumps. Scroll hands each project to the next
  (§6); each stands on its own ground (§3). On phones the copy starts at the
  edge and the card sits under it, square, as before.
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
- **The disc.** A 40px lens that trails the mouse on every classic page
  (`follow.js`; `.disc` in `site.css`), and is the pointer: the system cursor is
  hidden. On a link or button it snaps to the control's box (§3). The disc is `aria-hidden` and takes no pointer events, so it never
  changes what a click does. Fine pointers only: on touch there is no cursor to
  follow, and it never mounts.
- **Screenshots are real, never staged.** A project's card is a capture of the
  running product's most important screen: PoleLab's live home page, chosen by
  the user (2026-11-18); CareRouter's support pathway, with its map of Kingston; CyberSci's results
  listing, cropped to its own box. Nothing is edited beyond cropping, and nothing
  may be styled to look like a product screen that does not exist. Where the real
  screen cannot be shown honestly, a different real screen is used rather than a
  patched one. PRODUCT.md records where each came from.

## 8. Prohibitions

These name devices the *old* world used that this one refuses. They are not
generic bans.

- No thick ink outlines, no hard offset `box-shadow` "sticker" edges, no
  `border-radius: 22px` cards (the work stage's screenshot card is the one
  exception, §7), no comic halftone dot fields.
- No filled pill buttons, no gold fills. Outside the work stage, no hue outside
  the blue family; inside it, each project's ground and its one accent, drawn
  only as lines (§3). (Inside a work
  card's screenshot the project's own interface is shown as it ships, pills and
  gold included — §3. That exemption stops at the card's edge.)
- No emoji as interface furniture (📮, ☁️, 🏆, 📖 all go).
- No perpetual bobbing, bouncing, or rotating decoration.
- No `Fredoka`, `Nunito`, or `Press Start 2P` on the classic site. (`Press Start
  2P` remains correct and untouched inside the village.)
