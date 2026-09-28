// Makes one PNG of 6 frames taken evenly through a clip (3 x 2 grid, each frame labelled with its time), so the whole
// clip can be seen at a glance even where a video will not play.
//   node scripts/frame-strip.js <clip.webm|mp4> [startSeconds]
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

(async () => {
  const input = path.resolve(process.argv[2]);
  const start = Number(process.argv[3] || 0);
  const output = input.replace(/\.(webm|mp4)$/i, '-frames.png');
  const browser = await chromium.launch({ channel: 'chrome', args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage();
    const html = path.join(path.dirname(input), '__strip.html');
    fs.writeFileSync(html, '<html><body style="margin:0"></body></html>');
    await page.goto('file:///' + html.replace(/\\/g, '/'));
    const b64 = await page.evaluate(
      async ({ src, start }) => {
        const v = document.createElement('video');
        v.src = src;
        v.muted = true;
        await new Promise((r) => (v.onloadeddata = r));
        const W = 640;
        const H = Math.round((W * v.videoHeight) / v.videoWidth);
        const c = document.createElement('canvas');
        c.width = W * 3;
        c.height = H * 2;
        const ctx = c.getContext('2d');
        const span = v.duration - start - 0.5;
        for (let i = 0; i < 6; i++) {
          const t = start + (span * (i + 0.5)) / 6;
          v.currentTime = t;
          await new Promise((r) => (v.onseeked = r));
          const x = (i % 3) * W;
          const y = Math.floor(i / 3) * H;
          ctx.drawImage(v, x, y, W, H);
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(x, y + H - 34, 120, 34);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 22px sans-serif';
          const s = Math.round(t);
          ctx.fillText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, x + 12, y + H - 10);
          ctx.strokeStyle = '#888';
          ctx.strokeRect(x, y, W, H);
        }
        return c.toDataURL('image/png').split(',')[1];
      },
      { src: path.basename(input), start }
    );
    fs.writeFileSync(output, Buffer.from(b64, 'base64'));
    fs.unlinkSync(html);
    console.log(output);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
