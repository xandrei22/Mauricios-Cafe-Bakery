import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  Users, 
  Clock, 
  Coffee, 
  CheckCircle, 
  AlertCircle,
  QrCode,
  Eye
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
  paymentStatus: 'pending' | 'pending_verification' | 'paid' | 'failed';
  paymentMethod: string;
  orderTime: string;
  notes?: string;
}

interface TableData {
  tableNumber: number;
  status: 'occupied' | 'available' | 'reserved';
  currentOrder?: Order;
  lastActivity: string;
}

interface TableStatusProps {
  tables: TableData[];
  orders: Order[];
  onRefresh?: () => void;
}

const TableStatus: React.FC<TableStatusProps> = ({ tables, orders }) => {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  const getTableStatusBadge = (status: string) => {
    const statusConfig = {
      available: { color: 'bg-green-500', icon: CheckCircle, text: 'Available' },
      occupied: { color: 'bg-red-500', icon: Users, text: 'Occupied' },
      reserved: { color: 'bg-yellow-500', icon: Clock, text: 'Reserved' },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || AlertCircle;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const getOrderStatusBadge = (status: string) => {
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
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTableOrders = (tableNumber: number) => {
    return orders.filter(order => order.tableNumber === tableNumber);
  };

  const getTableRevenue = (tableNumber: number) => {
    const tableOrders = getTableOrders(tableNumber);
    return tableOrders.reduce((total, order) => total + order.totalPrice, 0);
  };

  const getTableDuration = (lastActivity: string) => {
    const now = new Date();
    const activity = new Date(lastActivity);
    const diffInMinutes = Math.floor((now.getTime() - activity.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center" />

      {/* Table Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map((table) => {
          const tableOrders = getTableOrders(table.tableNumber);
          const currentOrder = tableOrders.find(order => 
            order.status !== 'completed' && order.status !== 'cancelled'
          );
          const tableRevenue = getTableRevenue(table.tableNumber);

          return (
            <Card 
              key={table.tableNumber} 
              className={`hover:shadow-lg transition-shadow cursor-pointer ${
                selectedTable === table.tableNumber ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedTable(selectedTable === table.tableNumber ? null : table.tableNumber)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Table className="w-5 h-5" />
                      Table {table.tableNumber}
                    </CardTitle>
                  </div>
                  <div className="text-right">
                    {getTableStatusBadge(table.status)}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Current Order Info */}
                {currentOrder && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Current Order:</span>
                      {getOrderStatusBadge(currentOrder.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Customer:</span>
                        <span>{currentOrder.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Items:</span>
                        <span>{currentOrder.items.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span>₱{currentOrder.totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment:</span>
                        <span className={`${
                          currentOrder.paymentStatus === 'paid' ? 'text-green-600' : 
                          currentOrder.paymentStatus === 'failed' ? 'text-red-600' : 
                          'text-yellow-600'
                        }`}>
                          {currentOrder.paymentStatus.charAt(0).toUpperCase() + currentOrder.paymentStatus.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Table Stats */}
                <div className="pt-2 border-t">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-gray-900">{tableOrders.length}</div>
                      <div className="text-gray-500">Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">${tableRevenue.toFixed(2)}</div>
                      <div className="text-gray-500">Revenue</div>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="text-xs text-gray-500 text-center">
                  {table.status === 'occupied' ? (
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getTableDuration(table.lastActivity)}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <QrCode className="w-3 h-3" />
                      QR Ready
                    </div>
                  )}
                </div>

                {/* Expandable Details */}
                {selectedTable === table.tableNumber && (
                  <div className="pt-3 border-t space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Order History:</h4>
                    {tableOrders.length > 0 ? (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {tableOrders.map((order) => (
                          <div key={order.orderId} className="text-xs bg-gray-50 p-2 rounded">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium">#{order.orderId}</span>
                              {getOrderStatusBadge(order.status)}
                            </div>
                            <div className="text-gray-600">
                              <div>{order.customerName}</div>
                              <div className="flex justify-between">
                                <span>{order.items.length} items</span>
                                <span>${order.totalPrice.toFixed(2)}</span>
                              </div>
                              <div className="text-gray-500">
                                {format(new Date(order.orderTime), 'HH:mm')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 text-center py-2">
                        No orders yet
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Table Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {tables.filter(t => t.status === 'available').length}
              </div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {tables.filter(t => t.status === 'occupied').length}
              </div>
              <div className="text-sm text-gray-600">Occupied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {tables.filter(t => t.status === 'reserved').length}
              </div>
              <div className="text-sm text-gray-600">Reserved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {orders.filter(o => o.status === 'pending' || o.status === 'preparing').length}
              </div>
              <div className="text-sm text-gray-600">Active Orders</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TableStatus; 