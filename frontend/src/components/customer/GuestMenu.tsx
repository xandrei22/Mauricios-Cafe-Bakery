 import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ShoppingCart, User, ArrowLeft, Search } from 'lucide-react';
import { CustomerNavbar } from '../ui/CustomerNavbar';
import GuestOrderForm from './GuestOrderForm';
import MenuModal from './MenuModal';
import UnifiedCustomizeModal from './UnifiedCustomizeModal';
import { decodeId } from '../../utils/idObfuscator';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  base_price: string; // Comes as string from API
  category: string;
  image_url: string;
  is_available: boolean;
  allow_customization?: boolean;
  customizations?: any[];
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  customPrice?: number;
  quantity: number;
  notes: string;
  customizations: any[];
}

const GuestMenu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showGuestOrderForm, setShowGuestOrderForm] = useState(false);
  const [isCartMinimized, setIsCartMinimized] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [customizationModal, setCustomizationModal] = useState<{isOpen: boolean, item: MenuItem | null}>({
    isOpen: false,
    item: null
  });
  const navigate = useNavigate();

  const categories = ['All', 'Coffee', 'Tea', 'Pastries', 'Sandwiches', 'Salads', 'Beverages'];

  useEffect(() => {
    fetchMenu();
    // Detect table number from URL parameters when arriving via QR code
    const urlParams = new URLSearchParams(window.location.search);
    const obfuscatedTable = urlParams.get('table');
    if (obfuscatedTable) {
      // Decode the obfuscated table ID
      const decodedTable = decodeId(obfuscatedTable);
      if (decodedTable) {
        setTableNumber(decodedTable);
        console.log('Decoded table number:', decodedTable);
      } else {
        console.warn('Invalid obfuscated table ID:', obfuscatedTable);
      }
    }
  }, []);

  const fetchMenu = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/guest/menu`);
      const data = await response.json();

      if (data.success) {
        // Process menu items similar to customer menu
        const processedMenuItems = data.menu_items.map((item: any) => ({
          ...item,
          price: parseFloat(item.base_price || item.price) || 0,
          description: item.description || '',
          image_url: item.image_url || null,
          allow_customization: item.allow_customization === 1 || item.allow_customization === true // Only true if explicitly 1 or true
        }));
        setMenuItems(processedMenuItems);
      } else {
        setError('Failed to load menu');
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      setError('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    const cartItem: CartItem = {
      id: item.id.toString(),
      name: item.name,
      price: parseFloat(item.base_price),
      quantity: 1,
      notes: '',
      customizations: []
    };

    setCartItems(prev => {
      const existingItem = prev.find(cartItem => cartItem.id === item.id.toString());
      if (existingItem) {
        return prev.map(cartItem =>
          cartItem.id === item.id.toString()
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        return [...prev, cartItem];
      }
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      setCartItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    }
  };


  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const itemTotal = (item.customPrice || item.price) * item.quantity;
      return total + itemTotal;
    }, 0);
  };

  const getCartItemCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleSearch = () => {
    // Force a re-render to ensure search results are displayed
    console.log('Searching for:', searchQuery);
    // The search is already handled by the filteredItems logic
    // This just ensures the component re-renders with current search query
    setSearchQuery(searchQuery);
  };

  const filteredItems = (selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory))
    .filter(item => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // First sort by category alphabetically
      const categoryComparison = a.category.localeCompare(b.category);
      if (categoryComparison !== 0) {
        return categoryComparison;
      }
      // Then sort by name alphabetically within each category
      return a.name.localeCompare(b.name);
    });

  const handleOrderPlaced = () => {
    // Order form will handle navigation to success page
    setShowGuestOrderForm(false);
    clearCart();
  };

  const navigateWithoutTable = (path: string) => {
    // Navigate to path without table parameter
    navigate(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a87437] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-12">
      <CustomerNavbar />
      
      <div className="max-w-7xl mx-auto px-4 py-6 pt-20">

        {/* Main Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title Section */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold text-black mb-2">Guest Menu</h1>
              <p className="text-lg text-black">Explore our delicious selection of coffee and beverages</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex gap-2">
                {/* Track order accessible from menu */}
                <Button
                  variant="outline"
                  onClick={() => navigate(`/guest/order-tracking${tableNumber ? `?table=${tableNumber}` : ''}`)}
                  className="border-[#a87437] text-[#a87437] hover:bg-[#a87437] hover:text-white"
                >
                  Track Your Order
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Info Banners */}
        <div className="space-y-3 mb-6">
          {/* Table Detection Banner */}
          {tableNumber && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🍽️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-green-800 text-sm">Table {tableNumber} Detected</h3>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-green-700 text-xs mt-0.5">
                    Table number will be included in your order
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Guest Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-blue-800 text-sm">Guest Ordering</h3>
                  <button 
                    onClick={() => navigate('/customer-login')}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium underline hover:no-underline transition-colors"
                  >
                    Sign in for better experience
                  </button>
                </div>
                <p className="text-blue-700 text-xs mt-0.5">
                  No loyalty points or order history available
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Category Filter */}
        <div className="mb-8 mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 mb-6">
            {/* Search input - moved to right */}
            <div className="w-full sm:w-80 relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu items..."
                className="w-full pr-10 bg-white border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437]"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 flex items-center justify-center hover:bg-[#a87437]/10 rounded-md transition-colors"
                aria-label="Search menu items"
              >
                <Search className="h-4 w-4 text-[#a87437]" />
              </button>
            </div>
            
            {/* Category Dropdown */}
            <div className="w-full sm:w-64">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437] pr-8">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        {error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md mx-auto">
              <p className="text-red-600 text-lg mb-4">{error}</p>
              <Button 
                onClick={fetchMenu} 
                className="bg-[#a87437] hover:bg-[#8f652f] text-white"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {selectedCategory !== 'All' && (
              <h2 className="text-2xl font-bold text-[#6B5B5B]">
                {selectedCategory} 
                <span className="text-lg font-normal text-gray-600 ml-2">({filteredItems.length} items)</span>
              </h2>
            )}
            {selectedCategory === 'All' ? (
              // Category-grouped view for "All" items
              <div className="space-y-8">
                {(() => {
                  // Group items by category
                  const groupedItems = filteredItems.reduce((groups, item) => {
                    const category = item.category;
                    if (!groups[category]) {
                      groups[category] = [];
                    }
                    groups[category].push(item);
                    return groups;
                  }, {} as Record<string, typeof filteredItems>);

                  // Sort categories alphabetically
                  const sortedCategories = Object.keys(groupedItems).sort();

                  return sortedCategories.map((category) => (
                    <div key={category} className="space-y-4">
                      {/* Category Header */}
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-[#a87437]">{category}</h3>
                        <div className="h-px bg-[#a87437]/30"></div>
                      </div>
                      
                      {/* Items Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {groupedItems[category].map(item => (
                          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white h-[480px] flex flex-col">
                            {/* Image Section - With padding and full image visibility */}
                            <div className="relative h-40 flex-shrink-0 p-3">
                              {item.image_url && 
                               item.image_url !== '' && 
                               item.image_url !== 'null' && 
                               item.image_url !== 'undefined' &&
                               item.image_url !== 'NULL' &&
                               item.image_url.trim() !== '' ? (
                                <div className="w-full h-full overflow-hidden">
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                                    loading="lazy"
                                    onError={(e) => {
                                      console.log('Image failed to load:', item.image_url);
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const fallback = target.parentElement?.nextElementSibling as HTMLElement;
                                      if (fallback) {
                                        fallback.classList.remove('hidden');
                                      }
                                    }}
                                    onLoad={(e) => {
                                      console.log('Image loaded successfully:', item.image_url);
                                      const target = e.target as HTMLImageElement;
                                      const fallback = target.parentElement?.nextElementSibling as HTMLElement;
                                      if (fallback) {
                                        fallback.classList.add('hidden');
                                      }
                                    }}
                                  />
                                </div>
                              ) : null}
                              <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg ${item.image_url && 
                               item.image_url !== '' && 
                               item.image_url !== 'null' && 
                               item.image_url !== 'undefined' &&
                               item.image_url !== 'NULL' &&
                               item.image_url.trim() !== '' ? 'hidden' : ''}`}>
                                <div className="text-center">
                                  <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm border-2 border-gray-200">
                                    <span className="text-2xl">🍽️</span>
                                  </div>
                                  <p className="text-sm text-gray-600 font-medium">No Image Available</p>
                                </div>
                              </div>
                            </div>
                            
                            
                            {/* Content Section - Optimized for Text */}
                            <CardContent className="p-3 flex flex-col flex-1">
                              {/* Item Name - More space, better truncation */}
                              <h3 className="font-bold text-sm text-[#6B5B5B] mb-2 leading-tight line-clamp-2 min-h-[2.25rem]">{item.name}</h3>
                              
                              {/* Description - More space for better readability */}
                              <div className="mb-3 flex-1">
                                <p className="text-gray-600 text-xs leading-relaxed line-clamp-3 min-h-[3.2rem]">{item.description}</p>
                              </div>
                              
                              {/* Price */}
                              <div className="mb-3">
                                <span className="text-lg font-bold text-[#a87437]">₱{parseFloat(item.base_price).toFixed(2)}</span>
                              </div>
                              
                              {/* Buttons - Fixed at bottom with proper spacing */}
                              <div className="flex flex-col gap-2 mt-auto pt-2">
                                {/* Customize Button - Only show if item allows customization */}
                                {item.allow_customization && (
                                  <Button
                                    onClick={() => setCustomizationModal({ isOpen: true, item: item })}
                                    disabled={!item.is_available}
                                    size="sm"
                                    variant="outline"
                                    className={`w-full text-xs py-2 px-3 rounded-full font-medium transition-all duration-200 border-[#a87437] text-[#a87437] hover:bg-[#a87437] hover:text-white ${
                                      !item.is_available ? "opacity-50 cursor-not-allowed" : ""
                                    }`}
                                  >
                                    Customize
                                  </Button>
                                )}
                                
                                {/* Add to Cart Button */}
                                <Button
                                  onClick={() => addToCart(item)}
                                  disabled={!item.is_available}
                                  size="sm"
                                  className={`w-full text-xs py-2 px-3 rounded-full font-medium transition-all duration-200 ${
                                    item.is_available
                                      ? "bg-[#a87437] hover:bg-[#8f652f] text-white shadow-sm hover:shadow-md"
                                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                  }`}
                                >
                                  {item.is_available ? "Add to Cart" : "Unavailable"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              // Single category view
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredItems.map(item => (
                  <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white h-[480px] flex flex-col">
                  {/* Image Section - With padding and full image visibility */}
                  <div className="relative h-40 bg-gray-50 flex-shrink-0 p-3">
                    {item.image_url && 
                     item.image_url !== '' && 
                     item.image_url !== 'null' && 
                     item.image_url !== 'undefined' &&
                     item.image_url !== 'NULL' &&
                     item.image_url.trim() !== '' ? (
                      <div className="w-full h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            console.log('Image failed to load:', item.image_url);
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.parentElement?.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.classList.remove('hidden');
                            }
                          }}
                          onLoad={(e) => {
                            console.log('Image loaded successfully:', item.image_url);
                            const target = e.target as HTMLImageElement;
                            const fallback = target.parentElement?.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.classList.add('hidden');
                            }
                          }}
                        />
                      </div>
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg ${item.image_url && 
                     item.image_url !== '' && 
                     item.image_url !== 'null' && 
                     item.image_url !== 'undefined' &&
                     item.image_url !== 'NULL' &&
                     item.image_url.trim() !== '' ? 'hidden' : ''}`}>
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-3 bg-white rounded-full flex items-center justify-center shadow-sm border-2 border-gray-200">
                          <span className="text-2xl">🍽️</span>
                        </div>
                        <p className="text-sm text-gray-600 font-medium">No Image Available</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Badge positioned outside image container */}
                  <div className="absolute top-2 right-2 z-10">
                    <Badge 
                      variant={item.is_available ? "default" : "secondary"}
                      className={`text-xs px-2 py-1 ${
                        item.is_available 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {item.is_available ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                  
                  {/* Content Section - Optimized for Text */}
                  <CardContent className="p-3 flex flex-col flex-1">
                    {/* Item Name - More space, better truncation */}
                    <h3 className="font-bold text-sm text-[#6B5B5B] mb-2 leading-tight line-clamp-2 min-h-[2.25rem]">{item.name}</h3>
                    
                    {/* Description - More space for better readability */}
                    <div className="mb-3 flex-1">
                      <p className="text-gray-600 text-xs leading-relaxed line-clamp-3 min-h-[3.2rem]">{item.description}</p>
                    </div>
                    
                    {/* Price */}
                    <div className="mb-3">
                      <span className="text-lg font-bold text-[#a87437]">₱{Number(item.base_price || 0).toFixed(2)}</span>
                    </div>
                    
                    {/* Buttons - Fixed at bottom with proper spacing */}
                    <div className="flex flex-col gap-2 mt-auto pt-2">
                      {/* Customize Button - Only show if item allows customization */}
                      {item.allow_customization && (
                        <Button
                          onClick={() => setCustomizationModal({ isOpen: true, item: item })}
                          disabled={!item.is_available}
                          size="sm"
                          variant="outline"
                          className={`w-full text-xs py-2 px-3 rounded-full font-medium transition-all duration-200 border-[#a87437] text-[#a87437] hover:bg-[#a87437] hover:text-white ${
                            !item.is_available ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          Customize
                        </Button>
                      )}
                      
                      {/* Add to Cart Button */}
                      <Button
                        onClick={() => addToCart(item)}
                        disabled={!item.is_available}
                        size="sm"
                        className={`w-full text-xs py-2 px-3 rounded-full font-medium transition-all duration-200 ${
                          item.is_available
                            ? "bg-[#a87437] hover:bg-[#8f652f] text-white shadow-sm hover:shadow-md"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {item.is_available ? "Add to Cart" : "Unavailable"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}
          </div>
        )}

        {/* Cart Summary (Floating) */}
        {cartItems.length > 0 && !isCartMinimized && (
          <div className="fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl p-6 border-0 max-w-sm z-50">
            <div className="absolute -top-3 -right-3">
              <button
                type="button"
                onClick={() => setIsCartMinimized(true)}
                className="h-8 w-8 rounded-full bg-[#a87437] text-white shadow-md hover:bg-[#8f652f]"
                title="Minimize"
              >
                –
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5 text-[#a87437]" />
              <h3 className="font-bold text-lg text-[#6B5B5B]">Your Cart</h3>
              <span className="bg-[#a87437] text-white text-xs px-2 py-1 rounded-full font-medium">
                {getCartItemCount()} items
              </span>
            </div>
            
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[#6B5B5B] block truncate">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-xs text-gray-600">
                      ₱{((item.customPrice || item.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="h-7 w-7 p-0 rounded-full border-[#a87437] text-[#a87437] hover:bg-[#a87437] hover:text-white"
                    >
                      -
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="h-7 w-7 p-0 rounded-full border-[#a87437] text-[#a87437] hover:bg-[#a87437] hover:text-white"
                    >
                      +
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center font-bold text-lg mb-4">
                <span className="text-[#6B5B5B]">Total:</span>
                <span className="text-[#a87437]">₱{getCartTotal().toFixed(2)}</span>
              </div>
              <Button
                onClick={() => setShowGuestOrderForm(true)}
                className="w-full bg-[#a87437] hover:bg-[#8f652f] text-white py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        )}

        {/* Reopen pill when minimized */}
        {cartItems.length > 0 && isCartMinimized && (
          <button
            type="button"
            onClick={() => setIsCartMinimized(false)}
            className="fixed bottom-6 right-6 z-50 bg-[#a87437] hover:bg-[#8f652f] text-white px-4 py-3 rounded-full shadow-lg"
            title="Open cart"
          >
            Open Cart ({getCartItemCount()})
          </button>
        )}
      </div>

       {/* Guest Order Form Modal */}
       {showGuestOrderForm && (
         <GuestOrderForm
           cartItems={cartItems}
           onOrderPlaced={handleOrderPlaced}
           onClose={() => setShowGuestOrderForm(false)}
           tableNumber={tableNumber}
         />
       )}

      {/* Menu Modal */}
      {showMenuModal && (
        <MenuModal
          show={showMenuModal}
          onHide={() => setShowMenuModal(false)}
        />
      )}

      {/* Customization Modal */}
      {customizationModal.isOpen && customizationModal.item && (
        <UnifiedCustomizeModal
          item={{
            id: customizationModal.item.id,
            name: customizationModal.item.name,
            base_price: customizationModal.item.base_price,
            description: customizationModal.item.description,
            image_url: customizationModal.item.image_url,
            category: customizationModal.item.category
          }}
          onClose={() => setCustomizationModal({ isOpen: false, item: null })}
          onAdd={(customizedItem: any) => {
            const cartItem: CartItem = {
              id: customizedItem.id || customizationModal.item!.id.toString(),
              name: customizedItem.name || customizationModal.item!.name,
              price: parseFloat(customizationModal.item!.base_price),
              customPrice: customizedItem.price || parseFloat(customizationModal.item!.base_price),
              quantity: 1,
              notes: customizedItem.instructions || 'Customized',
              customizations: customizedItem.customizations || { customized: true }
            };
            
            setCartItems(prev => {
              const existingItem = prev.find(item => item.id === cartItem.id);
              if (existingItem) {
                return prev.map(item =>
                  item.id === cartItem.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                );
              } else {
                return [...prev, cartItem];
              }
            });
            setCustomizationModal({ isOpen: false, item: null });
          }}
        />
      )}
    </div>
  );
};

export default GuestMenu;
