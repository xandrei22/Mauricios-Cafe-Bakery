import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../customer/AuthContext';

interface StaffSettings {
    email: string;
    username: string;
    role: string;
    status: string;
    canChangeEmail: boolean;
    canChangeUsername: boolean;
}

const StaffSettings: React.FC = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<StaffSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Password change states
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/settings/staff/settings`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setSettings(data.settings);
                } else {
                    setError(data.error || 'Failed to fetch settings');
                }
            } else {
                setError('Failed to fetch settings');
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            setError('Failed to fetch settings');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChangeRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setUpdatingPassword(true);
            setError(null);
            const response = await fetch(`${API_URL}/api/settings/staff/password/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setSuccess('Password change verification email sent.');
                setShowPasswordForm(false);
            } else {
                setError(data.error || 'Failed to send password change link');
            }
        } catch (err) {
            setError('Failed to send password change link');
        } finally {
            setUpdatingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading settings...</p>
                </div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-600">Failed to load settings</p>
                    <button 
                        onClick={fetchSettings}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f5f5]">
            {/* Header */}
            <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Account Settings</h1>
                        <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your account preferences and information</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <p className="text-green-800">{success}</p>
                        <button onClick={() => setSuccess(null)} className="ml-auto text-green-600 hover:text-green-800">×</button>
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <p className="text-red-800">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">×</button>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Account Information */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center space-x-3 mb-4">
                            <User className="h-6 w-6 text-gray-600" />
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
                                <p className="text-sm text-gray-600">Your account details</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm font-medium text-gray-600">Email</span>
                                <span className="text-sm text-gray-900">{settings.email}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm font-medium text-gray-600">Username</span>
                                <span className="text-sm text-gray-900">{settings.username}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm font-medium text-gray-600">Role</span>
                                <span className="text-sm text-gray-900 capitalize">{settings.role}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm font-medium text-gray-600">Status</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-sm text-gray-900 capitalize">{settings.status}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Password Section */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <Lock className="h-6 w-6 text-gray-600" />
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Password</h3>
                                    <p className="text-sm text-gray-600">Change your password</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowPasswordForm(!showPasswordForm)} 
                                className="px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] transition-colors"
                            >
                                {showPasswordForm ? 'Cancel' : 'Change'}
                            </button>
                        </div>
                        {showPasswordForm && (
                            <form onSubmit={handlePasswordChangeRequest} className="space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">For security reasons, password changes require email verification. We will send a secure link to your email.</p>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={updatingPassword} 
                                    className="w-full px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {updatingPassword ? 'Sending...' : 'Send Password Change Link'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffSettings;