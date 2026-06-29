import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Store, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export function SellerLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resetError, setResetError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "/api/uam/token",
        new URLSearchParams({ username: email, password })
      );

      const accessToken: string = response.data.access_token;
      const refreshToken: string = response.data.refresh_token;

      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      const roles: string[] = payload.roles || [];

      if (!roles.includes("seller")) {
        setError("You are not authorized as a seller.");
        setLoading(false);
        return;
      }

      localStorage.setItem("seller_access_token", accessToken);
      localStorage.setItem("seller_refresh_token", refreshToken);

      navigate("/seller/portal");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError("Login failed. Please check your credentials.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus("sending");
    setResetError("");

    try {
      // Get admin token
      const tokenRes = await fetch("/api/uam/creation/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (!tokenRes.ok) throw new Error("Failed to get admin token");
      const { access_token: adminToken } = await tokenRes.json();

      // Find user by email
      const usersRes = await fetch(`/api/uam/users?email=${encodeURIComponent(resetEmail)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!usersRes.ok) throw new Error("Failed to search user");
      const users = await usersRes.json();
      if (!users.length) throw new Error("No account found with that email.");

      const userId = users[0].id;

      // Send reset password email
      const actionRes = await fetch(
        `/api/uam/users/${userId}/execute-actions-email`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(["UPDATE_PASSWORD"]),
        }
      );
      if (!actionRes.ok && actionRes.status !== 204) {
        throw new Error("Failed to send reset email.");
      }

      setResetStatus("sent");
    } catch (err) {
      setResetStatus("error");
      setResetError(err instanceof Error ? err.message : "Failed to send reset email.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-100 p-8">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-slate-900 mb-2">Seller Portal</h1>
          <p className="text-slate-600">Sign in to manage your store</p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your seller account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seller@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked: boolean | "indeterminate") =>
                      setRememberMe(checked as boolean)
                    }
                  />
                  <label htmlFor="remember" className="text-slate-700 cursor-pointer select-none">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(true); setResetStatus("idle"); setResetEmail(""); }}
                  className="text-blue-600 hover:text-blue-700 transition-colors text-sm"
                >
                  Forgot password?
                </button>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              {/* Login Button */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-slate-500">New to our platform?</span>
              </div>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/seller/signup")}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                Create a seller account
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center space-y-3">
          <button
            type="button"
            onClick={() => navigate("/admin/login")}
            className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
          >
            Admin Access
          </button>
          <p className="text-slate-500">© 2025 EC Site. All rights reserved.</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-slate-900 font-semibold text-lg">Reset your password</h2>

            {resetStatus === "sent" ? (
              <div className="space-y-4">
                <p className="text-slate-600 text-sm">
                  A password reset email has been sent to <strong>{resetEmail}</strong>. Please check your inbox.
                </p>
                <Button className="w-full" onClick={() => setShowForgotModal(false)}>
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-slate-600 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="seller@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {resetStatus === "error" && (
                  <p className="text-red-600 text-sm">{resetError}</p>
                )}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForgotModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={resetStatus === "sending"}>
                    {resetStatus === "sending" ? "Sending..." : "Send reset link"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
