import { describe, it, expect, afterEach } from 'vitest';
import { currentPortal, portalForPath, redirectTarget } from './portalHost';

/**
 * The Vitest environment is "node", so there is no window until we make one.
 * That is not a workaround — a bare global with no __APP_CONFIG__ is exactly
 * what the Vite dev server serves, so the "dev" cases below run against the
 * real dev shape rather than a mock of it.
 */
function setConfig(cfg: Record<string, string> | null) {
  (globalThis as Record<string, unknown>).window = cfg === null
    ? { location: { hostname: 'localhost' } }
    : { location: { hostname: 'localhost' }, __APP_CONFIG__: cfg };
}

afterEach(() => { delete (globalThis as Record<string, unknown>).window; });

const CLOUD = { MOCKTEN_MODE: 'cloud', PUBLIC_BASE_DOMAIN: 'example.test' };

describe('dev (no /config.js, as served by Vite)', () => {
  it('serves every portal from one origin', () => {
    setConfig(null);
    expect(currentPortal('localhost')).toBe('all');
  });

  it('never redirects, whatever the path', () => {
    setConfig(null);
    for (const p of ['/', '/search', '/seller/login', '/seller/portal', '/admin', '/admin/dashboard']) {
      expect(redirectTarget(p, 'localhost')).toBeNull();
    }
  });

  it('still serves every portal when the container runs without cloud mode', () => {
    setConfig({ MOCKTEN_MODE: '', PUBLIC_BASE_DOMAIN: '' });
    expect(currentPortal('localhost')).toBe('all');
    expect(redirectTarget('/admin', 'localhost')).toBeNull();
  });

  // Both halves of the guard need their own case. Testing only the missing
  // domain lets a broken isCloud() pass, because the domain check short-circuits
  // first — an injected `isCloud() { return true }` survived the suite until
  // this case existed.
  it('does not switch to cloud on PUBLIC_BASE_DOMAIN alone, without cloud mode', () => {
    setConfig({ MOCKTEN_MODE: '', PUBLIC_BASE_DOMAIN: 'example.test' });
    expect(currentPortal('admin.example.test')).toBe('all');
    expect(redirectTarget('/admin', 'admin.example.test')).toBeNull();
    expect(redirectTarget('/seller/login', 'mockten.example.test')).toBeNull();
    expect(redirectTarget('/', 'sales.example.test')).toBeNull();
  });

  it('does not switch to cloud on MOCKTEN_MODE alone, without a domain', () => {
    setConfig({ MOCKTEN_MODE: 'cloud', PUBLIC_BASE_DOMAIN: '' });
    expect(currentPortal('mockten.example.test')).toBe('all');
    expect(redirectTarget('/admin', 'mockten.example.test')).toBeNull();
  });
});

describe('cloud host -> portal', () => {
  it('maps each host to its own portal', () => {
    setConfig(CLOUD);
    expect(currentPortal('example.test')).toBe('storefront');
    expect(currentPortal('mockten.example.test')).toBe('storefront');
    expect(currentPortal('sales.example.test')).toBe('sales');
    expect(currentPortal('admin.example.test')).toBe('admin');
  });

  it('is case-insensitive about the host', () => {
    setConfig(CLOUD);
    expect(currentPortal('Admin.Example.Test')).toBe('admin');
  });
});

describe('cloud: a host serves only its own portal', () => {
  it('sends the storefront host away from the other portals', () => {
    setConfig(CLOUD);
    expect(redirectTarget('/admin', 'mockten.example.test'))
      .toBe('https://admin.example.test/admin');
    expect(redirectTarget('/admin/dashboard', 'mockten.example.test'))
      .toBe('https://admin.example.test/admin/dashboard');
    expect(redirectTarget('/seller/login', 'mockten.example.test'))
      .toBe('https://sales.example.test/seller/login');
  });

  it('sends the admin host away from storefront and sales paths', () => {
    setConfig(CLOUD);
    expect(redirectTarget('/search', 'admin.example.test'))
      .toBe('https://example.test/search');
    expect(redirectTarget('/seller/portal', 'admin.example.test'))
      .toBe('https://sales.example.test/seller/portal');
  });

  it('leaves a host alone on its own paths', () => {
    setConfig(CLOUD);
    expect(redirectTarget('/admin/user/create', 'admin.example.test')).toBeNull();
    expect(redirectTarget('/seller/portal', 'sales.example.test')).toBeNull();
    expect(redirectTarget('/item/42', 'mockten.example.test')).toBeNull();
  });

  it('lands "/" on each portal entry point', () => {
    setConfig(CLOUD);
    expect(redirectTarget('/', 'sales.example.test')).toBe('/seller/login');
    expect(redirectTarget('/', 'admin.example.test')).toBe('/admin');
    expect(redirectTarget('/', 'mockten.example.test')).toBeNull();
  });

  it('redirects rather than 404s, preserving the deep-linked path', () => {
    setConfig(CLOUD);
    const target = redirectTarget('/admin/user/edit/abc123', 'mockten.example.test');
    expect(target).toBe('https://admin.example.test/admin/user/edit/abc123');
  });
});

describe('path ownership', () => {
  it('does not let a lookalike prefix escape to another portal', () => {
    // "/administrators" is not an admin path, and "/sellers" is not a sales one.
    expect(portalForPath('/administrators')).toBe('storefront');
    expect(portalForPath('/sellers')).toBe('storefront');
    expect(portalForPath('/admin')).toBe('admin');
    expect(portalForPath('/seller')).toBe('sales');
  });
});
