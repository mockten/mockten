import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Shield, Lock, Mail } from "lucide-react";

interface AdminLoginPageProps {
  onLogin: () => void;
  onBackToSeller: () => void;
}

export function AdminLoginPage({ onLogin, onBackToSeller }: AdminLoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Admin login attempt:", { email, password });
    // Simulate successful login
    onLogin();
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
                    type="email"
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

              {/* Login Button */}
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                Access Admin Panel
              </Button>
            </form>

            {/* Back to Seller Link */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onBackToSeller}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                ← Back to Seller Login
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500">
          <p>© 2025 EC Site. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}