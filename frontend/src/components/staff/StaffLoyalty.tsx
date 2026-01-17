import React, { useEffect, useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  RefreshCw, 
  Gift, 
  Award
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import StaffRewardProcessing from './StaffRewardProcessing';


interface LoyaltyReward {
  id: number;
  name: string;
  description: string;
  points_required: number;
  reward_type: 'drink' | 'food' | 'discount' | 'upgrade' | 'bonus';
  discount_percentage: number | null;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
}

const StaffLoyalty: React.FC = () => {
  const [activeTab, setActiveTab] = useState('rewards');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);


  // New: loyalty management states
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true);
      
      // Fetch rewards
      const rewardsRes = await fetch('/api/loyalty/rewards', { credentials: 'omit' });
      if (rewardsRes.ok) {
        const rewardsData = await rewardsRes.json();
        if (rewardsData.success) {
          setRewards(rewardsData.rewards || []);
        }
      }
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    // Initialize Socket.IO connection
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Join staff room for real-time updates
    newSocket.emit('join-staff-room');

    // Listen for real-time updates
    newSocket.on('loyalty-updated', (data) => {
      console.log('Loyalty updated in StaffLoyalty:', data);
      fetchLoyaltyData();
    });

    newSocket.on('order-updated', (data) => {
      console.log('Order updated in StaffLoyalty:', data);
    });

    // Fetch initial loyalty data
    fetchLoyaltyData();

    return () => {
      newSocket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Loyalty Program</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage customer rewards and loyalty points system</p>
            </div>
          </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
        )}
        {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
          <strong>Success:</strong> {message}
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full flex flex-wrap items-center justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="rewards" className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100">
            <Gift className="w-4 h-4 mr-2" />
            Rewards
          </TabsTrigger>
          <TabsTrigger value="processing" className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100">
            <Award className="w-4 h-4 mr-2" />
            Reward Processing
          </TabsTrigger>
        </TabsList>


        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Rewards</h2>
            {rewards.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Rewards Available</h3>
                <p className="text-gray-600">No loyalty rewards have been created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((reward) => (
                  <div key={reward.id} className="bg-white/60 backdrop-blur-sm rounded-xl p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border border-[#a87437]">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                        <p className="text-sm text-gray-600">{reward.description}</p>
                      </div>
                      <Badge className={reward.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}>
                        {reward.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Points Required:</span>
                        <span className="font-medium">{reward.points_required}</span>
                      </div>
                      {reward.discount_percentage && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount:</span>
                          <span className="font-medium">{reward.discount_percentage}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reward Processing Tab */}
        <TabsContent value="processing" className="space-y-6">
          <StaffRewardProcessing />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffLoyalty;
