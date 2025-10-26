import React, { useState } from 'react';
import { CustomerNavbar } from '../ui/CustomerNavbar';

const CustomerForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle'|'success'|'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    setMessage('');
    try {
      const res = await fetch('/api/customer/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.code === 'GOOGLE_SIGNIN') {
        setStatus('error');
        setMessage(data.message);
      } else if (data.code === 'RATE_LIMIT') {
        setStatus('error');
        setMessage(data.message);
      } else if (data.code === 'COOLDOWN') {
        setStatus('error');
        setMessage(data.message);
      } else if (res.ok) {
        setStatus('success');
        setMessage('A password reset link has been sent to your email.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to send reset link.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to send reset link.');
    }
  };

  return (
    <>
      <CustomerNavbar />
      <div className="min-h-screen flex items-center justify-center bg-[#f8ede3] pt-12 sm:pt-16 p-3">
        <div className="bg-white p-3 sm:p-6 lg:p-8 rounded-xl shadow-md w-full max-w-md flex flex-col gap-3">
          <h2 className="text-2xl sm:text-3xl font-light text-[#6B5B5B] mb-2 text-center">Forgot your password?</h2>
          <p className="text-sm text-gray-600 text-center mb-4">Enter your email below to receive a password reset link.</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="w-full bg-[#a87437] hover:bg-[#8f652f] text-white py-2.5 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base">Send Reset Link</button>
          </form>
          <div className="text-center mt-2">
            <a href="/customer-login" className="text-sm text-[#a87437] hover:text-[#8f652f] hover:underline">Back to Login</a>
          </div>
          {status !== 'idle' && (
            <div className={`mt-2 text-center text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message}</div>
          )}
        </div>
      </div>
    </>
  );
};

export default CustomerForgotPassword; 