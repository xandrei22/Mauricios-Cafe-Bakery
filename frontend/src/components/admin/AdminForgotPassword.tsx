import React, { useState } from "react";
import "../../styles/theme.css";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

const AdminForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setMessage("");
    try {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("A password reset link has been sent to your email.");
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to send reset link.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Failed to send reset link.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
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
      {/* Right Side - Forgot Password Form */}
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <Card className="w-full max-w-md border-0 shadow-none">
          <CardContent className="p-0">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-light text-[#A87437] mb-2">Forgot your password?</h2>
                <p className="text-sm text-gray-600">Enter your admin email to receive a password reset link.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    className="w-full px-4 py-3 bg-gray-100 border-0 rounded-none focus:bg-white focus:ring-1 focus:ring-[#a87437] mt-1"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#a87437] hover:bg-[#946a33] text-white py-3 rounded-3xl font-medium"
              >
                Send Reset Link
              </Button>
            </form>
            <div className="text-center mt-2">
              <a href="/admin" className="text-sm text-[#a87437] hover:underline">Back to Login</a>
            </div>
            {status !== "idle" && (
              <div className={`text-center text-sm ${status === "success" ? "text-green-600" : "text-red-600"}`}>{message}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminForgotPassword; 