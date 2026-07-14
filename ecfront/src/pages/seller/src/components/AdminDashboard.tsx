import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
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
  Package,
  AlertTriangle,
  Activity,
  Database,
  Server,
  MoreVertical,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  UserPlus,
  Edit,
  Trash2,
} from "lucide-react";

interface AdminDashboardProps {
  onLogout: () => void;
  onCreateUser?: () => void;
  onEditUser?: (userId: number) => void;
}

// Mock data for admin dashboard
const systemStats = [
  { title: "Total Users", value: "1,847", status: "normal", icon: Users },
  { title: "Active Orders", value: "234", status: "normal", icon: ShoppingCart },
  { title: "Total Products", value: "3,421", status: "normal", icon: Package },
  { title: "System Alerts", value: "3", status: "warning", icon: AlertTriangle },
];

const systemHealth = [
  { name: "Database", status: "operational", uptime: "99.9%", icon: Database },
  { name: "API Server", status: "operational", uptime: "99.8%", icon: Server },
  { name: "File Storage", status: "operational", uptime: "100%", icon: Package },
  { name: "Payment Gateway", status: "degraded", uptime: "97.2%", icon: Activity },
];

const recentUsers = [
  { id: 1, name: "John Seller", email: "john@example.com", role: "Seller", status: "active", joined: "2025-11-03" },
  { id: 2, name: "Emma Store", email: "emma@example.com", role: "Seller", status: "active", joined: "2025-11-02" },
  { id: 3, name: "Mike Shop", email: "mike@example.com", role: "Seller", status: "suspended", joined: "2025-11-01" },
  { id: 4, name: "Sarah Market", email: "sarah@example.com", role: "Seller", status: "active", joined: "2025-10-30" },
  { id: 5, name: "James Trading", email: "james@example.com", role: "Seller", status: "pending", joined: "2025-10-29" },
];

const activityLogs = [
  { id: 1, action: "User Login", user: "john@example.com", timestamp: "2025-11-05 14:32:15", status: "success" },
  { id: 2, action: "Product Added", user: "emma@example.com", timestamp: "2025-11-05 14:25:43", status: "success" },
  { id: 3, action: "Failed Login Attempt", user: "unknown@example.com", timestamp: "2025-11-05 14:18:22", status: "failed" },
  { id: 4, action: "Order Placed", user: "mike@example.com", timestamp: "2025-11-05 14:10:55", status: "success" },
  { id: 5, action: "Account Suspended", user: "admin@example.com", timestamp: "2025-11-05 13:55:12", status: "warning" },
];

const flaggedOrders = [
  { id: "#5432", customer: "suspicious@email.com", amount: "$9,999.99", reason: "High value", time: "10 min ago" },
  { id: "#5431", customer: "test@test.com", amount: "$1,234.56", reason: "Multiple attempts", time: "25 min ago" },
  { id: "#5429", customer: "buyer@mail.com", amount: "$567.89", reason: "Unusual location", time: "1 hour ago" },
];

export function AdminDashboard({ onLogout, onCreateUser, onEditUser }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);

  const handleDeleteClick = (userId: number, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      console.log("Deleting user:", userToDelete.id);
      // In a real app, this would call an API to delete the user
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "success":
      case "operational":
        return "bg-green-100 text-green-800";
      case "suspended":
      case "failed":
      case "degraded":
        return "bg-red-100 text-red-800";
      case "pending":
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
      case "success":
      case "operational":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "suspended":
      case "failed":
      case "degraded":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "pending":
      case "warning":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-red-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-red-600 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900">Admin Dashboard</h1>
              <p className="text-slate-500">System Control Panel</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search users, orders, products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              Admin
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600">AD</span>
                  </div>
                  <span>Administrator</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] p-4">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "overview"
                  ? "bg-red-50 text-red-600"
                  : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <Activity className="w-5 h-5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "users"
                  ? "bg-red-50 text-red-600"
                  : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <Users className="w-5 h-5" />
              <span>User Management</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "orders"
                  ? "bg-red-50 text-red-600"
                  : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Order Monitoring</span>
            </button>

            <button
              onClick={() => setActiveTab("system")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "system"
                  ? "bg-red-50 text-red-600"
                  : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <Server className="w-5 h-5" />
              <span>System Health</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "logs"
                  ? "bg-red-50 text-red-600"
                  : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <Activity className="w-5 h-5" />
              <span>Activity Logs</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-slate-900 mb-1">System Overview</h2>
                <p className="text-slate-600">Monitor your platform's health and activity</p>
              </div>

              {/* System Alerts */}
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">System Alert</AlertTitle>
                <AlertDescription className="text-amber-800">
                  Payment gateway is experiencing degraded performance. Response times increased by 15%.
                </AlertDescription>
              </Alert>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {systemStats.map((stat) => (
                  <Card key={stat.title}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-slate-600 mb-1">{stat.title}</p>
                          <p className="text-slate-900">{stat.value}</p>
                        </div>
                        <div className={`p-2 rounded-lg ${stat.status === "warning" ? "bg-amber-100" : "bg-blue-100"
                          }`}>
                          <stat.icon className={`w-5 h-5 ${stat.status === "warning" ? "text-amber-600" : "text-blue-600"
                            }`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Flagged Orders */}
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
                        <TableHead>Time</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flaggedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.id}</TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell>{order.amount}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              {order.reason}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">{order.time}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-slate-900 mb-1">User Management</h2>
                  <p className="text-slate-600">View and manage all platform users</p>
                </div>
                <div>
                  <Button variant="outline" size="sm" onClick={onCreateUser}>
                    <UserPlus className="w-4 h-4 mr-2" />
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
                      {recentUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(user.status)}
                              <Badge variant="secondary" className={getStatusColor(user.status)}>
                                {user.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500">{user.joined}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEditUser?.(user.id)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-amber-600">
                                  <Ban className="w-4 h-4 mr-2" />
                                  Suspend Account
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(user.id, user.name)}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-slate-900 mb-1">Order Monitoring</h2>
                <p className="text-slate-600">Monitor all orders and transactions</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Flagged Orders</CardTitle>
                  <CardDescription>Orders requiring immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flaggedOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.id}</TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell>{order.amount}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              {order.reason}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">{order.time}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              Investigate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* System Health Tab */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-slate-900 mb-1">System Health</h2>
                <p className="text-slate-600">Monitor system components and performance</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {systemHealth.map((system) => (
                  <Card key={system.name}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${system.status === "operational" ? "bg-green-100" : "bg-red-100"
                            }`}>
                            <system.icon className={`w-5 h-5 ${system.status === "operational" ? "text-green-600" : "text-red-600"
                              }`} />
                          </div>
                          <div>
                            <p className="text-slate-900">{system.name}</p>
                            <p className="text-slate-500">Uptime: {system.uptime}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className={getStatusColor(system.status)}>
                          {system.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(system.status)}
                        <span className="text-slate-600">
                          {system.status === "operational" ? "All systems normal" : "Degraded performance"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Activity Logs Tab */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-slate-900 mb-1">Activity Logs</h2>
                <p className="text-slate-600">View all system activities and user actions</p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>{log.user}</TableCell>
                          <TableCell className="text-slate-500">{log.timestamp}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(log.status)}
                              <Badge variant="secondary" className={getStatusColor(log.status)}>
                                {log.status}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}