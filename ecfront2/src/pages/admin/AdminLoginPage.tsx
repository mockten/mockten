import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Shield, Lock, Mail } from "lucide-react";
import { adminLogin } from "./adminApi";

interface AdminLoginPageProps {
  onLogin: () => void;
}

export function AdminLoginPage({ onLogin }: AdminLoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await adminLogin(email, password);
      if (res.ok) {
        onLogin();
      } else {
        setError(res.error || "Login failed.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-slate-900 mb-2">Admin Portal</h1>
          <p className="text-slate-600">Restricted access for administrators only</p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle>Administrator Login</CardTitle>
            <CardDescription>
              Enter your admin credentials to access the control panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="admin-email"
                    type="text"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Warning Message */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-800">
                  <strong>Warning:</strong> This area is for authorized personnel only.
                  All access is logged and monitored.
                </p>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full !text-white"
                style={{ backgroundColor: "#dc2626" }}
              >
                {loading ? "Signing in..." : "Access Admin Panel"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500">
          <p>© 2026 EC Site. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
