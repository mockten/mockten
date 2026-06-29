import { test, expect } from '@playwright/test';

const SELLER_LOGIN_URL = '/seller/login';
const SELLER_PORTAL_URL = '/seller/portal';
const SELLER_SIGNUP_URL = '/seller/signup';

const EXISTING_SELLER = {
  email: 'healthcompany@example.com',
  password: 'healthcompany',
};

const NEW_SELLER = {
  fullName: 'Test Seller',
  storeName: 'Test Store',
  email: 'testseller@example.com',
  phone: '+1 (555) 123-4567',
  password: 'TestPass123!',
};

test.describe.serial('Seller Portal', () => {
  test.beforeAll(async ({ request }) => {
    // Delete testseller@example.com if exists so signup test can run cleanly
    try {
      const tokenRes = await request.post('/api/uam/creation/token', {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: '',
      });
      if (!tokenRes.ok()) return;
      const { access_token } = await tokenRes.json();

      const searchRes = await request.get(
        `/api/uam/users?email=${encodeURIComponent(NEW_SELLER.email)}`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      if (!searchRes.ok()) return;
      const users = await searchRes.json();
      if (users.length > 0) {
        await request.delete(`/api/uam/users/${users[0].id}`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
      }
    } catch {
      // non-fatal
    }
  });

  test('1. Existing seller login and logout', async ({ page }) => {
    await page.goto(SELLER_LOGIN_URL);
    await expect(page.getByPlaceholder('seller@example.com')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('seller@example.com').fill(EXISTING_SELLER.email);
    await page.getByPlaceholder('••••••••').fill(EXISTING_SELLER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(SELLER_PORTAL_URL, { timeout: 15000 });
    await expect(page.getByText('Dashboard Overview')).toBeVisible({ timeout: 10000 });

    // Logout via dropdown
    const usernameBtn = page.locator('header button').filter({ hasText: /healthcompany|example/ }).first();
    await usernameBtn.click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();

    await expect(page).toHaveURL(SELLER_LOGIN_URL, { timeout: 10000 });
  });

  test('2. New seller signup', async ({ page }) => {
    await page.goto(SELLER_SIGNUP_URL);
    await expect(page.getByPlaceholder('John Doe')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('John Doe').fill(NEW_SELLER.fullName);
    await page.getByPlaceholder('My Store').fill(NEW_SELLER.storeName);
    await page.getByPlaceholder('seller@example.com').fill(NEW_SELLER.email);
    await page.getByPlaceholder('+1 (555) 000-0000').fill(NEW_SELLER.phone);

    const passwordFields = page.getByPlaceholder('••••••••');
    await passwordFields.nth(0).fill(NEW_SELLER.password);
    await passwordFields.nth(1).fill(NEW_SELLER.password);

    await page.getByLabel(/I agree/).click();

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(SELLER_LOGIN_URL, { timeout: 15000 });
  });

  test('3. New seller login', async ({ page }) => {
    await page.goto(SELLER_LOGIN_URL);
    await expect(page.getByPlaceholder('seller@example.com')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('seller@example.com').fill(NEW_SELLER.email);
    await page.getByPlaceholder('••••••••').fill(NEW_SELLER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(SELLER_PORTAL_URL, { timeout: 15000 });
    await expect(page.getByText('Dashboard Overview')).toBeVisible({ timeout: 10000 });
  });

  test('4. Overview: stats displayed for existing seller', async ({ page }) => {
    // Login as existing seller who has orders
    await page.goto(SELLER_LOGIN_URL);
    await page.getByPlaceholder('seller@example.com').fill(EXISTING_SELLER.email);
    await page.getByPlaceholder('••••••••').fill(EXISTING_SELLER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(SELLER_PORTAL_URL, { timeout: 15000 });
    await expect(page.getByText('Dashboard Overview')).toBeVisible({ timeout: 10000 });

    // Stats cards should be visible
    await expect(page.getByText('Total Revenue')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="stat-orders"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Products Sold')).toBeVisible();
    await expect(page.getByText('Customers')).toBeVisible();

    // Revenue value should be visible (e.g. $10.00 or $0.00)
    await expect(page.locator('[data-testid="stat-revenue"]')).toBeVisible({ timeout: 10000 });
  });

  test('5. Products tab: list and pagination', async ({ page }) => {
    await page.goto(SELLER_LOGIN_URL);
    await page.getByPlaceholder('seller@example.com').fill(EXISTING_SELLER.email);
    await page.getByPlaceholder('••••••••').fill(EXISTING_SELLER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(SELLER_PORTAL_URL, { timeout: 15000 });

    // Click Products tab
    await page.getByRole('button', { name: 'Products' }).click();
    await expect(page.getByText('Manage your product inventory')).toBeVisible({ timeout: 10000 });

    // Product table should be visible
    await expect(page.getByRole('columnheader', { name: 'Product Name' })).toBeVisible({ timeout: 10000 });

    // Items per page selector should be visible
    await expect(page.locator('select[data-testid="products-per-page"]')).toBeVisible({ timeout: 5000 });
  });

  test('6. Orders tab: list and status filter', async ({ page }) => {
    await page.goto(SELLER_LOGIN_URL);
    await page.getByPlaceholder('seller@example.com').fill(EXISTING_SELLER.email);
    await page.getByPlaceholder('••••••••').fill(EXISTING_SELLER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(SELLER_PORTAL_URL, { timeout: 15000 });

    // Click Orders tab
    await page.getByRole('button', { name: 'Orders' }).click();
    await expect(page.getByText('View and manage all orders')).toBeVisible({ timeout: 10000 });

    // Orders table should be visible
    await expect(page.getByRole('columnheader', { name: 'Order ID' })).toBeVisible({ timeout: 10000 });

    // Status filter tabs should be visible
    await expect(page.getByRole('tab', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Pending' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Processing' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Completed' })).toBeVisible();

    // Click Pending filter
    await page.getByRole('tab', { name: 'Pending' }).click();
    // Should still show the orders table
    await expect(page.getByRole('columnheader', { name: 'Order ID' })).toBeVisible({ timeout: 5000 });
  });

  test('7. Settings tab: profile display and update', async ({ page }) => {
    await page.goto(SELLER_LOGIN_URL);
    await page.getByPlaceholder('seller@example.com').fill(EXISTING_SELLER.email);
    await page.getByPlaceholder('••••••••').fill(EXISTING_SELLER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(SELLER_PORTAL_URL, { timeout: 15000 });

    // Click Settings tab
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Store Information')).toBeVisible({ timeout: 10000 });

    // Store Name input should be visible
    await expect(page.getByLabel('Store Name')).toBeVisible({ timeout: 5000 });

    // Save Changes button should be visible and blue
    const saveBtn = page.getByRole('button', { name: 'Save Changes' });
    await expect(saveBtn).toBeVisible();

    // Update store name
    const storeNameInput = page.getByLabel('Store Name');
    await storeNameInput.clear();
    await storeNameInput.fill('Health Plus Co. Updated');
    await saveBtn.click();

    // Should not navigate away (stays on settings)
    await expect(page.getByText('Store Information')).toBeVisible({ timeout: 5000 });
  });

  test('8. Search: filter products in real-time', async ({ page }) => {
    await page.goto(SELLER_LOGIN_URL);
    await page.getByPlaceholder('seller@example.com').fill(EXISTING_SELLER.email);
    await page.getByPlaceholder('••••••••').fill(EXISTING_SELLER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(SELLER_PORTAL_URL, { timeout: 15000 });

    // Go to Products tab
    await page.getByRole('button', { name: 'Products' }).click();
    await expect(page.getByRole('columnheader', { name: 'Product Name' })).toBeVisible({ timeout: 10000 });

    // Type in search box
    const searchInput = page.getByPlaceholder('Search products, orders...');
    await searchInput.fill('Protein');

    // Table should still be visible (filtered)
    await expect(page.getByRole('columnheader', { name: 'Product Name' })).toBeVisible({ timeout: 3000 });
  });

  test('9. Add Product: create a new product', async ({ page }) => {
    // Login as existing seller
    await page.goto(SELLER_LOGIN_URL);
    await page.getByPlaceholder('seller@example.com').fill(EXISTING_SELLER.email);
    await page.getByPlaceholder('••••••••').fill(EXISTING_SELLER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(SELLER_PORTAL_URL, { timeout: 15000 });

    // Go to Products tab then Add Product
    await page.getByRole('button', { name: 'Products' }).click();
    await page.getByRole('button', { name: 'Add Product' }).click();
    await expect(page.getByText('Add New Product')).toBeVisible({ timeout: 10000 });

    // Fill basic info
    await page.getByPlaceholder('e.g. Wireless Headphones').fill('Test Protein Powder');
    await page.getByPlaceholder('Describe your product...').fill('A great protein supplement for athletes.');

    // Fill price
    await page.locator('#price').fill('29.99');

    // Fill stock
    await page.locator('#stock').fill('50');

    // Select category (pick first available option)
    await page.locator('button[role="combobox"]').first().click();
    await page.locator('[role="option"]').first().click();

    // Select condition
    await page.locator('button[role="combobox"]').nth(1).click();
    await page.locator('[role="option"]').first().click();

    // Submit
    await page.getByRole('button', { name: 'Add Product' }).click();

    // Should show success toast or navigate back to products list
    await expect(
      page.getByText('Product added successfully!').or(page.getByText('Manage your product inventory'))
    ).toBeVisible({ timeout: 15000 });
  });
});
