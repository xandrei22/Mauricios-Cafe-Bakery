import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Star, ShoppingBag, Monitor } from "lucide-react";
import { useCart } from "../../contexts/CartContext";

interface DashboardData {
  loyaltyPoints: number;
  pointsFromLastOrder: number;
  totalOrders: number;
  ordersThisMonth: number;
  currentOrder: {
    id: string;
    status: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    orderTime: string;
  } | null;
  recentOrders: Array<{
    id: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    status: string;
    paymentStatus: string;
    orderTime: string;
    completedTime: string;
  }>;
  popularItems: Array<{
    name: string;
    orderCount: number;
  }>;
}

export default function CustomerDasboard() {
  const { user, loading, authenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [popularItems, setPopularItems] = useState<any[]>([]);
  const [redeemableItems, setRedeemableItems] = useState<any[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !authenticated) {
      navigate("/customer-login");
      return;
    }

    if (authenticated && user?.id) {
      fetchDashboardData();
      fetchPopularItems();
      fetchRedeemableItems();
    }
  }, [loading, authenticated, user, navigate]);

  const fetchDashboardData = async () => {
    try {
      if (!user) return;
      
      setLoadingDashboard(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      console.log('Fetching dashboard data for user ID:', user.id);
      
      // Use the dedicated dashboard API endpoint
      const response = await fetch(`${API_URL}/api/customer/dashboard?customerId=${user.id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Dashboard API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard API response data:', data);
        
        if (data.success) {
          // Calculate points from last order
          let pointsFromLastOrder = 0;
          if (data.orders && data.orders.recent && data.orders.recent.length > 0) {
            const lastOrder = data.orders.recent[0];
            pointsFromLastOrder = Math.floor(lastOrder.total || 0);
          }
          
          // Calculate orders this month
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          let ordersThisMonth = 0;
          if (data.orders && data.orders.recent) {
            ordersThisMonth = data.orders.recent.filter((order: any) => {
              const orderDate = new Date(order.orderTime);
              return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
            }).length;
          }
          
          // Set dashboard data with real values
          setDashboardData({
            loyaltyPoints: data.loyalty?.points || 0,
            pointsFromLastOrder,
            totalOrders: data.orders?.total || 0,
            ordersThisMonth,
            currentOrder: data.orders?.current && data.orders.current.length > 0 ? data.orders.current[0] : null,
            recentOrders: data.orders?.recent || [],
            popularItems: data.favorites || []
          });
        } else {
          throw new Error('Dashboard API returned unsuccessful response');
        }
      } else {
        console.error('Dashboard API failed:', response.status, response.statusText);
        throw new Error(`Dashboard API failed: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set fallback data with zeros instead of dummy data
      setDashboardData({
        loyaltyPoints: 0,
        pointsFromLastOrder: 0,
        totalOrders: 0,
        ordersThisMonth: 0,
        currentOrder: null,
        recentOrders: [],
        popularItems: []
      });
    } finally {
      setLoadingDashboard(false);
    }
  };

  const fetchPopularItems = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/menu/popular?limit=5`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Popular items data:', data.popular_items);
          setPopularItems(data.popular_items);
        }
      } else {
        console.error('Failed to fetch popular items:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching popular items:', error);
    }
  };

  const fetchRedeemableItems = async () => {
    try {
      if (!user?.id) return;
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/loyalty/available-rewards/${user.id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        // 401 or any error -> hide section by clearing items
        setRedeemableItems([]);
        return;
      }
      const data = await response.json();
      const rewards = (data?.availableRewards || []) as any[];
      const normalized = rewards.map((r: any) => ({
        id: r.id,
        name: r.name,
        points: r.points_required,
        image: r.image_url || '/images/mc2.jpg'
      }));
      setRedeemableItems(normalized);
    } catch (error) {
      console.error('Error fetching redeemable items:', error);
      // Hide section on error
      setRedeemableItems([]);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'ready':
        return 'text-blue-600';
      case 'preparing':
        return 'text-yellow-600';
      case 'pending':
        return 'text-orange-600';
      case 'pending_verification':
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };

  const handleRedeemPoints = async (item: any) => {
    if (!user || (dashboardData?.loyaltyPoints || 0) < item.points) {
      alert('Insufficient points to redeem this item');
      return;
    }

    setRedeeming(item.id);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/loyalty/redeem-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customerId: user.id,
          rewardId: item.id,
          orderId: null,
          redemptionProof: 'Claimed through customer dashboard',
          staffId: null
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully claimed "${item.name}"! Your claim code is ${data.claimCode}. Show this code to staff to redeem.`);
        // Refresh dashboard data to update points
        fetchDashboardData();
      } else {
        alert(`Failed to claim reward: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      alert('Failed to claim reward. Please try again.');
    } finally {
      setRedeeming(null);
    }
  };

  // Check table access
  const params = new URLSearchParams(window.location.search);
  const tableParam = params.get('table');
  
  // Accept either simple numbers (1-6) or any non-empty table parameter (for QR codes)
  const hasTableAccess = tableParam && tableParam.trim() !== '';

  const handleAddToCart = (item: any) => {
    if (!hasTableAccess) {
      try {
        // eslint-disable-next-line no-alert
        alert('To add items to cart, please scan the table QR to get access.');
      } catch (_) {}
      return;
    }

    addToCart({
      id: item.id.toString(),
      name: item.name,
      price: item.base_price || item.price,
      quantity: 1,
      customizations: [],
      notes: ''
    });
    alert(`${item.name} added to cart!`);
  };

  if (loading || loadingDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-lg">Loading...</span>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 bg-[#f5f5f5] p-0 m-0 w-full min-h-screen overflow-y-auto">
        <div className="w-full h-full flex flex-col m-0 p-0">
          {/* Welcome Header */}
          <div className="w-full px-4 sm:px-6 pt-6 sm:pt-8 pb-4 bg-[#f5f5f5]">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
              <span className="text-black">Hi {user?.name || 'Customer'}! Welcome to </span>
              <span className="text-[#a87437]">Mauricio's Cafe and Bakery</span>
            </h1>
            <p className="text-base sm:text-lg text-black">
              Where fresh coffee fuels great conversations.
            </p>
          </div>
          
          {/* Dashboard Layout: Reference Image Style */}
          <div className="w-full h-full px-4 sm:px-6 space-y-4 bg-[#f5f5f5] py-4 sm:py-6">
            {/* Top Row: 3 summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {/* Points Card */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-[#a87437] flex flex-col items-center text-center p-4 min-h-[120px] w-full justify-center hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center justify-center mb-3">
                  <Star className="h-8 w-8 text-[#a87437]" />
                </div>
                <span className="text-2xl font-bold text-[#6B5B5B] mb-1">{dashboardData?.loyaltyPoints || 0}</span>
                <span className="text-sm text-gray-500 mb-1">Your Points</span>
                <span className="text-xs text-green-600">
                  +{dashboardData?.pointsFromLastOrder || 0} from last order
                </span>
              </div>
              {/* Total Orders Card */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-[#a87437] flex flex-col items-center text-center p-4 min-h-[120px] w-full justify-center hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center justify-center mb-3">
                  <ShoppingBag className="h-8 w-8 text-[#a87437]" />
                </div>
                <span className="text-2xl font-bold text-[#6B5B5B] mb-1">{dashboardData?.totalOrders || 0}</span>
                <span className="text-sm text-gray-500 mb-1">Total Orders</span>
                <span className="text-xs text-blue-600">
                  +{dashboardData?.ordersThisMonth || 0} this month
                </span>
              </div>
              {/* Current Order Card */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-[#a87437] flex flex-col items-center text-center p-4 min-h-[120px] w-full justify-center hover:shadow-2xl transition-shadow duration-300">
                <div className="flex items-center justify-center mb-3">
                  <Monitor className="h-8 w-8 text-[#a87437]" />
                </div>
                <span className="text-2xl font-bold text-[#6B5B5B] mb-1">
                  {dashboardData?.currentOrder ? dashboardData.currentOrder.id.substring(0, 6) : 'None'}
                </span>
                <span className="text-sm text-gray-500 mb-1">Current Order</span>
                <span className={`text-xs ${getStatusColor(dashboardData?.currentOrder?.status || 'none')}`}>
                  {dashboardData?.currentOrder?.status === 'pending_verification' ? 'Awaiting Payment Verification' :
                   dashboardData?.currentOrder?.status === 'pending' ? 'Payment Pending' :
                   dashboardData?.currentOrder?.status || 'No active order'}
                </span>
              </div>
            </div>
            {/* Bottom Row: Redeem Points and Popular Items */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 w-full">
              {/* Redeem with your points (always visible; shows empty state when none) */}
              <div className="bg-white rounded-2xl shadow-xl border-2 border-[#a87437] p-4 sm:p-6 hover:shadow-2xl transition-shadow duration-300">
                <h2 className="text-xl sm:text-2xl font-bold text-[#6B5B5B] mb-4">Redeem with your points</h2>
                {redeemableItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No rewards available to redeem right now</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {redeemableItems.map((item) => (
                      <div key={item.id} className="flex flex-col items-center p-3 border-2 border-[#a87437] rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <img 
                          src={item.image}
                          alt={item.name}
                          className="h-16 w-16 object-cover rounded-full mb-3"
                        />
                        <h3 className="font-semibold text-[#6B5B5B] text-sm mb-1">{item.name}</h3>
                        <p className="text-xs text-gray-500 mb-3">{item.points} points</p>
                        <button
                          onClick={() => handleRedeemPoints(item)}
                          disabled={(dashboardData?.loyaltyPoints || 0) < item.points || redeeming === item.id}
                          className="bg-[#a87437] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#8f652f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {redeeming === item.id ? 'Redeeming...' : 'Redeem'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

                          {/* Popular items */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-[#a87437] p-4 sm:p-6 hover:shadow-2xl transition-shadow duration-300">
                <h2 className="text-xl sm:text-2xl font-bold text-[#6B5B5B] mb-4">Popular items</h2>
                                <div className="space-y-3">
                  {popularItems.length > 0 ? (
                    popularItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <img
                          src={(() => {
                            if (item.image_url) {
                              const path = item.image_url.trim();
                              if (/^https?:\/\//i.test(path)) return path;
                              const withSlash = path.startsWith('/') ? path : `/${path}`;
                              const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                              return `${API_URL}${withSlash}`;
                            }
                            return "/images/mc2.jpg";
                          })()}
                          alt={item.name}
                          className="h-12 w-12 object-cover rounded-full"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#6B5B5B]">{item.name}</h3>
                          <p className="text-sm text-gray-500">₱{item.base_price || item.display_price}</p>
                        </div>
                        <button
                          className={`p-2 rounded-lg transition-colors ${
                            hasTableAccess 
                              ? "bg-[#a87437] text-white hover:bg-[#8f652f] cursor-pointer" 
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                          onClick={() => handleAddToCart({
                            id: item.id,
                            name: item.name,
                            price: item.base_price || item.display_price
                          })}
                          disabled={!hasTableAccess}
                          title={hasTableAccess ? `Add ${item.name} to cart` : "Table access required to add items to cart"}
                          aria-label={hasTableAccess ? `Add ${item.name} to cart` : "Table access required"}
                        >
                          <img src="/images/shopping-cart.png" alt="Cart" className="h-4 w-4 object-contain invert" />
                        </button>
                      </div>
                    ))
                  ) : (
                    // Fallback to sample data if no popular items are loaded
                    [
                      { id: 1, name: "Cappuccino", price: 120, image: "/images/mc2.jpg" },
                      { id: 2, name: "Chocolate Croissant", price: 85, image: "/images/mc3.jpg" },
                      { id: 3, name: "Iced Matcha Latte", price: 150, image: "/images/mc4.jpg" },
                      { id: 4, name: "Americano", price: 100, image: "/images/mc2.jpg" },
                      { id: 5, name: "Latte", price: 130, image: "/images/mc3.jpg" }
                    ].map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="h-12 w-12 flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-gray-50 to-gray-100">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-contain p-1"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#6B5B5B]">{item.name}</h3>
                          <p className="text-sm text-gray-500">₱{item.price}</p>
                        </div>
                        <button
                          className={`p-2 rounded-lg transition-colors ${
                            hasTableAccess 
                              ? "bg-[#a87437] text-white hover:bg-[#8f652f] cursor-pointer" 
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                          }`}
                          onClick={() => handleAddToCart(item)}
                          disabled={!hasTableAccess}
                          title={hasTableAccess ? `Add ${item.name} to cart` : "Table access required to add items to cart"}
                          aria-label={hasTableAccess ? `Add ${item.name} to cart` : "Table access required"}
                        >
                          <img src="/images/shopping-cart.png" alt="Cart" className="h-4 w-4 object-contain invert" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
