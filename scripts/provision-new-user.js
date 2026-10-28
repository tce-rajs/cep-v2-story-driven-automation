require('dotenv').config({ quiet: true });

const crypto = require('crypto');
const fs = require('fs');
const { chromium } = require('@playwright/test');
const { AdminPage } = require('../pages/admin.page');

async function main() {
  const credentialsPath = process.argv[2];
  if (!credentialsPath) throw new Error('Provide the private output path for the new-user credentials.');
  if (!AdminPage.configured) {
    const missing = ['ADMIN_SCHOOL', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_URL'].filter(
      (key) => !process.env[key]
    );
    throw new Error(`Admin provisioning is not configured; missing: ${missing.join(', ')}`);
  }

  const stamp = AdminPage.stamp();
  const fullName = `AutoQA ${stamp}`;
  const newPassword = `ClassEdge@${crypto.randomInt(100000, 1000000)}!`;
  const pin = String(crypto.randomInt(10000, 100000));
  const schoolSearchTerm =
    process.env.NEW_USER_SCHOOL_SEARCH_TERM || process.env.ADMIN_SCHOOL || process.env.SCHOOL_SEARCH_TERM;
  if (!schoolSearchTerm) throw new Error('Admin provisioning needs a school name for the new teacher login.');

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const admin = new AdminPage(page);
    await admin.signIn();
    const { username, message } = await admin.createTeacher({
      first: 'AutoQA',
      last: stamp,
      email: `autoqa.${stamp.toLowerCase()}@example.com`,
      subject: 'Science',
      expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
    if (!username) throw new Error('Admin created no username for the new teacher.');
    await admin.findTeacher(username);
    const row = await admin.teacherRow(username).innerText();
    if (!row.includes(fullName))
      throw new Error(`Admin could not verify the newly created AutoQA teacher (${message || 'no success message'}).`);
    if (!/created successfully/i.test(message))
      console.warn(
        'Admin list confirmed the new teacher, but the creation toast was not the expected success message.'
      );

    fs.writeFileSync(
      credentialsPath,
      JSON.stringify({
        NEW_USER_USERNAME: username,
        NEW_USER_NEW_PASSWORD: newPassword,
        NEW_USER_PIN: pin,
        NEW_USER_SCHOOL_SEARCH_TERM: schoolSearchTerm,
      }),
      { flag: 'wx', mode: 0o600 }
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`New-user provisioning failed: ${error.message}`);
  process.exitCode = 1;
});
