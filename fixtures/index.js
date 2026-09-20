// The test object every spec from Module 03 onward imports.
//
// Builds on fixtures/electron-app.js (which supplies `page`) and adds:
//   app       -- an `App` (pages/app.js): every page object behind one handle, signed OUT.
//   user      -- the same `App`, already signed in with the primary QA account's PIN.
//   classMap  -- option (default none). `test.use({ classMap: 'quiz' })` makes `user` also sign in with the account
//                that key was confirmed on and land on that key's class/chapter/topic from config/moduleClassMap.js,
//                with the Playlist strip expanded.
//   cleanBoard -- option (default false). `test.use({ cleanBoard: true })` makes `user` start every test on an empty
//                whiteboard (Eraser -> Clear whiteboard), for specs that count objects or look at "the last path".
//
// Signing in is a fixture, not a beforeEach in each spec, so a story that needs a signed-in user just asks for
// `user` and one that needs Guest Mode asks for `app`.

const { test: base, expect } = require('./electron-app');
const { App } = require('../pages/app');
const { pinForModule } = require('../config/moduleClassMap');

const test = base.extend({
  classMap: [null, { option: true }],
  cleanBoard: [false, { option: true }],

  app: async ({ page }, use) => {
    await use(new App(page));
  },

  user: async ({ app, classMap, cleanBoard }, use) => {
    await app.signIn(classMap ? pinForModule(classMap) : process.env.VALID_PIN);
    if (classMap) {
      await app.nav.applyClassMap(classMap);
      await app.playlist.ensureDrawerVisible();
    }
    if (cleanBoard) await app.toolbar.clearBoard(app.whiteboard);
    await use(app);
  },
});

module.exports = { test, expect };
