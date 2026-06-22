import { test, expect } from '@playwright/test';

test.describe('Dashboard Enhancements Spec', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Dashboard
    await page.goto('/dashboard/');
    await expect(page.locator('.logo')).toContainText('mockten');
  });

  test('should load and navigate through sidebar views', async ({ page }) => {
    // Check sidebar navigation items are visible and can navigate correctly updating the view title
    const views = [
      { name: 'Dashboard', title: 'Dashboard' },
      { name: 'Container List', title: 'Container List' },
      { name: 'Log Viewer', title: 'Log Viewer' },
      { name: 'Topology', title: 'Service Topology' },
      { name: 'DB Viewer', title: 'DB Viewer' },
      { name: 'API Specifications', title: 'API Specifications' },
      { name: 'Access Management', title: 'Access Management' },
      { name: 'Model Performance', title: 'Model Performance' },
      { name: 'CI Pipelines', title: 'CI Pipelines' },
      { name: 'E2E Test Runner', title: 'E2E Test Runner' },
      { name: 'Security Scanning', title: 'Security Scanning' }
    ];

    for (const view of views) {
      const navItem = page.locator('nav .nav-item').getByText(view.name, { exact: true });
      await expect(navItem).toBeVisible();
      await navItem.click();
      
      // Verify appropriate topbar view title
      await expect(page.locator('#view-title')).toContainText(view.title);
    }
  });

  test('should load System Load & API Gateway Telemetry chart and Top 5 APIs table', async ({ page }) => {
    // Ensure we are on the Dashboard view
    await page.locator('nav .nav-item').getByText('Dashboard', { exact: true }).click();
    
    // Check telemetry chart card and canvas
    const chartCard = page.locator('.card', { hasText: 'System Load & API Gateway Telemetry' });
    await expect(chartCard).toBeVisible();
    await expect(page.locator('#telemetry-chart')).toBeVisible();

    // Check Top requested APIs card and tbody
    const top5Card = page.locator('.card', { hasText: 'Top Requested API Gateway Endpoints' });
    await expect(top5Card).toBeVisible();
    await expect(page.locator('#kong-top-apis-tbody')).toBeVisible();
  });

  test('should load API Specifications and Realm info', async ({ page }) => {
    // 1. API Specs
    await page.locator('nav .nav-item').getByText('API Specifications', { exact: true }).click();
    await page.waitForSelector('#api-list-ul .db-list-item', { timeout: 10000 });
    const routeItems = page.locator('#api-list-ul .db-list-item');
    await expect(routeItems.first()).toBeVisible();

    // 2. Access Management (Keycloak)
    await page.locator('nav .nav-item').getByText('Access Management', { exact: true }).click();
    await page.waitForSelector('#kc-users-tbody tr', { timeout: 10000 });
    const userRows = page.locator('#kc-users-tbody tr');
    await expect(userRows.first()).toBeVisible();
  });

  test('should run SQL Query and Export MySQL Dump', async ({ page }) => {
    await page.locator('nav .nav-item').getByText('DB Viewer', { exact: true }).click();
    await page.waitForSelector('#mysql-tables-ul', { timeout: 10000 });

    // 1. Query Execution
    await page.getByRole('button', { name: 'Query' }).click();
    await page.waitForSelector('#sql-modal-overlay.active');
    
    await page.locator('#sql-query-text').fill('SELECT "Mockten Dashboard Test" AS test_col;');
    await page.getByRole('button', { name: 'Run Query' }).click();
    
    // Check results table
    await page.waitForSelector('#sql-result-wrap table');
    const resultTable = page.locator('#sql-result-wrap table');
    await expect(resultTable.locator('th')).toContainText('test_col');
    await expect(resultTable.locator('td')).toContainText('Mockten Dashboard Test');
    
    // Close modal
    await page.locator('#sql-modal-overlay button').first().click();

    // 2. Export MySQL Dump
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.sql');
  });

  test('should execute vulnerability scan (task infosec)', async ({ page }) => {
    await page.locator('nav .nav-item').getByText('Security Scanning', { exact: true }).click();

    // Click SCAN ALL button (replaces old "Run Security Scan")
    const runBtn = page.getByRole('button', { name: 'SCAN ALL' });
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Verify it transitions to running
    await expect(page.locator('#vuln-status')).toContainText('Running');

    // Verify log contents starts streaming
    const logOutput = page.locator('#vuln-log-output');
    await expect(logOutput).toContainText('task infosec', { timeout: 15000 });
  });
});
