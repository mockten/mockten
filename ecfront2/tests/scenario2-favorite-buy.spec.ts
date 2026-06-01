import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.beforeAll(() => {
  try {
    // Reset Blueberry Jam stock to 10 and clear Wishlist in MySQL
    execSync(`docker exec -i mysql-service.default.svc.cluster.local mysql -umocktenusr -pmocktenpassword mocktendb -e "UPDATE Stock SET stocks = 10 WHERE product_id = 'b91a5d68-6acb-48e7-8e5d-3d85b7e76af2'; DELETE FROM Wishlist;"`);
    // Force Meilisearch sync
    execSync(`docker exec -i mockten-sync /sync_script.sh`);
  } catch (e) {
    console.warn('Failed to reset stock via docker exec. Continuing test...', e);
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
    
    // Stripe Element is in an iframe.
    const stripeIframe = page.frameLocator('iframe[name^="__privateStripeFrame"]').first();
    
    // Enter Card Details in Stripe iframe
    await stripeIframe.getByPlaceholder('Card number').fill('4242424242424242');
    await stripeIframe.getByPlaceholder('MM / YY').fill('12/30');
    await stripeIframe.getByPlaceholder('CVC').fill('123');
    await stripeIframe.getByPlaceholder('ZIP').fill('12345');
    
    // Click Save
    await page.getByRole('button', { name: 'Save' }).click();
    
    // Wait for save completion
    await expect(page.getByText('Card successfully saved')).toBeVisible();

    // 3. Search for Blueberry Jam and favorite it
    await page.goto('/');
    const searchInput = page.getByPlaceholder(/Search/i);
    await searchInput.fill('Blueberry Jam');
    await searchInput.press('Enter');
    await page.waitForURL('**/search?q=*');
    
    // Click on Blueberry Jam to go to detail page
    const blueberryJamHeading = page.getByRole('heading', { name: 'Blueberry Jam' });
    await expect(blueberryJamHeading).toBeVisible();
    await blueberryJamHeading.click();
    await page.waitForURL('**/item/*');
    
    // Click Favorite (heart icon)
    await page.getByRole('button', { name: 'Toggle Favorite' }).click();
    
    // 4. Go to favorite list and Buy Now
    await page.goto('/fav/list');
    
    // Wait for the favorite item to appear
    await expect(page.getByRole('heading', { name: 'Blueberry Jam' })).toBeVisible();
    
    // Click Buy Now (assumes there is only one Buy Now or we click the first one)
    await page.getByRole('button', { name: 'Buy Now' }).first().click();
    
    // 5. Checkout Process
    await expect(page.getByText('•••• 4242')).toBeVisible();
    await expect(page.getByText('105-0011')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm your Order' }).click();
    await page.getByRole('button', { name: 'Place Order' }).click();
    
    // Verify Order Completion
    await expect(page.getByText(/Thank you for your order!/i)).toBeVisible();
    
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
    
    // 6. Verify Lemongrass is in cart list
    await page.goto('/cart/list');
    await expect(page.getByRole('heading', { name: 'Lemongrass' })).toBeVisible();
  });
});
