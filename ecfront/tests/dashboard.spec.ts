import { test, expect, Page } from '@playwright/test';
import { resolveDashboardTarget, dashboardUrl } from '../src/dashboardTarget';

/**
 * In dev the dashboard is proxied under localhost/dashboard; in cloud it has its
 * own host and is served at the root. dash() hides that difference so the specs
 * below read the same in both. Set DASHBOARD_BASE_URL to point at a deployment.
 */
const TARGET = resolveDashboardTarget(process.env);
const dash = (path: string) => dashboardUrl(path, TARGET);

/**
 * Cloud requires an admin login (the console can exec into pods, so it is not
 * open to the internet). Dev and local k8s are open and skip this entirely.
 * Credentials come from the environment — never from the repo.
 */
async function loginIfRequired(page: Page) {
  const caps = await page.request.get(dash('/api/capabilities'));
  if (!caps.ok()) return;
  const { authRequired } = await caps.json();
  if (!authRequired) return;

  const email = process.env.DASHBOARD_ADMIN_USER;
  const password = process.env.DASHBOARD_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'This dashboard requires a login, but DASHBOARD_ADMIN_USER / ' +
      'DASHBOARD_ADMIN_PASSWORD are not set.',
    );
  }

  const res = await page.request.post(dash('/api/auth/login'), {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`Dashboard login failed: ${res.status()} ${await res.text()}`);
  }
}

/**
 * What the dashboard under test can actually do. The panels backed by the Docker
 * socket or the mounted repo workspace (Local CI, Security Scanning, DB
 * export/import, …) only exist in DEV; a dashboard deployed to Kubernetes hides
 * them on purpose. Read the capabilities so the suite is meaningful against both
 * runtimes instead of asserting DEV-only UI everywhere.
 */
type Caps = {
  mode: string;
  ci: boolean;
  tests: boolean;
  security: string[];
  dbExportImport: boolean;
  containers: { startStop: boolean; exec: boolean };
};

async function getCaps(page: Page): Promise<Caps> {
  const res = await page.request.get(dash('/api/capabilities'));
  return res.json();
}

test.describe('Dashboard Enhancements Spec', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Dashboard
    await loginIfRequired(page);
    await page.goto(dash('/'));
    await expect(page.locator('.logo')).toContainText('mockten');
  });

  test('should load and navigate through sidebar views', async ({ page }) => {
    const caps = await getCaps(page);

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
      // These three are DEV-only; a deployed dashboard hides them.
      ...(caps.ci ? [{ name: 'Local CI Pipelines', title: 'Local CI Pipelines' }] : []),
      ...(caps.tests ? [{ name: 'E2E Test Runner', title: 'E2E Test Runner' }] : []),
      ...(caps.security.length ? [{ name: 'Security Scanning', title: 'Security Scanning' }] : []),
    ];

    for (const view of views) {
      const navItem = page.locator('nav .nav-item').getByText(view.name, { exact: true });
      await expect(navItem).toBeVisible();
      await navItem.click();
      
      // Verify appropriate topbar view title
      await expect(page.locator('#view-title')).toContainText(view.title);
    }
  });

  test('mode badge names the runtime and survives navigation', async ({ page }) => {
    // The DEV and k8s dashboards deliberately differ, and both answer on
    // localhost — without a label you cannot tell "hidden by design" from
    // "broken". The badge used to be appended to #view-title, which showView()
    // rewrites on every navigation, so it vanished on the first click.
    const caps = await getCaps(page);
    const badge = page.locator('#mode-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(caps.mode === 'docker' ? 'DEV' : 'K8S');

    await page.locator('nav .nav-item').getByText('Topology', { exact: true }).click();
    await expect(page.locator('#view-title')).toContainText('Service Topology');
    await expect(badge).toBeVisible(); // must outlive the title rewrite
  });

  test('DEV exposes the workspace-backed panels (Local CI, E2E, Security)', async ({ page }) => {
    // The counterpart to the k8s gating: in DEV all three must be present. Guards
    // against over-hiding, which would be invisible to every other test here.
    const caps = await getCaps(page);
    test.skip(caps.mode !== 'docker', 'DEV-only assertion');

    for (const name of ['Local CI Pipelines', 'E2E Test Runner', 'Security Scanning']) {
      await expect(page.locator('nav .nav-item').getByText(name, { exact: true })).toBeVisible();
    }
    await expect(page.locator('#frontend-card')).toBeVisible();
  });

  test('Kong telemetry reports real traffic (not a silent empty)', async ({ page, request }) => {
    // The access log used to be read with `docker exec apigw …`, which cannot
    // work in a cluster — and since this panel isn't capability-gated, the
    // failure rendered as "no requests recorded yet" rather than "unavailable",
    // so it looked like the gateway had no traffic. Generate some and insist it
    // is counted, in whichever runtime.
    for (let i = 0; i < 3; i++) await request.get('/api/categories');

    await expect(async () => {
      const res = await request.get(dash('/api/telemetry'));
      expect(res.ok()).toBeTruthy();
      const { kong } = await res.json();
      expect(kong.topApis.length, 'topApis is empty — the access log was not read').toBeGreaterThan(0);
      // The traffic we just made must be in there.
      expect(kong.topApis.some((a: any) => a.path === '/api/categories')).toBeTruthy();
    }).toPass({ timeout: 20000 });
  });

  test('Total Memory Usage percentage is sane in either runtime', async ({ page }) => {
    // This number has been wrong twice, in opposite directions, and nothing here
    // noticed: summing the per-container limits gave 3.1% in k8s (21 pods each
    // reporting the whole node), then taking their max gave 430% in DEV (the
    // stack's usage over one 820MB container's cap). The denominator must be the
    // machine's memory, so the figure has to land in a believable range in both.
    await page.locator('nav .nav-item').getByText('Dashboard', { exact: true }).click();
    const card = page.locator('.card', { hasText: 'Total Memory Usage' });
    await expect(card).toBeVisible();

    // Sample across several live refreshes and require EVERY reading to be sane.
    // Not expect.toPass(): that retries until something succeeds, so the card's
    // first (server-rendered, correct) value would mask the wrong figure the
    // client computes a few seconds later — which is exactly how 430% shipped.
    const seen: number[] = [];
    for (let i = 0; i < 6; i++) {
      const text = await card.innerText();
      const m = text.match(/([\d.]+)\s*MB\s*\(([\d.]+)%\)/);
      if (m) {
        const mb = parseFloat(m[1]);
        const pct = parseFloat(m[2]);
        if (mb > 0) {
          seen.push(pct);
          // A real fraction of the machine: not ~0 (denominator over-counted by
          // summing every container's view) and never >100 (denominator smaller
          // than what's being measured).
          expect(pct, `memory % out of range (samples: ${seen.join(', ')})`).toBeGreaterThan(1);
          expect(pct, `memory % over 100 (samples: ${seen.join(', ')})`).toBeLessThanOrEqual(100);
        }
      }
      await page.waitForTimeout(2500);
    }
    expect(seen.length, 'never read a memory figure').toBeGreaterThan(0);
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

  // Querying works in either runtime — the DB Viewer talks to MySQL directly.
  test('should run SQL Query', async ({ page }) => {
    await page.locator('nav .nav-item').getByText('DB Viewer', { exact: true }).click();
    await page.waitForSelector('#mysql-tables-ul', { timeout: 10000 });

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
  });

  // Export shells out to `docker exec … mysqldump`, so it only exists in DEV.
  test('should Export MySQL Dump', async ({ page }) => {
    const caps = await getCaps(page);
    test.skip(!caps.dbExportImport, `DB export is not available in ${caps.mode} mode`);

    await page.locator('nav .nav-item').getByText('DB Viewer', { exact: true }).click();
    await page.waitForSelector('#mysql-tables-ul', { timeout: 10000 });

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
    const resp = await request.get(dash('/api/pipeline/runs?limit=5'));
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
    const apiRes = await request.get(dash('/api/db/mysql/tables'));
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

  test('should respond 200 to reset-stock endpoint (critical for ie2e)', async ({ page, request }) => {
    // reset-stock is a Vite dev-server middleware (ecfront/vite.config.ts, gated
    // on TEST_MODE), not a platform API — so it cannot exist where the frontend
    // is a built bundle. It's test scaffolding, not a user-facing scenario, so
    // skip rather than invent a k8s equivalent.
    const caps = await getCaps(page);
    test.skip(!caps.frontendDev, `reset-stock is a Vite dev-server route; absent in ${caps.mode} mode`);

    // This endpoint is the linchpin for ie2e stock reset — if it's broken, Buy Now is disabled
    const res = await request.post('/api/test/reset-stock');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('dashboard should be reachable and not 502 (memory regression guard)', async ({ page }) => {
    // 502 means dashboard OOM-killed — this test catches mem_limit regressions
    const res = await page.goto(dash('/'));
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('.logo')).toContainText('mockten', { timeout: 10000 });
  });

  test('should execute vulnerability scan (task infosec)', async ({ page }) => {
    // Every scan runs `docker run …` against the mounted workspace, so the panel
    // only exists in DEV; a deployed dashboard leaves scanning to the pipeline.
    const caps = await getCaps(page);
    test.skip(!caps.security.length, `Security scanning is not available in ${caps.mode} mode`);

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

  test('API Specifications: no route renders as undefined or raw JSON body', async ({ page }) => {
    await page.locator('nav .nav-item').getByText('API Specifications', { exact: true }).click();
    await expect(page.locator('#view-title')).toContainText('API Specifications');

    // Wait for the route list to populate from Kong spec.
    await page.waitForSelector('#api-list-ul .db-list-item', { timeout: 15000 });
    const items = page.locator('#api-list-ul .db-list-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const text = (await items.nth(i).innerText()).trim();
      expect(text.toLowerCase()).not.toContain('undefined');
      await items.nth(i).click();
      // Every route must render a real path — guards against the phantom
      // "<METHOD> undefined" entries (e.g. cors plugins leaking in as routes).
      const title = (await page.locator('#api-detail-title').innerText()).trim();
      expect(title.toLowerCase(), `route #${i} title`).not.toContain('undefined');
      expect(title.length).toBeGreaterThan(0);
      // No route may fall back to a raw JSON body editor — every request-bearing
      // route must expose a proper GUI form (Test Request Backdoor).
      const rawJsonVisible = await page.locator('#api-test-body').isVisible().catch(() => false);
      expect(rawJsonVisible, `route "${title}" must use a form, not raw JSON`).toBe(false);
    }
  });

  test('API Specifications: Send Request returns 2xx for core GET endpoints', async ({ page }) => {
    await page.locator('nav .nav-item').getByText('API Specifications', { exact: true }).click();
    await page.waitForSelector('#api-list-ul .db-list-item', { timeout: 15000 });

    // Curated safe GET endpoints that should answer 2xx with auto-filled params.
    const targets = [
      'GET /api/stats',
      'GET /api/search',
      'GET /api/categories',
      'GET /api/seller/stats',
      'GET /api/seller/orders',
      'GET /api/seller/products',
      'GET /api/seller/profile',
      'GET /api/seller/categories',
    ];

    const items = page.locator('#api-list-ul .db-list-item');
    const count = await items.count();

    for (const target of targets) {
      let matched = false;
      for (let i = 0; i < count; i++) {
        const text = (await items.nth(i).innerText()).replace(/\s+/g, ' ').trim();
        if (text === target) {
          matched = true;
          await items.nth(i).click();
          // Wait for async-filled params (e.g. seller token) to finish loading
          // so the request is sent with a valid Authorization header.
          await page.waitForFunction(() => {
            const inputs = Array.from(document.querySelectorAll('.api-gui-input')) as HTMLInputElement[];
            return inputs.every(el => el.value !== 'Loading...');
          }, { timeout: 20000 });
          await page.getByRole('button', { name: 'Send Request' }).click();
          // Response panel should report a 2xx status.
          await expect(page.locator('#api-test-response'), `${target} response`).toContainText(
            /Status:\s*2\d\d/,
            { timeout: 20000 }
          );
          break;
        }
      }
      expect(matched, `route present: ${target}`).toBe(true);
    }
  });

  test('API Specifications: Send Request returns 2xx for write + admin endpoints', async ({ page }) => {
    await page.locator('nav .nav-item').getByText('API Specifications', { exact: true }).click();
    await page.waitForSelector('#api-list-ul .db-list-item', { timeout: 15000 });

    // The write endpoints and the newer admin/ranking APIs. These previously
    // 400/500'd from the GUI because their schemas didn't match the real backend
    // contract, and nothing caught it — the suite only exercised GETs.
    const targets = [
      'POST /api/payment-method',     // attaches Stripe test PM pm_card_visa
      'PUT /api/payment-method',      // -> /api/payment-method/default
      'DELETE /api/payment-method',   // needs a real saved card id
      'PUT /api/geo',                 // needs a real geo_id
      'POST /api/shipment',           // needs product_id + geo_id
      'POST /api/ranking',            // -> /api/ranking/update
      'POST /api/admin/audit',
      'GET /api/admin/orders',
      'GET /api/admin/audit',
      'GET /api/admin/health',
      'GET /api/admin/seller',
      'GET /api/uam/groups',
    ];

    const items = page.locator('#api-list-ul .db-list-item');
    const count = await items.count();

    for (const target of targets) {
      let matched = false;
      for (let i = 0; i < count; i++) {
        const text = (await items.nth(i).innerText()).replace(/\s+/g, ' ').trim();
        if (text === target) {
          matched = true;
          await items.nth(i).click();
          // Wait for the dynamic ids (token, geo_id, payment-method id, product id)
          // to resolve so the request carries real data.
          await page.waitForFunction(() => {
            const inputs = Array.from(document.querySelectorAll('.api-gui-input')) as HTMLInputElement[];
            return inputs.every(el => el.value !== 'Loading...');
          }, { timeout: 20000 });
          await page.getByRole('button', { name: 'Send Request' }).click();
          await expect(page.locator('#api-test-response'), `${target} response`).toContainText(
            /Status:\s*2\d\d/,
            { timeout: 20000 }
          );
          break;
        }
      }
      expect(matched, `route present: ${target}`).toBe(true);
    }
  });

  test('API Specifications: image upload (new API) Send Request returns 2xx', async ({ page }) => {
    await page.locator('nav .nav-item').getByText('API Specifications', { exact: true }).click();
    await page.waitForSelector('#api-list-ul .db-list-item', { timeout: 15000 });

    // Find the multipart image-upload route (POST .../images) by its rendered path.
    const items = page.locator('#api-list-ul .db-list-item');
    const count = await items.count();
    let selected = false;
    for (let i = 0; i < count; i++) {
      const text = (await items.nth(i).innerText()).replace(/\s+/g, ' ').trim();
      if (/^POST\b/.test(text) && /\/images$/.test(text)) {
        await items.nth(i).click();
        selected = true;
        break;
      }
    }
    expect(selected, 'POST .../images route present').toBe(true);

    // Wait for the seller token + product id to auto-fill.
    await page.waitForFunction(() => {
      const inputs = Array.from(document.querySelectorAll('.api-gui-input')) as HTMLInputElement[];
      return inputs.length > 0 && inputs.every(el => el.value !== 'Loading...');
    }, { timeout: 20000 });

    await page.getByRole('button', { name: 'Send Request' }).click();
    await expect(page.locator('#api-test-response'), 'image upload response').toContainText(
      /Status:\s*2\d\d/,
      { timeout: 20000 }
    );
  });
});
