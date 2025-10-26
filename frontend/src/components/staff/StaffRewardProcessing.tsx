import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Gift, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Coins,
  AlertCircle
} from 'lucide-react';

interface RewardRedemption {
  id: number;
  customer_id: number;
  reward_id: number;
  claim_code: string;
  points_redeemed: number;
  redemption_date: string;
  status: 'pending' | 'completed' | 'cancelled' | 'expired';
  expires_at: string;
  customer_name: string;
  customer_email: string;
  reward_name: string;
  reward_type: string;
}

const StaffRewardProcessing: React.FC = () => {
  const [claimCode, setClaimCode] = useState('');
  const [redemption, setRedemption] = useState<RewardRedemption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingRedemptions, setPendingRedemptions] = useState<RewardRedemption[]>([]);
  const [activeTab, setActiveTab] = useState('search');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    fetchPendingRedemptions();
  }, []);

  const fetchPendingRedemptions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/staff/reward-redemptions/pending`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingRedemptions(data.redemptions || []);
      }
    } catch (error) {
      console.error('Error fetching pending redemptions:', error);
    }
  };

  const searchByClaimCode = async () => {
    if (!claimCode.trim()) {
      setError('Please enter a claim code');
      return;
    }

    setLoading(true);
    setError(null);
    setRedemption(null);

    try {
      const response = await fetch(`${API_URL}/api/staff/reward-redemptions/search/${claimCode}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRedemption(data.redemption);
        } else {
          setError(data.error || 'Redemption not found');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to search redemption');
      }
    } catch (error) {
      setError('Failed to search redemption');
    } finally {
      setLoading(false);
    }
  };

  const processRedemption = async (redemptionId: number, action: 'complete' | 'cancel') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/staff/reward-redemptions/${redemptionId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuccess(`Reward ${action === 'complete' ? 'completed' : 'cancelled'} successfully!`);
          setRedemption(null);
          setClaimCode('');
          fetchPendingRedemptions();
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(data.error || `Failed to ${action} redemption`);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to ${action} redemption`);
      }
    } catch (error) {
      setError(`Failed to ${action} redemption`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
      expired: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="flex space-x-3 mb-8">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'search'
                  ? 'bg-[#a87437] text-white'
                  : 'text-[#6B5B5B] hover:bg-gray-100'
              }`}
            >
              Search by Code
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'bg-[#a87437] text-white'
                  : 'text-[#6B5B5B] hover:bg-gray-100'
              }`}
            >
              Pending Redemptions ({pendingRedemptions.length})
            </button>
          </div>

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-8">
              {/* Search Form */}
              <div className="flex gap-6">
                <div className="flex-1">
                  <Input
                    placeholder="Enter claim code (e.g., ABC12345)"
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                    className="text-lg font-mono tracking-wider h-12 px-4"
                    onKeyPress={(e) => e.key === 'Enter' && searchByClaimCode()}
                  />
                </div>
                <Button 
                  onClick={searchByClaimCode}
                  disabled={loading || !claimCode.trim()}
                  className="bg-[#a87437] hover:bg-[#a87437]/90 text-white h-12 px-8"
                >
                  <Search className="w-5 h-5 mr-2" />
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {/* Search Results */}
              {redemption && (
                <Card className="border-2 border-[#a87437]/20 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-xl">
                      <span className="text-[#6B5B5B]">Redemption Found</span>
                      {getStatusBadge(redemption.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3 text-lg">Customer Information</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm">{redemption.customer_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{redemption.customer_email}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3 text-lg">Reward Details</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium">{redemption.reward_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm">{redemption.points_redeemed} points</span>
                          </div>
                          <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            Code: {redemption.claim_code}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
                        <span>Redemption Date: {new Date(redemption.redemption_date).toLocaleString()}</span>
                        <span className={isExpired(redemption.expires_at) ? 'text-red-600' : 'text-green-600'}>
                          Expires: {new Date(redemption.expires_at).toLocaleString()}
                        </span>
                      </div>

                      {redemption.status === 'pending' && !isExpired(redemption.expires_at) && (
                        <div className="flex gap-4">
                          <Button
                            onClick={() => processRedemption(redemption.id, 'complete')}
                            className="bg-[#a87437] hover:bg-[#a87437]/90 text-white px-6 py-3"
                            disabled={loading}
                          >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Complete Redemption
                          </Button>
                          <Button
                            onClick={() => processRedemption(redemption.id, 'cancel')}
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50 px-6 py-3"
                            disabled={loading}
                          >
                            <XCircle className="w-5 h-5 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}

                      {isExpired(redemption.expires_at) && (
                        <div className="text-center py-4 text-red-600 font-medium">
                          This redemption has expired and cannot be processed.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Pending Redemptions Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-6">
              {pendingRedemptions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Gift className="w-16 h-16 mx-auto mb-6 text-gray-300" />
                  <p className="text-lg">No pending redemptions</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingRedemptions.map((redemption) => (
                    <Card key={redemption.id} className="border-2 border-[#a87437]/20 shadow-md">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-base">
                          <span className="text-[#6B5B5B]">{redemption.reward_name}</span>
                          {getStatusBadge(redemption.status)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-1">
                        <div className="text-sm">
                          <div className="font-medium mb-1">{redemption.customer_name}</div>
                          <div className="text-gray-500">{redemption.customer_email}</div>
                        </div>
                        <div className="text-sm font-mono bg-gray-100 px-3 py-2 rounded text-center">
                          {redemption.claim_code}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isExpired(redemption.expires_at) ? (
                            <span className="text-red-600">EXPIRED</span>
                          ) : (
                            `Expires: ${new Date(redemption.expires_at).toLocaleTimeString()}`
                          )}
                        </div>
                        {redemption.status === 'pending' && !isExpired(redemption.expires_at) && (
                          <div className="flex gap-3">
                            <Button
                              size="sm"
                              onClick={() => processRedemption(redemption.id, 'complete')}
                              className="bg-[#a87437] hover:bg-[#a87437]/90 text-white text-sm px-4 py-2"
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => processRedemption(redemption.id, 'cancel')}
                              className="border-red-300 text-red-600 hover:bg-red-50 text-sm px-4 py-2"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-600 hover:text-green-800">
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffRewardProcessing;