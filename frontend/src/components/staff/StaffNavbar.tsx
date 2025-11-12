import React, { useState, useEffect, useRef } from 'react';
import { SidebarTrigger, useSidebar } from "../ui/sidebar";
import { Bell, ChevronRight } from "lucide-react";
import { useLocation } from 'react-router-dom';
import NotificationSystem from '../admin/NotificationSystem';

const StaffNavbar: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const location = useLocation();
  const { state } = useSidebar(); // Get sidebar state

  // Function to get page title based on current route
  const getPageTitle = (pathname: string): string => {
    const routeMap: { [key: string]: string } = {
      '/staff/dashboard': 'Dashboard',
      '/staff/inventory': 'Manage Inventory',
      '/staff/orders': 'Orders',
      '/staff/pos': 'POS System',
      '/staff/loyalty': 'Loyalty Points',
      '/staff/sales': 'Sales',
      '/staff/activity-logs': 'Activity Logs',
      '/staff/settings': 'Settings'
    };
    
    return routeMap[pathname] || 'Dashboard';
  };


  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [notificationsResponse, unreadCountResponse] = await Promise.all([
        fetch('/api/notifications/staff'),
        fetch('/api/notifications/staff/unread-count')
      ]);

      if (notificationsResponse.ok) {
        const data = await notificationsResponse.json();
        setNotifications(data.notifications || []);
        
        // Extract low stock notifications for backward compatibility
        const lowStockNotifications = data.notifications?.filter((notif: any) => 
          notif.notification_type === 'low_stock'
        ) || [];
        
        setLowStockCount(lowStockNotifications.length);
        setLowStockItems(lowStockNotifications.map((notif: any) => {
          const data = JSON.parse(notif.data || '{}');
          return {
            name: data.items?.[0]?.name || 'Unknown Item',
            quantity: data.items?.[0]?.quantity || 0,
            unit: data.items?.[0]?.unit || 'units',
            low_stock_threshold: data.items?.[0]?.reorderLevel || 0
          };
        }));
      }

      if (unreadCountResponse.ok) {
        const data = await unreadCountResponse.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
      setLowStockCount(0);
      setLowStockItems([]);
    } finally {
      setLoading(false);
    }
  };

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

  // Fetch notification counts on component mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/staff/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: any) => {
    // Mark as read when clicked
    if (!notification.is_read) {
      markNotificationAsRead(notification.id);
    }
    
    // Close the notification dropdown
    setShowNotifications(false);
    
    // Notifications are view-only - no modal or navigation
  };

  // Toggle notifications dropdown
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const totalNotifications = unreadCount;

  return (
    <nav className={`fixed top-0 right-0 bg-[#a87437] border-b shadow-lg px-2 sm:px-4 lg:px-6 py-2 flex items-center z-50 transition-all duration-200 ${state === 'collapsed' ? 'sm:left-[4.5rem]' : 'sm:left-64'} left-0 w-full sm:w-auto navbar-full-width-tablet`}>
      <div className="mr-2 sm:mr-3 flex-shrink-0">
        <SidebarTrigger className="text-white" />
      </div>
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-1 min-w-0">
        <span className="great-vibes text-base sm:text-lg lg:text-xl xl:text-2xl tracking-tight text-white truncate">
          Staff Portal
        </span>
        {/* Breadcrumbs - Hidden on mobile, shown on larger screens */}
        <nav aria-label="Breadcrumb" className="hidden md:block ml-1 lg:ml-4">
          <ol className="flex items-center space-x-1 text-xs lg:text-sm text-white/80">
            <li>
              <span className="text-white/60">Staff</span>
            </li>
            <li>
              <ChevronRight className="h-3 w-3 lg:h-4 lg:w-4 mx-1 text-white/60" />
            </li>
            <li className="text-white font-semibold truncate">
              {getPageTitle(location.pathname)}
            </li>
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
            {!loading && totalNotifications > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {totalNotifications > 99 ? '99+' : totalNotifications}
            </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{totalNotifications} new</span>
                    {totalNotifications > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-6 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <div className="text-gray-400 mb-2">
                      <Bell className="w-8 h-8 mx-auto" />
                    </div>
                    <p className="text-sm text-gray-500">No notifications</p>
                    <p className="text-xs text-gray-400">You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 hover:bg-gray-50 border-l-4 border-b border-gray-100 cursor-pointer transition-colors ${
                        !notification.is_read ? 'border-l-orange-500 bg-orange-50' : 'border-l-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          <Bell className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}
          
          <span className="sr-only">Total notifications: {totalNotifications}</span>
        </div>

      </div>

    </nav>
  );
};

export default StaffNavbar;
