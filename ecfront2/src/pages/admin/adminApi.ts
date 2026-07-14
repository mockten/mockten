// Admin Portal API helpers — real Keycloak / backend integration.
//
// Admin authentication reuses Keycloak (password grant). A user counts as an
// admin if their token can call the Keycloak Admin REST API (GET /api/uam/users),
// which requires realm-management rights (the admin-group / superadmin).

const TOKEN_URL = "/api/uam/token";

export function getAdminToken(): string | null {
  return localStorage.getItem("admin_access_token");
}

export function getAdminEmail(): string {
  return localStorage.getItem("admin_email") || "Administrator";
}

export function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function isAdminAuthed(): boolean {
  return !!getAdminToken();
}

// Refresh the admin access token using the stored refresh token. Keycloak
// access tokens are short-lived, so this keeps the session alive instead of
// the dashboard silently emptying out when the token expires.
async function refreshAdminToken(): Promise<boolean> {
  const refresh = localStorage.getItem("admin_refresh_token");
  if (!refresh) return false;
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.access_token) return false;
    localStorage.setItem("admin_access_token", data.access_token);
    if (data.refresh_token) localStorage.setItem("admin_refresh_token", data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

/**
 * fetch wrapper that always sends the admin bearer and transparently refreshes
 * it once on 401/403 (expired token). If refresh fails, the admin tokens are
 * cleared so the route guard sends the user back to /admin/login.
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const withAuth = (): RequestInit => ({
    ...init,
    headers: { ...(init.headers || {}), ...adminHeaders() },
  });
  let res = await fetch(input, withAuth());
  if (res.status === 401 || res.status === 403) {
    if (await refreshAdminToken()) {
      res = await fetch(input, withAuth());
    }
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("admin_access_token");
      localStorage.removeItem("admin_refresh_token");
    }
  }
  return res;
}

/** Fire-and-forget audit log entry. */
export async function postAudit(action: string, target = "", status = "success"): Promise<void> {
  try {
    await fetch("/api/admin/audit", {
      method: "POST",
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ action, target, status }),
    });
  } catch {
    /* non-fatal */
  }
}

export interface AdminLoginResult {
  ok: boolean;
  error?: string;
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResult> {
  // 1. Authenticate with Keycloak.
  const params = new URLSearchParams({ username: email, password });
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!tokenRes.ok) {
    return { ok: false, error: "Invalid credentials." };
  }
  const data = await tokenRes.json();
  const accessToken: string = data.access_token;
  const refreshToken: string = data.refresh_token || "";
  if (!accessToken) return { ok: false, error: "Invalid credentials." };

  // 2. Verify admin rights: the token must be able to reach the Keycloak Admin API.
  const verify = await fetch("/api/uam/users?max=1", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!verify.ok) {
    return { ok: false, error: "This account does not have administrator access." };
  }

  localStorage.setItem("admin_access_token", accessToken);
  localStorage.setItem("admin_refresh_token", refreshToken);
  localStorage.setItem("admin_email", email);
  await postAudit("Admin Login");
  return { ok: true };
}

export async function adminLogout(): Promise<void> {
  await postAudit("Admin Logout");
  localStorage.removeItem("admin_access_token");
  localStorage.removeItem("admin_refresh_token");
  localStorage.removeItem("admin_email");
}

// ── Users (Keycloak Admin REST API via Kong) ─────────────────────────────────

export interface KcUser {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  createdTimestamp?: number;
  attributes?: Record<string, string[]>;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
}

export function mapUser(u: KcUser): AdminUser {
  const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || "—";
  const email = u.email || u.username || "—";
  const attrs = u.attributes || {};
  let role = "User";
  if ((u.username || "").toLowerCase() === "superadmin") role = "Admin";
  else if (attrs.storeName || attrs.description) role = "Seller";
  // enabled=false + status=pending → awaiting approval; enabled=false otherwise → suspended.
  const isPending = (attrs.status || []).includes("pending");
  const status = u.enabled === false ? (isPending ? "pending" : "suspended") : "active";
  const joined = u.createdTimestamp
    ? new Date(u.createdTimestamp).toISOString().slice(0, 10)
    : "";
  return { id: u.id, name, email, role, status, joined };
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await adminFetch("/api/uam/users?max=500&briefRepresentation=false");
  if (!res.ok) throw new Error(`users ${res.status}`);
  const users: KcUser[] = await res.json();
  return users.map(mapUser);
}

/** Approve a pending account: enable it and clear the pending marker. */
export async function approveUser(userId: string, target: string): Promise<boolean> {
  const current = await getUser(userId);
  const attrs = current?.attributes || {};
  delete attrs.status;
  const res = await adminFetch(`/api/uam/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: true, attributes: attrs }),
  });
  await postAudit("Seller Approved", target, res.ok ? "success" : "failed");
  return res.ok;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string; // seller | admin | user
  status: string; // active | pending | suspended
  phone?: string;
  companyName?: string;
  notes?: string;
}

export async function createUser(input: CreateUserInput): Promise<{ ok: boolean; error?: string }> {
  const groups: string[] = [];
  if (input.role === "seller") groups.push("Seller");
  if (input.role === "admin") groups.push("admin-group");
  if (input.role === "user") groups.push("Customer");

  const attributes: Record<string, string[]> = {};
  if (input.phone) attributes.phonenum = [input.phone];
  if (input.companyName) attributes.storeName = [input.companyName];
  if (input.notes) attributes.notes = [input.notes];
  // "pending" accounts are created disabled and marked; "suspended" is disabled.
  const enabled = input.status === "active";
  if (input.status === "pending") attributes.status = ["pending"];

  const body = {
    username: input.email,
    email: input.email,
    enabled,
    emailVerified: true,
    firstName: input.firstName,
    lastName: input.lastName,
    credentials: [{ type: "password", value: input.password, temporary: false }],
    groups,
    attributes,
  };

  const res = await adminFetch("/api/uam/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    await postAudit("User Created", input.email, "failed");
    return { ok: false, error: txt || `Error ${res.status}` };
  }
  await postAudit("User Created", input.email);
  return { ok: true };
}

export async function getUser(userId: string): Promise<KcUser | null> {
  const res = await adminFetch(`/api/uam/users/${encodeURIComponent(userId)}`);
  if (!res.ok) return null;
  return res.json();
}

/** Store name lives in the Keycloak `storeName` user attribute. */
export function getStoreName(u: KcUser | null): string {
  return u?.attributes?.storeName?.[0] || "";
}

export async function updateUser(
  userId: string,
  fields: { firstName?: string; lastName?: string; email?: string; enabled?: boolean; storeName?: string },
  target: string
): Promise<{ ok: boolean; error?: string }> {
  const body: Record<string, unknown> = {
    firstName: fields.firstName,
    lastName: fields.lastName,
    email: fields.email,
    enabled: fields.enabled,
  };
  // Merge storeName into the existing attributes so we don't wipe others.
  if (fields.storeName !== undefined) {
    const current = await getUser(userId);
    const attrs = current?.attributes || {};
    attrs.storeName = [fields.storeName];
    body.attributes = attrs;
  }
  const res = await adminFetch(`/api/uam/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await postAudit("User Updated", target, res.ok ? "success" : "failed");
  if (!res.ok) return { ok: false, error: (await res.text()) || `Error ${res.status}` };
  return { ok: true };
}

export async function deleteUser(userId: string, target: string): Promise<boolean> {
  const res = await adminFetch(`/api/uam/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  await postAudit("User Deleted", target, res.ok ? "warning" : "failed");
  return res.ok;
}

export async function setUserEnabled(userId: string, enabled: boolean, target: string): Promise<boolean> {
  const res = await adminFetch(`/api/uam/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  await postAudit(enabled ? "Account Reactivated" : "Account Suspended", target, res.ok ? "warning" : "failed");
  return res.ok;
}

// ── Orders / Health / Audit ──────────────────────────────────────────────────

export interface AdminOrder {
  order_id: string;
  user_id: string;
  amount: number;
  status: string;
  country: string;
  reason: string;
  flagged: boolean;
  created_at: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
}

export async function fetchAdminOrders(page = 1, limit = 10): Promise<Paged<AdminOrder>> {
  const res = await adminFetch(`/api/admin/orders?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error(`orders ${res.status}`);
  const data = await res.json();
  return { items: data.orders || [], total: data.total || 0 };
}

export interface HealthComponent {
  name: string;
  status: string;
  detail: string;
}

export interface HealthResponse {
  components: HealthComponent[];
  alerts: string[];
  metrics: { products: number; orders: number; outOfStock: number; dbPingMs: number };
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await adminFetch("/api/admin/health");
  if (!res.ok) throw new Error(`health ${res.status}`);
  return res.json();
}

export interface AuditEntry {
  id: number;
  action: string;
  actor: string;
  target: string;
  status: string;
  timestamp: string;
}

export async function fetchAudit(page = 1, limit = 10): Promise<Paged<AuditEntry>> {
  const res = await adminFetch(`/api/admin/audit?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error(`audit ${res.status}`);
  const data = await res.json();
  return { items: data.logs || [], total: data.total || 0 };
}
