// Generates the upload test-data kit in test-data/: files a teacher would really upload (positive) and broken, wrong or
// oversized ones (negative), plus test-data/manifest.json describing each file and what the app should do with it.
//
//   node scripts/make-test-data.js
//
// Images, videos (real H.264 .mp4 and VP8 .webm, recorded with Chrome's MediaRecorder), audio and PDFs are made with the
// installed Google Chrome (Playwright channel "chrome": the bundled Chromium has no H.264 encoder). Office files are
// built from their XML parts (scripts/lib/office-docs.js) or with the `xlsx` package. Everything is generated, so the
// kit contains no real people's data. The binaries are gitignored; rerun this script to rebuild them.
//
// The Create form accepts (CONFIRMED LIVE 2026-09-27, v 0.0.232): .jpeg .jpg .png .mp4 .pdf .xlsx .xls .doc .docx .ppt
// .pptx .txt .gif .odp .ods .odt, "File Size Limit is 10 MB".

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const XLSX = require('xlsx');
const { docx, pptx, odt, odp } = require('./lib/office-docs');

const ROOT = path.join(__dirname, '..', 'test-data');
const POS = path.join(ROOT, 'positive');
const NEG = path.join(ROOT, 'negative');
const MB = 1024 * 1024;
const manifest = [];

function save(dir, name, buf, meta) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, buf);
  manifest.push({
    file: path.relative(ROOT, file).replace(/\\/g, '/'),
    bytes: buf.length,
    ...(buf.codec && { codec: buf.codec }),
    ...meta,
  });
  console.log(`${(buf.length / MB).toFixed(2).padStart(6)} MB  ${path.relative(ROOT, file)}`);
}

// ---------- browser-side helpers (run inside Chrome) ----------

const PAGE_HELPERS = `
window.paintLesson = (ctx, w, h, t, noise) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'hsl(' + ((t * 40) % 360) + ',60%,35%)');
  g.addColorStop(1, 'hsl(' + ((t * 40 + 120) % 360) + ',60%,20%)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff'; ctx.font = Math.round(h / 12) + 'px sans-serif';
  ctx.fillText('Electric Charges and Fields', w * 0.06, h * 0.18);
  ctx.font = Math.round(h / 18) + 'px sans-serif';
  ctx.fillText("Coulomb's law  F = k q1 q2 / r^2", w * 0.06, h * 0.32);
  const x = w / 2 + Math.cos(t * 2) * w / 4, y = h * 0.62 + Math.sin(t * 2) * h / 6;
  ctx.beginPath(); ctx.arc(x, y, h / 12, 0, 7); ctx.fillStyle = '#ffcc00'; ctx.fill();
  ctx.fillStyle = '#000'; ctx.fillText('+', x - h / 40, y + h / 40);
  ctx.fillStyle = '#fff'; ctx.fillText('t = ' + t.toFixed(1) + ' s', w * 0.06, h * 0.92);
  if (noise) { // incompressible detail, to push a file towards a target size
    const img = ctx.getImageData(0, 0, w, Math.round(h / 3));
    const d = img.data; for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = v; d[i + 1] = v; d[i + 2] = v; }
    ctx.putImageData(img, 0, Math.round(h * 0.66));
  }
};
window.blobToB64 = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.readAsDataURL(blob); });
window.makeImage = async ({ w, h, type, quality, noise, transparent }) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  if (transparent) { ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 3, 0, 7); ctx.fill(); }
  else paintLesson(ctx, w, h, 1.3, noise);
  const blob = await new Promise((res) => c.toBlob(res, type, quality));
  return blobToB64(blob);
};
window.makeVideo = async ({ w, h, seconds, mimeType, bitrate, noise, audio }) => {
  if (!MediaRecorder.isTypeSupported(mimeType)) return { error: 'unsupported ' + mimeType };
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  const stream = c.captureStream(30);
  let ac;
  if (audio) {
    ac = new AudioContext(); await ac.resume(); const osc = ac.createOscillator(); osc.frequency.value = 440;
    const dest = ac.createMediaStreamDestination(); osc.connect(dest); osc.start();
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  }
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
  const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const start = performance.now();
  const draw = () => paintLesson(ctx, w, h, (performance.now() - start) / 1000, noise); const timer = setInterval(draw, 33);
  draw(); rec.start(500);
  await new Promise((r) => setTimeout(r, seconds * 1000));
  await new Promise((r) => { rec.onstop = r; rec.stop(); });
  clearInterval(timer); if (ac) ac.close();
  return { b64: await blobToB64(new Blob(chunks, { type: mimeType })), recorded: rec.mimeType };
};
window.makeAudio = async ({ seconds, mimeType }) => {
  if (!MediaRecorder.isTypeSupported(mimeType)) return { error: 'unsupported ' + mimeType };
  const ac = new AudioContext(); await ac.resume(); const osc = ac.createOscillator(); const dest = ac.createMediaStreamDestination();
  osc.frequency.value = 330; osc.connect(dest); osc.start();
  const rec = new MediaRecorder(dest.stream, { mimeType }); const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data); rec.start(500);
  await new Promise((r) => setTimeout(r, seconds * 1000));
  await new Promise((r) => { rec.onstop = r; rec.stop(); }); ac.close();
  return { b64: await blobToB64(new Blob(chunks, { type: mimeType })), recorded: rec.mimeType };
};
`;

const MP4 = 'video/mp4'; // H.264 + Opus: this machine's Chrome cannot encode AAC (every mp4a codec string records an empty file)
const MP4_SILENT = 'video/mp4';
const WEBM = 'video/webm';

async function withChrome(fn) {
  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent('<html><body><button id="go">go</button></body></html>');
    await page.click('#go'); // a user gesture, so the AudioContext really runs (without one the audio track stays empty)
    await page.addScriptTag({ content: PAGE_HELPERS });
    return await fn(page, browser);
  } finally {
    await browser.close();
  }
}

const b64 = (s) => Buffer.from(s, 'base64');

async function video(page, opts) {
  const r = await page.evaluate((o) => window.makeVideo(o), opts);
  if (r.error) throw new Error(r.error);
  const buf = b64(r.b64);
  buf.codec = r.recorded; // what Chrome actually recorded, kept in the manifest
  return buf;
}

/** Record until the file lands inside [min, max] bytes (the bitrate is only a target for MediaRecorder). */
async function videoOfSize(page, opts, min, max) {
  let bitrate = opts.bitrate;
  for (let i = 0; i < 5; i++) {
    const buf = await video(page, { ...opts, bitrate });
    if (buf.length >= min && buf.length <= max) return buf;
    bitrate = Math.round((bitrate * ((min + max) / 2)) / buf.length);
  }
  throw new Error(`could not hit ${min}-${max} bytes`);
}

function pdfHtml(pages, { withImages = false } = {}) {
  const body = [];
  for (let i = 1; i <= pages; i++) {
    body.push(
      `<section style="page-break-after:always;font-family:sans-serif">` +
        `<h1>Worksheet page ${i}</h1><p>Answer the following questions on electric charges.</p>` +
        [1, 2, 3, 4, 5]
          .map((q) => `<p>Q${q}. Two charges of ${q} uC are placed ${q * 10} cm apart. Find the force.</p>`)
          .join('') +
        (withImages ? `<img src="__IMG__" style="width:100%">` : '') +
        `</section>`
    );
  }
  return `<html><body>${body.join('')}</body></html>`;
}

async function main() {
  fs.rmSync(ROOT, { recursive: true, force: true });
  fs.mkdirSync(POS, { recursive: true });
  fs.mkdirSync(NEG, { recursive: true });

  let lessonMp4;
  await withChrome(async (page, browser) => {
    // ---------- images ----------
    const img = async (o) => b64(await page.evaluate((x) => window.makeImage(x), o));
    save(POS, 'diagram-1920x1080.png', await img({ w: 1920, h: 1080, type: 'image/png' }), {
      group: 'positive',
      kind: 'image',
      expect: 'accept',
      note: 'Full-HD diagram, PNG',
    });
    save(
      POS,
      'classroom-photo-4000x3000.jpg',
      await img({ w: 4000, h: 3000, type: 'image/jpeg', quality: 0.9, noise: true }),
      {
        group: 'positive',
        kind: 'image',
        expect: 'accept',
        note: 'Phone-camera sized JPEG (12 MP)',
      }
    );
    save(POS, 'board-photo.jpeg', await img({ w: 1280, h: 960, type: 'image/jpeg', quality: 0.8 }), {
      group: 'positive',
      kind: 'image',
      expect: 'accept',
      note: '.jpeg extension',
    });
    save(POS, 'PHOTO-UPPERCASE.JPG', await img({ w: 1024, h: 768, type: 'image/jpeg', quality: 0.8 }), {
      group: 'positive',
      kind: 'image',
      expect: 'accept',
      note: 'Upper-case extension, as Windows cameras save it',
    });
    save(POS, 'tiny-icon-16x16.png', await img({ w: 16, h: 16, type: 'image/png' }), {
      group: 'positive',
      kind: 'image',
      expect: 'accept',
      note: 'Very small image',
    });
    save(POS, 'tall-infographic-800x8000.png', await img({ w: 800, h: 8000, type: 'image/png' }), {
      group: 'positive',
      kind: 'image',
      expect: 'accept',
      note: 'Very tall image (1:10)',
    });
    save(POS, 'transparent-logo.png', await img({ w: 600, h: 600, type: 'image/png', transparent: true }), {
      group: 'positive',
      kind: 'image',
      expect: 'accept',
      note: 'PNG with transparency',
    });
    save(NEG, 'photo.webp', await img({ w: 800, h: 600, type: 'image/webp', quality: 0.8 }), {
      group: 'negative',
      kind: 'image',
      expect: 'reject',
      note: 'WebP is not in the accepted list',
    });

    // ---------- videos ----------
    lessonMp4 = await video(page, { w: 1280, h: 720, seconds: 10, mimeType: MP4, bitrate: 2_500_000, audio: true });
    save(POS, 'lesson-clip-720p-10s.mp4', lessonMp4, {
      group: 'positive',
      kind: 'video',
      expect: 'accept',
      note: '1280x720, 10 s, with sound',
    });
    save(
      POS,
      'very-short-1s.mp4',
      await video(page, { w: 640, h: 360, seconds: 1, mimeType: MP4, bitrate: 1_000_000, audio: true }),
      {
        group: 'positive',
        kind: 'video',
        expect: 'accept',
        note: '1-second clip',
      }
    );
    save(
      POS,
      'portrait-720x1280.mp4',
      await video(page, { w: 720, h: 1280, seconds: 5, mimeType: MP4, bitrate: 2_000_000, audio: true }),
      {
        group: 'positive',
        kind: 'video',
        expect: 'accept',
        note: 'Portrait phone video',
      }
    );
    save(
      POS,
      'silent-no-audio.mp4',
      await video(page, { w: 1280, h: 720, seconds: 5, mimeType: MP4_SILENT, bitrate: 2_000_000 }),
      {
        group: 'positive',
        kind: 'video',
        expect: 'accept',
        note: 'Video with no audio track',
      }
    );
    save(
      POS,
      'near-limit-9.6MB.mp4',
      await videoOfSize(
        page,
        { w: 1280, h: 720, seconds: 10, mimeType: MP4, bitrate: 7_500_000, noise: true, audio: true },
        9.3 * MB,
        9.9 * MB
      ),
      { group: 'positive', kind: 'video', expect: 'accept', note: 'Just under the 10 MB limit' }
    );
    save(
      NEG,
      'over-limit-11MB.mp4',
      await videoOfSize(
        page,
        { w: 1280, h: 720, seconds: 12, mimeType: MP4, bitrate: 8_000_000, noise: true, audio: true },
        10.6 * MB,
        11.8 * MB
      ),
      { group: 'negative', kind: 'video', expect: 'reject', note: 'Over the 10 MB limit' }
    );
    save(
      NEG,
      'lesson-clip.webm',
      await video(page, { w: 1280, h: 720, seconds: 5, mimeType: WEBM, bitrate: 2_000_000, audio: true }),
      {
        group: 'negative',
        kind: 'video',
        expect: 'reject',
        note: 'WebM is not in the accepted list (only .mp4)',
      }
    );

    // ---------- audio ----------
    const aud = await page.evaluate(() => window.makeAudio({ seconds: 3, mimeType: 'audio/webm;codecs=opus' }));
    save(NEG, 'voice-note.weba', b64(aud.b64), {
      group: 'negative',
      kind: 'audio',
      expect: 'reject',
      note: 'Audio file: not an accepted type',
    });

    // ---------- PDFs ----------
    const pdf = async (html) => {
      const p = await browser.newPage();
      await p.setContent(html);
      const buf = await p.pdf({ format: 'A4' });
      await p.close();
      return buf;
    };
    save(POS, 'worksheet-3-pages.pdf', await pdf(pdfHtml(3)), {
      group: 'positive',
      kind: 'pdf',
      expect: 'accept',
      note: '3-page worksheet',
    });
    save(POS, 'textbook-chapter-80-pages.pdf', await pdf(pdfHtml(80)), {
      group: 'positive',
      kind: 'pdf',
      expect: 'accept',
      note: '80 pages',
    });
    save(POS, 'worksheet.PDF', await pdf(pdfHtml(1)), {
      group: 'positive',
      kind: 'pdf',
      expect: 'accept',
      note: 'Upper-case .PDF extension',
    });
    save(POS, 'Lesson #1 (final) & notes.pdf', await pdf(pdfHtml(1)), {
      group: 'positive',
      kind: 'pdf',
      expect: 'accept',
      note: 'Spaces and # ( ) & in the file name',
    });
    save(POS, 'पाठ योजना - विद्युत आवेश.pdf', await pdf(pdfHtml(1)), {
      group: 'positive',
      kind: 'pdf',
      expect: 'accept',
      note: 'Hindi file name',
    });
    // A different "scan" per page: Chrome stores a repeated image only once, which would keep the PDF small.
    let bigHtml = pdfHtml(10, { withImages: true });
    for (let i = 0; i < 10; i++) {
      const scan = await page.evaluate(() =>
        window.makeImage({ w: 2400, h: 1800, type: 'image/jpeg', quality: 0.95, noise: true })
      );
      bigHtml = bigHtml.replace('__IMG__', `data:image/jpeg;base64,${scan}`);
    }
    save(NEG, 'over-limit-scanned-book.pdf', await pdf(bigHtml), {
      group: 'negative',
      kind: 'pdf',
      expect: 'reject',
      note: 'Scanned-style PDF over 10 MB (checked below)',
    });
  });

  // ---------- Office ----------
  const lessonText = [
    'Lesson plan: Electric Charges and Fields',
    'Objectives: define electric charge; state Coulomb’s law; solve two numericals.',
    'Activity: rub a comb on dry hair and pick up bits of paper. Discuss why it works.',
    'Homework: NCERT exercise 1.1 to 1.5.',
  ];
  const deck = [
    ['Electric Charges', 'Like charges repel, unlike charges attract.'],
    ["Coulomb's Law", 'F = k q1 q2 / r^2'],
    ['Practice Questions', 'Solve NCERT 1.1 to 1.5'],
  ];
  save(POS, 'lesson-plan.docx', docx(lessonText), {
    group: 'positive',
    kind: 'office',
    expect: 'accept',
    note: 'Word',
  });
  save(POS, 'class-slides.pptx', pptx(deck), {
    group: 'positive',
    kind: 'office',
    expect: 'accept',
    note: 'PowerPoint, 3 slides',
  });
  save(POS, 'lesson-plan.odt', odt(lessonText), {
    group: 'positive',
    kind: 'office',
    expect: 'accept',
    note: 'OpenDocument text',
  });
  save(POS, 'class-slides.odp', odp(deck), {
    group: 'positive',
    kind: 'office',
    expect: 'accept',
    note: 'OpenDocument slides',
  });
  const names = ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Sara', 'Vihaan', 'Zoya'];
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Roll No', 'Name', 'Marks (out of 25)'],
    ...names.map((n, i) => [i + 1, n, 12 + ((i * 7) % 13)]),
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Marks');
  for (const [name, bookType, note] of [
    ['marks-sheet.xlsx', 'xlsx', 'Excel'],
    ['marks-sheet-legacy.xls', 'biff8', 'Excel 97-2003 (.xls)'],
    ['marks-sheet.ods', 'ods', 'OpenDocument spreadsheet'],
  ]) {
    save(POS, name, XLSX.write(wb, { type: 'buffer', bookType }), {
      group: 'positive',
      kind: 'office',
      expect: 'accept',
      note,
    });
  }

  // ---------- text ----------
  save(POS, 'notes-plain.txt', Buffer.from(lessonText.join('\r\n')), {
    group: 'positive',
    kind: 'text',
    expect: 'accept',
    note: 'Plain text',
  });
  save(
    POS,
    'notes-unicode-hindi-emoji.txt',
    Buffer.from('विद्युत आवेश और क्षेत्र ⚡\r\nCoulomb’s law — F ∝ q₁q₂/r² 🔬📚\r\n'),
    {
      group: 'positive',
      kind: 'text',
      expect: 'accept',
      note: 'UTF-8 with Hindi, symbols and emoji',
    }
  );

  // ---------- negative: broken, wrong, empty, unsupported ----------
  const png = fs.readFileSync(path.join(POS, 'diagram-1920x1080.png'));
  const pdf1 = fs.readFileSync(path.join(POS, 'worksheet.PDF'));
  const neg = (name, buf, note, kind = 'broken') =>
    save(NEG, name, buf, { group: 'negative', kind, expect: 'reject', note });
  neg('empty-0-bytes.pdf', Buffer.alloc(0), 'Zero-byte PDF');
  neg('empty-0-bytes.png', Buffer.alloc(0), 'Zero-byte image');
  neg('empty-0-bytes.mp4', Buffer.alloc(0), 'Zero-byte video');
  neg('corrupt-random-bytes.png', require('crypto').randomBytes(200 * 1024), 'Random bytes with a .png name');
  neg(
    'corrupt-truncated.mp4',
    lessonMp4.subarray(0, Math.round(lessonMp4.length * 0.2)),
    'Real MP4 cut off at 20% (interrupted copy)'
  );
  neg('corrupt-header-only.pdf', pdf1.subarray(0, 400), 'PDF with only its first 400 bytes');
  neg('corrupt-not-a-zip.docx', Buffer.from('This is not really a Word document'), '.docx that is not a zip');
  neg('image-renamed.mp4', png, 'A PNG renamed to .mp4 (content does not match the extension)');
  neg('video-renamed.png', lessonMp4, 'An MP4 renamed to .png');
  neg(
    'program-renamed.pdf',
    Buffer.concat([Buffer.from('MZ'), Buffer.alloc(4096, 0x90)]),
    'A Windows program (MZ header) renamed to .pdf'
  );
  neg('worksheet.pdf.exe', pdf1, 'Double extension ending in .exe', 'unsupported');
  neg('worksheet-no-extension', pdf1, 'A real PDF with no extension', 'unsupported');
  neg('setup.exe', Buffer.concat([Buffer.from('MZ'), Buffer.alloc(2048, 0x90)]), 'Program file', 'unsupported');
  neg(
    'bundle.zip',
    require('./lib/mini-zip').makeZip([{ name: 'a.txt', data: 'zip content' }]),
    'Zip archive',
    'unsupported'
  );
  neg(
    'drawing.svg',
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="80" fill="teal"/></svg>'
    ),
    'SVG image: not in the accepted list',
    'unsupported'
  );
  const bmpW = 64,
    bmpH = 64,
    row = bmpW * 3,
    bmp = Buffer.alloc(54 + row * bmpH);
  bmp.write('BM', 0);
  bmp.writeUInt32LE(bmp.length, 2);
  bmp.writeUInt32LE(54, 10);
  bmp.writeUInt32LE(40, 14);
  bmp.writeInt32LE(bmpW, 18);
  bmp.writeInt32LE(bmpH, 22);
  bmp.writeUInt16LE(1, 26);
  bmp.writeUInt16LE(24, 28);
  bmp.fill(0x80, 54);
  neg('bitmap.bmp', bmp, 'BMP image: not in the accepted list', 'unsupported');
  const wavSec = 2,
    rate = 8000,
    wav = Buffer.alloc(44 + wavSec * rate);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate, 28);
  wav.writeUInt16LE(1, 32);
  wav.writeUInt16LE(8, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(wavSec * rate, 40);
  for (let i = 0; i < wavSec * rate; i++) wav[44 + i] = 128 + Math.round(60 * Math.sin((i / rate) * 2 * Math.PI * 440));
  neg('tone.wav', wav, 'WAV audio: not an accepted type', 'unsupported');
  neg(
    'rtf-renamed.doc',
    Buffer.from('{\\rtf1\\ansi Lesson plan saved as RTF but named .doc}'),
    'RTF content with a .doc name (common in schools)',
    'wrong-content'
  );
  neg(
    `${'Very long lesson file name '.repeat(9).trim().replace(/ /g, '-')}.pdf`,
    pdf1,
    'File name of about 250 characters',
    'name'
  );

  // Size rules must hold for the limit cases.
  for (const m of manifest) {
    if (/over-limit/.test(m.file) && m.bytes <= 10 * MB) throw new Error(`${m.file} is not over 10 MB (${m.bytes})`);
    if (m.expect === 'accept' && m.bytes > 10 * MB)
      throw new Error(`${m.file} is over 10 MB but expected to be accepted`);
  }
  fs.writeFileSync(path.join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n${manifest.length} files; manifest at test-data/manifest.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
