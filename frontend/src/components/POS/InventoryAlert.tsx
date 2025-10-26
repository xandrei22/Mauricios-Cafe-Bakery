import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Package, 
  TrendingDown, 
  Plus,
  Minus,
  RefreshCw,
  Eye
} from 'lucide-react';

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  stockQuantity: number;
  unit: string;
  isAvailable: boolean;
  priceModifier: number;
  reorderLevel?: number;
}

interface InventoryAlertProps {}

const InventoryAlert: React.FC<InventoryAlertProps> = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const base = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${base}/api/inventory`);
      const data = await response.json();
      if (data.success && Array.isArray(data.ingredients)) {
        const mapped: InventoryItem[] = data.ingredients.map((i: any) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          stockQuantity: typeof i.actual_quantity === 'number' ? i.actual_quantity : parseFloat(i.actual_quantity) || 0,
          unit: i.actual_unit || '',
          isAvailable: !!i.is_available,
          priceModifier: typeof i.cost_per_actual_unit === 'number' ? i.cost_per_actual_unit : parseFloat(i.cost_per_actual_unit) || 0,
          reorderLevel: typeof i.reorder_level === 'number' ? i.reorder_level : parseFloat(i.reorder_level) || 0,
        }));
        setInventory(mapped);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateInventory = async (itemId: number, adjustment: number, reason: string) => {
    try {
      const base = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${base}/api/inventory/${itemId}/adjust`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adjustment,
          reason
        }),
      });

      if (response.ok) {
        fetchInventory();
        setSelectedItem(null);
        setAdjustmentAmount(0);
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) {
      return { status: 'out', color: 'bg-red-500', text: 'Out of Stock' };
    } else if (quantity <= 5) {
      return { status: 'low', color: 'bg-yellow-500', text: 'Low Stock' };
    } else if (quantity <= 15) {
      return { status: 'medium', color: 'bg-orange-500', text: 'Medium Stock' };
    } else {
      return { status: 'good', color: 'bg-green-500', text: 'Good Stock' };
    }
  };

  const getStockStatusBadge = (quantity: number) => {
    const status = getStockStatus(quantity);
    return (
      <Badge className={`${status.color} text-white`}>
        {status.text}
      </Badge>
    );
  };

  const lowStockItems = inventory.filter(item => item.reorderLevel !== undefined && item.stockQuantity <= (item.reorderLevel || 0));
  const outOfStockItems = inventory.filter(item => item.stockQuantity <= 0);

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
        </div>
        <Button onClick={fetchInventory} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="space-y-3">
          {outOfStockItems.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  Out of Stock Items ({outOfStockItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {outOfStockItems.map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded-lg border border-red-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-600">{item.category}</div>
                        </div>
                        <Badge className="bg-red-500 text-white">Out of Stock</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {lowStockItems.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <TrendingDown className="w-5 h-5" />
                  Low Stock Items ({lowStockItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded-lg border border-yellow-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-600">
                            {item.stockQuantity} {item.unit} remaining
                          </div>
                        </div>
                        <Badge className="bg-yellow-500 text-white">Low Stock</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              All Inventory Items ({inventory.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inventory.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Inventory Items</h3>
                <p className="text-gray-500">No inventory items have been added yet.</p>
              </div>
            ) : (
              inventory.map((item) => (
                <Card 
                  key={item.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedItem?.id === item.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">{item.category}</div>
                        <div className="text-sm text-gray-600">
                          ${item.priceModifier.toFixed(2)} per {item.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {item.stockQuantity} {item.unit}
                        </div>
                        {getStockStatusBadge(item.stockQuantity)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Inventory Adjustment Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Inventory Adjustment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedItem ? (
              <>
                {/* Item Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Item Details</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Name:</span>
                      <span className="font-medium">{selectedItem.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span>{selectedItem.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Stock:</span>
                      <span className="font-medium">
                        {selectedItem.stockQuantity} {selectedItem.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Price Modifier:</span>
                      <span>${selectedItem.priceModifier.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      {getStockStatusBadge(selectedItem.stockQuantity)}
                    </div>
                  </div>
                </div>

                {/* Adjustment Controls */}
                <div className="space-y-3">
                  <h3 className="font-medium">Adjust Stock</h3>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAdjustmentAmount(adjustmentAmount - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <input
                      type="number"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(parseInt(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 border rounded-md text-center"
                      placeholder="0"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAdjustmentAmount(adjustmentAmount + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="text-sm text-gray-600 text-center">
                    New total: {selectedItem.stockQuantity + adjustmentAmount} {selectedItem.unit}
                  </div>

                  <div className="space-y-2">
                    <Button
                      className="w-full bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => updateInventory(selectedItem.id, adjustmentAmount, 'Manual adjustment')}
                      disabled={adjustmentAmount === 0}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Stock
                    </Button>

                    <Button
                      className="w-full bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => updateInventory(selectedItem.id, -Math.abs(adjustmentAmount), 'Manual adjustment')}
                      disabled={adjustmentAmount === 0}
                    >
                      <Minus className="w-4 h-4 mr-2" />
                      Remove Stock
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedItem(null);
                        setAdjustmentAmount(0);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Item</h3>
                <p className="text-gray-500">
                  Choose an inventory item to adjust its stock level.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {inventory.filter(item => getStockStatus(item.stockQuantity).status === 'good').length}
              </div>
              <div className="text-sm text-gray-600">Good Stock</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {inventory.filter(item => getStockStatus(item.stockQuantity).status === 'medium').length}
              </div>
              <div className="text-sm text-gray-600">Medium Stock</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {lowStockItems.length}
              </div>
              <div className="text-sm text-gray-600">Low Stock</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {outOfStockItems.length}
              </div>
              <div className="text-sm text-gray-600">Out of Stock</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryAlert; 