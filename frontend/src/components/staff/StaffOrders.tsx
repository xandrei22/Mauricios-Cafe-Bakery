import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { io } from 'socket.io-client';
import { 
  Coffee, 
  Clock, 
  CheckCircle, 
  Package, 
  Search,
  RefreshCw,
  Eye,
  X,
  User
} from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { encodeId } from '../../utils/idObfuscation';

interface Order {
  orderId: string;
  displayOrderId?: string;
  customerName: string;
  tableNumber?: number;
  items: any[];
  totalPrice: number;
  status: 'pending' | 'pending_verification' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderType: 'dine_in' | 'takeout';
  queuePosition: number;
  estimatedReadyTime: string;
  orderTime: string;
  paymentMethod: string;
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

const transformOrdersResponse = (ordersData: any[] = []): Order[] => {
  return ordersData.map((order: any) => {
    const rawOrderId = String(order.order_id || order.orderId || order.id || '').trim();
    return {
      orderId: rawOrderId,
      displayOrderId: formatOrderId(rawOrderId),
      customerName: (order.customer_name || order.customerName || '').toString().trim(),
      tableNumber: order.table_number ?? order.tableNumber,
      items: Array.isArray(order.items)
        ? order.items
        : (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : []),
      totalPrice: Number(order.total_price ?? order.totalPrice ?? 0),
      status: String(order.status || '').toLowerCase().trim() as Order['status'],
      paymentStatus: String(order.payment_status || order.paymentStatus || '').toLowerCase().trim() as Order['paymentStatus'],
      orderType: String(order.order_type || order.orderType || 'dine_in').toLowerCase().trim() as Order['orderType'],
      queuePosition: order.queue_position ?? order.queuePosition ?? 0,
      estimatedReadyTime: order.estimated_ready_time || order.estimatedReadyTime,
      orderTime: order.order_time || order.orderTime,
      paymentMethod: String(order.payment_method || order.paymentMethod || '')
    };
  });
};

const StaffOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('preparing');
  const [isMobile, setIsMobile] = useState(false);

  // Tab options will be defined after orders are processed

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Screen size detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    fetchOrders();
    // live updates like admin
    const socket = io(API_URL, {
      withCredentials: false,
      transports: ['websocket', 'polling']
    });
    socket.emit('join-staff-room');
    const refresh = () => fetchOrders(true);
    socket.on('order-updated', refresh);
    socket.on('payment-updated', refresh);

    // Fallback polling in case sockets are blocked
    const poll = setInterval(() => {
      fetchOrders(true);
    }, 3000);
    return () => {
      socket.off('order-updated', refresh);
      socket.off('payment-updated', refresh);
      socket.close();
      clearInterval(poll);
    };
  }, []);

  const fetchOrders = async (silent?: boolean) => {
    try {
      if (!silent) setLoading(true);
      const response = await axiosInstance.get('/api/staff/orders');
      const data = response.data;
      if (data && data.success && Array.isArray(data.orders)) {
        setOrders(transformOrdersResponse(data.orders));
      } else if (data && Array.isArray(data.orders)) {
        setOrders(transformOrdersResponse(data.orders));
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (!silent) setOrders([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await axiosInstance.put(`/api/staff/orders/${orderId}/status`, { status });
      fetchOrders(true);
    } catch (error) {
      console.error('Error updating order status:', error);
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

  // Pending list strictly for not-yet-verified orders
  const pendingOrders = filteredOrders.filter(order => 
    (order.status === 'pending' || order.status === 'pending_verification')
  );
  // Preparing shows only accepted/being worked orders
  const preparingOrders = filteredOrders.filter(order => {
    const status = order.status;
    const pay = order.paymentStatus;
    if (status === 'cancelled' || status === 'completed' || status === 'ready') return false;
    if (status === 'preparing') return true;
    // Treat paid+pending as preparing so staff can work it
    if (pay === 'paid' && status === 'pending') return true;
    return false;
  });
  const readyOrders = filteredOrders.filter(order => order.status === 'ready');

  // Tab options for dropdown - defined after orders are processed
  const tabOptions = [
    { value: 'preparing', label: 'Preparing', count: preparingOrders.length },
    { value: 'ready', label: 'Ready', count: readyOrders.length }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ready':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
      case 'pending_verification':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'confirmed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'processing':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'pending_verification':
        return <span className="text-sm font-bold">₱</span>;
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Track and manage customer orders in real-time</p>
        </div>
        {/* Removed Today button per request */}
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
            <div className="text-2xl font-bold text-gray-900">{pendingOrders.length + preparingOrders.length + readyOrders.length}</div>
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
            /* Desktop Navigation - Empty div since Tabs are in content section */
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
                              <span className="text-blue-800">Order #{order.displayOrderId || order.orderId}</span>
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
                                onClick={() => updateOrderStatus(order.orderId, 'ready')}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Ready
                              </Button>
                              <Button
                                onClick={() => {}}
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
                              <span className="text-green-800">Order #{order.displayOrderId || order.orderId}</span>
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
                                onClick={() => updateOrderStatus(order.orderId, 'completed')}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark Completed
                              </Button>
                              <Button
                                onClick={() => {}}
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
                        <h3 className="font-semibold text-gray-900 text-lg">{order.customerName}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                          <span className="font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">#{order.displayOrderId || order.orderId}</span>
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
                      <span className="font-semibold text-xl text-gray-900">₱{Number(order.totalPrice || 0).toFixed(2)}</span>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.orderId, 'ready')}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Package className="w-4 h-4 mr-1" />
                        Mark as Ready
                      </Button>
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
                          <span className="font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full">#{order.displayOrderId || order.orderId}</span>
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
      </div>
    </div>
  );
};

export default StaffOrders;
