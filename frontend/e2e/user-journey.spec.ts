import { test, expect } from '@playwright/test';

test.describe('QuickCart Complete E2E User Journey', () => {
  const timestamp = Date.now();
  const testUser = {
    email: `playwright.shopper.${timestamp}@example.com`,
    password: 'Password123!',
    firstName: 'Playwright',
    lastName: 'Tester'
  };

  test('walks through the complete shopper journey from discovery to checkout and order tracking', async ({
    page
  }) => {
    // 1. Open Homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/QuickCart/i);
    await expect(page.getByRole('heading', { name: /Next-Gen Tech Gear/i })).toBeVisible();

    // 2. Browse Categories
    const categoryLink = page.getByRole('link', { name: /Peripherals/i }).first();
    if (await categoryLink.isVisible()) {
      await categoryLink.click();
      await expect(page).toHaveURL(/category=peripherals/i);
    } else {
      await page.goto('/products');
    }
    await expect(page.getByRole('heading', { name: /All Products/i })).toBeVisible();

    // 3. Search for Products
    const searchInput = page.getByLabel('Search products');
    await searchInput.fill('Keyboard');
    await searchInput.press('Enter');

    // 4. Open a Product Details Page
    const firstProductCard = page.locator('article, [data-testid="product-card"]').first();
    await expect(firstProductCard).toBeVisible();
    await firstProductCard.getByRole('link').first().click();

    await expect(page).toHaveURL(/\/products\/[\w-]+/);
    await expect(page.getByRole('button', { name: /add to cart/i })).toBeVisible();

    // 5. Register New Account
    await page.goto('/register');
    await page.getByLabel(/first name/i).fill(testUser.firstName);
    await page.getByLabel(/last name/i).fill(testUser.lastName);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/^password \*/i).fill(testUser.password);
    await page.getByLabel(/confirm password/i).fill(testUser.password);
    await page.getByRole('button', { name: /create account/i }).click();

    // 6. Log In
    await expect(page).toHaveURL(/(\/login|\/)/);
    if (page.url().includes('/login')) {
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/password/i).fill(testUser.password);
      await page.getByRole('button', { name: /sign in/i }).click();
    }
    await expect(page).toHaveURL(/\/(products|profile|$)/);

    // 7. Add Product to Cart
    await page.goto('/products');
    const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();
    await addToCartBtn.click();
    await expect(page.getByRole('button', { name: /added/i })).toBeVisible();

    // 8. Open Cart & Update Quantities
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /Shopping Cart/i })).toBeVisible();

    const increaseBtn = page.getByRole('button', { name: /increase quantity/i }).first();
    if (await increaseBtn.isEnabled()) {
      await increaseBtn.click();
    }

    // 9. Proceed to Checkout
    await page.getByRole('button', { name: /proceed to checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole('heading', { name: /Secure Checkout/i })).toBeVisible();

    // Fill Shipping Address
    await page.getByLabel(/street address \*/i).fill('742 Evergreen Terrace');
    await page.getByLabel(/city \*/i).fill('Springfield');
    await page.getByLabel(/state \/ province \*/i).fill('OR');
    await page.getByLabel(/postal \/ zip code \*/i).fill('97477');

    // 10. Complete Supported Payment Flow
    const paySubmitBtn = page.getByRole('button', { name: /pay \$/i });
    await paySubmitBtn.click();

    // 11. View Confirmation & Order Status
    await expect(page).toHaveURL(/\/checkout\/confirmation\/[\w-]+/);
    await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();

    // 12. View Resulting Order in Dashboard
    const viewOrderBtn = page.getByRole('link', { name: /view order/i }).first();
    await viewOrderBtn.click();
    await expect(page).toHaveURL(/\/orders\/[\w-]+/);
    await expect(page.getByRole('heading', { name: /order #/i })).toBeVisible();

    // 13. Log Out
    await page.goto('/profile');
    const logoutBtn = page.getByRole('button', { name: /sign out|log out/i });
    await logoutBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
