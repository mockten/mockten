'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard authentication — cloud mode only.
//
// In DEV and in a local k8s cluster the dashboard is only reachable from the
// operator's own machine, so it runs open. In cloud it is on the public
// internet, and it is not a read-only status page: it exposes the container
// list, live logs, a DB viewer with row-level CRUD, Access Management, and a
// terminal that can `exec` into any pod in the namespace. That has to be behind
// a login, and "the hostname is hard to guess" is not a control. (The deployment
// is also IP-allowlisted at the load balancer, but that is a deployment-time
// convenience, not this app's security model.)
//
// Credentials are the Admin portal's: a Keycloak password grant, then a check
// that the account actually has realm-management rights — a customer or seller
// token is rejected even though it authenticates fine.
//
// The session is a signed cookie holding no privileges of its own: the Keycloak
// token stays server-side in memory, so a stolen cookie cannot be replayed
// against Keycloak directly, and every restart invalidates all sessions.
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require('crypto');

const COOKIE_NAME = 'mockten_dash_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h, matching a working day

// Signing key. Deliberately random per boot unless one is supplied: there is no
// safe default to hardcode, and losing sessions on restart is the right trade.
const SECRET = process.env.DASHBOARD_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

/** sid -> { expiresAt, user } . Tokens never leave the server. */
const sessions = new Map();

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

function makeCookie(sid) {
  const sig = sign(sid);
  // Secure: cloud is always HTTPS. SameSite=Lax still allows top-level
  // navigation to the console while blocking cross-site form posts.
  return `${COOKIE_NAME}=${sid}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`;
}

function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** Parse and verify the session cookie off a raw request. Works for WS too. */
function sessionFrom(req) {
  const raw = req.headers?.cookie || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (!m) return null;

  const [sid, sig] = m[1].split('.');
  if (!sid || !sig) return null;

  // Constant-time compare so the signature can't be probed byte by byte.
  const expected = sign(sid);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const s = sessions.get(sid);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { sessions.delete(sid); return null; }
  return s;
}

/**
 * Verify credentials against Keycloak and confirm the account is an admin.
 *
 * The realm has no `admin` role — admins are identified by admin-group
 * membership — so rather than reproduce that lookup we ask Keycloak a question
 * only an admin-capable token can answer: list the realm's groups. A customer's
 * or seller's token authenticates but is refused there, which is exactly the
 * distinction we need.
 */
async function verifyAdmin(apigwBaseUrl, email, password) {
  const tokenRes = await fetch(`${apigwBaseUrl}/api/uam/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: email, password }),
  });
  if (!tokenRes.ok) return { ok: false, error: 'Invalid email or password.' };

  const data = await tokenRes.json();
  const token = data.access_token;
  if (!token) return { ok: false, error: 'Invalid email or password.' };

  const groupsRes = await fetch(`${apigwBaseUrl}/api/uam/groups`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!groupsRes.ok) {
    return { ok: false, error: 'This account is not an administrator.' };
  }
  return { ok: true, token };
}

function createSession(user) {
  const sid = crypto.randomBytes(24).toString('base64url');
  sessions.set(sid, { expiresAt: Date.now() + SESSION_TTL_MS, user });
  return sid;
}

// ── Login page ───────────────────────────────────────────────────────────────
// Self-contained (no external CSS/JS) so it needs no unauthenticated asset
// whitelist — everything else on the origin stays behind the guard.
const LOGIN_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>mockten dashboard — sign in</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#0b0f1a; color:#e2e8f0;
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  form { background:#131a2b; padding:32px; border-radius:12px; width:320px;
         box-shadow:0 10px 40px rgba(0,0,0,.5); }
  h1 { margin:0 0 4px; font-size:19px; }
  p.sub { margin:0 0 22px; font-size:13px; color:#94a3b8; }
  label { display:block; font-size:12px; margin:14px 0 6px; color:#cbd5e1; }
  input { width:100%; box-sizing:border-box; padding:10px; border-radius:6px;
          border:1px solid #2a3550; background:#0b0f1a; color:#e2e8f0; font-size:14px; }
  button { width:100%; margin-top:22px; padding:11px; border:0; border-radius:6px;
           background:#4f46e5; color:#fff; font-weight:600; font-size:14px; cursor:pointer; }
  button:disabled { opacity:.6; cursor:default; }
  .err { margin-top:14px; font-size:13px; color:#f87171; min-height:18px; }
</style></head><body>
<form id="f">
  <h1>mockten dashboard</h1>
  <p class="sub">Sign in with your administrator account.</p>
  <label for="email">Email</label>
  <input id="email" name="email" autocomplete="username" autofocus required>
  <label for="password">Password</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required>
  <button id="b" type="submit">Sign in</button>
  <div class="err" id="e"></div>
</form>
<script>
document.getElementById('f').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const b = document.getElementById('b'), e = document.getElementById('e');
  b.disabled = true; e.textContent = '';
  try {
    const res = await fetch('./api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      }),
    });
    if (res.ok) { location.replace('./'); return; }
    const d = await res.json().catch(() => ({}));
    e.textContent = d.error || 'Sign in failed.';
  } catch { e.textContent = 'Sign in failed.'; }
  b.disabled = false;
});
</script></body></html>`;

/**
 * Wire authentication into the app.
 * @param enabled  false in DEV/local-k8s: everything below becomes a no-op.
 */
function install(app, { enabled, apigwBaseUrl }) {
  if (!enabled) {
    return {
      enabled: false,
      // Nothing is gated, so the WS guard always passes.
      allowsUpgrade: () => true,
    };
  }

  // Reachable without a session: the login page, the login/status calls, and
  // capabilities (the UI reads it to decide what to render, including whether
  // to show a sign-out button). Nothing here exposes platform state.
  const PUBLIC_PATHS = new Set(['/login', '/api/auth/login', '/api/auth/status', '/api/capabilities']);

  app.get('/login', (req, res) => {
    if (sessionFrom(req)) return res.redirect('./');
    res.type('html').send(LOGIN_HTML);
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
      const result = await verifyAdmin(apigwBaseUrl, email, password);
      if (!result.ok) return res.status(401).json({ error: result.error });
      res.setHeader('Set-Cookie', makeCookie(createSession(email)));
      res.json({ ok: true });
    } catch (e) {
      console.error('[auth] login failed:', e.message);
      res.status(500).json({ error: 'Sign in is unavailable right now.' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    const raw = req.headers?.cookie || '';
    const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;.]+)`));
    if (m) sessions.delete(m[1]);
    res.setHeader('Set-Cookie', clearCookie());
    res.json({ ok: true });
  });

  app.get('/api/auth/status', (req, res) => {
    const s = sessionFrom(req);
    res.json({ required: true, authenticated: !!s, user: s?.user ?? null });
  });

  // The guard itself. Mounted before the static console and every API route, so
  // adding a new route can't accidentally ship unauthenticated.
  app.use((req, res, next) => {
    if (PUBLIC_PATHS.has(req.path)) return next();
    if (sessionFrom(req)) return next();
    // XHR gets a 401 to act on; a browser navigation gets the login page.
    // /ws/ counts as the former: a real upgrade never reaches this middleware
    // (Node routes it to the 'upgrade' event, guarded by allowsUpgrade below),
    // but a plain GET to a /ws/ path does, and answering it with a redirect is
    // misleading — WebSocket clients don't follow redirects, so 401 is the
    // honest answer for anything under /ws/.
    if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    res.redirect('./login');
  });

  return {
    enabled: true,
    // WebSocket upgrades carry cookies, so the same session check applies —
    // this is what keeps /ws/exec (pod exec) from being an unauthenticated
    // remote shell.
    allowsUpgrade: req => !!sessionFrom(req),
  };
}

module.exports = { install };
