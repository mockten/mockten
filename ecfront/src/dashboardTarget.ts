/**
 * Where the E2E suite should look for the Developer Dashboard.
 *
 * The two deployments differ in more than the hostname. In dev the dashboard is
 * reverse-proxied under one origin at /dashboard, and the proxy strips that
 * prefix before the app sees it. In cloud the dashboard has a host to itself and
 * is served at the root, so the same prefix would 404 — switching only the host
 * is not enough.
 *
 * Kept as a pure function of the environment so it can be unit-tested without a
 * browser or a cluster; tests/dashboard.spec.ts consumes it through dash().
 */
export interface DashboardTarget {
  /** Origin to prepend, or '' to stay relative to Playwright's baseURL. */
  origin: string;
  /** Path prefix the dashboard is mounted under, '' when it owns the host. */
  prefix: string;
}

export function resolveDashboardTarget(
  env: { DASHBOARD_BASE_URL?: string; PLAYWRIGHT_BASE_URL?: string } = {},
): DashboardTarget {
  const explicit = String(env.DASHBOARD_BASE_URL || '').trim().replace(/\/+$/, '');
  if (explicit) return { origin: explicit, prefix: '' };

  // No explicit override: derive the dashboard host from the base URL, but only
  // when the base URL is a real deployment. Anything local keeps the dev shape.
  const base = String(env.PLAYWRIGHT_BASE_URL || '').trim();
  if (base) {
    try {
      const u = new URL(base);
      const host = u.hostname;
      // `nginx` is the compose reverse proxy the in-Docker suite (task ie2e) runs
      // against — the dev shape, same as localhost. Without it the host-split
      // below invents `dashboard.nginx`, which resolves nowhere and fails every
      // dashboard spec. A real cloud deployment always has a dotted public
      // domain, so a single-label host can never be the split case anyway.
      const isLocal =
        host === 'localhost' || host === '127.0.0.1' || host === 'nginx' ||
        host.endsWith('.local') || !host.includes('.');
      if (!isLocal) {
        const bare = host.startsWith('mockten.') ? host.slice('mockten.'.length) : host;
        return { origin: `${u.protocol}//dashboard.${bare}`, prefix: '' };
      }
    } catch {
      // Not a parseable URL — fall through to the dev shape.
    }
  }

  return { origin: '', prefix: '/dashboard' };
}

/** Build a dashboard URL for `path` ('/' or '/api/...'). */
export function dashboardUrl(path: string, target: DashboardTarget): string {
  return `${target.origin}${target.prefix}${path}`;
}
