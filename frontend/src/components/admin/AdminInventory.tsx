import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { io, Socket } from 'socket.io-client';
import { 
  Package, 
  Download,
  Search,
  Filter,
  Plus
} from 'lucide-react';

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  actual_quantity: number;
  actual_unit: string;
  reorder_level: number;
  cost_per_actual_unit: number;
  storage_location: string;
  days_of_stock: number;
  is_available: boolean;
  visible_in_customization: boolean;
  extra_price_per_unit?: number; // customer-facing extra price per 1 unit
}

const AdminInventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [customizationFilter, setCustomizationFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io('http://localhost:5001', {
      transports: ['websocket', 'polling'],
      timeout: 30000,
      forceNew: true,
      autoConnect: true
    });
    
    setSocket(newSocket);

    // Wait for connection before joining room
    newSocket.on('connect', () => {
      console.log('🔔 AdminInventory: Socket connected, joining admin room');
      // Join admin room for real-time updates
      newSocket.emit('join-admin-room');
    });

    // Listen for real-time updates
    newSocket.on('inventory-updated', (data) => {
      console.log('🔔 AdminInventory: Received inventory-updated event:', data);
      fetchInventory({ silent: true });
    });

    newSocket.on('order-updated', (updateData) => {
      console.log('🔔 AdminInventory: Received order-updated event:', updateData);
      fetchInventory({ silent: true });
    });

    // Fallback: Poll for updates every 5 seconds if socket is not connected
    const pollInterval = setInterval(() => {
      if (!newSocket.connected) {
        console.log('🔔 AdminInventory: Socket not connected, polling for updates...');
        fetchInventory({ silent: true });
      }
    }, 5000);

    newSocket.on('disconnect', () => {
      console.log('🔔 AdminInventory: Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔔 AdminInventory: Socket connection error:', error);
      // Retry connection after 3 seconds
      setTimeout(() => {
        console.log('🔔 AdminInventory: Retrying socket connection...');
        newSocket.connect();
      }, 3000);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔔 AdminInventory: Socket reconnected after', attemptNumber, 'attempts');
      newSocket.emit('join-admin-room');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('🔔 AdminInventory: Socket reconnection error:', error);
    });

    // Initial data fetch
    fetchInventory();

    return () => {
      clearInterval(pollInterval);
      newSocket.close();
    };
  }, []);

  const fetchInventory = async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options;
    try {
      if (!silent) setLoading(true);
      const response = await fetch('/api/admin/inventory');
      const data = await response.json();
      
      if (data.success) {
        console.log('Inventory data received:', data.inventory);
        console.log('First item sample:', data.inventory[0]);
        setInventory(data.inventory);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const downloadInventory = async (format: 'excel' | 'pdf') => {
    try {
      const response = await fetch(`/api/admin/inventory/download?format=${format}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(`Error downloading ${format} inventory:`, error);
    }
  };

  const toggleCustomizationVisibility = async (itemId: number, currentVisibility: boolean) => {
    try {
      const response = await fetch(`/api/admin/inventory/${itemId}/customization-visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visible_in_customization: !currentVisibility
        })
      });

      if (response.ok) {
        // Update the local state
        setInventory(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, visible_in_customization: !currentVisibility }
            : item
        ));
      } else {
        console.error('Failed to update customization visibility');
      }
    } catch (error) {
      console.error('Error updating customization visibility:', error);
    }
  };

  // Update customer extra price per unit
  const updateExtraPrice = async (itemId: number, newPrice: number) => {
    try {
      const res = await fetch(`/api/admin/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extra_price_per_unit: newPrice })
      });
      if (res.ok) {
        setInventory(prev => prev.map(it => it.id === itemId ? { ...it, extra_price_per_unit: newPrice } : it));
      }
    } catch (e) {
      console.error('Failed to update extra price:', e);
    }
  };

  const getFilteredInventory = () => {
    let filtered = inventory;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Apply stock filter
    if (stockFilter === 'low') {
      filtered = filtered.filter(item => item.actual_quantity <= item.reorder_level);
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(item => item.actual_quantity <= 0);
    }

    // Apply customization filter
    if (customizationFilter === 'visible') {
      filtered = filtered.filter(item => item.visible_in_customization);
    } else if (customizationFilter === 'hidden') {
      filtered = filtered.filter(item => !item.visible_in_customization);
    }

    return filtered;
  };

  const getCategories = () => {
    const categories = [...new Set(inventory.map(item => item.category))];
    return categories.sort();
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.actual_quantity <= 0) {
      return { status: 'Out of Stock', variant: 'destructive' as const };
    } else if (item.actual_quantity <= item.reorder_level) {
      return { status: 'Low Stock', variant: 'secondary' as const };
    } else {
      return { status: 'In Stock', variant: 'default' as const };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatQuantity = (qty: number, unit: string) => {
    const precision = qty < 1 ? 4 : qty < 10 ? 3 : 2;
    return `${qty.toFixed(precision).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')} ${unit}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredInventory = getFilteredInventory();
  const categories = getCategories();

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor and manage your inventory levels</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Download Buttons */}
          <Button 
            onClick={() => downloadInventory('excel')} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button 
            onClick={() => downloadInventory('pdf')} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search items, SKU, category..."
                className="w-full"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border rounded-md px-3 py-2 w-full"
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Stock Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select 
                value={stockFilter} 
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="border rounded-md px-3 py-2 w-full"
                aria-label="Filter by stock level"
              >
                <option value="all">All Stock Levels</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>

            {/* Customization Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select 
                value={customizationFilter} 
                onChange={(e) => setCustomizationFilter(e.target.value as any)}
                className="border rounded-md px-3 py-2 w-full"
                aria-label="Filter by customization visibility"
              >
                <option value="all">All Customization Options</option>
                <option value="visible">Available for Customization</option>
                <option value="hidden">Hidden from Customization</option>
              </select>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-end">
              <span className="text-sm text-muted-foreground">
                {filteredInventory.length} of {inventory.length} items
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Grid */}
      <div className="rounded-xl bg-[#f5f5f5] p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredInventory.map((item) => {
            const stockStatus = getStockStatus(item);
            const isLowStock = item.actual_quantity <= item.reorder_level;
            
            return (
              <Card key={item.id} className={`${isLowStock ? 'border-orange-200 bg-orange-50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{item.sku}</p>
                    </div>
                    <Badge variant={stockStatus.variant} className="ml-2">
                      {stockStatus.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Stock Level */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Stock</span>
                    <span className="font-medium">
                      {formatQuantity(item.actual_quantity, item.actual_unit)}
                    </span>
                  </div>

                  {/* Reorder Level */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reorder Level</span>
                    <span className="text-sm">{item.reorder_level} {item.actual_unit}</span>
                  </div>

                  {/* Cost */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cost per Unit</span>
                    <span className="font-medium">{formatCurrency(item.cost_per_actual_unit)}</span>
                  </div>

                  {/* Extra price per unit (customer) */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Extra price (per {item.actual_unit})</span>
                    <span className="font-medium">
                      {typeof item.extra_price_per_unit === 'number' ? formatCurrency(item.extra_price_per_unit) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const val = prompt(`Set extra price per ${item.actual_unit} (₱)`, String(item.extra_price_per_unit ?? 0));
                        if (val !== null) {
                          const num = parseFloat(val);
                          if (!isNaN(num) && num >= 0) updateExtraPrice(item.id, Number(num.toFixed(2)));
                        }
                      }}
                      className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                    >
                      Edit extra price
                    </button>
                  </div>

                  {/* Storage */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Storage</span>
                    <span className="text-sm">{item.storage_location}</span>
                  </div>

                  {/* Days of Stock */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Days of Stock</span>
                    <span className={`text-sm font-medium ${
                      item.days_of_stock <= 7 ? 'text-red-600' : 
                      item.days_of_stock <= 14 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {item.days_of_stock} days
                    </span>
                  </div>

                  {/* Category */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                  </div>

                  {/* Customization Visibility */}
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">Customization</span>
                      <span className="text-xs text-gray-500">
                        {(item.visible_in_customization ?? true) ? 'Available for customers' : 'Hidden from customers'}
                      </span>
                    </div>
                    {(() => {
                      const isVisible = item.visible_in_customization ?? true;
                      return (
                        <button
                          onClick={() => toggleCustomizationVisibility(item.id, isVisible)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            isVisible ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                          aria-label={`Toggle customization visibility for ${item.name}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isVisible ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      );
                    })()}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Restock
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredInventory.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No inventory items found</h3>
            <p className="text-muted-foreground">
              {searchTerm || categoryFilter || stockFilter !== 'all' 
                ? 'Try adjusting your filters or search terms.'
                : 'No inventory items have been added yet.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminInventory;

