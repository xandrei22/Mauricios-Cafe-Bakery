import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { 
  Coffee,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import SimplePOS from './SimplePOS';
import PaymentProcessor from './PaymentProcessor';
import { io, Socket } from 'socket.io-client';
import axiosInstance from '../../utils/axiosInstance';

interface Order {
  id: string;
  orderId: string;
  customerName: string;
  tableNumber: number;
  items: any[];
  totalPrice: number;
  status: 'pending' | 'pending_verification' | 'processing' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'pending_verification' | 'paid' | 'failed';
  paymentMethod: string;
  orderTime: string;
  notes?: string;
}


const POSDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const location = useLocation();
  const isAdminRoute = String(location.pathname || '').startsWith('/admin');

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
    let newSocket: Socket | null = null;
    let isMounted = true;

    const initializeSocket = () => {
      try {
        // Initialize Socket.IO connection with proper backend URL
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
        newSocket = io(API_URL, {
          transports: ['polling', 'websocket'],
          path: '/socket.io',
          timeout: 30000,
          forceNew: true,
          autoConnect: true,
          withCredentials: false
        });
        setSocket(newSocket);

        // Connection event handlers
        newSocket.on('connect', () => {
          if (isMounted && newSocket) {
            // Join both rooms so admin or staff receives all order/payment updates
            newSocket.emit('join-staff-room');
            newSocket.emit('join-admin-room');
          }
        });

        newSocket.on('disconnect', () => {
          console.log('POS Socket disconnected');
        });

        newSocket.on('error', (error) => {
          console.warn('POS Socket error:', error);
        });

        // Listen for real-time updates
        newSocket.on('new-order-received', (orderData) => {
          if (isMounted) {
            fetchOrders();
            fetchStats();
          }
        });

        newSocket.on('order-updated', (updateData) => {
          if (isMounted) {
            console.log('🔄 Order updated received:', updateData);
            // Force immediate refresh for receipt uploads
            if (updateData.paymentStatus === 'pending_verification') {
              console.log('🔄 Receipt uploaded - forcing immediate refresh');
              setTimeout(() => {
                fetchOrders();
                fetchStats();
              }, 100);
            } else {
              fetchOrders();
              fetchStats();
            }
          }
        });

        newSocket.on('payment-updated', (paymentData) => {
          if (isMounted) {
            console.log('💳 Payment updated received:', paymentData);
            fetchOrders();
            fetchStats();
          }
        });

      } catch (error) {
        console.error('POS Socket initialization error:', error);
      }
    };

    initializeSocket();

    // Initial data fetch
    fetchOrders();
    fetchStats();

    // Fallback: Poll for updates every 3 seconds to ensure we don't miss any updates
    const pollInterval = setInterval(() => {
      if (isMounted) {
        fetchOrders();
        fetchStats();
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (newSocket) {
        try {
          newSocket.removeAllListeners();
          newSocket.close();
        } catch (error) {
          console.warn('POS Socket cleanup error:', error);
        }
      }
    };
  }, []);

  const fetchOrders = async () => {
    const endpoints = isAdminRoute
      ? ['/api/orders', '/api/staff/orders']
      : ['/api/staff/orders', '/api/orders'];

    for (const endpoint of endpoints) {
      try {
        console.log('📡 POSDashboard fetchOrders -> requesting', endpoint);
        const response = await axiosInstance.get(endpoint, {
          params: { limit: 500 }
        });
        const data = response.data || {};
        if (data && data.success && Array.isArray(data.orders)) {
          console.log('📋 POSDashboard - Orders fetched from', endpoint, 'count:', data.orders.length);
          const normalized: Order[] = (data.orders || []).map((o: any) => ({
            id: String(o.orderId || o.id || o.order_id || ''),
            orderId: String(o.orderId || o.id || o.order_id || ''),
            customerName: o.customerName || o.customer_name || 'Customer',
            tableNumber: Number(o.tableNumber ?? o.table_number ?? 0),
            items: o.items || [],
            totalPrice: Number(o.totalPrice ?? o.total_price ?? 0),
            status: String(o.status || 'pending') as Order['status'],
            paymentStatus: String(
              o.paymentStatus ??
              o.payment_status ??
              (o.receiptPath || o.receipt_path ? 'pending_verification' : 'pending')
            ) as Order['paymentStatus'],
            paymentMethod: String(o.paymentMethod ?? o.payment_method ?? ''),
            orderTime: o.orderTime || o.order_time || new Date().toISOString(),
            notes: o.notes || undefined,
            placedBy: o.placedBy || 'customer',
            receiptPath: o.receiptPath || o.receipt_path,
            cancelledBy: o.cancelledBy || o.cancelled_by,
            cancellationReason: o.cancellationReason || o.cancellation_reason,
            cancelledAt: o.cancelledAt || o.cancelled_at,
          }));

          const pendingPaymentCount = normalized.filter(o => {
            const paymentStatus = String(o.paymentStatus || '').toLowerCase();
            return paymentStatus === 'pending' || paymentStatus === 'pending_verification';
          }).length;
          console.log('📋 POSDashboard - Orders with pending payment:', pendingPaymentCount);
          console.log('📋 POSDashboard - Status breakdown:', normalized.reduce((acc: Record<string, number>, order) => {
            const key = String(order.status || '').toLowerCase();
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {}));

          setOrders(normalized);
          return; // Success, stop trying other endpoints
        }
      } catch (error) {
        console.error(`❌ POSDashboard fetchOrders error for ${endpoint}:`, error);
      }
    }

    // If we get here, all endpoints failed
    setOrders([]);
  };


  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get('/api/orders/stats');
      const data = response.data || {};
      if (data.success && data.stats) {
        setStats({
          totalOrders: data.stats.totalOrders || 0,
          pendingOrders: data.stats.pendingOrders || 0,
          completedOrders: data.stats.completedOrders || 0,
          totalRevenue: data.stats.totalRevenue || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    // Initial fetch
    fetchOrders();
    fetchStats();

    // Set up auto-refresh interval
    const interval = setInterval(() => {
      fetchOrders();
      fetchStats();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchOrders();
        fetchTables();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', icon: Clock },
      preparing: { color: 'bg-blue-500', icon: Coffee },
      ready: { color: 'bg-green-500', icon: CheckCircle },
      completed: { color: 'bg-gray-500', icon: CheckCircle },
      cancelled: { color: 'bg-red-500', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || AlertCircle;

    return (
      <Badge className={`${config?.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const color = status === 'paid' ? 'bg-green-500' : status === 'failed' ? 'bg-red-500' : 'bg-yellow-500';
    return (
      <Badge className={`${color} text-white`}>
        <span className="text-xs font-bold mr-1">₱</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4 bg-[#f5f5f5] min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Point of Sale</h1>
            <p className="text-sm sm:text-base text-gray-600">Select items and manage orders</p>
          </div>
        </div>

        {/* Stats cards removed per request */}

        {/* Unified SimplePOS instance renders menu + sidebar sharing a single cart */}
        <div className="mb-6">
          <SimplePOS 
            onOpenPaymentModal={() => setShowPaymentModal(true)}
          />
        </div>

        {/* Payment Processing Modal */}
        {showPaymentModal && (
          <PaymentProcessor 
            orders={orders}
            onPaymentProcessed={fetchOrders}
            staffId={isAdminRoute ? 'admin' : 'staff'}
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
          />
        )}

      </div>
    </div>
  );
};

export default POSDashboard; 
