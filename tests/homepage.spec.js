const { test, expect } = require('@playwright/test');

test.describe('Homepage', () => {
  test('loads and displays hero section', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Tester\.io/);
    await expect(page.locator('h1')).toContainText('Bank Smarter');
  });

  test('navigation links are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Features' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pricing' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Testimonials' })).toBeVisible();
  });

  test('contact form is visible with all fields', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('#contact-form');
    await expect(form).toBeVisible();
    await expect(form.locator('input[name="name"]')).toBeVisible();
    await expect(form.locator('input[name="email"]')).toBeVisible();
    await expect(form.locator('textarea[name="message"]')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Send Message' })).toBeVisible();
  });
});
