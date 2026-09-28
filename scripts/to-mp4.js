// Converts .webm evidence clips to .mp4 (H.264), which plays everywhere (phones, Apple devices, chat previews); the
// bundled ffmpeg can only write WebM. Uses the installed Google Chrome: it plays the clip and records it again as MP4.
// Runs in real time divided by `speed` (speed 2 = a 2x-fast copy recorded in half the time).
//   node scripts/to-mp4.js <clip.webm> [speed]
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

(async () => {
  const input = path.resolve(process.argv[2]);
  const speed = Number(process.argv[3] || 1);
  const startAt = Number(process.argv[4] || 0); // seconds to skip (the idle start of a clip)
  const bitrate = Number(process.argv[5] || 1200000); // lower it to keep long clips under the 30 MB chat limit
  const output = input.replace(/\.webm$/i, speed === 1 ? '.mp4' : `-${speed}x.mp4`);
  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'],
  });
  try {
    const page = await browser.newPage();
    const html = path.join(path.dirname(input), '__to-mp4.html');
    fs.writeFileSync(html, '<html><body style="margin:0;background:#000"></body></html>');
    await page.goto('file:///' + html.replace(/\\/g, '/'));
    const b64 = await page.evaluate(
      async ({ src, speed, startAt, bitrate }) => {
        const v = document.createElement('video');
        v.src = src;
        v.muted = true;
        document.body.appendChild(v);
        await new Promise((r, j) => {
          v.onloadedmetadata = r;
          v.onerror = () => j(new Error('cannot load video'));
        });
        v.currentTime = startAt;
        await new Promise((r) => (v.onseeked = r));
        v.playbackRate = speed;
        // Video track only: a (silent) audio track makes some players show a blank video.
        const stream = new MediaStream(v.captureStream().getVideoTracks());
        const rec = new MediaRecorder(stream, { mimeType: 'video/mp4', videoBitsPerSecond: bitrate });
        const chunks = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.start(1000);
        await v.play();
        await new Promise((r) => (v.onended = r));
        await new Promise((r) => {
          rec.onstop = r;
          rec.stop();
        });
        const blob = new Blob(chunks, { type: 'video/mp4' });
        return new Promise((r) => {
          const fr = new FileReader();
          fr.onload = () => r(fr.result.split(',')[1]);
          fr.readAsDataURL(blob);
        });
      },
      { src: path.basename(input), speed, startAt, bitrate }
    );
    fs.writeFileSync(output, Buffer.from(b64, 'base64'));
    fs.unlinkSync(html);
    console.log(output, (fs.statSync(output).size / 1048576).toFixed(1), 'MB');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
