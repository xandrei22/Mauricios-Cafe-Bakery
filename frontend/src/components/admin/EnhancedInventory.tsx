import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { useSessionValidation } from '../../hooks/useSessionValidation';
import { io, Socket } from 'socket.io-client';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Edit,
  Trash,
  Upload,
  X,
  Box,
  Leaf,
  History,
  LayoutGrid,
  List as ListIcon,
  MoreVertical
} from 'lucide-react';

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  sku: string;
  description: string;
  actual_quantity: number;
  actual_unit: string;
  reorder_level: number;
  days_of_stock: number;
  cost_per_unit: number;
  storage_location: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  visible_in_customization: boolean;
  extra_price_per_unit?: number;
}

interface EnhancedInventoryProps {
  // Add any props if needed
}

const EnhancedInventory: React.FC<EnhancedInventoryProps> = () => {
  console.log('EnhancedInventory component rendering');
  
  // Session validation
  const { isValid } = useSessionValidation();
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [storageLocations, setStorageLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStorage, setSelectedStorage] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('inventory');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [transactionsCount, setTransactionsCount] = useState(0);
  const [transactionRows, setTransactionRows] = useState<Array<{
    id: number;
    ingredient_name: string;
    transaction_type: string;
    actual_amount: number;
    previous_actual_quantity: number;
    new_actual_quantity: number;
    notes: string;
    created_at: string;
  }>>([]);
  
  // Predefined categories and units
  const predefinedCategories = [
    'coffee', 'milk', 'syrup', 'sauce', 'liqueur', 'juice', 'beverage', 
    'tea', 'spice', 'fruit', 'dairy', 'powder', 'chocolate', 'topping', 
    'seasoning', 'sweetener', 'cream', 'water', 'ice', 'garnish',
    'espresso', 'filter', 'cold_brew', 'whipped_cream', 'caramel', 'vanilla',
    'hazelnut', 'mocha', 'cinnamon', 'nutmeg', 'sugar', 'honey', 'agave'
  ];
  
  const predefinedUnits = [
    { value: 'l', label: 'Liters (l)' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'g', label: 'Grams (g)' },
    { value: 'ml', label: 'Milliliters (ml)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'oz', label: 'Ounces (oz)' },
    { value: 'cup', label: 'Cups (cup)' },
    { value: 'tbsp', label: 'Tablespoons (tbsp)' },
    { value: 'tsp', label: 'Teaspoons (tsp)' },
    { value: 'shot', label: 'Shots (shot)' },
    { value: 'pump', label: 'Pumps (pump)' },
    { value: 'scoop', label: 'Scoops (scoop)' },
    { value: 'bag', label: 'Bags (bag)' },
    { value: 'can', label: 'Cans (can)' },
    { value: 'bottle', label: 'Bottles (bottle)' }
  ];
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form states
  const [addForm, setAddForm] = useState({
    name: '',
    category: '',
    sku: '',
    description: '',
    actual_unit: '',
    initial_quantity: '',
    reorder_level: '',
    days_of_stock: '',
    cost_per_unit: '',
    storage_location: '',
    extra_price_per_unit: ''
  });

  const [editForm, setEditForm] = useState({
    id: 0,
    name: '',
    category: '',
    sku: '',
    description: '',
    actual_quantity: '',
    actual_unit: '',
    reorder_level: '',
    days_of_stock: '',
    cost_per_unit: '',
    storage_location: '',
    extra_price_per_unit: ''
  });

  // Fetch inventory data via AJAX
  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/inventory', { credentials: 'omit' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setInventoryItems(data.inventory || []);
        setFilteredItems(data.inventory || []);
        
        // Don't overwrite predefined categories, just add new ones from inventory
        if (data.inventory && data.inventory.length > 0) {
          const uniqueCategories = data.inventory
            .map((item: InventoryItem) => item.category)
            .filter(Boolean) as string[];
          
          // Only add new categories that aren't already in predefinedCategories
          const newCategories = uniqueCategories.filter(cat => !predefinedCategories.includes(cat));
          if (newCategories.length > 0) {
            setCategories(prev => [...new Set([...prev, ...newCategories])]);
          }

          // collect storage locations
          const uniqueStorages = Array.from(new Set((data.inventory as InventoryItem[])
            .map(i => (i.storage_location || '').trim())
            .filter(v => !!v)));
          setStorageLocations(uniqueStorages);
        }
      } else {
        throw new Error(data.error || 'Failed to load inventory');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const [txPage, setTxPage] = useState(1);
  const txLimit = 50;

  const fetchTransactions = async (page: number = txPage) => {
    try {
      const res = await fetch(`/api/inventory/transactions?group=1&page=${page}&limit=${txLimit}`, { credentials: 'omit' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setTransactionRows(data.transactions || []);
        setTransactionsCount(data.pagination?.total || (data.transactions || []).length);
      }
    } catch (_) {}
  };

  // Fetch categories separately - REMOVED: Using predefined categories only
  // const fetchCategories = async () => {
  //   try {
  //     const response = await fetch('/api/admin/inventory/categories', { credentials: 'omit' });
  //     if (response.ok) {
  //       const data = await response.json();
  //       if (data.success) {
  //         // Combine predefined categories with existing ones from database
  //         const existingCategories = data.categories || [];
  //         const allCategories = [...new Set([...predefinedCategories, ...existingCategories])];
  //         setCategories(allCategories);
  //       } else {
  //         // If API fails, use predefined categories
  //         setCategories(predefinedCategories);
  //       }
  //     } else {
  //       // If API fails, use predefined categories
  //       setCategories(predefinedCategories);
  //     }
  //   } catch (error) {
  //     console.error('Failed to fetch categories:', error);
  //     // Fallback to predefined categories
  //     setCategories(predefinedCategories);
  //   }
  // };

  // Initial data fetch and WebSocket setup
  useEffect(() => {
    // Set predefined categories immediately - these should never be empty
    setCategories(predefinedCategories);
    
    // Initialize Socket.IO connection
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const newSocket = io(API_URL);

    // Join admin room for real-time updates
    newSocket.emit('join-admin-room');

    // Listen for real-time updates
    newSocket.on('inventory-updated', (data) => {
      console.log('Inventory updated in EnhancedInventory:', data);
      fetchInventoryData();
      fetchTransactions(1);
    });

    newSocket.on('order-updated', (updateData) => {
      console.log('Order updated (affects inventory) in EnhancedInventory:', updateData);
      fetchInventoryData();
      fetchTransactions(1);
    });
    
    // Only fetch inventory data if backend is available
    try {
      fetchInventoryData();
      fetchTransactions(1);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setLoading(false);
    }

    return () => {
      newSocket.close();
    };
  }, []); // Empty dependency array to run only once

  // Filter and sort items when filters or tab change
  useEffect(() => {
    let filtered = [...inventoryItems];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by storage
    if (selectedStorage !== 'all') {
      filtered = filtered.filter(item => (item.storage_location || '') === selectedStorage);
    }

    // Apply tab-specific filtering
    if (activeTab === 'lowStock') {
      filtered = filtered.filter(item => item.actual_quantity <= item.reorder_level);
    }

    setFilteredItems(filtered);
  }, [searchTerm, selectedCategory, selectedStorage, inventoryItems, activeTab]);

  // Add item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({
          name: addForm.name,
          category: addForm.category,
          sku: addForm.sku,
          description: addForm.description,
          actual_unit: addForm.actual_unit,
          initial_quantity: parseFloat(addForm.initial_quantity),
          reorder_level: parseFloat(addForm.reorder_level),
          days_of_stock: parseFloat(addForm.days_of_stock),
          cost_per_unit: parseFloat(addForm.cost_per_unit), // This will be mapped to cost_per_actual_unit in backend
          storage_location: addForm.storage_location,
          extra_price_per_unit: addForm.extra_price_per_unit ? parseFloat(addForm.extra_price_per_unit) : undefined
        })
      });

      if (response.ok) {
        setShowAddModal(false);
        setAddForm({ 
          name: '', 
          category: '', 
          sku: '', 
          description: '', 
          actual_unit: '', 
          initial_quantity: '', 
          reorder_level: '', 
          days_of_stock: '', 
          cost_per_unit: '', 
          storage_location: '',
          extra_price_per_unit: '' 
        });
        fetchInventoryData();
      } else {
        const error = await response.json();
        alert('Failed to add item: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    } finally {
      setIsAdding(false);
    }
  };

  // Delete item
  const handleDeleteItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const response = await fetch(`/api/admin/inventory/${id}`, {
        method: 'DELETE',
        credentials: 'omit'
      });

      if (response.ok) {
        fetchInventoryData();
      } else {
        const error = await response.json();
        alert('Failed to delete item: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  // Edit item
  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/admin/inventory/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({
          name: editForm.name,
          category: editForm.category,
          actual_quantity: editForm.actual_quantity,
          actual_unit: editForm.actual_unit,
          reorder_level: editForm.reorder_level,
          cost_per_unit: editForm.cost_per_unit, // This will be mapped to cost_per_actual_unit in backend
          extra_price_per_unit: editForm.extra_price_per_unit ? parseFloat(editForm.extra_price_per_unit) : undefined
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditForm({
          id: 0,
          name: '',
          category: '',
          sku: '',
          description: '',
          actual_quantity: '',
          actual_unit: '',
          reorder_level: '',
          days_of_stock: '',
          cost_per_unit: '',
          storage_location: '',
          extra_price_per_unit: ''
        });
        fetchInventoryData();
      } else {
        const error = await response.json();
        alert('Failed to update item: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  // Open edit modal
  const openEditModal = (item: InventoryItem) => {
    setEditForm({
      id: item.id,
      name: item.name,
      category: item.category,
      sku: item.sku,
      description: item.description || '',
      actual_quantity: item.actual_quantity.toString(),
      actual_unit: item.actual_unit,
      reorder_level: item.reorder_level.toString(),
      days_of_stock: item.days_of_stock?.toString() || '30',
      cost_per_unit: item.cost_per_unit.toString(),
      storage_location: item.storage_location || '',
      extra_price_per_unit: (item.extra_price_per_unit != null ? String(item.extra_price_per_unit) : '')
    });
    setShowEditModal(true);
  };

  // Toggle customization visibility
  const toggleCustomizationVisibility = async (itemId: number, currentVisibility: boolean) => {
    try {
      const response = await fetch(`/api/admin/inventory/${itemId}/customization-visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'omit',
        body: JSON.stringify({
          visible_in_customization: !currentVisibility
        })
      });

      if (response.ok) {
        // Update the local state
        setInventoryItems(prev => prev.map(item => 
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

  // Bulk import
  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const file = formData.get('csvFile') as File;
    
    if (!file) {
      alert('Please select a CSV file');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('csvFile', file);

      const response = await fetch('/api/admin/inventory/bulk', {
        method: 'POST',
        credentials: 'omit',
        body: formDataToSend
      });

      if (response.ok) {
        setShowBulkModal(false);
    fetchInventoryData();
        alert('Bulk import successful!');
      } else {
        const error = await response.json();
        alert('Failed to import: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('Failed to import');
    }
  };

  // Calculate summary data
  const totalIngredients = inventoryItems.length;
  const inStock = inventoryItems.filter(item => item.status === 'in_stock').length;
  const lowStock = inventoryItems.filter(item => item.status === 'low_stock').length;

  // Get stock status badge
  const getStockStatusBadge = (item: InventoryItem) => {
    if (item.actual_quantity <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (item.actual_quantity <= item.reorder_level) {
      return <Badge variant="secondary">Low Stock</Badge>;
    } else {
      return <Badge variant="default">In Stock</Badge>;
    }
  };

  // Show session error if session is invalid
  if (!isValid) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-2">Session expired</p>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Simple fallback to prevent white page
  if (!categories || categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-4" />
          <p className="text-yellow-600">Loading categories...</p>
          <Button onClick={() => setCategories(predefinedCategories)} className="mt-4">
            Load Categories
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
        {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor and manage your inventory levels</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowBulkModal(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            + Bulk Add
          </Button>
          <Button onClick={() => setShowAddModal(true)} variant="outline" className="bg-white text-black hover:bg-gray-50">
            <Plus className="h-4 w-4 mr-2" />
            + Add Ingredient
          </Button>
        </div>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Box className="h-6 w-6 text-gray-500" />
                <span className="text-base sm:text-lg font-medium text-gray-700">Total Ingredients</span>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">{totalIngredients}</div>
            </CardContent>
          </Card>
          <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-gray-500" />
                <span className="text-base sm:text-lg font-medium text-gray-700">In Stock</span>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">{inStock}</div>
            </CardContent>
          </Card>
          <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-gray-500" />
                <span className="text-base sm:text-lg font-medium text-gray-700">Low Stock</span>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">{lowStock}</div>
            </CardContent>
          </Card>
          <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <History className="h-6 w-6 text-gray-500" />
                <span className="text-base sm:text-lg font-medium text-gray-700">Transactions</span>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">{transactionsCount}</div>
            </CardContent>
          </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
        <TabsList className="w-full flex flex-wrap items-center justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="inventory" className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100">Inventory</TabsTrigger>
          <TabsTrigger value="lowStock" className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100">Low Stock Alerts</TabsTrigger>
          <TabsTrigger value="transactions" className="px-3 py-1 text-sm font-medium rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border hover:bg-gray-100">Transactions</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters, Search, View toggle */}
      <div className="rounded-xl bg-[#f5f5f5] p-4">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:min-w-[18rem]">
            <Input
              placeholder="Search by name, SKU, category"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-white border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]"
            />
            <Button
              onClick={() => {
                // Search functionality is already handled by the filtered items
                console.log('Searching for:', searchTerm);
              }}
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-[#a87437]/10"
            >
              <Search className="h-4 w-4 text-[#a87437]" />
            </Button>
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-auto">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="pr-4 border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Storage Filter */}
          <div className="w-full sm:w-auto">
            <Select value={selectedStorage} onValueChange={setSelectedStorage}>
              <SelectTrigger className="pr-4 border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]">
                <SelectValue placeholder="All Storage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Storage</SelectItem>
                {storageLocations.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="w-full sm:w-auto flex sm:justify-end">
            <div className="relative" ref={moreMenuRef}>
              <Button
                variant="outline"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="h-10 border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              
              {/* Dropdown Menu */}
              {showMoreMenu && (
                <div className="absolute right-0 top-11 z-50 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setViewMode("grid");
                        setShowMoreMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                        viewMode === "grid" ? "text-[#a87437] font-medium" : "text-gray-700"
                      }`}
                    >
                      <span>Grid View</span>
                      {viewMode === "grid" && <span className="text-[#a87437]">✓</span>}
                    </button>
                    <button
                      onClick={() => {
                        setViewMode("list");
                        setShowMoreMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                        viewMode === "list" ? "text-[#a87437] font-medium" : "text-gray-700"
                      }`}
                    >
                      <span>List View</span>
                      {viewMode === "list" && <span className="text-[#a87437]">✓</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      {activeTab === 'transactions' ? (
        <div className="p-4">
          {transactionRows.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <History className="h-8 w-8 mx-auto mb-3 text-purple-500" />
              <p>No inventory transactions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Ingredient</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">From → To</th>
                    <th className="py-2 pr-4">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionRows.map(tx => (
                    <tr key={tx.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 whitespace-nowrap">{new Date(tx.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{tx.ingredient_name}</td>
                      <td className="py-2 pr-4 capitalize">{tx.transaction_type}</td>
                      <td className="py-2 pr-4">{tx.actual_amount}</td>
                      <td className="py-2 pr-4">{tx.previous_actual_quantity} → {tx.new_actual_quantity}</td>
                      <td className="py-2 pr-4 max-w-[24rem] truncate" title={tx.notes}>{tx.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-500">Total: {transactionsCount}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={txPage <= 1} onClick={() => { const p = Math.max(txPage - 1, 1); setTxPage(p); fetchTransactions(p); }}>Prev</Button>
                  <Button variant="outline" size="sm" onClick={() => { const p = txPage + 1; setTxPage(p); fetchTransactions(p); }}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
      viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3 w-44">Name</th>
                <th className="text-left p-3 w-32">Category</th>
                <th className="text-left p-3 w-32">SKU</th>
                <th className="text-left p-3 w-28">Storage</th>
                <th className="text-left p-3 w-28">Stock</th>
                <th className="text-left p-3 w-24">Reorder</th>
                <th className="text-left p-3 w-24">Status</th>
                <th className="text-left p-3 w-20">Days</th>
                <th className="text-left p-3 w-20">Cost</th>
                <th className="text-left p-3 w-20">Extra</th>
                <th className="text-center p-3 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium truncate">{item.name}</td>
                  <td className="p-3 truncate">{item.category}</td>
                  <td className="p-3 truncate">{item.sku}</td>
                  <td className="p-3 truncate">{item.storage_location}</td>
                  <td className="p-3 truncate">{item.actual_quantity} {item.actual_unit}</td>
                  <td className="p-3 truncate">{item.reorder_level} {item.actual_unit}</td>
                  <td className="p-3">{getStockStatusBadge(item)}</td>
                  <td className="p-3 truncate">{item.days_of_stock} days</td>
                  <td className="p-3 truncate">₱{item.cost_per_unit}</td>
                  <td className="p-3 truncate">{item.extra_price_per_unit != null ? `₱${Number(item.extra_price_per_unit).toFixed(2)}` : '—'}</td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEditModal(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteItem(item.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="relative">
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {item.category}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {item.description && (
                <p className="text-sm text-gray-600 mb-3">{item.description}</p>
              )}
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Actual Stock:</span>
                  <span className="font-medium">
                    {item.actual_quantity} {item.actual_unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reorder Level:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {item.reorder_level} {item.actual_unit}
                    </span>
                    {getStockStatusBadge(item)}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SKU:</span>
                  <span className="font-medium">{item.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Storage:</span>
                  <span className="font-medium">{item.storage_location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost:</span>
                  <span className="font-medium">₱{item.cost_per_unit} per {item.actual_unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Extra price:</span>
                  <span className="font-medium">
                    {item.extra_price_per_unit != null ? `₱${Number(item.extra_price_per_unit).toFixed(2)} per ${item.actual_unit}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days of Stock:</span>
                  <span className="font-medium">{item.days_of_stock} days</span>
                </div>
              </div>

              {/* Customization Visibility */}
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mt-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">Customization</span>
                  <span className="text-xs text-gray-500">
                    {(item.visible_in_customization ?? true) ? 'Available for customers' : 'Hidden from customers'}
                  </span>
                </div>
                <button
                  onClick={() => toggleCustomizationVisibility(item.id, item.visible_in_customization ?? true)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    (item.visible_in_customization ?? true) ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  role="button"
                  aria-label={`Toggle customization visibility for ${item.name}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      (item.visible_in_customization ?? true) ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )
      )}

      {/* Add New Ingredient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Add New Ingredient</h2>
              <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-8">
              {/* Ingredient Details */}
              <div className="space-y-6">
                <h3 className="font-medium text-gray-900">Ingredient Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ingredient Name *</Label>
                    <Input
                      id="name"
                      value={addForm.name}
                      onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Whole Milk"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={addForm.category} onValueChange={(value) => setAddForm(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                        <SelectValue placeholder="Select category (e.g., Dairy, Syrups)" />
              </SelectTrigger>
              <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
              </SelectContent>
            </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU (Stock Keeping Unit) *</Label>
                    <Input
                      id="sku"
                      value={addForm.sku}
                      onChange={(e) => setAddForm(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="e.g., MILK-1L-FRESH"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="actual_unit">Actual Unit *</Label>
                    <Select value={addForm.actual_unit} onValueChange={(value) => setAddForm(prev => ({ ...prev, actual_unit: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit (e.g., ml, g, pcs)" />
                      </SelectTrigger>
                      <SelectContent>
                        {predefinedUnits.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Internal storage unit</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={addForm.description}
                    onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., KEEP ON FRIDGE"
                  />
                </div>
              </div>

              {/* Stock Management */}
              <div className="bg-green-50 p-5 rounded-lg space-y-5">
                <div className="flex items-center space-x-2">
                  <Leaf className="h-4 w-4 text-green-600" />
                  <h3 className="font-medium text-gray-900">Stock Management</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Configure how much inventory to start with and when to reorder. You can type directly into these fields.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="initial_quantity">Initial Quantity</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(addForm.initial_quantity) || 0;
                          setAddForm(prev => ({ ...prev, initial_quantity: (current - 1).toString() }));
                        }}
                      >
                        -
                      </Button>
                      <Input
                        id="initial_quantity"
                        type="number"
                        value={addForm.initial_quantity}
                        onChange={(e) => setAddForm(prev => ({ ...prev, initial_quantity: e.target.value }))}
                        required
                        className="text-center"
                        placeholder="Starting amount (in unit)"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(addForm.initial_quantity) || 0;
                          setAddForm(prev => ({ ...prev, initial_quantity: (current + 1).toString() }));
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Starting amount in {addForm.actual_unit || 'unit'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder_level">Reorder Level</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(addForm.reorder_level) || 0;
                          setAddForm(prev => ({ ...prev, reorder_level: (current - 1).toString() }));
                        }}
                      >
                        -
                      </Button>
                      <Input
                        id="reorder_level"
                        type="number"
                        value={addForm.reorder_level}
                        onChange={(e) => setAddForm(prev => ({ ...prev, reorder_level: e.target.value }))}
                        required
                        className="text-center"
                        placeholder="Reorder when stock drops to this level"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(addForm.reorder_level) || 0;
                          setAddForm(prev => ({ ...prev, reorder_level: (current + 1).toString() }));
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Reorder when stock drops to this level</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="days_of_stock">Days of Stock</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(addForm.days_of_stock) || 0;
                          setAddForm(prev => ({ ...prev, days_of_stock: (current - 1).toString() }));
                        }}
                      >
                        -
                      </Button>
                      <Input
                        id="days_of_stock"
                        type="number"
                        value={addForm.days_of_stock}
                        onChange={(e) => setAddForm(prev => ({ ...prev, days_of_stock: e.target.value }))}
                        required
                        className="text-center"
                        placeholder="Estimated days current stock will last"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(addForm.days_of_stock) || 0;
                          setAddForm(prev => ({ ...prev, days_of_stock: (current + 1).toString() }));
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Estimated days current stock will last</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost_per_unit">Cost per Unit (₱)</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(addForm.cost_per_unit) || 0;
                          setAddForm(prev => ({ ...prev, cost_per_unit: (current - 1).toString() }));
                        }}
                      >
                        -
                      </Button>
                      <Input
                        id="cost_per_unit"
                        type="number"
                        step="0.01"
                        value={addForm.cost_per_unit}
                        onChange={(e) => setAddForm(prev => ({ ...prev, cost_per_unit: e.target.value }))}
                        required
                        className="text-center"
                        placeholder="Cost per unit in pesos"
                      />
                <Button
                        type="button"
                  variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(addForm.cost_per_unit) || 0;
                          setAddForm(prev => ({ ...prev, cost_per_unit: (current + 1).toString() }));
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Cost per {addForm.actual_unit || 'unit'} in pesos</p>
                  </div>
                </div>
              </div>

              {/* Storage Location */}
              <div className="space-y-2">
                <Label htmlFor="storage_location">Storage Location</Label>
                <Input
                  id="storage_location"
                  value={addForm.storage_location}
                  onChange={(e) => setAddForm(prev => ({ ...prev, storage_location: e.target.value }))}
                  placeholder="e.g., REFRIGERATOR"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAdding} className="bg-[#a87437] hover:bg-[#a87437]/90 text-white">
                  {isAdding ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ingredient Modal */}
      {showEditModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Edit Ingredient</h2>
              <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleEditItem} className="p-6 space-y-8">
              {/* Ingredient Details */}
              <div className="space-y-6">
                <h3 className="font-medium text-gray-900">Ingredient Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit_name">Ingredient Name *</Label>
                    <Input
                      id="edit_name"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_category">Category *</Label>
                    <Select value={editForm.category} onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit_sku">SKU (Stock Keeping Unit) *</Label>
                    <Input
                      id="edit_sku"
                      value={editForm.sku}
                      onChange={(e) => setEditForm(prev => ({ ...prev, sku: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_actual_unit">Actual Unit *</Label>
                    <Select value={editForm.actual_unit} onValueChange={(value) => setEditForm(prev => ({ ...prev, actual_unit: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {predefinedUnits.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Internal storage unit</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_description">Description</Label>
                  <Textarea
                    id="edit_description"
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., KEEP ON FRIDGE"
                  />
                </div>
              </div>

              {/* Stock Management */}
              <div className="bg-green-50 p-4 rounded-lg space-y-4">
                <div className="flex items-center space-x-2">
                  <Leaf className="h-4 w-4 text-green-600" />
                  <h3 className="font-medium text-gray-900">Stock Management</h3>
                </div>
                        <p className="text-sm text-gray-600">
                  Configure how much inventory to start with and when to reorder. You can type directly into these fields.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit_actual_quantity">Current Quantity</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(editForm.actual_quantity) || 0;
                          setEditForm(prev => ({ ...prev, actual_quantity: (current - 1).toString() }));
                        }}
                      >
                        -
                      </Button>
                      <Input
                        id="edit_actual_quantity"
                        type="number"
                        value={editForm.actual_quantity}
                        onChange={(e) => setEditForm(prev => ({ ...prev, actual_quantity: e.target.value }))}
                        required
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(editForm.actual_quantity) || 0;
                          setEditForm(prev => ({ ...prev, actual_quantity: (current + 1).toString() }));
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Current amount in {editForm.actual_unit || 'unit'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_reorder_level">Reorder Level</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(editForm.reorder_level) || 0;
                          setEditForm(prev => ({ ...prev, reorder_level: (current - 1).toString() }));
                        }}
                      >
                        -
                      </Button>
                      <Input
                        id="edit_reorder_level"
                        type="number"
                        value={editForm.reorder_level}
                        onChange={(e) => setEditForm(prev => ({ ...prev, reorder_level: e.target.value }))}
                        required
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(editForm.reorder_level) || 0;
                          setEditForm(prev => ({ ...prev, reorder_level: (current + 1).toString() }));
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Reorder when stock drops to this level</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit_days_of_stock">Days of Stock</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(editForm.days_of_stock) || 0;
                          setEditForm(prev => ({ ...prev, days_of_stock: (current - 1).toString() }));
                        }}
                      >
                        -
                      </Button>
                      <Input
                        id="edit_days_of_stock"
                        type="number"
                        value={editForm.days_of_stock}
                        onChange={(e) => setEditForm(prev => ({ ...prev, days_of_stock: e.target.value }))}
                        required
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(editForm.days_of_stock) || 0;
                          setEditForm(prev => ({ ...prev, days_of_stock: (current + 1).toString() }));
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Estimated days current stock will last</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_cost_per_unit">Cost per Unit (₱)</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(editForm.cost_per_unit) || 0;
                          setEditForm(prev => ({ ...prev, cost_per_unit: (current - 1).toString() }));
                        }}
                      >
                        -
                      </Button>
                      <Input
                        id="edit_cost_per_unit"
                        type="number"
                        step="0.01"
                        value={editForm.cost_per_unit}
                        onChange={(e) => setEditForm(prev => ({ ...prev, cost_per_unit: e.target.value }))}
                        required
                        className="text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = parseFloat(editForm.cost_per_unit) || 0;
                          setEditForm(prev => ({ ...prev, cost_per_unit: (current + 1).toString() }));
                        }}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Cost per {editForm.actual_unit || 'unit'} in pesos</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_extra_price_per_unit">Extra price per unit (₱)</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="edit_extra_price_per_unit"
                        type="number"
                        step="0.01"
                        value={editForm.extra_price_per_unit}
                        onChange={(e) => setEditForm(prev => ({ ...prev, extra_price_per_unit: e.target.value }))}
                        className="text-center"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Customer price per {editForm.actual_unit || 'unit'} for extras</p>
                  </div>
                </div>
              </div>

              {/* Storage Location */}
              <div className="space-y-2">
                <Label htmlFor="edit_storage_location">Storage Location</Label>
                <Input
                  id="edit_storage_location"
                  value={editForm.storage_location}
                  onChange={(e) => setEditForm(prev => ({ ...prev, storage_location: e.target.value }))}
                  placeholder="e.g., REFRIGERATOR"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                          </Button>
                <Button type="submit" className="bg-[#a87437] hover:bg-[#a87437]/90 text-white">
                  Update
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#3f3532]">Bulk Import</h2>
              <Button variant="outline" size="sm" onClick={() => setShowBulkModal(false)} className="border-[#a87437]/30 text-[#a87437] hover:bg-[#a87437]/10">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <Label htmlFor="csvFile" className="text-[#3f3532]">CSV File</Label>
                <Input
                  id="csvFile"
                  name="csvFile"
                  type="file"
                  accept=".csv"
                  required
                  className="border-[#a87437]/30 focus:ring-[#a87437] focus:border-[#a87437]"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Upload a CSV file with columns: name, category, sku, description, actual_unit, actual_quantity, reorder_level, days_of_stock, cost_per_actual_unit, storage_location
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-[#a87437] hover:bg-[#906735] text-white">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowBulkModal(false)} className="flex-1 border-[#a87437]/30 text-[#a87437] hover:bg-[#a87437]/10">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedInventory;