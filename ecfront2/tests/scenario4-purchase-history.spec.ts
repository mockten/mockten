import { test, expect } from '@playwright/test';

test.describe('Scenario 4: Purchase History', () => {
  test('should login, go to purchase history, and verify items exist', async ({ page }) => {
    // 1. Login via backdoor
    await page.goto('/api/test/auth-backdoor');
    
    // 2. Go to purchase history (via app bar link or direct navigation)
    // Wait for the app bar or a certain element to load to ensure login completed
    await page.waitForTimeout(1000);
    
    // Navigate to purchase history
    await page.goto('/order-history');
    
    // 3. Verify page loaded correctly
    await expect(page.getByText('Purchase History', { exact: true })).toBeVisible();

    // Wait for page to load and API call to complete (hide loading state)
    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 10000 }).catch(() => {});
    
    // 4. Verify that there are items (since scenarios 1-3 ran before)
    // We expect at least one item, like "Lemongrass" or "Blueberry Jam"
    // Since the API takes a moment, we wait for "Purchase Date:" text or a specific product name.
    // Let's just wait for a status element. It should not show "There are no purchase history records."
    await expect(page.getByText('There are no purchase history records.')).not.toBeVisible({ timeout: 10000 });
    
    // Check if progress tracker is visible
    // We look for "Status:" which is rendered dynamically
    await expect(page.locator('text=Status:').first()).toBeVisible();

    // Check that we have at least one product
    const itemsCount = await page.locator('text=Purchase Date:').count();
    expect(itemsCount).toBeGreaterThan(0);
    console.log(`[SCENARIO 4 SUCCESS] Found ${itemsCount} items in Purchase History.`);
  });
});
