"use client"

import * as React from "react"
import { useState } from "react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"
import { CheckCircle, XCircle, Eye, EyeOff } from "lucide-react"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Preserve table param if customer came from a QR link
  const urlParams = new URLSearchParams(window.location.search);
  const tableFromUrl = urlParams.get('table');

  // Get the API URL from environment variable
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validate passwords match before submitting
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password strength
    if (!allValid) {
      setError("Password does not meet all requirements");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/customer/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username, 
          fullName, 
          email, 
          password,
          table: tableFromUrl || undefined 
        }),
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.message || `Signup failed (${res.status})`);
      } else if (!data.success) {
        setError(data.message || "Signup failed");
      } else {
        if (data.requiresVerification) {
          setSuccess("Account created successfully! Please check your email to verify your account before logging in.");
        } else {
          setSuccess("Account created successfully! You can now log in.");
        }
        
        // Clear form
        setUsername("");
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setAge("");
        setGender("");
      }
    } catch (err) {
      setError("Network error occurred during signup");
    } finally {
      setLoading(false);
    }
  }

  // Password strength validation function
  function isStrongPassword(password: string) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(password);
  }

  // Password validation checks
  const passwordChecks = [
    {
      label: 'Must be at least 8 characters!',
      valid: password.length >= 8,
    },
    {
      label: 'Must contain at least 1 number!',
      valid: /\d/.test(password),
    },
    {
      label: 'Must contain at least 1 in Capital Case!',
      valid: /[A-Z]/.test(password),
    },
    {
      label: 'Must contain at least 1 letter in Small Case!',
      valid: /[a-z]/.test(password),
    },
    {
      label: 'Must contain at least 1 special character!',
      valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    },
  ];
  const allValid = passwordChecks.every(c => c.valid);
  const passwordsMatch = password === confirmPassword && password.length > 0;


  return (
    <div className={cn("flex flex-col gap-2 sm:gap-4 max-w-md w-full mx-auto p-3 sm:p-0", className)} {...props}>
      <Card>
        <CardHeader className="px-3 pt-3 pb-1 sm:px-6 sm:pt-5 sm:pb-1">
          <CardTitle className="text-lg sm:text-2xl">Create an account</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Enter your information below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pt-1 pb-3 sm:px-6 sm:pt-2 sm:pb-4">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2 sm:gap-4">
              <div className="grid gap-2 sm:gap-3">
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={loading}
                  className="h-10 sm:h-10 text-sm sm:text-base"
                />
              </div>
              <div className="grid gap-2 sm:gap-3">
                <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  disabled={loading}
                  className="h-10 sm:h-10 text-sm sm:text-base"
                />
              </div>
              {/* Email - full width */}
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
                  className="h-10 sm:h-10 text-sm sm:text-base"
                />
              </div>
              {/* Age and Gender - same row on sm+ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div className="grid gap-2 sm:gap-3">
                  <Label htmlFor="age" className="text-sm font-medium">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter your age"
                    required
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    disabled={loading}
                    min="13"
                    max="120"
                    className="h-10 sm:h-10 text-sm sm:text-base"
                  />
                </div>
                <div className="grid gap-2 sm:gap-3">
                  <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
                  <select
                    id="gender"
                    required
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    disabled={loading}
                    title="Select your gender"
                    className={`h-10 sm:h-10 text-sm sm:text-base px-3 py-1 border border-gray-300 rounded-md focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] bg-transparent ${!gender ? 'text-gray-500' : 'text-black'}`}
                  >
                    <option value="" disabled className="text-gray-500">Select your gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
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
                    className="pr-12 h-10 sm:h-10 text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
                {/* Password checklist */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1 text-sm">
                    {passwordChecks.map((check, idx) => (
                      <div key={idx} className={check.valid ? 'text-green-600 flex items-center' : 'text-red-600 flex items-center'}>
                        {check.valid ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                        {check.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid gap-2 sm:gap-3">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="pr-12 h-10 sm:h-10 text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
                {/* Password match indicator */}
                {confirmPassword.length > 0 && (
                  <div className={passwordsMatch ? 'text-green-600 flex items-center mt-1' : 'text-red-600 flex items-center mt-1'}>
                    {passwordsMatch ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                    {passwordsMatch ? 'Passwords match!' : 'Passwords do not match'}
                  </div>
                )}
              </div>
              {error && <div className="text-red-500 text-sm text-center">{error}</div>}
              {success && <div className="text-green-600 text-sm text-center">{success}</div>}
              <div className="flex flex-col gap-2 sm:gap-3">
                <Button 
                  type="submit" 
                  className="w-full bg-[#a87437] hover:bg-[#8f652f] text-white h-10 sm:h-10 text-sm sm:text-base" 
                  disabled={loading || !passwordsMatch || !allValid}
                >
                  {loading ? "Signing up..." : "Sign up"}
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-xs sm:text-sm">
              Already have an account?{" "}
              <a href={`/customer-login${tableFromUrl ? `?table=${encodeURIComponent(tableFromUrl)}` : ''}`} className="underline underline-offset-4 text-[#a87437] hover:text-[#8f652f]">
                Log in
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