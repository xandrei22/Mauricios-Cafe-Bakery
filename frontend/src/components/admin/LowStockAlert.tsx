import React, { useEffect } from 'react';
import { AlertTriangle, X, Package, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface LowStockItem {
  name: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  category: string;
  status: 'out_of_stock' | 'low_stock';
}

interface LowStockAlertData {
  items: LowStockItem[];
  criticalCount: number;
  lowStockCount: number;
  totalCount: number;
}

interface LowStockAlertProps {
  isOpen: boolean;
  onClose: () => void;
  alert: {
    title: string;
    message: string;
    priority: 'urgent' | 'high' | 'medium';
    data: LowStockAlertData;
  };
}

const LowStockAlert: React.FC<LowStockAlertProps> = ({ isOpen, onClose, alert }) => {
  if (!isOpen || !alert) return null;

  const { title, message, priority, data } = alert;
  const { items, criticalCount, lowStockCount, totalCount } = data;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-[#a87437] text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return 'bg-red-50 border-red-300 shadow-sm';
      case 'low_stock':
        return 'bg-yellow-50 border-yellow-300 shadow-sm';
      default:
        return 'bg-gray-50 border-gray-300 shadow-sm';
    }
  };

  const getItemStatusIcon = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'low_stock':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  // Lock page scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [isOpen]);

  return (
    <div className={`fixed inset-0 backdrop-blur-sm bg-white/20 flex items-center justify-center z-50 p-2 sm:p-4 ${isOpen ? 'block' : 'hidden'}`}>
      <Card className="w-full max-w-[92vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-2 border-[#a87437]/20 shadow-2xl">
        <CardHeader className={`${getPriorityColor(priority)} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
              <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
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
          <p className="text-xs sm:text-sm opacity-90">{message}</p>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
          {/* Summary */}
          <div className="bg-gradient-to-r from-[#a87437]/5 to-[#a87437]/10 rounded-lg p-4 sm:p-6 border-2 border-[#a87437]/20 shadow-lg">
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4 flex items-center text-[#3f3532]">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-[#a87437]" />
              Inventory Alert Summary
            </h3>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {criticalCount > 0 && (
                <Badge className="px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700">
                  {criticalCount} Critical
                </Badge>
              )}
              {lowStockCount > 0 && (
                <Badge className="px-4 py-2 text-sm font-semibold bg-yellow-100 text-yellow-800 border-yellow-300">
                  {lowStockCount} Low Stock
                </Badge>
              )}
              <Badge className="px-4 py-2 text-sm font-semibold bg-[#a87437] text-white hover:bg-[#a87437]/90">
                {totalCount} Total
              </Badge>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3 sm:space-y-4 max-h-[55vh] overflow-y-auto pr-1 sm:pr-2">
            {/* Critical Items */}
            {criticalCount > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Critical Items (Out of Stock)
                </h4>
                <div className="space-y-2">
                  {items
                    .filter(item => item.status === 'out_of_stock')
                    .map((item, index) => (
                      <div
                        key={index}
                        className={`p-2 sm:p-3 rounded-lg border ${getItemStatusColor(item.status)}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            {getItemStatusIcon(item.status)}
                            <div>
                              <p className="font-medium text-sm sm:text-base">{item.name}</p>
                              <p className="text-xs sm:text-sm text-gray-600">{item.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs sm:text-sm font-medium">
                              Current: {item.quantity} {item.unit}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              Reorder Level: {item.reorderLevel} {item.unit}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Low Stock Items */}
            {lowStockCount > 0 && (
              <div>
                <h4 className="font-semibold text-yellow-700 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Low Stock Items
                </h4>
                <div className="space-y-2">
                  {items
                    .filter(item => item.status === 'low_stock')
                    .map((item, index) => (
                      <div
                        key={index}
                        className={`p-2 sm:p-3 rounded-lg border ${getItemStatusColor(item.status)}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            {getItemStatusIcon(item.status)}
                            <div>
                              <p className="font-medium text-sm sm:text-base">{item.name}</p>
                              <p className="text-xs sm:text-sm text-gray-600">{item.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs sm:text-sm font-medium">
                              Current: {item.quantity} {item.unit}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-500">
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

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:space-x-4 pt-4 sm:pt-6 border-t border-[#a87437]/20">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="w-full sm:w-auto border-[#a87437] text-[#a87437] hover:bg-[#a87437] hover:text-white font-semibold"
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                // Navigate to inventory management
                window.location.href = '/admin/inventory';
                onClose();
              }}
              className="bg-[#a87437] hover:bg-[#a87437]/90 text-white w-full sm:w-auto font-semibold"
            >
              Manage Inventory
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LowStockAlert;
