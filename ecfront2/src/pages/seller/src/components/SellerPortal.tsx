import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
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
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  Search,
  Bell,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  MoreVertical,
  Plus,
  Store,
} from "lucide-react";
import { AddProductPage } from "./AddProductPage";
import { useNavigate } from "react-router-dom";

// Mock data
const dashboardStats = [
  {
    title: "Total Revenue",
    value: "$45,231",
    change: "+20.1%",
    trend: "up" as const,
    icon: DollarSign,
  },
  {
    title: "Orders",
    value: "156",
    change: "+12.5%",
    trend: "up" as const,
    icon: ShoppingCart,
  },
  {
    title: "Products",
    value: "48",
    change: "-2.4%",
    trend: "down" as const,
    icon: Package,
  },
  {
    title: "Customers",
    value: "1,234",
    change: "+8.2%",
    trend: "up" as const,
    icon: Users,
  },
];

const recentOrders = [
  { id: "#3210", customer: "John Smith", product: "Wireless Headphones", amount: "$129.99", status: "completed" },
  { id: "#3209", customer: "Emma Wilson", product: "Smart Watch", amount: "$299.99", status: "processing" },
  { id: "#3208", customer: "Michael Brown", product: "Laptop Stand", amount: "$49.99", status: "completed" },
  { id: "#3207", customer: "Sarah Davis", product: "USB-C Cable", amount: "$19.99", status: "pending" },
  { id: "#3206", customer: "James Miller", product: "Keyboard", amount: "$89.99", status: "completed" },
];

const products = [
  { id: 1, name: "Wireless Headphones", price: "$129.99", stock: 45, status: "active" },
  { id: 2, name: "Smart Watch", price: "$299.99", stock: 23, status: "active" },
  { id: 3, name: "Laptop Stand", price: "$49.99", stock: 67, status: "active" },
  { id: 4, name: "USB-C Cable", price: "$19.99", stock: 156, status: "active" },
  { id: 5, name: "Keyboard", price: "$89.99", stock: 12, status: "low stock" },
  { id: 6, name: "Mouse Pad", price: "$24.99", stock: 89, status: "active" },
];

export function SellerPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddProduct, setShowAddProduct] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "low stock":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  // If showing add product page, render it instead of the main portal
  if (showAddProduct) {
    return (
      <div className="min-h-screen bg-blue-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-slate-900">Seller Portal</h1>
                <p className="text-slate-500">My Store</p>
              </div>
            </div>
          </div>
        </header>
        <main className="p-8">
          <AddProductPage onBack={() => setShowAddProduct(false)} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900">Seller Portal</h1>
              <p className="text-slate-500">My Store</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search products, orders..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600">JS</span>
                  </div>
                  <span>John Seller</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/seller/login')} className="cursor-pointer">
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
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "products"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <Package className="w-5 h-5" />
              <span>Products</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "orders"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Orders</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === "settings"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-slate-900 mb-1">Dashboard Overview</h2>
                <p className="text-slate-600">Welcome back! Here's what's happening with your store.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardStats.map((stat) => (
                  <Card key={stat.title}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-slate-600 mb-1">{stat.title}</p>
                          <p className="text-slate-900">{stat.value}</p>
                        </div>
                        <div className={`p-2 rounded-lg ${stat.trend === "up" ? "bg-green-100" : "bg-red-100"}`}>
                          <stat.icon className={`w-5 h-5 ${stat.trend === "up" ? "text-green-600" : "text-red-600"}`} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-4">
                        {stat.trend === "up" ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`${stat.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                          {stat.change}
                        </span>
                        <span className="text-slate-500">from last month</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>You have {recentOrders.length} orders this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.id}</TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell>{order.product}</TableCell>
                          <TableCell>{order.amount}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
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

          {/* Products Tab */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-slate-900 mb-1">Products</h2>
                  <p className="text-slate-600">Manage your product inventory</p>
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowAddProduct(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.price}</TableCell>
                          <TableCell>{product.stock}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={getStatusColor(product.status)}>
                              {product.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-slate-900 mb-1">Orders</h2>
                  <p className="text-slate-600">View and manage all orders</p>
                </div>
                <Tabs defaultValue="all" className="w-auto">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="processing">Processing</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.id}</TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell>{order.product}</TableCell>
                          <TableCell>{order.amount}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
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

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-slate-900 mb-1">Settings</h2>
                <p className="text-slate-600">Manage your store settings and preferences</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Store Information</CardTitle>
                  <CardDescription>Update your store details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-slate-700">Store Name</label>
                    <Input defaultValue="My Store" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-700">Store Email</label>
                    <Input type="email" defaultValue="store@example.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-700">Phone Number</label>
                    <Input type="tel" defaultValue="+1 (555) 000-0000" />
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}