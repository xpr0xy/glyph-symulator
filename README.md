# GLYPH / SYMULATOR

Real-time typographic synthesis terminal. Per-glyph transform lanes, a modulation
channel, variable font axes, spacing calibration, audio coupling, and SVG/PNG/spec export.

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