import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { io, Socket } from 'socket.io-client';
import { 
  Coffee, 
  CheckCircle, 
  Package, 
  Search,
  RefreshCw,
  Play,
  Eye,
  X
} from 'lucide-react';

interface OrderItem {
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface Order {
  orderId: string;
  customerName: string;
  tableNumber?: number;
  items: OrderItem[];
  totalPrice: number;
  status: 'pending' | 'pending_verification' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'pending_verification';
  orderType: 'dine_in' | 'takeout';
  orderTime: string;
  paymentMethod: string;
  notes?: string;
}

const StaffPOS: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [, setSocket] = useState<Socket | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Join staff room for real-time updates
    newSocket.emit('join-staff-room');

    // Listen for real-time updates
    newSocket.on('new-order-received', (orderData) => {
      console.log('New order received:', orderData);
      fetchOrders();
    });

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
  }, []);

  const fetchOrders = async () => {
    try {
      // Fetch orders using staff endpoints
      const response = await fetch('/api/staff/orders', {
        credentials: 'include'
      });
      
      let allOrders: Order[] = [];
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          allOrders = (data.orders || []).map((o: any) => ({
            ...o,
            notes: o.notes
          }));
        }
      }
      
      // Sort orders by order time (newest first)
      allOrders.sort((a: Order, b: Order) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime());
      
      setOrders(allOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/staff/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status, updatedBy: 'staff' }),
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const verifyPayment = async (orderId: string, paymentMethod: string) => {
    try {
      const response = await fetch(`/api/staff/orders/${orderId}/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          verifiedBy: 'staff', 
          paymentMethod 
        }),
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
    }
  };

  // Filter orders based on search
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const preparingOrders = filteredOrders.filter(order => order.status === 'preparing' || order.status === 'pending' || order.status === 'pending_verification');
  const readyOrders = filteredOrders.filter(order => order.status === 'ready');


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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Staff POS System</h1>
              <p className="text-gray-600 mt-2">Process orders and verify payments</p>
            </div>
            <Button 
              onClick={fetchOrders}
              variant="outline"
              className="flex items-center gap-2 bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search orders by customer name or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/50 backdrop-blur-sm border-white/20 focus:bg-white/70"
            />
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Preparing Orders */}
          <div className="space-y-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Coffee className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Orders</h2>
                <Badge className="ml-auto">{preparingOrders.length}</Badge>
              </div>
              
              {preparingOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Coffee className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {preparingOrders.map((order) => (
                    <Card key={order.orderId} className="bg-white/90 backdrop-blur-sm border-white/30 hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">#{order.orderId}</h3>
                            <p className="text-sm text-gray-600">{order.customerName}</p>
                            {order.tableNumber && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Table {order.tableNumber}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm bg-white/50 rounded-lg p-2">
                              <span className="text-gray-700">{item.quantity}x {item.name}</span>
                              <span className="text-gray-500 font-medium">₱{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        {order.notes && (
                          <div className="text-xs italic text-gray-600 bg-yellow-50 border border-yellow-100 rounded-md p-2">
                            Note: {order.notes}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mb-3 pt-2 border-t border-white/20">
                          <span className="font-semibold text-lg text-gray-900">₱{order.totalPrice}</span>
                          <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                            {order.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
                          </Badge>
                        </div>
                        
                        <div className="flex gap-2">
                          {order.paymentStatus === 'pending' && order.paymentMethod === 'cash' && order.status === 'pending_verification' && (
                            <Button
                              size="sm"
                              onClick={() => verifyPayment(order.orderId, 'cash')}
                              className="bg-amber-600 hover:bg-amber-700 flex-1 text-xs"
                            >
                              <span className="text-xs font-bold mr-1">₱</span>
                              Verify Payment
                            </Button>
                          )}
                          {order.status === 'pending' || order.status === 'pending_verification' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.orderId, 'preparing')}
                              className="flex-1 text-xs bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70"
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Start Preparing
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.orderId, 'ready')}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                            >
                              <Package className="w-3 h-3 mr-1" />
                              Mark Ready
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetails(true);
                            }}
                            className="text-xs"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-2 text-center">
                          {formatTime(order.orderTime)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ready Orders */}
          <div className="space-y-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Ready</h2>
                <Badge className="ml-auto">{readyOrders.length}</Badge>
              </div>
              
              {readyOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No orders ready</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {readyOrders.map((order) => (
                    <Card key={order.orderId} className="bg-white/90 backdrop-blur-sm border-white/30 hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">#{order.orderId}</h3>
                            <p className="text-sm text-gray-600">{order.customerName}</p>
                            {order.tableNumber && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Table {order.tableNumber}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm bg-white/50 rounded-lg p-2">
                              <span className="text-gray-700">{item.quantity}x {item.name}</span>
                              <span className="text-gray-500 font-medium">₱{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        {order.notes && (
                          <div className="text-xs italic text-gray-600 bg-yellow-50 border border-yellow-100 rounded-md p-2">
                            Note: {order.notes}
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mb-3 pt-2 border-t border-white/20">
                          <span className="font-semibold text-lg text-gray-900">₱{order.totalPrice}</span>
                          <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                            {order.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
                          </Badge>
                        </div>
                        
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.orderId, 'completed')}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Complete Order
                        </Button>
                        
                        <div className="text-xs text-gray-500 mt-2 text-center">
                          {formatTime(order.orderTime)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">Order Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOrderDetails(false)}
                  aria-label="Close order details"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Order Header */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Order ID</p>
                      <p className="font-semibold">#{selectedOrder.orderId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer</p>
                      <p className="font-semibold">{selectedOrder.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Order Type</p>
                      <p className="font-semibold capitalize">{selectedOrder.orderType.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="font-semibold uppercase">{selectedOrder.paymentMethod}</p>
                    </div>
                    {selectedOrder.tableNumber && (
                      <div>
                        <p className="text-sm text-gray-600">Table Number</p>
                        <p className="font-semibold">{selectedOrder.tableNumber}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Order Time</p>
                      <p className="font-semibold">{new Date(selectedOrder.orderTime).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
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

                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <span className="text-2xl font-bold text-gray-900">₱{selectedOrder.totalPrice}</span>
                  </div>
                  {selectedOrder.notes && (
                    <div className="mt-3 text-sm text-gray-700">
                      <span className="font-medium">Customer Note:</span> <span className="italic">{selectedOrder.notes}</span>
                    </div>
                  )}
                  
                  {/* Receipt Viewing for Digital Payments */}
                  {(selectedOrder.paymentMethod === 'gcash' || selectedOrder.paymentMethod === 'paymaya') && selectedOrder.paymentStatus === 'pending_verification' && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">Payment Receipt Available</p>
                          <p className="text-xs text-blue-700">Customer has uploaded a receipt for verification</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            const receiptUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/receipts/receipt/${selectedOrder.orderId}`;
                            window.open(receiptUrl, '_blank');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          View Receipt
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <Badge className={getPaymentStatusColor(selectedOrder.paymentStatus)}>
                      {selectedOrder.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
                    </Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {selectedOrder.paymentStatus === 'pending' && selectedOrder.paymentMethod === 'cash' && selectedOrder.status === 'pending_verification' && (
                    <Button
                      onClick={() => verifyPayment(selectedOrder.orderId, 'cash')}
                      className="bg-amber-600 hover:bg-amber-700 flex-1"
                    >
                      <span className="text-sm font-bold mr-2">₱</span>
                      Verify Payment
                    </Button>
                  )}
                  
                  {selectedOrder.status === 'pending' || selectedOrder.status === 'pending_verification' ? (
                    <Button
                      onClick={() => updateOrderStatus(selectedOrder.orderId, 'preparing')}
                      className="bg-blue-600 hover:bg-blue-700 flex-1"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Preparing
                    </Button>
                  ) : selectedOrder.status === 'preparing' ? (
                    <Button
                      onClick={() => updateOrderStatus(selectedOrder.orderId, 'ready')}
                      className="bg-green-600 hover:bg-green-700 flex-1"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Mark Ready
                    </Button>
                  ) : selectedOrder.status === 'ready' ? (
                    <Button
                      onClick={() => updateOrderStatus(selectedOrder.orderId, 'completed')}
                      className="bg-emerald-600 hover:bg-emerald-700 flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Order
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffPOS;


