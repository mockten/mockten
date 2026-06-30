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
  RefreshCw,
  Loader2,
  ArrowDown,
  ArrowUp,
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
  const [sellerName, setSellerName] = useState("");
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
  const [ordersSort, setOrdersSort] = useState<"desc" | "asc">("desc");

  // Loading flags (so we show a spinner, not "No ... found", while fetching)
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

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
  const [editStock, setEditStock] = useState(0);
  const [editCondition, setEditCondition] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editIsActive, setEditIsActive] = useState(1);
  const [editSummary, setEditSummary] = useState("");
  const [editCategories, setEditCategories] = useState<Array<{category_id: string; category_name: string}>>([]);
  // Per-slot image state: null = no change, File = replace, 'delete' = delete
  const [imageSlots, setImageSlots] = useState<(File | 'delete' | null)[]>([null, null, null]);
  // Which slots currently have images in MinIO
  const [existingSlots, setExistingSlots] = useState<boolean[]>([false, false, false]);

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
        if (data.seller_name) {
          setProfileName(data.seller_name);
          setSellerName(data.seller_name);
        }
      })
      .catch(() => {});
  }, [navigate]);

  // Load stats
  const loadStats = useCallback(() => {
    setLoadingStats(true);
    fetch(`${API_BASE}/stats`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, []);

  // Load orders
  const loadOrders = useCallback(() => {
    setLoadingOrders(true);
    const params = new URLSearchParams({
      page: String(ordersPage),
      limit: String(ordersLimit),
      status: ordersStatusFilter,
      sort: ordersSort,
    });
    if (searchQuery && activeTab === "orders") params.set("search", searchQuery);
    fetch(`${API_BASE}/orders?${params}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        setOrders(data.orders || []);
        setOrdersTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [ordersPage, ordersLimit, ordersStatusFilter, ordersSort, searchQuery, activeTab]);

  // Load products
  const loadProducts = useCallback(() => {
    setLoadingProducts(true);
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
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [productsPage, productsLimit]);

  // Load stats + recent orders together on overview
  useEffect(() => {
    if (activeTab === "overview") {
      loadStats();
      loadOrders();
    }
  }, [activeTab, loadStats, loadOrders]);

  useEffect(() => {
    if (activeTab === "orders") loadOrders();
  }, [activeTab, loadOrders]);

  useEffect(() => {
    if (activeTab === "products") loadProducts();
  }, [activeTab, loadProducts]);

  // Prevent browser back from bypassing logout
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const onPop = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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
      body: JSON.stringify({
        product_name: editName,
        price: editPrice,
        summary: editSummary,
        category_id: editCategoryId,
        product_condition: editCondition,
        stock: editStock,
        is_active: editIsActive,
      }),
    });
    // Handle per-slot image operations
    for (let slot = 0; slot < 3; slot++) {
      const action = imageSlots[slot];
      if (action === 'delete') {
        await fetch(`${API_BASE}/products/${editProduct.product_id}/images/${slot}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
      } else if (action instanceof File) {
        const form = new FormData();
        form.append("images[]", action);
        await fetch(`${API_BASE}/products/${editProduct.product_id}/images?slot=${slot}`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: form,
        });
      }
    }
    setEditProduct(null);
    setImageSlots([null, null, null]);
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
  const filteredOrders = orders;

  const totalOrderPages = Math.ceil(ordersTotal / ordersLimit);
  const totalProductPages = Math.ceil(productsTotal / productsLimit);

  // If showing add product page, render it instead of the main portal
  if (showAddProduct) {
    return (
      <div className="min-h-screen bg-blue-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-900">Seller Portal</h1>
                <p className="text-xs text-slate-500 leading-tight">My Store</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Product</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-700">Product Name *</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-slate-700">Description</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editSummary}
                  onChange={e => setEditSummary(e.target.value)}
                  placeholder="Product description..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-700">Price ($) *</label>
                  <Input type="number" min={0} step={0.01} value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-sm text-slate-700">Stock *</label>
                  <Input type="number" min={0} value={editStock} onChange={e => setEditStock(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-700">Category</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editCategoryId}
                  onChange={e => setEditCategoryId(e.target.value)}
                >
                  <option value="">-- Keep current --</option>
                  {editCategories.map(c => (
                    <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-700">Condition</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editCondition}
                  onChange={e => setEditCondition(e.target.value)}
                >
                  <option value="new">New</option>
                  <option value="used">Used</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-2">
                <label className="text-sm text-slate-700">Active (visible to customers)</label>
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-blue-600"
                  checked={editIsActive === 1}
                  onChange={e => setEditIsActive(e.target.checked ? 1 : 0)}
                />
              </div>
              <div>
                <label className="text-sm text-slate-700 block mb-2">Product Images</label>
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2].map(slot => {
                    const slotPaths = [`/api/storage/${editProduct.product_id}.png`, `/api/storage/${editProduct.product_id}/1.png`, `/api/storage/${editProduct.product_id}/2.png`];
                    const action = imageSlots[slot];
                    const hasExisting = existingSlots[slot] && action !== 'delete';
                    const previewUrl = action instanceof File ? URL.createObjectURL(action) : (hasExisting ? slotPaths[slot] : null);
                    return (
                      <div key={slot} className="relative w-24 h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                        {previewUrl ? (
                          <>
                            <img src={previewUrl} alt={`slot${slot}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
                              <label className="cursor-pointer text-white text-xs bg-blue-600 px-2 py-0.5 rounded">
                                Update
                                <input type="file" accept="image/*" className="hidden" onChange={e => {
                                  const f = e.target.files?.[0];
                                  if (f) setImageSlots(prev => { const n=[...prev]; n[slot]=f; return n; });
                                }} />
                              </label>
                              <button className="text-white text-xs bg-red-500 px-2 py-0.5 rounded" onClick={() => setImageSlots(prev => { const n=[...prev]; n[slot]='delete'; return n; })}>Delete</button>
                            </div>
                          </>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors">
                            <span className="text-2xl leading-none">+</span>
                            <span className="text-xs">NEW</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) setImageSlots(prev => { const n=[...prev]; n[slot]=f; return n; });
                            }} />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-1">Hover image to Update or Delete. Click + to add.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="!bg-blue-600 hover:!bg-blue-700 !text-white" onClick={handleEditSave}>Save</Button>
              <Button variant="ghost" onClick={() => { setEditProduct(null); setImageSlots([null, null, null]); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-slate-900">Seller Portal</h1>
              <p className="text-xs text-slate-500 leading-tight">My Store</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search products, orders..."
                className="pl-10 h-9 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-9 px-2" data-testid="user-menu-trigger">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-blue-600 text-xs font-semibold">
                      {(sellerName || sellerEmail).slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm max-w-[140px] truncate">{sellerName || sellerEmail}</span>
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
        <aside className="w-52 bg-white border-r border-slate-200 min-h-[calc(100vh-57px)] p-3">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab === "overview"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("products")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab === "products"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <Package className="w-4 h-4" />
              <span>Products</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab === "orders"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Orders</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTab === "settings"
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-slate-900 mb-1">Dashboard Overview</h2>
                  <p className="text-slate-600">Welcome back! Here's what's happening with your store.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => { loadStats(); loadOrders(); }}
                  disabled={loadingStats}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingStats ? "animate-spin" : ""}`} />
                  Reload
                </Button>
              </div>

              {loadingStats && !stats ? (
                <div className="flex items-center justify-center py-20 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
                </div>
              ) : (
              <>
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
                      {loadingOrders && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                            <span className="inline-flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</span>
                          </TableCell>
                        </TableRow>
                      )}
                      {!loadingOrders && filteredOrders.length === 0 && (
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
              </>
              )}
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
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => loadProducts()}
                    disabled={loadingProducts}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingProducts ? "animate-spin" : ""}`} />
                    Reload
                  </Button>
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
                                <DropdownMenuItem onClick={async () => {
                                  setEditProduct(product);
                                  setEditName(product.product_name);
                                  setEditPrice(product.price);
                                  setEditStock(product.stocks);
                                  setEditCondition(product.condition);
                                  setEditIsActive(product.is_active);
                                  setEditSummary("");
                                  setEditCategoryId("");
                                  setImageSlots([null, null, null]);
                                  // Check which image slots exist
                                  const slotPaths = [
                                    `/api/storage/${product.product_id}.png`,
                                    `/api/storage/${product.product_id}/1.png`,
                                    `/api/storage/${product.product_id}/2.png`,
                                  ];
                                  // MinIO/Kong storage route does not support HEAD (returns 404),
                                  // so probe with GET and check the response is OK.
                                  const checks = await Promise.all(slotPaths.map(p => fetch(p, { method: 'GET' }).then(r => r.ok).catch(() => false)));
                                  setExistingSlots(checks);
                                  // Load categories for edit modal
                                  fetch(`${API_BASE}/categories`)
                                    .then(r => r.json())
                                    .then(d => { if (Array.isArray(d)) setEditCategories(d); })
                                    .catch(() => {});
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
                      {loadingProducts && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                            <span className="inline-flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</span>
                          </TableCell>
                        </TableRow>
                      )}
                      {!loadingProducts && filteredProducts.length === 0 && (
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    data-testid="orders-sort-toggle"
                    onClick={() => { setOrdersSort(s => (s === "desc" ? "asc" : "desc")); setOrdersPage(1); }}
                    title={ordersSort === "desc" ? "Newest first" : "Oldest first"}
                  >
                    {ordersSort === "desc" ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                    Date
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => loadOrders()}
                    disabled={loadingOrders}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingOrders ? "animate-spin" : ""}`} />
                    Reload
                  </Button>
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
                      {loadingOrders && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                            <span className="inline-flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</span>
                          </TableCell>
                        </TableRow>
                      )}
                      {!loadingOrders && filteredOrders.length === 0 && (
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
