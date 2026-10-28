// FLOW-10 — Sending a file from a phone with DropIt
// Source: CEPV2_Stories/00_EndToEndFlows.md
// The "phone" is a separate browser (own process and storage, phone-sized) opening the link the DropIt QR code holds,
// as a phone's camera app would (see pages/dropit-companion.page.js; no hardware needed). Data: the default class
// (Class 9A Science 4.1). Every file sent is removed from the Playlist again.

const fs = require('fs');
const { chromium } = require('@playwright/test');
const { test, expect } = require('../../fixtures');
const { DropitCompanionPage } = require('../../pages/dropit-companion.page');
const { uniqueCopy, switchTeacher } = require('./flow-helpers');

/** Open DropIt and pair the "phone"; returns { phone, close }. */
const pairPhone = async (user) => {
  await user.addResource.openAction('dropit');
  await expect(user.addResource.dropitQrCanvas, 'set-up: the DropIt QR code').toBeVisible({ timeout: 15000 });
  const url = await user.addResource.decodeDropitQrUrl();
  expect(url, 'set-up: the QR code holds a pairing link').toBeTruthy();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: DropitCompanionPage.viewport });
    const phone = new DropitCompanionPage(await context.newPage());
    const phoneErrors = [];
    phone.page.on('pageerror', (error) => phoneErrors.push(`pageerror: ${error.message}`));
    phone.page.on('requestfailed', (request) => {
      phoneErrors.push(
        `requestfailed: ${new URL(request.url()).origin} ${request.failure()?.errorText || 'unknown error'}`
      );
    });
    phone.page.on('console', (message) => {
      if (message.type() === 'error')
        phoneErrors.push(`console: ${message.text().replace(/https?:\/\/\S+/g, '[url]')}`);
    });
    await phone.open(url);
    try {
      await expect(user.addResource.dropitConnectionStatus, 'set-up: the phone is connected').toHaveText(/connected/i, {
        timeout: 15000,
      });
    } catch (error) {
      const details = await phone.page.evaluate(() => ({
        origin: location.origin,
        title: document.title,
        readyState: document.readyState,
        text: document.body?.innerText || '',
        canvasCount: document.querySelectorAll('canvas').length,
        bodyChildren: [...document.body.children].map((element) => element.tagName.toLowerCase()),
      }));
      console.error(`DropIt phone page did not pair: ${JSON.stringify({ ...details, errors: phoneErrors })}`);
      await test.info().attach('phone page details', {
        body: JSON.stringify(details, null, 2),
        contentType: 'application/json',
      });
      await test.info().attach('phone page after pairing attempt', {
        body: await phone.page.screenshot(),
        contentType: 'image/png',
      });
      throw error;
    }
    return { phone, close: () => browser.close().catch(() => {}) };
  } catch (error) {
    await browser.close();
    throw error;
  }
};
/** Send `file` from the phone; returns the Playlist's card count before it arrived. */
const sendFromPhone = async (user, phone, file) => {
  const before = await user.playlist.resourceCards.count();
  await phone.uploadFile(file);
  await user.player.isPlayerOpen(20000); // a received file opens by itself
  return before;
};
/** Clean-up: remove the card the phone created -- the one titled with the file's name `stem`, or else the newest own
 * asset when the Playlist grew by one under another title. */
const removeCards = async (user, stem, before = null) => {
  await user.player.closePlayer().catch(() => {});
  await user.addResource.dropitCloseBtn.click({ force: true, timeout: 2000 }).catch(() => {});
  await user.playlist.ensureDrawerVisible().catch(() => {});
  const named = user.playlist.resourceCards.filter({ hasText: stem });
  if (await named.count().catch(() => 0)) {
    await user.playlist.removeOwnedAsset(named.first()).catch(() => {});
    return;
  }
  if (before !== null && (await user.playlist.resourceCards.count()) === before + 1)
    await user.playlist
      .removeOwnedAsset(user.page.locator('[data-qa-id="playlist-asset-card"]').last())
      .catch(() => {});
};
const stemOf = (file) =>
  require('path')
    .basename(file)
    .replace(/\.[^.]+$/, '');
/** The phone page's own words, from Flutter's accessibility tree (switched on through its hidden placeholder). */
const phoneText = async (phone) =>
  phone.page.evaluate(() => {
    document.querySelector('flt-semantics-placeholder')?.click();
    return [...document.querySelectorAll('flt-semantics, [aria-label]')]
      .map((e) => e.getAttribute('aria-label') || e.textContent || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  });

test.describe('FLOW-10 Sending a file from a phone with DropIt', () => {
  test.use({ classMap: 'default' });
  test.describe.configure({ timeout: 180000 });

  test(
    'FLOW-10-01: DropIt opens with the code or link to connect a phone',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      await user.addResource.openAction('dropit');
      try {
        await expect(user.addResource.dropitQrCanvas, 'a QR code').toBeVisible({ timeout: 15000 });
        expect(await user.addResource.decodeDropitQrUrl(), 'that holds a link a phone can open').toMatch(
          /^https?:\/\//
        );
        await expect(user.addResource.dropitConnectionStatus, 'waiting for a phone').toBeVisible();
      } finally {
        await user.addResource.dropitCloseBtn.click({ force: true }).catch(() => {});
      }
    }
  );

  test('FLOW-10-02: a photo sent from the phone appears on the panel', { tag: ['@functional'] }, async ({ user }) => {
    const file = uniqueCopy('positive/board-photo.jpeg', 'DropIt-photo');
    const { phone, close } = await pairPhone(user);
    let before = null;
    try {
      before = await sendFromPhone(user, phone, file);
      expect(await user.player.isPlayerOpen(5000), 'the photo opens on the panel').toBe(true);
      const shown = user.player.imageWrapper.or(user.player.imageGalleryImg).first();
      await expect(shown, 'the photo is shown').toBeVisible({ timeout: 15000 });
      expect((await shown.boundingBox()).width, 'at a real size').toBeGreaterThan(50);
    } finally {
      await close();
      fs.rmSync(file, { force: true });
      await removeCards(user, stemOf(file), before);
    }
  });

  test('FLOW-10-03: a PDF sent from the phone appears on the panel', { tag: ['@functional'] }, async ({ user }) => {
    const file = uniqueCopy('positive/worksheet-3-pages.pdf', 'DropIt-pdf');
    const { phone, close } = await pairPhone(user);
    let before = null;
    try {
      before = await sendFromPhone(user, phone, file);
      await user.player.closePlayer().catch(() => {});
      await user.playlist.ensureDrawerVisible();
      await expect
        .poll(() => user.playlist.resourceCards.count(), { message: 'the PDF is on the panel', timeout: 20000 })
        .toBeGreaterThan(before);
    } finally {
      await close();
      fs.rmSync(file, { force: true });
      await removeCards(user, stemOf(file), before);
    }
  });

  test(
    'FLOW-10-04: a received file can be added to the playlist and opens from there',
    { tag: ['@functional'] },
    async ({ user }) => {
      const file = uniqueCopy('positive/diagram-1920x1080.png', 'DropIt-image');
      const { phone, close } = await pairPhone(user);
      let before = null;
      try {
        const titles = await user.playlist.cardTitles();
        before = await sendFromPhone(user, phone, file);
        await user.player.closePlayer().catch(() => {});
        await user.playlist.ensureDrawerVisible();
        await expect(user.playlist.resourceCards, 'it is in the playlist').toHaveCount(before + 1, { timeout: 20000 });
        const added = (await user.playlist.cardTitles()).find((t) => !titles.includes(t));
        await user.player.openResourceCard(user.playlist.resourceCards.filter({ hasText: added }).first());
        expect(await user.player.isPlayerOpen(20000), 'it opens from the playlist').toBe(true);
      } finally {
        await close();
        fs.rmSync(file, { force: true });
        await removeCards(user, stemOf(file), before);
      }
    }
  );

  test(
    'FLOW-10-05: a file of the wrong type is refused with a message on the phone',
    { tag: ['@negative'] },
    async ({ user }) => {
      const file = uniqueCopy('positive/notes-plain.txt', 'DropIt-text');
      const { phone, close } = await pairPhone(user);
      try {
        const before = await user.playlist.resourceCards.count();
        await phone.uploadFile(file);
        await user.page.waitForTimeout(5000);
        await test
          .info()
          .attach('phone after the refused file', { body: await phone.page.screenshot(), contentType: 'image/png' });
        await expect(user.addResource.dropitUploadStatus, 'no upload recorded on the panel').not.toHaveText(
          /success|complete|uploaded/i
        );
        await expect(user.playlist.resourceCards, 'nothing added').toHaveCount(before);
        const words = await phoneText(phone);
        expect(words, 'the phone says the file is refused').toMatch(
          /not (supported|allowed)|invalid|only .*(png|jpg|pdf)|allowed/i
        );
      } finally {
        await close();
        fs.rmSync(file, { force: true });
        await removeCards(user, stemOf(file));
      }
    }
  );

  test(
    "FLOW-10-06: a file sent to one teacher's panel does not appear for another teacher",
    { tag: ['@negative'] },
    async ({ user }) => {
      test.skip(!process.env.VALID_PIN_2, 'needs a second teacher account: set VALID_PIN_2 in .env');
      const file = uniqueCopy('positive/diagram-1920x1080.png', 'DropIt-mine');
      const stem = stemOf(file);
      const { phone, close } = await pairPhone(user);
      let before = null;
      try {
        const titles = await user.playlist.cardTitles();
        before = await sendFromPhone(user, phone, file);
        await user.player.closePlayer().catch(() => {});
        await user.playlist.ensureDrawerVisible();
        await expect(user.playlist.resourceCards, 'set-up: in teacher A’s playlist').toHaveCount(before + 1, {
          timeout: 20000,
        });
        const mine = (await user.playlist.cardTitles()).find((t) => !titles.includes(t));
        await close();

        await switchTeacher(user, process.env.VALID_PIN_2, 'default');
        await user.playlist.ensureDrawerVisible();
        const titlesB = await user.playlist.cardTitles();
        expect(
          titlesB.filter((t) => t.includes(stem) || t === mine),
          'not in teacher B’s playlist'
        ).toEqual([]);
      } finally {
        await close();
        fs.rmSync(file, { force: true });
        await switchTeacher(user, process.env.VALID_PIN, 'default').catch(() => {});
        await removeCards(user, stem, before);
      }
    }
  );
});
