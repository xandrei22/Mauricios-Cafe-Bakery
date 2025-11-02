"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
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

  // Get table number from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const tableFromUrl = urlParams.get('table');
  
  // Get the API URL from environment variable
  const API_URL = getApiUrl();
  
  // Check for Google OAuth verification error
  useEffect(() => {
    const error = urlParams.get('error');
    const message = urlParams.get('message');
    
    if (error === 'EMAIL_VERIFICATION_REQUIRED') {
      setError(message || 'Please verify your email address before logging in. Check your email for the verification link.');
    } else if (error === 'EMAIL_REGISTERED_PASSWORD') {
      setError('This email is already registered with a password. Please log in using your email and password.');
    } else if (error === 'GOOGLE_AUTH_NOT_CONFIGURED') {
      setError('Google authentication is not configured. Please use email and password to login.');
    } else if (error === 'GOOGLE_AUTH_ERROR') {
      setError('Google authentication failed. Please try again or use email and password.');
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/customer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, table: tableFromUrl || undefined }),
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        // Handle HTTP error responses (like 401 for wrong credentials)
        if (data.requiresVerification) {
          setError(data.message + " Please check your email for the verification link.");
        } else {
          setError(data.message || `Login failed (${res.status})`);
        }
      } else if (!data.success) {
        // Handle successful HTTP response but failed login
        setError(data.message || "Login failed");
      } else {
        // Successful login - store user info in localStorage as backup for mobile Safari
        if (data.user) {
          try {
            localStorage.setItem('customerUser', JSON.stringify(data.user));
            localStorage.setItem('loginTimestamp', Date.now().toString());
          } catch (e) {
            console.warn('Could not store user in localStorage:', e);
          }
        }
        
        // Detect iOS Safari for extended delay (iOS 15.8 and below have aggressive cookie blocking)
        const isIOSSafari = /iPhone.*Safari/i.test(navigator.userAgent) && !/CriOS|FxiOS/i.test(navigator.userAgent);
        const isOldIOS = /OS 1[0-5]_/.test(navigator.userAgent);
        const delay = (isIOSSafari && isOldIOS) ? 2000 : 500; // 2 seconds for old iOS, 500ms for others
        
        // Give mobile Safari a moment to process the cookie before redirecting
        // iOS 15.8 requires longer delay due to aggressive ITP cookie blocking
        setTimeout(() => {
          if (data && data.redirect) {
            // Use full page reload for iOS Safari to force cookie acceptance
            if (isIOSSafari && isOldIOS) {
              window.location.replace(data.redirect);
            } else {
              window.location.href = data.redirect;
            }
          } else if (tableFromUrl) {
            const url = `/customer/dashboard?table=${tableFromUrl}`;
            if (isIOSSafari && isOldIOS) {
              window.location.replace(url);
            } else {
              window.location.href = url;
            }
          } else {
            if (isIOSSafari && isOldIOS) {
              window.location.replace("/customer/dashboard");
            } else {
              window.location.href = "/customer/dashboard";
            }
          }
        }, delay);
      }
    } catch (err) {
      console.error('Login error:', err);
      // Only show network error for actual connection issues
      if (err instanceof Error && err.message.includes('fetch')) {
        setError("Cannot connect to server. Please check your connection and try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3 sm:gap-6 max-w-xs sm:max-w-sm md:max-w-md w-full mx-auto p-3 sm:p-4 md:p-0", className)} {...props}>
      <Card>
        <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-2">
          <CardTitle className="text-lg sm:text-2xl">Login to your account</CardTitle>
          <CardDescription className="text-xs sm:text-sm md:text-base">
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pt-2 pb-4 sm:px-6 sm:pt-2 sm:pb-6">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2 sm:gap-6">
              <div className="grid gap-2 sm:gap-3">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-10 sm:h-11 text-sm sm:text-base"
                />
              </div>
              <div className="grid gap-2 sm:gap-3">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-12 h-10 sm:h-11 text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>
              {error && <div className="text-red-500 text-sm text-center">{error}</div>}
              <div className="text-right">
                <Link
                  to="/customer/forgot-password"
                  className="inline-block text-xs sm:text-sm underline-offset-4 hover:underline text-[#a87437]"
                >
                  Forgot your password?
                </Link>
              </div>
              <div className="flex flex-col gap-2 sm:gap-3">
                <Button type="submit" className="w-full bg-[#a87437] hover:bg-[#8f652f] text-white h-10 sm:h-11 text-sm sm:text-base" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <Button variant="outline" className="w-full border-[#a87437] text-[#a87437] hover:bg-[#f6efe7] h-10 sm:h-11 text-sm sm:text-base" type="button" disabled={loading} onClick={() => window.location.href = `${API_URL}/api/auth/google${tableFromUrl ? `?table=${encodeURIComponent(tableFromUrl)}` : ''}` }>
                  {/* Google "G" logo */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="mr-2 h-4 w-4 sm:h-5 sm:w-5">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.676 32.658 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.157 7.961 3.039l5.657-5.657C33.64 6.053 29.083 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20c10.494 0 19.126-7.645 19.126-20 0-1.341-.146-2.651-.415-3.917z"/>
                    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.817C14.57 16.23 18.879 12 24 12c3.059 0 5.842 1.157 7.961 3.039l5.657-5.657C33.64 6.053 29.083 4 24 4 16.318 4 9.678 8.337 6.306 14.691z"/>
                    <path fill="#4CAF50" d="M24 44c5.147 0 9.738-1.97 13.238-5.169l-6.114-5.159C29.062 35.983 26.655 37 24 37c-5.202 0-9.642-3.317-11.289-7.946l-6.54 5.04C9.5 39.556 16.22 44 24 44z"/>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.082 3.095-3.273 5.563-6.178 7.109l.001-.001 6.114 5.159C36.579 41.386 44 36 44 24c0-1.341-.146-2.651-.389-3.917z"/>
                  </svg>
                  Login with Google
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-xs sm:text-sm">
              Don&apos;t have an account?{" "}
              <a href={`/customer-signup${tableFromUrl ? `?table=${encodeURIComponent(tableFromUrl)}` : ''}`} className="underline underline-offset-4 text-[#a87437] hover:text-[#8f652f]">
                Sign up
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-center text-xs sm:text-sm text-[#6B5B5B] mt-1 sm:mt-2 mb-6 sm:mb-8 md:mb-10">
        <a href="/privacy" className="hover:text-[#a87437] underline underline-offset-4">Privacy Policy</a>
        <span className="mx-2">•</span>
        <a href="/terms" className="hover:text-[#a87437] underline underline-offset-4">Terms of Service</a>
        <span className="mx-2">•</span>
        <a href="/accessibility" className="hover:text-[#a87437] underline underline-offset-4">Accessibility</a>
      </div>
    </div>
  );
} 