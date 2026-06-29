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

const API_BASE = "/api/seller";

function getAuthHeaders() {
  const token = localStorage.getItem("seller_access_token");
  return { Authorization: `Bearer ${token}` };
}

export function SellerPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [sellerEmail, setSellerEmail] = useState("Seller");
  const [searchQuery, setSearchQuery] = useState("");

  // Stats
  const [stats, setStats] = useState<{
    current: { revenue: number; orders: number; products: number; customers: number };
    previous: { revenue: number; orders: number; products: number; customers: number };
    change: { revenue: number | null; orders: number | null; products: number | null; customers: number | null };
  } | null>(null);

  // Orders
  const [orders, setOrders] = useState<Array<{
    order_id: string; user_id: string; amount: number; status: string; created_at: string;
  }>>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState(10);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState("All");

  // Products
  const [products, setProducts] = useState<Array<{
    product_id: string; product_name: string; price: number; condition: string; stocks: number; status: string; is_active: number;
  }>>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsPage, setProductsPage] = useState(1);
  const [productsLimit, setProductsLimit] = useState(10);

  // Edit product modal
  const [editProduct, setEditProduct] = useState<{
    product_id: string; product_name: string; price: number; condition: string; stocks: number; status: string; is_active: number;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState(0);

  // Settings / Profile
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  // Load profile once
  useEffect(() => {
    const token = localStorage.getItem("seller_access_token");
    if (!token) {
      navigate("/seller/login");
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const email = payload.email || payload.preferred_username || "Seller";
      setSellerEmail(email);
      setProfileEmail(email);
    } catch {
      navigate("/seller/login");
    }

    // Load profile name
    fetch(`${API_BASE}/profile`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.seller_name) setProfileName(data.seller_name);
      })
      .catch(() => {});
  }, [navigate]);

  // Load stats
  const loadStats = useCallback(() => {
    fetch(`${API_BASE}/stats`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, []);

  // Load orders
  const loadOrders = useCallback(() => {
    const params = new URLSearchParams({
      page: String(ordersPage),
      limit: String(ordersLimit),
      status: ordersStatusFilter,
    });
    fetch(`${API_BASE}/orders?${params}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        setOrders(data.orders || []);
        setOrdersTotal(data.total || 0);
      })
      .catch(() => {});
  }, [ordersPage, ordersLimit, ordersStatusFilter]);

  // Load products
  const loadProducts = useCallback(() => {
    const params = new URLSearchParams({
      page: String(productsPage),
      limit: String(productsLimit),
    });
    fetch(`${API_BASE}/products?${params}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        setProducts(data.products || []);
        setProductsTotal(data.total || 0);
      })
      .catch(() => {});
  }, [productsPage, productsLimit]);

  useEffect(() => {
    if (activeTab === "overview") loadStats();
  }, [activeTab, loadStats]);

  useEffect(() => {
    if (activeTab === "orders") loadOrders();
  }, [activeTab, loadOrders]);

  useEffect(() => {
    if (activeTab === "products") loadProducts();
  }, [activeTab, loadProducts]);

  const handleLogout = () => {
    localStorage.removeItem("seller_access_token");
    localStorage.removeItem("seller_refresh_token");
    navigate("/seller/login");
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Delete this product?")) return;
    await fetch(`${API_BASE}/products/${productId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    loadProducts();
  };

  const handleToggleProductStatus = async (productId: string, currentIsActive: number) => {
    const newIsActive = currentIsActive === 1 ? 0 : 1;
    await fetch(`${API_BASE}/products/${productId}/status`, {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: newIsActive }),
    });
    loadProducts();
  };

  const handleEditSave = async () => {
    if (!editProduct) return;
    await fetch(`${API_BASE}/products/${editProduct.product_id}`, {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ product_name: editName, price: editPrice, summary: "" }),
    });
    setEditProduct(null);
    loadProducts();
  };

  const handleSaveProfile = async () => {
    await fetch(`${API_BASE}/profile`, {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ seller_name: profileName }),
    });
    alert("Profile saved!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": case "delivered": case "active":
        return "bg-green-100 text-green-800";
      case "processing": case "picking": case "shipped": case "paid":
        return "bg-blue-100 text-blue-800";
      case "pending": case "created":
        return "bg-yellow-100 text-yellow-800";
      case "canceled": case "refunded":
        return "bg-red-100 text-red-800";
      case "low stock":
        return "bg-orange-100 text-orange-800";
      case "out of stock":
        return "bg-red-100 text-red-800";
      case "inactive":
        return "bg-slate-200 text-slate-500";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formatPct = (val: number | null) => {
    if (val === null || val === undefined) return "N/A";
    return `${val > 0 ? "+" : ""}${val.toFixed(1)}%`;
  };

  const mapUIStatus = (dbStatus: string) => {
    switch (dbStatus) {
      case "created": case "paid": return "Pending";
      case "picking": case "shipped": return "Processing";
      case "delivered": return "Completed";
      case "canceled": case "refunded": return "Canceled";
      default: return dbStatus;
    }
  };

  // Filtered products/orders for search
  const filteredProducts = products.filter(p =>
    !searchQuery || p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredOrders = orders.filter(o =>
    !searchQuery ||
    o.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOrderPages = Math.ceil(ordersTotal / ordersLimit);
  const totalProductPages = Math.ceil(productsTotal / productsLimit);

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
          <AddProductPage onBack={() => { setShowAddProduct(false); loadProducts(); }} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Edit Product Modal */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Edit Product</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-700">Product Name</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-slate-700">Price ($)</label>
                <Input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="!bg-blue-600 hover:!bg-blue-700 !text-white" onClick={handleEditSave}>Save</Button>
              <Button variant="ghost" onClick={() => setEditProduct(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
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
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
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
                    <span className="text-blue-600">{sellerEmail.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <span>{sellerEmail}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => setActiveTab("settings")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
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
                {/* Revenue */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-600 mb-1">Total Revenue</p>
                        <p className="text-slate-900" data-testid="stat-revenue">
                          ${stats ? stats.current.revenue.toFixed(2) : "0.00"}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${(stats?.change.revenue ?? 0) >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                        <DollarSign className={`w-5 h-5 ${(stats?.change.revenue ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-4">
                      {(stats?.change.revenue ?? 0) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={(stats?.change.revenue ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatPct(stats?.change.revenue ?? null)}
                      </span>
                      <span className="text-slate-500">from last month</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Orders */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-600 mb-1">Orders</p>
                        <p className="text-slate-900" data-testid="stat-orders">
                          {stats ? stats.current.orders : 0}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${(stats?.change.orders ?? 0) >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                        <ShoppingCart className={`w-5 h-5 ${(stats?.change.orders ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-4">
                      {(stats?.change.orders ?? 0) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={(stats?.change.orders ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatPct(stats?.change.orders ?? null)}
                      </span>
                      <span className="text-slate-500">from last month</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Products Sold */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-600 mb-1">Products Sold</p>
                        <p className="text-slate-900" data-testid="stat-products">
                          {stats ? stats.current.products : 0}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${(stats?.change.products ?? 0) >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                        <Package className={`w-5 h-5 ${(stats?.change.products ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-4">
                      {(stats?.change.products ?? 0) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={(stats?.change.products ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatPct(stats?.change.products ?? null)}
                      </span>
                      <span className="text-slate-500">from last month</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Customers */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-slate-600 mb-1">Customers</p>
                        <p className="text-slate-900" data-testid="stat-customers">
                          {stats ? stats.current.customers : 0}
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg ${(stats?.change.customers ?? 0) >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                        <Users className={`w-5 h-5 ${(stats?.change.customers ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-4">
                      {(stats?.change.customers ?? 0) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={(stats?.change.customers ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatPct(stats?.change.customers ?? null)}
                      </span>
                      <span className="text-slate-500">from last month</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Orders</CardTitle>
                      <CardDescription>Your latest {orders.length} orders</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Per page:</span>
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={ordersLimit}
                        onChange={e => { setOrdersLimit(Number(e.target.value)); setOrdersPage(1); }}
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.order_id}>
                          <TableCell>{order.order_id}</TableCell>
                          <TableCell>{order.user_id}</TableCell>
                          <TableCell>${order.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={getStatusColor(order.status)}>
                              {mapUIStatus(order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.created_at}</TableCell>
                        </TableRow>
                      ))}
                      {filteredOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                            No orders found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {/* Pagination */}
                  {totalOrderPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-slate-500">
                        Page {ordersPage} of {totalOrderPages} ({ordersTotal} total)
                      </span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" disabled={ordersPage <= 1} onClick={() => setOrdersPage(p => p - 1)}>
                          Previous
                        </Button>
                        <Button variant="ghost" size="sm" disabled={ordersPage >= totalOrderPages} onClick={() => setOrdersPage(p => p + 1)}>
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
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
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Per page:</span>
                    <select
                      data-testid="products-per-page"
                      className="border rounded px-2 py-1 text-sm"
                      value={productsLimit}
                      onChange={e => { setProductsLimit(Number(e.target.value)); setProductsPage(1); }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <Button
                    className="!bg-blue-600 hover:!bg-blue-700 !text-white"
                    onClick={() => setShowAddProduct(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </div>
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
                      {filteredProducts.map((product) => (
                        <TableRow key={product.product_id}>
                          <TableCell>{product.product_name}</TableCell>
                          <TableCell>${product.price}</TableCell>
                          <TableCell>{product.stocks}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={getStatusColor(product.status)}>
                              {product.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid="product-menu-trigger">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditProduct(product);
                                  setEditName(product.product_name);
                                  setEditPrice(product.price);
                                }}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setShowAddProduct(true);
                                }}>Duplicate</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  data-testid={product.is_active === 1 ? "menu-deactivate" : "menu-activate"}
                                  onClick={() => handleToggleProductStatus(product.product_id, product.is_active)}
                                >
                                  {product.is_active === 1 ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDeleteProduct(product.product_id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredProducts.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                            No products found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {/* Pagination */}
                  {totalProductPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-slate-500">
                        Page {productsPage} of {totalProductPages} ({productsTotal} total)
                      </span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" disabled={productsPage <= 1} onClick={() => setProductsPage(p => p - 1)}>
                          Previous
                        </Button>
                        <Button variant="ghost" size="sm" disabled={productsPage >= totalProductPages} onClick={() => setProductsPage(p => p + 1)}>
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
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
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Per page:</span>
                    <select
                      data-testid="orders-per-page"
                      className="border rounded px-2 py-1 text-sm"
                      value={ordersLimit}
                      onChange={e => { setOrdersLimit(Number(e.target.value)); setOrdersPage(1); }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <Tabs value={ordersStatusFilter} onValueChange={v => { setOrdersStatusFilter(v); setOrdersPage(1); }} className="w-auto">
                    <TabsList>
                      <TabsTrigger value="All">All</TabsTrigger>
                      <TabsTrigger value="Pending">Pending</TabsTrigger>
                      <TabsTrigger value="Processing">Processing</TabsTrigger>
                      <TabsTrigger value="Completed">Completed</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.order_id}>
                          <TableCell>{order.order_id}</TableCell>
                          <TableCell>{order.user_id}</TableCell>
                          <TableCell>${order.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={getStatusColor(order.status)}>
                              {mapUIStatus(order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.created_at}</TableCell>
                        </TableRow>
                      ))}
                      {filteredOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                            No orders found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {/* Pagination */}
                  {totalOrderPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-slate-500">
                        Page {ordersPage} of {totalOrderPages} ({ordersTotal} total)
                      </span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" disabled={ordersPage <= 1} onClick={() => setOrdersPage(p => p - 1)}>
                          Previous
                        </Button>
                        <Button variant="ghost" size="sm" disabled={ordersPage >= totalOrderPages} onClick={() => setOrdersPage(p => p + 1)}>
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
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
                    <label htmlFor="store-name" className="text-slate-700">Store Name</label>
                    <Input
                      id="store-name"
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="store-email" className="text-slate-700">Store Email</label>
                    <Input
                      id="store-email"
                      type="email"
                      value={profileEmail}
                      readOnly
                    />
                  </div>
                  <Button
                    className="!bg-blue-600 hover:!bg-blue-700 !text-white"
                    onClick={handleSaveProfile}
                  >
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
