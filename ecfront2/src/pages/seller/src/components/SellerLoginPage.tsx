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
                <a
                  href="#"
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot password?
                </a>
              </div>

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
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
    </div>
  );
}
