// Human-like handwriting for whiteboard tests: turns text into pen strokes the way a teacher writes on a board --
// one joined-up stroke per word, then the dots and crosses (i, j, t, x) as short extra strokes, lines that slope and
// wobble a little, and a fresh "page" of board space when the current one is full.
//
// Glyphs are single-stroke polylines in letter units: x 0..width, y 0 = baseline, -1 = x-height, -1.8 = ascender,
// +0.8 = descender. Only lower-case a-z are drawn (upper case is written in lower case); digits and punctuation other
// than . , are skipped, which is fine for a volume/persistence test.

const GLYPHS = {
  a: {
    w: 1,
    main: [
      [0.9, -0.8],
      [0.5, -1],
      [0.1, -0.7],
      [0.1, -0.2],
      [0.5, 0],
      [0.9, -0.3],
      [0.9, -1],
      [0.9, 0],
      [1, 0],
    ],
  },
  b: {
    w: 1,
    main: [
      [0.1, -1.8],
      [0.1, 0],
      [0.1, -0.6],
      [0.5, -1],
      [0.9, -0.6],
      [0.8, -0.1],
      [0.4, 0],
      [0.1, -0.1],
      [1, 0],
    ],
  },
  c: {
    w: 0.9,
    main: [
      [0.9, -0.8],
      [0.5, -1],
      [0.1, -0.6],
      [0.2, -0.1],
      [0.6, 0],
      [0.9, -0.2],
    ],
  },
  d: {
    w: 1,
    main: [
      [0.9, -0.7],
      [0.5, -1],
      [0.1, -0.6],
      [0.2, -0.1],
      [0.6, 0],
      [0.9, -0.4],
      [0.9, -1.8],
      [0.9, 0],
      [1, 0],
    ],
  },
  e: {
    w: 0.9,
    main: [
      [0.1, -0.5],
      [0.9, -0.5],
      [0.8, -0.9],
      [0.4, -1],
      [0.1, -0.6],
      [0.3, -0.1],
      [0.7, 0],
      [0.95, -0.2],
    ],
  },
  f: {
    w: 0.8,
    main: [
      [0.8, -1.7],
      [0.5, -1.8],
      [0.3, -1.5],
      [0.3, 0.6],
    ],
    extra: [
      [
        [0.05, -0.9],
        [0.7, -0.9],
      ],
    ],
  },
  g: {
    w: 1,
    main: [
      [0.9, -0.8],
      [0.5, -1],
      [0.1, -0.7],
      [0.2, -0.3],
      [0.6, -0.2],
      [0.9, -0.6],
      [0.9, -1],
      [0.9, 0.5],
      [0.5, 0.8],
      [0.1, 0.5],
    ],
  },
  h: {
    w: 1,
    main: [
      [0.1, -1.8],
      [0.1, 0],
      [0.1, -0.6],
      [0.5, -1],
      [0.9, -0.7],
      [0.9, 0],
      [1, 0],
    ],
  },
  i: {
    w: 0.5,
    main: [
      [0.05, -0.9],
      [0.25, -1],
      [0.25, 0],
      [0.5, 0],
    ],
    extra: [
      [
        [0.25, -1.4],
        [0.28, -1.36],
      ],
    ],
  },
  j: {
    w: 0.6,
    main: [
      [0.2, -1],
      [0.45, -1],
      [0.45, 0.5],
      [0.2, 0.8],
      [0, 0.5],
    ],
    extra: [
      [
        [0.45, -1.4],
        [0.48, -1.36],
      ],
    ],
  },
  k: {
    w: 0.9,
    main: [
      [0.1, -1.8],
      [0.1, 0],
      [0.1, -0.4],
      [0.8, -1],
      [0.3, -0.55],
      [0.9, 0],
    ],
  },
  l: {
    w: 0.5,
    main: [
      [0.25, -1.8],
      [0.25, -0.2],
      [0.4, 0],
      [0.5, 0],
    ],
  },
  m: {
    w: 1.3,
    main: [
      [0.05, -1],
      [0.05, 0],
      [0.05, -0.7],
      [0.35, -1],
      [0.65, -0.7],
      [0.65, 0],
      [0.65, -0.7],
      [0.95, -1],
      [1.25, -0.7],
      [1.25, 0],
      [1.3, 0],
    ],
  },
  n: {
    w: 1,
    main: [
      [0.1, -1],
      [0.1, 0],
      [0.1, -0.7],
      [0.5, -1],
      [0.9, -0.7],
      [0.9, 0],
      [1, 0],
    ],
  },
  o: {
    w: 1,
    main: [
      [0.5, -1],
      [0.1, -0.6],
      [0.2, -0.1],
      [0.5, 0],
      [0.85, -0.3],
      [0.85, -0.8],
      [0.5, -1],
      [0.95, -1],
    ],
  },
  p: {
    w: 1,
    main: [
      [0.1, -1],
      [0.1, 0.8],
      [0.1, -0.7],
      [0.5, -1],
      [0.9, -0.6],
      [0.7, -0.1],
      [0.3, 0],
      [0.1, -0.2],
      [1, -0.1],
    ],
  },
  q: {
    w: 1,
    main: [
      [0.9, -0.8],
      [0.5, -1],
      [0.1, -0.6],
      [0.3, -0.1],
      [0.7, -0.1],
      [0.9, -0.5],
      [0.9, -1],
      [0.9, 0.8],
      [1, 0.6],
    ],
  },
  r: {
    w: 0.8,
    main: [
      [0.1, -1],
      [0.1, 0],
      [0.1, -0.6],
      [0.45, -1],
      [0.8, -0.9],
    ],
  },
  s: {
    w: 0.9,
    main: [
      [0.9, -0.9],
      [0.5, -1],
      [0.1, -0.8],
      [0.3, -0.5],
      [0.8, -0.4],
      [0.9, -0.15],
      [0.5, 0],
      [0.1, -0.1],
    ],
  },
  t: {
    w: 0.8,
    main: [
      [0.35, -1.6],
      [0.35, -0.2],
      [0.55, 0],
      [0.8, -0.1],
    ],
    extra: [
      [
        [0.05, -1],
        [0.7, -1],
      ],
    ],
  },
  u: {
    w: 1,
    main: [
      [0.1, -1],
      [0.1, -0.3],
      [0.4, 0],
      [0.8, -0.2],
      [0.85, -1],
      [0.85, 0],
      [1, 0],
    ],
  },
  v: {
    w: 1,
    main: [
      [0.05, -1],
      [0.5, 0],
      [0.95, -1],
    ],
  },
  w: {
    w: 1.3,
    main: [
      [0, -1],
      [0.3, 0],
      [0.65, -0.7],
      [1, 0],
      [1.3, -1],
    ],
  },
  x: {
    w: 0.9,
    main: [
      [0.1, -1],
      [0.9, 0],
    ],
    extra: [
      [
        [0.9, -1],
        [0.1, 0],
      ],
    ],
  },
  y: {
    w: 1,
    main: [
      [0.1, -1],
      [0.5, 0],
      [0.9, -1],
      [0.4, 0.8],
      [0.1, 0.7],
    ],
  },
  z: {
    w: 0.9,
    main: [
      [0.1, -1],
      [0.9, -1],
      [0.1, 0],
      [0.9, 0],
    ],
  },
  '.': {
    w: 0.4,
    main: null,
    extra: [
      [
        [0.2, -0.05],
        [0.23, 0],
      ],
    ],
  },
  ',': {
    w: 0.4,
    main: null,
    extra: [
      [
        [0.25, -0.1],
        [0.15, 0.3],
      ],
    ],
  },
};

/** A small deterministic random source, so a run can be repeated exactly. */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

/**
 * Lay `text` out as strokes inside `area` ({ x, y, width, height } in canvas pixels).
 * Returns pages: [{ words: [{ text, strokes: [[{x,y}, ...], ...] }] }]. A new page starts when the area is full;
 * the caller pans the board between pages so each page lands on fresh board space.
 */
function layoutHandwriting(text, area, { xHeight = 14, lineGap = 3.4, seed = 7 } = {}) {
  const rand = rng(seed);
  const unit = xHeight; // one letter unit in px
  const lineHeight = xHeight * lineGap;
  const pages = [];
  let page = { words: [] };
  let penX = area.x;
  let baseline = area.y + xHeight * 2;
  let slope = (rand() - 0.5) * 0.02;
  const lineStart = () => {
    penX = area.x + rand() * unit;
    slope = (rand() - 0.5) * 0.02; // each line drifts up or down a little
  };
  lineStart();

  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const word = raw.toLowerCase().replace(/[^a-z.,]/g, '');
    if (!word) continue;
    const width = [...word].reduce((w, ch) => w + (GLYPHS[ch] ? GLYPHS[ch].w : 0) * unit + unit * 0.15, 0);
    if (penX + width > area.x + area.width) {
      baseline += lineHeight;
      lineStart();
      if (baseline + unit > area.y + area.height) {
        pages.push(page);
        page = { words: [] };
        baseline = area.y + xHeight * 2;
      }
    }
    const jitter = () => (rand() - 0.5) * 0.08 * unit;
    const at = (gx, gy, ox) => ({
      x: ox + gx * unit + jitter(),
      y: baseline + (ox - area.x) * slope + gy * unit + jitter(),
    });
    const strokes = [];
    let joined = [];
    let ox = penX;
    for (const ch of word) {
      const g = GLYPHS[ch];
      if (!g) continue;
      if (g.main) joined.push(...g.main.map(([gx, gy]) => at(gx, gy, ox)));
      else if (joined.length) {
        strokes.push(joined);
        joined = [];
      }
      for (const e of g.extra || []) strokes.push(e.map(([gx, gy]) => at(gx, gy, ox)));
      ox += g.w * unit + unit * 0.15;
    }
    if (joined.length) strokes.unshift(joined); // the word itself first, then its dots and crosses
    page.words.push({ text: word, strokes });
    penX += width + unit * (0.9 + rand() * 0.4);
  }
  if (page.words.length) pages.push(page);
  return pages;
}

/** Points along a polyline every `step` px, so the pen moves smoothly like a real hand. */
function densify(points, step = 4) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

/** About `words` words of classroom text (a physics lesson), repeated with small changes. */
function lessonText(words = 800) {
  const base = (
    'Electric charge is a basic property of matter. Like charges repel and unlike charges attract each other. ' +
    'When we rub a glass rod with silk the rod becomes positive and the silk becomes negative. Charge is conserved, ' +
    'it is never created or destroyed, only moved from one body to another. The force between two point charges is ' +
    'given by the law of coulomb, it is directly proportional to the product of the charges and inversely ' +
    'proportional to the square of the distance between them. An electric field is the region around a charge where ' +
    'another charge feels a force. Field lines start on positive charges and end on negative charges and they never ' +
    'cross each other. Today we will solve five numericals and then discuss the homework for tomorrow.'
  ).split(' ');
  const out = [];
  for (let i = 0; out.length < words; i++) out.push(base[i % base.length]);
  return out.join(' ');
}

module.exports = { layoutHandwriting, densify, lessonText, GLYPHS };
