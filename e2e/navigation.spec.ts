import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should have correct page title on homepage', async ({ page }) => {
    await page.goto('/');

    // Title should contain app name
    await expect(page).toHaveTitle(/SessionSync|Treatment Plans/i);
  });

  test('should have responsive layout', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // Should not have horizontal scroll
    const body = page.locator('body');
    const bodyWidth = await body.evaluate(el => el.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(1280);
  });

  test('should load static assets', async ({ page }) => {
    await page.goto('/');

    // Check that page loaded without critical errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');

    // Filter out expected errors (like auth redirects)
    const criticalErrors = consoleErrors.filter(
      e => !e.includes('401') && !e.includes('auth')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
