import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import AdminLoyaltySettings from './AdminLoyaltySettings';
import { useAuth } from '../customer/AuthContext';

interface AdminSettings {
    email: string;
    username: string;
    fullName: string;
    canChangeEmail: boolean;
    canChangeUsername: boolean;
    lastUsernameChange: string | null;
}

const AdminSettings: React.FC = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<AdminSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    // Username change
    const [showUsernameForm, setShowUsernameForm] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [usernamePassword, setUsernamePassword] = useState('');
    const [updatingUsername, setUpdatingUsername] = useState(false);
    // Email change (forces logout)
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [updatingEmail, setUpdatingEmail] = useState(false);
    // Password change (send link)
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const accountInfoRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
    const loyaltySettingsRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);

    const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
        if (ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/settings/admin/settings`, {
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
            const response = await fetch(`${API_URL}/api/settings/admin/username/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    newUsername: newUsername.trim(),
                    currentPassword: usernamePassword
                })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setSuccess('Verification email sent. Please confirm to update your username.');
                setNewUsername('');
                setUsernamePassword('');
                setShowUsernameForm(false);
            } else {
                setError(data.error || 'Failed to update username');
            }
        } catch (err) {
            setError('Failed to update username');
        } finally {
            setUpdatingUsername(false);
        }
    };

    const handleEmailChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim() || !emailPassword.trim()) {
            setError('Please fill in all fields');
            return;
        }
        try {
            setUpdatingEmail(true);
            setError(null);
            // Request an email verification link for email change
            const response = await fetch(`${API_URL}/api/settings/admin/email/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    newEmail: newEmail.trim(),
                    currentPassword: emailPassword
                })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setSuccess('Verification email sent. Please confirm via the link to complete the change.');
                setNewEmail('');
                setEmailPassword('');
                setShowEmailForm(false);
            } else {
                setError(data.error || 'Failed to update email');
            }
        } catch (err) {
            setError('Failed to update email');
        } finally {
            setUpdatingEmail(false);
        }
    };

    const handlePasswordChangeRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setUpdatingPassword(true);
            setError(null);
            const response = await fetch(`${API_URL}/api/settings/admin/password/request`, {
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
            <div className="bg-white flex items-center justify-center min-h-[400px]">
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

            {/* Main Content with left sidebar nav */}
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left in-page sidebar */}
                    <aside className="md:col-span-3 md:col-start-1 md:justify-self-start w-full">
                        <div className="sticky top-20 space-y-2 bg-white border border-gray-200 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">Sections</h3>
                            <button
                                onClick={() => scrollToSection(accountInfoRef)}
                                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-gray-700"
                            >
                                Account Information
                            </button>
                            <button
                                onClick={() => scrollToSection(loyaltySettingsRef)}
                                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 text-sm text-gray-700"
                            >
                                Loyalty System Settings
                            </button>
                        </div>
                    </aside>

                    {/* Right content column */}
                    <div className="md:col-span-9">
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

                <div className="space-y-6 mb-8">
                    {/* Account Information */}
                    <div ref={accountInfoRef} className="bg-white border border-gray-200 rounded-lg p-6 scroll-mt-24">
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
                                <span className="text-sm text-gray-900">{settings.lastUsernameChange ? new Date(settings.lastUsernameChange).toLocaleString() : 'Never'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Email Section */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <Mail className="h-6 w-6 text-gray-600" />
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Email</h3>
                                    <p className="text-sm text-gray-600">Change your email (you will be logged out)</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEmailForm(!showEmailForm)} className="px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] transition-colors">{showEmailForm ? 'Cancel' : 'Change'}</button>
                        </div>
                        {showEmailForm && (
                            <form onSubmit={handleEmailChange} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">New Email</label>
                                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]" placeholder="Enter new email" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                                    <input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]" placeholder="Enter current password" required />
                                </div>
                                <button type="submit" disabled={updatingEmail} className="w-full px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{updatingEmail ? 'Updating...' : 'Update Email'}</button>
                            </form>
                        )}
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
                            <button onClick={() => setShowUsernameForm(!showUsernameForm)} className="px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] transition-colors">{showUsernameForm ? 'Cancel' : 'Change'}</button>
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                            <p>Current username: <span className="font-medium">{settings.username}</span></p>
                        </div>
                        {showUsernameForm && (
                            <form onSubmit={handleUsernameChange} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">New Username</label>
                                    <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]" placeholder="Enter new username" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                                    <input type="password" value={usernamePassword} onChange={(e) => setUsernamePassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]" placeholder="Enter current password" required />
                                </div>
                                <button type="submit" disabled={updatingUsername} className="w-full px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{updatingUsername ? 'Updating...' : 'Update Username'}</button>
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
                            <button onClick={() => setShowPasswordForm(!showPasswordForm)} className="px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] transition-colors">{showPasswordForm ? 'Cancel' : 'Change'}</button>
                        </div>
                        {showPasswordForm && (
                            <form onSubmit={handlePasswordChangeRequest} className="space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">For security reasons, password changes require email verification. We will send a secure link to your email.</p>
                                </div>
                                <button type="submit" disabled={updatingPassword} className="w-full px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{updatingPassword ? 'Sending...' : 'Send Password Change Link'}</button>
                            </form>
                        )}
                    </div>

                    {/* Loyalty Program Settings */}
                    <div ref={loyaltySettingsRef} className="scroll-mt-24">
                        <AdminLoyaltySettings />
                    </div>
                </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings; 