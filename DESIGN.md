# DESIGN.md — the Silk system

Governs the **classic site**: `index.html`, `blog.html`, and the stylesheets
`site.css` / `home.css` / `blog.css`. **`village.*` is excluded** — it keeps its
own pixel world and none of these rules apply to it.

Pinned by the user to the register of `https://www.sreedesigns.com`: a generative
light-field behind quiet, wide-set serif type on an almost-empty white page.

---

## 1. Ground and light

The page is white. The only "image" the site owns is a **live silk light field** —
a WebGL fragment shader of domain-warped fbm noise that reads as light through
folded satin, in blues. It is not decoration and never a static gradient
imitation: it renders, it drifts, it is the reason the page feels alive.

It appears in exactly **two places**, and nowhere else:

1. **The hero**, full-bleed, at full strength.
2. **The close** (contact), rising from the bottom edge, at reduced strength.

Everything between those two is white paper. That contrast is the whole rhythm:
light, paper, light. Adding a third silk field would flatten it.

**Fallback:** if WebGL is unavailable, a layered radial-gradient standing in at
the same colours. Under `prefers-reduced-motion`, the shader renders **one static
frame** — the field is still there, it simply stops moving.

**Budget:** DPR capped at 1.5; the shader pauses via `IntersectionObserver` when
its section leaves the viewport. It must never run offscreen.

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

### The one exception: work plates

The pinned work viewer is the single place that leaves the blue family. Each
project's plate carries its subject, and the change of ground is what tells you
the slide advanced. The drawn diagrams read these same properties, so a diagram
always matches the ground it sits on.

```
[data-plate="track"]  #e9edec / ink #24343a   asphalt — Racing Line App
[data-plate="care"]   #e6efe9 / ink #1f4a39   clinical calm — CareRouter
[data-plate="ctf"]    #f4ece9 / ink #5e2a24   the record — CyberSci
```

Each plate declares four values (`--plate`, `--plate-ink`, `--plate-soft`,
`--plate-rule`, `--plate-rule-soft`) written out rather than derived, so canvas
can read them back directly. Rules: low-chroma tints only — the viewer stays
paper under glass, never three coloured boxes; every ink clears 4.5:1 on its own
plate; and plates live **only** in the work viewer. Do not spread them to
sections, cards, or chrome.

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

- The silk field drifts continuously and slowly (`~0.045` time scale). It is the
  only perpetual motion on the page.
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
cross-dissolves. In the ledger scroll advances *time*, because the ledger is a
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
  entry is active.
- **Experience is a ledger**, not a stack of cards: a hairline-ruled table of
  date / organisation / role, with detail underneath. Its left column — mark and
  date — sticks beside its own detail, so you never lose whose work you are
  reading; the year readout is set exactly as the viewer's `01 / 03` counter so
  the two sections rhyme without repeating.
- **Authored visuals only.** Where there is no real screenshot, the visual is
  drawn in the site's own grammar — hairlines, blues, the display serif — never a
  gradient placeholder, a glass panel, or a generic icon tile. Nothing may be
  styled to look like a product screenshot that does not exist.

## 8. Prohibitions

These name devices the *old* world used that this one refuses. They are not
generic bans.

- No thick ink outlines, no hard offset `box-shadow` "sticker" edges, no
  `border-radius: 22px` cards, no comic halftone dot fields.
- No filled pill buttons, no gold. No hue outside the blue family except the
  work plates above.
- No emoji as interface furniture (📮, ☁️, 🏆, 📖 all go).
- No perpetual bobbing, bouncing, or rotating decoration.
- No `Fredoka`, `Nunito`, or `Press Start 2P` on the classic site. (`Press Start
  2P` remains correct and untouched inside the village.)
