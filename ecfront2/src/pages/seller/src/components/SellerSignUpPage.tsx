import { useState } from "react";
import "../styles/globals.css";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Store, Lock, Mail, User, Building2, Phone, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SellerSignUpPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    storeName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [legalDoc, setLegalDoc] = useState<null | "terms" | "privacy">(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getAdminToken = async (): Promise<string> => {
    const res = await fetch("/api/uam/creation/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) throw new Error("Failed to get admin token");
    const data = await res.json();
    return data.access_token;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service.");
      return;
    }

    setLoading(true);
    try {
      const adminToken = await getAdminToken();

      const userData = {
        username: formData.email,
        email: formData.email,
        enabled: true,
        emailVerified: true,
        firstName: formData.fullName,
        lastName: "Seller",
        credentials: [
          { type: "password", value: formData.password, temporary: false },
        ],
        groups: ["Seller"],
        attributes: {
          storeName: [formData.storeName],
          phonenum: [formData.phone],
        },
      };

      const res = await fetch("/api/uam/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(userData),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Error ${res.status}`);
      }

      alert("Account created! Please sign in.");
      navigate("/seller/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  const LEGAL_CONTENT = {
    terms: {
      title: "Terms of Service",
      body: [
        "These Terms of Service govern your use of the Mockten seller platform. By creating a seller account you agree to provide accurate store and product information and to comply with all applicable laws.",
        "You are responsible for the products you list, their pricing, fulfillment, and customer support. Mockten may suspend or remove listings or accounts that violate these terms or harm buyers.",
        "Mockten is a demonstration environment. The platform is provided \"as is\" without warranties of any kind, and Mockten is not liable for any damages arising from its use.",
      ],
    },
    privacy: {
      title: "Privacy Policy",
      body: [
        "This Privacy Policy explains how Mockten handles the information you provide when registering as a seller, including your name, store name, email address, and phone number.",
        "Your information is used solely to operate your seller account, display your store to buyers, and contact you about your account. We do not sell your personal data to third parties.",
        "As a demonstration environment, data entered here may be reset at any time. Do not submit real or sensitive personal information.",
      ],
    },
  } as const;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-100 p-8">
      {legalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setLegalDoc(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{LEGAL_CONTENT[legalDoc].title}</h3>
            <div className="space-y-3">
              {LEGAL_CONTENT[legalDoc].body.map((p, i) => (
                <p key={i} className="text-sm text-slate-600 leading-relaxed">{p}</p>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <Button className="!bg-blue-600 hover:!bg-blue-700 !text-white" onClick={() => setLegalDoc(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
      <div className="w-full max-w-2xl">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-slate-900 mb-2">Seller Portal</h1>
          <p className="text-slate-600">Create your seller account</p>
        </div>

        {/* Signup Card */}
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle>Start selling today</CardTitle>
            <CardDescription>
              Fill in your information to create a seller account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-5">
              {/* Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Store Name */}
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="storeName"
                      type="text"
                      placeholder="My Store"
                      value={formData.storeName}
                      onChange={(e) => handleInputChange("storeName", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seller@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-slate-700 cursor-pointer select-none">
                  I agree to the{" "}
                  <button type="button" onClick={() => setLegalDoc("terms")} className="text-blue-600 hover:text-blue-700 underline">
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button type="button" onClick={() => setLegalDoc("privacy")} className="text-blue-600 hover:text-blue-700 underline">
                    Privacy Policy
                  </button>
                </label>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              {/* Sign Up Button */}
              <Button
                type="submit"
                className="w-full !bg-blue-600 hover:!bg-blue-700 !text-white"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-slate-500">Already have an account?</span>
              </div>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/seller/login")}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign in to your account
              </button>
            </div>
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
