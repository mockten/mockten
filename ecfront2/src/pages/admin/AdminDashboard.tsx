import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
  Shield,
  LogOut,
  Search,
  Users,
  ShoppingCart,
  AlertTriangle,
  Activity,
  Server,
  MoreVertical,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Edit,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  isAdminAuthed,
  getAdminEmail,
  adminLogout,
  fetchUsers,
  deleteUser,
  setUserEnabled,
  approveUser,
  fetchAdminOrders,
  fetchHealth,
  fetchAudit,
  AdminUser,
  AdminOrder,
  HealthResponse,
  AuditEntry,
} from "./adminApi";

interface AdminDashboardProps {
  onLogout: () => void;
  onCreateUser?: () => void;
  onEditUser?: (userId: string) => void;
}

const PAGE = 10;

export function AdminDashboard({ onLogout, onCreateUser, onEditUser }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string; email: string } | null>(null);
  const [investigateOrder, setInvestigateOrder] = useState<AdminOrder | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userStatusFilter, setUserStatusFilter] = useState("All");
  const [userPage, setUserPage] = useState(1);

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdminAuthed()) onLogout();
  }, [onLogout]);

  const loadUsers = useCallback(async () => {
    try { setUsers(await fetchUsers()); } catch { /* token/redirect handled in adminFetch */ }
    if (!isAdminAuthed()) onLogout();
  }, [onLogout]);

  const loadOrders = useCallback(async (page: number) => {
    try {
      const p = await fetchAdminOrders(page, PAGE);
      setOrders(p.items);
      setOrdersTotal(p.total);
    } catch { /* handled */ }
  }, []);

  const loadLogs = useCallback(async (page: number) => {
    try {
      const p = await fetchAudit(page, PAGE);
      setLogs(p.items);
      setLogsTotal(p.total);
    } catch { /* handled */ }
  }, []);

  const loadHealth = useCallback(async () => {
    try { setHealth(await fetchHealth()); } catch { /* handled */ }
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([loadUsers(), loadOrders(ordersPage), loadLogs(logsPage), loadHealth()]);
    setLoading(false);
  }, [loadUsers, loadOrders, loadLogs, loadHealth, ordersPage, logsPage]);

  useEffect(() => { reloadAll(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { loadOrders(ordersPage); }, [ordersPage, loadOrders]);
  useEffect(() => { loadLogs(logsPage); }, [logsPage, loadLogs]);

  const handleLogout = async () => {
    await adminLogout();
    onLogout();
  };

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      await deleteUser(userToDelete.id, userToDelete.email);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    }
  };

  const handleSuspend = async (u: AdminUser) => {
    await setUserEnabled(u.id, u.status === "suspended", u.email);
    loadUsers();
  };

  const handleApprove = async (u: AdminUser) => {
    await approveUser(u.id, u.email);
    loadUsers();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": case "success": case "operational": case "delivered":
        return "bg-green-100 text-green-800";
      case "suspended": case "failed": case "degraded": case "canceled": case "refunded":
        return "bg-red-100 text-red-800";
      case "pending": case "warning": case "paid": case "created":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": case "success": case "operational":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "suspended": case "failed": case "degraded":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "pending": case "warning":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredUsers = users.filter((u) => {
    if (userStatusFilter !== "All" && u.status !== userStatusFilter.toLowerCase()) return false;
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });
  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE));
  const pagedUsers = filteredUsers.slice((userPage - 1) * PAGE, userPage * PAGE);

  const ordersTotalPages = Math.max(1, Math.ceil(ordersTotal / PAGE));
  const logsTotalPages = Math.max(1, Math.ceil(logsTotal / PAGE));
  const pendingCount = users.filter((u) => u.status === "pending").length;

  const systemStats = [
    { title: "Total Users", value: String(users.length), status: "normal", icon: Users },
    { title: "Pending Approvals", value: String(pendingCount), status: pendingCount > 0 ? "warning" : "normal", icon: Clock },
    { title: "Flagged Orders", value: String(ordersTotal), status: ordersTotal > 0 ? "warning" : "normal", icon: ShoppingCart },
    { title: "System Alerts", value: String(health?.alerts.length ?? 0), status: (health?.alerts.length ?? 0) > 0 ? "warning" : "normal", icon: AlertTriangle },
  ];

  const Pagination = ({ page, totalPages, total, onPrev, onNext }: { page: number; totalPages: number; total: number; onPrev: () => void; onNext: () => void }) => (
    totalPages > 1 ? (
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-slate-500">Page {page} of {totalPages} ({total} total)</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={onPrev}>Previous</Button>
          <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={onNext}>Next</Button>
        </div>
      </div>
    ) : null
  );

  return (
    <div className="min-h-screen bg-red-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-red-600 rounded-lg shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold leading-tight text-slate-900" style={{ fontSize: "1.25rem", lineHeight: 1.2 }}>Admin Dashboard</h1>
              <p className="text-xs text-slate-500 leading-tight">System Control Panel</p>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input type="search" placeholder="Search users..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setUserPage(1); }} className="pl-10 h-9 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={reloadAll} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Reload
            </Button>
            <Badge variant="secondary" className="bg-red-100 text-red-800">Admin</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-9 px-2">
                  <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-red-600 text-xs font-semibold">AD</span>
                  </div>
                  <span className="text-sm max-w-[160px] truncate">{getAdminEmail()}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-52 bg-white border-r border-slate-200 min-h-[calc(100vh-57px)] p-3">
          <nav className="space-y-1">
            {[
              { key: "overview", label: "Overview", icon: Activity },
              { key: "users", label: "User Management", icon: Users },
              { key: "orders", label: "Order Monitoring", icon: ShoppingCart },
              { key: "system", label: "System Health", icon: Server },
              { key: "logs", label: "Activity Logs", icon: Activity },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab === item.key ? "bg-red-50 text-red-600" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {/* Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-slate-900 mb-1">System Overview</h2>
                <p className="text-slate-600">Monitor your platform's health and activity</p>
              </div>

              {(health?.alerts.length ?? 0) > 0 && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-900">System Alert</AlertTitle>
                  <AlertDescription className="text-amber-800">
                    <ul className="list-disc pl-4 space-y-1">
                      {health!.alerts.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {systemStats.map((stat) => (
                  <Card key={stat.title}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-slate-600 mb-1">{stat.title}</p>
                          <p className="text-slate-900">{stat.value}</p>
                        </div>
                        <div className={`p-2 rounded-lg ${stat.status === "warning" ? "bg-amber-100" : "bg-blue-100"}`}>
                          <stat.icon className={`w-5 h-5 ${stat.status === "warning" ? "text-amber-600" : "text-blue-600"}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Flagged Orders</CardTitle>
                  <CardDescription>Orders requiring investigation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.slice(0, 5).map((order) => (
                        <TableRow key={order.order_id}>
                          <TableCell className="font-mono text-xs">{order.order_id}</TableCell>
                          <TableCell>{order.user_id}</TableCell>
                          <TableCell>${order.amount.toFixed(2)}</TableCell>
                          <TableCell><Badge variant="secondary" className="bg-red-100 text-red-800">{order.reason}</Badge></TableCell>
                          <TableCell className="text-slate-500">{order.created_at}</TableCell>
                        </TableRow>
                      ))}
                      {!loading && orders.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No flagged orders</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Management */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-slate-900 mb-1">User Management</h2>
                  <p className="text-slate-600">View and manage all platform users ({users.length})</p>
                </div>
                <div className="flex items-center gap-3">
                  <Tabs value={userStatusFilter} onValueChange={(v) => { setUserStatusFilter(v); setUserPage(1); }}>
                    <TabsList>
                      <TabsTrigger value="All">All</TabsTrigger>
                      <TabsTrigger value="Active">Active</TabsTrigger>
                      <TabsTrigger value="Pending">Pending</TabsTrigger>
                      <TabsTrigger value="Suspended">Suspended</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button size="sm" className="!text-white gap-2" style={{ backgroundColor: "#dc2626" }} onClick={onCreateUser}>
                    <UserPlus className="w-4 h-4" />
                    Add User
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(user.status)}
                              <Badge variant="secondary" className={getStatusColor(user.status)}>{user.status}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500">{user.joined}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {user.status === "pending" && (
                                  <DropdownMenuItem className="text-green-600" onClick={() => handleApprove(user)}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => onEditUser?.(user.id)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-amber-600" onClick={() => handleSuspend(user)}>
                                  <Ban className="w-4 h-4 mr-2" />
                                  {user.status === "suspended" ? "Reactivate Account" : "Suspend Account"}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => { setUserToDelete({ id: user.id, name: user.name, email: user.email }); setDeleteDialogOpen(true); }}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {loading && pagedUsers.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8"><span className="inline-flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</span></TableCell></TableRow>
                      )}
                      {!loading && pagedUsers.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No users found</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <Pagination page={userPage} totalPages={userTotalPages} total={filteredUsers.length} onPrev={() => setUserPage((p) => p - 1)} onNext={() => setUserPage((p) => p + 1)} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Order Monitoring */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-slate-900 mb-1">Order Monitoring</h2>
                <p className="text-slate-600">Flagged orders that require investigation ({ordersTotal})</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Flagged Orders</CardTitle>
                  <CardDescription>Flagged rows require investigation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.order_id}>
                          <TableCell className="font-mono text-xs">{order.order_id}</TableCell>
                          <TableCell>{order.user_id}</TableCell>
                          <TableCell>${order.amount.toFixed(2)}</TableCell>
                          <TableCell><Badge variant="secondary" className={getStatusColor(order.status)}>{order.status}</Badge></TableCell>
                          <TableCell><Badge variant="secondary" className="bg-red-100 text-red-800">{order.reason}</Badge></TableCell>
                          <TableCell className="text-slate-500">{order.created_at}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setInvestigateOrder(order)}>Investigate</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {loading && orders.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-slate-500 py-8"><span className="inline-flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</span></TableCell></TableRow>
                      )}
                      {!loading && orders.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-slate-500 py-8">No flagged orders</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <Pagination page={ordersPage} totalPages={ordersTotalPages} total={ordersTotal} onPrev={() => setOrdersPage((p) => p - 1)} onNext={() => setOrdersPage((p) => p + 1)} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* System Health */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-slate-900 mb-1">System Health</h2>
                <p className="text-slate-600">Live component status and metrics</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(health?.components ?? []).map((system) => (
                  <Card key={system.name}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${system.status === "operational" ? "bg-green-100" : "bg-red-100"}`}>
                            <Server className={`w-5 h-5 ${system.status === "operational" ? "text-green-600" : "text-red-600"}`} />
                          </div>
                          <div>
                            <p className="text-slate-900">{system.name}</p>
                            <p className="text-slate-500">{system.detail}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className={getStatusColor(system.status)}>{system.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(system.status)}
                        <span className="text-slate-600">{system.status === "operational" ? "All systems normal" : "Degraded performance"}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!health || health.components.length === 0) && (
                  <p className="text-slate-500">{loading ? "Loading..." : "No health data"}</p>
                )}
              </div>
            </div>
          )}

          {/* Activity Logs */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-slate-900 mb-1">Activity Logs</h2>
                <p className="text-slate-600">Audit trail across all users — admins, sellers and customers ({logsTotal})</p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>{log.actor}</TableCell>
                          <TableCell className="text-slate-500">{log.target || "—"}</TableCell>
                          <TableCell className="text-slate-500">{log.timestamp}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(log.status)}
                              <Badge variant="secondary" className={getStatusColor(log.status)}>{log.status}</Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {loading && logs.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8"><span className="inline-flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</span></TableCell></TableRow>
                      )}
                      {!loading && logs.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No activity yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <Pagination page={logsPage} totalPages={logsTotalPages} total={logsTotal} onPrev={() => setLogsPage((p) => p - 1)} onNext={() => setLogsPage((p) => p + 1)} />
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user <strong>{userToDelete?.name}</strong> from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="!text-white" style={{ backgroundColor: "#dc2626" }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Investigate Order Modal */}
      {investigateOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setInvestigateOrder(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Investigate Order</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Order ID</span><span className="font-mono">{investigateOrder.order_id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Customer</span><span>{investigateOrder.user_id}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Amount</span><span>${investigateOrder.amount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><span>{investigateOrder.status}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Shipping country</span><span>{investigateOrder.country || "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Placed</span><span>{investigateOrder.created_at}</span></div>
              <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-3 text-red-800">
                <strong>Flag reason:</strong> {investigateOrder.reason}
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="outline" onClick={() => setInvestigateOrder(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
