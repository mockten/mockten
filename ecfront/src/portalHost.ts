/**
 * Which portal the current host is supposed to serve.
 *
 * In dev (compose and local k8s) every portal shares one origin, so the router
 * serves all of them and this module must not change a thing. In cloud the same
 * bundle is served on four separate hosts, and each host may only render its own
 * portal — otherwise admin.<domain>/ would serve the storefront and the
 * storefront host would expose the admin login to the public internet.
 *
 * The domain is never baked into the bundle: it arrives at runtime via
 * /config.js, which docker-entrypoint.sh renders from the container's env.
 */
export type Portal = 'all' | 'storefront' | 'sales' | 'admin';

interface AppConfig {
  MOCKTEN_MODE?: string;
  PUBLIC_BASE_DOMAIN?: string;
}

function config(): AppConfig {
  return (window as unknown as { __APP_CONFIG__?: AppConfig }).__APP_CONFIG__ || {};
}

/** True only when this deployment is the internet-facing one. */
export function isCloud(): boolean {
  return String(config().MOCKTEN_MODE || '').trim().toLowerCase() === 'cloud';
}

export function baseDomain(): string {
  return String(config().PUBLIC_BASE_DOMAIN || '').trim().replace(/\.$/, '');
}

/**
 * Falls back to 'all' whenever we are not positively in cloud mode with a known
 * domain. The Vite dev server never renders /config.js, so dev gets 'all' by
 * construction rather than by configuration.
 */
export function currentPortal(hostname: string = window.location.hostname): Portal {
  if (!isCloud() || !baseDomain()) return 'all';
  const h = hostname.toLowerCase();
  if (h.startsWith('sales.')) return 'sales';
  if (h.startsWith('admin.')) return 'admin';
  return 'storefront';
}

/** Absolute origin of the host that serves `portal`, or null outside cloud. */
export function portalOrigin(portal: Exclude<Portal, 'all'>): string | null {
  const d = baseDomain();
  if (!isCloud() || !d) return null;
  if (portal === 'sales') return `https://sales.${d}`;
  if (portal === 'admin') return `https://admin.${d}`;
  return `https://${d}`;
}

/** Which portal a path belongs to. */
export function portalForPath(pathname: string): Exclude<Portal, 'all'> {
  if (pathname === '/seller' || pathname.startsWith('/seller/')) return 'sales';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  return 'storefront';
}

/**
 * Where the browser must go instead of `pathname` on this host, or null to stay.
 *
 * Cross-portal paths redirect to the same path on the owning host rather than
 * 404ing, so existing deep links and bookmarks keep working. A bare '/' on a
 * portal host lands on that portal's entry point.
 */
export function redirectTarget(
  pathname: string,
  hostname: string = window.location.hostname,
): string | null {
  const here = currentPortal(hostname);
  if (here === 'all') return null;

  if (pathname === '/') {
    if (here === 'sales') return '/seller/login';
    if (here === 'admin') return '/admin';
    return null;
  }

  const owner = portalForPath(pathname);
  if (owner === here) return null;

  const origin = portalOrigin(owner);
  return origin ? `${origin}${pathname}` : null;
}
