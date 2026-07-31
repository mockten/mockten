import { describe, it, expect } from 'vitest';
import { resolveDashboardTarget, dashboardUrl } from './dashboardTarget';

const url = (path: string, env: Parameters<typeof resolveDashboardTarget>[0]) =>
  dashboardUrl(path, resolveDashboardTarget(env));

describe('dev', () => {
  it('stays relative and keeps the /dashboard prefix', () => {
    expect(resolveDashboardTarget({})).toEqual({ origin: '', prefix: '/dashboard' });
    expect(url('/', {})).toBe('/dashboard/');
    expect(url('/api/capabilities', {})).toBe('/dashboard/api/capabilities');
  });

  it('keeps the dev shape for every local base URL', () => {
    // `nginx` is the compose proxy the in-Docker (ie2e) suite targets; a single-
    // label host is never a real cloud deployment, so it must stay the dev shape
    // rather than becoming dashboard.nginx.
    for (const base of ['http://localhost', 'http://localhost:3000', 'http://127.0.0.1', 'http://nginx']) {
      expect(url('/api/telemetry', { PLAYWRIGHT_BASE_URL: base }))
        .toBe('/dashboard/api/telemetry');
    }
  });

  it('falls back to the dev shape rather than throwing on a junk base URL', () => {
    expect(url('/', { PLAYWRIGHT_BASE_URL: 'not a url' })).toBe('/dashboard/');
  });

  it('ignores an empty override', () => {
    expect(url('/', { DASHBOARD_BASE_URL: '   ' })).toBe('/dashboard/');
  });
});

describe('cloud', () => {
  it('drops the prefix, because the dashboard owns its host there', () => {
    const env = { DASHBOARD_BASE_URL: 'https://dashboard.example.test' };
    expect(url('/', env)).toBe('https://dashboard.example.test/');
    // The prefix must not survive: the cloud dashboard serves at the root and
    // /dashboard/api/... would 404.
    expect(url('/api/capabilities', env)).toBe('https://dashboard.example.test/api/capabilities');
  });

  it('tolerates a trailing slash on the override', () => {
    expect(url('/api/x', { DASHBOARD_BASE_URL: 'https://dashboard.example.test/' }))
      .toBe('https://dashboard.example.test/api/x');
  });

  it('derives the dashboard host from a deployed base URL', () => {
    expect(url('/api/x', { PLAYWRIGHT_BASE_URL: 'https://mockten.example.test' }))
      .toBe('https://dashboard.example.test/api/x');
    expect(url('/api/x', { PLAYWRIGHT_BASE_URL: 'https://example.test' }))
      .toBe('https://dashboard.example.test/api/x');
  });

  it('lets an explicit override beat derivation', () => {
    expect(url('/', {
      DASHBOARD_BASE_URL: 'https://dash.other.test',
      PLAYWRIGHT_BASE_URL: 'https://mockten.example.test',
    })).toBe('https://dash.other.test/');
  });
});
