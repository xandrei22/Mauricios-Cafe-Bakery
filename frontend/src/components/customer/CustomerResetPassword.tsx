import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { CustomerNavbar } from '../ui/CustomerNavbar';

const CustomerResetPassword: React.FC = () => {
  const { token: urlToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  // Support both URL parameter and query parameter for token
  // Decode the token in case it's URL-encoded (Gmail sometimes encodes links)
  const rawToken = urlToken || queryToken;
  const token = rawToken ? decodeURIComponent(rawToken) : null;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'idle'|'success'|'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // Check if token is missing and log for debugging
  useEffect(() => {
    console.log('Reset Password - URL Token:', urlToken);
    console.log('Reset Password - Query Token:', queryToken);
    console.log('Reset Password - Final Token:', token);
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid reset link. Please request a new password reset.');
    }
  }, [token, urlToken, queryToken]);

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
  const passwordsMatch = password === confirm && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid reset link. Please request a new password reset.');
      return;
    }
    
    if (!allValid) {
      setStatus('error');
      setMessage('Password does not meet all requirements.');
      return;
    }
    if (!passwordsMatch) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }
    
    try {
      console.log('Submitting reset password with token:', token ? 'Token present' : 'Token missing');
      const res = await fetch('/api/customer/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      console.log('Reset password response:', { status: res.status, data });
      
      if (res.ok) {
        setStatus('success');
        setMessage('Password reset successful! Redirecting to login...');
        setTimeout(() => navigate('/customer-login'), 2000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setStatus('error');
      setMessage('Failed to reset password. Please try again.');
    }
  };

  return (
    <>
      <CustomerNavbar />
      <div className="min-h-screen flex items-center justify-center bg-[#f8ede3] pt-12 sm:pt-16 p-3">
        <div className="bg-white p-3 sm:p-6 lg:p-8 rounded-xl shadow-md w-full max-w-md">
          <h2 className="text-2xl sm:text-3xl font-light text-[#6B5B5B] mb-2 text-center">Reset Password</h2>
          <p className="text-sm text-gray-600 text-center mb-4">Enter your new password below.</p>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Password field with always-visible eye icon */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 pr-12 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]"
                placeholder="New password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#a87437] focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {/* Password checklist */}
            {password.length > 0 && (
              <div className="mt-2 space-y-1 text-xs sm:text-sm">
                {passwordChecks.map((check, idx) => (
                  <div key={idx} className={check.valid ? 'text-green-600 flex items-center' : 'text-red-600 flex items-center'}>
                    {check.valid ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                    {check.label}
                  </div>
                ))}
              </div>
            )}
            {/* Confirm password field with always-visible eye icon */}
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 pr-12 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]"
                placeholder="Confirm new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#a87437] focus:outline-none"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {/* Password match indicator */}
            {confirm.length > 0 && (
              <div className={passwordsMatch ? 'text-green-600 flex items-center mt-1 text-xs sm:text-sm' : 'text-red-600 flex items-center mt-1 text-xs sm:text-sm'}>
                {passwordsMatch ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                {passwordsMatch ? 'Passwords match!' : 'Passwords do not match'}
              </div>
            )}
            <button 
              type="submit" 
              className="w-full bg-[#a87437] hover:bg-[#8f652f] text-white py-2.5 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base"
              disabled={!token}
            >
              Reset Password
            </button>
          </form>
          {status !== 'idle' && (
            <div className={`mt-4 text-center text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message}</div>
          )}
          <div className="text-center mt-4">
            <a href="/customer-login" className="text-sm text-[#a87437] hover:text-[#8f652f] hover:underline">Back to Login</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerResetPassword; 