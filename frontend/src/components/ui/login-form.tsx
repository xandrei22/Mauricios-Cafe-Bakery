"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { customerLogin } from "../../utils/authUtils";
import { getApiUrl } from "../../utils/apiConfig";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Extract table param if present (for café customers)
  const urlParams = new URLSearchParams(window.location.search);
  const tableFromUrl = urlParams.get("table");

  // Handle OAuth error messages
  useEffect(() => {
    const error = urlParams.get("error");
    const message = urlParams.get("message");

    switch (error) {
      case "EMAIL_VERIFICATION_REQUIRED":
        setError(
          message ||
            "Please verify your email address before logging in. Check your email for the verification link."
        );
        break;
      case "EMAIL_REGISTERED_PASSWORD":
        setError(
          "This email is already registered with a password. Please log in using your email and password."
        );
        break;
      case "GOOGLE_AUTH_NOT_CONFIGURED":
        setError(
          "Google authentication is not configured. Please use email and password to login."
        );
        break;
      case "GOOGLE_AUTH_ERROR":
        setError(
          "Google authentication failed. Please try again or use email and password."
        );
        break;
      default:
        break;
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const hasTable = !!tableFromUrl;
      await customerLogin(email, password, hasTable, false);

      // ✅ Check JWT is saved
      let savedToken = localStorage.getItem("authToken");
      let savedUser = localStorage.getItem("customerUser");

      for (let i = 0; i < 10 && (!savedToken || !savedUser); i++) {
        await new Promise((res) => setTimeout(res, 100));
        savedToken = localStorage.getItem("authToken");
        savedUser = localStorage.getItem("customerUser");
      }

      if (!savedToken || !savedUser) {
        console.error("❌ JWT not found after login!");
        setError("Authentication failed. Please try again.");
        return;
      }

      console.log("✅ Login success. Redirecting...");
      
      // ⭐ CRITICAL: Ensure loginTimestamp is set for AuthContext to recognize recent login
      localStorage.setItem('loginTimestamp', Date.now().toString());
      
      // ⭐ CRITICAL: Wait longer to ensure token is fully saved and available
      // This prevents race condition where check-session is called before token is ready
      setTimeout(() => {
        // Final verification that token exists before redirect
        const finalToken = localStorage.getItem("authToken");
        const finalUser = localStorage.getItem("customerUser");
        
        if (!finalToken || !finalUser) {
          console.error("❌ Token not available after wait - retrying...");
          // Wait one more time
          setTimeout(() => {
            console.log("✅ Token verified after retry, redirecting to dashboard");
            const redirectPath = hasTable
              ? `/customer/menu?table=${encodeURIComponent(tableFromUrl!)}`
              : "/customer/dashboard";
            navigate(redirectPath, { replace: true });
          }, 300);
        } else {
          console.log("✅ Token verified, redirecting to dashboard");
          const redirectPath = hasTable
            ? `/customer/menu?table=${encodeURIComponent(tableFromUrl!)}`
            : "/customer/dashboard";
          navigate(redirectPath, { replace: true });
        }
      }, 500); // Increased from 200ms to 500ms
    } catch (err: any) {
      console.error("Customer login error:", err);
      
      // Handle network/CORS errors
      if (err.isNetworkError || err.message?.includes('Network') || err.message?.includes('CORS') || err.message?.includes('Failed to fetch')) {
        console.error('🚨 Network/CORS error detected:', err);
        setError("Cannot connect to server. Please check your connection and try again.");
        return;
      }
      
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please try again.";
      if (err.response?.data?.requiresVerification) {
        setError(msg + " Please check your email for the verification link.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  // ✅ CORS-safe Google OAuth redirect (no credentials)
  const handleGoogleLogin = () => {
    const baseUrl = getApiUrl();
    const redirectUrl = `${baseUrl}/api/auth/google${
      tableFromUrl ? `?table=${encodeURIComponent(tableFromUrl)}` : ""
    }`;
    window.location.href = redirectUrl;
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:gap-6 max-w-xs sm:max-w-sm md:max-w-md w-full mx-auto p-3 sm:p-4 md:p-0",
        className
      )}
      {...props}
    >
      <Card>
        <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-2">
          <CardTitle className="text-lg sm:text-2xl">
            Login to your account
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm md:text-base">
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 pt-2 pb-4 sm:px-6 sm:pt-2 sm:pb-6">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2 sm:gap-6">
              {/* Email */}
              <div className="grid gap-2 sm:gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div className="grid gap-2 sm:gap-3">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}

              <div className="text-right">
                <Link
                  to="/customer/forgot-password"
                  className="inline-block text-xs sm:text-sm underline-offset-4 hover:underline text-[#a87437]"
                >
                  Forgot your password?
                </Link>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2 sm:gap-3">
                <Button
                  type="submit"
                  className="w-full bg-[#a87437] hover:bg-[#8f652f] text-white"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full border-[#a87437] text-[#a87437] hover:bg-[#f6efe7]"
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="mr-2 h-4 w-4"
                  >
                    <path
                      fill="#FFC107"
                      d="M43.611 20.083H42V20H24v8h11.303C33.676 32.658 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.157 7.961 3.039l5.657-5.657C33.64 6.053 29.083 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c10.494 0 19.126-7.645 19.126-20 0-1.341-.146-2.651-.415-3.917z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.306 14.691l6.571 4.817C14.57 16.23 18.879 12 24 12..."
                    />
                  </svg>
                  Login with Google
                </Button>
              </div>
            </div>

            {/* Signup + Footer */}
            <div className="mt-4 text-center text-xs sm:text-sm">
              Don&apos;t have an account?{" "}
              <a
                href={`/customer-signup${
                  tableFromUrl ? `?table=${encodeURIComponent(tableFromUrl)}` : ""
                }`}
                className="underline text-[#a87437] hover:text-[#8f652f]"
              >
                Sign up
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-center text-xs sm:text-sm text-[#6B5B5B] mt-2 mb-6">
        <a
          href="/privacy"
          className="hover:text-[#a87437] underline underline-offset-4"
        >
          Privacy Policy
        </a>
        <span className="mx-2">•</span>
        <a
          href="/terms"
          className="hover:text-[#a87437] underline underline-offset-4"
        >
          Terms of Service
        </a>
        <span className="mx-2">•</span>
        <a
          href="/accessibility"
          className="hover:text-[#a87437] underline underline-offset-4"
        >
          Accessibility
        </a>
      </div>
    </div>
  );
}
