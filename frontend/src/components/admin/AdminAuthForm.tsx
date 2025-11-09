"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "../../lib/utils"
import "../../styles/theme.css"
import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAlert } from "../../contexts/AlertContext";
import { adminLogin } from "../../utils/authUtils";
import { mobileFriendlySwal } from "../../utils/sweetAlertConfig";

export function AdminAuthForm({ className, ...props }: React.ComponentProps<"div">) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { checkLowStockAlert } = useAlert();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log('Attempting admin login with:', { username: usernameOrEmail });
      
      await adminLogin(usernameOrEmail, password);
      
      console.log('Admin login successful, checking for alerts');
      
      // ⭐ CRITICAL: Verify token is saved before redirect (with retry)
      console.log('🔍 Verifying admin token was saved...');
      
      let savedToken = localStorage.getItem('authToken');
      let savedUser = localStorage.getItem('adminUser');
      
      // Wait up to 1 second for token to be saved (for slow devices)
      for (let i = 0; i < 10; i++) {
        if (savedToken && savedUser) {
          console.log(`✅ Admin token verified after ${i * 100}ms`);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        savedToken = localStorage.getItem('authToken');
        savedUser = localStorage.getItem('adminUser');
      }
      
      // Final check
      if (!savedToken || !savedUser) {
        console.error('❌ CRITICAL: Admin token not found after login!', {
          token: !!savedToken,
          user: !!savedUser,
          allKeys: Object.keys(localStorage)
        });
        setError("Authentication failed. Please try again.");
        return;
      }
      
      console.log('✅ ADMIN LOGIN SUCCESSFUL - Redirecting...');
      console.log('Token exists:', !!savedToken);
      console.log('User exists:', !!savedUser);

      // ⭐ CRITICAL: Ensure loginTimestamp is set for ProtectedRoute to recognize recent login
      // (authUtils already sets it, but ensure it's set right before redirect)
      localStorage.setItem('loginTimestamp', Date.now().toString());

      // Check for alerts immediately after successful login
      checkLowStockAlert().catch(err => {
        console.error('Failed to check low stock alert:', err);
      });
      
      // Small delay to ensure localStorage is synced (especially on mobile)
      const isMobile = /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent);
      const delay = isMobile ? 400 : 200;
      
      setTimeout(() => {
        console.log(`Admin login redirect - Token saved: ${!!localStorage.getItem('authToken')}`);
        navigate("/admin/dashboard", { replace: true });
      }, delay);

    } catch (err: any) {
      console.error("Admin login error:", err);
      
      // Handle network/CORS errors
      if (err.isNetworkError || err.message?.includes('Network') || err.message?.includes('CORS') || err.message?.includes('Failed to fetch')) {
        console.error('🚨 Network/CORS error detected:', err);
        setError("Cannot connect to server. Please check your connection and try again.");
        return;
      }
      
      // Handle different error types
      if (err.response?.data?.errorType === 'unauthorized_access') {
        await mobileFriendlySwal.error(
          'Not Authorized',
          'You are not authorized to access the admin portal. Please contact your administrator.'
        );
      } else if (err.response?.data?.errorType === 'inactive_account') {
        await mobileFriendlySwal.warning(
          'Account Inactive',
          'Your account is not active. Please contact your administrator.'
        );
      } else {
        setError(err.response?.data?.message || err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("min-h-screen flex", className)} {...props}>
      {/* Left Side - Welcome/Sign In */}
      <div className="flex-1 bg-[#a87437] flex flex-col items-center justify-center text-white p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="mb-8">
            <img
              src="/images/whiteicon_bg.png"
              alt="CaféIQ Logo"
              className="mx-auto h-56 w-auto"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4">CaféIQ Admin Portal</h1>
          <p className="text-lg text-white/80 mb-8">
            Manage your cafe operations, track sales, and oversee daily activities at Mauricio's Cafe and Bakery
          </p>
        </div>
      </div>
      {/* Right Side - Form */}
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardContent className="p-0">
            {isSignUp ? (
              // Sign Up Form
              <form className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-light text-[#3F3532] mb-2">Create Account</h2>
                  <p className="text-sm text-gray-600">or use your email for registration:</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="Name"
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded-none focus:bg-white focus:ring-1 focus:ring-[#a87437]"
                      required
                    />
                  </div>

                  <div>
                    <Input
                      type="email"
                      placeholder="Email"
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded-none focus:bg-white focus:ring-1 focus:ring-[#a87437]"
                      required
                    />
                  </div>

                  <div>
                    <Input
                      type="password"
                      placeholder="Password"
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded-none focus:bg-white focus:ring-1 focus:ring-[#a87437]"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#a87437] hover:bg-[#946a33] text-white py-3 rounded-full font-medium"
                >
                  SIGN UP
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="text-[#a87437] hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              // Sign In Form (using your original form structure)
              <form className="space-y-6" onSubmit={handleLogin}>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-light text-[#A87437] mb-2">Welcome back Admin!</h2>
                  <p className="text-sm text-gray-600">Login to your CaféIQ account</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email" className="text-gray-700">
                      Username or Email
                    </Label>
                    <Input
                      id="email"
                      type="text"
                      placeholder="Enter username or admin@email.com"
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded-none focus:bg-white focus:ring-1 focus:ring-[#a87437] mt-1"
                      required
                      value={usernameOrEmail}
                      onChange={e => setUsernameOrEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="w-full px-4 py-3 bg-gray-100 border-0 rounded-none focus:bg-white focus:ring-1 focus:ring-[#a87437] mt-1 pr-12"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#a87437] focus:outline-none"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex justify-end mt-2">
                      <Link to="/admin/forgot-password" className="text-sm text-[#a87437] hover:underline">
                        Forgot your password?
                      </Link>
                    </div>
                  </div>
                </div>
                {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                <Button
                  type="submit"
                  className="w-full bg-[#a87437] hover:bg-[#946a33] text-white py-3 rounded-full font-medium"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "LOGIN"}
                </Button>

              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
