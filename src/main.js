import './style.css';

/* ------------------------------------------------------------------ */
/* presets + state                                                     */
/* ------------------------------------------------------------------ */

const PRESETS = {
  datum: {
    text: 'GLYPH\nSYMULATOR',
    font: 'Recursive', size: 96, weight: 640, slant: 0, lineHeight: 1.02,
    tracking: 0, wordSpacing: 0, align: 'left', seed: 7,
    scaleX: 1, scaleY: 1, shear: 0, rotate: 0, offsetY: 0, jitter: 0,
    modOn: true, modMirror: false, rate: 0.18, depth: 2, spread: 1,
    target: 'y', wave: 'sine',
  },
  tremor: {
    text: 'TREMOR\nPROTOCOL',
    font: 'Recursive', size: 104, weight: 800, slant: 0, lineHeight: 0.98,
    tracking: 2, wordSpacing: 0, align: 'left', seed: 21,
    scaleX: 1, scaleY: 1, shear: 0, rotate: 0, offsetY: 0, jitter: 18,
    modOn: true, modMirror: true, rate: 2.2, depth: 1.6, spread: 0.45,
    target: 'y', wave: 'pulse',
  },
  column: {
    text: 'COLUMN\nBREAK',
    font: 'Inter', size: 116, weight: 900, slant: 0, lineHeight: 0.9,
    tracking: -6, wordSpacing: 0, align: 'left', seed: 4,
    scaleX: 0.62, scaleY: 1.25, shear: 0, rotate: 0, offsetY: 0, jitter: 0,
    modOn: true, modMirror: false, rate: 0.12, depth: 1.2, spread: 1.6,
    target: 'scale', wave: 'sine',
  },
  keygen: {
    text: '3XP-7741-\nSYM/KEY',
    font: 'JetBrains Mono', size: 82, weight: 500, slant: 0, lineHeight: 1.15,
    tracking: 8, wordSpacing: 0, align: 'left', seed: 33,
    scaleX: 1, scaleY: 1, shear: -6, rotate: 0, offsetY: 0, jitter: 6,
    modOn: true, modMirror: true, rate: 1.1, depth: 5, spread: 2.4,
    target: 'y', wave: 'saw',
  },
  flood: {
    text: 'FLOOD\nTHE\nCHANNEL',
    font: 'Space Grotesk', size: 88, weight: 700, slant: 0, lineHeight: 0.95,
    tracking: -2, wordSpacing: 0, align: 'left', seed: 11,
    scaleX: 1, scaleY: 1, shear: 0, rotate: 0, offsetY: 0, jitter: 28,
    modOn: true, modMirror: false, rate: 0.4, depth: 9, spread: 2.2,
    target: 'rotate', wave: 'tri',
  },
};

const state = {
  ...PRESETS.datum,
  audioOn: false, audioSource: 'tone', audioRate: 2.4, sensitivity: 1,
};

const $ = (id) => document.getElementById(id);

const el = {
  grid: $('grid'), text: $('text'), family: $('family'),
  size: $('size'), weight: $('weight'), slant: $('slant'), lineHeight: $('lineHeight'),
  tracking: $('tracking'), wordSpacing: $('wordSpacing'), seed: $('seed'),
  scaleX: $('scaleX'), scaleY: $('scaleY'), shear: $('shear'), rotate: $('rotate'),
  offsetY: $('offsetY'), jitter: $('jitter'),
  modOn: $('modOn'), modMirror: $('modMirror'), rate: $('rate'), depth: $('depth'),
  spread: $('spread'), target: $('target'), wave: $('wave'),
  audioOn: $('audioOn'), audioSource: $('audioSource'), audioRate: $('audioRate'),
  sensitivity: $('sensitivity'), meter: $('meter'),
  ovGrid: $('ovGrid'), ovGuides: $('ovGuides'), ovBoxes: $('ovBoxes'),
  playBtn: $('playBtn'), resetBtn: $('resetBtn'),
  preset: $('preset'), applyBtn: $('applyBtn'), randomBtn: $('randomBtn'),
  svgBtn: $('svgBtn'), pngBtn: $('pngBtn'), jsonBtn: $('jsonBtn'),
  roFamily: $('roFamily'), roGlyphs: $('roGlyphs'), roRate: $('roRate'), roFps: $('roFps'),
  roClock: $('roClock'), stageNote: $('stageNote'), stageNote2: $('stageNote2'),
};

let glyphs = [];
let words = [];
let lines = [];
let playing = true;

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
        const inner = span('g-in', ch);
        g.append(inner);
        wordEl.append(g);
        glyphs.push({
          g, inner,
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
  });

  el.grid.replaceChildren(frag);
  el.roGlyphs.textContent = String(glyphs.length);
  sync();
}

function sync() {
  const g = el.grid;
  const fs = state.size;
  const lh = fs * state.lineHeight;

  g.style.fontFamily = state.font;
  g.style.fontSize = fs + 'px';
  g.style.lineHeight = String(state.lineHeight);
  g.style.textAlign = state.align;
  g.style.fontVariationSettings =
    `"wght" ${state.weight}, "slnt" ${state.slant}, "opsz" ${clamp(fs, 14, 32)}`;
  g.style.setProperty('--lhpx', lh + 'px');
  g.style.setProperty('--d', String(state.depth * audioGain));

  g.classList.toggle('target-scale', state.target === 'scale');
  g.classList.toggle('target-rotate', state.target === 'rotate');
  g.classList.toggle('target-skew', state.target === 'skew');
  g.classList.toggle('target-opacity', state.target === 'opacity');

  g.classList.toggle('wave-sine', state.wave === 'sine');
  g.classList.toggle('wave-tri', state.wave === 'tri');
  g.classList.toggle('wave-saw', state.wave === 'saw');
  g.classList.toggle('wave-pulse', state.wave === 'pulse');

  g.classList.toggle('ov-grid', el.ovGrid.checked);
  g.classList.toggle('ov-guides', el.ovGuides.checked);
  g.classList.toggle('ov-boxes', el.ovBoxes.checked);
  g.classList.toggle('paused', !playing || !state.modOn);

  const period = 1 / Math.max(0.02, state.rate);
  const n = Math.max(1, glyphs.length);
  const jitter = state.jitter / 100;

  glyphs.forEach((rec, i) => {
    const r = rec.r;
    const sx = state.scaleX * (1 + jitter * 0.55 * r[0]);
    const sy = state.scaleY * (1 + jitter * 0.55 * r[1]);
    const rot = state.rotate + jitter * 26 * r[2];
    const skew = state.shear + jitter * 12 * r[3];
    const ty = state.offsetY + jitter * 34 * r[4];
    const tx = jitter * 10 * r[0];

    rec.g.style.setProperty('--sx', sx.toFixed(3));
    rec.g.style.setProperty('--sy', sy.toFixed(3));
    rec.g.style.setProperty('--rot', rot.toFixed(2) + 'deg');
    rec.g.style.setProperty('--skew', skew.toFixed(2) + 'deg');
    rec.g.style.setProperty('--ty', ty.toFixed(2) + 'px');
    rec.g.style.setProperty('--tx', tx.toFixed(2) + 'px');
    rec.g.style.setProperty('--track', state.tracking + 'px');

    const dir = state.modMirror && i % 2 ? 1 : -1;
    rec.inner.style.animationDuration = period.toFixed(4) + 's';
    rec.inner.style.animationDelay = (dir * (i / n) * state.spread * period).toFixed(4) + 's';
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

  el.roFamily.textContent = state.font.toUpperCase();
  el.roRate.textContent = state.rate.toFixed(2) + ' Hz';
  el.stageNote2.textContent = `CHANNEL B · ${state.target.toUpperCase()} / ${state.wave.toUpperCase()} @ ${state.depth}`;

  requestAnimationFrame(fitStage);
}

function fitStage() {
  const stage = document.getElementById('stage');
  const inner = document.getElementById('stageInner');
  if (!stage || !inner) return;

  el.grid.style.transform = 'none';
  el.grid.style.width = '';
  const natural = el.grid.scrollWidth;
  const styles = getComputedStyle(stage);
  const avail = stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  if (!natural || !avail) return;

  const k = Math.min(1, avail / natural);
  if (k < 0.999) {
    el.grid.style.transformOrigin = 'top left';
    el.grid.style.transform = `scale(${k})`;
    el.grid.style.width = avail / k + 'px';
  } else {
    el.grid.style.width = '';
  }
}

let fitTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(fitStage, 120);
});

/* ------------------------------------------------------------------ */
/* bindings                                                            */
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
  ['audioRate', 'audioRateOut', (v) => String(Math.round(v))],
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
    if (key === 'seed') rebuild();
    else sync();
    if (key === 'audioRate') setOscFreq();
  });
});

el.text.addEventListener('input', () => {
  state.text = el.text.value;
  rebuild();
});

el.family.addEventListener('change', () => { state.font = el.family.value; sync(); });
el.target.addEventListener('change', () => { state.target = el.target.value; sync(); });
el.wave.addEventListener('change', () => { state.wave = el.wave.value; sync(); });
el.modOn.addEventListener('change', () => { state.modOn = el.modOn.checked; sync(); });
el.modMirror.addEventListener('change', () => { state.modMirror = el.modMirror.checked; sync(); });

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
  });
  hydrate();
});

el.applyBtn.addEventListener('click', () => {
  const p = PRESETS[el.preset.value];
  if (!p) return;
  Object.assign(state, p);
  hydrate();
  toast('PRESET APPLIED · ' + el.preset.value.toUpperCase());
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
    seed: Math.floor(Math.random() * 100),
  });
  hydrate();
  toast('LANES RANDOMIZED');
});

function hydrate() {
  el.text.value = state.text;
  el.family.value = state.font;
  el.target.value = state.target;
  el.wave.value = state.wave;
  el.modOn.checked = state.modOn;
  el.modMirror.checked = state.modMirror;
  RANGES.forEach(([key, outId, fmt]) => {
    el[key].value = state[key];
    $(outId).textContent = fmt(Number(state[key]));
  });
  document.querySelectorAll('.segment [data-align]').forEach((x) => {
    x.classList.toggle('on', x.dataset.align === state.align);
  });
  rebuild();
}

window.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'textarea' || tag === 'input' || tag === 'select') return;
  if (e.code === 'Space') { e.preventDefault(); el.playBtn.click(); }
});

/* ------------------------------------------------------------------ */
/* audio modulation source                                             */
/* ------------------------------------------------------------------ */

let audioCtx = null;
let analyser = null;
let sourceNode = null;
let micStream = null;
let oscNodes = [];
let lfoNode = null;
let audioGain = 1;
let smoothed = 0;
let meterRaf = 0;
let silentGain = null;

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
  meterBars.forEach((b) => { b.style.height = '2px'; b.style.opacity = '0.25'; });
  if (meterRaf) cancelAnimationFrame(meterRaf);
  meterRaf = 0;
}

function setOscFreq() {
  if (lfoNode && audioCtx) lfoNode.frequency.setTargetAtTime(state.audioRate, audioCtx.currentTime, 0.08);
}

async function startAudio() {
  const ctx = ensureContext();
  stopAudio();

  analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.65;

  // keep the graph pulled by the destination without making noise
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
    // silent modulation source: a low sine tremolo'd by an LFO, never routed to speakers
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

// browsers only allow audio after a real gesture; resume on the first one
['pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
  window.addEventListener(evt, () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }, { passive: true });
});

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
  const track = state.tracking;
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
        const w = gNode.offsetWidth || fs * 0.6;
        lineRuns.push({ ch: gNode.textContent, x, w });
        x += w + track;
      });
      if (glyphNodes.length) {
        x -= track;
        x += state.wordSpacing;
      }
    });

    if (lineRuns.length) x -= state.wordSpacing;
    const width = x;
    const offset =
      state.align === 'center' ? Math.max(0, (rectW - width) / 2) :
      state.align === 'right' ? Math.max(0, rectW - width) : 0;

    lineRuns.forEach((r) => runs.push({ ...r, x: r.x + offset, y: lineIndex * lh, line: lineIndex }));
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
  return map[name] || name.replace(/ /g, '+');
}

function buildSVG() {
  const { runs, lh, fs, rectW, rectH } = measure();
  const pad = Math.round(fs * 0.45);
  const W = Math.ceil(rectW + pad * 2);
  const H = Math.ceil(rectH + pad * 2);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let body = '';
  runs.forEach((r) => {
    const cx = pad + r.x + r.w / 2;
    const y = pad + r.y + (lh - fs) / 2 + fs * 0.8;
    body += `<text x="0" y="0" text-anchor="middle" font-family="${esc(state.font)}" font-size="${fs}" font-weight="${state.weight}" style="font-variation-settings:'wght' ${state.weight},'slnt' ${state.slant}" transform="translate(${cx.toFixed(2)} ${y.toFixed(2)}) rotate(${state.rotate}) skewX(${state.shear}) scale(${state.scaleX} ${state.scaleY})" fill="#e8e6df">${esc(r.ch)}</text>\n`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><style><![CDATA[
@import url('https://fonts.googleapis.com/css2?family=${googleFamily(state.font)}&display=swap');
]]></style></defs>
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
    const cx = pad + r.x + r.w / 2;
    const y = pad + r.y + (lh - fs) / 2 + fs * 0.8;
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate((state.rotate * Math.PI) / 180);
    ctx.transform(1, 0, Math.tan((state.shear * Math.PI) / 180), 1, 0, 0);
    ctx.scale(state.scaleX, state.scaleY);
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
  const payload = {
    app: 'glyph.pr0xy.dev',
    version: 1,
    exported: new Date().toISOString(),
    state,
  };
  download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `glyph-spec-${stamp()}.json`);
  toast('SPEC EXPORTED');
}

el.svgBtn.addEventListener('click', exportSVG);
el.pngBtn.addEventListener('click', exportPNG);
el.jsonBtn.addEventListener('click', exportJSON);

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

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */

hydrate();
requestAnimationFrame(fpsLoop);
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
  get audio() {
    return {
      ctx: audioCtx ? audioCtx.state : 'none',
      gain: audioGain,
      level: smoothed,
      source: state.audioSource,
    };
  },
  get layout() {
    return {
      lines: lines.length,
      glyphs: glyphs.length,
      gridW: el.grid.scrollWidth,
      gridH: el.grid.scrollHeight,
      stageW: document.getElementById('stage').clientWidth,
    };
  },
};