import React from 'react';
import { X, AlertTriangle, Package, AlertCircle, ShoppingCart, CreditCard, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface NotificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: any;
  onMarkAsRead: (notificationId: number) => void;
}

const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  notification, 
  onMarkAsRead 
}) => {
  if (!isOpen || !notification) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <Package className="h-5 w-5 text-orange-500" />;
      case 'new_order':
        return <ShoppingCart className="h-5 w-5 text-green-500" />;
      case 'payment_update':
        return <CreditCard className="h-5 w-5 text-blue-500" />;
      case 'event_request':
        return <Calendar className="h-5 w-5 text-purple-500" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // No need for handleMarkAsRead since it's automatic now

  const renderNotificationContent = () => {
    if (!notification.data) {
      return (
        <div className="p-4">
          <p className="text-gray-600">{notification.message}</p>
        </div>
      );
    }

    const data = JSON.parse(notification.data || '{}');

    switch (notification.notification_type) {
      case 'low_stock':
        return renderLowStockContent(data);
      case 'new_order':
        return renderOrderContent(data);
      case 'payment_update':
        return renderPaymentContent(data);
      case 'event_request':
        return renderEventContent(data);
      default:
        return (
          <div className="p-4">
            <p className="text-gray-600">{notification.message}</p>
          </div>
        );
    }
  };

  const renderLowStockContent = (data: any) => {
    const { items = [], criticalCount = 0, lowStockCount = 0, totalCount = 0 } = data;

    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-3 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Inventory Alert Summary
          </h3>
          <div className="flex flex-wrap gap-3">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="px-3 py-1 text-sm">
                {criticalCount} Critical
              </Badge>
            )}
            {lowStockCount > 0 && (
              <Badge variant="secondary" className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800">
                {lowStockCount} Low Stock
              </Badge>
            )}
            <Badge variant="outline" className="px-3 py-1 text-sm">
              {totalCount} Total
            </Badge>
          </div>
        </div>

        {/* Items List */}
        {items.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700">Affected Items:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {items.map((item: any, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    item.status === 'out_of_stock' 
                      ? 'bg-red-100 border-red-200' 
                      : 'bg-yellow-100 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {item.status === 'out_of_stock' ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Current: {item.quantity} {item.unit}
                      </p>
                      <p className="text-xs text-gray-500">
                        Reorder Level: {item.reorderLevel} {item.unit}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOrderContent = (data: any) => {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-3 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Order Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="font-medium">{data.orderId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-medium">{data.customerName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="font-medium">₱{data.totalAmount || '0'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payment Method</p>
              <p className="font-medium">{data.paymentMethod || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentContent = (data: any) => {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-3 flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Payment Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Order ID</p>
              <p className="font-medium">{data.orderId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-medium">{data.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Amount</p>
              <p className="font-medium">₱{data.amount || '0'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Method</p>
              <p className="font-medium">{data.paymentMethod || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEventContent = (data: any) => {
    return (
      <div className="space-y-4">
        <div className="bg-purple-50 rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-3 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Event Request Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Event Name</p>
              <p className="font-medium">{data.eventName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-medium">{data.eventDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Contact</p>
              <p className="font-medium">{data.contactName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{data.contactPhone}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 backdrop-blur-sm bg-white/20 flex items-center justify-center z-50 p-4 ${isOpen ? 'block' : 'hidden'}`}>
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <CardHeader className={`${getPriorityColor(notification.priority || 'medium')} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getNotificationIcon(notification.notification_type)}
              <CardTitle className="text-xl">{notification.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm opacity-90">{notification.message}</p>
          <p className="text-xs opacity-75">
            {new Date(notification.created_at).toLocaleString()}
          </p>
        </CardHeader>

        <CardContent className="p-6">
          {renderNotificationContent()}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationDetailModal;
