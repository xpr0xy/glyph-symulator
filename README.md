# GLYPH / SYMULATOR

Real-time typographic synthesis terminal. Per-glyph selection and overrides, two modulation
channels, uploaded typefaces, kerning calibration, frame baking, audio coupling, and
SVG/PNG/spec export.

Live: **https://glyph.pr0xy.dev**

## run

```bash
npm install
npm run dev
```

## build

```bash
npm run build      # → dist/
npm run preview
```

## docs

`GLYPH.md` covers the full feature set, the implementation, the control reference, and
the public-surface analysis of the commercial site that prompted the build.

## stack

Vite + vanilla ES modules + hand-written CSS. No runtime dependencies. Typefaces are
open-licensed Google Fonts.