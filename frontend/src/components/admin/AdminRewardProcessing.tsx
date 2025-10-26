import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../customer/AuthContext';
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
  // CircleDot
} from 'lucide-react';
import Swal from 'sweetalert2';

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
  const { user } = useAuth();
  const [claimedRewards, setClaimedRewards] = useState<ClaimedReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRewardId, setProcessingRewardId] = useState<number | null>(null);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [redemptionProof, setRedemptionProof] = useState<string>('');
  const [activeTab, setActiveTab] = useState('pending');
  const [stats, setStats] = useState<LoyaltyStats | null>(null);

  const fetchClaimedRewards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      // Prefer admin redemptions API (supports filtering and consistent fields)
      const params = new URLSearchParams();
      if (activeTab === 'pending') params.set('status', 'pending');
      if (activeTab === 'processed' || activeTab === 'completed') params.set('status', 'completed');
      if (activeTab === 'cancelled') params.set('status', 'cancelled');
      if (activeTab === 'expired') params.set('status', 'expired');
      const response = await fetch(`/api/admin/loyalty/redemptions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        // Normalize fields so the table renders regardless of source names
        const normalized: ClaimedReward[] = (data.redemptions || []).map((r: any) => ({
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
        }));
        setClaimedRewards(normalized);
      } else {
        setError(data.error || 'Failed to fetch claimed rewards');
      }
    } catch (err: any) {
      console.error('Error fetching claimed rewards:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchLoyaltyStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/loyalty/statistics', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        console.error('Failed to fetch loyalty stats:', data.error);
      }
    } catch (err) {
      console.error('Error fetching loyalty stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchClaimedRewards();
    fetchLoyaltyStats();
    // Set staffId from localStorage or default to 9 for testing
    const storedStaffId = localStorage.getItem('staffId');
    setStaffId(storedStaffId ? parseInt(storedStaffId) : (user?.id || 9)); // Fallback to 9 if user.id is not available
  }, [fetchClaimedRewards, fetchLoyaltyStats, user?.id]);

  const processReward = async (rewardId: number, status: 'processed' | 'cancelled') => {
    if (!staffId) {
      Swal.fire('Error', 'Staff ID not available. Please log in as staff.', 'error');
      return;
    }

    if (status === 'processed' && !redemptionProof.trim()) {
      Swal.fire('Error', 'Redemption proof is required to process the reward.', 'error');
      return;
    }

    setProcessingRewardId(rewardId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/loyalty/redemptions/${rewardId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId: user?.id,
          status: status === 'processed' ? 'completed' : 'cancelled',
          notes: status === 'processed' ? (redemptionProof.trim() || 'Processed by admin') : 'Cancelled by admin',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to ${status} reward`);
      }

      Swal.fire('Success', `Reward ${status} successfully!`, 'success');
      setRedemptionProof('');
      fetchClaimedRewards(); // Refresh the list
      fetchLoyaltyStats(); // Refresh stats
    } catch (err: any) {
      console.error(`Error ${status} reward:`, err);
      Swal.fire('Error', err.message || `Failed to ${status} reward.`, 'error');
    } finally {
      setProcessingRewardId(null);
    }
  };

  const filteredRewards = claimedRewards.filter((reward) => {
    const now = new Date();
    const expiry = new Date(reward.expires_at);
    if (activeTab === 'pending') {
      return reward.status === 'pending' && expiry > now;
    } else if (activeTab === 'processed') {
      return reward.status === 'completed' || reward.status === 'processed';
    } else if (activeTab === 'cancelled') {
      return reward.status === 'cancelled';
    } else if (activeTab === 'expired') {
      return reward.status === 'pending' && expiry <= now;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-gray-600">Loading rewards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <AlertCircle className="h-10 w-10 mx-auto mb-2" />
        <p>Error: {error}</p>
        <Button onClick={fetchClaimedRewards} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Reward Processing</h1>

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
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Pending Rewards</h2>
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
