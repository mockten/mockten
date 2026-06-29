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
      { name: 'Local CI Pipelines', title: 'Local CI Pipelines' },
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

  test('should show Data Pipeline Run History', async ({ page, request }) => {
    await page.locator('nav .nav-item').getByText('Data Pipeline', { exact: true }).click();

    // Verify pipeline page loaded
    await expect(page.locator('#view-title')).toContainText('Data Pipeline', { timeout: 10000 });

    // The Run History section should be visible
    const runHistorySection = page.locator('text=Run History');
    await expect(runHistorySection).toBeVisible({ timeout: 10000 });

    // API should return run data (not empty / not "Loading...")
    const resp = await request.get('/dashboard/api/pipeline/runs?limit=5');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('dag_runs');
    expect(Array.isArray(body.dag_runs)).toBe(true);
    // At least one run should exist (from task build's pipeline trigger)
    expect(body.dag_runs.length).toBeGreaterThan(0);

    // The UI should not show "Loading..." after data loads
    await page.waitForFunction(() => {
      const el = document.getElementById('pipeline-runs-table');
      return el && !el.textContent?.includes('Loading...');
    }, { timeout: 15000 });
  });

  test('should show DashboardMetrics table in DB Viewer (MySQL persistence)', async ({ page, request }) => {
    // Verify DashboardMetrics exists in the MySQL tables API
    const apiRes = await request.get('/dashboard/api/db/mysql/tables');
    expect(apiRes.status()).toBe(200);
    const tables = await apiRes.json();
    expect(Array.isArray(tables)).toBe(true);
    const names = tables.map((t: any) => t.name);
    expect(names).toContain('DashboardMetrics');

    // Then verify the UI shows DashboardMetrics in the table list
    await page.locator('nav .nav-item').getByText('DB Viewer', { exact: true }).click();
    await page.waitForSelector('#mysql-tables-ul', { timeout: 15000 });

    // Wait for DashboardMetrics to appear in the list
    await page.waitForFunction(() => {
      const ul = document.getElementById('mysql-tables-ul');
      if (!ul) return false;
      return Array.from(ul.querySelectorAll('.db-list-item')).some(
        el => el.textContent?.includes('DashboardMetrics')
      );
    }, { timeout: 15000 });
  });

  test('should respond 200 to reset-stock endpoint (critical for ie2e)', async ({ request }) => {
    // This endpoint is the linchpin for ie2e stock reset — if it's broken, Buy Now is disabled
    const res = await request.post('/api/test/reset-stock');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('dashboard should be reachable and not 502 (memory regression guard)', async ({ page }) => {
    // 502 means dashboard OOM-killed — this test catches mem_limit regressions
    const res = await page.goto('/dashboard/');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('.logo')).toContainText('mockten', { timeout: 10000 });
  });

  test('should execute vulnerability scan (task infosec)', async ({ page }) => {
    await page.locator('nav .nav-item').getByText('Security Scanning', { exact: true }).click();

    // Select "Scan All" type, then click Run
    const scanAllBtn = page.getByRole('button', { name: 'Scan All' });
    await expect(scanAllBtn).toBeVisible();
    await scanAllBtn.click();

    const runBtn = page.locator('#vuln-run-btn');
    await expect(runBtn).toBeVisible();
    await runBtn.click();

    // Verify it transitions to running
    await expect(page.locator('#vuln-status')).toContainText('Running', { timeout: 10000 });

    // Verify log contents starts streaming
    const logOutput = page.locator('#vuln-log-output');
    await expect(logOutput).toContainText('Starting security scan', { timeout: 15000 });
  });
});
