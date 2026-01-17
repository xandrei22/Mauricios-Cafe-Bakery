import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { io, Socket } from 'socket.io-client';
import { 
  Package, 
  AlertTriangle, 
  Search, 
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Eye
} from 'lucide-react';

interface InventoryItem {
  id: number;
  name: string;
  actual_quantity: number;
  reorder_level: number;
  actual_unit: string;
  category: string;
  description: string;
  sku?: string | null;
  storage_location?: string | null;
  cost_per_unit?: number | null;
  extra_price_per_unit?: number | null;
  days_of_stock?: number | null;
  created_at: string;
  updated_at: string;
  status: 'low' | 'normal' | 'out';
}

const StaffInventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // removed lastUpdated display/state to simplify header
  const [, setSocket] = useState<Socket | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch inventory data via AJAX
  const fetchInventoryData = async (options: { silent?: boolean } = {}) => {
    const { silent = false } = options;
    try {
      if (!silent) setLoading(true);
      setError(null);
      
      // Use staff inventory endpoint
      const response = await fetch('/api/staff/inventory', {
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }
      
      const data = await response.json();
      setInventory(data.inventory || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial data fetch and WebSocket setup
  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
      transports: ['polling', 'websocket'],
      path: '/socket.io',
      timeout: 30000,
      forceNew: true,
      autoConnect: true
    });
    
    setSocket(newSocket);

    // Wait for connection before joining room
    newSocket.on('connect', () => {
      console.log('🔔 StaffInventory: Socket connected, joining staff room');
      // Join staff room for real-time updates
      newSocket.emit('join-staff-room');
    });

    // Listen for real-time updates
    newSocket.on('inventory-updated', (data) => {
      console.log('🔔 StaffInventory: Received inventory-updated event:', data);
      fetchInventoryData({ silent: true });
    });

    newSocket.on('order-updated', (updateData) => {
      console.log('🔔 StaffInventory: Received order-updated event:', updateData);
      fetchInventoryData({ silent: true });
    });

    // Fallback: Poll for updates every 5 seconds if socket is not connected
    const pollInterval = setInterval(() => {
      if (!newSocket.connected) {
        console.log('🔔 StaffInventory: Socket not connected, polling for updates...');
        fetchInventoryData({ silent: true });
      }
    }, 5000);

    newSocket.on('disconnect', () => {
      console.log('🔔 StaffInventory: Socket disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔔 StaffInventory: Socket connection error:', error);
      // Retry connection after 3 seconds
      setTimeout(() => {
        console.log('🔔 StaffInventory: Retrying socket connection...');
        newSocket.connect();
      }, 3000);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔔 StaffInventory: Socket reconnected after', attemptNumber, 'attempts');
      newSocket.emit('join-staff-room');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('🔔 StaffInventory: Socket reconnection error:', error);
    });

    // Initial data fetch
    fetchInventoryData();

    return () => {
      clearInterval(pollInterval);
      newSocket.close();
    };
  }, []);

  // Filter inventory based on search
  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get low stock items
  const lowStockItems = filteredInventory.filter(item => 
    item.actual_quantity <= item.reorder_level
  );

  // Get out of stock items
  const outOfStockItems = filteredInventory.filter(item => 
    item.actual_quantity === 0
  );

  const getStatusColor = (item: InventoryItem) => {
    if (item.actual_quantity === 0) return 'bg-red-100 text-red-800 border-red-200';
    if (item.actual_quantity <= item.reorder_level) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStatusIcon = (item: InventoryItem) => {
    if (item.actual_quantity === 0) return <AlertTriangle className="w-4 h-4" />;
    if (item.actual_quantity <= item.reorder_level) return <TrendingDown className="w-4 h-4" />;
    return <TrendingUp className="w-4 h-4" />;
  };

  const getStatusText = (item: InventoryItem) => {
    if (item.actual_quantity === 0) return 'Out of Stock';
    if (item.actual_quantity <= item.reorder_level) return 'Low Stock';
    return 'In Stock';
  };

  const formatQuantity = (qty: number, unit: string) => {
    const precision = qty < 1 ? 4 : qty < 10 ? 3 : 2;
    return `${qty.toFixed(precision).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')} ${unit}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <Button onClick={() => fetchInventoryData()} className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor and track inventory levels</p>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-xl bg-[#f5f5f5] p-4">
          <div className="relative">
            <Input
              placeholder="Search inventory items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-white border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]"
            />
            <Button
              onClick={() => {
                // Search functionality is already handled by the filtered inventory
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

        {/* Stats Cards */}
        <div className="rounded-xl bg-[#f5f5f5] p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredInventory.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock</p>
                    <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Inventory List */}
        <div className="rounded-xl bg-[#f5f5f5] p-4">
          <div className="flex items-center gap-2 mb-6">
            <Package className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Inventory Items</h2>
            <Badge className="ml-auto">{filteredInventory.length} items</Badge>
          </div>

          {filteredInventory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No inventory items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map((item) => (
                <Card key={item.id} className="bg-white/90 backdrop-blur-sm border-white/30 hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.category}</p>
                      </div>
                      <Badge className={getStatusColor(item)}>
                        {getStatusIcon(item)}
                        {getStatusText(item)}
                      </Badge>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Current Stock:</span>
                        <span className="font-medium">{formatQuantity(item.actual_quantity, item.actual_unit)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Reorder Level:</span>
                        <span className="font-medium">{item.reorder_level} {item.actual_unit}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-xs bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/80 hover:border-amber-300 hover:text-amber-700 hover:shadow-md transition-colors"
                        onClick={() => { setSelectedItem(item); setShowDetails(true); }}
                        aria-label={`View details for ${item.name}`}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      {showDetails && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white/95 border border-white/20 rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedItem.name}</h3>
                <p className="text-sm text-gray-600">{selectedItem.category}</p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                aria-label="Close details"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Actual Stock:</span>
                <span className="font-medium">{formatQuantity(selectedItem.actual_quantity, selectedItem.actual_unit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Reorder Level:</span>
                <span className="font-medium">{selectedItem.reorder_level} {selectedItem.actual_unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">SKU:</span>
                <span className="font-medium">{selectedItem.sku || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Storage:</span>
                <span className="font-medium">{selectedItem.storage_location || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cost:</span>
                <span className="font-medium">{selectedItem.cost_per_unit != null ? `₱${selectedItem.cost_per_unit} per ${selectedItem.actual_unit}` : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Extra price:</span>
                <span className="font-medium">{selectedItem.extra_price_per_unit != null ? `₱${selectedItem.extra_price_per_unit} per ${selectedItem.actual_unit}` : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Days of Stock:</span>
                <span className="font-medium">{selectedItem.days_of_stock != null ? `${selectedItem.days_of_stock} days` : '—'}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Description</span>
                <p className="mt-1 text-gray-800">{selectedItem.description || 'No description provided.'}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Created</span>
                  <p className="font-medium text-gray-800">{new Date(selectedItem.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-600">Last Updated</span>
                  <p className="font-medium text-gray-800">{new Date(selectedItem.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-200 flex justify-end">
              <Button onClick={() => setShowDetails(false)} className="bg-amber-600 hover:bg-amber-700 text-white">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffInventory;
