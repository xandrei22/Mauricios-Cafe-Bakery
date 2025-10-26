import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../customer/AuthContext';

interface CustomerSettings {
    email: string;
    username: string;
    canChangeUsername: boolean;
    lastUsernameChange: string | null;
}

const CustomerSettings: React.FC = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<CustomerSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Username change states
    const [showUsernameForm, setShowUsernameForm] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [usernamePassword, setUsernamePassword] = useState('');
    const [updatingUsername, setUpdatingUsername] = useState(false);

    // Password change states
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updatingPassword, setUpdatingPassword] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/settings/customer/settings`, {
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

    const handleUsernameChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUsername.trim() || !usernamePassword.trim()) {
            setError('Please fill in all fields');
            return;
        }

        try {
            setUpdatingUsername(true);
            setError(null);

            const response = await fetch(`${API_URL}/api/settings/customer/username`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    newUsername: newUsername.trim(),
                    currentPassword: usernamePassword
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess('Username updated successfully!');
                setNewUsername('');
                setUsernamePassword('');
                setShowUsernameForm(false);
                fetchSettings(); // Refresh settings
            } else {
                setError(data.error || 'Failed to update username');
            }
        } catch (error) {
            console.error('Error updating username:', error);
            setError('Failed to update username');
        } finally {
            setUpdatingUsername(false);
        }
    };

    const handlePasswordChangeRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            setUpdatingPassword(true);
            setError(null);

            const response = await fetch(`${API_URL}/api/settings/customer/password/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess('Password change verification email sent! Please check your email and click the link to proceed.');
                setShowPasswordForm(false);
            } else {
                setError(data.error || 'Failed to send password change request');
            }
        } catch (error) {
            console.error('Error requesting password change:', error);
            setError('Failed to send password change request');
        } finally {
            setUpdatingPassword(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRemainingDays = (lastChange: string | null) => {
        if (!lastChange) return 0;
        const lastChangeDate = new Date(lastChange);
        const now = new Date();
        const daysSinceChange = (now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24);
        const remainingDays = Math.max(0, 7 - daysSinceChange);
        return Math.ceil(remainingDays);
    };

  if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading settings...</p>
                </div>
            </div>
        );
    }

    if (!settings) {
  return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

    const remainingDays = getRemainingDays(settings.lastUsernameChange);

    return (
        <div className="min-h-screen bg-[#f5f5f5]">
            {/* Header */}
            <div className="space-y-4 sm:space-y-6 ml-0 sm:ml-1 lg:ml-2 mr-2 sm:mr-4 lg:mr-6 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Account Settings</h1>
                        <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your account preferences and information</p>
                    </div>
                    {/* Back arrow removed per design */}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Success/Error Messages */}
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <p className="text-green-800">{success}</p>
                        <button
                            onClick={() => setSuccess(null)}
                            className="ml-auto text-green-600 hover:text-green-800"
                        >
                            ×
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <p className="text-red-800">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-600 hover:text-red-800"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Account Settings Sections */}
                <div className="space-y-6 mb-8">
                    {/* Account Information Section */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center space-x-3 mb-4">
                            <Mail className="h-6 w-6 text-gray-600" />
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
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm font-medium text-gray-600">Last Username Change</span>
                                <span className="text-sm text-gray-900">{formatDate(settings.lastUsernameChange)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Username Section */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <User className="h-6 w-6 text-gray-600" />
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Username</h3>
                                    <p className="text-sm text-gray-600">Change your username</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUsernameForm(!showUsernameForm)}
                                className="px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] transition-colors"
                            >
                                {showUsernameForm ? 'Cancel' : 'Change'}
                            </button>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-4">
                            <p>Current username: <span className="font-medium">{settings.username}</span></p>
                            {remainingDays > 0 && (
                                <p className="text-amber-600 mt-1">
                                    You can change your username again in {remainingDays} day{remainingDays !== 1 ? 's' : ''}.
                                </p>
                            )}
                        </div>

                        {showUsernameForm && (
                            <form onSubmit={handleUsernameChange} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        New Username
                                    </label>
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]"
                                        placeholder="Enter new username"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        value={usernamePassword}
                                        onChange={(e) => setUsernamePassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]"
                                        placeholder="Enter current password"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={updatingUsername || remainingDays > 0}
                                    className="w-full px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {updatingUsername ? 'Updating...' : 'Update Username'}
                                </button>
                            </form>
                        )}
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
                                    <p className="text-sm text-blue-800">
                                        For security reasons, password changes require email verification. 
                                        Click the button below to receive a secure link in your email.
                                    </p>
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

export default CustomerSettings; 