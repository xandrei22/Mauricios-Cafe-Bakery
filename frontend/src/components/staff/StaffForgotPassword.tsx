"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { Card, CardContent } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";

export function StaffForgotPassword({ className, ...props }: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/staff/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Password reset instructions have been sent to your email address.");
      } else {
        setError(data.message || "Failed to send reset email");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("min-h-screen flex flex-col lg:flex-row", className)} {...props}>
      {/* Left Side - Welcome */}
      <div className="flex-1 bg-[#A87437] flex flex-col items-center justify-center text-white p-4 sm:p-6 lg:p-8">
        <div className="max-w-md text-center space-y-3 sm:space-y-4 lg:space-y-6">
          <div className="mb-3 sm:mb-4 lg:mb-8">
            <img src="/images/whiteicon_bg.png" alt="CaféIQ Logo" className="mx-auto h-44 sm:h-48 lg:h-56 w-auto" />
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-2 sm:mb-4">CaféIQ Staff Portal</h1>
          <p className="text-sm sm:text-base lg:text-lg text-white/80 mb-3 sm:mb-4 lg:mb-8">
            Reset your password to access the staff portal
          </p>
        </div>
      </div>
      
      {/* Right Side - Form */}
      <div className="flex-1 bg-white flex items-center justify-center p-3 sm:p-6 lg:p-8">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardContent className="p-0">
            <form onSubmit={handleForgotPassword} className="space-y-3 sm:space-y-4 lg:space-y-5">
              <div className="text-center mb-3 sm:mb-4 lg:mb-6">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-light text-[#A87437] mb-2">Forgot Password</h2>
                <p className="text-xs sm:text-sm text-gray-600">Enter your email to reset your password</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  {message}
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-100 border-0 rounded-none focus:bg-white focus:ring-1 focus:ring-[#A87437] text-sm sm:text-base"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#A87437] hover:bg-[#946a33] text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-3xl font-medium transition-colors text-sm sm:text-base"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reset Email
                  </div>
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/staff/login"
                  className="inline-flex items-center text-xs sm:text-sm text-[#A87437] hover:text-[#946a33] transition-colors"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Back to Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}










