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

function mapUser(u: KcUser): AdminUser {
  const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || "—";
  const email = u.email || u.username || "—";
  const attrs = u.attributes || {};
  let role = "User";
  if ((u.username || "").toLowerCase() === "superadmin") role = "Admin";
  else if (attrs.storeName || attrs.description) role = "Seller";
  const status = u.enabled === false ? "suspended" : "active";
  const joined = u.createdTimestamp
    ? new Date(u.createdTimestamp).toISOString().slice(0, 10)
    : "";
  return { id: u.id, name, email, role, status, joined };
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch("/api/uam/users?max=200&briefRepresentation=false", {
    headers: adminHeaders(),
  });
  if (!res.ok) throw new Error(`users ${res.status}`);
  const users: KcUser[] = await res.json();
  return users.map(mapUser);
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string; // seller | admin | user
  enabled: boolean;
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

  const body = {
    username: input.email,
    email: input.email,
    enabled: input.enabled,
    emailVerified: true,
    firstName: input.firstName,
    lastName: input.lastName,
    credentials: [{ type: "password", value: input.password, temporary: false }],
    groups,
    attributes,
  };

  const res = await fetch("/api/uam/users", {
    method: "POST",
    headers: { ...adminHeaders(), "Content-Type": "application/json" },
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
  const res = await fetch(`/api/uam/users/${encodeURIComponent(userId)}`, { headers: adminHeaders() });
  if (!res.ok) return null;
  return res.json();
}

export async function updateUser(
  userId: string,
  fields: { firstName?: string; lastName?: string; email?: string; enabled?: boolean },
  target: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/uam/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { ...adminHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  await postAudit("User Updated", target, res.ok ? "success" : "failed");
  if (!res.ok) return { ok: false, error: (await res.text()) || `Error ${res.status}` };
  return { ok: true };
}

export async function deleteUser(userId: string, target: string): Promise<boolean> {
  const res = await fetch(`/api/uam/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  await postAudit("User Deleted", target, res.ok ? "warning" : "failed");
  return res.ok;
}

export async function setUserEnabled(userId: string, enabled: boolean, target: string): Promise<boolean> {
  const res = await fetch(`/api/uam/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { ...adminHeaders(), "Content-Type": "application/json" },
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
  reason: string;
  flagged: boolean;
  created_at: string;
}

export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const res = await fetch("/api/admin/orders?limit=100", { headers: adminHeaders() });
  if (!res.ok) throw new Error(`orders ${res.status}`);
  const data = await res.json();
  return data.orders || [];
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
  const res = await fetch("/api/admin/health", { headers: adminHeaders() });
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

export async function fetchAudit(): Promise<AuditEntry[]> {
  const res = await fetch("/api/admin/audit?limit=100", { headers: adminHeaders() });
  if (!res.ok) throw new Error(`audit ${res.status}`);
  const data = await res.json();
  return data.logs || [];
}
