import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Coffee, Package, Check, X, DollarSign } from 'lucide-react';
import { io } from 'socket.io-client';

interface Order {
  id: string;
  customer_name: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  total: number;
  items: any[];
  created_at: string;
  order_type?: 'dine_in' | 'takeout';
  table_number?: number;
  payment_status?: 'pending' | 'paid' | 'failed';
}

export const OrdersView = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:5001`;
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log('WebSocket connected');
      // Subscribe to order updates
      newSocket.send(JSON.stringify({ type: 'subscribe', channel: 'orders' }));
    };

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'newOrder') {
        console.log('New order received:', data.order);
        setOrders(prev => [...prev, data.order]);
      } else if (data.type === 'orderStatusUpdate') {
        console.log('Order status update:', data.orderId, data.status);
        setOrders(prev => 
          prev.map(order => 
            order.id === data.orderId ? { ...order, status: data.status } : order
          )
        );
      }
    };

    newSocket.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after a delay
      setTimeout(() => setSocket(null), 5000);
    };

    setSocket(newSocket);

    // Initial fetch
    fetchOrders();

    return () => {
      if (newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`);
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Moved inside the component to be accessible to child components
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'preparing': return <Coffee className="h-5 w-5 text-blue-500" />;
      case 'ready': return <Package className="h-5 w-5 text-green-500" />;
      case 'completed': return <Check className="h-5 w-5 text-green-500" />;
      case 'cancelled': return <X className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const ordersByStatus = {
    pending: filteredOrders.filter(o => o.status === 'pending'),
    preparing: filteredOrders.filter(o => o.status === 'preparing'),
    ready: filteredOrders.filter(o => o.status === 'ready')
  };

  return (
    <div className="p-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Pending Orders</p>
              <p className="text-2xl font-bold">{ordersByStatus.pending.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Coffee className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Preparing</p>
              <p className="text-2xl font-bold">{ordersByStatus.preparing.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Ready</p>
              <p className="text-2xl font-bold">{ordersByStatus.ready.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Total Active</p>
              <p className="text-2xl font-bold">{filteredOrders.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search by customer name or order ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Lists */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Orders */}
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Clock className="h-5 w-5" /> Pending Orders
          </h2>
          <div className="space-y-4">
            {ordersByStatus.pending.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onStatusChange={fetchOrders}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        </div>

        {/* Preparing Orders */}
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Coffee className="h-5 w-5" /> Preparing
          </h2>
          <div className="space-y-4">
            {ordersByStatus.preparing.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onStatusChange={fetchOrders}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        </div>

        {/* Ready Orders */}
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Package className="h-5 w-5" /> Ready
          </h2>
          <div className="space-y-4">
            {ordersByStatus.ready.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onStatusChange={fetchOrders}
                getStatusIcon={getStatusIcon}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface OrderCardProps {
  order: Order;
  onStatusChange: () => void;
}

const OrderCard: React.FC<OrderCardProps & { getStatusIcon: (status: string) => React.ReactNode }> = ({ order, onStatusChange, getStatusIcon }) => {
  const updateOrderStatus = async (newStatus: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-medium">{order.customer_name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">Order #{order.id}</span>
            {order.order_type && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                order.order_type === 'dine_in' 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-green-100 text-green-800 border border-green-200'
              }`}>
                {order.order_type === 'dine_in' 
                  ? `Table ${order.table_number || 'N/A'}` 
                  : 'Takeout'}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {getStatusIcon(order.status)}
          {order.payment_status && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
              order.payment_status === 'paid' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {order.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
            </span>
          )}
        </div>
      </div>
      
      <div className="text-sm text-gray-600 mb-3">
        {order.items.map((item, index) => (
          <div key={index}>{item.quantity}x {item.name}</div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <p className="font-medium">₱{order.total.toFixed(2)}</p>
        {order.status !== 'ready' && (
          <Button 
            size="sm"
            onClick={() => updateOrderStatus(order.status === 'pending' ? 'preparing' : 'ready')}
          >
            {order.status === 'pending' ? 'Start Preparing' : 'Mark Ready'}
          </Button>
        )}
      </div>
    </Card>
  );
};
