const { test, expect } = require('@playwright/test');

test.describe('Login Page', () => {
  test('loads login page with form', async ({ page }) => {
    await page.goto('/login.html');
    await expect(page).toHaveTitle(/Log In/);
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('can switch between login and signup tabs', async ({ page }) => {
    await page.goto('/login.html');

    // Login form should be visible by default
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#signup-form')).toBeHidden();

    // Click signup tab
    await page.click('#tab-signup');
    await expect(page.locator('#signup-form')).toBeVisible();
    await expect(page.locator('#login-form')).toBeHidden();

    // Click login tab
    await page.click('#tab-login');
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('#signup-form')).toBeHidden();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login.html');

    await page.fill('#login-email', 'fake@example.com');
    await page.fill('#login-password', 'wrongpassword');
    await page.click('#login-btn');

    // Should show error message
    await expect(page.locator('#auth-message')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#auth-message')).toHaveClass(/bg-red-50/);
  });

  test('signup shows password mismatch error', async ({ page }) => {
    await page.goto('/login.html');

    await page.click('#tab-signup');
    await page.fill('#signup-email', 'test@example.com');
    await page.fill('#signup-password', 'password123');
    await page.fill('#signup-confirm', 'differentpassword');
    await page.click('#signup-btn');

    await expect(page.locator('#auth-message')).toContainText('Passwords do not match');
  });

  test('Google OAuth button is present', async ({ page }) => {
    await page.goto('/login.html');
    await expect(page.getByText('Continue with Google')).toBeVisible();
  });
});
