import './style.css';

/* ------------------------------------------------------------------ */
/* presets                                                             */
/* ------------------------------------------------------------------ */

const BASE = {
  text: 'GLYPH\nSYMULATOR',
  font: 'Recursive', fontName: null, size: 96, weight: 640, slant: 0, lineHeight: 1.02,
  tracking: 0, wordSpacing: 0, align: 'left', seed: 7,
  scaleX: 1, scaleY: 1, shear: 0, rotate: 0, offsetY: 0, jitter: 0,
  modOn: true, modMirror: false, rate: 0.18, depth: 2, spread: 1, target: 'y', wave: 'sine',
  mod2On: false, mod2Mirror: false, rate2: 0.12, depth2: 0, spread2: 0.5, target2: 'scale', wave2: 'sine',
  audioOn: false, audioSource: 'tone', audioRate: 2.4, sensitivity: 1,
  overrides: {}, kern: {},
};

const PRESETS = {
  datum: {},
  tremor: {
    text: 'TREMOR\nPROTOCOL', size: 104, weight: 800, lineHeight: 0.98,
    tracking: 2, seed: 21, jitter: 18,
    modOn: true, modMirror: true, rate: 2.2, depth: 1.6, spread: 0.45, target: 'y', wave: 'pulse',
  },
  column: {
    text: 'COLUMN\nBREAK', font: 'Inter', size: 116, weight: 900, lineHeight: 0.9,
    tracking: -6, seed: 4, scaleX: 0.62, scaleY: 1.25,
    modOn: true, rate: 0.12, depth: 1.2, spread: 1.6, target: 'scale', wave: 'sine',
  },
  keygen: {
    text: '3XP-7741-\nSYM/KEY', font: 'JetBrains Mono', size: 82, weight: 500, lineHeight: 1.15,
    tracking: 8, seed: 33, shear: -6, jitter: 6,
    modOn: true, modMirror: true, rate: 1.1, depth: 5, spread: 2.4, target: 'y', wave: 'saw',
    kern: { '3|X': -4, 'P|-': -2 },
  },
  flood: {
    text: 'FLOOD\nTHE\nCHANNEL', font: 'Space Grotesk', size: 88, weight: 700, lineHeight: 0.95,
    tracking: -2, seed: 11, jitter: 28,
    modOn: true, rate: 0.4, depth: 9, spread: 2.2, target: 'rotate', wave: 'tri',
  },
  stagger: {
    text: 'STAGGER\nFIELD', size: 92, weight: 700, lineHeight: 1.0,
    tracking: 4, seed: 5, jitter: 0,
    modOn: true, rate: 0.5, depth: 14, spread: 0, target: 'y', wave: 'sine',
    mod2On: true, rate2: 0.23, depth2: 7, spread2: 0, target2: 'rotate', wave2: 'tri',
  },
};

const state = JSON.parse(JSON.stringify(BASE));

/* ------------------------------------------------------------------ */
/* dom                                                                 */
/* ------------------------------------------------------------------ */

const $ = (id) => document.getElementById(id);

const el = {
  grid: $('grid'), stage: $('stage'), text: $('text'), family: $('family'),
  size: $('size'), weight: $('weight'), slant: $('slant'), lineHeight: $('lineHeight'),
  tracking: $('tracking'), wordSpacing: $('wordSpacing'), seed: $('seed'),
  scaleX: $('scaleX'), scaleY: $('scaleY'), shear: $('shear'), rotate: $('rotate'),
  offsetY: $('offsetY'), jitter: $('jitter'),
  modOn: $('modOn'), modMirror: $('modMirror'), rate: $('rate'), depth: $('depth'),
  spread: $('spread'), target: $('target'), wave: $('wave'),
  mod2On: $('mod2On'), mod2Mirror: $('mod2Mirror'), rate2: $('rate2'), depth2: $('depth2'),
  spread2: $('spread2'), target2: $('target2'), wave2: $('wave2'),
  audioOn: $('audioOn'), audioSource: $('audioSource'), audioRate: $('audioRate'),
  sensitivity: $('sensitivity'), meter: $('meter'), scope: $('scope'),
  ovGrid: $('ovGrid'), ovGuides: $('ovGuides'), ovBoxes: $('ovBoxes'),
  playBtn: $('playBtn'), resetBtn: $('resetBtn'), bakeBtn: $('bakeBtn'),
  preset: $('preset'), applyBtn: $('applyBtn'), randomBtn: $('randomBtn'),
  svgBtn: $('svgBtn'), pngBtn: $('pngBtn'), jsonBtn: $('jsonBtn'),
  roFamily: $('roFamily'), roGlyphs: $('roGlyphs'), roSelect: $('roSelect'),
  roRate: $('roRate'), roFps: $('roFps'), roClock: $('roClock'),
  stageNote: $('stageNote'), stageNote2: $('stageNote2'), stageHint: $('stageHint'),
  selReadout: $('selReadout'), selChar: $('selChar'), selIndex: $('selIndex'),
  gx: $('gx'), gy: $('gy'), grot: $('grot'), gsx: $('gsx'), gsy: $('gsy'),
  gphase: $('gphase'), gdepth: $('gdepth'),
  selClear: $('selClear'), selAll: $('selAll'), selNone: $('selNone'),
  mWidth: $('mWidth'), mAvg: $('mAvg'), mOver: $('mOver'),
  kernPair: $('kernPair'), kernVal: $('kernVal'), kernAdd: $('kernAdd'), kernList: $('kernList'),
  fontBtn: $('fontBtn'), fontFile: $('fontFile'), fontLabel: $('fontLabel'), dropzone: $('dropzone'),
  slot: $('slot'), saveSlot: $('saveSlot'), loadSlot: $('loadSlot'),
  shareBtn: $('shareBtn'), importBtn: $('importBtn'), importFile: $('importFile'),
};

let glyphs = [];
let words = [];
let lines = [];
let playing = true;
let selected = new Set();
let fitK = 1;
let naturalW = 0;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function hash(n, seed) {
  const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453123;
  return (x - Math.floor(x)) * 2 - 1;
}

function span(cls, text) {
  const s = document.createElement('span');
  s.className = cls;
  if (text != null) s.textContent = text;
  return s;
}

/* ------------------------------------------------------------------ */
/* render                                                              */
/* ------------------------------------------------------------------ */

function rebuild() {
  const frag = document.createDocumentFragment();
  glyphs = [];
  words = [];
  lines = [];

  const rawLines = state.text.replace(/\r/g, '').split('\n');
  let index = 0;
  let lineIndex = 0;

  rawLines.forEach((lineText) => {
    const lineEl = document.createElement('div');
    lineEl.className = 'line';
    lineEl.append(span('guide cap'), span('guide x'));

    lineText.split(' ').forEach((token, ti) => {
      if (ti > 0) lineEl.append(span('gap'));

      if (!token) {
        const spacer = span('word');
        spacer.style.display = 'inline-block';
        spacer.style.width = '0px';
        lineEl.append(spacer);
        return;
      }

      const wordEl = span('word');
      for (const ch of token) {
        const g = span('g');
        g.dataset.i = String(index);
        const in1 = span('g-in');
        const in2 = span('g-in2', ch);
        in1.append(in2);
        g.append(in1);
        wordEl.append(g);
        glyphs.push({
          g, in1, in2, char: ch, index, line: lineIndex,
          r: [0, 1, 2, 3, 4].map((k) => hash(index * 7 + k * 3.13, state.seed)),
        });
        index++;
      }
      lineEl.append(wordEl);
      words.push(wordEl);
    });

    if (lineText === '') lineEl.style.height = state.size * state.lineHeight + 'px';

    lines.push(lineEl);
    frag.append(lineEl);
    lineIndex++;
  });

  el.grid.replaceChildren(frag);
  el.roGlyphs.textContent = String(glyphs.length);
  applySelectionClasses();
  sync();
}

function resolved(i) {
  const ov = state.overrides[i] || {};
  return {
    tx: ov.tx ?? 0,
    ty: ov.ty ?? state.offsetY,
    rot: ov.rot ?? state.rotate,
    sx: ov.sx ?? state.scaleX,
    sy: ov.sy ?? state.scaleY,
    phase: ov.phase ?? null,
    depth: ov.depth ?? 1,
  };
}

function kernFor(i) {
  if (i >= glyphs.length - 1) return 0;
  const a = glyphs[i];
  const b = glyphs[i + 1];
  if (a.line !== b.line) return 0;
  return state.kern[a.char + '|' + b.char] || 0;
}

function sync() {
  const g = el.grid;
  const fs = state.size;
  const lh = fs * state.lineHeight;

  g.style.fontFamily = /^GlyphUpload/.test(state.font) ? `"${state.font}"` : state.font;
  g.style.fontSize = fs + 'px';
  g.style.lineHeight = String(state.lineHeight);
  g.style.textAlign = state.align;
  g.style.fontVariationSettings =
    `"wght" ${state.weight}, "slnt" ${state.slant}, "opsz" ${clamp(fs, 14, 32)}`;
  g.style.setProperty('--lhpx', lh + 'px');
  g.style.setProperty('--d', String(state.depth * audioGain));
  g.style.setProperty('--d2', String(state.depth2 * audioGain));

  setChannelClasses(g, 1);
  setChannelClasses(g, 2);

  g.classList.toggle('ov-grid', el.ovGrid.checked);
  g.classList.toggle('ov-guides', el.ovGuides.checked);
  g.classList.toggle('ov-boxes', el.ovBoxes.checked);
  g.classList.toggle('paused', !playing);

  const jitter = state.jitter / 100;
  const n = Math.max(1, glyphs.length);

  glyphs.forEach((rec, i) => {
    const r = rec.r;
    const ov = resolved(i);

    const sx = ov.sx * (1 + jitter * 0.55 * r[0]);
    const sy = ov.sy * (1 + jitter * 0.55 * r[1]);
    const rot = ov.rot + jitter * 26 * r[2];
    const skew = state.shear + jitter * 12 * r[3];
    const ty = ov.ty + jitter * 34 * r[4];
    const tx = ov.tx + jitter * 8 * r[0];

    rec.g.style.setProperty('--sx', sx.toFixed(3));
    rec.g.style.setProperty('--sy', sy.toFixed(3));
    rec.g.style.setProperty('--rot', rot.toFixed(2) + 'deg');
    rec.g.style.setProperty('--skew', skew.toFixed(2) + 'deg');
    rec.g.style.setProperty('--ty', ty.toFixed(2) + 'px');
    rec.g.style.setProperty('--tx', tx.toFixed(2) + 'px');
    rec.g.style.setProperty('--track', (state.tracking + kernFor(i)) + 'px');
    rec.g.style.setProperty('--dm', ov.depth.toFixed(3));
    rec.g.style.setProperty('--dm2', ov.depth.toFixed(3));

    // channel 1 delay
    const p1 = 1 / Math.max(0.02, state.rate);
    const auto1 = ((state.modMirror && i % 2 ? 1 : -1) * (i / n) * state.spread) * p1;
    const delay1 = ov.phase == null ? auto1 : -ov.phase * p1;
    rec.in1.style.animationDuration = p1.toFixed(4) + 's';
    rec.in1.style.animationDelay = delay1.toFixed(4) + 's';

    // channel 2 delay
    const p2 = 1 / Math.max(0.02, state.rate2);
    const auto2 = ((state.mod2Mirror && i % 2 ? 1 : -1) * (i / n) * state.spread2) * p2;
    const delay2 = ov.phase == null ? auto2 : -ov.phase * p2;
    rec.in2.style.animationDuration = p2.toFixed(4) + 's';
    rec.in2.style.animationDelay = delay2.toFixed(4) + 's';
  });

  words.forEach((w) => { w.style.marginRight = state.wordSpacing + 'px'; });

  const gapW = fs * 0.26 + 'px';
  el.grid.querySelectorAll('.gap').forEach((sp) => {
    sp.style.display = 'inline-block';
    sp.style.width = gapW;
  });

  const baseline = (lh - fs) / 2 + fs * 0.8;
  lines.forEach((lineEl) => {
    const cap = lineEl.querySelector('.guide.cap');
    const xx = lineEl.querySelector('.guide.x');
    if (cap) cap.style.top = (baseline - fs * 0.71).toFixed(1) + 'px';
    if (xx) xx.style.top = (baseline - fs * 0.5).toFixed(1) + 'px';
  });

  updateChrome();
  requestAnimationFrame(fitStage);
}

function setChannelClasses(g, ch) {
  const own = ch === 1
    ? ['target-scale', 'target-rotate', 'target-skew', 'target-opacity', 'wave-sine', 'wave-tri', 'wave-saw', 'wave-pulse']
    : ['t2-scale', 't2-rotate', 't2-skew', 't2-opacity', 'w2-sine', 'w2-tri', 'w2-saw', 'w2-pulse'];
  own.forEach((c) => g.classList.remove(c));

  const on = ch === 1 ? state.modOn : state.mod2On;
  if (!on) return;

  const target = ch === 1 ? state.target : state.target2;
  const wave = ch === 1 ? state.wave : state.wave2;

  if (ch === 1) {
    if (target !== 'y') g.classList.add('target-' + target);
    g.classList.add('wave-' + wave);
  } else {
    if (target !== 'y') g.classList.add('t2-' + target);
    g.classList.add('w2-' + wave);
  }
}

function updateChrome() {
  el.roFamily.textContent = state.fontName ? state.fontName.toUpperCase().slice(0, 18) : state.font.toUpperCase();
  el.roRate.textContent = state.rate.toFixed(2) + ' Hz';
  el.roSelect.textContent = String(selected.size);
  el.selReadout.textContent = selected.size
    ? `${selected.size} SELECTED`
    : 'NO SELECTION';
  el.stageNote2.textContent =
    `B1 ${state.modOn ? state.target + '/' + state.wave : 'OFF'} · B2 ${state.mod2On ? state.target2 + '/' + state.wave2 : 'OFF'}`;

  const overCount = Object.keys(state.overrides).length;
  el.mOver.textContent = String(overCount);

  const width = Math.round(naturalW || el.grid.scrollWidth);
  el.mWidth.textContent = width + 'px';
  const avg = glyphs.length
    ? (glyphs.reduce((s, r) => s + (r.g.offsetWidth || 0), 0) / glyphs.length).toFixed(1)
    : '0';
  el.mAvg.textContent = avg + 'px';
}

function fitStage() {
  el.grid.style.transform = 'none';
  el.grid.style.width = '';
  const natural = el.grid.scrollWidth;
  const styles = getComputedStyle(el.stage);
  const avail = el.stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  if (!natural || !avail) return;

  const k = Math.min(1, avail / natural);
  fitK = k;
  naturalW = natural;
  if (k < 0.999) {
    el.grid.style.transformOrigin = 'top left';
    el.grid.style.transform = `scale(${k})`;
    el.grid.style.width = avail / k + 'px';
  } else {
    el.grid.style.width = '';
  }
}

/* ------------------------------------------------------------------ */
/* selection                                                           */
/* ------------------------------------------------------------------ */

function applySelectionClasses() {
  glyphs.forEach((rec, i) => rec.g.classList.toggle('sel', selected.has(i)));
  updateChrome();
  hydrateGlyphPanel();
}

function selectOnly(i) {
  selected = new Set([i]);
  applySelectionClasses();
}

function toggleSel(i) {
  if (selected.has(i)) selected.delete(i);
  else selected.add(i);
  applySelectionClasses();
}

function clearSelection() {
  selected = new Set();
  applySelectionClasses();
}

function hydrateGlyphPanel() {
  const first = [...selected][0];
  const body = document.getElementById('glyphBody');
  const hint = document.getElementById('selHint');

  if (first == null || !glyphs[first]) {
    el.selChar.textContent = '--';
    el.selIndex.textContent = 'nothing selected';
    if (body) body.hidden = true;
    if (hint) hint.hidden = false;
    return;
  }
  if (body) body.hidden = false;
  if (hint) hint.hidden = true;
  const r = resolved(first);
  el.selChar.textContent = glyphs[first].char === ' ' ? '␠' : glyphs[first].char;
  el.selIndex.textContent = selected.size > 1
    ? `index ${first} + ${selected.size - 1} more`
    : `index ${first} · advance ${Math.round(glyphs[first].g.offsetWidth)}px`;

  el.gx.value = r.tx;
  el.gy.value = r.ty;
  el.grot.value = r.rot;
  el.gsx.value = r.sx;
  el.gsy.value = r.sy;
  el.gphase.value = r.phase == null ? -1 : r.phase;
  el.gdepth.value = r.depth;

  $('gxOut').textContent = Math.round(r.tx);
  $('gyOut').textContent = Math.round(r.ty);
  $('grotOut').textContent = Math.round(r.rot);
  $('gsxOut').textContent = r.sx.toFixed(2);
  $('gsyOut').textContent = r.sy.toFixed(2);
  $('gphaseOut').textContent = r.phase == null ? 'auto' : r.phase.toFixed(2);
  $('gdepthOut').textContent = r.depth.toFixed(2);
}

function writeOverride(key, value) {
  selected.forEach((i) => {
    const ov = state.overrides[i] || (state.overrides[i] = {});
    if ((key === 'phase' && value < 0)) delete ov.phase;
    else ov[key] = value;
    if (!Object.keys(ov).length) delete state.overrides[i];
  });
  sync();
  hydrateGlyphPanel();
}

[['gx', 'tx', 1], ['gy', 'ty', 1], ['grot', 'rot', 1], ['gsx', 'sx', 0.01],
 ['gsy', 'sy', 0.01], ['gphase', 'phase', 0.01], ['gdepth', 'depth', 0.01]].forEach(([id, key, step]) => {
  const input = el[id];
  input.addEventListener('input', () => {
    if (!selected.size) return;
    const v = Number(input.value);
    el[id + 'Out'].textContent = key === 'phase'
      ? (v < 0 ? 'auto' : v.toFixed(2))
      : (step === 1 ? String(Math.round(v)) : v.toFixed(2));
    writeOverride(key, v);
  });
});

el.selClear.addEventListener('click', () => {
  selected.forEach((i) => delete state.overrides[i]);
  sync();
  hydrateGlyphPanel();
});
el.selAll.addEventListener('click', () => {
  selected = new Set(glyphs.map((_, i) => i));
  applySelectionClasses();
});
el.selNone.addEventListener('click', () => clearSelection());

/* pointer selection + drag */

let drag = null;

el.grid.addEventListener('pointerdown', (e) => {
  const gEl = e.target.closest('.g');
  if (!gEl) return;
  const i = Number(gEl.dataset.i);

  if (e.shiftKey) toggleSel(i);
  else if (!selected.has(i)) selectOnly(i);

  if (!selected.has(i)) return;

  const start = {};
  selected.forEach((k) => { const r = resolved(k); start[k] = { tx: r.tx, ty: r.ty }; });
  drag = { x: e.clientX, y: e.clientY, start, moved: false };
  el.grid.setPointerCapture(e.pointerId);
  e.preventDefault();
});

el.grid.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = (e.clientX - drag.x) / (fitK || 1);
  const dy = (e.clientY - drag.y) / (fitK || 1);
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
  drag.moved = true;

  Object.entries(drag.start).forEach(([k, s]) => {
    const idx = Number(k);
    const ov = state.overrides[idx] || (state.overrides[idx] = {});
    ov.tx = Math.round(s.tx + dx);
    ov.ty = Math.round(s.ty + dy);
  });
  sync();
  hydrateGlyphPanel();
});

function endDrag() {
  if (!drag) return;
  drag = null;
}
el.grid.addEventListener('pointerup', endDrag);
el.grid.addEventListener('pointercancel', endDrag);

el.stage.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.g')) clearSelection();
});

/* ------------------------------------------------------------------ */
/* range bindings                                                      */
/* ------------------------------------------------------------------ */

const RANGES = [
  ['size', 'sizeOut', (v) => String(Math.round(v))],
  ['weight', 'weightOut', (v) => String(Math.round(v))],
  ['slant', 'slantOut', (v) => v.toFixed(1)],
  ['lineHeight', 'lineHeightOut', (v) => v.toFixed(2)],
  ['tracking', 'trackingOut', (v) => String(Math.round(v))],
  ['wordSpacing', 'wordSpacingOut', (v) => String(Math.round(v))],
  ['seed', 'seedOut', (v) => String(Math.round(v))],
  ['scaleX', 'scaleXOut', (v) => v.toFixed(2)],
  ['scaleY', 'scaleYOut', (v) => v.toFixed(2)],
  ['shear', 'shearOut', (v) => String(Math.round(v))],
  ['rotate', 'rotateOut', (v) => String(Math.round(v))],
  ['offsetY', 'offsetYOut', (v) => String(Math.round(v))],
  ['jitter', 'jitterOut', (v) => String(Math.round(v))],
  ['rate', 'rateOut', (v) => v.toFixed(2)],
  ['depth', 'depthOut', (v) => String(v)],
  ['spread', 'spreadOut', (v) => v.toFixed(2)],
  ['rate2', 'rate2Out', (v) => v.toFixed(2)],
  ['depth2', 'depth2Out', (v) => String(v)],
  ['spread2', 'spread2Out', (v) => v.toFixed(2)],
  ['audioRate', 'audioRateOut', (v) => v.toFixed(1)],
  ['sensitivity', 'sensitivityOut', (v) => v.toFixed(1)],
];

RANGES.forEach(([key, outId, fmt]) => {
  const input = el[key];
  const out = $(outId);
  input.value = state[key];
  out.textContent = fmt(Number(state[key]));
  input.addEventListener('input', () => {
    state[key] = Number(input.value);
    out.textContent = fmt(state[key]);
    if (key === 'seed') {
      state.overrides = {};
      selected.clear();
      rebuild();
    } else {
      sync();
    }
    if (key === 'audioRate') setLfoRate();
  });
});

/* ------------------------------------------------------------------ */
/* text, family, toggles                                               */
/* ------------------------------------------------------------------ */

el.text.addEventListener('input', () => {
  state.text = el.text.value;
  state.overrides = {};
  selected.clear();
  rebuild();
});

el.family.addEventListener('change', () => {
  state.font = el.family.value;
  state.fontName = null;
  sync();
});

[['modOn', 'modOn'], ['modMirror', 'modMirror'], ['mod2On', 'mod2On'], ['mod2Mirror', 'mod2Mirror']].forEach(([id, key]) => {
  el[id].addEventListener('change', () => { state[key] = el[id].checked; sync(); });
});

el.target.addEventListener('change', () => { state.target = el.target.value; sync(); });
el.wave.addEventListener('change', () => { state.wave = el.wave.value; sync(); });
el.target2.addEventListener('change', () => { state.target2 = el.target2.value; sync(); });
el.wave2.addEventListener('change', () => { state.wave2 = el.wave2.value; sync(); });

document.querySelectorAll('.segment [data-align]').forEach((b) => {
  b.addEventListener('click', () => {
    state.align = b.dataset.align;
    document.querySelectorAll('.segment [data-align]').forEach((x) => x.classList.toggle('on', x === b));
    sync();
  });
});

el.ovGrid.addEventListener('change', sync);
el.ovGuides.addEventListener('change', sync);
el.ovBoxes.addEventListener('change', sync);

el.playBtn.addEventListener('click', () => {
  playing = !playing;
  el.playBtn.setAttribute('aria-pressed', String(playing));
  el.playBtn.querySelector('.label').textContent = playing ? 'RUNNING' : 'PAUSED';
  sync();
});

el.resetBtn.addEventListener('click', () => {
  Object.assign(state, {
    scaleX: 1, scaleY: 1, shear: 0, rotate: 0, offsetY: 0, jitter: 0,
    tracking: 0, wordSpacing: 0, target: 'y', wave: 'sine',
    mod2On: false, depth2: 0, overrides: {}, kern: {},
  });
  selected.clear();
  hydrate();
});

/* freeze the current animated frame into per-glyph geometry */

function decompose(str) {
  if (!str || str === 'none') return { e: 0, f: 0, rot: 0, sx: 1, sy: 1 };
  try {
    const m = new DOMMatrix(str);
    const sx = Math.hypot(m.a, m.b) || 1;
    const rot = (Math.atan2(m.b, m.a) * 180) / Math.PI;
    const sy = (m.a * m.d - m.b * m.c) / sx || 1;
    return { e: m.e, f: m.f, rot, sx, sy };
  } catch (_) {
    return { e: 0, f: 0, rot: 0, sx: 1, sy: 1 };
  }
}

el.bakeBtn.addEventListener('click', () => {
  const snap = glyphs.map((rec, i) => {
    const cur = resolved(i);
    const a = decompose(getComputedStyle(rec.in1).transform);
    const b = decompose(getComputedStyle(rec.in2).transform);
    return {
      i,
      tx: Math.round((cur.tx + a.e + b.e) * 10) / 10,
      ty: Math.round((cur.ty + a.f + b.f) * 10) / 10,
      rot: Math.round((cur.rot + a.rot + b.rot) * 10) / 10,
      sx: Math.round(cur.sx * a.sx * b.sx * 1000) / 1000,
      sy: Math.round(cur.sy * a.sy * b.sy * 1000) / 1000,
    };
  });

  snap.forEach((s) => {
    state.overrides[s.i] = { tx: s.tx, ty: s.ty, rot: s.rot, sx: s.sx, sy: s.sy };
  });
  state.modOn = false;
  state.mod2On = false;
  playing = false;
  el.modOn.checked = false;
  el.mod2On.checked = false;
  el.playBtn.setAttribute('aria-pressed', 'false');
  el.playBtn.querySelector('.label').textContent = 'PAUSED';
  hydrate();
  toast('FRAME BAKED · ' + glyphs.length + ' GLYPHS');
});

el.applyBtn.addEventListener('click', () => {
  const p = PRESETS[el.preset.value];
  if (!p) return;
  const next = JSON.parse(JSON.stringify(BASE));
  Object.assign(next, p);
  Object.assign(state, next);
  selected.clear();
  hydrate();
  toast('PRESET · ' + el.preset.value.toUpperCase());
});

el.randomBtn.addEventListener('click', () => {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  Object.assign(state, {
    font: pick(['Recursive', 'Inter', 'JetBrains Mono', 'Space Grotesk']),
    size: 60 + Math.round(Math.random() * 80),
    weight: 300 + Math.round(Math.random() * 12) * 50,
    tracking: Math.round(Math.random() * 20) - 4,
    wordSpacing: Math.round(Math.random() * 30),
    scaleX: 0.7 + Math.random() * 0.6,
    scaleY: 0.7 + Math.random() * 0.6,
    shear: Math.round(Math.random() * 30) - 15,
    rotate: Math.round(Math.random() * 20) - 10,
    offsetY: Math.round(Math.random() * 40) - 20,
    jitter: Math.round(Math.random() * 55),
    rate: 0.1 + Math.random() * 1.4,
    depth: 1 + Math.random() * 18,
    spread: Math.random() * 3,
    target: pick(['y', 'scale', 'rotate', 'skew', 'opacity']),
    wave: pick(['sine', 'tri', 'saw', 'pulse']),
    mod2On: Math.random() > 0.5,
    rate2: 0.1 + Math.random() * 1.2,
    depth2: Math.random() * 8,
    spread2: Math.random() * 3,
    target2: pick(['y', 'scale', 'rotate', 'skew', 'opacity']),
    wave2: pick(['sine', 'tri', 'saw', 'pulse']),
    seed: Math.floor(Math.random() * 100),
    overrides: {}, kern: {},
  });
  selected.clear();
  hydrate();
  toast('LANES RANDOMIZED');
});

function hydrate() {
  el.text.value = state.text;
  el.family.value = state.font;
  el.target.value = state.target;
  el.wave.value = state.wave;
  el.target2.value = state.target2;
  el.wave2.value = state.wave2;
  el.modOn.checked = state.modOn;
  el.modMirror.checked = state.modMirror;
  el.mod2On.checked = state.mod2On;
  el.mod2Mirror.checked = state.mod2Mirror;
  el.audioOn.checked = state.audioOn;
  el.audioSource.value = state.audioSource;
  RANGES.forEach(([key, outId, fmt]) => {
    el[key].value = state[key];
    $(outId).textContent = fmt(Number(state[key]));
  });
  document.querySelectorAll('.segment [data-align]').forEach((x) => {
    x.classList.toggle('on', x.dataset.align === state.align);
  });
  rebuild();
  renderKern();
}

window.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'textarea' || tag === 'input' || tag === 'select') return;
  if (e.code === 'Space') { e.preventDefault(); el.playBtn.click(); }
  if (e.code === 'Escape') clearSelection();
  if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    el.selAll.click();
  }
});

/* ------------------------------------------------------------------ */
/* kerning                                                             */
/* ------------------------------------------------------------------ */

function renderKern() {
  const keys = Object.keys(state.kern);
  el.kernList.replaceChildren();
  keys.forEach((k) => {
    const row = document.createElement('div');
    row.className = 'kern-item';
    const label = document.createElement('b');
    label.textContent = k.replace('|', ' ');
    const val = document.createElement('span');
    val.textContent = (state.kern[k] > 0 ? '+' : '') + state.kern[k] + 'px';
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.textContent = 'DEL';
    rm.addEventListener('click', () => { delete state.kern[k]; renderKern(); sync(); });
    const right = document.createElement('span');
    right.style.display = 'flex';
    right.style.gap = '8px';
    right.append(val, rm);
    row.append(label, right);
    el.kernList.append(row);
  });
  el.mOver.textContent = String(Object.keys(state.overrides).length);
}

el.kernAdd.addEventListener('click', () => {
  const pair = (el.kernPair.value || '').trim().toUpperCase();
  if (pair.length !== 2) { toast('PAIR NEEDS TWO CHARACTERS'); return; }
  state.kern[pair[0] + '|' + pair[1]] = Number(el.kernVal.value) || 0;
  renderKern();
  sync();
  el.kernPair.value = '';
});

/* ------------------------------------------------------------------ */
/* font upload                                                         */
/* ------------------------------------------------------------------ */

let uploadCount = 0;

async function loadFontFile(file) {
  if (!file) return;
  const ok = /\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/.test(file.name);
  if (!ok) { toast('UNSUPPORTED FILE'); return; }

  const family = 'GlyphUpload' + (++uploadCount);
  const url = URL.createObjectURL(file);
  try {
    const face = new FontFace(family, `url(${url})`);
    await face.load();
    document.fonts.add(face);
    state.font = family;
    state.fontName = file.name.replace(/\.(ttf|otf|woff2?)$/i, '');
    const opt = document.createElement('option');
    opt.value = family;
    opt.textContent = 'UPLOADED · ' + file.name.replace(/\.(ttf|otf|woff2?)$/i, '').slice(0, 18).toUpperCase();
    el.family.append(opt);
    el.family.value = family;
    el.fontLabel.textContent = file.name;
    sync();
    toast('TYPEFACE LOADED');
  } catch (err) {
    toast('FONT FAILED · ' + String(err.message || err).slice(0, 40));
  }
}

el.fontBtn.addEventListener('click', () => el.fontFile.click());
el.fontFile.addEventListener('change', () => loadFontFile(el.fontFile.files[0]));

['dragover', 'dragenter'].forEach((evt) => {
  el.stage.addEventListener(evt, (e) => { e.preventDefault(); el.stage.classList.add('dropping'); });
});
['dragleave', 'drop'].forEach((evt) => {
  el.stage.addEventListener(evt, (e) => { e.preventDefault(); el.stage.classList.remove('dropping'); });
});
el.stage.addEventListener('drop', (e) => {
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  loadFontFile(f);
});

/* ------------------------------------------------------------------ */
/* audio                                                               */
/* ------------------------------------------------------------------ */

let audioCtx = null;
let analyser = null;
let sourceNode = null;
let micStream = null;
let oscNodes = [];
let lfoNode = null;
let silentGain = null;
let audioGain = 1;
let smoothed = 0;
let meterRaf = 0;

const meterBars = el.meter ? Array.from(el.meter.children) : [];

function ensureContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function stopAudio() {
  oscNodes.forEach((n) => { try { n.stop(); } catch (_) {} try { n.disconnect(); } catch (_) {} });
  oscNodes = [];
  lfoNode = null;
  if (sourceNode) { try { sourceNode.disconnect(); } catch (_) {} sourceNode = null; }
  if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
  if (analyser) { try { analyser.disconnect(); } catch (_) {} analyser = null; }
  if (silentGain) { try { silentGain.disconnect(); } catch (_) {} silentGain = null; }
  audioGain = 1;
  smoothed = 0;
  el.grid.style.setProperty('--d', String(state.depth));
  el.grid.style.setProperty('--d2', String(state.depth2));
  meterBars.forEach((b) => { b.style.height = '2px'; b.style.opacity = '0.25'; });
  if (meterRaf) cancelAnimationFrame(meterRaf);
  meterRaf = 0;
}

function setLfoRate() {
  if (lfoNode && audioCtx) lfoNode.frequency.setTargetAtTime(state.audioRate, audioCtx.currentTime, 0.08);
}

async function startAudio() {
  const ctx = ensureContext();
  stopAudio();

  analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.65;

  const silent = ctx.createGain();
  silent.gain.value = 0.0001;
  silentGain = silent;
  analyser.connect(silent).connect(ctx.destination);

  if (state.audioSource === 'mic') {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      sourceNode = ctx.createMediaStreamSource(micStream);
      sourceNode.connect(analyser);
    } catch (err) {
      toast('MIC BLOCKED · INTERNAL SOURCE');
      state.audioSource = 'tone';
      el.audioSource.value = 'tone';
      startAudio();
      return;
    }
  } else {
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = 90;

    const trem = ctx.createGain();
    trem.gain.value = 0.4;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = state.audioRate;

    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.36;

    lfo.connect(lfoDepth).connect(trem.gain);
    carrier.connect(trem).connect(analyser);

    carrier.start();
    lfo.start();

    oscNodes = [carrier, lfo];
    lfoNode = lfo;
    sourceNode = carrier;
  }

  const buf = new Float32Array(analyser.fftSize);
  const tick = () => {
    if (!analyser) return;
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    const target = clamp(rms * state.sensitivity * 2.2, 0, 1.6);
    smoothed += (target - smoothed) * (target > smoothed ? 0.4 : 0.05);
    audioGain = 0.35 + smoothed;
    el.grid.style.setProperty('--d', (state.depth * audioGain).toFixed(2));
    el.grid.style.setProperty('--d2', (state.depth2 * audioGain).toFixed(2));

    const lit = Math.round(clamp(smoothed, 0, 1) * meterBars.length);
    meterBars.forEach((b, i) => {
      b.style.height = (i < lit ? 4 + i * 1.1 : 2) + 'px';
      b.style.opacity = i < lit ? '0.95' : '0.22';
    });
    meterRaf = requestAnimationFrame(tick);
  };
  tick();
}

el.audioOn.addEventListener('change', () => {
  state.audioOn = el.audioOn.checked;
  if (state.audioOn) startAudio();
  else stopAudio();
});

el.audioSource.addEventListener('change', () => {
  state.audioSource = el.audioSource.value;
  if (state.audioOn) startAudio();
});

['pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
  window.addEventListener(evt, () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }, { passive: true });
});

/* ------------------------------------------------------------------ */
/* scope                                                               */
/* ------------------------------------------------------------------ */

const WAVE = {
  sine: (x) => Math.sin(x * Math.PI * 2),
  tri: (x) => 1 - 4 * Math.abs(((x + 0.25) % 1) - 0.5),
  saw: (x) => ((x % 1) * 2) - 1,
  pulse: (x) => ((x % 1) < 0.5 ? -1 : 1),
};

let scopeRaf = 0;
function drawScope(now) {
  const c = el.scope;
  if (!c) return;
  const ctx = c.getContext('2d');
  const W = c.width;
  const H = c.height;
  const t = now / 1000;

  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(232,230,223,0.08)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const y = (H / 4) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const draw = (wave, rate, depth, spread, color, width) => {
    if (depth <= 0) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    const amp = clamp(depth / 30, 0.15, 1) * (H * 0.35);
    for (let x = 0; x <= W; x += 2) {
      const phase = (x / W) * 2 + t * rate;
      const y = H / 2 - WAVE[wave](phase) * amp;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  draw(state.wave, state.rate, state.modOn ? state.depth : 0, state.spread, 'rgba(232,230,223,0.85)', 1.4);
  draw(state.wave2, state.rate2, state.mod2On ? state.depth2 : 0, state.spread2, 'rgba(232,230,223,0.28)', 1);

  // glyph phase ticks
  const n = Math.max(1, glyphs.length);
  glyphs.forEach((rec, i) => {
    const ov = state.overrides[i] || {};
    const phase = ov.phase != null ? ov.phase : (i / n) * state.spread;
    const x = (((phase + t * state.rate) % 1) + 1) % 1 * W;
    ctx.strokeStyle = selected.has(i) ? 'rgba(232,230,223,0.9)' : 'rgba(232,230,223,0.22)';
    ctx.beginPath();
    ctx.moveTo(x, H * 0.12);
    ctx.lineTo(x, H * 0.88);
    ctx.stroke();
  });

  scopeRaf = requestAnimationFrame(drawScope);
}

/* ------------------------------------------------------------------ */
/* export                                                              */
/* ------------------------------------------------------------------ */

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function measure() {
  const fs = state.size;
  const lh = fs * state.lineHeight;
  const rectW = Math.max(el.grid.scrollWidth, 320);
  const rectH = Math.max(el.grid.scrollHeight, 200);
  const gapW = fs * 0.26;
  const runs = [];

  let lineIndex = 0;
  Array.from(el.grid.children).forEach((lineEl) => {
    const items = Array.from(lineEl.children).filter(
      (n) => n.classList.contains('word') || n.classList.contains('gap')
    );
    const lineRuns = [];
    let x = 0;

    items.forEach((node) => {
      if (node.classList.contains('gap')) { x += gapW; return; }
      const glyphNodes = Array.from(node.children).filter((n) => n.classList.contains('g'));
      glyphNodes.forEach((gNode) => {
        const idx = Number(gNode.dataset.i);
        const w = gNode.offsetWidth || fs * 0.6;
        lineRuns.push({ ch: gNode.textContent, x, w, idx });
        x += w + state.tracking + kernFor(idx);
      });
      if (glyphNodes.length) x += state.wordSpacing;
    });

    if (lineRuns.length) x -= state.wordSpacing;
    const width = x;
    const offset =
      state.align === 'center' ? Math.max(0, (rectW - width) / 2) :
      state.align === 'right' ? Math.max(0, rectW - width) : 0;

    lineRuns.forEach((r) => runs.push({ ...r, x: r.x + offset, y: lineIndex * lh }));
    lineIndex++;
  });

  return { runs, lh, fs, rectW, rectH };
}

function googleFamily(name) {
  const map = {
    'Recursive': 'Recursive:wght@300..1000',
    'Inter': 'Inter:wght@100..900',
    'JetBrains Mono': 'JetBrains+Mono:wght@100..800',
    'Space Grotesk': 'Space+Grotesk:wght@300..700',
  };
  return map[name] || null;
}

function buildSVG() {
  const { runs, lh, fs, rectW, rectH } = measure();
  const pad = Math.round(fs * 0.45);
  const W = Math.ceil(rectW + pad * 2);
  const H = Math.ceil(rectH + pad * 2);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fam = googleFamily(state.font);

  let body = '';
  runs.forEach((r) => {
    const ov = resolved(r.idx);
    const cx = pad + r.x + r.w / 2;
    const y = pad + r.y + (lh - fs) / 2 + fs * 0.8;
    body += `<text x="0" y="0" text-anchor="middle" font-family="${esc(state.font)}" font-size="${fs}" font-weight="${state.weight}" style="font-variation-settings:'wght' ${state.weight},'slnt' ${state.slant}" transform="translate(${cx.toFixed(2)} ${y.toFixed(2)}) translate(${ov.tx} ${ov.ty}) rotate(${ov.rot}) skewX(${state.shear}) scale(${ov.sx} ${ov.sy})" fill="#e8e6df">${esc(r.ch)}</text>\n`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${fam ? `<defs><style><![CDATA[
@import url('https://fonts.googleapis.com/css2?family=${fam}&display=swap');
]]></style></defs>` : ''}
<rect width="100%" height="100%" fill="#0b0b0b"/>
<g>${body}</g>
</svg>`;
  return { svg, W, H };
}

function exportSVG() {
  const { svg } = buildSVG();
  download(new Blob([svg], { type: 'image/svg+xml' }), `glyph-symulator-${stamp()}.svg`);
  toast('SVG EXPORTED');
}

function exportPNG() {
  const { runs, lh, fs, rectW, rectH } = measure();
  const pad = Math.round(fs * 0.45);
  const W = Math.ceil(rectW + pad * 2);
  const H = Math.ceil(rectH + pad * 2);
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#0b0b0b';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8e6df';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${state.weight} ${fs}px "${state.font}", sans-serif`;

  runs.forEach((r) => {
    const ov = resolved(r.idx);
    const cx = pad + r.x + r.w / 2;
    const y = pad + r.y + (lh - fs) / 2 + fs * 0.8;
    ctx.save();
    ctx.translate(cx + ov.tx, y + ov.ty - state.offsetY);
    ctx.rotate((ov.rot * Math.PI) / 180);
    ctx.transform(1, 0, Math.tan((state.shear * Math.PI) / 180), 1, 0, 0);
    ctx.scale(ov.sx, ov.sy);
    ctx.fillText(r.ch, 0, 0);
    ctx.restore();
  });

  canvas.toBlob((blob) => {
    if (!blob) { toast('PNG FAILED'); return; }
    download(blob, `glyph-symulator-${stamp()}.png`);
    toast('PNG EXPORTED · 2X');
  }, 'image/png');
}

function exportJSON() {
  const payload = { app: 'glyph.pr0xy.dev', version: 2, exported: new Date().toISOString(), state };
  download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `glyph-spec-${stamp()}.json`);
  toast('SPEC EXPORTED');
}

el.svgBtn.addEventListener('click', exportSVG);
el.pngBtn.addEventListener('click', exportPNG);
el.jsonBtn.addEventListener('click', exportJSON);

/* ------------------------------------------------------------------ */
/* library                                                             */
/* ------------------------------------------------------------------ */

const SLOT_KEY = 'glyph.sym.slots.v2';

function readSlots() {
  try { return JSON.parse(localStorage.getItem(SLOT_KEY) || '{}'); } catch (_) { return {}; }
}
function writeSlots(s) {
  try { localStorage.setItem(SLOT_KEY, JSON.stringify(s)); } catch (_) {}
}

el.saveSlot.addEventListener('click', () => {
  const slots = readSlots();
  slots[el.slot.value] = { saved: new Date().toISOString(), state };
  writeSlots(slots);
  toast('SLOT ' + el.slot.value.toUpperCase() + ' SAVED');
});

el.loadSlot.addEventListener('click', () => {
  const slots = readSlots();
  const slot = slots[el.slot.value];
  if (!slot) { toast('SLOT EMPTY'); return; }
  Object.assign(state, JSON.parse(JSON.stringify(BASE)), slot.state);
  state.overrides = slot.state.overrides || {};
  state.kern = slot.state.kern || {};
  selected.clear();
  hydrate();
  toast('SLOT ' + el.slot.value.toUpperCase() + ' LOADED');
});

function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64decode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(s)));
}

el.shareBtn.addEventListener('click', async () => {
  const url = `${location.origin}${location.pathname}#s=${b64encode(JSON.stringify(state))}`;
  try {
    await navigator.clipboard.writeText(url);
    toast('LINK COPIED');
  } catch (_) {
    location.hash = 's=' + b64encode(JSON.stringify(state));
    toast('LINK IN ADDRESS BAR');
  }
});

el.importBtn.addEventListener('click', () => el.importFile.click());
el.importFile.addEventListener('change', () => {
  const f = el.importFile.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const s = data.state || data;
      Object.assign(state, JSON.parse(JSON.stringify(BASE)), s);
      state.overrides = s.overrides || {};
      state.kern = s.kern || {};
      selected.clear();
      hydrate();
      toast('SPEC IMPORTED');
    } catch (err) {
      toast('IMPORT FAILED');
    }
  };
  reader.readAsText(f);
});

function loadFromHash() {
  const m = location.hash.match(/^#s=(.+)$/);
  if (!m) return false;
  try {
    const s = JSON.parse(b64decode(m[1]));
    Object.assign(state, JSON.parse(JSON.stringify(BASE)), s);
    state.overrides = s.overrides || {};
    state.kern = s.kern || {};
    return true;
  } catch (_) {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* chrome                                                              */
/* ------------------------------------------------------------------ */

let toastTimer = 0;
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.append(t);
  }
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 1600);
}

let frames = 0;
let lastFps = performance.now();
function fpsLoop(now) {
  frames++;
  if (now - lastFps >= 500) {
    el.roFps.textContent = Math.round((frames * 1000) / (now - lastFps)) + ' FPS';
    frames = 0;
    lastFps = now;
  }
  requestAnimationFrame(fpsLoop);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) el.roFps.textContent = 'IDLE';
  else { frames = 0; lastFps = performance.now(); }
});

function clock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  el.roClock.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

let fitTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(fitStage, 120);
});

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

const fromHash = loadFromHash();
hydrate();
if (fromHash) toast('STATE LOADED FROM LINK');
if (document.hidden) el.roFps.textContent = 'IDLE';
requestAnimationFrame(fpsLoop);
scopeRaf = requestAnimationFrame(drawScope);
clock();
setInterval(clock, 1000);

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => sync());
}

// debug handle for QA and the console
window.__glyph = {
  state,
  rebuild,
  sync,
  measure,
  get selection() { return [...selected]; },
  get audio() {
    return { ctx: audioCtx ? audioCtx.state : 'none', gain: audioGain, level: smoothed, source: state.audioSource };
  },
  get layout() {
    return {
      lines: lines.length, glyphs: glyphs.length, overrides: Object.keys(state.overrides).length,
      gridW: el.grid.scrollWidth, gridH: el.grid.scrollHeight, stageW: el.stage.clientWidth,
    };
  },
};