const { test, expect } = require('@playwright/test');

test.describe('Contact Form Submission', () => {
  test('submits form and redirects to thank-you page', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('textarea[name="message"]', 'This is a Playwright test submission.');

    await page.click('#contact-submit');

    // Button should show loading state
    await expect(page.locator('#contact-submit')).toHaveText('Sending...');

    // Should redirect to thank-you page
    await page.waitForURL('**/thank-you.html', { timeout: 10000 });
    await expect(page).toHaveURL(/thank-you\.html/);
  });

  test('shows validation on empty required fields', async ({ page }) => {
    await page.goto('/');

    // Try submitting empty form — browser validation should prevent submission
    await page.click('#contact-submit');

    // Should still be on the homepage (form didn't submit)
    await expect(page).toHaveURL('/');
  });

  test('shows validation on invalid email', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'not-an-email');
    await page.fill('textarea[name="message"]', 'Test message.');

    await page.click('#contact-submit');

    // Should still be on homepage — browser rejects invalid email
    await expect(page).toHaveURL('/');
  });
});
