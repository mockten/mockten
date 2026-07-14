import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ArrowLeft, Save, Mail, User, Trash2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { getUser, updateUser, deleteUser, getStoreName, getSellerStoreName, updateSellerStoreName } from "./adminApi";

interface EditUserPageProps {
  onBack: () => void;
  onUserUpdated: () => void;
  userId: string;
}

export function EditUserPage({ onBack, onUserUpdated, userId }: EditUserPageProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    storeName: "",
    status: "active",
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [initialStoreName, setInitialStoreName] = useState("");
  // Pending only exists *before* an account is first approved. Once it has been
  // activated, the lifecycle is Active ⇄ Suspended, so we stop offering Pending.
  const [initialStatus, setInitialStatus] = useState("active");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getUser(userId);
      if (cancelled) return;
      if (!u) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const email = u.email || u.username || "";
      const attrs = u.attributes || {};
      const seller = !!(attrs.storeName || attrs.description);
      // Prefer the buyer-facing store name from the Seller table (what the
      // storefront/Seller Portal show); fall back to the Keycloak attribute.
      const sellerTableName = await getSellerStoreName(email);
      if (cancelled) return;
      const storeName = sellerTableName || getStoreName(u);
      const isSellerAcct = seller || !!sellerTableName;
      // active | pending | suspended — pending is disabled + a `status` marker.
      const isPending = (attrs.status || []).includes("pending");
      const status = u.enabled === false ? (isPending ? "pending" : "suspended") : "active";
      setIsSeller(isSellerAcct);
      setInitialStoreName(storeName);
      setInitialStatus(status);
      setFormData({
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email,
        storeName,
        status,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await updateUser(
      userId,
      {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        status: formData.status,
        ...(isSeller ? { storeName: formData.storeName } : {}),
      },
      formData.email
    );
    if (!res.ok) {
      setError(res.error || "Failed to update user.");
      setSaving(false);
      return;
    }
    // Persist the buyer-facing store name to the Seller table so the change is
    // reflected on the storefront, not just in Keycloak.
    if (isSeller && formData.storeName !== initialStoreName) {
      await updateSellerStoreName(formData.email, formData.storeName, formData.email);
    }
    setSuccess(true);
    setTimeout(() => onUserUpdated(), 1000);
  };

  const handleDelete = async () => {
    await deleteUser(userId, formData.email);
    onUserUpdated();
  };

  return (
    <div className="min-h-screen bg-red-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            Back to User Management
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-red-600 rounded-lg shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold leading-tight text-slate-900" style={{ fontSize: "1.25rem", lineHeight: 1.2 }}>Edit User</h1>
              <p className="text-xs text-slate-500 leading-tight">Update user details</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
          </div>
        ) : notFound ? (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">User not found.</AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">User updated successfully! Redirecting...</AlertDescription>
              </Alert>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Basic details about the user</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={formData.firstName} onChange={(e) => handleInputChange("firstName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={formData.lastName} onChange={(e) => handleInputChange("lastName", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} className="pl-10" />
                  </div>
                </div>
                {isSeller && (
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input id="storeName" value={formData.storeName} onChange={(e) => handleInputChange("storeName", e.target.value)} placeholder="Shown to buyers on this seller's products" />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
                <CardDescription>Enable or suspend this account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(v: string) => handleInputChange("status", v)}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      {initialStatus === "pending" && <SelectItem value="pending">Pending</SelectItem>}
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="text-red-600 border-red-200 gap-2">
                    <Trash2 className="w-4 h-4" /> Delete User
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onBack}>Cancel</Button>
                <Button type="submit" disabled={saving} className="!text-white gap-2" style={{ backgroundColor: "#dc2626" }}>
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
