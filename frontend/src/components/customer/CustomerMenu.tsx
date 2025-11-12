import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuItem from '../MenuItem';
import CustomerCartModal from './CustomerCartModal';
import UnifiedCustomizeModal from './UnifiedCustomizeModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { 
  Search, 
  Coffee, 
  RefreshCw,
  AlertCircle,
  MoreVertical
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from './AuthContext';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  is_available: boolean;
  allow_customization?: boolean;
}

const CustomerMenu: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, isCartModalOpen, closeCartModal, items: cartContextItems, updateQuantity, updateNotes, removeItem, clearCart } = useCart();
  const { user, loading } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [customizationModal, setCustomizationModal] = useState<{ isOpen: boolean; item: any | null }>({ isOpen: false, item: null });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  
  // Get table number from URL parameters
  const tableNumber = new URLSearchParams(window.location.search).get('table');

  // Try to open GCash/PayMaya app via deep links with fallbacks
  const openDigitalWalletApp = (method: 'gcash' | 'paymaya') => {
    const scheme = method === 'gcash' ? 'gcash://' : 'paymaya://';
    const androidPackage = method === 'gcash' ? 'com.globe.gcash.android' : 'com.paymaya';
    const playStore = method === 'gcash'
      ? 'https://play.google.com/store/apps/details?id=com.globe.gcash.android'
      : 'https://play.google.com/store/apps/details?id=com.paymaya';
    const appStore = method === 'gcash'
      ? 'https://apps.apple.com/app/gcash/id520020791'
      : 'https://apps.apple.com/app/paymaya/id991673877';

    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    const tryOpen = (url: string) => {
      window.location.href = url;
    };

    if (isAndroid) {
      tryOpen(scheme);
      setTimeout(() => {
        if (!document.hidden) {
          tryOpen(`intent://open#Intent;scheme=${scheme.replace('://','')};package=${androidPackage};end`);
        }
      }, 800);
      setTimeout(() => {
        if (!document.hidden) window.open(playStore, '_blank');
      }, 1600);
    } else if (isIOS) {
      tryOpen(scheme);
      setTimeout(() => {
        if (!document.hidden) window.open(appStore, '_blank');
      }, 1200);
    } else {
      window.open(method === 'gcash' ? 'https://www.gcash.com/' : 'https://www.paymaya.com/', '_blank');
    }
  };

  // Post-order wallet prompt (to satisfy browser user-gesture requirements)
  const [walletPrompt, setWalletPrompt] = useState<{isOpen: boolean; method: 'gcash' | 'paymaya' | null; orderId: string; amount: number}>({
    isOpen: false,
    method: null,
    orderId: '',
    amount: 0
  });


  // Fetch menu data via AJAX
  const fetchMenuData = async () => {
    try {
      setMenuLoading(true);
      setError(null);
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/guest/menu`, {
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch menu data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Map the data to ensure price is a number
        const processedMenuItems = data.menu_items.map((item: any) => ({
          ...item,
          price: parseFloat(item.base_price || item.price) || 0,
          description: item.description || '',
          image_url: item.image_url || null,
          allow_customization: item.allow_customization === 1 || item.allow_customization === true // Only true if explicitly 1 or true
        }));
        
        setMenuItems(processedMenuItems);
        setFilteredItems(processedMenuItems);
        
        // Extract unique categories
        const uniqueCategories = processedMenuItems
          .map((item: MenuItem) => item.category)
          .filter(Boolean) as string[];
        setCategories([...new Set(uniqueCategories)]);
      } else {
        throw new Error(data.error || 'Failed to load menu');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setMenuLoading(false);
    }
  };

  // Fetch categories separately
  const fetchCategories = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/menu/categories`, {
        credentials: 'omit'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCategories(data.categories || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Initial data fetch and WebSocket setup
  useEffect(() => {
    // Initialize Socket.IO connection (use backend API_URL, include cookies, limit retries)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const newSocket = io(API_URL, {
      transports: ['polling', 'websocket'],
      path: '/socket.io',
      withCredentials: false,
      timeout: 30000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    setSocket(newSocket);

    // Join customer room for real-time updates
    const joinRoom = () => newSocket.emit('join-customer-room', { customerEmail: user?.email });
    joinRoom();
    newSocket.on('connect', joinRoom);
    newSocket.io.on('reconnect', joinRoom);
    newSocket.on('connect_error', () => {
      // Stop aggressive reconnect spam after a few failed attempts
      if ((newSocket as any).io && (newSocket as any).io.attempts > 5) {
        (newSocket as any).io.reconnection(false);
      }
    });

    // Listen for real-time updates
    newSocket.on('menu-updated', (data) => {
      console.log('Menu updated in CustomerMenu:', data);
      fetchMenuData();
    });

    newSocket.on('inventory-updated', (data) => {
      console.log('Inventory updated in CustomerMenu:', data);
      fetchMenuData();
    });

    fetchMenuData();
    fetchCategories();

    return () => {
      newSocket.close();
    };
  }, [user?.email]); // Already correct - using user?.email

  // Filter and sort items when search/category/sort changes
  useEffect(() => {
    let filtered = [...menuItems];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    setFilteredItems(filtered);
  }, [menuItems, searchTerm, selectedCategory, sortBy]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle search button click
  const handleSearch = () => {
    // Force a re-render to ensure search results are displayed
    console.log('Searching for:', searchTerm);
    // The search is already handled by the useEffect with filteredItems logic
    // This just ensures the component re-renders with current search term
    setSearchTerm(searchTerm);
  };

  // Handle category selection
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
  };


  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSortBy('name');
  };


  // Handle add to cart
  const handleAddToCart = (item: any) => {
    // Block adding to cart when there is no valid table access
    if (!hasValidTableAccess) {
      console.warn('Blocked add to cart - no table access detected.');
      // Provide a simple UX notice; replace with your toast system if available
      try {
        // eslint-disable-next-line no-alert
        window.alert('To add items to cart, please scan the table QR to get access.');
      } catch (_) {
        /* no-op in non-browser environments */
      }
      return; // Stop here
    }

    if (item.customization) {
      setCustomizationModal({ isOpen: true, item: item });
    } else {
      addToCart({
        id: item.id.toString(),
        name: item.name,
        price: item.price,
        quantity: 1
      });
    }
  };

  // Show loading state while checking authentication or loading menu
  if (loading || (menuLoading && menuItems.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">
            {loading ? 'Checking authentication...' : 'Loading menu...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchMenuData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalItems = menuItems.length;
  const availableItems = menuItems.filter(item => item.is_available).length;
  const popularItems = menuItems.filter(item => item.is_available).length; // You can add popularity logic later
  const totalCategories = categories.length;

  // Get table number from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const tableFromUrl = urlParams.get('table');
  
  // Check if user has valid table access
  // Accept either simple numbers (1-6) or any non-empty table parameter (for QR codes)
  const hasValidTableAccess = Boolean(tableFromUrl && tableFromUrl.trim() !== '');

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-12">
      <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8 pt-4">
        {/* Header */}
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Menu</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Explore our delicious selection of coffee and beverages</p>
          </div>
          
          {/* Table Number Display */}
          {hasValidTableAccess && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-[#a87437] text-white rounded-lg shadow-md">
              <span className="text-sm font-medium">Table Access Active</span>
              <div className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          )}
          
          {/* Warning for users without table access */}
          {!hasValidTableAccess && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Table Access Required
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>To place an order, please scan the QR code on your table. You can still browse our menu, but ordering requires table access.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Search and Filters */}
      <div className="flex flex-row flex-wrap items-center gap-3 justify-end w-full">
        {/* Search Input - Full width on mobile, fixed width on larger screens */}
        <div className="relative w-full sm:w-96 md:w-[28rem]">
          <Input
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pr-12 h-12 text-lg border-2 border-[#a87437] rounded-xl focus:border-[#8f652f] focus:ring-2 focus:ring-[#a87437]/20 flex items-center py-3 px-3 w-full"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          <button
            type="button"
            onClick={handleSearch}
            aria-label="Search menu items"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 flex items-center justify-center hover:bg-[#a87437]/10 rounded-md transition-colors"
          >
            <Search className="h-4 w-4 text-[#a87437]" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex-shrink-0">
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-12 text-lg border border-gray-300 rounded-xl focus:border-gray-400 focus:ring-2 focus:ring-gray-200 pr-8 flex items-center py-3 px-3 w-auto min-w-fit">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Toggle */}
        <div className="relative flex-shrink-0" ref={moreMenuRef}>
          <Button
            variant="outline"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="h-12 w-12 border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
            
            {/* Dropdown Menu */}
            {showMoreMenu && (
              <div className="absolute right-0 top-13 z-50 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-8">
        <Card className="border-2 border-gray-300 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-gray-700 mb-2">{totalItems}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-300 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-gray-700 mb-2">{availableItems}</div>
            <div className="text-sm text-gray-600">Available Items</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-300 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-gray-700 mb-2">{popularItems}</div>
            <div className="text-sm text-gray-600">Popular</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-300 shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-gray-700 mb-2">{totalCategories}</div>
            <div className="text-sm text-gray-600">Categories</div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items by Category */}
      {filteredItems.length === 0 ? (
        <Card className="border-2 border-[#a87437] shadow-xl">
          <CardContent className="text-center py-16">
            <Coffee className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#6B5B5B] mb-2">No items found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search or filters
            </p>
            <Button 
              onClick={clearFilters} 
              variant="outline"
              className="border-2 border-[#a87437]/30 hover:bg-[#a87437]/5"
            >
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {(() => {
            // Group items by category
            const groupedItems = filteredItems.reduce((acc, item) => {
              const category = item.category || 'Other';
              if (!acc[category]) {
                acc[category] = [];
              }
              acc[category].push(item);
              return acc;
            }, {} as Record<string, MenuItem[]>);

            return Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="space-y-4">
                {/* Category Header */}
                <h2 className="text-2xl font-bold text-[#a87437] border-b-2 border-[#a87437]/30 pb-2">
                  {category}
                </h2>
                
                {/* Items Display - Grid or List View */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    {items.map((item) => (
                      <Card key={item.id} className="bg-white border shadow-lg hover:shadow-xl transition-shadow duration-300 h-[380px] flex flex-col border-l-2 border-r-2 border-[#a87437]/30">
                        <CardContent className="p-0 flex flex-col h-full">
                          {/* Image - With padding from card edges */}
                          <div className="h-32 w-3/4 mx-auto flex-shrink-0 flex items-center justify-center overflow-hidden p-2">
                            {item.image_url && item.image_url !== '' && item.image_url !== 'null' && item.image_url !== 'undefined' ? (
                              <div className="w-full h-full overflow-hidden">
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const fallback = target.parentElement?.nextElementSibling as HTMLElement;
                                    if (fallback) {
                                      fallback.classList.remove('hidden');
                                    }
                                  }}
                                />
                              </div>
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg ${item.image_url && item.image_url !== '' && item.image_url !== 'null' && item.image_url !== 'undefined' ? 'hidden' : ''}`}>
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm border-2 border-gray-200">
                                  <span className="text-2xl">🍽️</span>
                                </div>
                                <p className="text-sm text-gray-600 font-medium">No Image Available</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="p-3 flex-1 flex flex-col min-h-0">
                            <h3 className="text-base font-semibold text-[#3f3532] mb-1 line-clamp-2">
                              {item.name}
                            </h3>
                            {item.category && (
                              <p className="text-xs text-gray-500 mb-1">{item.category}</p>
                            )}
                            <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                              {item.description}
                            </p>
                            
                            {/* Price */}
                            <div className="mb-2">
                              <span className="text-lg font-bold text-[#a87437]">
                                ₱{Number(item.price || 0).toFixed(2)}
                              </span>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 mt-auto pt-1">
                              {item.allow_customization && (
                                <Button
                                  onClick={() => setCustomizationModal({ isOpen: true, item: item })}
                                  disabled={!hasValidTableAccess || item.is_available === false}
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs border-[#a87437] text-[#a87437] hover:bg-[#a87437] hover:text-white"
                                >
                                  Customize
                                </Button>
                              )}
                              <Button
                                onClick={() => handleAddToCart(item)}
                                disabled={!hasValidTableAccess || item.is_available === false}
                                size="sm"
                                className="w-full bg-[#a87437] hover:bg-[#8f652f] text-white text-xs"
                              >
                                Add to Cart
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <MenuItem
                        key={item.id}
                        item={item}
                        onAddToCart={handleAddToCart}
                        hasTableAccess={hasValidTableAccess}
                      />
                    ))}
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      )}


      {/* Cart Modal */}
      <CustomerCartModal 
        isOpen={isCartModalOpen}
        cart={cartContextItems.map(item => ({
          id: parseInt(item.id, 10),
          name: item.name,
          base_price: item.price,
          cartItemId: item.id,
          quantity: item.quantity,
          notes: item.notes,
          customizations: item.customizations,
          customPrice: item.customPrice
        }))}
        onClose={closeCartModal}
        onUpdateQuantity={updateQuantity}
        onUpdateNotes={(cartItemId, notes) => {
          updateNotes(cartItemId, notes);
        }}
        onRemove={removeItem}
        onClear={clearCart}
        hasTableAccess={!!tableNumber}
        onCheckout={async (paymentMethod, receiptFile) => {
          try {
            // Check if user is authenticated
            if (!user || !user.email) {
              // Redirect to login with table parameter preserved
              const urlParams = new URLSearchParams(window.location.search);
              const tableFromUrl = urlParams.get('table');
              const loginUrl = tableFromUrl ? `/customer-login?table=${tableFromUrl}` : '/customer-login';
              alert('Please log in to place an order.');
              navigate(loginUrl);
              return;
            }

            // Get table number from URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            const tableFromUrl = urlParams.get('table');
            const tableNumber = tableFromUrl ? parseInt(tableFromUrl) : null;

            // Prepare order data
              const notesList = cartContextItems.map(item => item.notes).filter(Boolean) as string[];
              const orderLevelNotes = notesList.length ? notesList[notesList.length - 1] : '';

              const orderData = {
              customerId: user.id, // Add customer ID for loyalty points and order tracking
              customerName: user.name || 'Customer',
              customerEmail: user.email,
              items: cartContextItems.map(item => ({
                menuItemId: parseInt(item.id), // Changed from 'id' to 'menuItemId' to match backend expectation
                name: item.name,
                quantity: item.quantity,
                price: item.customPrice || item.price,
                notes: item.notes,
                customizations: item.customizations
              })),
              totalAmount: cartContextItems.reduce((sum, item) => sum + (item.customPrice || item.price) * item.quantity, 0),
              paymentMethod: paymentMethod,
                notes: orderLevelNotes,
              tableNumber: tableNumber
            };

            // For digital payments, create order then deep-link to wallet app
            if (paymentMethod === 'gcash' || paymentMethod === 'paymaya') {
              console.log('Digital payment selected:', paymentMethod);

              let response;
              if (receiptFile) {
                // Use FormData for file upload
                const formData = new FormData();
                formData.append('orderData', JSON.stringify(orderData));
                formData.append('receipt', receiptFile);
                
                response = await fetch('/api/customer/checkout', {
                  method: 'POST',
                  credentials: 'omit',
                  body: formData,
                });
              } else {
                // Use JSON for orders without receipt
                response = await fetch('/api/customer/checkout', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'omit',
                  body: JSON.stringify(orderData),
                });
              }

              const result = await response.json();
              console.log('Order creation result:', result);

              if (result.success) {
                // Clear cart and close modal first
                clearCart();
                closeCartModal(); // Ensure modal is closed
                // Show explicit prompt with a button (user gesture) to open the app
                setWalletPrompt({
                  isOpen: true,
                  method: paymentMethod,
                  orderId: result.orderId,
                  amount: orderData.totalAmount
                });
              } else {
                alert(`Failed to place order: ${result.message}`);
              }
            } else {
              // For cash payments, proceed normally
              const response = await fetch('/api/customer/checkout', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'omit',
                body: JSON.stringify(orderData),
              });

              const result = await response.json();

              if (result.success) {
                clearCart();
                closeCartModal();
                // Show 5-character order code if available
                const displayOrderId = result.orderNumber || result.orderId;
                alert(`Order placed successfully! Order ID: ${displayOrderId}`);
                
                // Trigger a custom event to refresh orders data without page reload
                setTimeout(() => {
                  // Dispatch custom event to refresh orders data
                  window.dispatchEvent(new CustomEvent('orderPlaced', { 
                    detail: { orderId: result.orderId } 
                  }));
                }, 500);
              } else {
                alert(`Failed to place order: ${result.message}`);
              }
            }
          } catch (error) {
            console.error('Checkout error:', error);
            alert('Failed to place order. Please try again.');
          }
        }}
        user={user}
      />

      {/* Customization Modal */}
      {customizationModal.isOpen && customizationModal.item && (
        <UnifiedCustomizeModal
          item={customizationModal.item}
          onClose={() => setCustomizationModal({ isOpen: false, item: null })}
          onAdd={(customizedItem: any) => {
            addToCart({
              id: customizedItem.id || customizationModal.item.id.toString(),
              name: customizedItem.name || customizationModal.item.name,
              price: customizedItem.price || customizedItem.price,
              quantity: 1,
              notes: customizedItem.instructions || 'Customized',
              customizations: customizedItem.customizations || { customized: true }
            });
            setCustomizationModal({ isOpen: false, item: null });
          }}
        />
      )}

      {(() => {
        const activeWalletMethod = walletPrompt.method;
        if (!walletPrompt.isOpen || !activeWalletMethod) {
          return null;
        }
        const methodLabel = activeWalletMethod.toUpperCase();
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Open {methodLabel}</h3>
            <p className="text-sm text-gray-700 mb-4">
              Order ID: {walletPrompt.orderId}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Tap the button below to open the {methodLabel} app and complete your payment.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => openDigitalWalletApp(activeWalletMethod)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Open {methodLabel}
              </button>
              <button
                onClick={() => setWalletPrompt({ isOpen: false, method: null, orderId: '', amount: 0 })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default CustomerMenu;
