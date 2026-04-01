import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

(async () => {
  console.log('--- Contact Form E2E Test ---\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // --- Mock external requests so nothing hits real APIs ---
  await page.route('**/script.google.com/**', route => {
    console.log('[MOCK] Intercepted Google Sheets request');
    route.fulfill({ status: 200, body: '{}' });
  });

  await page.route('**/supabase.co/rest/**', route => {
    console.log('[MOCK] Intercepted Supabase insert request');
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Test', email: 'test@test.com', message: 'test' }])
    });
  });

  // --- Step 1: Open the page ---
  console.log('1. Opening homepage...');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const title = await page.title();
  console.log(`   Title: ${title}`);

  // --- Step 2: Fill in the contact form ---
  console.log('2. Filling in contact form...');
  await page.fill('input[name="name"]', 'Playwright Test User');
  await page.fill('input[name="email"]', 'playwright@test.com');
  await page.fill('textarea[name="message"]', 'Automated test submission from test-form.mjs');

  // Verify fields are filled
  const name  = await page.inputValue('input[name="name"]');
  const email = await page.inputValue('input[name="email"]');
  const msg   = await page.inputValue('textarea[name="message"]');
  console.log(`   Name:    ${name}`);
  console.log(`   Email:   ${email}`);
  console.log(`   Message: ${msg}`);

  // --- Step 3: Submit the form ---
  console.log('3. Submitting form...');
  await page.click('#contact-submit');

  // Check loading state
  const btnText = await page.textContent('#contact-submit');
  console.log(`   Button text after click: "${btnText}"`);

  // --- Step 4: Confirm redirect to thank-you page ---
  console.log('4. Waiting for redirect...');
  try {
    await page.waitForURL('**/thank-you.html', { timeout: 10000 });
    const finalURL = page.url();
    console.log(`   Redirected to: ${finalURL}`);

    if (finalURL.includes('thank-you.html')) {
      console.log('\n✅ TEST PASSED — Form submitted and redirected to thank-you page.');
    } else {
      console.log('\n❌ TEST FAILED — Redirect URL does not match.');
      process.exitCode = 1;
    }
  } catch (err) {
    console.log(`\n❌ TEST FAILED — No redirect within 10s. Still on: ${page.url()}`);

    // Check if error message appeared instead
    const errorMsg = await page.textContent('#form-message').catch(() => null);
    if (errorMsg) console.log(`   Form error message: "${errorMsg}"`);

    process.exitCode = 1;
  }

  await browser.close();
  console.log('\n--- Test Complete ---');
})();
