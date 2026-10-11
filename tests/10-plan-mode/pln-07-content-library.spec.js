// PLN-07 — Content Library
// Source: CEPV2_Stories/10_PlanMode.md
// Plan Mode account, Class 12 Physics. Custom chapters are added at the end of the book (so the chapter positions other
// tests use do not move), named "AutoTest chapter …", and deleted again at the end of each test. Adding a chapter,
// topic or resource is saved at once; Save keeps their order. The book shows names in title case ("AutoTest Chapter
// …"), so names are compared without regard to case.

const { test, expect } = require('../../fixtures');
const { PNG_FILE, TEXT_FILE } = require('../../pages/add-resource.page');
const { BROWSER_ONLY, openPlanMode, autoName, teachChapterNames } = require('./plan-helpers');

const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

test.describe('PLN-07 Content Library', () => {
  test.skip(!process.env.RUN_IN_BROWSER, BROWSER_ONLY);
  test.describe.configure({ timeout: 300000 });

  test.beforeEach(async ({ app }) => {
    await openPlanMode(app);
  });

  /** Back in Plan Mode's Content Library, delete a chapter a test made (if it is still there). */
  const removeChapter = async (app, name) => {
    if (!app.page.url().includes('/plan/')) {
      await app.compass.switchToPlanningMode();
      await app.page.waitForTimeout(5000);
    }
    await app.plan.openBook();
    if (await app.plan.bookRow(name).count()) await app.plan.deleteBookRow(name);
  };

  /** A new custom chapter with one topic, the topic unfolded. Returns their names. */
  const chapterWithTopic = async (app) => {
    const chapter = autoName('chapter');
    const topic = autoName('topic');
    await app.plan.openBook();
    expect((await app.plan.addChapter(chapter)).ok(), 'set-up: the chapter is created').toBe(true);
    expect((await app.plan.addTopic(chapter, topic)).ok(), 'set-up: the topic is created').toBe(true);
    await app.plan.expandChapter(chapter);
    await app.plan.expandTopic(topic);
    return { chapter, topic };
  };

  /** Two resources (an image, then a worksheet) in the unfolded topic. Returns their names. */
  const twoResources = async (app) => {
    const names = [autoName('image'), autoName('sheet')];
    expect((await app.plan.addResource(PNG_FILE, names[0], 'Images')).ok(), 'set-up: first resource').toBe(true);
    expect((await app.plan.addResource(TEXT_FILE, names[1], 'Worksheets')).ok(), 'set-up: second resource').toBe(true);
    return names;
  };

  /** The positions of two names in the topic's resource list. */
  const order = async (app, names) => {
    const listed = await app.plan.resourceNames();
    return names.map((n) => listed.findIndex((l) => same(l, n)));
  };

  test(
    'PLN-07-01: the Content Library shows the current class and subject',
    { tag: ['@functional'] },
    async ({ app, page }) => {
      await app.plan.openSection('Content Library');
      await expect(
        page
          .getByText(/Class 12\s*\|\s*Physics/)
          .filter({ visible: true })
          .first()
      ).toBeVisible();
    }
  );

  test(
    'PLN-07-02: the Content Library offers Save and Update Book (Sync)',
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.plan.openSection('Content Library');
      await expect(app.plan.saveBtn, 'Save').toBeVisible();
      await expect(app.plan.syncBookBtn, 'Update Book (Sync)').toBeVisible();
    }
  );

  test(
    'PLN-07-03: a topic with no available content shows an empty-state message, not a blank panel',
    { tag: ['@negative'] },
    async ({ app }) => {
      let made;
      try {
        made = await chapterWithTopic(app);
        await expect(app.plan.bookRow(made.topic), 'the empty topic says it has no resources').toContainText(
          /no (resources|content)|0 Resources?/i
        );
      } finally {
        if (made) await removeChapter(app, made.chapter);
      }
    }
  );

  test(
    'PLN-07-04: Book Navigation lists the chapters and topics of the class and subject in order',
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.plan.openBook();
      const chapters = await app.plan.bookChapters();
      expect(chapters.length, 'chapters are listed').toBeGreaterThan(1);
      // The book's own chapters carry their number ("Chapter 5. …"); custom chapters may sit anywhere.
      const numbers = chapters.map((c) => (c.match(/^Chapter\s+0*(\d+)\s*[.:]/i) || [])[1]).filter(Boolean);
      expect(numbers.length, 'numbered chapters are listed').toBeGreaterThan(1);
      expect(numbers.map(Number), `chapters in order (listed: ${chapters.join(' | ')})`).toEqual(
        [...numbers.map(Number)].sort((a, b) => a - b)
      );
      // The first chapter's topics are numbered 1, 2, 3 … from the top.
      await app.plan.expandChapter(chapters[0]);
      const labels = (await app.plan.bookRoot.innerText()).match(/^Topic \d+$/gim) || [];
      expect(labels.length, 'the first chapter lists its topics').toBeGreaterThan(1);
      expect(
        labels.map((l) => Number(l.replace(/\D/g, ''))),
        'topics in order'
      ).toEqual(labels.map((_, i) => i + 1));
    }
  );

  test(
    "PLN-07-05: choosing a topic in Book Navigation shows that topic's resources",
    { tag: ['@functional'] },
    async ({ app }) => {
      await app.plan.openBook();
      const [first] = await app.plan.bookChapters();
      await app.plan.expandChapter(first);
      const topicRow = app.plan.page
        .locator('li.cdk-drag')
        .filter({ hasText: /^\s*Topic 1\b/ })
        .first();
      const topicName = (await topicRow.innerText()).split(/\n/)[1].trim();
      await app.plan.expandTopic(topicName);
      const count = Number(((await topicRow.innerText()).match(/(\d+)\s+Resources?/i) || [])[1]);
      expect(count, `the topic "${topicName}" says how many resources it has`).toBeGreaterThan(0);
      await expect(app.plan.resourceRows.first(), 'its resources are shown').toBeVisible({ timeout: 10000 });
      expect(await app.plan.resourceRows.count(), 'every resource of the topic is listed').toBe(count);
    }
  );

  test('PLN-07-06: a custom chapter can be created with a name', { tag: ['@functional'] }, async ({ app }) => {
    const chapter = autoName('chapter');
    try {
      await app.plan.openBook();
      const r = await app.plan.addChapter(chapter);
      expect(r.ok(), `the server accepts the chapter (HTTP ${r.status()})`).toBe(true);
      expect(
        (await app.plan.bookChapters()).some((c) => same(c, chapter)),
        'the chapter is in the book'
      ).toBe(true);
    } finally {
      await removeChapter(app, chapter);
    }
  });

  test('PLN-07-07: a custom topic can be created inside a chapter', { tag: ['@functional'] }, async ({ app }) => {
    const chapter = autoName('chapter');
    const topic = autoName('topic');
    try {
      await app.plan.openBook();
      await app.plan.addChapter(chapter);
      const r = await app.plan.addTopic(chapter, topic);
      expect(r.ok(), `the server accepts the topic (HTTP ${r.status()})`).toBe(true);
      await app.plan.expandChapter(chapter);
      await expect(app.plan.bookRow(chapter), 'the topic is inside the chapter').toContainText(topic, {
        ignoreCase: true,
      });
    } finally {
      await removeChapter(app, chapter);
    }
  });

  test(
    'PLN-07-08: a custom chapter or topic cannot be saved with an empty name',
    { tag: ['@negative'] },
    async ({ app, page }) => {
      const posts = [];
      page.on('request', (r) => r.method() === 'POST' && /serve\/custom\/(chp|tp)/.test(r.url()) && posts.push(r));
      await app.plan.openBook();
      await app.plan.addChapterLinks.last().scrollIntoViewIfNeeded();
      await app.plan.addChapterLinks.last().click({ force: true });
      await expect(app.plan.newNameInput, 'set-up: the name form is open').toBeVisible();
      await expect(app.plan.addChapterBtn, 'no chapter without a name').toBeDisabled();
      await app.plan.newNameInput.fill('   ');
      await app.plan.addChapterBtn.click({ force: true });
      await page.waitForTimeout(2000);
      expect(posts.length, 'nothing is saved for a name of spaces').toBe(0);
    }
  );

  test(
    'PLN-07-09: a very long or Hindi chapter name is saved and shown correctly',
    { tag: ['@edge'] },
    async ({ app }) => {
      const chapter = `${autoName('अध्याय')} विद्युत आवेश तथा क्षेत्र और उनके गुणधर्म एक बहुत लंबा नाम`;
      try {
        await app.plan.openBook();
        expect((await app.plan.addChapter(chapter)).ok(), 'set-up: the chapter is created').toBe(true);
        await app.page.reload();
        await app.page.waitForTimeout(5000);
        await app.plan.openBook();
        const chapters = await app.plan.bookChapters();
        expect(
          chapters.find((c) => same(c, chapter)),
          `shown in full after a reload (book: ${chapters.slice(-3).join(' | ')})`
        ).toBeTruthy();
      } finally {
        await removeChapter(app, chapter);
      }
    }
  );

  test(
    'PLN-07-10: a resource (video, image, PDF) can be added to a topic',
    { tag: ['@functional'] },
    async ({ app }) => {
      let made;
      try {
        made = await chapterWithTopic(app);
        const name = autoName('image');
        const r = await app.plan.addResource(PNG_FILE, name, 'Images');
        expect(r.ok(), `the server accepts the resource (HTTP ${r.status()})`).toBe(true);
        await expect(app.plan.resourceRow(name), 'the resource is listed in the topic').toHaveCount(1, {
          timeout: 10000,
        });
      } finally {
        if (made) await removeChapter(app, made.chapter);
      }
    }
  );

  test('PLN-07-11: the resources of a topic can be reordered', { tag: ['@functional'] }, async ({ app }) => {
    let made;
    try {
      made = await chapterWithTopic(app);
      const names = await twoResources(app);
      const [a, b] = await order(app, names);
      expect(a, 'set-up: the first resource is above the second').toBeLessThan(b);
      await app.plan.dragResource(names[1], names[0]);
      const [a2, b2] = await order(app, names);
      expect(b2, 'the second resource now comes first').toBeLessThan(a2);
    } finally {
      if (made) await removeChapter(app, made.chapter);
    }
  });

  test('PLN-07-12: a resource can be removed from a topic', { tag: ['@functional'] }, async ({ app }) => {
    let made;
    try {
      made = await chapterWithTopic(app);
      const name = autoName('image');
      expect((await app.plan.addResource(PNG_FILE, name, 'Images')).ok(), 'set-up: the resource is added').toBe(true);
      const r = await app.plan.deleteResource(name);
      expect(r.ok(), `the server removes it (HTTP ${r.status()})`).toBe(true);
      await expect(app.plan.resourceRow(name), 'the resource is gone from the topic').toHaveCount(0, {
        timeout: 10000,
      });
    } finally {
      if (made) await removeChapter(app, made.chapter);
    }
  });

  test('PLN-07-13: Save keeps the changes after a reload', { tag: ['@regression'] }, async ({ app }) => {
    let made;
    try {
      made = await chapterWithTopic(app);
      const names = await twoResources(app);
      await app.plan.dragResource(names[1], names[0]);
      const saved = app.page.waitForResponse(
        (r) => r.request().method() === 'POST' && /curriculum\/custom\/book/.test(r.url()),
        { timeout: 20000 }
      );
      await app.plan.saveBtn.click();
      expect((await saved).ok(), 'Save is accepted').toBe(true);
      await app.page.reload();
      await app.page.waitForTimeout(5000);
      await app.plan.openBook();
      await app.plan.expandChapter(made.chapter);
      await app.plan.expandTopic(made.topic);
      const [a, b] = await order(app, names);
      expect(a >= 0 && b >= 0, 'both resources are still there').toBe(true);
      expect(b, 'the new order is kept').toBeLessThan(a);
    } finally {
      if (made) await removeChapter(app, made.chapter);
    }
  });

  test(
    'PLN-07-14: leaving with unsaved changes warns before discarding them',
    { tag: ['@negative'] },
    async ({ app, page }) => {
      let made;
      let warned = false;
      page.on('dialog', (d) => {
        warned = true;
        d.dismiss().catch(() => {});
      });
      try {
        made = await chapterWithTopic(app);
        const names = await twoResources(app);
        await app.plan.dragResource(names[1], names[0]);
        // Leave for another section without pressing Save.
        await app.plan.sidebarLink('Question Bank').click({ force: true });
        await page.waitForTimeout(3000);
        const inPage = await page
          .getByText(/unsaved|discard|leave (this|the) page|save (your )?changes/i)
          .filter({ visible: true })
          .count();
        expect(warned || inPage > 0, 'a warning about the unsaved order').toBe(true);
      } finally {
        if (made) await removeChapter(app, made.chapter);
      }
    }
  );

  test(
    'PLN-07-15: after Save, the custom chapter, topic and resources appear in Teach Mode for that class',
    { tag: ['@regression'] },
    async ({ app }) => {
      let made;
      try {
        made = await chapterWithTopic(app);
        const name = autoName('image');
        expect((await app.plan.addResource(PNG_FILE, name, 'Images')).ok(), 'set-up: the resource is added').toBe(true);
        await app.plan.saveBtn.click();
        await app.page.waitForTimeout(3000);
        const chapters = await teachChapterNames(app);
        const index = chapters.findIndex((c) => c.toLowerCase().includes(made.chapter.toLowerCase()));
        expect(index, `the chapter is in Teach Mode (chapters: ${chapters.slice(-3).join(' | ')})`).toBeGreaterThan(-1);
        await app.nav.goToChapterTopic(index, 0);
        await expect(app.nav.currentChapterTopicBtn, 'its topic opens').toContainText(made.topic, {
          ignoreCase: true,
          timeout: 10000,
        });
        await app.playlist.ensureDrawerVisible();
        await expect(
          app.playlist.resourceCards.filter({ hasText: name }),
          'the resource is in its Playlist'
        ).toHaveCount(1, { timeout: 20000 });
      } finally {
        if (made) await removeChapter(app, made.chapter);
      }
    }
  );

  test(
    'PLN-07-16: Update Book (Sync) brings the book up to date without losing custom chapters and topics',
    { tag: ['@regression'] },
    async ({ app }) => {
      await app.plan.openBook();
      if (await app.plan.syncBookBtn.isDisabled())
        throw new Error(
          'DATA MISSING ON THIS SERVER: Update Book (Sync) is disabled for Class 12 Physics (no book update to bring)'
        );
      let made;
      try {
        made = await chapterWithTopic(app);
        await app.plan.syncBookBtn.click();
        await app.page.waitForTimeout(10000);
        await app.page.reload();
        await app.page.waitForTimeout(5000);
        await app.plan.openBook();
        await app.plan.expandChapter(made.chapter);
        await expect(app.plan.bookRow(made.chapter), 'the custom chapter and its topic are kept').toContainText(
          made.topic,
          { ignoreCase: true }
        );
      } finally {
        if (made) await removeChapter(app, made.chapter);
      }
    }
  );

  test(
    'PLN-07-17: a custom chapter and topic can be deleted, and disappear from Teach Mode',
    { tag: ['@functional'] },
    async ({ app }) => {
      let made;
      try {
        made = await chapterWithTopic(app);
        await app.plan.saveBtn.click();
        await app.page.waitForTimeout(3000);
        const r = await app.plan.deleteBookRow(made.chapter);
        expect(r.ok(), `the server deletes the chapter (HTTP ${r.status()})`).toBe(true);
        expect(
          (await app.plan.bookChapters()).some((c) => same(c, made.chapter)),
          'gone from the book'
        ).toBe(false);
        const chapters = await teachChapterNames(app);
        expect(
          chapters.some((c) => c.toLowerCase().includes(made.chapter.toLowerCase())),
          'gone from Teach Mode'
        ).toBe(false);
      } finally {
        if (made) await removeChapter(app, made.chapter);
      }
    }
  );
});
