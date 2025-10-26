import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Coffee, 
  CheckCircle, 
  AlertCircle, 
  Table,
  User,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface Order {
  id: string;
  orderId: string;
  customerName: string;
  tableNumber: number;
  items: any[];
  totalPrice: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: string;
  orderTime: string;
  notes?: string;
}

interface OrderQueueProps {
  orders: Order[];
  onStatusUpdate: (orderId: string, status: string) => void;
  onRefresh: () => void;
}

const OrderQueue: React.FC<OrderQueueProps> = ({ orders, onStatusUpdate, onRefresh }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

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

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      pending: 'preparing',
      preparing: 'ready',
      ready: 'completed'
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const getStatusButton = (order: Order) => {
    const nextStatus = getNextStatus(order.status);
    
    if (!nextStatus || order.status === 'completed' || order.status === 'cancelled') {
      return null;
    }

    const buttonConfig = {
      preparing: { text: 'Start Preparing', color: 'bg-blue-500 hover:bg-blue-600' },
      ready: { text: 'Mark Ready', color: 'bg-green-500 hover:bg-green-600' },
      completed: { text: 'Complete', color: 'bg-gray-500 hover:bg-gray-600' }
    };

    const config = buttonConfig[nextStatus as keyof typeof buttonConfig];

    return (
      <Button
        className={`${config.color} text-white`}
        onClick={() => onStatusUpdate(order.orderId, nextStatus)}
        size="sm"
      >
        {config.text}
      </Button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All ({orders.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
            size="sm"
          >
            Pending ({orders.filter(o => o.status === 'pending').length})
          </Button>
          <Button
            variant={filter === 'preparing' ? 'default' : 'outline'}
            onClick={() => setFilter('preparing')}
            size="sm"
          >
            Preparing ({orders.filter(o => o.status === 'preparing').length})
          </Button>
          <Button
            variant={filter === 'ready' ? 'default' : 'outline'}
            onClick={() => setFilter('ready')}
            size="sm"
          >
            Ready ({orders.filter(o => o.status === 'ready').length})
          </Button>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((order) => (
          <Card key={order.orderId} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Order #{order.orderId}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Table className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Table {order.tableNumber}</span>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(order.status)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Customer Info */}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">{order.customerName}</span>
              </div>

              {/* Items */}
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-gray-700">Items:</h4>
                <div className="text-sm text-gray-600">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total and Payment */}
              <div className="flex justify-between items-center pt-2 border-t">
                <div>
                  <div className="text-lg font-bold">${order.totalPrice.toFixed(2)}</div>
                  {getPaymentStatusBadge(order.paymentStatus)}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {format(new Date(order.orderTime), 'HH:mm')}
                  </div>
                  <div className="text-xs text-gray-500">
                    {order.paymentMethod}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <strong>Notes:</strong> {order.notes}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {getStatusButton(order)}
                {order.status === 'ready' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusUpdate(order.orderId, 'completed')}
                  >
                    Complete
                  </Button>
                )}
                {order.status !== 'completed' && order.status !== 'cancelled' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onStatusUpdate(order.orderId, 'cancelled')}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Coffee className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders</h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'No orders have been placed yet.'
                : `No ${filter} orders at the moment.`
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrderQueue; 