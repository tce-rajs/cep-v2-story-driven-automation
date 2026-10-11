// Temporary exploration probe (agent): runs the steps in PROBE_SCRIPT. Deleted after use.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../../fixtures');
const helpers = require('../../tests/10-plan-mode/plan-helpers');
const OUT = process.env.PROBE_OUT;
test.describe.configure({ timeout: 900000 });
const dump = async (page, name) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  const info = await page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const sel = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 4).join('.') : '');
    const out = [];
    for (const e of document.querySelectorAll('button, input, select, textarea, [role=button], [role=menuitem], [role=option], [contenteditable=true], .monaco-editor, iframe, mat-icon, i, .dropdown-item, li')) {
      if (!vis(e)) continue;
      const r = e.getBoundingClientRect();
      out.push(`${sel(e)} @${Math.round(r.x)},${Math.round(r.y)} type=${e.type || ''} ph=${e.placeholder || ''} title=${e.title || ''} dis=${e.disabled || ''} val=${(e.value || '').slice(0, 40)} txt=${(e.innerText || '').replace(/\s+/g, ' ').slice(0, 70)}${e.tagName === 'SELECT' ? ' opts=' + [...e.options].map((o) => o.text).slice(0, 15).join('|') : ''}`);
    }
    return { url: location.href, text: document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 6000), controls: out };
  });
  fs.writeFileSync(path.join(OUT, `${name}.txt`), `${info.url}\n--- TEXT\n${info.text}\n--- CONTROLS\n${info.controls.join('\n')}`);
};
test('explore', async ({ app, page, browser }) => {
  const log = (...a) => fs.appendFileSync(path.join(OUT, 'log.txt'), a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ') + '\n');
  page.on('response', (r) => { const m = r.request().method(); if (m !== 'GET' && !/\.(js|css|png)/.test(r.url())) log('NET', m, r.status(), r.url(), (r.request().postData() || '').slice(0, 300)); });
  delete require.cache[require.resolve(process.env.PROBE_SCRIPT)];
  await require(process.env.PROBE_SCRIPT)({ app, page, browser, dump, log, helpers, expect, OUT });
});
