import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { RefreshCw, Settings as SettingsIcon } from 'lucide-react';

interface LoyaltySettings {
    points_per_peso: { value: string; description: string; updated_at: string };
    minimum_points_redemption: { value: string; description: string; updated_at: string };
    loyalty_enabled: { value: string; description: string; updated_at: string };
    rewards_enabled: { value: string; description: string; updated_at: string };
    double_points_days: { value: string; description: string; updated_at: string };
    welcome_points: { value: string; description: string; updated_at: string };
    welcome_points_enabled: { value: string; description: string; updated_at: string };
    points_expiry_months: { value: string; description: string; updated_at: string };
}

const AdminLoyaltySettings: React.FC = () => {
    const [settings, setSettings] = useState<LoyaltySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/loyalty/settings`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                console.log('Fetched settings:', data);
                setSettings(data.settings);
            } else {
                const errorData = await res.json();
                console.error('Failed to load settings:', errorData);
                setError('Failed to load loyalty settings');
            }
        } catch (e) {
            console.error('Error fetching settings:', e);
            setError('Failed to load loyalty settings');
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<LoyaltySettings>) => {
        setSettings(prev => prev ? { ...prev, ...newSettings } : null);
    };

    const saveSettings = async () => {
        if (!settings) return;
        setSaving(true);
        setError(null);
        setMessage(null);
        try {
            const settingsToUpdate: Record<string, string> = {};
            Object.entries(settings).forEach(([key, setting]) => {
                if (setting) settingsToUpdate[key] = (setting as any).value;
            });
            console.log('Saving settings:', settingsToUpdate);
            const res = await fetch(`${API_URL}/api/admin/loyalty/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ settings: settingsToUpdate })
            });
            const responseData = await res.json();
            console.log('Save response:', responseData);
            if (res.ok) {
                setMessage('Settings saved successfully!');
                setTimeout(() => setMessage(null), 3000);
                await fetchSettings();
            } else {
                setError(responseData.error || 'Failed to save settings');
                await fetchSettings();
            }
        } catch (e) {
            console.error('Error saving settings:', e);
            setError('Failed to save settings');
            await fetchSettings();
        } finally {
            setSaving(false);
        }
    };

    const toggleSetting = async (settingKey: keyof LoyaltySettings) => {
        if (!settings || !settings[settingKey]) return;
        const currentValue = settings[settingKey]?.value || 'false';
        const newValue = currentValue === 'true' ? 'false' : 'true';
        setSaving(true);
        setError(null);
        setSettings(prev => prev ? { ...prev, [settingKey]: { ...(prev as any)[settingKey], value: newValue } } : null);
        try {
            console.log('Toggling setting:', settingKey, 'to', newValue);
            const res = await fetch(`${API_URL}/api/admin/loyalty/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ settings: { [settingKey]: newValue } })
            });
            const responseData = await res.json();
            console.log('Toggle response:', responseData);
            if (!res.ok) {
                setSettings(prev => prev ? { ...prev, [settingKey]: { ...(prev as any)[settingKey], value: currentValue } } : null);
                setError(responseData.error || 'Failed to update setting');
            } else {
                setError(null);
                setMessage('Setting updated successfully!');
                setTimeout(() => setMessage(null), 3000);
            }
        } catch (e) {
            console.error('Error toggling setting:', e);
            setSettings(prev => prev ? { ...prev, [settingKey]: { ...(prev as any)[settingKey], value: currentValue } } : null);
            setError('Failed to update setting');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 text-amber-600 animate-spin mr-2" />
                    <span className="text-gray-600">Loading settings...</span>
                </div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
                <div className="text-center py-8">
                    <SettingsIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Settings</h3>
                    <p className="text-gray-600 mb-4">Unable to load loyalty system settings. Please try refreshing the page.</p>
                    <Button onClick={fetchSettings} className="bg-amber-600 hover:bg-amber-700 text-white">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>
            )}
            {message && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">{message}</div>
            )}

            <h2 className="text-xl font-semibold text-gray-900 mb-6">Loyalty System Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Points Configuration</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Points per Peso Spent</label>
                        <Input type="number" value={settings.points_per_peso?.value || '1'} onChange={(e) => updateSettings({ points_per_peso: { ...settings.points_per_peso, value: e.target.value } })} className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70" min="0" step="0.1" />
                        <p className="text-xs text-gray-500 mt-1">{settings.points_per_peso?.description || 'Points earned per peso spent'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Points for Redemption</label>
                        <Input type="number" value={settings.minimum_points_redemption?.value || '10'} onChange={(e) => updateSettings({ minimum_points_redemption: { ...settings.minimum_points_redemption, value: e.target.value } })} className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70" min="0" />
                        <p className="text-xs text-gray-500 mt-1">{settings.minimum_points_redemption?.description || 'Minimum points required for redemption'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Welcome Points</label>
                        <Input type="number" value={settings.welcome_points?.value || '0'} onChange={(e) => updateSettings({ welcome_points: { ...settings.welcome_points, value: e.target.value } })} className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70" min="0" />
                        <p className="text-xs text-gray-500 mt-1">{settings.welcome_points?.description || 'Points given to new customers'}</p>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900">Welcome Points</p>
                            <p className="text-sm text-gray-600">Enable/disable welcome points for new customers</p>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => toggleSetting('welcome_points_enabled')} 
                            className={`${settings.welcome_points_enabled?.value === 'true' ? 'bg-green-100 border-green-200 text-green-800 hover:bg-green-200' : 'bg-red-100 border-red-200 text-red-800 hover:bg-red-200'} ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : (settings.welcome_points_enabled?.value === 'true' ? 'Enabled' : 'Disabled')}
                        </Button>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">System Controls</h3>
                    <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900">Loyalty System</p>
                            <p className="text-sm text-gray-600">Enable/disable loyalty points earning</p>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => toggleSetting('loyalty_enabled')} 
                            className={`${settings.loyalty_enabled?.value === 'true' ? 'bg-green-100 border-green-200 text-green-800 hover:bg-green-200' : 'bg-red-100 border-red-200 text-red-800 hover:bg-red-200'} ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : (settings.loyalty_enabled?.value === 'true' ? 'Enabled' : 'Disabled')}
                        </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900">Rewards Redemption</p>
                            <p className="text-sm text-gray-600">Enable/disable rewards redemption</p>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => toggleSetting('rewards_enabled')} 
                            className={`${settings.rewards_enabled?.value === 'true' ? 'bg-green-100 border-green-200 text-green-800 hover:bg-green-200' : 'bg-red-100 border-red-200 text-red-800 hover:bg-red-200'} ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : (settings.rewards_enabled?.value === 'true' ? 'Enabled' : 'Disabled')}
                        </Button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Points Expiry (Months)</label>
                        <Input type="number" value={settings.points_expiry_months?.value || '12'} onChange={(e) => updateSettings({ points_expiry_months: { ...settings.points_expiry_months, value: e.target.value } })} className="bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70" min="0" />
                        <p className="text-xs text-gray-500 mt-1">{settings.points_expiry_months?.description || 'Months before points expire'}</p>
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/20">
                <Button onClick={saveSettings} className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>
        </div>
    );
};

export default AdminLoyaltySettings;




