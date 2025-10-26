import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

const CustomerResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'idle'|'success'|'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

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
      const res = await fetch('/api/customer/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage('Password reset successful! Redirecting to dashboard...');
        setTimeout(() => navigate('/customer/dashboard'), 2000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to reset password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Reset Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password field with always-visible eye icon */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full border rounded-lg px-4 py-2 pr-12"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
          {/* Confirm password field with always-visible eye icon */}
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              className="w-full border rounded-lg px-4 py-2 pr-12"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {/* Password match indicator */}
          {confirm.length > 0 && (
            <div className={passwordsMatch ? 'text-green-600 flex items-center mt-1' : 'text-red-600 flex items-center mt-1'}>
              {passwordsMatch ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
              {passwordsMatch ? 'Passwords match!' : 'Passwords do not match'}
            </div>
          )}
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition">Reset Password</button>
        </form>
        {status !== 'idle' && (
          <div className={`mt-4 text-center ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message}</div>
        )}
      </div>
    </div>
  );
};

export default CustomerResetPassword; 