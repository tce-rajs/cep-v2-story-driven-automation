// Text -> pen strokes from a real handwriting font (Kalam: made from real Indian handwriting, Latin + Devanagari).
// Renders the text in a browser canvas, thins every letter to a 1-pixel centre line (Zhang-Suen), traces the centre
// lines into polylines, simplifies and smooths them. The result is what a pen would trace: single lines, not outlines.
// Moved here 2026-10-05 from the long-writing scripts (used for the Marathi essays on the Ultra server).
//
// textToStrokes(page, text, { fontSize, maxWidth, lineHeight, weight }) -> { strokes: [{ x, y }[]], width, height, ... }
// in px, origin top-left. `page` is only a drawing surface for measuring the font -- give it a plain browser page of its
// own (it is replaced with a canvas), never the app window under test. It must be able to load Google Fonts.

async function textToStrokes(
  page,
  text,
  { fontSize = 90, maxWidth = 2200, lineHeight = 1.45, weight = 300, font = 'Kalam' } = {}
) {
  await page.setContent(
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@300;400;700&display=block"><canvas id="c"></canvas>`
  );
  await page.evaluate(
    async ({ font, weight, fontSize }) => {
      await document.fonts.load(`${weight} ${fontSize}px "${font}"`, 'Aआ');
      await document.fonts.ready;
    },
    { font, weight, fontSize }
  );
  return page.evaluate(
    ({ text, fontSize, maxWidth, lineHeight, weight, font }) => {
      const cvs = document.getElementById('c');
      const ctx = cvs.getContext('2d');
      const fontSpec = `${weight} ${fontSize}px "${font}"`;
      ctx.font = fontSpec;
      // Word-wrap.
      const lines = [];
      let line = '';
      for (const w of text.split(/\s+/)) {
        const t = line ? `${line} ${w}` : w;
        if (ctx.measureText(t).width > maxWidth && line) {
          lines.push(line);
          line = w;
        } else line = t;
      }
      if (line) lines.push(line);
      const lh = fontSize * lineHeight;
      const W = Math.ceil(maxWidth + fontSize);
      const H = Math.ceil(lines.length * lh + fontSize);
      cvs.width = W;
      cvs.height = H;
      ctx.font = fontSpec;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#000';
      ctx.textBaseline = 'alphabetic';
      lines.forEach((l, i) => ctx.fillText(l, fontSize * 0.3, fontSize * 1.05 + i * lh));
      const img = ctx.getImageData(0, 0, W, H).data;
      const g = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) g[i] = img[i * 4] < 128 ? 1 : 0;

      // Zhang-Suen thinning.
      const idx = (x, y) => y * W + x;
      let changed = true;
      const nb = (x, y) => [
        g[idx(x, y - 1)],
        g[idx(x + 1, y - 1)],
        g[idx(x + 1, y)],
        g[idx(x + 1, y + 1)],
        g[idx(x, y + 1)],
        g[idx(x - 1, y + 1)],
        g[idx(x - 1, y)],
        g[idx(x - 1, y - 1)],
      ];
      while (changed) {
        changed = false;
        for (const step of [0, 1]) {
          const del = [];
          for (let y = 1; y < H - 1; y++)
            for (let x = 1; x < W - 1; x++) {
              if (!g[idx(x, y)]) continue;
              const p = nb(x, y);
              const B = p.reduce((a, b) => a + b, 0);
              if (B < 2 || B > 6) continue;
              let A = 0;
              for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) A++;
              if (A !== 1) continue;
              if (step === 0 && (p[0] * p[2] * p[4] || p[2] * p[4] * p[6])) continue;
              if (step === 1 && (p[0] * p[2] * p[6] || p[0] * p[4] * p[6])) continue;
              del.push(idx(x, y));
            }
          if (del.length) changed = true;
          for (const i of del) g[i] = 0;
        }
      }

      // Trace the 1-px skeleton into polylines.
      const N8 = [
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [-1, -1],
        [0, -1],
        [1, -1],
      ];
      const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && g[idx(x, y)] === 1;
      const deg = (x, y) => N8.filter(([dx, dy]) => on(x + dx, y + dy)).length;
      const seen = new Uint8Array(W * H);
      const strokes = [];
      const walk = (sx, sy) => {
        const pts = [[sx, sy]];
        seen[idx(sx, sy)] = 1;
        let [x, y] = [sx, sy];
        let dir = null;
        for (;;) {
          let best = null;
          let bestScore = -9;
          for (const [dx, dy] of N8) {
            const nx = x + dx;
            const ny = y + dy;
            if (!on(nx, ny) || seen[idx(nx, ny)]) continue;
            const score = dir ? dx * dir[0] + dy * dir[1] : 0; // keep going the same way through junctions
            if (score > bestScore) {
              bestScore = score;
              best = [nx, ny, dx, dy];
            }
          }
          if (!best) break;
          [x, y] = best;
          dir = [best[2], best[3]];
          seen[idx(x, y)] = 1;
          pts.push([x, y]);
        }
        // Reconnect to an already-drawn junction pixel at either end, so branches meet their stem.
        for (const end of [0, 1]) {
          const [ex, ey] = end ? pts[pts.length - 1] : pts[0];
          const hit = N8.map(([dx, dy]) => [ex + dx, ey + dy]).find(
            ([nx, ny]) => on(nx, ny) && seen[idx(nx, ny)] && !pts.some((q) => q[0] === nx && q[1] === ny)
          );
          if (hit) end ? pts.push(hit) : pts.unshift(hit);
        }
        return pts;
      };
      // Endpoints first (natural stroke starts), then whatever is left (closed loops like o).
      const cols = [];
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (g[idx(x, y)]) cols.push([x, y]);
      for (const pass of [1, 2]) {
        for (const [x, y] of cols) {
          if (seen[idx(x, y)]) continue;
          if (pass === 1 && deg(x, y) !== 1) continue;
          strokes.push(walk(x, y));
        }
      }

      // Ramer-Douglas-Peucker simplification, then one round of Chaikin smoothing to remove the pixel stair-steps.
      const rdp = (pts, eps) => {
        if (pts.length < 3) return pts;
        const [a, b] = [pts[0], pts[pts.length - 1]];
        let dmax = 0;
        let k = 0;
        for (let i = 1; i < pts.length - 1; i++) {
          const p = pts[i];
          const d =
            Math.abs((b[1] - a[1]) * p[0] - (b[0] - a[0]) * p[1] + b[0] * a[1] - b[1] * a[0]) /
            (Math.hypot(b[1] - a[1], b[0] - a[0]) || 1);
          if (d > dmax) {
            dmax = d;
            k = i;
          }
        }
        return dmax > eps ? [...rdp(pts.slice(0, k + 1), eps).slice(0, -1), ...rdp(pts.slice(k), eps)] : [a, b];
      };
      const chaikin = (pts) => {
        if (pts.length < 3) return pts;
        const out = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) {
          const [p, q] = [pts[i], pts[i + 1]];
          out.push(
            [0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]],
            [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]]
          );
        }
        out.push(pts[pts.length - 1]);
        return out;
      };
      const len = (pts) =>
        pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
      const minLen = fontSize * 0.06;

      // Join pieces whose ends touch (within 2 px) into one pen stroke: the skeleton splits a letter wherever lines
      // cross, but a hand draws through those points without lifting the pen. Endpoints are found via a grid.
      const chain = (list) => {
        const alive = list.map((s) => s.slice());
        const cell = (p) => `${p[0] >> 2},${p[1] >> 2}`;
        const grid = new Map();
        const add = (i, end) => {
          const p = end ? alive[i][alive[i].length - 1] : alive[i][0];
          const k = cell(p);
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push([i, end]);
        };
        alive.forEach((_, i) => {
          add(i, 0);
          add(i, 1);
        });
        const dead = new Set();
        const near = (p, skip) => {
          const [cx, cy] = [p[0] >> 2, p[1] >> 2];
          for (let dx = -1; dx <= 1; dx++)
            for (let dy = -1; dy <= 1; dy++)
              for (const [j, end] of grid.get(`${cx + dx},${cy + dy}`) || []) {
                if (j === skip || dead.has(j)) continue;
                const q = end ? alive[j][alive[j].length - 1] : alive[j][0];
                if (Math.max(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])) <= 2) return [j, end];
              }
          return null;
        };
        for (let i = 0; i < alive.length; i++) {
          if (dead.has(i)) continue;
          for (let guard = 0; guard < 50; guard++) {
            const hit = near(alive[i][alive[i].length - 1], i);
            if (!hit) break;
            const [j, end] = hit;
            const other = end ? alive[j].slice().reverse() : alive[j];
            alive[i] = alive[i].concat(other);
            dead.add(j);
          }
          for (let guard = 0; guard < 50; guard++) {
            const hit = near(alive[i][0], i);
            if (!hit) break;
            const [j, end] = hit;
            const other = end ? alive[j] : alive[j].slice().reverse();
            alive[i] = other.concat(alive[i]);
            dead.add(j);
          }
        }
        return alive.filter((_, i) => !dead.has(i));
      };
      const result = chain(strokes)
        .map((s) => chaikin(chaikin(rdp(s, 0.9))))
        .filter((s) => len(s) >= minLen || s.length <= 3) // drop skeleton spurs, keep dots
        .map((s) => (s.length === 1 ? [s[0], [s[0][0] + 1, s[0][1] + 1]] : s))
        .map((s) => s.map(([x, y]) => ({ x, y })));
      // Write in reading order: line by line, left to right.
      const lineOf = (s) => Math.floor(Math.min(...s.map((p) => p.y)) / lh + 0.2);
      result.sort((a, b) => lineOf(a) - lineOf(b) || Math.min(...a.map((p) => p.x)) - Math.min(...b.map((p) => p.x)));
      return { strokes: result, width: W, height: H, lines: lines.length, lineTexts: lines };
    },
    { text, fontSize, maxWidth, lineHeight, weight, font }
  );
}

module.exports = { textToStrokes };
