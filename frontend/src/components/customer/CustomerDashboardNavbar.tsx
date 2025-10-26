import { useState, useEffect, useRef, useMemo } from 'react';
import { SidebarTrigger, useSidebar } from "../ui/sidebar";
import { Bell, X, Plus, Minus, ChevronRight } from "lucide-react";
import { useAuth } from "./AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from 'socket.io-client';
import { decodeId } from '../../utils/idObfuscator';

interface CustomerDashboardNavbarProps {
  customer_id?: number;
}

export default function CustomerDashboardNavbar({ customer_id }: CustomerDashboardNavbarProps) {
  const { user } = useAuth(); // Get user from auth context
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar(); // Get sidebar state
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [showCart, setShowCart] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [orderType, setOrderType] = useState('dine_in');
  const [tableNumber, setTableNumber] = useState('');
  const [processingOrder, setProcessingOrder] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);

  // Fetch customer's event requests
  const fetchCustomerEvents = async () => {
    if (!customer_id) {
      setLoading(false);
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const res = await fetch(`${API_URL}/api/events/customer/${customer_id}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        const pendingEvents = data.events.filter((event: any) => event.status === 'pending');
        const acceptedEvents = data.events.filter((event: any) => event.status === 'accepted');
        
        // Create notifications from events, but only show unread ones
        const eventNotifications = [
          ...pendingEvents
            .filter((event: any) => !readNotifications.has(`event-${event.id}-pending`))
            .map((event: any) => ({
            id: `event-${event.id}-pending`,
            type: 'event',
            status: 'pending',
            title: 'Event Request Pending',
            message: `Your event request for "${event.event_type}" is pending approval`,
            timestamp: event.created_at,
            eventId: event.id
          })),
          ...acceptedEvents
            .filter((event: any) => !readNotifications.has(`event-${event.id}-accepted`))
            .map((event: any) => ({
            id: `event-${event.id}-accepted`,
            type: 'event',
            status: 'accepted',
            title: 'Event Request Accepted!',
              message: `Your event request for "${event.event_type}" has been accepted! You will be contacted for further details.`,
            timestamp: event.created_at,
            eventId: event.id
          }))
        ];
        
        setNotifications(eventNotifications);
      }
    } catch (err) {
      console.error('Failed to fetch customer events:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load read notifications from localStorage on mount
  useEffect(() => {
    const savedReadNotifications = localStorage.getItem('customerReadNotifications');
    if (savedReadNotifications) {
      try {
        const parsed = JSON.parse(savedReadNotifications);
        setReadNotifications(new Set(parsed));
      } catch (error) {
        console.error('Failed to parse saved read notifications:', error);
      }
    }
  }, []);

  // Fetch customer events on mount
  useEffect(() => {
    fetchCustomerEvents();
  }, [customer_id]);

  // Handle notification click
  const handleNotificationClick = (notification: any) => {
    // Mark as read if not already read
    if (!readNotifications.has(notification.id)) {
      const newReadNotifications = new Set([...readNotifications, notification.id]);
      setReadNotifications(newReadNotifications);
      
      // Save to localStorage
      localStorage.setItem('customerReadNotifications', JSON.stringify([...newReadNotifications]));
    }
    
    // Close dropdown
    setShowNotifications(false);
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    const allNotificationIds = notifications.map(notif => notif.id);
    const newReadNotifications = new Set([...readNotifications, ...allNotificationIds]);
    setReadNotifications(newReadNotifications);
    
    // Save to localStorage
    localStorage.setItem('customerReadNotifications', JSON.stringify([...newReadNotifications]));
  };

  // Delete all notifications
  const deleteAllNotifications = () => {
    setNotifications([]);
    setReadNotifications(new Set());
    localStorage.removeItem('customerReadNotifications');
  };

  // Fetch event counts on component mount and setup WebSocket
  useEffect(() => {
    // Initialize Socket.IO connection with limited reconnection attempts
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const newSocket = io(API_URL, {
      // Prefer polling first to avoid early WS-close errors, then upgrade
      transports: ['polling', 'websocket'],
      path: '/socket.io',
      withCredentials: true,
      timeout: 30000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1500
    });

    // Join customer room for real-time updates
    const joinRoom = () => newSocket.emit('join-customer-room', { customerEmail: user?.email });
    newSocket.on('connect', joinRoom);
    newSocket.io.on('reconnect', joinRoom);

    newSocket.on('connect_error', (err) => {
      console.warn('Customer navbar socket connect_error:', err?.message || err);
    });

    // Listen for real-time updates
    newSocket.on('event-updated', (data) => {
      console.log('Event updated in CustomerDashboardNavbar:', data);
      fetchCustomerEvents();
    });

    fetchCustomerEvents();

    return () => {
      newSocket.close();
    };
  }, [customer_id, user?.email]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle notifications dropdown
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };



  // Cart management functions
  const loadCartFromStorage = () => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const cart = JSON.parse(savedCart);
        // Ensure all cart items have proper structure with default values
        const normalizedCart = cart.map((item: any) => ({
          ...item,
          customizations: item.customizations || [],
          notes: item.notes || '',
          price: item.price || 0,
          quantity: item.quantity || 1
        }));
        setCartItems(normalizedCart);
        setCartItemCount(normalizedCart.reduce((total: number, item: any) => total + item.quantity, 0));
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
    }
  };

  const updateCartItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeCartItem(itemId);
      return;
    }
    
    const updatedCart = cartItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedCart);
    setCartItemCount(updatedCart.reduce((total, item) => total + item.quantity, 0));
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const removeCartItem = (itemId: string) => {
    const updatedCart = cartItems.filter(item => item.id !== itemId);
    setCartItems(updatedCart);
    setCartItemCount(updatedCart.reduce((total, item) => total + item.quantity, 0));
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };


  const clearCart = () => {
    setCartItems([]);
    setCartItemCount(0);
    localStorage.setItem('cart', JSON.stringify([]));
  };

  const processOrder = async () => {
    if (cartItems.length === 0) return;
    
    setProcessingOrder(true);
    try {
      // Check if user is authenticated
      if (!user || !user.email) {
        alert('Please log in to place an order.');
        return;
      }

      // Get table number from URL parameter or form input
      const urlParams = new URLSearchParams(window.location.search);
      const tableFromUrl = urlParams.get('table');
      const finalTableNumber = tableFromUrl ? parseInt(tableFromUrl) : (tableNumber ? parseInt(tableNumber) : null);

      // Prepare order data (exactly like the working cart implementation)
      const orderData = {
        customerId: user.id, // Use user.id from auth context
        customerName: user.name || 'Customer',
        customerEmail: user.email,
        items: cartItems.map(item => ({
          menuItemId: parseInt(item.id), // Changed to match backend expectation
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || '',
          customizations: Array.isArray(item.customizations) ? item.customizations : [] // Double-check it's an array
        })),
        totalAmount: getCartTotal(),
        paymentMethod: paymentMethod,
        orderType: orderType,
        notes: cartItems.map(item => item.notes).filter(Boolean).join(', '),
        tableNumber: finalTableNumber // Get table number from URL or form input
      };

      console.log('Sending order data:', orderData); // Debug log
      console.log('Cart items structure:', cartItems); // Debug cart items
      console.log('User info:', user); // Debug user info

      // Call checkout API (exactly like the working cart implementation)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/customer/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies for authentication
        body: JSON.stringify(orderData),
      });

      console.log('Response status:', response.status); // Debug log

      const result = await response.json();

      if (result.success) {
        // Clear cart and close modal (exactly like the working cart implementation)
        clearCart();
        setShowCart(false);
        
        // Show success message
        alert(`Order placed successfully! Order ID: ${result.orderId}`);
        
        // Redirect to orders page without full reload
        navigate('/customer/orders');
      } else {
        alert(`Failed to place order: ${result.message}`);
      }
    } catch (error) {
      console.error('Error processing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setProcessingOrder(false);
    }
  };

  // Load cart on mount and listen for storage changes
  useEffect(() => {
    loadCartFromStorage();
    
    // Auto-detect table number from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const obfuscatedTable = urlParams.get('table');
    if (obfuscatedTable) {
      // Try to decode the obfuscated table ID
      try {
        const decodedTable = decodeId(obfuscatedTable);
        if (decodedTable) {
          setTableNumber(decodedTable);
          console.log('Decoded table number:', decodedTable);
        } else {
          console.warn('Invalid obfuscated table ID:', obfuscatedTable);
        }
      } catch (error) {
        console.warn('Error decoding table ID:', error);
        // Fallback: if it's already a simple number, use it directly
        if (/^\d+$/.test(obfuscatedTable)) {
          setTableNumber(obfuscatedTable);
        }
      }
    }
    
    const handleStorageChange = () => {
      loadCartFromStorage();
    };
    
    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom cart update events (from same tab)
    const handleCartUpdate = () => {
      loadCartFromStorage();
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  const totalNotifications = notifications.length;
  const unreadNotifications = useMemo(() => {
    return notifications.filter((notification) => !readNotifications.has(notification.id)).length;
  }, [notifications, readNotifications]);

  // Generate breadcrumbs based on current location
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: Array<{ name: string; path: string; icon?: any }> = [
      { name: 'Customer', path: '/customer' }
    ];

    // Map path segments to readable names
    const pathMap: { [key: string]: string } = {
      'customer': 'Customer',
      'dashboard': 'Dashboard',
      'menu': 'Menu',
      'orders': 'Orders',
      'events': 'Events',
      'loyalty': 'Loyalty Points',
      'feedback': 'Feedback',
      'settings': 'Settings'
    };

    // Build breadcrumb trail
    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const name = pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Don't add the root customer portal again
      if (segment !== 'customer') {
        breadcrumbs.push({
          name,
          path: currentPath
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <>
    <nav className={`fixed top-0 right-0 bg-[#a87437] border-b shadow-lg px-2 sm:px-4 lg:px-6 py-2 flex items-center z-50 transition-all duration-200 ${state === 'collapsed' ? 'sm:left-[4.5rem]' : 'sm:left-64'} left-0 w-full sm:w-auto navbar-full-width-tablet`}>
      <div className="mr-2 sm:mr-3 flex-shrink-0">
        <SidebarTrigger className="text-white" />
      </div>
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-1 min-w-0">
        <span className="great-vibes text-base sm:text-lg lg:text-xl xl:text-2xl tracking-tight text-white truncate">Customer Portal</span>
        {/* Dynamic Breadcrumbs - Hidden on mobile, shown on larger screens */}
        <nav aria-label="Breadcrumb" className="hidden md:block ml-1 lg:ml-4">
          <ol className="flex items-center space-x-1 text-xs lg:text-sm text-white/80">
            {breadcrumbs.map((breadcrumb, index) => (
              <li key={breadcrumb.path} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="h-4 w-4 mx-1 text-white/60" />
                )}
                {index === breadcrumbs.length - 1 ? (
                  // Current page - not clickable
                  <span className="text-white font-semibold">
                    {breadcrumb.name}
                  </span>
                ) : (
                  // Previous pages - clickable
                  <button
                    onClick={() => navigate(breadcrumb.path)}
                    className="text-white/80 hover:text-white transition-colors duration-200"
                  >
                    {breadcrumb.name}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:gap-4 flex-shrink-0">
        {/* Main Notifications Bell - Clickable with Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={toggleNotifications}
            className="relative p-2 hover:bg-white/20 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 cursor-pointer"
            title="Click to view all notifications"
          >
            <Bell className="h-6 w-6 text-white" />
            {!loading && unreadNotifications > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{unreadNotifications} unread</span>
                    {notifications.length > 0 && (
                      <div className="flex gap-1">
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Mark all read
                        </button>
                        <span className="text-xs text-gray-300">|</span>
                        <button
                          onClick={deleteAllNotifications}
                          className="text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete all
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500">No notifications</p>
                    <p className="text-xs text-gray-400">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification, index) => {
                    const isRead = readNotifications.has(notification.id);
                    return (
                      <div 
                        key={index}
                        onClick={() => handleNotificationClick(notification)}
                        className={`px-4 py-3 hover:bg-gray-50 border-l-4 cursor-pointer transition-colors ${
                          notification.status === 'pending' ? 'border-l-yellow-500' : 'border-l-green-500'
                        } ${index !== notifications.length - 1 ? 'border-b border-gray-100' : ''} ${
                          isRead ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            notification.status === 'pending' ? 'bg-yellow-500' : 'bg-green-500'
                          } ${isRead ? 'opacity-50' : ''}`}></div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                              {notification.title}
                            </p>
                            <p className={`text-sm mt-1 ${isRead ? 'text-gray-500' : 'text-gray-600'}`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(notification.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                          {!isRead && (
                            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {/* Removed footer link to 'View All Notifications' per request */}
            </div>
          )}
          
          <span className="sr-only">Total notifications: {totalNotifications}</span>
        </div>

        {/* Shopping Cart - Accessible from all sections */}
        <div className="relative">
          <button 
            onClick={() => setShowCart(!showCart)}
            className="relative h-6 w-6 text-white flex items-center justify-center hover:text-orange-300 transition-colors duration-200 cursor-pointer"
            title="View your cart"
          >
            <img src="/images/shopping-cart.png" alt="Cart" className="h-5 w-5 object-contain invert" />
            {/* Cart item count badge */}
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {cartItemCount > 99 ? '99+' : cartItemCount}
            </span>
          )}
          </button>
          <span className="sr-only">Shopping Cart ({cartItemCount} items)</span>
        </div>
      </div>
    </nav>

    {/* Cart Modal */}
    {showCart && (
      <div className="fixed inset-0 backdrop-blur-sm bg-white/30 z-50 flex items-center justify-center">
        <div ref={cartRef} className="bg-white rounded-2xl shadow-xl border-2 border-[#a87437] w-[500px] max-h-[90vh] overflow-hidden hover:shadow-2xl transition-shadow duration-300 flex flex-col">
          {/* Cart Header */}
          <div className="px-6 py-4 border-b-2 border-[#a87437]/30 bg-[#a87437]/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-[#a87437]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
            </svg>
              <span className="text-xl font-bold text-[#6B5B5B]">Cart ({cartItemCount})</span>
            </div>
            <button
              onClick={() => setShowCart(false)}
              className="p-2 hover:bg-[#a87437]/10 rounded-full transition-colors"
              title="Close cart"
              aria-label="Close cart"
            >
              <X className="h-5 w-5 text-[#6B5B5B]" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-[#6B5B5B] text-lg">Your cart is empty</p>
                <p className="text-gray-500 text-sm mt-1">Add some delicious items to get started!</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white border-2 border-[#a87437] rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#6B5B5B] text-lg">{item.name}</h4>
                      <p className="text-[#a87437] font-medium">₱{item.price}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <button
                        onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                        className="p-2 hover:bg-[#a87437]/10 rounded-full transition-colors border-2 border-[#a87437]/30"
                        title="Decrease quantity"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4 text-[#6B5B5B]" />
                      </button>
                      <span className="text-lg font-bold text-[#6B5B5B] w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                        className="p-2 hover:bg-[#a87437]/10 rounded-full transition-colors border-2 border-[#a87437]/30"
                        title="Increase quantity"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4 text-[#6B5B5B]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment and Checkout Section */}
          {cartItems.length > 0 && (
            <div className="px-6 py-4 border-t-2 border-[#a87437]/30 bg-[#a87437]/5 space-y-4 flex-shrink-0">
              {/* Payment Method Selection */}
              <div>
                <label className="block text-lg font-semibold text-[#6B5B5B] mb-3">Payment Method</label>
                <div className="flex gap-3">
                  {['cash', 'gcash', 'paymaya'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`px-4 py-3 text-sm font-semibold rounded-xl border-2 transition-colors ${
                        paymentMethod === method
                          ? 'bg-[#a87437] text-white border-[#a87437] shadow-md'
                          : 'bg-white text-[#6B5B5B] border-[#a87437]/30 hover:bg-[#a87437]/5 hover:border-[#a87437]/50'
                      }`}
                    >
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Number Field - Only for Dine In */}
              {orderType === 'dine_in' && (
                <div>
                  <label className="block text-sm font-medium text-[#6B5B5B] mb-2">
                    Table Number {tableNumber ? '(Auto-detected)' : ''}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder={tableNumber ? `Table ${tableNumber} detected` : "Enter table number (1-6)"}
                    readOnly={!!tableNumber}
                    className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-colors ${
                      tableNumber 
                        ? 'border-green-300 bg-green-50 text-green-800 cursor-not-allowed' 
                        : 'border-[#a87437]/30 focus:outline-none focus:ring-2 focus:ring-[#a87437]/50 focus:border-[#a87437]'
                    }`}
                  />
                </div>
              )}

              {/* Order Type Selection */}
              <div>
                <label className="block text-lg font-semibold text-[#6B5B5B] mb-3">Order Type</label>
                <div className="space-y-2">
                  {['dine_in', 'takeout'].map((type) => (
                    <label key={type} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="orderType"
                        value={type}
                        checked={orderType === type}
                        onChange={(e) => setOrderType(e.target.value)}
                        className="w-4 h-4 text-[#a87437] border-2 border-[#a87437]/30 focus:ring-[#a87437]/50"
                      />
                      <span className="text-sm font-medium text-[#6B5B5B]">
                        {type === 'dine_in' ? 'Dine In' : 'Takeout'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t-2 border-[#a87437]/30 pt-4">
                <h3 className="font-semibold text-lg mb-3 text-[#6B5B5B]">Order Summary</h3>
                <div className="space-y-2 mb-3">
                  {cartItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span className="text-[#a87437]">₱{getCartTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t-2 border-[#a87437]/30">
                <button
                  onClick={clearCart}
                  className="flex-1 px-6 py-3 text-sm font-semibold text-[#6B5B5B] bg-white border-2 border-[#a87437]/30 rounded-xl hover:bg-[#a87437]/5 hover:border-[#a87437]/50 transition-colors"
                >
                  Clear Cart
                </button>
                <button
                  onClick={processOrder}
                  disabled={processingOrder}
                  className="flex-1 px-8 py-3 text-sm font-semibold bg-[#a87437] text-white rounded-xl hover:bg-[#8f652f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  {processingOrder ? 'Processing...' : 'Checkout'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
} 