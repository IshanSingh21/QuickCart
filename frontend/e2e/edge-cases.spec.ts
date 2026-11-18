import { test, expect } from '@playwright/test';

test.describe('QuickCart Resiliency & Responsive Edge Cases', () => {
  test('handles responsive layouts from mobile (320px) to large desktop (1440px)', async ({ page }) => {
    // 1. Mobile viewport 320px
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto('/products');

    // Filter drawer button should be visible on mobile
    const mobileFiltersBtn = page.getByRole('button', { name: /filters/i });
    await expect(mobileFiltersBtn).toBeVisible();

    // 2. Tablet viewport 768px
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('heading', { name: /All Products/i })).toBeVisible();

    // 3. Desktop viewport 1280px
    await page.setViewportSize({ width: 1280, height: 800 });
    // Desktop sidebar filters should now be visible without drawer
    const desktopAside = page.locator('aside');
    await expect(desktopAside).toBeVisible();

    // 4. Large Desktop viewport 1440px
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('displays empty search results state when no products match', async ({ page }) => {
    await page.goto('/products');

    const searchInput = page.getByLabel('Search products');
    await searchInput.fill('NonExistentProductQueryXYZ999');
    await searchInput.press('Enter');

    await expect(page.getByText(/no matching products found/i)).toBeVisible();
    await expect(page.getByText(/try adjusting your search keywords/i)).toBeVisible();
  });

  test('handles network failure gracefully with retry option', async ({ page }) => {
    // Abort backend API requests to simulate backend unavailability
    await page.route('**/api/v1/products*', (route) => route.abort('failed'));

    await page.goto('/products');

    await expect(page.getByText(/unable to load products/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
  });
});
