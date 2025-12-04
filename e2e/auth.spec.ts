import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('should redirect unauthenticated users to sign in', async ({ page }) => {
    // Try to access protected dashboard
    await page.goto('/dashboard');

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/auth\/signin|\/api\/auth/);
  });

  test('should show sign in page', async ({ page }) => {
    await page.goto('/auth/signin');

    // Should see sign in button
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});

test.describe('Dashboard Navigation', () => {
  // These tests would require authentication setup
  test.skip('should load dashboard for authenticated user', async ({ page }) => {
    // Would need to set up auth cookies/session
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
