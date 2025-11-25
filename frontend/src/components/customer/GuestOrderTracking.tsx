import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Search, Clock, CheckCircle, XCircle, Loader2, Package, Download } from 'lucide-react';
import { CustomerNavbar } from '../ui/CustomerNavbar';
import { decodeId, encodeId } from '../../utils/idObfuscation';
// import { downloadReceipt } from '../../utils/receiptGenerator';

interface Order {
  orderId: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  orderTime: string;
  estimatedReadyTime: string;
  items: any[];
  totalPrice: number;
  tableNumber: number | null;
  customerEmail: string;
}

const GuestOrderTracking: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const decodedParamId = decodeId(orderId);
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [searchOrderId, setSearchOrderId] = useState(decodedParamId || '');
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const currentOrderIdRef = useRef<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'preparing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 25;
      case 'preparing':
        return 50;
      case 'ready':
        return 75;
      case 'completed':
        return 100;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  };

  const playNotificationSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    const AudioConstructor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioConstructor) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioConstructor();
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    oscillator.start(now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    oscillator.stop(now + 0.8);
  }, []);

  const showBrowserNotification = useCallback((message: string) => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;

    const title = 'Order Status Updated';
    const body = message;

    const triggerNotification = () => {
      try {
        new Notification(title, { body });
      } catch (error) {
        console.warn('Unable to show notification:', error);
      }
    };

    if (Notification.permission === 'granted') {
      triggerNotification();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission()
        .then((permission) => {
          if (permission === 'granted') {
            triggerNotification();
          }
        })
        .catch(() => {});
    }
  }, []);

  const downloadReceipt = async (orderId: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      // Generate and download JPEG receipt from backend
      const receiptUrl = `${API_URL}/api/receipts/download-jpeg/${orderId}`;
      
      // Fetch the receipt to ensure it's generated
      const response = await fetch(receiptUrl, {
        method: 'GET',
        credentials: 'omit'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate receipt');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt_${orderId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert(error instanceof Error ? error.message : 'Error downloading receipt. Please try again.');
    }
  };

  const fetchOrder = async (rawOrEncodedId: string) => {
    // Accept both encoded and raw; decode if possible, but always use long orderId for tracking
    const decoded = decodeId(rawOrEncodedId) || rawOrEncodedId;
    if (!rawOrEncodedId || !rawOrEncodedId.trim()) {
      setError('Please enter your order ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/guest/order-status/${decoded}`);
      const data = await response.json();

      if (data.success) {
        const fetchedOrder = data.order;
        setOrder(fetchedOrder);
        // Update the current order ID ref for socket room joining
        currentOrderIdRef.current = decoded;
        // Store the initial status for comparison
        previousStatusRef.current = fetchedOrder.status || null;
      } else {
        setError(data.message || 'Order not found');
        setOrder(null);
        currentOrderIdRef.current = null;
        previousStatusRef.current = null;
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setError('Failed to fetch order details');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchOrder(searchOrderId);
  };

  useEffect(() => {
    if (decodedParamId) {
      setSearchOrderId(decodedParamId);
      // Fetch order if we have a param ID
      fetchOrder(decodedParamId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Rejoin socket room when order changes
  useEffect(() => {
    if (order && order.orderId && socket && socket.connected) {
      const rawOrderId = decodeId(order.orderId) || order.orderId;
      console.log('🔌 GuestOrderTracking: Rejoining socket room for order:', rawOrderId);
      socket.emit('join-order-room', rawOrderId);
      currentOrderIdRef.current = rawOrderId;
    }
  }, [order?.orderId, socket]);

  // Realtime updates: connect to socket and join order room
  useEffect(() => {
    // Use the order ID from the fetched order, or from params/search
    const activeOrderId = order?.orderId || currentOrderIdRef.current || decodedParamId || searchOrderId;
    if (!activeOrderId) return;
    
    // Update the ref with the current order ID
    if (order?.orderId) {
      currentOrderIdRef.current = decodeId(order.orderId) || order.orderId;
    }

    console.log('🔌 GuestOrderTracking: Connecting to Socket.IO for order:', activeOrderId);
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const s = io(API_URL, {
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
    setSocket(s);

    // Connection event handlers
    const handleConnect = () => {
      console.log('🔌 GuestOrderTracking: Socket connected for order:', activeOrderId);
      setIsConnected(true);
      // Join a dedicated room for this order (backend expects 'join-order-room' with raw id)
      // Decode if needed to get the raw order ID
      const rawOrderId = decodeId(activeOrderId) || activeOrderId;
      s.emit('join-order-room', rawOrderId);
      console.log('🔌 GuestOrderTracking: Joined order room:', `order-${rawOrderId}`);
    };

    s.on('connect', handleConnect);

    // Rejoin room on reconnect
    s.on('reconnect', () => {
      console.log('🔌 GuestOrderTracking: Socket reconnected, rejoining room');
      handleConnect();
    });

    s.on('disconnect', () => {
      console.log('🔌 GuestOrderTracking: Socket disconnected for order:', activeOrderId);
      setIsConnected(false);
    });

    s.on('error', (error) => {
      console.warn('🔌 GuestOrderTracking: Socket error:', error);
      setIsConnected(false);
    });

    const handleUpdate = (payload: any) => {
      console.log('🔔 GuestOrderTracking: Received update:', payload);
      if (!payload) return;
      
      // More flexible order ID matching - check both raw and decoded versions
      const payloadOrderId = payload.orderId || payload.order_id || payload.internalOrderId;
      const rawActiveOrderId = decodeId(activeOrderId) || activeOrderId;
      const decodedPayloadOrderId = payloadOrderId ? (decodeId(payloadOrderId) || payloadOrderId) : null;
      
      // Match if order IDs match (either raw or decoded)
      if (payloadOrderId && 
          payloadOrderId !== activeOrderId && 
          payloadOrderId !== rawActiveOrderId &&
          decodedPayloadOrderId !== activeOrderId &&
          decodedPayloadOrderId !== rawActiveOrderId) {
        console.log('🔔 GuestOrderTracking: Order ID mismatch, ignoring update:', {
          payloadOrderId,
          activeOrderId,
          rawActiveOrderId,
          decodedPayloadOrderId
        });
        return;
      }
      
      setOrder(prev => {
        const previousStatus = prev?.status || previousStatusRef.current;
        const previousPaymentStatus = prev?.paymentStatus;
        
        const base = prev || {
          orderId: activeOrderId,
          customerName: payload.customerName || '',
          status: payload.status || 'pending',
          paymentStatus: payload.paymentStatus || 'unpaid',
          paymentMethod: (payload as any).paymentMethod || 'cash',
          orderTime: (payload as any).orderTime || (prev as any)?.orderTime || new Date().toISOString(),
          estimatedReadyTime: (payload as any).estimatedReadyTime || (prev as any)?.estimatedReadyTime || '',
          totalPrice: (payload as any).totalPrice || (payload as any).total_price || (prev as any)?.totalPrice || 0,
          items: (payload as any).items || (prev as any)?.items || [],
          tableNumber: ((payload as any).tableNumber || (payload as any).table_number || (prev as any)?.tableNumber) ?? null,
          customerEmail: (payload as any).customerEmail || (prev as any)?.customerEmail || ''
        } as Order;
        
        const updatedOrder = {
          ...base,
          status: payload.status ?? base.status,
          paymentStatus: payload.paymentStatus ?? base.paymentStatus,
          paymentMethod: payload.paymentMethod ?? base.paymentMethod,
          items: (payload as any).items || base.items,
          totalPrice: (payload as any).totalPrice || (payload as any).total_price || base.totalPrice,
          customerName: payload.customerName || base.customerName,
          tableNumber: ((payload as any).tableNumber || (payload as any).table_number) ?? base.tableNumber,
        };
        
        console.log('🔔 GuestOrderTracking: Order updated:', updatedOrder);
        setLastUpdate(new Date());
        
        // Show notification for status changes (including initial load if status changes)
        const statusChanged = previousStatus && previousStatus !== updatedOrder.status;
        const paymentStatusChanged = previousPaymentStatus && previousPaymentStatus !== updatedOrder.paymentStatus;
        
        if (statusChanged) {
          const statusMessage = `Order status updated to: ${updatedOrder.status.charAt(0).toUpperCase() + updatedOrder.status.slice(1).replace(/_/g, ' ')}`;
          setNotificationMessage(statusMessage);
          setShowNotification(true);
          
          // Play notification sound
          playNotificationSound();
          
          // Show browser notification
          showBrowserNotification(statusMessage);
          
          setTimeout(() => setShowNotification(false), 5000);
        } else if (paymentStatusChanged && updatedOrder.paymentStatus === 'paid') {
          const paymentMessage = 'Payment confirmed! Your order is being processed.';
          setNotificationMessage(paymentMessage);
          setShowNotification(true);
          
          // Play notification sound
          playNotificationSound();
          
          // Show browser notification
          showBrowserNotification(paymentMessage);
          
          setTimeout(() => setShowNotification(false), 5000);
        }
        
        // Update previous status ref
        previousStatusRef.current = updatedOrder.status;
        
        return updatedOrder;
      });
    };

    s.on('order-updated', handleUpdate);
    s.on('payment-updated', handleUpdate);
    s.on('new-order-received', handleUpdate);

    return () => {
      console.log('🔌 GuestOrderTracking: Cleaning up socket for order:', activeOrderId);
      s.off('order-updated', handleUpdate);
      s.off('payment-updated', handleUpdate);
      s.off('new-order-received', handleUpdate);
      s.off('connect', handleConnect);
      s.off('reconnect', handleConnect);
      s.close();
    };
  }, [order?.orderId, decodedParamId, searchOrderId, playNotificationSound, showBrowserNotification]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close?.().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNavbar />
      
      {/* Real-time Notification */}
      {showNotification && (
        <div className="fixed top-20 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">{notificationMessage}</span>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto px-4 py-8 pt-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-black">Guest Order Tracking</h1>
            <Button
              onClick={() => navigate('/guest/menu')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Back to Guest Menu
            </Button>
          </div>
          
          {/* Real-time Connection Status */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? 'Live updates enabled' : 'Connecting...'}
            </span>
            {lastUpdate && (
              <span className="text-gray-500 ml-2">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Track Your Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  type="text"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  placeholder="Enter your order number"
                  className="mt-2 bg-white border-[#a87437] focus:border-[#8f652f] focus:ring-0 focus:outline-none focus:bg-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
              </div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !searchOrderId.trim()}
              className="w-full mt-4 bg-[#a87437] hover:bg-[#8f652f] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Track Order
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Order Details */}
        {order && (
          <div className="space-y-6">
            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Status</span>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(order.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(order.status)}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </Badge>
                    {/* Download Receipt Button - Only shown after payment is verified */}
                    {order.paymentStatus === 'paid' && (order.status === 'completed' || order.status === 'ready') && (
                      <Button
                        onClick={() => downloadReceipt(order.orderId)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-[#a87437] text-[#a87437] hover:bg-[#a87437] hover:text-white"
                      >
                        <Download className="h-4 w-4" />
                        Download Receipt
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order ID</p>
                    <p className="font-semibold font-mono text-sm">{order.orderId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="font-semibold">{order.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Time</p>
                    <p className="font-semibold">{new Date(order.orderTime).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estimated Ready Time</p>
                    <p className="font-semibold">{new Date(order.estimatedReadyTime).toLocaleString()}</p>
                  </div>
                  {order.tableNumber && (
                    <div>
                      <p className="text-sm text-gray-600">Table Number</p>
                      <p className="font-semibold">Table {order.tableNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-semibold capitalize">{order.paymentMethod}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        {item.notes && (
                          <p className="text-sm text-gray-600">Notes: {item.notes}</p>
                        )}
                        {item.customizations && item.customizations.length > 0 && (
                          <div className="text-sm text-gray-600">
                            Customizations: {item.customizations.map((c: { name: string }) => c.name).join(', ')}
                          </div>
                        )}
                      </div>
                      <p className="font-semibold">₱{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center border-t pt-4 mt-4">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-lg font-bold text-[#a87437]">₱{order.totalPrice.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Status Information */}
            <Card>
              <CardHeader>
                <CardTitle>Order Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                {(() => {
                  const progressPercentage = getProgressPercentage(order.status);
                  const progressWidth = `${progressPercentage}%`;
                  const ariaLabel = `Order progress: ${progressPercentage}%`;
                  const ariaValueNow = progressPercentage;
                  const ariaValueMin = 0;
                  const ariaValueMax = 100;
                  
                  return (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#a87437]">{progressPercentage}% Complete</span>
                          {isConnected && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                              <span>Live</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        {/* eslint-disable-next-line react/forbid-dom-props */}
                        <div 
                          className="bg-[#a87437] h-3 rounded-full transition-all duration-500 ease-in-out"
                          role="progressbar"
                          aria-label={ariaLabel}
                          aria-valuenow={ariaValueNow}
                          aria-valuemin={ariaValueMin}
                          aria-valuemax={ariaValueMax}
                          style={{ width: progressWidth } as React.CSSProperties}
                        ></div>
                      </div>
                    </div>
                  );
                })()}

                {/* Progress Steps */}
                <div className="space-y-4">
                  {/* Order Received */}
                  <div className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        order.status === 'pending' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed'
                          ? 'bg-[#a87437] text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      {order.status !== 'pending' && order.status !== 'preparing' && order.status !== 'ready' && order.status !== 'completed' && (
                        <div className="w-0.5 h-6 bg-gray-300 mt-2"></div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`text-sm font-medium ${order.status === 'pending' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' ? 'text-[#a87437]' : 'text-gray-600'}`}>
                        Order Received
                      </p>
                      <p className="text-xs text-gray-500">Your order has been received and is being processed</p>
                    </div>
                  </div>

                  {/* Preparing */}
                  <div className="flex items-center">
                    <div className="flex flex-col items-center">
                      {order.status === 'pending' && (
                        <div className="w-0.5 h-6 bg-gray-300"></div>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        order.status === 'preparing' || order.status === 'ready' || order.status === 'completed'
                          ? 'bg-[#a87437] text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        <Loader2 className={`h-4 w-4 ${order.status === 'preparing' ? 'animate-spin' : ''}`} />
                      </div>
                      {order.status !== 'preparing' && order.status !== 'ready' && order.status !== 'completed' && (
                        <div className="w-0.5 h-6 bg-gray-300 mt-2"></div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`text-sm font-medium ${order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' ? 'text-[#a87437]' : 'text-gray-600'}`}>
                        Preparing
                      </p>
                      <p className="text-xs text-gray-500">Your order is being prepared by our kitchen staff</p>
                    </div>
                  </div>

                  {/* Ready for Pickup */}
                  <div className="flex items-center">
                    <div className="flex flex-col items-center">
                      {order.status === 'preparing' && (
                        <div className="w-0.5 h-6 bg-gray-300"></div>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        order.status === 'ready' || order.status === 'completed'
                          ? 'bg-[#a87437] text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        <Package className="h-4 w-4" />
                      </div>
                      {order.status !== 'ready' && order.status !== 'completed' && (
                        <div className="w-0.5 h-6 bg-gray-300 mt-2"></div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`text-sm font-medium ${order.status === 'ready' || order.status === 'completed' ? 'text-[#a87437]' : 'text-gray-600'}`}>
                        Ready for Pickup
                      </p>
                      <p className="text-xs text-gray-500">Your order is ready for pickup</p>
                    </div>
                  </div>

                  {/* Completed */}
                  <div className="flex items-center">
                    <div className="flex flex-col items-center">
                      {order.status === 'ready' && (
                        <div className="w-0.5 h-6 bg-gray-300"></div>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        order.status === 'completed'
                          ? 'bg-[#a87437] text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`text-sm font-medium ${order.status === 'completed' ? 'text-[#a87437]' : 'text-gray-600'}`}>
                        Completed
                      </p>
                      <p className="text-xs text-gray-500">Order has been completed successfully</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guest Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Clock className="h-5 w-5" />
                <span className="font-semibold">Guest Order Notice</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                This is a guest order. For order history and loyalty points, consider creating an account for future orders.
              </p>
            </div>
          </div>
        )}

        {/* No Order State */}
        {!order && !loading && !error && (
          <Card>
            <CardContent className="text-center py-8">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Track Your Order</h3>
              <p className="text-gray-500">Enter your order number above to track your order status.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GuestOrderTracking;
