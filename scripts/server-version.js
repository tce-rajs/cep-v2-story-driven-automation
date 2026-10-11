// Prints the Teach app build on the server (e.g. 0.0.236), read from its main script.
const BASE = (process.env.BASE_URL || 'http://172.18.2.85/teach/').replace(/\/?$/, '/');

(async () => {
  const html = await (await fetch(BASE)).text();
  const main = (html.match(/src="(main[^"]+\.js)"/) || [])[1];
  if (!main) throw new Error('main script not found');
  const js = await (await fetch(BASE + main)).text();
  const versions = [...js.matchAll(/["'](0\.0\.\d+)["']/g)].map((m) => m[1]);
  // The version label can stay the same across deployments, so the main script's fingerprint is added.
  const label = versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0] || 'unknown';
  const fingerprint = (main.match(/main-([A-Z0-9]+)\.js/i) || [])[1];
  console.log(fingerprint ? `${label}-${fingerprint}` : label);
})().catch(() => console.log('unknown'));
