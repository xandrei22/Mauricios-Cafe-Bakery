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

interface Order {
  orderId: string;
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

  // Tab options for dropdown - will be defined after orders are loaded

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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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
            // Use admin-specific endpoint
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            const response = await fetch(`${API_URL}/api/admin/orders`, { credentials: 'omit' });
            if (response.ok) {
              const data = await response.json();
              if (data.success && isMounted) {
                const transformed = (data.orders || []).map((order: any) => {
                  const itemsArray = Array.isArray(order.items)
                    ? order.items
                    : (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : []);
                  const rawStatus = (order.status || '').toLowerCase();
                  const normalizedStatus = rawStatus === 'processing' ? 'preparing' : rawStatus;
                  
                  const orderId = order.orderId || order.order_id || order.id;
                  
                  return {
                    orderId: String(orderId),
                    customerName: order.customer_name,
                    tableNumber: order.table_number,
                    items: itemsArray,
                    totalPrice: Number(order.total_price || 0),
                    status: normalizedStatus as any,
                    paymentStatus: (order.payment_status || 'pending') as any,
                    orderType: (order.order_type || 'dine_in') as any,
                    queuePosition: 0,
                    estimatedReadyTime: order.estimated_ready_time,
                    orderTime: order.order_time,
                    paymentMethod: (order.payment_method || '').toLowerCase(),
                    notes: order.notes
                  };
                });
                setOrders(transformed);
              }
            }
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

        // When any order is created/updated/paid, refresh silently
        socket.on('new-order-received', silentRefetch);
        socket.on('order-updated', silentRefetch);
        socket.on('payment-updated', silentRefetch);
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
    };
  }, [API_URL]);

  const fetchOrders = async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options;
    try {
      if (!silent) setLoading(true);
      // Use staff orders endpoint to ensure pending_verification orders and camelCase fields
      const response = await fetch(`${API_URL}/api/staff/orders`, { credentials: 'omit' });
      const data = response.ok ? await response.json() : null;

      if (data && data.success) {
        const transformedOrders: Order[] = (data.orders || []).map((order: any) => {
          const rawStatus = (order.status || '').toLowerCase();
          // Keep all statuses as-is for proper filtering
          const normalizedStatus = rawStatus === 'processing' ? 'preparing' : rawStatus;

          const itemsArray = Array.isArray(order.items)
            ? order.items
            : (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : []);

          const orderId = order.orderId || order.order_id || order.id;
          
          // Debug logging for order ID and status
          if (!orderId || orderId === '0' || orderId === 0) {
            console.warn('Invalid order ID detected:', {
              order: order,
              orderId: orderId,
              orderIdSource: order.orderId ? 'orderId' : order.order_id ? 'order_id' : 'id'
            });
          }
          
          // Debug logging for order status
          console.log('Order status debug:', {
            orderId: orderId,
            originalStatus: order.status,
            normalizedStatus: normalizedStatus,
            paymentMethod: order.payment_method || order.paymentMethod,
            customerName: order.customer_name || order.customerName,
            fullOrder: order
          });

          return {
            orderId: String(orderId),
            customerName: order.customerName || order.customer_name,
            tableNumber: order.tableNumber || order.table_number,
            items: itemsArray,
            totalPrice: Number(order.totalPrice ?? order.total_price ?? 0),
            status: normalizedStatus as any,
            paymentStatus: (order.paymentStatus || order.payment_status || 'pending') as any,
            orderType: (order.orderType || order.order_type || 'dine_in') as any,
            queuePosition: order.queuePosition || 0,
            estimatedReadyTime: order.estimatedReadyTime || order.estimated_ready_time,
            orderTime: order.orderTime || order.order_time,
            paymentMethod: (order.paymentMethod || order.payment_method || '').toLowerCase(),
            notes: order.notes
          };
        });
        setOrders(transformedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      // Use full API URL for consistency
      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'omit',
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Always refresh orders to get the latest status
        // This ensures orders move between tabs correctly
        await fetchOrders({ silent: true });
        
        // Show success message
        toast.success(`Order ${orderId} status updated to ${status}`);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to update order: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const verifyPayment = async (orderId: string, paymentMethod: string) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'omit',
        body: JSON.stringify({ 
          verifiedBy: 'admin', 
          paymentMethod 
        }),
      });

      if (response.ok) {
        console.log('Payment verification successful');
        // Close payment modal first
        setShowPaymentModal(false);
        
        // Get order details for success modal
        const order = orders.find(o => o.orderId === orderId);
        console.log('Found order for success modal:', order);
        if (order) {
          setPaymentSuccessData({
            orderId: order.orderId,
            amount: order.totalPrice,
            change: 0 // For admin verification, no change needed
          });
          
          // Show success modal after a short delay to ensure smooth transition
          setTimeout(() => {
            console.log('Showing success modal');
            setShowSuccessModal(true);
          }, 300);
        } else {
          console.warn('Order not found for success modal');
        }
        
        // Temporarily disable Socket.IO updates to prevent race condition
        if (socketRef.current) {
          socketRef.current.off('order-updated');
          socketRef.current.off('payment-updated');
        }
        
        // Refresh orders after a longer delay to ensure backend has processed and user sees success modal
        setTimeout(() => {
          fetchOrders({ silent: true });
          
          // Re-enable Socket.IO updates after refresh
          if (socketRef.current) {
            const silentRefetch = async () => {
              try {
                const response = await fetch(`${API_URL}/api/staff/orders`, { credentials: 'omit' });
                if (response.ok) {
                  const data = await response.json();
                  if (data.success) {
                    const transformed = (data.orders || []).map((order: any) => {
                      const itemsArray = Array.isArray(order.items)
                        ? order.items
                        : (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : []);
                      const rawStatus = (order.status || '').toLowerCase();
                      // Keep all statuses as-is for proper filtering
                      const normalizedStatus = rawStatus === 'processing' ? 'preparing' : rawStatus;
                      
                      const orderId = order.orderId || order.order_id || order.id;
                      
                      return {
                        orderId: String(orderId),
                        customerName: order.customerName || order.customer_name,
                        tableNumber: order.tableNumber || order.table_number,
                        items: itemsArray,
                        totalPrice: Number(order.totalPrice ?? order.total_price ?? 0),
                        status: normalizedStatus as any,
                        paymentStatus: (order.paymentStatus || order.payment_status || 'pending') as any,
                        orderType: (order.orderType || order.order_type || 'dine_in') as any,
                        queuePosition: order.queuePosition || 0,
                        estimatedReadyTime: order.estimatedReadyTime || order.estimated_ready_time,
                        orderTime: order.orderTime || order.order_time,
                        paymentMethod: (order.paymentMethod || order.payment_method || '').toLowerCase(),
                        notes: order.notes
                      };
                    });
                    setOrders(transformed);
                  }
                }
              } catch {}
            };
            socketRef.current.on('order-updated', silentRefetch);
            socketRef.current.on('payment-updated', silentRefetch);
          }
        }, 5000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    }
  };

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderId.toLowerCase().includes(searchTerm.toLowerCase());
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
    const status = order.status;
    const pay = order.paymentStatus;
    
    // Exclude cancelled, completed, and ready orders
    if (status === 'cancelled' || status === 'completed' || status === 'ready') return false;
    
    // Include preparing orders
    if (status === 'preparing') return true;
    
    // Include confirmed and processing orders
    if (preparingStatuses.includes(String(status))) return true;
    
    // Treat paid+pending as preparing so staff can work it (match StaffOrders logic)
    if (pay === 'paid' && status === 'pending') return true;
    
    // Also include paid orders that are pending_verification
    if (status === 'pending_verification' && pay === 'paid') return true;
    
    console.log('Preparing filter check:', { 
      orderId: order.orderId, 
      status: order.status, 
      paymentStatus: order.paymentStatus,
      shouldShow: false,
      preparingStatuses 
    });
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor and manage customer orders in real-time</p>
        </div>
        <div className="flex items-center gap-3" />
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
                const s = String(o.status);
                return (
                  s === 'pending' ||
                  s === 'pending_verification' ||
                  s === 'confirmed' ||
                  s === 'preparing' ||
                  s === 'processing' ||
                  s === 'ready'
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
                            <span className="font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">#{order.orderId}</span>
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
                      {(order.paymentMethod === 'gcash' || order.paymentMethod === 'paymaya') && order.paymentStatus === 'pending_verification' && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-blue-900">Payment Receipt Available</p>
                              <p className="text-xs text-blue-700">Customer has uploaded a receipt for verification</p>
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
                Verify payment for order #{selectedOrder.orderId}
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
                    <strong>Order ID:</strong> {paymentSuccessData.orderId}
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

