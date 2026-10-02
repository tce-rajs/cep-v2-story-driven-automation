// Human-like handwriting for whiteboard tests: turns text into pen strokes the way a teacher writes on a board --
// one joined-up stroke per word, then the dots and crosses (i, j, t, x) as short extra strokes, lines that slope and
// wobble a little, and a fresh "page" of board space when the current one is full.
//
// Glyphs are single-stroke polylines in letter units: x 0..width, y 0 = baseline, -1 = x-height, -1.8 = ascender,
// +0.8 = descender. Lower-case a-z are drawn; with the `caps` option upper case is printed as capitals (CAPS), otherwise
// it is written in lower case. Digits and punctuation other
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

/** Points along an elliptical arc (angles in degrees; 0 = right, 90 = down, -90 = up, since y grows downwards). */
function arc(cx, cy, rx, ry, a0, a1, n = 16) {
  const out = [];
  for (let k = 0; k <= n; k++) {
    const a = ((a0 + ((a1 - a0) * k) / n) * Math.PI) / 180;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
}

// Print capitals (used only with the `caps` option), in the same letter units: cap height -1.8. Each is a list of
// separate strokes. Straight strokes have at most 3 points so smoothing keeps their corners crisp; curved parts are
// arcs with many points.
const CAPS = {
  A: {
    w: 1.1,
    strokes: [
      [
        [0, 0],
        [0.55, -1.8],
        [1.1, 0],
      ],
      [
        [0.25, -0.7],
        [0.85, -0.7],
      ],
    ],
  },
  B: {
    w: 1,
    strokes: [
      [
        [0.1, 0],
        [0.1, -1.8],
      ],
      [[0.1, -1.8], ...arc(0.45, -1.35, 0.4, 0.45, -90, 90), [0.1, -0.9]],
      [[0.1, -0.9], ...arc(0.5, -0.45, 0.45, 0.45, -90, 90), [0.1, 0]],
    ],
  },
  C: { w: 1, strokes: [arc(0.55, -0.9, 0.5, 0.9, -45, -315, 24)] },
  D: {
    w: 1.05,
    strokes: [
      [
        [0.1, 0],
        [0.1, -1.8],
      ],
      [[0.1, -1.8], ...arc(0.45, -0.9, 0.55, 0.9, -90, 90, 20), [0.1, 0]],
    ],
  },
  E: {
    w: 0.9,
    strokes: [
      [
        [0.1, -1.8],
        [0.1, 0],
      ],
      [
        [0.1, -1.8],
        [0.85, -1.8],
      ],
      [
        [0.1, -0.9],
        [0.7, -0.9],
      ],
      [
        [0.1, 0],
        [0.85, 0],
      ],
    ],
  },
  F: {
    w: 0.85,
    strokes: [
      [
        [0.1, -1.8],
        [0.1, 0],
      ],
      [
        [0.1, -1.8],
        [0.8, -1.8],
      ],
      [
        [0.1, -0.9],
        [0.65, -0.9],
      ],
    ],
  },
  G: {
    w: 1.05,
    strokes: [
      arc(0.55, -0.9, 0.5, 0.9, -45, -330, 24),
      [
        [0.6, -0.75],
        [1.02, -0.75],
        [1.02, -0.15],
      ],
    ],
  },
  H: {
    w: 1,
    strokes: [
      [
        [0.1, -1.8],
        [0.1, 0],
      ],
      [
        [0.9, -1.8],
        [0.9, 0],
      ],
      [
        [0.1, -0.9],
        [0.9, -0.9],
      ],
    ],
  },
  I: {
    w: 0.4,
    strokes: [
      [
        [0.2, -1.8],
        [0.2, 0],
      ],
    ],
  },
  J: { w: 0.8, strokes: [[[0.7, -1.8], ...arc(0.4, -0.4, 0.3, 0.35, 0, 180, 12)]] },
  K: {
    w: 0.95,
    strokes: [
      [
        [0.1, -1.8],
        [0.1, 0],
      ],
      [
        [0.85, -1.8],
        [0.1, -0.8],
      ],
      [
        [0.35, -1.05],
        [0.9, 0],
      ],
    ],
  },
  L: {
    w: 0.85,
    strokes: [
      [
        [0.1, -1.8],
        [0.1, 0],
        [0.8, 0],
      ],
    ],
  },
  M: {
    w: 1.3,
    strokes: [
      [
        [0.1, 0],
        [0.1, -1.8],
        [0.65, -0.6],
      ],
      [
        [0.65, -0.6],
        [1.2, -1.8],
        [1.2, 0],
      ],
    ],
  },
  N: {
    w: 1.05,
    strokes: [
      [
        [0.1, 0],
        [0.1, -1.8],
        [0.95, 0],
      ],
      [
        [0.95, 0],
        [0.95, -1.8],
      ],
    ],
  },
  O: { w: 1.1, strokes: [arc(0.55, -0.9, 0.5, 0.9, -90, 270, 28)] },
  P: {
    w: 0.95,
    strokes: [
      [
        [0.1, 0],
        [0.1, -1.8],
      ],
      [[0.1, -1.8], ...arc(0.45, -1.35, 0.4, 0.45, -90, 90), [0.1, -0.9]],
    ],
  },
  Q: {
    w: 1.1,
    strokes: [
      arc(0.55, -0.9, 0.5, 0.9, -90, 270, 28),
      [
        [0.7, -0.35],
        [1.05, 0.1],
      ],
    ],
  },
  R: {
    w: 0.95,
    strokes: [
      [
        [0.1, 0],
        [0.1, -1.8],
      ],
      [[0.1, -1.8], ...arc(0.45, -1.35, 0.4, 0.45, -90, 90), [0.1, -0.9]],
      [
        [0.45, -0.9],
        [0.95, 0],
      ],
    ],
  },
  S: {
    w: 0.95,
    strokes: [[...arc(0.5, -1.35, 0.4, 0.45, -30, -270, 14), ...arc(0.5, -0.45, 0.45, 0.45, -90, 160, 14).slice(1)]],
  },
  T: {
    w: 1,
    strokes: [
      [
        [0, -1.8],
        [1, -1.8],
      ],
      [
        [0.5, -1.8],
        [0.5, 0],
      ],
    ],
  },
  U: { w: 1, strokes: [[[0.1, -1.8], ...arc(0.5, -0.45, 0.4, 0.45, 180, 0, 14), [0.9, -1.8]]] },
  V: {
    w: 1,
    strokes: [
      [
        [0, -1.8],
        [0.5, 0],
        [1, -1.8],
      ],
    ],
  },
  W: {
    w: 1.4,
    strokes: [
      [
        [0, -1.8],
        [0.35, 0],
        [0.7, -1.2],
      ],
      [
        [0.7, -1.2],
        [1.05, 0],
        [1.4, -1.8],
      ],
    ],
  },
  X: {
    w: 0.95,
    strokes: [
      [
        [0.05, -1.8],
        [0.9, 0],
      ],
      [
        [0.9, -1.8],
        [0.05, 0],
      ],
    ],
  },
  Y: {
    w: 1,
    strokes: [
      [
        [0, -1.8],
        [0.5, -0.9],
      ],
      [
        [1, -1.8],
        [0.5, -0.9],
        [0.5, 0],
      ],
    ],
  },
  Z: {
    w: 0.95,
    strokes: [
      [
        [0.05, -1.8],
        [0.9, -1.8],
        [0.05, 0],
      ],
      [
        [0.05, 0],
        [0.9, 0],
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
function layoutHandwriting(
  text,
  area,
  { xHeight = 14, lineGap = 3.4, seed = 7, smooth = false, slant = 0, sizeVar = 0, letterGap = 0.15, caps = false } = {}
) {
  // caps: write upper-case letters as print capitals (CAPS) instead of lower case.
  // smooth: curves through each letter's points instead of straight lines between them (rounder, less machine-like).
  // slant: forward lean of the letters (0.15-0.2 looks like a real hand). sizeVar: word-to-word size change (0.05 = +-5%).
  // letterGap: space between letters, in letter units (0.25-0.3 keeps larger writing from running together).
  // All default to the old behaviour, so existing layouts (and the tests built on them) are unchanged.
  const rand = rng(seed);
  let unit = xHeight; // one letter unit in px
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
    const word = caps ? raw.replace(/[^A-Za-z.,]/g, '') : raw.toLowerCase().replace(/[^a-z.,]/g, '');
    if (!word) continue;
    if (sizeVar) unit = xHeight * (1 + (rand() - 0.5) * 2 * sizeVar);
    const glyph = (ch) => CAPS[ch] || GLYPHS[ch] || GLYPHS[ch.toLowerCase()];
    const width = [...word].reduce((w, ch) => w + (glyph(ch) ? glyph(ch).w : 0) * unit + unit * letterGap, 0);
    if (penX + width > area.x + area.width) {
      baseline += lineHeight;
      lineStart();
      if (baseline + unit > area.y + area.height) {
        pages.push(page);
        page = { words: [] };
        baseline = area.y + xHeight * 2;
      }
    }
    // A little hand shake per point; smoothed writing needs less (the curve already varies), or it looks wobbly.
    const jitter = () => (rand() - 0.5) * (smooth ? 0.025 : 0.08) * unit;
    const at = (gx, gy, ox) => ({
      x: ox + gx * unit - gy * unit * slant + jitter(),
      y: baseline + (ox - area.x) * slope + gy * unit + jitter(),
    });
    const curve = (pts) => (smooth ? catmullRom(pts) : pts);
    const strokes = [];
    let joined = [];
    let ox = penX;
    for (const ch of word) {
      const cap = caps && CAPS[ch];
      if (cap) {
        // A capital is printed on its own: lift the pen before it, draw its strokes, start the next letter fresh.
        if (joined.length) {
          strokes.push(curve(joined));
          joined = [];
        }
        for (const s of cap.strokes) strokes.push(curve(s.map(([gx, gy]) => at(gx, gy, ox))));
        ox += cap.w * unit + unit * letterGap;
        continue;
      }
      const g = GLYPHS[ch] || GLYPHS[ch.toLowerCase()];
      if (!g) continue;
      // In smooth mode, lift the pen before a letter that starts at its top (b f h k l t) or top-right (a c d g q s):
      // a straight join up to that start cuts across the letter, so "ch" reads as "dh" and "a" as "o".
      // Also before v, w and y: their first move is down from the top, so a join up into them reads as an extra "l".
      if (
        smooth &&
        g.main &&
        joined.length &&
        (g.main[0][1] < -1.2 || g.main[0][0] > 0.7 || 'vwy'.includes(ch.toLowerCase()))
      ) {
        strokes.push(curve(joined));
        joined = [];
      }
      if (g.main) joined.push(...g.main.map(([gx, gy]) => at(gx, gy, ox)));
      else if (joined.length) {
        strokes.push(curve(joined));
        joined = [];
      }
      for (const e of g.extra || []) strokes.push(curve(e.map(([gx, gy]) => at(gx, gy, ox))));
      ox += g.w * unit + unit * letterGap;
    }
    if (joined.length) strokes.unshift(curve(joined)); // the word itself first, then its dots and crosses
    page.words.push({ text: word, strokes });
    penX += width + unit * (0.9 + rand() * 0.4);
  }
  if (page.words.length) pages.push(page);
  return pages;
}

/** A Catmull-Rom curve through `pts` (8 points per segment): the pen passes through every letter point but bends
 * between them the way a hand does, instead of turning sharp corners. */
function catmullRom(pts, perSegment = 8) {
  // Short strokes (2-3 points: a cross, a capital's straight bar or corner) stay straight so their corners stay crisp.
  if (pts.length < 4) return pts;
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  const out = [pts[0]];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    for (let k = 1; k <= perSegment; k++) {
      const t = k / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return out;
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
