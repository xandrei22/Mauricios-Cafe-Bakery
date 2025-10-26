import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { io, Socket } from 'socket.io-client';
import { 
  ShoppingCart, 
  Coffee, 
  Package, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { downloadReceipt } from '../../utils/receiptGenerator';

interface OrderItem {
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number;
  customizations?: any;
  notes?: string;
}

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  items: OrderItem[];
  total_price: number;
  status: 'pending' | 'pending_verification' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'pending_verification' | 'paid' | 'failed';
  payment_method: 'cash' | 'gcash' | 'paymaya';
  order_type: 'dine_in' | 'takeout';
  order_time: string;
  completed_time?: string;
  notes?: string;
}

interface CustomerOrderTrackingProps {
  customerEmail: string;
}

const CustomerOrderTracking: React.FC<CustomerOrderTrackingProps> = ({ customerEmail }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(API_URL, {
      transports: ['polling', 'websocket'],
      path: '/socket.io',
      withCredentials: true,
      timeout: 30000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    setSocket(newSocket);

    // Join customer room for real-time updates
    const joinRoom = () => newSocket.emit('join-customer-room', { customerEmail });
    joinRoom();
    newSocket.on('connect', joinRoom);
    newSocket.io.on('reconnect', joinRoom);

    // Listen for real-time updates
    newSocket.on('order-updated', (updateData) => {
      console.log('Order updated:', updateData);
      fetchOrders();
    });

    newSocket.on('payment-updated', (paymentData) => {
      console.log('Payment updated:', paymentData);
      fetchOrders();
    });

    // Initial data fetch
    fetchOrders();

    return () => {
      newSocket.close();
    };
  }, [customerEmail]);

  const fetchOrders = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`${API_URL}/api/customer/orders/${customerEmail}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrders(data.orders || []);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ShoppingCart className="w-5 h-5" />;
      case 'pending_verification':
        return <span className="text-sm font-bold">₱</span>;
      case 'preparing':
        return <Coffee className="w-5 h-5" />;
      case 'ready':
        return <Package className="w-5 h-5" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <ShoppingCart className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ready':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'pending_verification':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Your order is waiting for payment confirmation';
      case 'pending_verification':
        return 'Payment received, waiting for staff verification';
      case 'preparing':
        return 'Your order is being prepared in the kitchen';
      case 'ready':
        return 'Your order is ready for pickup/delivery';
      case 'completed':
        return 'Order completed successfully';
      case 'cancelled':
        return 'Order has been cancelled';
      default:
        return 'Order status pending';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Tracking</h2>
          <p className="text-gray-600">Track your orders and payment status</p>
        </div>
        <Button
          onClick={fetchOrders}
          variant="outline"
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
            <p className="text-gray-600">Start by placing your first order!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Order #{order.order_id}</CardTitle>
                    <p className="text-sm text-gray-600">
                      Placed {formatTimeAgo(order.order_time)} • {formatDateTime(order.order_time)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">₱{order.total_price}</p>
                    <Badge variant="outline" className="mt-2">
                      {order.order_type === 'dine_in' ? 'Dine In' : 'Takeout'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                {/* Order Items */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900">
                            {item.quantity}x {item.name}
                          </span>
                          {item.notes && (
                            <span className="text-xs text-gray-500 italic">"{item.notes}"</span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          ₱{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Status */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Order Status</h4>
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(order.status)}
                    <Badge className={getStatusColor(order.status)}>
                      {order.status === 'pending_verification' ? 'Awaiting Verification' :
                       order.status === 'pending' ? 'Payment Pending' :
                       order.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">
                    {getStatusDescription(order.status)}
                  </p>
                </div>

                {/* Payment Status */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Payment Status</h4>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gray-600 text-sm font-bold">₱</span>
                    <Badge className={getPaymentStatusColor(order.payment_status)}>
                      {order.payment_status === 'paid' ? 'Paid' :
                       order.payment_status === 'failed' ? 'Failed' :
                       'Pending'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">
                    Payment Method: {order.payment_method.toUpperCase()}
                    {order.payment_status === 'pending' && order.payment_method === 'cash' && 
                     order.status === 'pending_verification' && 
                     ' • Waiting for staff to verify cash payment'}
                    {order.payment_status === 'pending' && (order.payment_method === 'gcash' || order.payment_method === 'paymaya') && 
                     ' • Please complete your digital payment'}
                  </p>
                  
                  {/* Receipt Upload removed - now handled in cart modal during checkout */}
                </div>

                {/* Order Notes */}
                {order.notes && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Order Notes</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {order.notes}
                    </p>
                  </div>
                )}

                {/* Completion Time */}
                {order.completed_time && (
                  <div className="text-sm text-gray-500 text-center pt-4 border-t border-gray-100">
                    Order completed on {formatDateTime(order.completed_time)}
                  </div>
                )}

                {/* Download Receipt Button */}
                {(order.status === 'completed' || order.status === 'ready') && (
                  <div className="pt-4 border-t border-gray-100">
                    <Button
                      onClick={() => {
                        const orderForReceipt = {
                          orderId: order.order_id,
                          customerName: order.customer_name,
                          status: order.status,
                          paymentStatus: order.payment_status,
                          paymentMethod: order.payment_method,
                          orderTime: order.order_time,
                          estimatedReadyTime: order.completed_time || order.order_time,
                          items: order.items.map(item => ({
                            name: item.name,
                            quantity: item.quantity,
                            price: item.price,
                            customizations: item.customizations,
                            notes: item.notes
                          })),
                          totalPrice: order.total_price,
                          tableNumber: null,
                          customerEmail: customerEmail
                        };
                        downloadReceipt(orderForReceipt);
                      }}
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 border-[#a87437] text-[#a87437] hover:bg-[#a87437] hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                      Download Receipt
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerOrderTracking;
