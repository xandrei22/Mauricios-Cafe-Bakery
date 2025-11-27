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
  const [statusUpdateAnimation, setStatusUpdateAnimation] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const currentOrderIdRef = useRef<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'pending_verification':
        return 'bg-yellow-100 text-yellow-800';
      case 'payment_confirmed':
        return 'bg-blue-100 text-blue-800';
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
      case 'pending_verification':
        return <Clock className="h-4 w-4" />;
      case 'payment_confirmed':
        return <CheckCircle className="h-4 w-4" />;
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

  const getProgressPercentage = (status: string, paymentStatus?: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'pending_verification':
        return 20;
      case 'payment_confirmed':
        return 40;
      case 'preparing':
        return 60;
      case 'ready':
        return 80;
      case 'completed':
        return 100;
      case 'cancelled':
        return 0;
      default:
        // If payment is paid but status is still pending, show payment confirmed progress
        if (paymentStatus === 'paid' && (status === 'pending' || status === 'pending_verification')) {
          return 40;
        }
        return 0;
    }
  };

  const playNotificationSound = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      const AudioConstructor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioConstructor) {
        console.warn('AudioContext not supported');
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioConstructor();
      }

      const ctx = audioContextRef.current;
      if (!ctx) return;

      // Resume audio context if suspended (required by browser autoplay policies)
      if (ctx.state === 'suspended') {
        ctx.resume().catch((err) => {
          console.warn('Failed to resume audio context:', err);
        });
      }

      // Create a pleasant notification sound (two-tone chime)
      const now = ctx.currentTime;
      
      // First tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 880; // A5 note
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.1);
      gain1.gain.linearRampToValueAtTime(0, now + 0.3);
      osc1.start(now);
      osc1.stop(now + 0.3);
      
      // Second tone (slightly higher, starts after first)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = 1108; // C#6 note
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      gain2.gain.setValueAtTime(0, now + 0.2);
      gain2.gain.linearRampToValueAtTime(0.3, now + 0.3);
      gain2.gain.linearRampToValueAtTime(0, now + 0.5);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.5);
      
      console.log('🔔 Notification sound played');
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
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
        // Use the orderId directly from the API response (long format like ORD-1764039875901-qb6xvn1fj)
        // This is the format the backend uses for socket rooms
        const longOrderId = fetchedOrder.orderId || decoded;
        currentOrderIdRef.current = longOrderId;
        // Store the initial status for comparison
        previousStatusRef.current = fetchedOrder.status || null;
        
        console.log('🔌 GuestOrderTracking: Order fetched, orderId:', longOrderId);
        
        // If socket is connected, join the order room with the long order ID
        if (socket && socket.connected) {
          console.log('🔌 GuestOrderTracking: Joining socket room with long order ID:', longOrderId);
          socket.emit('join-order-room', longOrderId);
        }
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

  // Rejoin socket room when order is first fetched or order ID changes
  useEffect(() => {
    if (order && order.orderId && socket && socket.connected) {
      // Use the orderId directly (long format) - don't decode it
      const longOrderId = order.orderId;
      // Only rejoin if the order ID has actually changed
      if (currentOrderIdRef.current !== longOrderId) {
        console.log('🔌 GuestOrderTracking: Order ID changed, rejoining socket room with long ID:', longOrderId);
        socket.emit('join-order-room', longOrderId);
        currentOrderIdRef.current = longOrderId;
      }
    }
  }, [order?.orderId, socket]);

  // Realtime updates: connect to socket and join order room
  useEffect(() => {
    // Use the order ID from the fetched order, or from params/search
    // Don't recreate socket if we already have one connected for this order
    const activeOrderId = order?.orderId || currentOrderIdRef.current || decodedParamId || searchOrderId;
    if (!activeOrderId) return;
    
    // Update the ref with the current order ID (use long format from order if available)
    // The order.orderId from API is already in long format (ORD-xxx-xxx)
    if (order?.orderId) {
      currentOrderIdRef.current = order.orderId; // Use long format directly
    } else {
      // If no order yet, decode the activeOrderId if it's encoded, otherwise use as-is
      currentOrderIdRef.current = activeOrderId.startsWith('ORD-') ? activeOrderId : (decodeId(activeOrderId) || activeOrderId);
    }

    // Don't recreate socket if we already have one and it's connected
    if (socket && socket.connected && currentOrderIdRef.current) {
      console.log('🔌 GuestOrderTracking: Socket already connected, skipping recreation');
      return;
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
      // Join a dedicated room for this order using the long order ID format
      // Use the current order ID from ref if available (should be long format from API)
      // Otherwise use activeOrderId directly (might be encoded, so decode it)
      const longOrderId = currentOrderIdRef.current || (activeOrderId.startsWith('ORD-') ? activeOrderId : (decodeId(activeOrderId) || activeOrderId));
      console.log('🔌 GuestOrderTracking: Joining order room with long order ID:', longOrderId);
      s.emit('join-order-room', longOrderId);
      console.log('🔌 GuestOrderTracking: Joined order room:', `order-${longOrderId}`);
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
      
      // Order ID matching - backend sends long format (ORD-xxx-xxx)
      const payloadOrderId = payload.orderId || payload.order_id || payload.internalOrderId;
      // Use the long order ID from currentOrderIdRef (from API response) or decode if needed
      const currentLongOrderId = currentOrderIdRef.current || (activeOrderId.startsWith('ORD-') ? activeOrderId : (decodeId(activeOrderId) || activeOrderId));
      
      // Normalize order IDs for comparison (remove any extra characters, compare base parts)
      const normalizeOrderId = (id: string) => {
        if (!id) return '';
        // If it's in ORD-xxx-xxx format, use the first two parts
        if (id.includes('ORD-')) {
          const parts = id.split('-');
          return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : id;
        }
        return id;
      };
      
      // Match if order IDs match (both should be in long format)
      const orderIdMatches = payloadOrderId && (
        payloadOrderId === currentLongOrderId ||
        payloadOrderId === activeOrderId ||
        currentLongOrderId === payloadOrderId ||
        normalizeOrderId(payloadOrderId) === normalizeOrderId(currentLongOrderId) ||
        // Also check if they're the same after normalization
        (payloadOrderId.includes('ORD-') && currentLongOrderId.includes('ORD-') && 
         payloadOrderId.split('-').slice(0, 2).join('-') === currentLongOrderId.split('-').slice(0, 2).join('-'))
      );
      
      // If we're in the order room, we should receive updates for this order
      // If payload has no orderId, assume it's for us (we're in the order room)
      if (payloadOrderId && !orderIdMatches) {
        console.log('🔔 GuestOrderTracking: Order ID mismatch, ignoring update:', {
          payloadOrderId,
          currentLongOrderId,
          activeOrderId,
          orderIdMatches
        });
        return;
      }
      
      console.log('🔔 GuestOrderTracking: Order ID matches, processing update:', {
        payloadOrderId,
        currentLongOrderId,
        status: payload.status,
        paymentStatus: payload.paymentStatus
      });
      
      setOrder(prev => {
        const previousStatus = prev?.status || previousStatusRef.current;
        const previousPaymentStatus = prev?.paymentStatus;
        
        // Always update status if provided in payload, even if it's the same
        // This ensures the UI updates even if the status hasn't technically "changed"
        const newStatus = payload.status || prev?.status || 'pending';
        const newPaymentStatus = payload.paymentStatus || prev?.paymentStatus || 'unpaid';
        
        const base = prev || {
          orderId: currentLongOrderId || activeOrderId,
          customerName: payload.customerName || '',
          status: newStatus,
          paymentStatus: newPaymentStatus,
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
          status: newStatus, // Always use the new status from payload
          paymentStatus: newPaymentStatus, // Always use the new payment status from payload
          paymentMethod: payload.paymentMethod ?? base.paymentMethod,
          items: (payload as any).items || base.items,
          totalPrice: (payload as any).totalPrice || (payload as any).total_price || base.totalPrice,
          customerName: payload.customerName || base.customerName,
          tableNumber: ((payload as any).tableNumber || (payload as any).table_number) ?? base.tableNumber,
        };
        
        console.log('🔔 GuestOrderTracking: Order updated:', {
          previousStatus,
          newStatus: updatedOrder.status,
          previousPaymentStatus,
          newPaymentStatus: updatedOrder.paymentStatus,
          statusChanged: previousStatus !== updatedOrder.status,
          paymentStatusChanged: previousPaymentStatus !== updatedOrder.paymentStatus
        });
        setLastUpdate(new Date());
        
        // Play sound for status changes - check if status actually changed
        const statusChanged = previousStatus && previousStatus !== updatedOrder.status;
        const paymentStatusChanged = previousPaymentStatus && previousPaymentStatus !== updatedOrder.paymentStatus;
        
        if (statusChanged) {
          console.log('🔔 GuestOrderTracking: Status changed from', previousStatus, 'to', updatedOrder.status, '- playing sound');
          // Trigger visual animation
          setStatusUpdateAnimation(true);
          setTimeout(() => setStatusUpdateAnimation(false), 2000);
          // Play notification sound when status changes
          setTimeout(() => {
            playNotificationSound();
          }, 100); // Small delay to ensure state is updated
        } else if (paymentStatusChanged && updatedOrder.paymentStatus === 'paid') {
          console.log('🔔 GuestOrderTracking: Payment confirmed, playing sound');
          // Trigger visual animation
          setStatusUpdateAnimation(true);
          setTimeout(() => setStatusUpdateAnimation(false), 2000);
          // Play sound when payment is confirmed
          setTimeout(() => {
            playNotificationSound();
          }, 100);
        } else if (!previousStatus && updatedOrder.status && updatedOrder.status !== 'pending') {
          console.log('🔔 GuestOrderTracking: First status update, playing sound');
          // Trigger visual animation
          setStatusUpdateAnimation(true);
          setTimeout(() => setStatusUpdateAnimation(false), 2000);
          // First time seeing this order with a non-pending status - play sound
          setTimeout(() => {
            playNotificationSound();
          }, 100);
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
    // Only recreate socket when the order ID changes (from URL params or search), not when order status updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedParamId, searchOrderId, playNotificationSound]);

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
            <Card className={statusUpdateAnimation ? 'animate-pulse border-2 border-[#a87437]' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Status</span>
                  <div className="flex items-center gap-3">
                    <Badge className={`${getStatusColor(order.status)} ${statusUpdateAnimation ? 'scale-110 transition-transform duration-300' : ''}`}>
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
                  const progressPercentage = getProgressPercentage(order.status, order.paymentStatus);
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
                        order.status === 'pending' || order.status === 'pending_verification' || order.status === 'payment_confirmed' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' || order.paymentStatus === 'paid'
                          ? 'bg-[#a87437] text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      {(order.status !== 'pending' && order.status !== 'pending_verification' && order.status !== 'payment_confirmed' && order.status !== 'preparing' && order.status !== 'ready' && order.status !== 'completed' && order.paymentStatus !== 'paid') && (
                        <div className="w-0.5 h-6 bg-gray-300 mt-2"></div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`text-sm font-medium ${order.status === 'pending' || order.status === 'pending_verification' || order.status === 'payment_confirmed' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' || order.paymentStatus === 'paid' ? 'text-[#a87437]' : 'text-gray-600'}`}>
                        Order Received
                      </p>
                      <p className="text-xs text-gray-500">Your order has been received and is being processed</p>
                    </div>
                  </div>

                  {/* Payment Confirmed */}
                  <div className="flex items-center">
                    <div className="flex flex-col items-center">
                      {(order.status === 'pending' || order.status === 'pending_verification') && order.paymentStatus !== 'paid' && (
                        <div className="w-0.5 h-6 bg-gray-300"></div>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        order.status === 'payment_confirmed' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' || (order.paymentStatus === 'paid' && order.status !== 'pending' && order.status !== 'pending_verification')
                          ? 'bg-[#a87437] text-white' 
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      {order.status !== 'payment_confirmed' && order.status !== 'preparing' && order.status !== 'ready' && order.status !== 'completed' && !(order.paymentStatus === 'paid' && order.status !== 'pending' && order.status !== 'pending_verification') && (
                        <div className="w-0.5 h-6 bg-gray-300 mt-2"></div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <p className={`text-sm font-medium ${order.status === 'payment_confirmed' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed' || (order.paymentStatus === 'paid' && order.status !== 'pending' && order.status !== 'pending_verification') ? 'text-[#a87437]' : 'text-gray-600'}`}>
                        Payment Confirmed
                      </p>
                      <p className="text-xs text-gray-500">Your payment has been verified and confirmed</p>
                    </div>
                  </div>

                  {/* Preparing */}
                  <div className="flex items-center">
                    <div className="flex flex-col items-center">
                      {(order.status === 'pending' || order.status === 'pending_verification' || order.status === 'payment_confirmed') && (
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
