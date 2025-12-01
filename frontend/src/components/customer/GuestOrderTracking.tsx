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
  const [paymentConfirmedTime, setPaymentConfirmedTime] = useState<Date | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousStatusRef = useRef<string | null>(null);
  const previousPaymentStatusRef = useRef<string | null>(null);
  const currentOrderIdRef = useRef<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'pending_verification':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
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
      case 'confirmed':
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

  // Compute display status with delay between payment confirmed and preparing
  const getDisplayStatus = (status: string, paymentStatus?: string): string => {
    if (!status) return status;
    
    const normalizedStatus = status.toLowerCase().trim();
    const normalizedPaymentStatus = paymentStatus?.toLowerCase().trim();
    
    // If status is ready but payment was just confirmed, show preparing for 3-5 seconds
    if (normalizedStatus === 'ready' && paymentConfirmedTime) {
      const timeSincePaymentConfirmed = Date.now() - paymentConfirmedTime.getTime();
      const delayDuration = 4000; // 4 seconds delay
      
      // If less than 4 seconds have passed since payment confirmation, show preparing
      if (timeSincePaymentConfirmed < delayDuration) {
        return 'preparing';
      }
    }
    
    return status;
  };

  const getProgressPercentage = (status: string, paymentStatus?: string) => {
    if (!status) return 0;
    
    // Use display status to ensure proper progression
    const displayStatus = getDisplayStatus(status, paymentStatus);
    const normalizedStatus = displayStatus.toLowerCase().trim();
    const normalizedPaymentStatus = paymentStatus?.toLowerCase().trim();
    
    // Handle cancelled orders first
    if (normalizedStatus === 'cancelled') {
      return 0;
    }
    
    // Progress calculation based on order status and payment status
    // The flow should be: Order Received (20%) → Payment Confirmed (40%) → Preparing (60%) → Ready (80%) → Completed (100%)
    
    // Step 1: Order Received (20%)
    // Order is placed but payment not yet verified
    if (normalizedStatus === 'pending' || normalizedStatus === 'pending_verification') {
      // If payment is already paid, we're at payment confirmed stage (40%)
      if (normalizedPaymentStatus === 'paid') {
        return 40;
      }
      // Otherwise, order is just received (20%)
      return 20;
    }
    
    // Step 2: Payment Confirmed (40%)
    // Payment has been verified
    if (normalizedStatus === 'confirmed' || normalizedStatus === 'payment_confirmed') {
      return 40;
    }
    
    // Step 3: Preparing (60%)
    // Order is being prepared
    if (normalizedStatus === 'processing' || normalizedStatus === 'preparing') {
      return 60;
    }
    
    // Step 4: Ready (80%)
    // Order is ready for pickup
    if (normalizedStatus === 'ready') {
      return 80;
    }
    
    // Step 5: Completed (100%)
    // Order is completed
    if (normalizedStatus === 'completed') {
      return 100;
    }
    
    // Default: if payment is paid, assume we're at payment confirmed (40%)
    // Otherwise, assume order is just received (20%)
    if (normalizedPaymentStatus === 'paid') {
      return 40;
    }
    
    return 20; // Default to order received
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

  // Ensure audio is unlocked on first user interaction (required on mobile browsers)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const enableSoundOnce = () => {
      try {
        playNotificationSound();
      } catch (e) {
        console.warn('Failed to enable sound on first interaction:', e);
      }
    };

    const events: Array<keyof DocumentEventMap> = ['click', 'touchstart', 'keydown'];
    events.forEach(event =>
      document.addEventListener(event, enableSoundOnce as EventListener, { once: true })
    );

    return () => {
      events.forEach(event =>
        document.removeEventListener(event, enableSoundOnce as EventListener)
      );
    };
  }, [playNotificationSound]);

  const downloadReceipt = async (orderId: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      // Open printable HTML receipt in a new tab instead of generating JPEG
      const receiptUrl = `${API_URL}/api/receipts/generate/${orderId}`;
      const win = window.open(receiptUrl, '_blank');
      if (!win) {
        throw new Error('Please allow pop-ups to view the receipt.');
      }
    } catch (error) {
      console.error('Error opening receipt:', error);
      alert(error instanceof Error ? error.message : 'Error opening receipt. Please try again.');
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
        console.log('🔍 GuestOrderTracking: Fetched order from API:', {
          orderId: fetchedOrder.orderId,
          status: fetchedOrder.status,
          paymentStatus: fetchedOrder.paymentStatus,
          paymentMethod: fetchedOrder.paymentMethod
        });
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
    // Prime/unlock audio on an explicit user action so that
    // subsequent status-change sounds are allowed by browser
    // autoplay policies.
    try {
      playNotificationSound();
    } catch (e) {
      console.warn('Failed to prime notification sound:', e);
    }
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
      try {
        console.log('🔔 GuestOrderTracking: Received update:', payload);
        if (!payload) return;
      
      // Order ID matching
      // Backend currently sends:
      // - publicId (short display code) as `orderId`
      // - internal DB/order_id (long ORD-... value) as `internalOrderId`
      // The guest tracker uses the long ORD-... ID everywhere, so we MUST
      // prefer `internalOrderId` when matching updates to this page.
      const payloadOrderId =
        payload.internalOrderId || payload.orderId || payload.order_id;
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
        // Don't update if we don't have a previous order - this prevents resetting
        if (!prev) {
          console.log('🔔 GuestOrderTracking: No previous order state, ignoring update to prevent reset');
          return prev;
        }
        
        const previousStatus = prev.status || previousStatusRef.current;
        const previousPaymentStatus = prev.paymentStatus;
        
        // Always update status if provided in payload, otherwise keep previous status
        // Never default to 'pending' as that would reset progress
        const newStatus = payload.status !== undefined && payload.status !== null ? payload.status : prev.status;
        const newPaymentStatus = payload.paymentStatus !== undefined && payload.paymentStatus !== null ? payload.paymentStatus : prev.paymentStatus;
        
        console.log('🔔 GuestOrderTracking: Updating order with:', {
          payloadStatus: payload.status,
          payloadPaymentStatus: payload.paymentStatus,
          prevStatus: prev.status,
          prevPaymentStatus: prev.paymentStatus,
          newStatus,
          newPaymentStatus
        });
        
        // Ensure we never lose the order data - always preserve existing values
        const updatedOrder = {
          ...prev,
          // Only update fields that are explicitly provided in payload
          status: newStatus || prev.status,
          paymentStatus: newPaymentStatus || prev.paymentStatus,
          paymentMethod: payload.paymentMethod !== undefined ? payload.paymentMethod : prev.paymentMethod,
          // Only update these if provided, otherwise keep existing
          items: (payload as any).items || prev.items,
          totalPrice: (payload as any).totalPrice || (payload as any).total_price || prev.totalPrice,
          customerName: payload.customerName || prev.customerName,
          tableNumber: ((payload as any).tableNumber || (payload as any).table_number) !== undefined 
            ? ((payload as any).tableNumber || (payload as any).table_number) 
            : prev.tableNumber,
          estimatedReadyTime: (payload as any).estimatedReadyTime || prev.estimatedReadyTime,
          orderTime: (payload as any).orderTime || prev.orderTime,
          customerEmail: (payload as any).customerEmail || prev.customerEmail,
        };
        
        // Check if payment status and order status changed (calculate BEFORE using)
        const paymentStatusChanged = previousPaymentStatus !== updatedOrder.paymentStatus;
        const statusChanged = previousStatus && previousStatus !== updatedOrder.status;
        
        console.log('🔔 GuestOrderTracking: Order updated:', {
          previousStatus,
          newStatus: updatedOrder.status,
          previousPaymentStatus,
          newPaymentStatus: updatedOrder.paymentStatus,
          statusChanged,
          paymentStatusChanged
        });
        setLastUpdate(new Date());
        
        // If payment was just verified, track the confirmation time for delay logic
        if (paymentStatusChanged && updatedOrder.paymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
          console.log('🔔 GuestOrderTracking: Payment verified, setting confirmation time for delay');
          setPaymentConfirmedTime(new Date());
          // Refetch after a short delay to ensure backend has updated
          setTimeout(() => {
            if (updatedOrder.orderId) {
              fetchOrder(updatedOrder.orderId);
            }
          }, 500);
        }
        
        // Play sound for status changes - check if status actually changed
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
        
        // Update previous status refs
        previousStatusRef.current = updatedOrder.status;
        previousPaymentStatusRef.current = updatedOrder.paymentStatus;
        
        return updatedOrder;
      });
      } catch (error) {
        console.error('🔔 GuestOrderTracking: Error processing update:', error);
        // Don't crash the component - just log the error
        // The component will continue to work and can refetch on next update
      }
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

  // Clear payment confirmed time after delay period and force re-renders
  useEffect(() => {
    if (paymentConfirmedTime) {
      const interval = setInterval(() => {
        const timeSincePaymentConfirmed = Date.now() - paymentConfirmedTime.getTime();
        if (timeSincePaymentConfirmed >= 4000) {
          setPaymentConfirmedTime(null);
          clearInterval(interval);
        }
        // Force re-render by updating a dummy state
        setLastUpdate(new Date());
      }, 100); // Update every 100ms for smooth transition
      return () => clearInterval(interval);
    }
  }, [paymentConfirmedTime]);

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
                    <Badge className={`${getStatusColor(getDisplayStatus(order.status, order.paymentStatus))} ${statusUpdateAnimation ? 'scale-110 transition-transform duration-300' : ''}`}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(getDisplayStatus(order.status, order.paymentStatus))}
                        {getDisplayStatus(order.status, order.paymentStatus).charAt(0).toUpperCase() + getDisplayStatus(order.status, order.paymentStatus).slice(1)}
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
                  const displayStatus = getDisplayStatus(order.status, order.paymentStatus);
                  const progressPercentage = getProgressPercentage(displayStatus, order.paymentStatus);
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
                {(() => {
                  const displayStatus = getDisplayStatus(order.status, order.paymentStatus);
                  return (
                    <div className="relative">
                      {/* Single continuous vertical line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                      
                      <div className="space-y-4 relative">
                        {/* Order Received */}
                        <div className="flex items-center">
                          <div className="relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              displayStatus === 'pending' || displayStatus === 'pending_verification' || displayStatus === 'payment_confirmed' || displayStatus === 'preparing' || displayStatus === 'ready' || displayStatus === 'completed' || order.paymentStatus === 'paid'
                                ? 'bg-[#a87437] text-white' 
                                : 'bg-gray-300 text-gray-600'
                            }`}>
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="ml-4 flex-1">
                            <p className={`text-sm font-medium ${displayStatus === 'pending' || displayStatus === 'pending_verification' || displayStatus === 'payment_confirmed' || displayStatus === 'preparing' || displayStatus === 'ready' || displayStatus === 'completed' || order.paymentStatus === 'paid' ? 'text-[#a87437]' : 'text-gray-600'}`}>
                              Order Received
                            </p>
                            <p className="text-xs text-gray-500">Your order has been received and is being processed</p>
                          </div>
                        </div>

                        {/* Payment Confirmed */}
                        <div className="flex items-center">
                          <div className="relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              displayStatus === 'payment_confirmed' || 
                              displayStatus === 'preparing' || 
                              displayStatus === 'ready' || 
                              displayStatus === 'completed' || 
                              order.paymentStatus === 'paid'
                                ? 'bg-[#a87437] text-white' 
                                : 'bg-gray-300 text-gray-600'
                            }`}>
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="ml-4 flex-1">
                            <p className={`text-sm font-medium ${
                              displayStatus === 'payment_confirmed' || 
                              displayStatus === 'preparing' || 
                              displayStatus === 'ready' || 
                              displayStatus === 'completed' || 
                              order.paymentStatus === 'paid'
                                ? 'text-[#a87437]' : 'text-gray-600'
                            }`}>
                              Payment Confirmed
                            </p>
                            <p className="text-xs text-gray-500">Your payment has been verified and confirmed</p>
                          </div>
                        </div>

                        {/* Preparing */}
                        <div className="flex items-center">
                          <div className="relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              displayStatus === 'preparing' || 
                              displayStatus === 'ready' || 
                              displayStatus === 'completed'
                                ? 'bg-[#a87437] text-white' 
                                : 'bg-gray-300 text-gray-600'
                            }`}>
                              <Loader2 className={`h-4 w-4 ${displayStatus === 'preparing' ? 'animate-spin' : ''}`} />
                            </div>
                          </div>
                          <div className="ml-4 flex-1">
                            <p className={`text-sm font-medium ${
                              displayStatus === 'preparing' || 
                              displayStatus === 'ready' || 
                              displayStatus === 'completed'
                                ? 'text-[#a87437]' : 'text-gray-600'
                            }`}>
                              Preparing
                            </p>
                            <p className="text-xs text-gray-500">Your order is being prepared by our kitchen staff</p>
                          </div>
                        </div>

                        {/* Ready for Pickup */}
                        <div className="flex items-center">
                          <div className="relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              displayStatus === 'ready' || displayStatus === 'completed'
                                ? 'bg-[#a87437] text-white' 
                                : 'bg-gray-300 text-gray-600'
                            }`}>
                              <Package className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="ml-4 flex-1">
                            <p className={`text-sm font-medium ${displayStatus === 'ready' || displayStatus === 'completed' ? 'text-[#a87437]' : 'text-gray-600'}`}>
                              Ready for Pickup
                            </p>
                            <p className="text-xs text-gray-500">Your order is ready for pickup</p>
                          </div>
                        </div>

                        {/* Completed */}
                        <div className="flex items-center">
                          <div className="relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              displayStatus === 'completed'
                                ? 'bg-[#a87437] text-white' 
                                : 'bg-gray-300 text-gray-600'
                            }`}>
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="ml-4 flex-1">
                            <p className={`text-sm font-medium ${displayStatus === 'completed' ? 'text-[#a87437]' : 'text-gray-600'}`}>
                              Completed
                            </p>
                            <p className="text-xs text-gray-500">Order has been completed successfully</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
