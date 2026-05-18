import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.beforeAll(() => {
  try {
    // Reset Lemongrass stock to 50 in MySQL
    execSync(`docker exec -i mysql-service.default.svc.cluster.local mysql -umocktenusr -pmocktenpassword mocktendb -e "UPDATE Stock SET stocks = 50 WHERE product_id = '580414f1-e962-4f6c-a461-d88d168e7cb1';"`);
    // Force Meilisearch sync
    execSync(`docker exec -i mockten-sync /sync_script.sh`);
  } catch (e) {
    console.warn('Failed to reset stock via docker exec. Continuing test...', e);
  }
});

test.describe('Scenario 1: Add Lemongrass to Cart', () => {
  test('should login, add payment, and add Lemongrass to cart', async ({ page }) => {
    // 1. Login via backdoor
    await page.goto('/api/test/auth-backdoor');
    
    // 2. Add MasterCard payment
    await page.goto('/user/payment');
    
    // Click 'Add new card' if it exists (e.g. if a card was already added)
    const addNewCardBtn = page.getByRole('button', { name: 'Add new card' });
    if (await addNewCardBtn.isVisible()) {
      await addNewCardBtn.click();
    }
    
    await page.screenshot({ path: 'debug_payment_page.png' });
    
    // Enter Card Holder Name
    await page.getByPlaceholder('ex: TARO YAMADA').fill('Taro Yamada');
    
    // Stripe Element is in an iframe. Find the Stripe iframe.
    const stripeIframe = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
    
    // Enter Card Details in Stripe iframe
    await stripeIframe.getByPlaceholder('Card number').fill('5454545454545454');
    await stripeIframe.getByPlaceholder('MM / YY').fill('12/30');
    await stripeIframe.getByPlaceholder('CVC').fill('123');
    
    // Click Save
    await page.getByRole('button', { name: 'Save' }).click();
    
    // 3. Search and Add "Lemongrass" to Cart
    await page.goto('/');
    
    // Search for Lemongrass
    const searchInput = page.getByPlaceholder(/Search/i);
    await searchInput.fill('Lemongrass');
    await searchInput.press('Enter');
    await page.waitForURL('**/search?q=*');
    
    // Click on Lemongrass from results
    const lemongrassHeading = page.getByText('Lemongrass', { exact: true });
    await expect(lemongrassHeading).toBeVisible();
    await lemongrassHeading.click();
    await page.waitForURL('**/item/*');
    
    // Select Air Standard shipping
    await page.getByText('Air Standard').click();
    
    // Click Add to Cart
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    
    // Verify success
    await expect(page.getByText('Added to cart')).toBeVisible();
  });
});
