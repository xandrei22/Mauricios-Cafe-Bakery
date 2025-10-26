import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, CheckCircle, Coffee, Package, Truck } from 'lucide-react';

interface OrderStatus {
  orderId: string;
  customerName: string;
  items: any[];
  totalPrice: number;
  status: 'pending' | 'pending_verification' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'pending_verification' | 'paid' | 'failed';
  orderType: 'dine_in' | 'takeout';
  queuePosition: number;
  estimatedReadyTime: string;
  orderTime: string;
  tableNumber?: number;
}

const OrderTracking: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        const data = await response.json();
        
        if (data.success) {
          setOrder(data.order);
        } else {
          setError('Order not found');
        }
      } catch (error) {
        setError('Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
      
      // Poll for updates every 30 seconds
      const interval = setInterval(fetchOrder, 30000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ShoppingCart className="w-6 h-6 text-yellow-500" />;
      case 'pending_verification':
        return <CheckCircle className="w-6 h-6 text-orange-500" />;
      case 'confirmed':
        return <CheckCircle className="w-6 h-6 text-purple-500" />;
      case 'preparing':
        return <Coffee className="w-6 h-6 text-blue-500" />;
      case 'ready':
        return <Package className="w-6 h-6 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'cancelled':
        return <Truck className="w-6 h-6 text-red-500" />;
      default:
        console.warn('Unknown order status for icon:', status);
        return <ShoppingCart className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Order Received';
      case 'pending_verification':
        return 'Verifying Payment';
      case 'confirmed':
        return 'Order Confirmed';
      case 'preparing':
        return 'Preparing Your Order';
      case 'ready':
        return 'Ready for Pickup';
      case 'completed':
        return 'Order Completed';
      case 'cancelled':
        return 'Order Cancelled';
      default:
        console.warn('Unknown order status:', status);
        return 'Pending Status';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending_verification':
        return 'bg-orange-100 text-orange-800';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        console.warn('Unknown order status for color:', status);
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{error || 'The order you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  const estimatedTime = new Date(order.estimatedReadyTime);
  const orderTime = new Date(order.orderTime);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div></div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {getStatusText(order.status)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Order ID:</span>
              <span className="ml-2 font-medium">{order.orderId}</span>
            </div>
            <div>
              <span className="text-gray-600">Order Type:</span>
              <span className="ml-2 font-medium capitalize">{order.orderType.replace('_', ' ')}</span>
            </div>
            {order.tableNumber && (
              <div>
                <span className="text-gray-600">Table:</span>
                <span className="ml-2 font-medium">{order.tableNumber}</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Queue Position:</span>
              <span className="ml-2 font-medium">#{order.queuePosition}</span>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Progress</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">Order Placed</p>
                <p className="text-sm text-gray-500">{orderTime.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="flex-shrink-0">
                {getStatusIcon(order.status)}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">{getStatusText(order.status)}</p>
                <p className="text-sm text-gray-500">
                  Estimated ready time: {estimatedTime.toLocaleTimeString()}
                </p>
              </div>
            </div>

            {order.status === 'ready' && (
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="w-6 h-6 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Ready for Pickup</p>
                  <p className="text-sm text-gray-500">Your order is ready!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
          
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                </div>
                <p className="font-medium">₱{item.price * item.quantity}</p>
              </div>
            ))}
            
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-lg font-bold">Total</span>
              <span className="text-lg font-bold">₱{order.totalPrice}</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-lg">
            <h3 className="font-medium text-amber-800 mb-2">Important Information</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Your order is in queue position #{order.queuePosition}</li>
              <li>• Estimated ready time: {estimatedTime.toLocaleTimeString()}</li>
              {order.orderType === 'dine_in' && (
                <li>• Please wait at your table for service</li>
              )}
              {order.orderType === 'takeout' && (
                <li>• Please pick up your order at the counter when ready</li>
              )}
              <li>• You will be notified when your order is ready</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking; 