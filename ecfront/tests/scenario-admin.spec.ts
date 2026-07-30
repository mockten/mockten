import { test, expect } from '@playwright/test';

const ADMIN_LOGIN_URL = '/admin';
const ADMIN = { email: 'superadmin', password: 'superadmin' };

/** Sign in to the Admin Portal and land on the dashboard. */
async function loginAsAdmin(page: any) {
  await page.goto(ADMIN_LOGIN_URL);
  await expect(page.getByPlaceholder('admin@example.com')).toBeVisible({ timeout: 15000 });
  await page.getByPlaceholder('admin@example.com').fill(ADMIN.email);
  await page.getByPlaceholder('••••••••').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Access Admin Panel' }).click();
  await expect(page.getByText('System Control Panel')).toBeVisible({ timeout: 15000 });
}

/** Open a sidebar section by its label. */
async function openSection(page: any, label: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
}

test.describe('Admin Portal', () => {
  test('1. Admin login and Overview loads real data', async ({ page }) => {
    await loginAsAdmin(page);
    // Stat cards are backed by live data (users / pending / flagged orders / alerts).
    // "Flagged Orders" appears both as a stat card and as the table title below,
    // so scope to the first match.
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('Pending Approvals')).toBeVisible();
    await expect(page.getByText('Flagged Orders').first()).toBeVisible();
  });

  test('2. User Management lists users with role + status', async ({ page }) => {
    await loginAsAdmin(page);
    await openSection(page, 'User Management');
    await expect(page.getByText('View and manage all platform users')).toBeVisible({ timeout: 15000 });
    // At least one row renders, and the table exposes Role/Status columns.
    await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
  });

  test('3. Admins are identified (superadmin is not mislabelled as Customer)', async ({ page }) => {
    await loginAsAdmin(page);
    await openSection(page, 'User Management');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
    // Filter by the Admin role; at least superadmin must show up. Admins are
    // resolved via admin-group membership (there is no "admin" realm role).
    await page.locator('select[aria-label="Filter by role"]').selectOption('Admin');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('table tbody')).toContainText('Admin');
  });

  test('4. Role filter and rows-per-page work', async ({ page }) => {
    await loginAsAdmin(page);
    await openSection(page, 'User Management');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });

    // Seller filter shows only sellers.
    await page.locator('select[aria-label="Filter by role"]').selectOption('Seller');
    await expect(page.locator('table tbody')).toContainText('Seller', { timeout: 10000 });

    // Rows-per-page selector (10/25/50/100) changes the page size.
    await page.locator('select[aria-label="Filter by role"]').selectOption('All');
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
    const before = await rows.count();
    await page.locator('select').filter({ hasText: '10' }).first().selectOption('25');
    await expect(async () => {
      expect(await rows.count()).toBeGreaterThanOrEqual(before);
    }).toPass({ timeout: 10000 });
  });

  test('5. Order Monitoring shows only flagged orders with a real reason', async ({ page }) => {
    await loginAsAdmin(page);
    await openSection(page, 'Order Monitoring');
    await expect(page.getByText('Flagged orders that require investigation')).toBeVisible({ timeout: 15000 });
    const body = page.locator('table tbody');
    await expect(body.locator('tr').first()).toBeVisible({ timeout: 15000 });
    // Every flagged row carries one of the concrete detection reasons. "High
    // value" was deliberately removed (a dollar threshold is not a real signal).
    await expect(body).toContainText(/Failed \/ canceled|Unusual location|Multiple rapid orders/);
    await expect(body).not.toContainText('High value');
  });

  test('6. Investigate opens the order detail modal', async ({ page }) => {
    await loginAsAdmin(page);
    await openSection(page, 'Order Monitoring');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Investigate' }).first().click();
    await expect(page.getByText('Investigate Order')).toBeVisible();
    await expect(page.getByText('Flag reason:')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
  });

  test('7. Activity Logs show all user types and can be filtered by type', async ({ page }) => {
    await loginAsAdmin(page);
    await openSection(page, 'Activity Logs');
    await expect(page.getByText('Audit trail across all users')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });

    // Filtering by actor type narrows the log to that user type.
    await page.locator('select[aria-label="Filter by user type"]').selectOption('admin');
    await expect(page.locator('table tbody')).toContainText('admin', { timeout: 10000 });
  });

  test('8. System Health reports live components', async ({ page }) => {
    await loginAsAdmin(page);
    await openSection(page, 'System Health');
    await expect(page.getByText('Live component status and metrics')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Database')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Catalog / Inventory')).toBeVisible();
  });

  test('9. Pending Approvals popup opens from the Overview card', async ({ page }) => {
    await loginAsAdmin(page);
    // The Pending Approvals stat card opens the approvals popup (no navigation).
    await page.getByText('Pending Approvals').click();
    await expect(page.getByRole('heading', { name: 'Pending Approvals' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Seller accounts awaiting review')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
  });

  test('10. Header search filters the user list', async ({ page }) => {
    await loginAsAdmin(page);
    await openSection(page, 'User Management');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder('Search users...').fill('superadmin');
    await expect(page.locator('table tbody')).toContainText('superadmin', { timeout: 10000 });
  });

  test('14. Header search filters the Overview flagged-orders table', async ({ page }) => {
    // The Overview table used to render the unfiltered list even while the
    // header search narrowed everything else, so typing did nothing here.
    await loginAsAdmin(page);
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const before = await rows.count();

    // "eu-order" only matches the EU-destination flagged order.
    await page.getByPlaceholder('Search users...').fill('eu-order');
    await expect(async () => {
      expect(await rows.count()).toBeLessThan(before);
    }).toPass({ timeout: 10000 });
    await expect(page.locator('table tbody')).toContainText('eu-order');
    await expect(page.locator('table tbody')).not.toContainText('flag-rapid');

    // A search matching nothing must show the empty state, not every row.
    await page.getByPlaceholder('Search users...').fill('zzz-no-such-order');
    await expect(page.locator('table tbody')).toContainText('No flagged orders', { timeout: 10000 });
  });

  test('12. superadmin cannot be suspended or deleted (protected root admin)', async ({ page }) => {
    await loginAsAdmin(page);
    await openSection(page, 'User Management');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
    // Filter to Admins so superadmin is on the first page (107 users otherwise).
    await page.locator('select[aria-label="Filter by role"]').selectOption('Admin');
    const row = page.locator('table tbody tr', { hasText: 'superadmin@example.com' });
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.getByRole('button').last().click();
    // Suspend / Delete must not be offered; a Protected notice is shown instead.
    await expect(page.getByText(/Protected/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Suspend Account')).toHaveCount(0);
    await expect(page.getByText('Delete User')).toHaveCount(0);
  });

  test('13. superadmin Edit page cannot suspend or delete', async ({ page }) => {
    await loginAsAdmin(page);
    await openSection(page, 'User Management');
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
    await page.locator('select[aria-label="Filter by role"]').selectOption('Admin');
    const row = page.locator('table tbody tr', { hasText: 'superadmin@example.com' });
    await expect(row).toBeVisible({ timeout: 10000 });
    // Open the row menu and go to Edit.
    await row.getByRole('button').last().click();
    await page.getByText('Edit User').click();
    // Edit page loaded (email is an input, so assert on the section heading).
    await expect(page.getByText('Personal Information')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input#email')).toHaveValue('superadmin@example.com', { timeout: 15000 });
    // The status control is locked to Active (no Suspended), and Delete is gone.
    await expect(page.getByText(/root administrator cannot be suspended|cannot suspend your own account/)).toBeVisible();
    await expect(page.getByText(/Protected account/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete User' })).toHaveCount(0);
  });

  test('11. Logout returns to the admin login screen', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('button', { name: /superadmin/i }).click();
    await page.getByText('Logout').click();
    await expect(page.getByRole('button', { name: 'Access Admin Panel' })).toBeVisible({ timeout: 15000 });
  });
});
