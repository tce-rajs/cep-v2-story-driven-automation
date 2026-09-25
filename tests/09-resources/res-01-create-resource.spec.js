// RES-01 — Create Resource
// Source: CEPV2_Stories/09_Resources.md
// The Create form (<app-add-custom-asset>) has no data-qa-ids; it is addressed by formcontrolname (see the page object).
// Every test that creates an asset removes it again, so the shared QA Playlist is left as found.

const { test, expect } = require('../../fixtures');

const unique = () => `AutoTest-${Date.now()}`;

/** Upload `file` through Create with a valid title and report what the server answered.
 * With `bypassClientCheck`, a Submit button the form itself disabled (its own client-side validation) is force-enabled
 * first, so the SERVER's own validation is what gets exercised. */
const submitAndObserve = async (user, file, { bypassClientCheck = false } = {}) => {
  const responses = [];
  user.page.on('response', (res) => {
    if (res.request().method() === 'POST' && /asset|resource|upload|file/i.test(res.url())) {
      responses.push({ url: res.url(), status: res.status() });
    }
  });
  const title = unique();
  const before = await user.playlist.resourceCards.count();
  const { addResource } = user;

  await addResource.openAction('create');
  await addResource.createForm.waitFor({ state: 'visible', timeout: 10000 });
  await addResource.titleInput.fill(title);
  await addResource.fileInput.setInputFiles(file);
  await user.page.waitForTimeout(500);
  const clientBlocked = await addResource.submitBtn.isDisabled();
  if (clientBlocked && bypassClientCheck) {
    await addResource.submitBtn.evaluate((el) => el.removeAttribute('disabled'));
  }
  if (!clientBlocked || bypassClientCheck) await addResource.submitBtn.click({ force: true });

  await user.page.waitForTimeout(4000);
  return { title, responses, before, clientBlocked, after: await user.playlist.resourceCards.count() };
};

/** Remove whatever card a rejected upload wrongly left behind, so the shared Playlist stays as found. */
const removeIfCreated = async (user, title) => {
  const leftover = user.playlist.resourceCards.filter({ hasText: title });
  if ((await leftover.count()) > 0) await user.playlist.removeOwnedAsset(leftover);
};

test.describe('RES-01 Create Resource', () => {
  test.use({ classMap: 'playersDefault' });

  test(
    'RES-01-01: creating a new custom resource and saving it makes it available to add to a lesson',
    { tag: ['@smoke', '@functional'] },
    async ({ user }) => {
      const title = unique();
      const before = await user.playlist.resourceCards.count();

      await user.addResource.createTextAsset(title);
      const added = user.playlist.resourceCards.filter({ hasText: title });
      await expect(added, 'the new resource is in the lesson’s Playlist').toBeVisible({ timeout: 15000 });
      await expect(user.playlist.resourceCards).toHaveCount(before + 1);

      await user.playlist.removeOwnedAsset(added);
    }
  );

  test(
    'RES-01-02: attempting to save with required fields empty is blocked with a message',
    { tag: ['@negative'] },
    async ({ user }) => {
      const ar = user.addResource;
      const before = await user.playlist.resourceCards.count();
      await ar.openAction('create');
      await ar.createForm.waitFor({ state: 'visible', timeout: 10000 });

      // Touch the Title and leave it too short, then try to submit with no file either.
      await ar.titleInput.fill('ab');
      await expect(ar.titleErrorText, 'the Title rule is explained').toBeVisible();
      await ar.submitBtn.click({ force: true }).catch(() => {});
      await user.page.waitForTimeout(1500);

      await expect(ar.createForm, 'the form did not accept the empty submission').toBeVisible();
      await expect(user.playlist.resourceCards, 'nothing was created').toHaveCount(before);
    }
  );

  test(
    'RES-01-03: a created custom resource is only available for the grades/subjects it was assigned to',
    { tag: ['@functional'] },
    async ({ user }) => {
      const title = unique();
      await user.addResource.createTextAsset(title);
      const added = user.playlist.resourceCards.filter({ hasText: title });
      await expect(added).toBeVisible({ timeout: 15000 });

      // Assigned to Class 12A Computer Science, so it must NOT show up in another class...
      await user.nav.resetToClass('Class 9', 'A', 'Hindi Language');
      await user.playlist.ensureDrawerVisible();
      await expect(user.playlist.resourceCards.filter({ hasText: title })).toHaveCount(0);

      // ...and is back where it belongs.
      await user.nav.applyClassMap('playersDefault');
      await user.playlist.ensureDrawerVisible();
      await expect(user.playlist.resourceCards.filter({ hasText: title })).toBeVisible();
      await user.playlist.removeOwnedAsset(user.playlist.resourceCards.filter({ hasText: title }));
    }
  );

  test(
    'RES-01-04: a zero-byte file upload is rejected server-side, not just client-side',
    { tag: ['@negative', '@bug'] },
    async ({ user }) => {
      // PRODUCT FINDING, CONFIRMED LIVE (v 0.0.223): a zero-byte file is accepted -- the form submits and a new
      // (empty) resource card appears in the Playlist (count before -> before + 1). The sibling automation project
      // recorded the same defect. Tracked as expected-to-fail so it isn't masked.
      test.fail(true, 'A zero-byte file upload is accepted and creates an empty resource');
      const { title, responses, before, after } = await submitAndObserve(user, {
        name: 'empty.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(0),
      });
      test.info().annotations.push({ type: 'note', description: `Upload responses: ${JSON.stringify(responses)}` });
      await removeIfCreated(user, title);

      expect(after, 'no resource was created from a zero-byte file').toBe(before);
      expect(
        responses.some((r) => r.status >= 400),
        'the upload reached the server and the SERVER refused it (a client-only check would send no request)'
      ).toBe(true);
    }
  );

  test('RES-01-05: a file over the 10MB limit is rejected, not accepted', { tag: ['@negative'] }, async ({ user }) => {
    // CONFIRMED LIVE (v 0.0.223): the form's own validation disables Submit for an oversized file, and even with
    // that button forced enabled the form sends NO request at all (it will not submit an invalid form). So the
    // client-side rejection is what can be verified here. The story's other half -- that the SERVER also refuses
    // an oversized file -- cannot be reached through the UI and needs an API-level upload test; it is recorded as
    // a gap in the test's notes, not silently claimed.
    const { title, responses, before, clientBlocked, after } = await submitAndObserve(
      user,
      { name: 'oversized.txt', mimeType: 'text/plain', buffer: Buffer.alloc(10 * 1024 * 1024 + 1024, 'a') },
      { bypassClientCheck: true }
    );
    test.info().annotations.push({
      type: 'note',
      description: `GAP: server-side limit not exercised (needs an API-level test). Submit disabled by the form: ${clientBlocked}; upload requests sent: ${responses.length}`,
    });
    await removeIfCreated(user, title);

    expect(clientBlocked, 'the form itself refuses the oversized file (Submit is disabled)').toBe(true);
    expect(responses, 'nothing was sent to the server, even with Submit forced on').toEqual([]);
    expect(after, 'no resource was created from an oversized file').toBe(before);
  });

  // The main QA account's default topic (Class 12A Physics 1.1) already holds hundreds of Playlist cards left by other
  // automation, so it is the "account with 200+ accumulated resources" this case needs: nothing is bulk-created here, one
  // asset is added to that list and removed again.
  test.describe('a topic with 200+ accumulated resources', () => {
    test.use({ classMap: 'default' });

    test(
      'RES-01-06: uploading to an account with 200+ accumulated resources does not degrade the resource list',
      { tag: ['@performance'] },
      async ({ user }) => {
        test.setTimeout(3 * 60 * 1000);
        const { playlist } = user;
        await playlist.ensureDrawerVisible();

        // The strip renders progressively (hundreds of cards), so wait until the count has stopped changing.
        const settledCount = async () => {
          let last = -1;
          for (let i = 0; i < 25; i++) {
            const now = await playlist.resourceCards.count();
            if (now > 0 && now === last) return now;
            last = now;
            await user.page.waitForTimeout(700);
          }
          return last;
        };
        const before = await settledCount();
        test.skip(before < 200, `this topic holds only ${before} cards; the case needs 200 or more`);
        const firstTitles = (await playlist.cardTitles()).slice(0, 5);

        const title = unique();
        const started = Date.now();
        await user.addResource.createTextAsset(title);
        const added = playlist.resourceCards.filter({ hasText: title });
        try {
          await expect(added, 'the new card shows up in the long list').toBeVisible({ timeout: 30000 });
          const appearedMs = Date.now() - started;
          test.info().annotations.push({
            type: 'note',
            description: `${before} cards before; the new card appeared after ${appearedMs}ms`,
          });
          expect(appearedMs, 'the upload is not slowed down by the size of the list').toBeLessThan(30000);

          const after = await settledCount();
          expect(after, 'exactly one card was added — none lost or duplicated').toBe(before + 1);
          const stillThere = await playlist.cardTitles();
          for (const t of firstTitles) expect(stillThere, `"${t}" is still in the list`).toContain(t);
        } finally {
          await playlist.ensureDrawerVisible().catch(() => {});
          await removeIfCreated(user, title);
        }
        expect(await settledCount(), 'the list is back to how it was').toBe(before);
      }
    );
  });

  test(
    'RES-01-07: a resource added via Add Resource appears correctly in the Playlist',
    { tag: ['@functional'] },
    async ({ user }) => {
      const title = unique();
      await user.addResource.createImageAsset(title);
      const added = user.playlist.resourceCards.filter({ hasText: title });

      await expect(added, 'the card appears without a refresh').toBeVisible({ timeout: 15000 });
      await expect(added.locator('img.type-icon'), 'it carries its type icon').toBeVisible();
      await user.playlist.removeOwnedAsset(added);
    }
  );

  test(
    'RES-01-08: opening the added asset from the Playlist loads it correctly',
    { tag: ['@functional'] },
    async ({ user }) => {
      const title = unique();
      await user.addResource.createImageAsset(title);
      const added = user.playlist.resourceCards.filter({ hasText: title });
      await expect(added).toBeVisible({ timeout: 15000 });

      await user.player.openResourceCard(added);
      expect(await user.player.isPlayerOpen(), 'the added asset opened').toBe(true);
      const rendered = user.player.imageWrapper.or(user.player.imageGalleryImg).first();
      await expect(rendered, 'and it rendered').toBeVisible({ timeout: 15000 });
      // isPlayerOpen()/toBeVisible() only prove the close icon and the wrapper exist — not that the player actually
      // occupies a real amount of screen, not a broken sliver. CONFIRMED LIVE: this uses createImageAsset's small
      // test PNG (same as PLR-06-02, not a full curriculum image), which the OR can resolve to the bare <img>
      // (imageGalleryImg) rather than the full ~980x620 wrapper — matching PLR-06-02's own confirmed-live threshold
      // (>50) for this exact path, not the larger wrapper's threshold.
      await expect
        .poll(async () => (await rendered.boundingBox())?.width || 0, {
          message: 'the image player finishes rendering to a real size',
          timeout: 10000,
        })
        .toBeGreaterThan(50);
      const box = await rendered.boundingBox();
      expect(box.height, 'the image player renders at a real size, not collapsed').toBeGreaterThan(50);

      await user.player.closePlayer();
      // CONFIRMED LIVE: closing the player leaves the Playlist drawer lowered (the card sits ~20px lower, under the
      // whiteboard's drawing surface, which swallows a hover) -- bring the drawer back before touching the card.
      await user.playlist.ensureDrawerVisible();
      await user.playlist.removeOwnedAsset(added);
    }
  );
});
