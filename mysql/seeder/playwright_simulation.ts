import { test, expect } from '@playwright/test';

// NOTE: This Playwright script is a helper tool for front-end E2E verification.
// Main data generation is handled by behavior_seeder.py.
// Since simulating all 50 users via Playwright is very time-consuming,
// it is recommended to run this with representative users (one per persona).
// For full user simulations, please use behavior_seeder.py instead.

const representatives = [
  { username: 'dev_user_001', persona: 'tech_lovers', primary: '07' },
  { username: 'dev_user_011', persona: 'sports_fans', primary: '12' },
  { username: 'dev_user_021', persona: 'foodies', primary: '03' },
  { username: 'dev_user_031', persona: 'book_worms', primary: '01' },
  { username: 'dev_user_039', persona: 'family_buyers', primary: '10' },
  { username: 'dev_user_046', persona: 'fashion_lovers', primary: '06' }
];

test.describe('E2E Purchase Simulation for Representatives', () => {
  for (const rep of representatives) {
    test(`should simulate purchase flow for ${rep.username} (${rep.persona})`, async ({ page, request }) => {
      // 1. Login via backdoor
      console.log(`[SIMULATION] Logging in as ${rep.username}...`);
      await page.goto(`/api/test/auth-backdoor?username=${rep.username}`);
      await page.waitForTimeout(1000);

      // Verify login by navigating to profile/payment page
      await page.goto('/user/payment');
      await page.waitForTimeout(1000);

      // 2. Determine target product
      let targetProductId = '9f9a6e2a-0cd8-4228-b80c-7b2fbfd5db6b'; // Acoustic Guitar
      let targetProductName = 'Acoustic Guitar';

      if (rep.username !== 'dev_user_001') {
        // Fetch products from the search API to find items matching the primary category
        const searchResponse = await request.get('/api/search?q=');
        expect(searchResponse.ok()).toBeTruthy();
        const searchResults = await searchResponse.json();
        const items = searchResults.items || [];
        
        const catProducts = items.filter((p: any) => p.category_id === rep.primary);
        
        if (catProducts && catProducts.length > 0) {
          const selected = catProducts[Math.floor(Math.random() * catProducts.length)];
          targetProductId = selected.product_id;
          targetProductName = selected.product_name;
        } else if (items.length > 0) {
          const selected = items[Math.floor(Math.random() * items.length)];
          targetProductId = selected.product_id;
          targetProductName = selected.product_name;
        }
      }

      console.log(`[SIMULATION] User ${rep.username} selected product: ${targetProductName} (${targetProductId})`);

      // 3. Visit product detail page
      await page.goto(`/item/${targetProductId}`);
      
      // Wait for product details heading to load
      const heading = page.getByRole('heading', { name: targetProductName }).first();
      await expect(heading).toBeVisible({ timeout: 15000 });

      // Select shipping method
      const shippingOption = page.locator('text=About delivery').locator('xpath=../..').locator('text=/Standard|Express/').first();
      await shippingOption.click();

      // Click Add to Cart
      await page.getByRole('button', { name: 'Add to Cart' }).click();
      await expect(page.getByText('Added to cart')).toBeVisible();

      // 4. Go to Cart List
      await page.goto('/cart/list');
      await expect(page.getByRole('heading', { name: targetProductName })).toBeVisible();

      // Click Checkout
      await page.getByRole('button', { name: 'Checkout' }).click();

      // Confirm Order
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: 'Confirm your Order' }).click();
      
      // Place Order
      await page.getByRole('button', { name: 'Place Order' }).click();

      // Verify order success
      await expect(page.getByText(/Thank you for your order!/i)).toBeVisible({ timeout: 15000 });
      console.log(`[SIMULATION] User ${rep.username} successfully placed order for ${targetProductName}.`);
    });
  }
});
