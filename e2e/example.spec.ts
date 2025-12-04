import { test, expect } from '@playwright/test';

test.describe('Example E2E Tests', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');
    // Page should redirect to auth or show app
    await expect(page).toHaveURL(/\/(auth|dashboard)?/);
  });
});
