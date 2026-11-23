# GLYPH / SYMULATOR — build notes

A real-time typographic synthesis terminal. Original implementation, written from scratch.
Hosted at **https://glyph.pr0xy.dev**.

---

## 1. What glyphsymulator.live actually is

Public-surface findings only. No authenticated interior was accessed.

**Operator:** 3XPYRE (3xpyre.com), a type foundry selling font packs (Ultimate V1 $160,
World's Biggest Fontpack $300, smaller packs $15–$20). Glyph Symulator is the
demonstration surface for that catalogue.

**Public claims** (from their own marketing copy):

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
- The simulator itself is not in the public bundle. It sits behind the session, so its
  internals (renderer, font pipeline, parameter model) are not observable from outside.

That last point is the honest boundary: everything about the *engine* below is this
build's design, not a reconstruction of theirs.

---

## 2. What this build is

An independent tool in the same category: type a string, get per-character control over
its geometry, put that geometry under a modulation source, calibrate spacing against
guides, and export the result as vector, raster, or a re-playable spec.

No 3XPYRE code, fonts, copy, or assets are used. Typefaces are open-licensed Google
Fonts (Recursive, Inter, JetBrains Mono, Space Grotesk).

---

## 3. Feature set

### Input

- Multi-line text field, live rebuild on every keystroke.
- Deterministic seed (0–99) drives all pseudo-random per-glyph offsets, so a composition
  is reproducible from its seed.
- Words are preserved as units and never break mid-word; explicit line breaks are honored.

### Type

- Four variable typefaces plus a system serif fallback.
- Size 24–220 px.
- Weight 100–1000, mapped to the `wght` axis where the family supports it.
- Slant −15°..+15°, mapped to the `slnt` axis (Recursive) and otherwise left to transform.
- Line height 0.6–2.0.

### Spacing

- Tracking −20..+60 px, applied per glyph.
- Word gap −20..+120 px, applied per word.
- Left / center / right alignment.

### Channel A — base transform (static, per glyph)

- Scale X and Y (0.2–2.0).
- Shear −45°..+45°.
- Rotation −180°..+180°.
- Vertical offset −120..+120 px.
- Jitter 0–100: deterministic per-glyph variance on scale, rotation, shear, position,
  seeded from the seed control.

### Channel B — modulation (animated, per glyph)

- Targets: Y position, scale, rotation, shear, density (opacity).
- Waveforms: sine, triangle, sawtooth, pulse.
- Rate 0.02–3 Hz.
- Depth 0–60 units, interpreted per target.
- Phase spread 0–4 cycles across the string, so the wave travels through the word.
- Mirror: alternates phase direction on odd glyphs for a symmetric read.

### Audio coupling

- Internal source: silent 90 Hz carrier amplitude-modulated by an LFO at 0.5–8 Hz. The
  signal is analysed but never routed to the speakers.
- Microphone source: `getUserMedia` with echo cancellation, noise suppression, and AGC off.
- Sensitivity 0.2–4.0.
- Envelope follower with asymmetric attack/release drives modulation depth, so the type
  breathes with the signal instead of jittering with every sample.
- 8-segment level meter.

### Overlays

- Baseline rhythm grid, tied to the current line height.
- Cap-height and x-height guides, computed from font size and line box.
- Per-glyph bounding boxes.

### Export

- **SVG** — one `<text>` per glyph with its own transform; editable in vector tools.
  Includes a Google Fonts `@import` so it renders correctly in a browser.
- **PNG** — 2× raster, canvas pipeline, dark ground.
- **SPEC** — full state as JSON, re-playable by hand.

---

## 4. Implementation

### Stack

Vite 8 + vanilla ES modules + hand-written CSS. No framework, no runtime dependencies.
Total production bundle is roughly 16.6 KB JS + 12.3 KB CSS before gzip.

### Render model

Each glyph is two nested elements:

```
.g      → base transform (channel A)
  .g-in → animated transform (channel B)
```

Splitting the channels lets the browser composite the animation independently of the
static geometry. The base transform is written once per state change; the modulation is a
CSS animation, so the per-frame cost stays on the compositor instead of the main thread.

Transform order matches CSS semantics:

```
translate(tx, ty) rotate(rot) skewX(shear) scale(sx, sy)
transform-origin: 50% 100%
```

### Modulation without a render loop

Every glyph gets the same keyframes but its own negative `animation-delay`:

```
delay_i = -(i / n) * spread * period
```

The negative delay starts each glyph mid-cycle, which produces the travelling wave. No
per-frame JavaScript touches the glyphs. Pausing flips `animation-play-state` on a parent
class. Depth lives in a single inherited custom property (`--d`) referenced inside the
keyframes, so a global amplitude change is one style write.

Waveform is selected by swapping the animation name; target by a class on the grid that
overrides `animation-name`. Sawtooth variants get their own keyframes because a linear
0→1 ramp is not the same shape as a symmetric oscillation.

### Deterministic jitter

```
hash(n, seed) = fract(sin(n * 127.1 + seed * 311.7) * 43758.5453) * 2 - 1
```

Five independent values per glyph index feed scale, rotation, shear, Y offset, and X
offset. Same seed and text → identical composition, every time.

### Variable axes

`font-variation-settings` is set on the grid and inherited:

```
"wght" {weight}, "slnt" {slant}, "opsz" {clamped size}
```

Unsupported axes are ignored per family, so one code path covers all four typefaces.

### Audio envelope

`AnalyserNode` with `fftSize = 1024`, time-domain RMS, then an asymmetric smoother
(0.4 attack, 0.05 release). That asymmetry is what keeps the movement musical: fast to
react, slow to settle.

The analyser is connected to the destination through a gain of 0.0001. Some browsers will
not pull a graph branch that never reaches the destination, and a silent analyser was the
first bug in this build.

### Layout fitting

The stage measures the grid's natural scroll width against its padded width and applies
`transform: scale(k)` to the grid when the composition overflows. Width is reset before
measuring every time, otherwise the scaled width feeds back into the measurement and the
scale collapses on each sync.

### Export

`measure()` walks the rendered lines and reconstructs an untransformed layout: per-glyph
x offset, word gaps, line index. This is separate from the visual transform so the export
is not distorted by it.

- SVG: `text-anchor="middle"`, positioned at the glyph's optical center, with the channel A
  transform applied around that point.
- PNG: the same layout and transform math, replayed through canvas 2D at 2×.
- Spec: the state object, verbatim.

---

## 5. Controls reference

**Transport**
- `RUNNING / PAUSED` — freezes modulation. Space bar toggles when focus is not in a field.
- `RESET LANES` — returns channel A, spacing, target, and waveform to neutral.

**Presets**
- DATUM — calm, near-static, editorial.
- TREMOR — high-rate pulse, mirrored, slight jitter.
- COLUMN — condensed scale, slow breathing.
- KEYGEN — monospaced, tracked out, sawtooth drift.
- FLOOD — heavy jitter, rotation wave.
- RANDOMIZE — constrained random across all lanes.

---

## 6. Known limits

- SVG export keeps live text. A machine without the typeface installed will substitute;
  the embedded `@import` fixes this in browsers, not in Illustrator or Figma.
- Modulation is CSS-driven, so exports capture channel A only. That is intentional:
  a still cannot contain motion. Export the spec if you need to reproduce the animation.
- PNG uses the canvas text stack, which applies `wght` but not every custom axis.
- Glyph counts are comfortable to a few hundred. This is a composition tool, not a
  paragraph renderer.
- Mobile scales the composition down rather than reflowing it, because reflow would change
  the thing the tool exists to control.

---

## 7. Deploy

- Source: `xpr0xy/glyph-symulator`, branch `main`.
- Build: `npm run build` → `dist/`.
- Host: Vercel, domain `glyph.pr0xy.dev`.