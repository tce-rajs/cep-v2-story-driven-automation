// The test object every spec from Module 03 onward imports.
//
// Builds on fixtures/electron-app.js (which supplies `page`) and adds:
//   app       -- an `App` (pages/app.js): every page object behind one handle, signed OUT.
//   user      -- the same `App`, already signed in with the primary QA account's PIN.
//   classMap  -- option (default none). `test.use({ classMap: 'quiz' })` makes `user` also sign in with the account
//                that key was confirmed on and land on that key's class/chapter/topic from config/moduleClassMap.js,
//                with the Playlist strip expanded.
//   freshSpace -- option (default false). `test.use({ freshSpace: true })` makes `user` start every test on empty
//                board space below the teacher's existing writing, with that writing left in place but ignored by
//                counts and "last path" lookups (WhiteboardContent.startOnFreshSpace). Nothing is ever erased: owner
//                rule 2026-09-29 (this replaced the old `cleanBoard`, which pressed Clear whiteboard).
//
// Signing in is a fixture, not a beforeEach in each spec, so a story that needs a signed-in user just asks for
// `user` and one that needs Guest Mode asks for `app`.

const { test: base, expect } = require('./electron-app');
const { App } = require('../pages/app');
const { pinForModule } = require('../config/moduleClassMap');

const test = base.extend({
  classMap: [null, { option: true }],
  freshSpace: [false, { option: true }],

  app: async ({ page }, use) => {
    await use(new App(page));
  },

  user: async ({ app, classMap, freshSpace }, use) => {
    await app.signIn(classMap ? pinForModule(classMap) : process.env.VALID_PIN);
    if (classMap) {
      await app.nav.applyClassMap(classMap);
      await app.playlist.ensureDrawerVisible();
    }
    // Never erases (owner rule 2026-09-29): moves to empty space below the teacher's writing and ignores it in counts.
    if (freshSpace) await app.content.startOnFreshSpace();
    await use(app);
  },
});

module.exports = { test, expect };
