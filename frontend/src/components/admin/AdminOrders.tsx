import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { 
  Coffee, 
  Clock, 
  CheckCircle, 
  Package, 
  Search,
  RefreshCw,
  X,
  User,
  Eye
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import axiosInstance from '../../utils/axiosInstance';
import { getApiUrl } from '../../utils/apiConfig';
import { encodeId } from '../../utils/idObfuscation';

interface Order {
  orderId: string;
  displayOrderId?: string;
  customerName: string;
  tableNumber?: number;
  items: any[];
  totalPrice: number;
  status: 'pending' | 'pending_verification' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'pending_verification';
  orderType: 'dine_in' | 'takeout';
  queuePosition: number;
  estimatedReadyTime: string;
  orderTime: string;
  paymentMethod: string;
  notes?: string;
}

const formatOrderId = (value: unknown): string => {
  if (!value) return '—';
  const raw = String(value).trim();
  if (!raw) return '—';
  
  // Use the same 5-character format as PaymentProcessor (3 letters + 2 digits)
  try {
    const encoded = encodeId(raw);
    const letters = encoded.replace(/[^A-Za-z]/g, '').slice(0, 3);
    const digits = encoded.replace(/\D/g, '').slice(-2);
    const partA = (letters || encoded.slice(0, 3)).padEnd(3, 'X');
    const partB = (digits || '00').padStart(2, '0');
    return partA + partB;
  } catch {
    // Fallback: last 5 non-separator characters
    return raw.replace(/[^A-Za-z0-9]/g, '').slice(-5) || raw;
  }
};

const transformOrderRecord = (order: any): Order => {
  try {
    const rawStatus = (order.status || '').toLowerCase();
    const normalizedStatus = rawStatus === 'processing' ? 'preparing' : rawStatus;
    
    // Handle items - can be array, string, or undefined
    let itemsArray: any[] = [];
    if (Array.isArray(order.items)) {
      itemsArray = order.items;
    } else if (typeof order.items === 'string') {
      try {
        itemsArray = JSON.parse(order.items || '[]');
      } catch (parseError) {
        console.warn('Failed to parse items JSON:', parseError);
        itemsArray = [];
      }
    }
    
    const orderId = order.orderId || order.order_id || order.id;

    if (!orderId || orderId === '0' || orderId === 0) {
      console.warn('⚠️ Invalid order ID detected:', {
        order,
        orderId,
        orderIdSource: order.orderId ? 'orderId' : order.order_id ? 'order_id' : 'id'
      });
      // Return a placeholder order instead of throwing
      return {
        orderId: 'INVALID',
        customerName: order.customerName || order.customer_name || 'Unknown',
        tableNumber: order.tableNumber || order.table_number || undefined,
        items: itemsArray,
        totalPrice: 0,
        status: 'pending' as Order['status'],
        paymentStatus: 'pending' as Order['paymentStatus'],
        orderType: 'dine_in' as Order['orderType'],
        queuePosition: 0,
        estimatedReadyTime: '',
        orderTime: new Date().toISOString(),
        paymentMethod: 'cash',
        notes: order.notes
      };
    }

    const transformed: Order = {
      orderId: String(orderId),
      displayOrderId: formatOrderId(orderId),
      customerName: order.customerName || order.customer_name || 'Unknown Customer',
      tableNumber: order.tableNumber ?? order.table_number ?? undefined,
      items: itemsArray,
      totalPrice: Number(order.totalPrice ?? order.total_price ?? 0),
      status: normalizedStatus as Order['status'],
      paymentStatus: (order.paymentStatus || order.payment_status || 'pending') as Order['paymentStatus'],
      orderType: (order.orderType || order.order_type || 'dine_in') as Order['orderType'],
      queuePosition: order.queuePosition ?? order.queue_position ?? 0,
      estimatedReadyTime: order.estimatedReadyTime || order.estimated_ready_time || '',
      orderTime: order.orderTime || order.order_time || new Date().toISOString(),
      paymentMethod: (order.paymentMethod || order.payment_method || 'cash').toLowerCase(),
      notes: order.notes || undefined
    };
    
    return transformed;
  } catch (error) {
    console.error('❌ Error transforming order record:', error, order);
    // Return a safe default order
    return {
      orderId: order.id || order.order_id || 'ERROR',
      customerName: 'Error Loading Order',
      tableNumber: undefined,
      items: [],
      totalPrice: 0,
      status: 'pending' as Order['status'],
      paymentStatus: 'pending' as Order['paymentStatus'],
      orderType: 'dine_in' as Order['orderType'],
      queuePosition: 0,
      estimatedReadyTime: '',
      orderTime: new Date().toISOString(),
      paymentMethod: 'cash',
      notes: undefined
    };
  }
};

const transformOrdersResponse = (ordersData: any[] = []): Order[] => {
  return ordersData.map(transformOrderRecord);
};

const AdminOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{orderId: string, amount: number, change: number} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('preparing');
  const [isMobile, setIsMobile] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const API_URL = getApiUrl();

  // Tab options for dropdown - will be defined after orders are loaded

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    const AudioConstructor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioConstructor) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioConstructor();
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    oscillator.start(now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    oscillator.stop(now + 0.8);
  }, []);

  // Screen size detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Global error handler to suppress browser extension errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('disconnected port object')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && event.reason.message.includes('disconnected port object')) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    fetchOrders();
    // Removed periodic polling to avoid UI flicker from repeated loading states
    return () => {};
  }, []);

  // Debug modal states
  useEffect(() => {
    console.log('Modal states changed:', { showSuccessModal, showPaymentModal, paymentSuccessData: !!paymentSuccessData });
  }, [showSuccessModal, showPaymentModal, paymentSuccessData]);

  // Setup Socket.IO for real-time background updates (no flicker)
  useEffect(() => {
    let socket: Socket | null = null;
    let isMounted = true;

    const initializeSocket = () => {
      try {
        socket = io(API_URL, {
          transports: ['websocket', 'polling'],
          timeout: 30000,
          forceNew: true,
          autoConnect: true,
          withCredentials: false
        });
        socketRef.current = socket;

        const silentRefetch = async () => {
          if (!isMounted) return;
          try {
            await fetchOrders({ silent: true });
          } catch (error) {
            console.warn('Silent refetch error:', error);
          }
        };

        socket.on('connect', () => {
          if (isMounted && socket) {
            socket.emit('join-admin-room');
          }
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected');
        });

        socket.on('error', (error) => {
          console.warn('Socket error:', error);
        });

        // When any order is created/updated/paid, refresh silently and play sound
        socket.on('new-order-received', () => {
          playNotificationSound();
          silentRefetch();
        });
        socket.on('order-updated', () => {
          playNotificationSound();
          silentRefetch();
        });
        socket.on('payment-updated', () => {
          playNotificationSound();
          silentRefetch();
        });
        socket.on('inventory-updated', silentRefetch);

      } catch (error) {
        console.error('Socket initialization error:', error);
      }
    };

    initializeSocket();

    return () => {
      isMounted = false;
      if (socket) {
        try {
          socket.removeAllListeners();
          socket.disconnect();
        } catch (error) {
          console.warn('Socket cleanup error:', error);
        }
      }
      socketRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close?.().catch(() => {});
      }
    };
  }, [API_URL, playNotificationSound]);

  const fetchOrders = async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options;
    try {
      if (!silent) setLoading(true);
      const response = await axiosInstance.get('/api/staff/orders');
      const data = response.data;

      console.log('📋 AdminOrders - Raw API response:', data);
      console.log('📋 AdminOrders - Response type:', typeof data);
      console.log('📋 AdminOrders - Response keys:', data ? Object.keys(data) : 'null');
      
      let ordersList: Order[] = [];
      
      // Handle different response formats
      if (data && data.success && Array.isArray(data.orders)) {
        console.log('📋 AdminOrders - Processing orders from data.orders:', data.orders.length);
        if (data.orders.length > 0) {
          console.log('📋 AdminOrders - Sample raw order:', data.orders[0]);
        }
        ordersList = transformOrdersResponse(data.orders);
      } else if (data && Array.isArray(data.orders)) {
        console.log('📋 AdminOrders - Processing orders from data.orders (no success flag):', data.orders.length);
        if (data.orders.length > 0) {
          console.log('📋 AdminOrders - Sample raw order:', data.orders[0]);
        }
        ordersList = transformOrdersResponse(data.orders);
      } else if (data && Array.isArray(data)) {
        // Sometimes the response is just an array
        console.log('📋 AdminOrders - Processing orders from direct array:', data.length);
        if (data.length > 0) {
          console.log('📋 AdminOrders - Sample raw order:', data[0]);
        }
        ordersList = transformOrdersResponse(data);
      } else {
        console.warn('📋 AdminOrders - Unexpected response format:', data);
        console.warn('📋 AdminOrders - Data structure:', JSON.stringify(data, null, 2));
        ordersList = [];
      }
      
      console.log('📋 AdminOrders - Transformed orders:', ordersList.length);
      console.log('📋 AdminOrders - Sample order:', ordersList[0]);
      
      setOrders(ordersList);
      
      // Debug logging
      console.log('📋 AdminOrders - Fetched orders:', ordersList.length);
      console.log('📋 AdminOrders - Orders by status:', {
        pending: ordersList.filter(o => o.status === 'pending').length,
        pending_verification: ordersList.filter(o => o.status === 'pending_verification').length,
        preparing: ordersList.filter(o => o.status === 'preparing').length,
        ready: ordersList.filter(o => o.status === 'ready').length,
        cancelled: ordersList.filter(o => o.status === 'cancelled').length,
        completed: ordersList.filter(o => o.status === 'completed').length
      });
      console.log('📋 AdminOrders - Orders by payment status:', {
        pending: ordersList.filter(o => o.paymentStatus === 'pending').length,
        pending_verification: ordersList.filter(o => o.paymentStatus === 'pending_verification').length,
        paid: ordersList.filter(o => o.paymentStatus === 'paid').length
      });
    } catch (error: any) {
      console.error('❌ AdminOrders - Error fetching orders:', error);
      console.error('❌ AdminOrders - Error response:', error?.response?.data);
      console.error('❌ AdminOrders - Error status:', error?.response?.status);
      
      // Show error toast
      if (!silent) {
        toast.error('Failed to load orders. Please refresh the page.');
      }
      
      if (error?.response?.status === 401) {
        console.warn('❌ AdminOrders - Unauthorized, redirecting to login');
        navigate('/admin-login');
        setOrders([]);
      } else {
        // Set empty array on error to show empty state
        setOrders([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await axiosInstance.put(`/api/orders/${orderId}/status`, { status });
        await fetchOrders({ silent: true });
      toast.success(`Order ${formatOrderId(orderId)} status updated to ${status}`);
    } catch (error: any) {
      console.error('Error updating order status:', error);
      const message = error?.response?.data?.error || error?.message || 'Failed to update order status';
      toast.error(message);
    }
  };

  const verifyPayment = async (orderId: string, paymentMethod: string) => {
    try {
      await axiosInstance.post(`/api/orders/${orderId}/verify-payment`, {
          verifiedBy: 'admin', 
        paymentMethod,
      });

        console.log('Payment verification successful');
        setShowPaymentModal(false);
        
        const order = orders.find(o => o.orderId === orderId);
        if (order) {
          setPaymentSuccessData({
          orderId: order.displayOrderId || formatOrderId(order.orderId),
            amount: order.totalPrice,
          change: 0,
          });
          
          setTimeout(() => {
            console.log('Showing success modal');
            setShowSuccessModal(true);
          }, 300);
        } else {
          console.warn('Order not found for success modal');
        }
        
        if (socketRef.current) {
          socketRef.current.off('order-updated');
          socketRef.current.off('payment-updated');
        }
        
        setTimeout(() => {
          fetchOrders({ silent: true });
          
          if (socketRef.current) {
          const refetchHandler = () => {
            fetchOrders({ silent: true });
          };
          socketRef.current.on('order-updated', refetchHandler);
          socketRef.current.on('payment-updated', refetchHandler);
          }
        }, 5000);
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      const message = error?.response?.data?.error || error?.message || 'Failed to verify payment';
      toast.error(message);
    }
  };

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    const loweredSearch = searchTerm.toLowerCase();
    const normalizedOrderId = (order.displayOrderId || order.orderId || '').toLowerCase();
    const matchesSearch = order.customerName.toLowerCase().includes(loweredSearch) ||
                         normalizedOrderId.includes(loweredSearch);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesType = orderTypeFilter === 'all' || order.orderType === orderTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Show orders that are being prepared or ready for preparation
  // Include confirmed/preparing/processing orders (being prepared)
  // Also include paid orders that are pending or pending_verification (should be moved to preparing)
  // Match StaffOrders filtering logic for consistency
  const preparingStatuses = ['confirmed', 'preparing', 'processing'];
  const readyStatuses = ['ready'];

  const preparingOrders = filteredOrders.filter(order => {
    const status = String(order.status || '').toLowerCase();
    const pay = String(order.paymentStatus || '').toLowerCase();
    
    // Exclude cancelled, completed, and ready orders
    if (status === 'cancelled' || status === 'completed' || status === 'ready') return false;
    
    // Include preparing orders (regardless of payment status - they're already verified)
    if (status === 'preparing') return true;
    
    // Include confirmed and processing orders
    if (preparingStatuses.includes(status)) return true;
    
    // Include orders that are paid and in pending/pending_verification status (should move to preparing)
    // These are orders that were verified but status hasn't been updated yet
    if (pay === 'paid' && (status === 'pending' || status === 'pending_verification')) return true;
    
    // Debug log for orders that don't match
    if (status !== 'cancelled' && status !== 'completed' && status !== 'ready') {
      console.log('Preparing filter - excluded order:', { 
        orderId: order.orderId, 
        status: order.status, 
        paymentStatus: order.paymentStatus,
        pay,
        preparingStatuses 
      });
    }
    return false;
  }).map((order, index) => ({
    ...order,
    queuePosition: index + 1
  }));
  const readyOrders = filteredOrders.filter(order => {
    const isReady = readyStatuses.includes(String(order.status));
    console.log('Ready filter check:', { orderId: order.orderId, status: order.status, isReady, readyStatuses });
    return isReady;
  });

  // Tab options for dropdown
  const tabOptions = [
    { value: 'preparing', label: 'Preparing', count: preparingOrders.length },
    { value: 'ready', label: 'Ready', count: readyOrders.length }
  ];

  // Function to mark order as ready
  const markAsReady = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'ready' }),
      });

      if (response.ok) {
        toast.success('Order marked as ready');
        fetchOrders();
      } else {
        toast.error('Failed to mark order as ready');
      }
    } catch (error) {
      console.error('Error marking order as ready:', error);
      toast.error('Error marking order as ready');
    }
  };

  // Function to mark order as completed
  const markAsCompleted = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (response.ok) {
        toast.success('Order marked as completed');
        fetchOrders();
      } else {
        toast.error('Failed to mark order as completed');
      }
    } catch (error) {
      console.error('Error marking order as completed:', error);
      toast.error('Error marking order as completed');
    }
  };

  const getStatusColor = (status: string) => {
    console.log('getStatusColor called with status:', status, 'type:', typeof status);
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending_verification':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        console.warn('Unknown status in getStatusColor:', status);
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'pending_verification':
        return <span className="text-sm font-bold">₱</span>;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'preparing':
        return <Coffee className="w-4 h-4" />;
      case 'ready':
        return <Package className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-16">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500 mb-4" />
        <p className="text-gray-600">Loading orders...</p>
      </div>
    );
  }

  // Debug: Log current state
  console.log('📋 AdminOrders - Render state:', {
    totalOrders: orders.length,
    preparingCount: preparingOrders.length,
    readyCount: readyOrders.length,
    filteredCount: filteredOrders.length,
    searchTerm,
    statusFilter,
    orderTypeFilter
  });

  return (
      <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor and manage customer orders in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => fetchOrders()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        <Card className="bg-white border-2 border-[#a87437]/25 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Coffee className="w-4 h-4 text-blue-500" />
              Preparing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{preparingOrders.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-[#a87437]/25 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Package className="w-4 h-4 text-green-500" />
              Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{readyOrders.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-[#a87437]/25 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <span className="w-4 h-4 text-purple-500 font-semibold">₱</span>
              Total Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{
              filteredOrders.filter(o => {
                const s = String(o.status || '').toLowerCase();
                const pay = String(o.paymentStatus || '').toLowerCase();
                // Include all active orders (not cancelled, not completed)
                // This includes orders with pending payment that need verification
                return (
                  s !== 'cancelled' &&
                  s !== 'completed' &&
                  (s === 'pending' ||
                   s === 'pending_verification' ||
                   s === 'confirmed' ||
                   s === 'preparing' ||
                   s === 'processing' ||
                   s === 'ready' ||
                   pay === 'pending' ||
                   pay === 'pending_verification')
                );
              }).length
            }</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-[#a87437]/15 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Input
                placeholder="Search by customer name or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-white border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    // Search functionality is already handled by the filteredOrders
                    console.log('Searching for:', searchTerm);
                  }
                }}
              />
              <Button
                onClick={() => {
                  // Search functionality is already handled by the filteredOrders
                  console.log('Searching for:', searchTerm);
                }}
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-[#a87437]/10"
              >
                <Search className="h-4 w-4 text-[#a87437]" />
              </Button>
            </div>
          </div>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="px-3 py-2 pr-4 border border-[#a87437]/20 rounded-lg text-sm bg-white/50 backdrop-blur-sm focus:bg-white/70">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
              <SelectTrigger className="px-3 py-2 pr-4 border border-[#a87437]/20 rounded-lg text-sm bg-white/50 backdrop-blur-sm focus:bg-white/70">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="dine_in">Dine In</SelectItem>
                <SelectItem value="takeout">Takeout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabbed Order Interface */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-[#a87437]/15 p-6">
        {/* Responsive Navigation */}
        <div className="space-y-6">
          {isMobile ? (
            /* Mobile Dropdown */
            <div className="w-full">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full bg-white border border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437] rounded-lg h-12 pr-8">
                  <SelectValue placeholder="Select order status" />
                </SelectTrigger>
                <SelectContent>
                  {tabOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{option.label}</span>
                        <Badge className={`ml-2 ${option.value === 'preparing' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {option.count}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            /* Desktop Navigation - Empty since TabsList is now in content section */
            <div></div>
          )}

          {/* Tab Content */}
          {isMobile ? (
            /* Mobile Content */
            <div className="space-y-4">
              {activeTab === 'preparing' && (
                <div className="space-y-4">
                  {preparingOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Coffee className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No orders being prepared</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {preparingOrders.map((order) => (
                        <Card key={order.orderId} className="border-2 border-blue-200 shadow-md hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between text-sm">
                              <span className="text-blue-800">Order #{order.orderId}</span>
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              Preparing
              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium">{order.customerName}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-800">₱{order.totalPrice.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">{order.paymentMethod}</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-700 text-sm">Items:</h4>
                              {order.items.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                  <span className="text-gray-700">
                                    {item.quantity}x {item.name}
                                  </span>
                                  <span className="text-gray-600">₱{item.price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => markAsReady(order.orderId)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Ready
                              </Button>
                              <Button
                                onClick={() => setSelectedOrder(order)}
                                variant="outline"
                                className="flex-1 text-sm"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'ready' && (
                <div className="space-y-4">
                  {readyOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No orders ready for pickup</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {readyOrders.map((order) => (
                        <Card key={order.orderId} className="border-2 border-green-200 shadow-md hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between text-sm">
                              <span className="text-green-800">Order #{order.orderId}</span>
                              <Badge className="bg-green-100 text-green-800 border-green-200">
              Ready
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium">{order.customerName}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-gray-800">₱{order.totalPrice.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">{order.paymentMethod}</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium text-gray-700 text-sm">Items:</h4>
                              {order.items.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                  <span className="text-gray-700">
                                    {item.quantity}x {item.name}
                                  </span>
                                  <span className="text-gray-600">₱{item.price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => markAsCompleted(order.orderId)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Completed
                              </Button>
                              <Button
                                onClick={() => setSelectedOrder(order)}
                                variant="outline"
                                className="flex-1 text-sm"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Desktop Content */
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full bg-white/50 backdrop-blur-sm rounded-lg flex gap-4 p-2">
                {tabOptions.map((option) => (
                  <TabsTrigger 
                    key={option.value}
                    value={option.value} 
                    className="flex items-center gap-2 data-[state=active]:bg-white/70 text-sm px-4 py-3 w-full flex-1 justify-start rounded-md shadow-sm border border-[#a87437]"
                  >
                    {option.value === 'preparing' ? <Coffee className="w-4 h-4 flex-shrink-0" /> : <Package className="w-4 h-4 flex-shrink-0" />}
                    <span className="truncate">{option.label}</span>
                    <Badge className={`ml-auto ${option.value === 'preparing' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'} text-xs`}>
                      {option.count}
              </Badge>
            </TabsTrigger>
                ))}
          </TabsList>

            {/* Preparing Orders Tab */}
            <TabsContent value="preparing" className="space-y-4">
              {preparingOrders.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <div className="bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Coffee className="w-10 h-10 text-blue-400" />
                  </div>
                  <p className="text-lg font-medium">No orders being prepared</p>
                  <p className="text-sm">Orders will appear here when preparation starts</p>
                  {orders.length === 0 && (
                    <Button
                      onClick={() => fetchOrders()}
                      variant="outline"
                      className="mt-4"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Orders
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {preparingOrders.map((order) => (
                    <div key={order.orderId} className="bg-white/60 backdrop-blur-sm rounded-xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-[#a87437]/20">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">{order.customerName}</h3>
                            <div className="bg-[#a87437] text-white px-3 py-1 rounded-full text-sm font-bold">
                              Queue #{order.queuePosition}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-mono text-xs">#{order.orderId}</span>
                            <span>•</span>
                            <span>{order.orderType === 'dine_in' && order.tableNumber ? `Table ${order.tableNumber}` : 'Take Out'}</span>
                            <span>•</span>
                            <span>{new Date(order.orderTime).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{order.status}</span>
                        </Badge>
                      </div>
                      
                        <div className="space-y-2 mb-4">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm bg-white/50 rounded-lg p-2">
                            <span className="text-gray-700">{item.quantity}x {item.name}</span>
                            <span className="text-gray-500 font-medium">₱{(() => {
                              const itemPrice = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 
                                              (typeof item.customPrice === 'number' && !isNaN(item.customPrice) ? item.customPrice : 
                                               (typeof item.custom_price === 'number' && !isNaN(item.custom_price) ? item.custom_price : 
                                                (typeof item.base_price === 'number' && !isNaN(item.base_price) ? item.base_price : 0)));
                              const itemQuantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
                              const totalPrice = itemPrice * itemQuantity;
                              return isNaN(totalPrice) ? '0.00' : totalPrice.toFixed(2);
                            })()}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center mb-2 pt-3 border-t border-[#a87437]/20">
                        <span className="font-semibold text-xl text-gray-900">₱{Number(order.totalPrice || 0).toFixed(2)}</span>
                      </div>
                      {order.notes && (
                        <div className="mb-4 text-sm italic text-gray-700 bg-yellow-50 border border-yellow-100 rounded-md p-3">
                          Customer Note: {order.notes}
                        </div>
                      )}
                      
                      {/* Receipt Viewing for Digital Payments */}
                      {(order.paymentMethod === 'gcash' || order.paymentMethod === 'paymaya') && order.paymentStatus === 'pending_verification' && order.receiptPath && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-900">Payment Receipt Available</p>
                              <p className="text-xs text-blue-700">Customer or guest has uploaded a receipt for verification</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                const receiptUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/receipts/receipt/${order.orderId}`;
                                window.open(receiptUrl, '_blank');
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              View Receipt
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-3">
                        {['pending','pending_verification','confirmed','preparing','processing'].includes(String(order.status)) && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.orderId, 'ready')}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Package className="w-4 h-4 mr-1" />
                            Mark as Ready
                          </Button>
                        )}
                        {['ready'].includes(String(order.status)) && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.orderId, 'completed')}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete Order
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateOrderStatus(order.orderId, 'cancelled')}
                          className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel Order
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Ready Orders Tab */}
            <TabsContent value="ready" className="space-y-4">
              {readyOrders.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <div className="bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Package className="w-10 h-10 text-green-400" />
                  </div>
                  <p className="text-lg font-medium">No orders ready</p>
                  <p className="text-sm">Orders will appear here when they're ready for pickup</p>
                  {orders.length === 0 && (
                    <Button
                      onClick={() => fetchOrders()}
                      variant="outline"
                      className="mt-4"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Orders
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4">
                  {readyOrders.map((order) => (
                    <div key={order.orderId} className="bg-white/60 backdrop-blur-sm rounded-xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-[#a87437]/20">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{order.customerName}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                            <span className="font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">#{order.orderId}</span>
                            <span>•</span>
                            <span>{order.orderType === 'dine_in' && order.tableNumber ? `Table ${order.tableNumber}` : 'Take Out'}</span>
                            <span>•</span>
                            <span>{new Date(order.orderTime).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">{order.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm bg-white/50 rounded-lg p-2">
                            <span className="text-gray-700">{item.quantity}x {item.name}</span>
                            <span className="text-gray-500 font-medium">₱{(() => {
                              const itemPrice = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 
                                              (typeof item.customPrice === 'number' && !isNaN(item.customPrice) ? item.customPrice : 
                                               (typeof item.custom_price === 'number' && !isNaN(item.custom_price) ? item.custom_price : 
                                                (typeof item.base_price === 'number' && !isNaN(item.base_price) ? item.base_price : 0)));
                              const itemQuantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
                              const totalPrice = itemPrice * itemQuantity;
                              return isNaN(totalPrice) ? '0.00' : totalPrice.toFixed(2);
                            })()}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center mb-4 pt-3 border-t border-[#a87437]/20">
                        <span className="font-semibold text-xl text-gray-900">₱{order.totalPrice}</span>
                      </div>
                      
                      {/* Admin complete order action */}
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.orderId, 'completed')}
                        className="bg-green-600 hover:bg-green-700 w-full shadow-lg"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Complete Order
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          )}
        </div>

        {/* Payment Verification Modal */}
        {showPaymentModal && selectedOrder && !showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
              <h2 className="text-xl font-bold mb-4">Verify Payment</h2>
              <p className="text-gray-600 mb-6">
                Verify payment for order #{selectedOrder.displayOrderId || selectedOrder.orderId}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select 
                    className="w-full p-3 border border-gray-200 rounded-lg bg-white/50 backdrop-blur-sm focus:bg-white/70"
                    aria-label="Select payment method"
                  >
                    <option value="cash">Cash</option>
                    <option value="gcash">GCash</option>
                    <option value="paymaya">PayMaya</option>
                  </select>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => verifyPayment(selectedOrder.orderId, 'cash')}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 shadow-lg"
                  >
                    Verify Payment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Success Modal */}
        {showSuccessModal && paymentSuccessData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
                <p className="text-gray-600 mb-4">Payment has been processed and verified. Order is now pending preparation.</p>
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    <strong>Order ID:</strong> {formatOrderId(paymentSuccessData.orderId)}
                  </p>
                  <p className="text-sm text-green-800">
                    <strong>Amount Paid:</strong> ₱{paymentSuccessData.amount}
                  </p>
                  <p className="text-sm text-green-800">
                    <strong>Change:</strong> ₱{paymentSuccessData.change}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    console.log('Continue to POS clicked');
                    setShowSuccessModal(false);
                    setPaymentSuccessData(null);
                    setSelectedOrder(null); // Clear selected order
                    setShowPaymentModal(false); // Ensure payment modal is closed
                    
                    // Try React Router navigation first
                    try {
                      console.log('Attempting React Router navigation to /admin/pos');
                      navigate('/admin/pos');
                    } catch (error) {
                      console.warn('React Router navigation failed, using window.location:', error);
                      // Fallback to window.location if React Router fails
                      window.location.href = '/admin/pos';
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Continue to POS
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
  );
};

export default AdminOrders; 

