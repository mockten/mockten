import { test, expect } from '@playwright/test';

/**
 * GUI performance budget checks.
 *
 * Measures the time from navigation start until a key element of each page is
 * visible, for both the Mockten storefront and the Seller Portal. The goal is
 * to catch performance regressions (e.g. un-bundled dev dependencies causing a
 * module-request waterfall). Budgets are intentionally generous to stay stable
 * across machines, while still flagging gross regressions.
 *
 * A warm-up navigation runs first so Vite's dependency pre-bundling
 * (optimizeDeps) is primed before any measurement is taken.
 */

const SELLER = {
  email: 'healthcompany@example.com',
  password: 'healthcompany',
};

// Budget in milliseconds for "navigation -> key element visible".
const PAGE_BUDGET_MS = 8000;

async function measure(page: any, label: string, action: () => Promise<void>) {
  const start = Date.now();
  await action();
  const elapsed = Date.now() - start;
  console.log(`[PERF] ${label}: ${elapsed}ms (budget ${PAGE_BUDGET_MS}ms)`);
  expect(elapsed, `${label} exceeded GUI budget`).toBeLessThan(PAGE_BUDGET_MS);
  return elapsed;
}

test.describe.serial('GUI performance budgets', () => {
  test.beforeAll(async ({ browser }) => {
    // Warm up the dev server / dependency pre-bundling once.
    const page = await browser.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.goto('/seller/login');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.close();
  });

  test('Mockten storefront pages load within budget', async ({ page }) => {
    // Mockten pages are behind PrivateRoute; authenticate via the test backdoor.
    await page.goto('/api/test/auth-backdoor');
    await page.waitForURL('/', { timeout: PAGE_BUDGET_MS }).catch(() => {});

    await measure(page, 'Mockten home', async () => {
      await page.goto('/');
      await expect(page.getByPlaceholder('Search..')).toBeVisible({ timeout: PAGE_BUDGET_MS });
    });

    await measure(page, 'Mockten search results', async () => {
      await page.goto('/search?q=ramen');
      // Either results or an empty-state render counts as "loaded".
      await page.waitForLoadState('domcontentloaded');
      await expect(page.getByPlaceholder('Search..')).toBeVisible({ timeout: PAGE_BUDGET_MS });
    });
  });

  test('Seller Portal pages load within budget', async ({ page }) => {
    await measure(page, 'Seller login page', async () => {
      await page.goto('/seller/login');
      await expect(page.getByPlaceholder('seller@example.com')).toBeVisible({ timeout: PAGE_BUDGET_MS });
    });

    // Authenticate
    await page.getByPlaceholder('seller@example.com').fill(SELLER.email);
    await page.getByPlaceholder('••••••••').fill(SELLER.password);
    await measure(page, 'Seller portal (overview)', async () => {
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL('/seller/portal', { timeout: PAGE_BUDGET_MS });
      await expect(page.getByText('Dashboard Overview')).toBeVisible({ timeout: PAGE_BUDGET_MS });
    });

    await measure(page, 'Seller products tab', async () => {
      await page.getByRole('button', { name: 'Products' }).click();
      await expect(page.getByText('Manage your product inventory')).toBeVisible({ timeout: PAGE_BUDGET_MS });
    });

    await measure(page, 'Seller orders tab', async () => {
      await page.getByRole('button', { name: 'Orders' }).click();
      await expect(page.getByText('View and manage all orders')).toBeVisible({ timeout: PAGE_BUDGET_MS });
    });
  });
});
