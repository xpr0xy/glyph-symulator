# GLYPH / SYMULATOR — build notes (v2)

A real-time typographic synthesis terminal. Original implementation, written from scratch.
Hosted at **https://glyph.pr0xy.dev**.

---

## 1. What glyphsymulator.live actually is

Public-surface findings only. No authenticated interior was accessed.

**Operator:** 3XPYRE (3xpyre.com), a type foundry selling font packs (Ultimate V1 $160,
World's Biggest Fontpack $300, smaller packs $15–$20). Glyph Symulator is the
demonstration surface for that catalogue.

**Public claims** (their own marketing copy):

- "advanced typographic simulation interface"
- "real-time, dual-channel typographic synthesis engine"
- "independent glyph transformation pipelines"
- "dynamic character rendering"
- "precision spacing calibration"
- "private typeface archive"

**Access architecture** (observable without authenticating):

- `glyphsymulator.live/` serves a 2.4 KB shell for a dedicated auth app at `/auth/`.
- The shell carries `<meta name="auth-csrf">` with a per-request token.
- Flow is passwordless: email in → signed link out → session cookie on the device.
- Unverified requests expire after 15 minutes; unverified accounts cannot enter.
- Body attributes `data-mode`, `data-available`, `data-pending` drive the UI state.
- A separate "Device incompatible / mobile access disabled" state exists for narrow viewports.
- The simulator is not in the public bundle. Its renderer, font pipeline, and parameter
  model are not observable from outside.

That last point is the honest boundary: everything about the engine below is this build's
design, not a reconstruction of theirs.

---

## 2. What this build is

An independent tool in the same category. The unit of work is the individual glyph:
select it on the stage, transform it, give it its own modulation phase, then compose a
whole line out of those decisions.

No 3XPYRE code, fonts, copy, or assets are used. Built-in typefaces are open-licensed
Google Fonts; you can also load your own font files.

---

## 3. Feature set

### Input

- Multi-line text, live rebuild.
- Deterministic seed for every pseudo-random per-glyph value.
- Typeface upload: TTF, OTF, WOFF, WOFF2, via picker or drag onto the stage.

### Type

- Four variable families plus two system stacks, plus any font you load.
- Size 24–220 px.
- Weight 100–1000 mapped to the `wght` axis.
- Slant −15°..+15° mapped to `slnt` where supported.
- Line height 0.6–2.0.

### Glyph selection and override

- Click to select. Shift-click to add or remove. Drag to offset in x/y. `Esc` clears.
- Optional select-all.
- Per-glyph overrides: offset x, offset y, rotation, scale x, scale y, modulation phase,
  modulation depth multiplier.
- Overrides compose with the global lanes instead of replacing them; jitter still applies.
- Selected glyphs are outlined on the stage and counted in the header.

### Channel A — base transform

- Global scale x/y, shear, rotation, vertical offset, jitter.
- Jitter is deterministic per glyph from the seed.

### Channel B1 and B2 — two modulators

- Two independent channels, each with its own target, waveform, rate, depth, phase spread,
  and mirror flag.
- Targets: y position, scale, rotation, shear, density.
- Waveforms: sine, triangle, sawtooth, pulse.
- Channels stack on nested elements, so both transforms compose per glyph.
- Per-glyph phase override replaces the automatic travelling phase for that glyph.

### Audio coupling

- Internal silent tremolo generator (90 Hz carrier, LFO at 0.5–8 Hz) or microphone input.
- Envelope follower with asymmetric attack/release scales both channels' depth.
- 8-segment level meter.

### Spacing and kerning

- Tracking −20..+60 px.
- Word gap −20..+120 px.
- Alignment left / center / right.
- Kerning pairs: enter two characters and a value in px; the value is added to the left
  glyph's advance. Pairs are listed and removable.
- Live metrics: composition width, average advance, override count.

### Stage overlays

- Baseline rhythm grid.
- Cap-height and x-height guides computed from size and line box.
- Per-glyph bounding boxes.

### Scope

- Live canvas plot of both modulator waveforms.
- One tick per glyph showing its current phase, so the travelling wave is visible as data.
- Selected glyph ticks are brightened.

### Bake frame

- Freezes the current animated frame into per-glyph geometry.
- Reads each glyph's computed transform matrix, decomposes it, writes overrides, and turns
  both modulators off. The moving composition becomes an editable static one.
- This is the still-export path: what you see is what the SVG and PNG will contain.

### Library

- Five local slots (A–E) in `localStorage`.
- `COPY LINK` encodes the whole state into the URL hash.
- `IMPORT SPEC` loads a JSON export back in.
- State is also restored from the hash on boot.

### Export

- SVG: one `<text>` per glyph with its own transform, plus a font `@import` for built-in
  families.
- PNG: 2× canvas render using the same measured layout and per-glyph transforms.
- SPEC: the full state as JSON, including overrides and kerning.

---

## 4. Implementation

### Stack

Vite 8, vanilla ES modules, hand-written CSS. No runtime dependencies.
Production bundle: ~28.5 KB JS (10.4 KB gzip) + ~16.6 KB CSS.

### Element model

Each glyph is three nested elements:

```
.g      → channel A transform (static, per glyph)
  .g-in   → channel B1 animation
    .g-in2  → channel B2 animation
      text
```

Nesting the animation layers lets the compositor apply both transforms without the main
thread recomputing geometry. The base transform and all variables are written once per
state change; animation runs in CSS.

Transform order:

```
translate(tx, ty) rotate(rot) skewX(shear) scale(sx, sy)
transform-origin: 50% 100%
```

### Modulation without a render loop

All glyphs share keyframes; each gets a negative delay:

```
delay_i = -(phase_i) * period
phase_i = override, or  (-1 if mirrored and i odd) * (i / n) * spread
```

Depth lives in inherited custom properties (`--d`, `--d2`) and a per-glyph multiplier
(`--dm`, `--dm2`), so audio can change global amplitude and a single glyph can still be
attenuated. No per-frame JavaScript touches the glyphs.

Waveform selection swaps the animation name; target selection adds a class that overrides
`animation-name`. Sawtooth has separate keyframes because a linear ramp is a different
shape from a symmetric oscillation.

### Deterministic jitter

```
hash(n, seed) = fract(sin(n * 127.1 + seed * 311.7) * 43758.5453) * 2 - 1
```

Five values per glyph index feed scale, rotation, shear, y offset, x offset. Text plus seed
reproduces a composition exactly.

### Selection and dragging

Pointer events on the grid. `pointerdown` selects (shift toggles), records each selected
glyph's resolved offset, and captures the pointer. `pointermove` writes delta overrides
divided by the current stage fit scale, so dragging tracks the cursor even when the
composition is scaled down on a narrow viewport.

### Bake decomposition

```
sx = hypot(a, b)
rot = atan2(b, a)
sy = (a*d - b*c) / sx
```

Applied to the computed transform of each animation layer, summed with the current base,
then written as overrides. Skew is folded into rotation, which is the honest limitation of
decomposing a 2D matrix.

### Layout fitting

The stage measures the grid's natural scroll width against its padded width and applies
`transform: scale(k)` when the composition overflows. Width is reset before every
measurement, otherwise the scaled width feeds back into the next measurement.

### Export

`measure()` walks the rendered lines and rebuilds an untransformed layout: per-glyph x,
advance, line index, plus tracking and kerning. That layout is independent of the visual
transform, so exports are not distorted by the stage scale.

- SVG positions each glyph at its optical center with `text-anchor="middle"` and applies the
  resolved transform around that point.
- PNG replays the same layout and transforms through canvas 2D at 2×.
- The spec is the state object verbatim.

---

## 5. Controls reference

**Transport**
- `RUNNING / PAUSED` — freeze modulation. Space toggles when focus is not in a field.
- `RESET LANES` — neutral channel A, spacing, targets, overrides, kerning.
- `BAKE FRAME` — freeze the visible frame into per-glyph geometry.

**Selection**
- Click, shift-click, drag, `Esc`, `Cmd/Ctrl+A`.

**Presets**
- DATUM, TREMOR, COLUMN, KEYGEN, FLOOD, STAGGER, RANDOMIZE.

---

## 6. Known limits

- SVG export keeps live text. A machine without the typeface installed will substitute. The
  embedded `@import` fixes this in browsers, not in Illustrator or Figma. Uploaded fonts are
  not embedded.
- Modulation and audio are runtime-only. Use `BAKE FRAME` before exporting a still.
- PNG uses the canvas text stack: `wght` applies, other custom axes may not.
- The baked decomposition folds skew into rotation.
- Mobile scales the composition down rather than reflowing it.
- Uploaded fonts live only in the browser session; a reloaded shared link falls back to a
  built-in family.

---

## 7. Deploy

- Source: `xpr0xy/glyph-symulator`, branch `main`.
- Build: `npm run build` → `dist/`.
- Host: Vercel project linked to the repo, domain `glyph.pr0xy.dev`.