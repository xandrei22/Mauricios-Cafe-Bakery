"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAlert } from "../../contexts/AlertContext";

export function StaffAuthForm({ className, ...props }: React.ComponentProps<"div">) {
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
      console.log('Attempting staff login with:', { username: usernameOrEmail });
      
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameOrEmail, password }),
        credentials: "include",
      });
      
      console.log('Staff login response status:', res.status);
      
      const data = await res.json();
      console.log('Staff login response data:', data);
      
      if (!res.ok || !data.success) {
        setError(data.message || "Login failed");
      } else {
        console.log('Staff login successful, checking for alerts');
        try {
          if (data?.user) {
            localStorage.setItem('staffUser', JSON.stringify(data.user));
          } else if (data?.email) {
            localStorage.setItem('staffUser', JSON.stringify({ email: data.email }));
          }
        } catch {}
        // Check for alerts immediately after successful login
        await checkLowStockAlert();
        navigate("/staff/dashboard");
      }
    } catch (err) {
      console.error('Staff login error:', err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("min-h-screen flex", className)} {...props}>
      {/* Left Side - Welcome/Sign In */}
      <div className="flex-1 bg-[#A87437] flex flex-col items-center justify-center text-white p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="mb-8">
            <img src="/images/whiteicon_bg.png" alt="CaféIQ Logo" className="mx-auto h-56 w-auto" />
          </div>
          <h1 className="text-4xl font-bold mb-4">CaféIQ Staff Portal</h1>
          <p className="text-lg text-white/80 mb-8">
            Access order management, POS system, and daily operations at Mauricio's Cafe and Bakery
          </p>
        </div>
      </div>
      {/* Right Side - Form */}
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardContent className="p-0">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-light text-[#A87437] mb-2">Welcome back Staff!</h2>
                <p className="text-sm text-gray-600">Login to your CaféIQ account</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                    Username or Email
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username or email"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded-none focus:bg-white focus:ring-1 focus:ring-[#A87437]"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-100 border-0 rounded-none focus:bg-white focus:ring-1 focus:ring-[#A87437] pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Link to="/staff/forgot-password" className="text-sm text-[#A87437] hover:underline">
                      Forgot your password?
                    </Link>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#A87437] hover:bg-[#946a33] text-white py-3 px-4 rounded-full font-medium transition-colors"
              >
                {loading ? "Signing in..." : "LOGIN"}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Need help? Contact your administrator</p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 