import React, { useEffect, useState } from 'react';
import { 
  Gift, 
  Coins, 
  Star, 
  Award, 
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Receipt,
  ChevronDown
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';

interface LoyaltyReward {
  id: number;
  name: string;
  description: string;
  points_required: number;
  reward_type: 'drink' | 'food' | 'discount' | 'upgrade' | 'bonus';
  discount_percentage?: number;
  image_url?: string;
  is_active: boolean;
}

interface PointsEarnedHistory {
  order_id: string;
  order_date: string;
  total_amount: number;
  points_earned: number;
  items: Array<{
    name: string;
    quantity: number;
    points_per_item: number;
  }>;
  status: string;
}

interface CustomerLoyaltyData {
  loyalty_points: number;
  total_earned: number;
  total_redeemed: number;
  member_since: string;
  available_rewards: LoyaltyReward[];
  redemption_history: any[];
  points_earned_history: PointsEarnedHistory[];
}

const CustomerLoyalty: React.FC = () => {
  const { user, authenticated, loading: authLoading } = useAuth();
  const [loyaltyData, setLoyaltyData] = useState<CustomerLoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [claimedRewards, setClaimedRewards] = useState<Array<{
    id: number; // redemptionId
    rewardId: number; // reward.id to correctly hide from available list
    name: string;
    expiresAt: string;
    status: string;
    claimCode?: string;
  }>>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Handle custom order placed event
  const handleOrderPlaced = (event: CustomEvent) => {
    console.log('🛒 Order placed - refreshing loyalty data:', event.detail);
    fetchLoyaltyData(); // Refresh loyalty data when order is placed
  };

  // Tab options for dropdown
  const tabOptions = [
    { value: 'overview', label: 'Available Rewards' },
    { value: 'points-history', label: 'Points Earned History' },
    { value: 'redemption-history', label: 'Redemption History' }
  ];

  // Screen size detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Load claimed rewards from localStorage on component mount and setup WebSocket
  useEffect(() => {
    if (authenticated && user) {
      // Initialize Socket.IO connection (use backend API URL and credentials)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const newSocket = io(API_URL, {
        transports: ['polling', 'websocket'],
        path: '/socket.io',
        withCredentials: true,
        timeout: 30000,
        forceNew: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1500
      });
      setSocket(newSocket);

      // Join customer room for real-time updates
      newSocket.on('connect', () => {
        newSocket.emit('join-customer-room', { customerEmail: user.email });
      });
      newSocket.io.on('reconnect', () => {
        newSocket.emit('join-customer-room', { customerEmail: user.email });
      });

      newSocket.on('connect_error', (err) => {
        console.warn('CustomerLoyalty socket connect_error:', err?.message || err);
      });

      // Listen for real-time updates
      newSocket.on('loyalty-updated', (data) => {
        console.log('Loyalty updated in CustomerLoyalty:', data);
        fetchLoyaltyData();
      });

      // Listen for custom order placed event to refresh loyalty data
      window.addEventListener('orderPlaced', handleOrderPlaced as EventListener);

      loadClaimedRewardsFromStorage();
      fetchLoyaltyData();

      return () => {
        newSocket.close();
        // Clean up custom event listener
        window.removeEventListener('orderPlaced', handleOrderPlaced as EventListener);
      };
    }
  }, [authenticated, user]);

  // Load claimed rewards from localStorage
  const loadClaimedRewardsFromStorage = () => {
    try {
      const stored = localStorage.getItem(`claimedRewards_${user?.id}`);
      if (stored) {
        const rewards = JSON.parse(stored);
        // Filter out expired rewards
        const now = new Date().getTime();
        const validRewards = rewards.filter((reward: any) => {
          const expiration = new Date(reward.expiresAt).getTime();
          return expiration > now;
        });
        setClaimedRewards(validRewards);
        
        // Clean up expired rewards from localStorage
        if (validRewards.length !== rewards.length) {
          localStorage.setItem(`claimedRewards_${user?.id}`, JSON.stringify(validRewards));
        }
      }
    } catch (error) {
      console.error('Error loading claimed rewards from storage:', error);
    }
  };

  // Save claimed rewards to localStorage
  const saveClaimedRewardsToStorage = (rewards: any[]) => {
    try {
      localStorage.setItem(`claimedRewards_${user?.id}`, JSON.stringify(rewards));
    } catch (error) {
      console.error('Error saving claimed rewards to storage:', error);
    }
  };

  // Clean up expired rewards periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = new Date().getTime();
      const validRewards = claimedRewards.filter(reward => {
        const expiration = new Date(reward.expiresAt).getTime();
        return expiration > now;
      });
      
      if (validRewards.length !== claimedRewards.length) {
        setClaimedRewards(validRewards);
        saveClaimedRewardsToStorage(validRewards);
      }
    }, 1000); // Check every second

    return () => clearInterval(cleanupInterval);
  }, [claimedRewards]);

  // Refresh claimed rewards when tab becomes visible (for countdown accuracy)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && authenticated && user) {
        loadClaimedRewardsFromStorage();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [authenticated, user]);

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      if (!authenticated || !user) {
        setError('Please log in to view your loyalty information');
        setLoading(false);
        return;
      }

      // Get customer ID from authenticated user
      const customerId = user.id;

      const [pointsRes, rewardsRes, historyRes, pointsHistoryRes] = await Promise.all([
        fetch(`/api/customers/${customerId}/loyalty`),
        fetch(`/api/loyalty/available-rewards/${customerId}`),
        fetch(`/api/loyalty/redemption-history/${customerId}`),
        fetch(`/api/customers/${customerId}/points-earned-history`)
      ]);

      if (pointsRes.ok && rewardsRes.ok && historyRes.ok && pointsHistoryRes.ok) {
        const [pointsData, rewardsData, historyData, pointsHistoryData] = await Promise.all([
          pointsRes.json(),
          rewardsRes.json(),
          historyRes.json(),
          pointsHistoryRes.json()
        ]);

        setLoyaltyData({
          loyalty_points: pointsData.loyalty_points || 0,
          total_earned: pointsData.total_earned || 0,
          total_redeemed: pointsData.total_redeemed || 0,
          member_since: pointsData.member_since || new Date().toISOString(),
          available_rewards: rewardsData.availableRewards || [],
          redemption_history: historyData.redemptions || [],
          points_earned_history: pointsHistoryData.pointsHistory || []
        });

        // Build pending claimed rewards from server history (keeps UI in sync across reloads)
        try {
          const nowMs = Date.now();
          const pendingFromServer: Array<{ id: number; rewardId: number; name: string; expiresAt: string; status: string; claimCode?: string; }> =
            (historyData.redemptions || [])
              .filter((r: any) => (r.status || '').toLowerCase() === 'pending' && r.expires_at && new Date(r.expires_at).getTime() > nowMs)
              .map((r: any) => ({
                id: Number(r.id),
                rewardId: Number(r.reward_id),
                name: r.reward_name || 'Reward',
                expiresAt: r.expires_at,
                status: 'pending',
                claimCode: r.claim_code
              }));

          // Merge with any locally stored claimed rewards, preferring server truth
          const byRewardId = new Map<number, any>();
          for (const cr of claimedRewards) {
            if (typeof cr.rewardId === 'number') byRewardId.set(cr.rewardId, cr);
          }
          for (const sr of pendingFromServer) {
            byRewardId.set(sr.rewardId, sr);
          }
          const merged = Array.from(byRewardId.values());
          setClaimedRewards(merged);
          saveClaimedRewardsToStorage(merged);
        } catch (e) {
          // Non-fatal; UI will still show available rewards
          console.warn('Failed to merge pending redemptions from server:', (e as any)?.message || e);
        }
      } else {
        setError('Failed to load loyalty data');
      }
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
      setError('Failed to load loyalty data');
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (reward: LoyaltyReward) => {
    if (!loyaltyData) return;

    if (loyaltyData.loyalty_points < reward.points_required) {
      setError(`You need ${reward.points_required - loyaltyData.loyalty_points} more points to claim this reward`);
      return;
    }

    try {
      if (!authenticated || !user) {
        setError('Please log in to claim rewards');
        return;
      }

      const customerId = user.id;
      
      const res = await fetch('/api/loyalty/redeem-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          rewardId: reward.id,
          orderId: null,
          redemptionProof: 'Claimed through customer interface',
          staffId: null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(`Successfully claimed "${reward.name}"! Your claim code is ${data.claimCode}. Show this code to staff to redeem.`);
        
        // Add to claimed rewards with countdown
        const newClaimedRewards = [...claimedRewards, {
          id: data.redemptionId,
          rewardId: reward.id,
          name: reward.name,
          expiresAt: data.expiresAt,
          status: 'pending',
          claimCode: data.claimCode
        }];
        setClaimedRewards(newClaimedRewards);
        
        // Save to localStorage
        saveClaimedRewardsToStorage(newClaimedRewards);
        
        // Refresh loyalty data to update points
        await fetchLoyaltyData();
        
        // Remove the claimed reward from available rewards
        if (loyaltyData) {
          setLoyaltyData(prev => prev ? {
            ...prev,
            available_rewards: prev.available_rewards.filter(r => r.id !== reward.id)
          } : null);
        }
        
        setTimeout(() => setMessage(null), 5000);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to claim reward');
      }
    } catch (error) {
      setError('Failed to claim reward');
    }
  };

  // Countdown timer component
  const CountdownTimer = ({ expiresAt }: { expiresAt: string }) => {
    const [timeLeft, setTimeLeft] = useState<number>(0);

    useEffect(() => {
      const calculateTimeLeft = () => {
        const now = new Date().getTime();
        const expiration = new Date(expiresAt).getTime();
        const difference = expiration - now;
        
        if (difference > 0) {
          setTimeLeft(Math.floor(difference / 1000));
        } else {
          setTimeLeft(0);
        }
      };

      calculateTimeLeft();
      const timer = setInterval(calculateTimeLeft, 1000);

      return () => clearInterval(timer);
    }, [expiresAt]);

    const formatTime = (seconds: number) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (timeLeft <= 0) {
      return <span className="text-red-600 font-semibold">EXPIRED</span>;
    }

    return (
      <span className={`font-mono ${timeLeft <= 300 ? 'text-red-600' : timeLeft <= 600 ? 'text-orange-600' : 'text-green-600'}`}>
        {formatTime(timeLeft)}
      </span>
    );
  };

  const getRewardTypeBadge = (type: string) => {
    const colors = {
      drink: 'bg-blue-100 text-blue-800 border-blue-200',
      food: 'bg-green-100 text-green-800 border-green-200',
      discount: 'bg-purple-100 text-purple-800 border-purple-200',
      upgrade: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      bonus: 'bg-pink-100 text-pink-800 border-pink-200'
    };
    return <Badge className={colors[type as keyof typeof colors]}>{type}</Badge>;
  };

  // Check if a reward is already claimed
  const isRewardClaimed = (rewardId: number) => {
    return claimedRewards.some(claimed => claimed.rewardId === rewardId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show error if not authenticated
  if (!authenticated || !user) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to view your loyalty information.</p>
          <Button onClick={() => navigate('/customer-login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading loyalty information...</p>
        </div>
      </div>
    );
  }

  if (error && !loyaltyData) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Error loading loyalty data</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-4 px-2 sm:px-3 lg:px-4">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4 sm:space-y-6 pl-0 sm:pl-1 lg:pl-2 pr-2 sm:pr-3 lg:pr-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Loyalty Program</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Earn points with every purchase and redeem amazing rewards!</p>
            </div>
          </div>
        </div>

        {/* Points Overview */}
        <Card className="bg-white border-2 border-[#a87437] shadow-xl hover:shadow-2xl transition-shadow duration-300 mx-2 sm:mx-3 lg:mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#6B5B5B]">
              <Coins className="h-6 w-6" />
              Your Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 border-2 border-[#a87437] rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="text-3xl font-bold text-[#a87437] mb-2">{loyaltyData?.loyalty_points || 0}</div>
                <p className="text-gray-600">Current Points</p>
                <p className="text-xs text-green-600 mt-1">
                  +{(loyaltyData?.points_earned_history && loyaltyData.points_earned_history.length > 0 ? (loyaltyData.points_earned_history[0].points_earned || 0) : 0)} from last order
                </p>
              </div>
              <div className="text-center p-4 border-2 border-[#a87437] rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="text-3xl font-bold text-green-600 mb-2">{loyaltyData?.total_earned || 0}</div>
                <p className="text-gray-600">Total Earned</p>
              </div>
              <div className="text-center p-4 border-2 border-[#a87437] rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="text-3xl font-bold text-purple-600 mb-2">{loyaltyData?.total_redeemed || 0}</div>
                <p className="text-gray-600">Total Redeemed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responsive Navigation */}
        <div className="space-y-6">
          {isMobile ? (
            /* Mobile Dropdown */
            <div className="w-full">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full bg-white border-2 border-[#a87437]/60 shadow-lg rounded-lg h-12">
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {tabOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            /* Desktop Navigation - Empty div since Tabs are in content section */
            <div></div>
          )}

          {/* Tab Content */}
          {isMobile ? (
            /* Mobile Content */
            <div className="space-y-4">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {loyaltyData?.available_rewards && loyaltyData.available_rewards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {loyaltyData.available_rewards
                        .filter(reward => !isRewardClaimed(reward.id))
                        .map((reward) => (
                        <Card key={reward.id} className="bg-white border-2 border-[#a87437] shadow-lg hover:shadow-xl transition-shadow duration-300">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between text-[#6B5B5B]">
                              <span className="text-lg">{reward.name}</span>
                              {getRewardTypeBadge(reward.reward_type)}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <p className="text-gray-600">{reward.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Coins className="h-4 w-4 text-[#a87437]" />
                                <span className="font-semibold text-[#6B5B5B]">{reward.points_required} points</span>
                              </div>
                              <Button
                                onClick={() => claimReward(reward)}
                                disabled={!loyaltyData || loyaltyData.loyalty_points < reward.points_required}
                                className="bg-[#a87437] hover:bg-[#8f652f] text-white"
                              >
                                <Gift className="h-4 w-4 mr-2" />
                                Claim
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Gift className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No rewards available</p>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'points-history' && (
                <div className="space-y-4">
                  {loyaltyData?.points_earned_history && loyaltyData.points_earned_history.length > 0 ? (
                    <div className="space-y-3">
                      {loyaltyData.points_earned_history.map((history, index) => (
                        <Card key={index} className="bg-white border-2 border-[#a87437] shadow-lg">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-[#6B5B5B]">Order #{history.order_id}</p>
                                <p className="text-sm text-gray-600">{new Date(history.order_date).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">+{history.points_earned} points</p>
                                <p className="text-sm text-gray-600">₱{history.order_total}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No points history available</p>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'redemption-history' && (
                <div className="space-y-4">
                  {claimedRewards.length > 0 ? (
                    <div className="space-y-3">
                      {claimedRewards.map((reward) => (
                        <Card key={reward.id} className="bg-white border-2 border-[#a87437] shadow-lg">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-[#6B5B5B]">{reward.name}</p>
                                <p className="text-sm text-gray-600">Expires: {new Date(reward.expiresAt).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <Badge className={`${reward.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {reward.status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No redemption history available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Desktop Content */
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 bg-white border-2 border-[#a87437]/60 shadow-lg rounded-lg mx-auto w-[98%] sm:w-[96%] lg:w-[94%]">
                {tabOptions.map((option) => (
                  <TabsTrigger 
                    key={option.value}
                    value={option.value} 
                    className="w-full justify-center data-[state=active]:bg-[#a87437] data-[state=active]:text-white text-sm px-3 py-3 whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    <span className="truncate">{option.label}</span>
            </TabsTrigger>
                ))}
          </TabsList>

          {/* Available Rewards Tab */}
          <TabsContent value="overview" className="space-y-4 mx-2 sm:mx-3 lg:mx-4">
            {loyaltyData?.available_rewards && loyaltyData.available_rewards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loyaltyData.available_rewards
                  .filter(reward => !isRewardClaimed(reward.id))
                  .map((reward) => (
                  <Card key={reward.id} className="bg-white border-2 border-[#a87437] shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-[#6B5B5B]">
                        <span className="text-lg">{reward.name}</span>
                        {getRewardTypeBadge(reward.reward_type)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-600">{reward.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-[#a87437]" />
                          <span className="font-semibold text-[#6B5B5B]">{reward.points_required} points</span>
                        </div>
                        <Button
                          onClick={() => claimReward(reward)}
                          disabled={!loyaltyData || loyaltyData.loyalty_points < reward.points_required}
                          className="bg-[#a87437] hover:bg-[#8f652f] text-white"
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          Claim
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-white border-2 border-[#a87437] shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="text-center py-8">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No rewards available at the moment</p>
                  <p className="text-sm text-gray-500">Keep earning points to unlock amazing rewards!</p>
                </CardContent>
              </Card>
            )}

            {/* Show message when all rewards are claimed */}
            {loyaltyData?.available_rewards && 
             loyaltyData.available_rewards.length > 0 && 
             loyaltyData.available_rewards.every(reward => isRewardClaimed(reward.id)) && (
              <Card className="bg-blue-50 border-2 border-blue-200 shadow-lg">
                <CardContent className="text-center py-6">
                  <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-blue-800 font-medium">All available rewards have been claimed!</p>
                  <p className="text-sm text-blue-600">Check your claimed rewards below or wait for new rewards to become available.</p>
                </CardContent>
              </Card>
            )}

            {/* Claimed Rewards with Countdown */}
            {claimedRewards.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#6B5B5B]">
                  <ShoppingCart className="w-5 h-5" />
                  Claimed Rewards (Expires in 20 minutes)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {claimedRewards.map((claimedReward) => (
                    <Card key={claimedReward.id} className="border-2 border-[#a87437]/60 bg-amber-50 shadow-md">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-[#6B5B5B]">
                          <span className="text-lg">{claimedReward.name}</span>
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Claimed
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <span className="text-sm font-medium text-green-600">{claimedReward.status}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Claim Code:</span>
                          <span className="text-sm font-bold text-[#a87437] bg-[#a87437]/10 px-2 py-1 rounded">
                            {claimedReward.claimCode}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Expires in:</span>
                          <CountdownTimer expiresAt={claimedReward.expiresAt} />
                        </div>
                        <div className="text-xs text-[#a87437] text-center pt-2 border-t border-[#a87437]/20">
                          Claim expires in 20 minutes. Visit the cafe to redeem!
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Points Earned History Tab */}
          <TabsContent value="points-history" className="space-y-4 mx-2 sm:mx-3 lg:mx-4">
            {loyaltyData?.points_earned_history && loyaltyData.points_earned_history.length > 0 ? (
              <div className="space-y-4">
                {loyaltyData.points_earned_history.map((history, index) => (
                  <Card key={index} className="bg-white border-2 border-[#a87437]/60 shadow-md">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-full">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[#6B5B5B]">Order #{history.order_id}</h3>
                            <p className="text-sm text-gray-600">{formatDate(history.order_date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">+{history.points_earned} pts</div>
                          <div className="text-sm text-gray-600">₱{history.total_amount.toFixed(2)}</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Order Status:</span>
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            {history.status}
                          </Badge>
                        </div>
                        <div className="border-t pt-3">
                          <h4 className="font-medium text-gray-800 mb-2">Items Earned Points:</h4>
                          <div className="space-y-2">
                            {history.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="text-green-600 font-medium">
                                  +{item.points_per_item * item.quantity} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-white border-2 border-[#a87437] shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="text-center py-8">
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No points earned history yet</p>
                  <p className="text-sm text-gray-500">Place your first order to start earning points!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Redemption History Tab */}
          <TabsContent value="redemption-history" className="space-y-4 mx-2 sm:mx-3 lg:mx-4">
            {loyaltyData?.redemption_history && loyaltyData.redemption_history.length > 0 ? (
              <div className="space-y-4">
                {loyaltyData.redemption_history.map((redemption, index) => (
                  <Card key={index} className="bg-white border-2 border-[#a87437]/60 shadow-md">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[#6B5B5B]">{redemption.reward_name || 'Unknown Reward'}</p>
                          <p className="text-sm text-gray-600">{redemption.redemption_date}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          {redemption.status || 'Completed'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-white border-2 border-[#a87437] shadow-xl hover:shadow-2xl transition-shadow duration-300">
                <CardContent className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No redemption history yet</p>
                  <p className="text-sm text-gray-500">Start claiming rewards to see your history here!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
          )}
        </div>

        {/* Message Display */}
        {message && (
          <Card className="bg-green-50 border-2 border-green-200 shadow-lg">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span>{message}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="bg-red-50 border-2 border-red-200 shadow-lg">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomerLoyalty;
