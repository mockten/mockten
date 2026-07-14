import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.beforeEach(async () => {
  // Prefer HTTP endpoint (works inside Docker ie2e where docker exec is unavailable)
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost';
  try {
    const res = await fetch(`${baseUrl}/api/test/reset-stock`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`reset-stock returned ${res.status}`);
  } catch {
    // Fallback: direct docker exec (host-only)
    try {
      execSync(`docker exec -i mysql-service.default.svc.cluster.local mysql --ssl-mode=DISABLED -umocktenusr -pmocktenpassword mocktendb -e "UPDATE Stock SET stocks = 10 WHERE product_id = 'b91a5d68-6acb-48e7-8e5d-3d85b7e76af2'; DELETE FROM Wishlist;"`, { timeout: 10000 });
    } catch (e) {
      console.warn('Failed to reset stock (both HTTP and docker exec failed). Continuing...', e);
    }
  }
});

test.describe('Scenario 2: Favorite and Buy Blueberry Jam', () => {
  test('should login, add VISA, favorite item, buy it, and verify cart', async ({ page }) => {
    // 1. Login via backdoor
    await page.goto('/api/test/auth-backdoor');
    await page.waitForTimeout(1000);

    // 2. Add VISA payment with ZIP
    await page.goto('/user/payment');
    
    // Wait for either the form or the button to appear
    const formField = page.getByPlaceholder('ex: TARO YAMADA');
    const addNewCardBtn = page.getByRole('button', { name: 'Add new card' });
    await expect(addNewCardBtn.or(formField)).toBeVisible({ timeout: 15000 });
    
    // Click 'Add new card' if it exists (e.g. if a card was already added)
    if (await addNewCardBtn.isVisible()) {
      await addNewCardBtn.click();
    }
    
    // Enter Card Holder Name
    await page.getByPlaceholder('ex: TARO YAMADA').fill('Hanako Tanaka');
    
    // Stripe Element is in an iframe — use autocomplete attributes (stable across locales/versions)
    // Wait for Stripe iframe to appear before interacting
    await expect(page.locator('iframe[name^="__privateStripeFrame"]').first()).toBeAttached({ timeout: 15000 });
    const stripeIframe = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();

    // Enter Card Details in Stripe iframe
    await stripeIframe.locator('[autocomplete="cc-number"], [placeholder*="1234"], [placeholder*="Card number"]').first().fill('4242424242424242');
    await stripeIframe.locator('[autocomplete="cc-exp"], [placeholder*="MM"]').first().fill('12/30');
    await stripeIframe.locator('[autocomplete="cc-csc"], [placeholder="CVC"]').first().fill('123');
    await stripeIframe.locator('[autocomplete="postal-code"], [placeholder="ZIP"]').first().fill('12345');
    
    // Click Save
    await page.getByRole('button', { name: 'Save' }).click();
    
    // Wait for save completion
    await expect(page.getByText('Card successfully saved')).toBeVisible();

    // 3. Navigate to Blueberry Jam item page and favorite it via UI
    // Register checkFavorite response listener BEFORE goto (fires immediately on page load)
    const checkFavPromise = page.waitForResponse(resp => resp.url().includes('/api/fav') && resp.request().method() === 'GET', { timeout: 15000 });
    await page.goto('/item/b91a5d68-6acb-48e7-8e5d-3d85b7e76af2');
    await page.waitForURL('**/item/*');
    // Wait for product data to load
    await expect(page.getByRole('heading', { name: 'Blueberry Jam' })).toBeVisible({ timeout: 15000 });
    // Wait for checkFavorite GET /api/fav to complete (ensures isFavorite state is accurate)
    const checkFavResp = await checkFavPromise;
    const favData = await checkFavResp.json().catch(() => []);
    // If item is already favorited (e.g. from a previous test run), delete it first
    if (favData.some((f: any) => f.productId === 'b91a5d68-6acb-48e7-8e5d-3d85b7e76af2')) {
      await Promise.all([
        page.getByRole('button', { name: 'Toggle Favorite' }).click(),
        page.waitForResponse(resp => resp.url().includes('/api/fav/') && resp.request().method() === 'DELETE', { timeout: 10000 }),
      ]);
      await page.waitForTimeout(500);
    }

    // Click toggle to add to favorites (isFavorite should be false now)
    const [, toggleResp] = await Promise.all([
      page.getByRole('button', { name: 'Toggle Favorite' }).click(),
      page.waitForResponse(resp => resp.url().includes('/api/fav/') && (resp.request().method() === 'POST' || resp.request().method() === 'DELETE'), { timeout: 10000 }),
    ]);
    // If toggle removed it (edge case), click again to add
    if (toggleResp.request().method() === 'DELETE') {
      await Promise.all([
        page.getByRole('button', { name: 'Toggle Favorite' }).click(),
        page.waitForResponse(resp => resp.url().includes('/api/fav/') && resp.request().method() === 'POST', { timeout: 10000 }),
      ]);
    }
    // Give the DB write a moment to be readable before navigating
    await page.waitForTimeout(1000);

    // 4. Go to favorite list and Buy Now
    await page.goto('/fav/list');

    // Wait for the favorite item to appear
    await expect(page.getByRole('heading', { name: 'Blueberry Jam' })).toBeVisible({ timeout: 10000 });
    
    // Click Buy Now (assumes there is only one Buy Now or we click the first one)
    await page.getByRole('button', { name: 'Buy Now' }).first().click();
    
    // 5. Checkout Process
    await expect(page.getByText('•••• 4242')).toBeVisible();
    await expect(page.getByText('105-0011')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm your Order' }).click();
    await page.getByRole('button', { name: 'Place Order' }).click();
    
    // Verify Order Completion
    await expect(page.getByText(/Thank you for your order!/i)).toBeVisible({ timeout: 20000 });
    
    // Extract UUID from the success text
    // Example text: "be1cc53b-04db-4139-870b-8e956fbbbfc4 Thank you for your order!"
    const successText = await page.getByRole('heading', { level: 4 }).innerText(); // Adjust selector if needed, usually it's an h4 or Typography
    // Alternatively, just grab all text
    const fullText = await page.locator('body').innerText();
    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    const match = fullText.match(uuidRegex);
    if (match) {
      console.log(`[SCENARIO 2 SUCCESS] Order UUID: ${match[0]}`);
    } else {
      console.log('[SCENARIO 2] Could not extract UUID.');
    }
    
    // 6. Verify Blueberry Jam appears in order history
    await page.goto('/order-history');
    await expect(page.getByText('Blueberry Jam').first()).toBeVisible({ timeout: 10000 });
  });
});
