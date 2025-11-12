import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Gift,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Calendar,
  // Unused icons removed
  Clock,
  ClipboardCheck,
  XCircle,
  CircleDotDashed,
  Search,
  User,
  Coins,
  // CircleDot
} from 'lucide-react';
import Swal from 'sweetalert2';
import axiosInstance from '../../utils/axiosInstance';

interface ClaimedReward {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  reward_id: number;
  reward_name: string;
  reward_type: string;
  description: string;
  points_cost?: number; // optional: some admin endpoints return points_required
  points_required?: number;
  redemption_date: string | null; // when created/claimed
  expires_at: string;
  status: 'pending' | 'completed' | 'processed' | 'cancelled' | 'expired';
  staff_id: number | null;
  redemption_proof: string | null;
  order_id: number | null;
  claim_code?: string; // claim code for redemption
}

// Removed unused LoyaltySettings interface

interface LoyaltyStats {
  totalClaimed: number;
  pendingProcessing: number;
  processedToday: number;
  expiredToday: number;
}

const CountdownTimer: React.FC<{ expiryDate: string }> = ({ expiryDate }) => {
  const calculateTimeLeft = useCallback(() => {
    const difference = +new Date(expiryDate) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  }, [expiryDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  }, [calculateTimeLeft]);

  const timerComponents: React.ReactElement[] = [];

  Object.keys(timeLeft).forEach((interval) => {
    if ((timeLeft as any)[interval] !== undefined) {
      timerComponents.push(
        <span key={interval} className="text-sm font-medium">
          {(timeLeft as any)[interval]} {interval}{' '}
        </span>
      );
    }
  });

  return (
    <div className="flex items-center space-x-1">
      <Clock className="w-4 h-4 text-gray-500" />
      {timerComponents.length ? (
        timerComponents
      ) : (
        <span className="text-sm text-red-500 font-medium">Expired!</span>
      )}
    </div>
  );
};

const AdminRewardProcessing: React.FC = () => {
  const [claimedRewards, setClaimedRewards] = useState<ClaimedReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRewardId, setProcessingRewardId] = useState<number | null>(null);
  const [redemptionProof, setRedemptionProof] = useState<string>('');
  const [activeTab, setActiveTab] = useState('pending');
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [claimCode, setClaimCode] = useState('');
  const [searchResult, setSearchResult] = useState<ClaimedReward | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchClaimedRewards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Prefer admin redemptions API (supports filtering and consistent fields)
      const params = new URLSearchParams();
      if (activeTab === 'pending') params.set('status', 'pending');
      if (activeTab === 'processed' || activeTab === 'completed') params.set('status', 'completed');
      if (activeTab === 'cancelled') params.set('status', 'cancelled');
      if (activeTab === 'expired') params.set('status', 'expired');
      // axiosInstance already has baseURL configured, so use relative path
      const url = `/api/admin/loyalty/redemptions?${params.toString()}`;
      console.log('📋 Admin: Fetching redemptions from:', url);
      console.log('📋 Admin: axiosInstance baseURL:', axiosInstance.defaults.baseURL);
      const response = await axiosInstance.get(url);
      console.log('📋 Admin: Received response:', response.data);
      if (response.data.success) {
        // Normalize fields so the table renders regardless of source names
        const normalized: ClaimedReward[] = (response.data.redemptions || []).map((r: any) => ({
          id: r.id,
          customer_id: r.customer_id,
          customer_name: r.customer_name,
          customer_email: r.customer_email,
          reward_id: r.reward_id,
          reward_name: r.reward_name,
          reward_type: r.reward_type,
          description: r.reward_description,
          points_cost: r.points_required ?? r.points_cost,
          points_required: r.points_required,
          redemption_date: r.redemption_date ?? r.created_at ?? null,
          expires_at: r.expires_at,
          status: r.status,
          staff_id: r.staff_id ?? null,
          redemption_proof: r.redemption_proof ?? null,
          order_id: r.order_id ?? null,
          claim_code: r.claim_code ?? null,
        }));
        console.log(`✅ Admin: Found ${normalized.length} redemptions for tab: ${activeTab}`);
        setClaimedRewards(normalized);
      } else {
        console.error('❌ Admin: API returned success:false', response.data.error);
        setError(response.data.error || 'Failed to fetch claimed rewards');
      }
    } catch (err: any) {
      console.error('❌ Admin: Error fetching claimed rewards:', err);
      console.error('❌ Admin: Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: '/api/admin/loyalty/redemptions'
      });
      
      // Provide more specific error messages
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to fetch redemptions. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchLoyaltyStats = useCallback(async () => {
    try {
      const response = await axiosInstance.get('/api/admin/loyalty/statistics');
      if (response.data.success) {
        setStats(response.data.stats);
      } else {
        console.error('Failed to fetch loyalty stats:', response.data.error);
      }
    } catch (err) {
      console.error('Error fetching loyalty stats:', err);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchClaimedRewards();
    fetchLoyaltyStats();
    
    // Auto-refresh every 10 seconds to catch new redemptions
    const interval = setInterval(() => {
      fetchClaimedRewards();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchClaimedRewards, fetchLoyaltyStats]);

  const searchByClaimCode = async () => {
    if (!claimCode.trim()) {
      setSearchError('Please enter a claim code');
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const response = await axiosInstance.get(`/api/admin/loyalty/redemptions/search/${claimCode.toUpperCase()}`);

      if (response.data.success) {
        // Normalize the redemption data to match ClaimedReward interface
        const normalized: ClaimedReward = {
          id: response.data.redemption.id,
          customer_id: response.data.redemption.customer_id,
          customer_name: response.data.redemption.customer_name,
          customer_email: response.data.redemption.customer_email,
          reward_id: response.data.redemption.reward_id,
          reward_name: response.data.redemption.reward_name,
          reward_type: response.data.redemption.reward_type,
          description: response.data.redemption.reward_description || '',
          points_cost: response.data.redemption.points_required || response.data.redemption.points_redeemed,
          points_required: response.data.redemption.points_required,
          redemption_date: response.data.redemption.redemption_date || response.data.redemption.created_at || null,
          expires_at: response.data.redemption.expires_at,
          status: response.data.redemption.status,
          staff_id: response.data.redemption.staff_id || null,
          redemption_proof: response.data.redemption.redemption_proof || null,
          order_id: response.data.redemption.order_id || null,
        };
        setSearchResult(normalized);
      } else {
        setSearchError(response.data.error || 'Redemption not found');
      }
    } catch (error: any) {
      setSearchError(error.response?.data?.error || 'Failed to search redemption');
    } finally {
      setSearchLoading(false);
    }
  };

  const processReward = async (rewardId: number, status: 'processed' | 'cancelled') => {
    if (status === 'processed' && !redemptionProof.trim()) {
      Swal.fire('Error', 'Redemption proof is required to process the reward.', 'error');
      return;
    }

    setProcessingRewardId(rewardId);
    try {
      const response = await axiosInstance.put(`/api/admin/loyalty/redemptions/${rewardId}/status`, {
        status: status === 'processed' ? 'completed' : 'cancelled',
        notes: status === 'processed' ? (redemptionProof.trim() || 'Processed by admin') : 'Cancelled by admin',
      });

      if (response.data.success) {
        Swal.fire('Success', `Reward ${status} successfully!`, 'success');
        setRedemptionProof('');
        setSearchResult(null);
        setClaimCode('');
        fetchClaimedRewards(); // Refresh the list
        fetchLoyaltyStats(); // Refresh stats
      } else {
        throw new Error(response.data.error || `Failed to ${status} reward`);
      }
    } catch (err: any) {
      console.error(`Error ${status} reward:`, err);
      Swal.fire('Error', err.response?.data?.error || err.message || `Failed to ${status} reward.`, 'error');
    } finally {
      setProcessingRewardId(null);
    }
  };

  // Don't filter - the backend already filters by status
  // Just use the claimedRewards directly since they're already filtered by activeTab
  const filteredRewards = claimedRewards;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-gray-600">Loading rewards...</p>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="text-center p-4 text-red-600">
        <AlertCircle className="h-10 w-10 mx-auto mb-2" />
        <p className="mb-2">Error: {error}</p>
        <Button onClick={fetchClaimedRewards} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Reward Processing</h1>

      {/* Search by Code Section */}
      <Card className="mb-6 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search by Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
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
              disabled={searchLoading || !claimCode.trim()}
              className="bg-[#a87437] hover:bg-[#a87437]/90 text-white h-12 px-8"
            >
              <Search className="w-5 h-5 mr-2" />
              {searchLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span>{searchError}</span>
              <button onClick={() => setSearchError(null)} className="ml-auto text-red-600 hover:text-red-800">
                ×
              </button>
            </div>
          )}

          {searchResult && (
            <Card className="mt-4 border-2 border-[#a87437]/20 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-xl">
                  <span className="text-[#6B5B5B]">Redemption Found</span>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    searchResult.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    searchResult.status === 'completed' ? 'bg-green-100 text-green-800' :
                    searchResult.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {searchResult.status.toUpperCase()}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 text-lg">Customer Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{searchResult.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{searchResult.customer_email}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 text-lg">Reward Details</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">{searchResult.reward_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm">{searchResult.points_cost} points</span>
                      </div>
                      <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        Code: {claimCode}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
                    <span>Redemption Date: {searchResult.redemption_date ? new Date(searchResult.redemption_date).toLocaleString() : 'N/A'}</span>
                    <span className={isExpired(searchResult.expires_at) ? 'text-red-600' : 'text-green-600'}>
                      Expires: {new Date(searchResult.expires_at).toLocaleString()}
                    </span>
                  </div>

                  {searchResult.status === 'pending' && !isExpired(searchResult.expires_at) && (
                    <div className="flex gap-4">
                      <Input
                        placeholder="Redemption Proof (e.g., Staff Name)"
                        value={redemptionProof}
                        onChange={(e) => setRedemptionProof(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => processReward(searchResult.id, 'processed')}
                        className="bg-[#a87437] hover:bg-[#a87437]/90 text-white px-6 py-3"
                        disabled={processingRewardId === searchResult.id || !redemptionProof.trim()}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Complete Redemption
                      </Button>
                      <Button
                        onClick={() => processReward(searchResult.id, 'cancelled')}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 px-6 py-3"
                        disabled={processingRewardId === searchResult.id}
                      >
                        <XCircle className="w-5 h-5 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}

                  {isExpired(searchResult.expires_at) && (
                    <div className="text-center py-4 text-red-600 font-medium">
                      This redemption has expired and cannot be processed.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Claimed</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClaimed}</div>
              <p className="text-xs text-muted-foreground">All time rewards claimed</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Processing</CardTitle>
              <CircleDotDashed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingProcessing}</div>
              <p className="text-xs text-muted-foreground">Rewards awaiting staff action</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processed Today</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.processedToday}</div>
              <p className="text-xs text-muted-foreground">Rewards processed in the last 24h</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Today</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.expiredToday}</div>
              <p className="text-xs text-muted-foreground">Rewards expired in the last 24h</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processed">Processed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-700">Pending Rewards</h2>
            <Button 
              onClick={() => fetchClaimedRewards()} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
          {filteredRewards.length === 0 ? (
            <p className="text-gray-500">No pending rewards to process.</p>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Points Cost</TableHead>
                    <TableHead>Claim Code</TableHead>
                    <TableHead>Claimed At</TableHead>
                    <TableHead>Expires In</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead className="w-[200px]">Proof / Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell>
                        <div className="font-medium">{reward.customer_name}</div>
                        <div className="text-sm text-gray-500">{reward.customer_email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{reward.reward_name}</div>
                        <div className="text-sm text-gray-500">{reward.description}</div>
                      </TableCell>
                      <TableCell className="font-medium">{reward.points_cost}</TableCell>
                      <TableCell>
                        <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-center">
                          {reward.claim_code || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>{reward.redemption_date ? new Date(reward.redemption_date).toLocaleDateString() : '—'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{reward.redemption_date ? new Date(reward.redemption_date).toLocaleTimeString() : ''}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CountdownTimer expiryDate={reward.expires_at} />
                      </TableCell>
                      <TableCell>{reward.order_id || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-2">
                          <Input
                            placeholder="Redemption Proof (e.g., Staff Name)"
                            value={redemptionProof}
                                                         onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRedemptionProof(e.target.value)}
                            disabled={processingRewardId === reward.id}
                          />
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => processReward(reward.id, 'processed')}
                              disabled={processingRewardId === reward.id || !redemptionProof.trim()}
                              className="flex-1"
                            >
                              {processingRewardId === reward.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              Process
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => processReward(reward.id, 'cancelled')}
                              disabled={processingRewardId === reward.id}
                              className="flex-1"
                            >
                              {processingRewardId === reward.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="processed" className="mt-4">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Processed Rewards</h2>
          {filteredRewards.length === 0 ? (
            <p className="text-gray-500">No rewards have been processed yet.</p>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Points Cost</TableHead>
                    <TableHead>Claimed At</TableHead>
                    <TableHead>Processed At</TableHead>
                    <TableHead>Processed By</TableHead>
                    <TableHead>Proof</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell>
                        <div className="font-medium">{reward.customer_name}</div>
                        <div className="text-sm text-gray-500">{reward.customer_email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{reward.reward_name}</div>
                        <div className="text-sm text-gray-500">{reward.description}</div>
                      </TableCell>
                      <TableCell className="font-medium">{reward.points_cost}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>{reward.redemption_date ? new Date(reward.redemption_date).toLocaleDateString() : '—'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{reward.redemption_date ? new Date(reward.redemption_date).toLocaleTimeString() : ''}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {reward.redemption_date ? (
                          <div className="flex items-center space-x-1 text-sm">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span>{new Date(reward.redemption_date).toLocaleDateString()}</span>
                          </div>
                        ) : 'N/A'}
                        {reward.redemption_date ? (
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(reward.redemption_date).toLocaleTimeString()}</span>
                          </div>
                        ) : ''}
                      </TableCell>
                      <TableCell>{reward.staff_id || 'N/A'}</TableCell>
                      <TableCell>{reward.redemption_proof || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-4">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Cancelled Rewards</h2>
          {filteredRewards.length === 0 ? (
            <p className="text-gray-500">No rewards have been cancelled.</p>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Points Cost</TableHead>
                    <TableHead>Claimed At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell>
                        <div className="font-medium">{reward.customer_name}</div>
                        <div className="text-sm text-gray-500">{reward.customer_email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{reward.reward_name}</div>
                        <div className="text-sm text-gray-500">{reward.description}</div>
                      </TableCell>
                      <TableCell className="font-medium">{reward.points_cost}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>{reward.redemption_date ? new Date(reward.redemption_date).toLocaleDateString() : '—'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{reward.redemption_date ? new Date(reward.redemption_date).toLocaleTimeString() : ''}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-red-600">{reward.status.toUpperCase()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="expired" className="mt-4">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Expired Rewards</h2>
          {filteredRewards.length === 0 ? (
            <p className="text-gray-500">No rewards have expired.</p>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Points Cost</TableHead>
                    <TableHead>Claimed At</TableHead>
                    <TableHead>Expired At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell>
                        <div className="font-medium">{reward.customer_name}</div>
                        <div className="text-sm text-gray-500">{reward.customer_email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{reward.reward_name}</div>
                        <div className="text-sm text-gray-500">{reward.description}</div>
                      </TableCell>
                      <TableCell className="font-medium">{reward.points_cost}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>{reward.redemption_date ? new Date(reward.redemption_date).toLocaleDateString() : '—'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{reward.redemption_date ? new Date(reward.redemption_date).toLocaleTimeString() : ''}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-red-600">
                        <div className="flex items-center space-x-1 text-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>{new Date(reward.expires_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(reward.expires_at).toLocaleTimeString()}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRewardProcessing;
