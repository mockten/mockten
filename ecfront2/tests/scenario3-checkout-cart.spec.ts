import { test, expect } from '@playwright/test';

test.describe('Scenario 3: Checkout Cart', () => {
  test('should login, go to cart, and checkout', async ({ page }) => {
    // 1. Login via backdoor
    await page.goto('/api/test/auth-backdoor');
    
    // 2. Go to cart list
    await page.goto('/cart/list');
    
    // Wait for Lemongrass or any cart item to appear (from Scenario 1)
    await expect(page.getByRole('heading', { name: 'Lemongrass' })).toBeVisible();
    
    // Click Checkout
    await page.getByRole('button', { name: 'Checkout' }).click();
    
    // 3. Checkout Process
    await expect(page.getByText('•••• 4242')).toBeVisible();
    await expect(page.getByText('105-0011')).toBeVisible();
    await page.getByRole('button', { name: 'Confirm your Order' }).click();
    await page.getByRole('button', { name: 'Place Order' }).click();
    
    // Verify Order Completion
    await expect(page.getByText(/Thank you for your order!/i)).toBeVisible();
    
    // Extract UUID from the success text
    const fullText = await page.locator('body').innerText();
    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    const match = fullText.match(uuidRegex);
    if (match) {
      console.log(`[SCENARIO 3 SUCCESS] Order UUID: ${match[0]}`);
    } else {
      console.log('[SCENARIO 3] Could not extract UUID.');
    }
  });
});
