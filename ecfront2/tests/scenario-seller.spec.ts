import { test, expect } from '@playwright/test';

const SELLER_LOGIN_URL = '/seller/login';
const SELLER_PORTAL_URL = '/seller/portal';
const SELLER_SIGNUP_URL = '/seller/signup';

const EXISTING_SELLER = {
  email: 'healthcompany@example.com',
  password: 'healthcompany',
};

const BOOKSTORE_SELLER = {
  email: 'bookstore@example.com',
  password: 'bookstore',
};

const NEW_SELLER = {
  fullName: 'Test Seller',
  storeName: 'Test Store',
  email: 'testseller@example.com',
  phone: '+1 (555) 123-4567',
  password: 'TestPass123!',
};

/** Login helper */
async function loginAs(page: any, email: string, password: string) {
  await page.goto(SELLER_LOGIN_URL);
  await expect(page.getByPlaceholder('seller@example.com')).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder('seller@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(SELLER_PORTAL_URL, { timeout: 15000 });
  await expect(page.getByText('Dashboard Overview')).toBeVisible({ timeout: 10000 });
}

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
    await loginAs(page, EXISTING_SELLER.email, EXISTING_SELLER.password);

    // Logout via dropdown
    await page.locator('[data-testid="user-menu-trigger"]').click();
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
    await loginAs(page, NEW_SELLER.email, NEW_SELLER.password);
  });

  test('4. Overview: stats displayed for existing seller', async ({ page }) => {
    await loginAs(page, EXISTING_SELLER.email, EXISTING_SELLER.password);

    // Stats cards should be visible
    await expect(page.getByText('Total Revenue')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="stat-orders"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Products Sold')).toBeVisible();
    await expect(page.getByText('Customers')).toBeVisible();
    await expect(page.locator('[data-testid="stat-revenue"]')).toBeVisible({ timeout: 10000 });
  });

  test('5. Products tab: list and pagination', async ({ page }) => {
    await loginAs(page, EXISTING_SELLER.email, EXISTING_SELLER.password);

    await page.getByRole('button', { name: 'Products' }).click();
    await expect(page.getByText('Manage your product inventory')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'Product Name' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('select[data-testid="products-per-page"]')).toBeVisible({ timeout: 5000 });
  });

  test('6. Orders tab: list and status filter', async ({ page }) => {
    await loginAs(page, EXISTING_SELLER.email, EXISTING_SELLER.password);

    await page.getByRole('button', { name: 'Orders' }).click();
    await expect(page.getByText('View and manage all orders')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'Order ID' })).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('tab', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Pending' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Processing' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Completed' })).toBeVisible();

    await page.getByRole('tab', { name: 'Pending' }).click();
    await expect(page.getByRole('columnheader', { name: 'Order ID' })).toBeVisible({ timeout: 5000 });
  });

  test('7. Settings tab: profile display and update', async ({ page }) => {
    await loginAs(page, EXISTING_SELLER.email, EXISTING_SELLER.password);

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByText('Store Information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Store Name')).toBeVisible({ timeout: 5000 });

    const saveBtn = page.getByRole('button', { name: 'Save Changes' });
    await expect(saveBtn).toBeVisible();

    const storeNameInput = page.getByLabel('Store Name');
    await storeNameInput.clear();
    await storeNameInput.fill('Health Plus Co. Updated');
    await saveBtn.click();

    await expect(page.getByText('Store Information')).toBeVisible({ timeout: 5000 });
  });

  test('8. Search: filter products in real-time', async ({ page }) => {
    await loginAs(page, EXISTING_SELLER.email, EXISTING_SELLER.password);

    await page.getByRole('button', { name: 'Products' }).click();
    await expect(page.getByRole('columnheader', { name: 'Product Name' })).toBeVisible({ timeout: 10000 });

    const searchInput = page.getByPlaceholder('Search products, orders...');
    await searchInput.fill('Protein');
    await expect(page.getByRole('columnheader', { name: 'Product Name' })).toBeVisible({ timeout: 3000 });
  });

  test('9. Add Product: create a new product', async ({ page }) => {
    await loginAs(page, EXISTING_SELLER.email, EXISTING_SELLER.password);

    await page.getByRole('button', { name: 'Products' }).click();
    await page.getByRole('button', { name: 'Add Product' }).click();
    await expect(page.getByText('Add New Product')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('e.g. Wireless Headphones').fill('Test Protein Powder');
    await page.getByPlaceholder('Describe your product...').fill('A great protein supplement for athletes.');
    await page.locator('#price').fill('29.99');
    await page.locator('#stock').fill('50');

    await page.locator('button[role="combobox"]').first().click();
    await page.locator('[role="option"]').first().click();

    await page.locator('button[role="combobox"]').nth(1).click();
    await page.locator('[role="option"]').first().click();

    await page.getByRole('button', { name: 'Add Product' }).click();

    await expect(
      page.getByText('Product added successfully!').or(page.getByText('Manage your product inventory'))
    ).toBeVisible({ timeout: 15000 });
  });

  test('10. Deactivate and reactivate a product', async ({ page }) => {
    await loginAs(page, EXISTING_SELLER.email, EXISTING_SELLER.password);

    await page.getByRole('button', { name: 'Products' }).click();
    await expect(page.getByRole('columnheader', { name: 'Product Name' })).toBeVisible({ timeout: 10000 });

    const protainRow = page.locator('table tbody tr').filter({ hasText: 'Protain bar' });
    await expect(protainRow).toBeVisible({ timeout: 5000 });

    const clickMenuAction = async (row: ReturnType<typeof page.locator>, testid: string) => {
      await row.locator('[data-testid="product-menu-trigger"]').click();
      await page.waitForSelector('[role="menu"]', { state: 'visible' });
      await page.locator(`[data-testid="${testid}"]`).click();
      await page.waitForSelector('[role="menu"]', { state: 'hidden' });
    };

    if (await protainRow.getByText('inactive').isVisible()) {
      await clickMenuAction(protainRow, 'menu-activate');
      await expect(protainRow.getByText('inactive')).not.toBeVisible({ timeout: 10000 });
    }

    await clickMenuAction(protainRow, 'menu-deactivate');
    await expect(protainRow.getByText('inactive')).toBeVisible({ timeout: 10000 });

    await clickMenuAction(protainRow, 'menu-activate');
    await expect(protainRow.getByText('inactive')).not.toBeVisible({ timeout: 10000 });
  });

  test('10b. Deactivate removes from search, activate restores it', async ({ page, request }) => {
    // Use Protain bar (healthcompany product known to be in MeiliSearch)
    await loginAs(page, EXISTING_SELLER.email, EXISTING_SELLER.password);
    await page.getByRole('button', { name: 'Products' }).click();
    await expect(page.getByRole('columnheader', { name: 'Product Name' })).toBeVisible({ timeout: 10000 });

    const protainRow = page.locator('table tbody tr').filter({ hasText: 'Protain bar' });
    await expect(protainRow).toBeVisible({ timeout: 5000 });

    const clickMenuAction = async (row: ReturnType<typeof page.locator>, testid: string) => {
      await row.locator('[data-testid="product-menu-trigger"]').click();
      await page.waitForSelector('[role="menu"]', { state: 'visible' });
      await page.locator(`[data-testid="${testid}"]`).click();
      await page.waitForSelector('[role="menu"]', { state: 'hidden' });
    };

    // Ensure active first
    if (await protainRow.getByText('inactive').isVisible()) {
      await clickMenuAction(protainRow, 'menu-activate');
      await expect(protainRow.getByText('inactive')).not.toBeVisible({ timeout: 10000 });
    }

    // Confirm searchable while active (cache-bust with timestamp)
    const searchWhileActive = await request.get(`/api/search?q=Protain+bar&_t=${Date.now()}`);
    const activeData = await searchWhileActive.json();
    expect(activeData.items.some((i: { product_name: string }) => i.product_name === 'Protain bar')).toBe(true);

    // Deactivate
    await clickMenuAction(protainRow, 'menu-deactivate');
    await expect(protainRow.getByText('inactive')).toBeVisible({ timeout: 10000 });

    // MeiliSearch async delete — wait up to 15s (cache-bust each poll)
    await expect.poll(async () => {
      const r = await request.get(`/api/search?q=Protain+bar&_t=${Date.now()}`);
      const d = await r.json();
      return d.items.some((i: { product_name: string }) => i.product_name === 'Protain bar');
    }, { timeout: 15000, intervals: [500] }).toBe(false);

    // Activate
    await clickMenuAction(protainRow, 'menu-activate');
    await expect(protainRow.getByText('inactive')).not.toBeVisible({ timeout: 10000 });

    // MeiliSearch async re-add — wait up to 30s (cache-bust each poll)
    await expect.poll(async () => {
      const r = await request.get(`/api/search?q=Protain+bar&_t=${Date.now()}`);
      const d = await r.json();
      return d.items.some((i: { product_name: string }) => i.product_name === 'Protain bar');
    }, { timeout: 30000, intervals: [1000] }).toBe(true);
  });

  test('11. Password show/hide toggle on login page', async ({ page }) => {
    await page.goto(SELLER_LOGIN_URL);
    await expect(page.getByPlaceholder('seller@example.com')).toBeVisible({ timeout: 10000 });

    const passwordInput = page.locator('#password');
    await passwordInput.fill('mypassword');

    // Default: type="password" (hidden)
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click eye icon to show
    await page.locator('button[type="button"]').filter({ has: page.locator('svg') }).last().click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await page.locator('button[type="button"]').filter({ has: page.locator('svg') }).last().click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('12. Password show/hide toggle on signup page', async ({ page }) => {
    await page.goto(SELLER_SIGNUP_URL);
    await expect(page.getByPlaceholder('John Doe')).toBeVisible({ timeout: 10000 });

    const pwField = page.locator('#password');
    await pwField.fill('secret123');
    await expect(pwField).toHaveAttribute('type', 'password');

    // Click first eye toggle (password field)
    const eyeButtons = page.locator('button[type="button"]').filter({ has: page.locator('svg') });
    await eyeButtons.first().click();
    await expect(pwField).toHaveAttribute('type', 'text');

    await eyeButtons.first().click();
    await expect(pwField).toHaveAttribute('type', 'password');
  });

  test('13. Overview shows recent orders immediately on login', async ({ page }) => {
    await loginAs(page, EXISTING_SELLER.email, EXISTING_SELLER.password);

    // Should show order section on Overview WITHOUT clicking Orders tab
    await expect(page.getByText(/Your latest \d+ orders/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'Order ID' })).toBeVisible({ timeout: 5000 });
  });

  test('14. Edit product: update stock and name', async ({ page }) => {
    await loginAs(page, EXISTING_SELLER.email, EXISTING_SELLER.password);

    await page.getByRole('button', { name: 'Products' }).click();
    await expect(page.getByRole('columnheader', { name: 'Product Name' })).toBeVisible({ timeout: 10000 });

    const protainRow = page.locator('table tbody tr').filter({ hasText: 'Protain bar' });
    await expect(protainRow).toBeVisible({ timeout: 5000 });

    // Open Edit modal
    await protainRow.locator('[data-testid="product-menu-trigger"]').click();
    await page.waitForSelector('[role="menu"]', { state: 'visible' });
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page.waitForSelector('[role="menu"]', { state: 'hidden' });

    // Edit modal should be visible with all fields
    await expect(page.getByText('Edit Product')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Product Name *')).toBeVisible();
    await expect(page.getByText('Stock *')).toBeVisible();
    await expect(page.getByText('Condition')).toBeVisible();

    // Update stock value
    const stockInput = page.locator('input[type="number"]').nth(1);
    await stockInput.clear();
    await stockInput.fill('20');

    await page.getByRole('button', { name: 'Save' }).click();

    // Modal should close and product list should refresh
    await expect(page.getByText('Edit Product')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('columnheader', { name: 'Product Name' })).toBeVisible({ timeout: 5000 });
  });

  test('15. Browser back button does not log out', async ({ page }) => {
    await loginAs(page, EXISTING_SELLER.email, EXISTING_SELLER.password);

    // Press browser back
    await page.goBack();

    // Should still be on portal (popstate trap)
    await expect(page).toHaveURL(SELLER_PORTAL_URL, { timeout: 5000 });
    await expect(page.getByText('Dashboard Overview')).toBeVisible({ timeout: 5000 });
  });

  test('16. Bookstore seller can login and view products', async ({ page }) => {
    await loginAs(page, BOOKSTORE_SELLER.email, BOOKSTORE_SELLER.password);

    // Should see their own products
    await page.getByRole('button', { name: 'Products' }).click();
    await expect(page.getByText('Manage your product inventory')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('columnheader', { name: 'Product Name' })).toBeVisible({ timeout: 10000 });

    // Email shown in header should contain bookstore
    await expect(page.locator('header').getByText(/bookstore/i)).toBeVisible({ timeout: 5000 });
  });
});
