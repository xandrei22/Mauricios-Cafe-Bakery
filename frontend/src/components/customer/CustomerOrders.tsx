import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { io, Socket } from 'socket.io-client';
import { CheckCircle, Clock, Coffee, Utensils, Bell, Calendar, X, Star, MessageSquare, Download, Upload, FileImage, Package, Loader2 } from 'lucide-react';
import './progress-bar.css';
import ProgressBar from '../ui/ProgressBar';
const CLIENT_PROFANITY_WORDS: string[] = [
  // Minimal built-in list for client-side UX only; server enforces full list
  'ass', 'bastard', 'bitch', 'bloody', 'bollocks', 'crap', 'cunt',
  'damn', 'dick', 'fuck', 'fucking', 'motherfucker', 'piss', 'prick',
  'shit', 'slut', 'twat', 'whore',
  // Add some Spanish/Tagalog commonly encountered words
  'puta', 'putangina', 'gago', 'ulol', 'punyeta', 'pakyu', 'putangina mo', 'bobo', 'bobo ka', 'bobo mo'
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CLIENT_PROFANITY_REGEXES = CLIENT_PROFANITY_WORDS
  .filter((word) => typeof word === 'string' && word.trim().length > 0)
  .map((word) => new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i'));

const containsProfanity = (text: string | null | undefined) => {
  if (!text || typeof text !== 'string' || CLIENT_PROFANITY_REGEXES.length === 0) return false;
  return CLIENT_PROFANITY_REGEXES.some((regex) => regex.test(text));
};

interface Order {
  id: string;
  order_id: string;
  order_number?: string;
  customer_name: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    customizations?: any;
  }>;
  total_price: string | number;
  status: 'pending' | 'pending_verification' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'pending_verification';
  payment_method?: 'cash' | 'gcash' | 'paymaya';
  order_type: 'dine_in' | 'takeout';
  table_number?: number;
  queue_position?: number;
  estimated_ready_time?: string;
  order_time: string;
  completed_time?: string;
  notes?: string;
}

interface StatusNotification {
  id: string;
  orderId: string;
  orderNumber?: string;
  status: Order['status'];
  previousStatus?: Order['status'];
  timestamp: number;
}

const CustomerOrders: React.FC = () => {
  const { loading, authenticated, user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAll, setShowAll] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedOrderForFeedback, setSelectedOrderForFeedback] = useState<Order | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('General');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [ordersWithFeedback, setOrdersWithFeedback] = useState<Set<string>>(new Set());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFileForModal, setReceiptFileForModal] = useState<File | null>(null);
  const [receiptPreviewForModal, setReceiptPreviewForModal] = useState<string | null>(null);
  const [uploadingReceiptForModal, setUploadingReceiptForModal] = useState(false);
  const [statusNotifications, setStatusNotifications] = useState<StatusNotification[]>([]);
  const [paymentConfirmedTimes, setPaymentConfirmedTimes] = useState<Record<string, Date>>({});
  const statusHistoryRef = useRef<Record<string, Order['status']>>({});
  const paymentStatusHistoryRef = useRef<Record<string, Order['payment_status']>>({});
  const progressHistoryRef = useRef<Record<string, number>>({});
  const notificationsInitializedRef = useRef(false);
  const notificationTimeoutsRef = useRef<Record<string, number>>({});
  const audioContextRef = useRef<AudioContext | null>(null);

  const formatStatusLabel = useCallback((status?: Order['status']) => {
    if (!status) return 'Pending';
    return status
      .toString()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }, []);

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

      // Create a pleasant notification sound (two-tone chime) - matching guest tracking
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

  const showBrowserNotification = useCallback(
    (order: Order, previousStatus?: Order['status']) => {
      if (typeof window === 'undefined' || typeof Notification === 'undefined') return;

      const title = 'Order Status Updated';
      const body = previousStatus
        ? `Order ${order.order_number || order.order_id} is now ${formatStatusLabel(order.status)} (was ${formatStatusLabel(previousStatus)}).`
        : `Order ${order.order_number || order.order_id} status changed to ${formatStatusLabel(order.status)}.`;

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
    },
    [formatStatusLabel]
  );

  const removeNotification = useCallback((id: string) => {
    setStatusNotifications((prev) => prev.filter((notification) => notification.id !== id));
    if (typeof window !== 'undefined') {
      const timeoutId = notificationTimeoutsRef.current[id];
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        delete notificationTimeoutsRef.current[id];
      }
    }
  }, []);

  const enqueueStatusNotification = useCallback(
    (order: Order, previousStatus?: Order['status']) => {
      // Deduplication: Check if we already have a notification for this order+status combination
      // Only show one notification per status change
      setStatusNotifications((prev) => {
        // Check if a notification with the same order_id and status already exists
        const existingNotification = prev.find(
          (n) => n.orderId === order.order_id && n.status === order.status
        );
        
        // If a notification for this exact status already exists, don't add another one
        if (existingNotification) {
          console.log('🔔 Notification already exists for order', order.order_id, 'status', order.status);
          return prev;
        }
        
        // Otherwise, add the new notification
        const notificationId = `${order.order_id}-${order.status}-${Date.now()}`;
        const newNotification = {
          id: notificationId,
          orderId: order.order_id,
          orderNumber: order.order_number || order.order_id,
          status: order.status,
          previousStatus,
          timestamp: Date.now()
        };
        
        // Show browser notification for the new notification
        // Note: Sound is played in the useEffect that processes updates to avoid duplicates
        showBrowserNotification(order, previousStatus);
        
        // Set timeout to remove notification
        if (typeof window !== 'undefined') {
          const timeoutId = window.setTimeout(() => removeNotification(notificationId), 8000);
          notificationTimeoutsRef.current[notificationId] = timeoutId;
        }
        
        return [...prev, newNotification];
      });
    },
    [playNotificationSound, showBrowserNotification, removeNotification]
  );

  const commentContainsProfanity = useMemo(
    () => containsProfanity(feedbackComment.trim()),
    [feedbackComment]
  );
  const categoryContainsProfanity = useMemo(
    () => containsProfanity(feedbackCategory.trim()),
    [feedbackCategory]
  );

  // Handle custom order placed event
  const handleOrderPlaced = (event: CustomEvent) => {
    console.log('🛒 Order placed event received:', event.detail);
    fetchOrders(); // Refresh orders data
  };

  // Ask for browser notification permission (if supported)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Prepare audio so sounds can play after the first user interaction, even on mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeAudio = async () => {
      const AudioConstructor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioConstructor && !audioContextRef.current) {
        try {
          audioContextRef.current = new AudioConstructor();
          // Resume AudioContext if suspended (required for autoplay policies)
          if (audioContextRef.current.state === 'suspended') {
            try {
              await audioContextRef.current.resume();
            } catch (error) {
              console.warn('Failed to resume AudioContext:', error);
            }
          }
        } catch (error) {
          console.warn('Failed to create AudioContext:', error);
        }
      }
    };

    // Initialize on any user interaction
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, initializeAudio, { once: true });
    });

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close?.().catch(() => {});
      }
      if (typeof window !== 'undefined') {
        Object.values(notificationTimeoutsRef.current).forEach((timeoutId) => {
          window.clearTimeout(timeoutId);
        });
      }
      events.forEach(event => {
        document.removeEventListener(event, initializeAudio);
      });
    };
  }, []);

  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const updates: Array<{ order: Order; previousStatus?: Order['status'] }> = [];
    const progressUpdates: Array<{ orderId: string; oldProgress: number; newProgress: number }> = [];

    orders.forEach((order) => {
      const previousStatus = statusHistoryRef.current[order.order_id];
      const previousPaymentStatus = paymentStatusHistoryRef.current[order.order_id];
      const currentPaymentStatus = order.payment_status || (order as any).payment_status;
      
      // Calculate current progress using the EXACT same logic as getRealtimeProgress
      // This ensures consistency between progress tracking and display
      const status = String(order.status || 'pending');
      const paymentStatus = String(currentPaymentStatus || 'pending');
      const normalizedStatus = status.toLowerCase().trim();
      const normalizedPaymentStatus = paymentStatus.toLowerCase().trim();
      
      let currentProgress = 0;
      
      // Handle cancelled orders first
      if (normalizedStatus === 'cancelled') {
        currentProgress = 0;
      }
      // Step 1: Order Received (20%) or Payment Confirmed (40%)
      else if (normalizedStatus === 'pending' || normalizedStatus === 'pending_verification') {
        // If payment is already paid, we're at payment confirmed stage (40%)
        if (normalizedPaymentStatus === 'paid') {
          currentProgress = 40;
        } else {
          // Otherwise, order is just received (20%)
          currentProgress = 20;
        }
      }
      // Step 2: Payment Confirmed (40%)
      else if (normalizedStatus === 'confirmed' || normalizedStatus === 'payment_confirmed') {
        currentProgress = 40;
      }
      // IMPORTANT: If payment is paid but status hasn't updated yet, we're at 40%
      else if (normalizedPaymentStatus === 'paid' && (normalizedStatus === 'pending' || normalizedStatus === 'pending_verification')) {
        currentProgress = 40;
      }
      // Step 3: Preparing (60%)
      else if (normalizedStatus === 'processing' || normalizedStatus === 'preparing') {
        currentProgress = 60;
      }
      // Step 4: Ready (80%)
      // BUT: Only show 80% if payment has been verified (we've passed 40%)
      else if (normalizedStatus === 'ready') {
        // If payment is not verified yet, we shouldn't be at ready stage
        // But if we are, check if we've passed payment confirmation
        if (normalizedPaymentStatus === 'paid' || normalizedStatus === 'payment_confirmed') {
          currentProgress = 80;
        } else {
          // Payment not verified but status is ready - show 40% to indicate payment needed
          currentProgress = 40;
        }
      }
      // Step 5: Completed (100%)
      else if (normalizedStatus === 'completed') {
        currentProgress = 100;
      }
      // Default: if payment is paid, assume we're at payment confirmed (40%)
      else if (normalizedPaymentStatus === 'paid') {
        currentProgress = 40;
      }
      // Otherwise, assume order is just received (20%)
      else {
        currentProgress = 20;
      }
      
      const previousProgress = progressHistoryRef.current[order.order_id] ?? 0;
      
      // Track progress changes - play sound when progress increases (IMPORTANT)
      if (currentProgress !== previousProgress && currentProgress > previousProgress) {
        progressUpdates.push({
          orderId: order.order_id,
          oldProgress: previousProgress,
          newProgress: currentProgress
        });
        console.log('📊 Progress changed:', {
          orderId: order.order_id,
          oldProgress: previousProgress,
          newProgress: currentProgress,
          status: order.status,
          payment_status: currentPaymentStatus
        });
      }
      
      // Track status changes
      if (previousStatus && previousStatus !== order.status) {
        updates.push({ order, previousStatus });
      }
      
      // Track payment status changes - trigger notification when payment is verified
      if (previousPaymentStatus !== currentPaymentStatus) {
        // If payment just changed to 'paid', trigger notification even if status hasn't changed
        if (currentPaymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
          console.log('💳 Payment verified for order:', order.order_id, 'Previous:', previousPaymentStatus, 'Current:', currentPaymentStatus);
          // Always add payment verification notification, even if status update exists
          // This ensures users are notified when payment is verified
          const hasStatusUpdate = updates.some(u => u.order.order_id === order.order_id);
          if (!hasStatusUpdate) {
            updates.push({ order, previousStatus });
          } else {
            // If status update exists, still add payment notification separately
            // Create a modified order object to indicate payment verification
            updates.push({ 
              order: { ...order, status: order.status || 'payment_confirmed' as Order['status'] }, 
              previousStatus 
            });
          }
          // IMPORTANT: Also trigger progress update sound for payment verification
          // When payment changes to 'paid', progress should go from 20% to 40%
          const progressBeforePayment = previousPaymentStatus === 'paid' ? 40 : 20;
          const progressAfterPayment = 40;
          if (progressAfterPayment > progressBeforePayment) {
            progressUpdates.push({
              orderId: order.order_id,
              oldProgress: progressBeforePayment,
              newProgress: progressAfterPayment
            });
            console.log('💳 Payment verification progress update:', {
              orderId: order.order_id,
              oldProgress: progressBeforePayment,
              newProgress: progressAfterPayment
            });
          }
        }
      }
      
      statusHistoryRef.current[order.order_id] = order.status;
      paymentStatusHistoryRef.current[order.order_id] = currentPaymentStatus;
      progressHistoryRef.current[order.order_id] = currentProgress;
    });

    // Play sound for progress changes (IMPORTANT - this is what the user wants)
    // Play sound even on first initialization if progress > 0 (for new orders)
    if (progressUpdates.length > 0) {
      progressUpdates.forEach(({ orderId, oldProgress, newProgress }, index) => {
        console.log('🔔 Playing sound for progress change:', orderId, oldProgress, '->', newProgress);
        // Small delay to ensure audio context is ready, with staggered delays for multiple updates
        setTimeout(() => {
          playNotificationSound();
        }, 100 + (index * 50));
      });
    }

    if (!notificationsInitializedRef.current) {
      notificationsInitializedRef.current = true;
      // For new orders, play sound if progress > 0
      orders.forEach((order) => {
        const progress = progressHistoryRef.current[order.order_id] || 0;
        if (progress > 0) {
          setTimeout(() => {
            playNotificationSound();
          }, 200);
        }
      });
      return;
    }

    // Process all updates and play sound for each
    updates.forEach(({ order, previousStatus }) => {
      // Play sound for each status change
      setTimeout(() => {
        playNotificationSound();
      }, 100);
      enqueueStatusNotification(order, previousStatus);
    });
  }, [orders, enqueueStatusNotification, playNotificationSound]);

  useEffect(() => {
    console.log('🔍 CustomerOrders useEffect triggered:');
    console.log('  - loading:', loading);
    console.log('  - authenticated:', authenticated);
    console.log('  - user?.email:', user?.email);
    
    if (!loading && !authenticated) {
      console.log('❌ Not authenticated, redirecting to login');
      navigate("/customer-login");
    } else if (authenticated && user?.email) {
      console.log('✅ Authenticated, fetching orders for:', user.email);
      
      // Initialize Socket.IO connection for real-time updates
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const newSocket = io(API_URL, {
        transports: ['websocket', 'polling'],
        withCredentials: false,
        timeout: 30000,
        forceNew: true,
        autoConnect: true
      });
      setSocket(newSocket);

      // Join customer room for real-time updates
      console.log('🔌 Joining customer room with email:', user.email);
      const joinRoom = () => {
        if (newSocket.connected && user.email) {
          // Normalize email to lowercase for consistent room naming
          const normalizedEmail = String(user.email).toLowerCase().trim();
          newSocket.emit('join-customer-room', { customerEmail: normalizedEmail });
          console.log('🔌 Emitted join-customer-room with normalized email:', normalizedEmail);
        } else {
          console.warn('🔌 Cannot join room - socket not connected or no email');
        }
      };
      joinRoom();

      // Listen for real-time updates - automatic refresh
      newSocket.on('order-updated', (updateData) => {
        console.log('📡 Order updated received:', updateData);
        console.log('🔄 Processing order-updated event - updating state immediately');
        console.log('📡 Current orders in state:', orders.map(o => ({ order_id: o.order_id, id: o.id, status: o.status, payment_status: o.payment_status })));
        
        // Update status history for tracking changes
        if (updateData.orderId || updateData.internalOrderId) {
          const orderIdKey = updateData.orderId || updateData.internalOrderId;
          if (updateData.status) {
            statusHistoryRef.current[orderIdKey] = updateData.status as Order['status'];
          }
          // Also track payment status changes
          if (updateData.paymentStatus) {
            paymentStatusHistoryRef.current[orderIdKey] = updateData.paymentStatus as Order['payment_status'];
          }
        }
        
        // CRITICAL: Optimistically update the order in state IMMEDIATELY
        // This matches guest tracking behavior - update state first, then optionally refetch
        // IMPORTANT: Process update even if only paymentStatus is provided (payment verification)
        if (updateData.orderId || updateData.internalOrderId) {
          setOrders(prevOrders => {
            console.log('🔍 Checking', prevOrders.length, 'orders for match with update:', {
              updateOrderId: updateData.orderId,
              updateInternalOrderId: updateData.internalOrderId,
              updateStatus: updateData.status,
              updatePaymentStatus: updateData.paymentStatus
            });
            
            let updated = false;
            const updatedOrders = prevOrders.map(order => {
              // Enhanced matching: try multiple ID formats
              const updateOrderId = updateData.orderId || updateData.internalOrderId;
              const matches = 
                order.order_id === updateOrderId || 
                order.id === updateOrderId ||
                order.order_id === updateData.orderId ||
                order.id === updateData.orderId ||
                order.order_id === updateData.internalOrderId ||
                order.id === updateData.internalOrderId ||
                String(order.order_id).includes(String(updateOrderId)) ||
                String(order.id).includes(String(updateOrderId)) ||
                String(order.order_id).includes(String(updateData.orderId || '')) ||
                String(order.id).includes(String(updateData.orderId || ''));
              
              if (matches) {
                console.log('✅ Found matching order:', {
                  order_id: order.order_id,
                  id: order.id,
                  current_status: order.status,
                  current_payment_status: order.payment_status
                });
                updated = true;
                const oldPaymentStatus = order.payment_status || (order as any).paymentStatus;
                const oldStatus = order.status;
                // IMPORTANT: Always use updateData.paymentStatus if provided, otherwise keep existing
                const newPaymentStatus = updateData.paymentStatus !== undefined && updateData.paymentStatus !== null 
                                       ? updateData.paymentStatus 
                                       : oldPaymentStatus;
                const paymentStatusChanged = oldPaymentStatus !== newPaymentStatus;
                
                // CRITICAL FIX: When payment is verified, ALWAYS update status to 'payment_confirmed'
                // This ensures the transition from any status (pending_verification, confirmed, pending, etc.) to 'payment_confirmed' works correctly
                let newStatus = updateData.status !== undefined && updateData.status !== null 
                              ? updateData.status 
                              : order.status;
                
                // If payment status changed to 'paid', ALWAYS set status to 'payment_confirmed'
                // This matches the guest tracking behavior - immediate status update
                if (paymentStatusChanged && newPaymentStatus === 'paid' && oldPaymentStatus !== 'paid') {
                  // Always update to payment_confirmed when payment is verified, regardless of current status
                  newStatus = 'payment_confirmed';
                  console.log('💳 CRITICAL: Payment verified - updating status from', oldStatus, 'to payment_confirmed');
                } else if (newPaymentStatus === 'paid' && newStatus !== 'payment_confirmed' && newStatus !== 'preparing' && newStatus !== 'ready' && newStatus !== 'completed') {
                  // If payment is already paid but status is not yet payment_confirmed or beyond, update it
                  // This handles cases where the status might not have been set correctly
                  newStatus = 'payment_confirmed';
                  console.log('💳 CRITICAL: Payment is paid but status incorrect - updating to payment_confirmed');
                }
                
                const statusChanged = oldStatus !== newStatus;
                
                console.log('✅ IMMEDIATELY updating order in state (order-updated):', {
                  order_id: order.order_id,
                  updateOrderId: updateOrderId,
                  updateData_orderId: updateData.orderId,
                  updateData_internalOrderId: updateData.internalOrderId,
                  old_status: oldStatus,
                  new_status: newStatus,
                  old_payment_status: oldPaymentStatus,
                  new_payment_status: newPaymentStatus,
                  updateData_paymentStatus: updateData.paymentStatus,
                  updateData_status: updateData.status,
                  paymentStatusChanged,
                  statusChanged
                });
                
                // If payment status changed to 'paid', this is a critical update
                if (paymentStatusChanged && newPaymentStatus === 'paid' && oldPaymentStatus !== 'paid') {
                  console.log('💳 CRITICAL: Payment verified - IMMEDIATELY updating to 40% progress');
                  // Track payment confirmation time for delay logic
                  const orderIdKey = updateOrderId || order.order_id || order.id;
                  if (orderIdKey) {
                    setPaymentConfirmedTimes(prev => ({
                      ...prev,
                      [String(orderIdKey)]: new Date()
                    }));
                  }
                  // Force component re-render to update progress bar immediately
                  setForceUpdate(prev => prev + 1);
                  // Force another update to ensure UI reflects the change
                  setTimeout(() => setForceUpdate(prev => prev + 1), 50);
                }
                
                // Also force re-render if status changed
                if (statusChanged) {
                  console.log('🔄 Status changed from', oldStatus, 'to', newStatus, '- forcing re-render');
                  setForceUpdate(prev => prev + 1);
                  // Force another update to ensure UI reflects the change
                  setTimeout(() => setForceUpdate(prev => prev + 1), 50);
                }
                
                // If status changed to payment_confirmed, force immediate re-render
                if (statusChanged && newStatus === 'payment_confirmed') {
                  console.log('💳 CRITICAL: Status changed to payment_confirmed - forcing immediate UI update');
                  setForceUpdate(prev => prev + 1);
                }
                
                return {
                  ...order,
                  status: newStatus,
                  payment_status: newPaymentStatus,
                  // Also set paymentStatus alias for compatibility
                  paymentStatus: newPaymentStatus,
                  payment_method: updateData.paymentMethod !== undefined ? updateData.paymentMethod : order.payment_method
                };
              }
              return order;
            });
            
            if (updated) {
              console.log('✅ Order state updated optimistically - UI should update IMMEDIATELY');
              console.log('✅ Updated orders:', updatedOrders.map(o => ({ 
                order_id: o.order_id, 
                status: o.status, 
                payment_status: o.payment_status 
              })));
            } else {
              console.warn('⚠️ No matching order found for update:', {
                updateData_orderId: updateData.orderId,
                updateData_internalOrderId: updateData.internalOrderId,
                updateData_status: updateData.status,
                updateData_paymentStatus: updateData.paymentStatus,
                availableOrderIds: prevOrders.map(o => ({ order_id: o.order_id, id: o.id, status: o.status }))
              });
              // If no match found but we have an orderId, try to refetch orders
              if (updateData.orderId || updateData.internalOrderId) {
                console.log('🔄 No match found, will refetch orders to sync');
                setTimeout(() => {
                  fetchOrders();
                }, 500);
              }
            }
            
            return updatedOrders;
          });
        }
        
        // IMPORTANT: Don't immediately fetch - let the optimistic update take effect first
        // Only refetch after a delay to sync with backend, but the UI should already be updated
        setTimeout(() => {
          console.log('🔄 Refetching orders to sync with backend (UI already updated)');
          fetchOrders();
        }, 1000);
      });

      newSocket.on('payment-updated', (paymentData) => {
        console.log('💳 Payment updated received:', paymentData);
        console.log('🔄 Processing payment-updated event - updating state IMMEDIATELY');
        
        // Update status history for tracking changes
        if (paymentData.orderId || paymentData.internalOrderId) {
          const orderIdKey = paymentData.orderId || paymentData.internalOrderId;
          const newStatus = (paymentData.status || 'payment_confirmed') as Order['status'];
          statusHistoryRef.current[orderIdKey] = newStatus;
          // Also track payment status changes
          if (paymentData.paymentStatus) {
            paymentStatusHistoryRef.current[orderIdKey] = paymentData.paymentStatus as Order['payment_status'];
          }
        }
        
        // CRITICAL: Optimistically update the order in state IMMEDIATELY
        // This matches guest tracking behavior - update state first, then optionally refetch
        if ((paymentData.orderId || paymentData.internalOrderId) && (paymentData.status || paymentData.paymentStatus)) {
          setOrders(prevOrders => {
            let updated = false;
            const updatedOrders = prevOrders.map(order => {
              // Enhanced matching: try multiple ID formats
              const updateOrderId = paymentData.orderId || paymentData.internalOrderId;
              const matches = 
                order.order_id === updateOrderId || 
                order.id === updateOrderId ||
                order.order_id === paymentData.orderId ||
                order.id === paymentData.orderId ||
                order.order_id === paymentData.internalOrderId ||
                order.id === paymentData.internalOrderId ||
                String(order.order_id).includes(String(updateOrderId)) ||
                String(order.id).includes(String(updateOrderId)) ||
                String(order.order_id).includes(String(paymentData.orderId || '')) ||
                String(order.id).includes(String(paymentData.orderId || ''));
              
              if (matches) {
                updated = true;
                const oldPaymentStatus = order.payment_status || (order as any).paymentStatus;
                const oldStatus = order.status;
                // IMPORTANT: Always use paymentData.paymentStatus if provided, otherwise keep existing
                const newPaymentStatus = paymentData.paymentStatus !== undefined && paymentData.paymentStatus !== null 
                                       ? paymentData.paymentStatus 
                                       : oldPaymentStatus;
                const paymentStatusChanged = oldPaymentStatus !== newPaymentStatus;
                
                // CRITICAL FIX: When payment is verified, ALWAYS update status to 'payment_confirmed'
                // This ensures the transition from any status (pending_verification, confirmed, pending, etc.) to 'payment_confirmed' works correctly
                let newStatus = paymentData.status !== undefined && paymentData.status !== null 
                              ? paymentData.status 
                              : order.status;
                
                // If payment status changed to 'paid', ALWAYS set status to 'payment_confirmed'
                // This matches the guest tracking behavior - immediate status update
                if (paymentStatusChanged && newPaymentStatus === 'paid' && oldPaymentStatus !== 'paid') {
                  // Always update to payment_confirmed when payment is verified, regardless of current status
                  newStatus = 'payment_confirmed';
                  console.log('💳 CRITICAL: Payment verified via payment-updated - updating status from', oldStatus, 'to payment_confirmed');
                } else if (newPaymentStatus === 'paid' && newStatus !== 'payment_confirmed' && newStatus !== 'preparing' && newStatus !== 'ready' && newStatus !== 'completed') {
                  // If payment is already paid but status is not yet payment_confirmed or beyond, update it
                  // This handles cases where the status might not have been set correctly
                  newStatus = 'payment_confirmed';
                  console.log('💳 CRITICAL: Payment is paid but status incorrect - updating to payment_confirmed');
                }
                
                const statusChanged = oldStatus !== newStatus;
                
                console.log('✅ IMMEDIATELY updating order payment in state (payment-updated):', {
                  order_id: order.order_id,
                  updateOrderId: updateOrderId,
                  paymentData_orderId: paymentData.orderId,
                  paymentData_internalOrderId: paymentData.internalOrderId,
                  old_payment_status: oldPaymentStatus,
                  new_payment_status: newPaymentStatus,
                  paymentData_paymentStatus: paymentData.paymentStatus,
                  old_status: oldStatus,
                  new_status: newStatus,
                  paymentData_status: paymentData.status,
                  paymentStatusChanged,
                  statusChanged
                });
                
                // If payment status changed to 'paid', this is a critical update
                if (paymentStatusChanged && newPaymentStatus === 'paid' && oldPaymentStatus !== 'paid') {
                  console.log('💳 CRITICAL: Payment verified via payment-updated - IMMEDIATELY updating to 40% progress');
                  // Track payment confirmation time for delay logic
                  const orderIdKey = updateOrderId || order.order_id || order.id;
                  if (orderIdKey) {
                    setPaymentConfirmedTimes(prev => ({
                      ...prev,
                      [String(orderIdKey)]: new Date()
                    }));
                  }
                  // Force component re-render to update progress bar immediately
                  setForceUpdate(prev => prev + 1);
                  // Force another update to ensure UI reflects the change
                  setTimeout(() => setForceUpdate(prev => prev + 1), 50);
                }
                
                // Also force re-render if status changed
                if (statusChanged) {
                  console.log('🔄 Status changed from', oldStatus, 'to', newStatus, '- forcing re-render');
                  setForceUpdate(prev => prev + 1);
                  // Force another update to ensure UI reflects the change
                  setTimeout(() => setForceUpdate(prev => prev + 1), 50);
                }
                
                // If status changed to payment_confirmed, force immediate re-render
                if (statusChanged && newStatus === 'payment_confirmed') {
                  console.log('💳 CRITICAL: Status changed to payment_confirmed - forcing immediate UI update');
                  setForceUpdate(prev => prev + 1);
                }
                
                return {
                  ...order,
                  status: newStatus,
                  payment_status: newPaymentStatus,
                  // Also set paymentStatus alias for compatibility
                  paymentStatus: newPaymentStatus,
                  payment_method: paymentData.paymentMethod !== undefined ? paymentData.paymentMethod : order.payment_method
                };
              }
              return order;
            });
            
            if (updated) {
              console.log('✅ Order payment state updated optimistically - UI should update IMMEDIATELY');
              // If payment was verified, log it
              const paymentChanged = updatedOrders.find(o => {
                const updateOrderId = paymentData.orderId || paymentData.internalOrderId;
                return (o.order_id === updateOrderId || o.id === updateOrderId) && o.payment_status === 'paid';
              });
              if (paymentChanged) {
                console.log('💳 CRITICAL: Payment verified - progress should update to 40% IMMEDIATELY');
              }
            } else {
              console.warn('⚠️ No matching order found for payment update:', {
                paymentData_orderId: paymentData.orderId,
                paymentData_internalOrderId: paymentData.internalOrderId,
                availableOrderIds: prevOrders.map(o => ({ order_id: o.order_id, id: o.id }))
              });
            }
            
            return updatedOrders;
          });
        }
        
        // IMPORTANT: Don't immediately fetch - let the optimistic update take effect first
        // Only refetch after a delay to sync with backend, but the UI should already be updated
        setTimeout(() => {
          console.log('🔄 Refetching orders to sync with backend (UI already updated)');
          fetchOrders();
        }, 1000);
      });

      // Listen for new order events
      newSocket.on('new-order-received', (orderData) => {
        console.log('🆕 New order received:', orderData);
        console.log('🔄 Auto-refreshing orders due to new-order-received event');
        // Immediately fetch fresh data
        fetchOrders();
      });

      // Listen for any WebSocket events for debugging
      newSocket.onAny((eventName, ...args) => {
        console.log('🔌 WebSocket event received:', eventName, args);
      });

      // Listen for custom order placed event (from checkout)
      window.addEventListener('orderPlaced', handleOrderPlaced as EventListener);

      // Add connection status logging
      newSocket.on('connect', () => {
        console.log('🔌 Customer WebSocket connected');
        joinRoom();
      });
      newSocket.io.on('reconnect', () => {
        console.log('🔄 Customer WebSocket reconnected');
        joinRoom();
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Customer WebSocket disconnected');
      });

      newSocket.on('connect_error', (error) => {
        console.error('🔌 WebSocket connection error:', error);
      });

      // Listen for test event to confirm room joining
      newSocket.on('test-customer-room', (data) => {
        console.log('✅ Customer room test event received:', data);
      });

      // Initial fetch
      fetchOrders();
      
      // Set up polling fallback in case socket connection fails
      const pollingInterval = setInterval(() => {
        if (newSocket && !newSocket.connected) {
          console.log('⚠️ Socket not connected, using polling fallback');
          fetchOrders();
        }
      }, 10000); // Poll every 10 seconds if socket is disconnected
      
      // Store interval ID for cleanup
      (newSocket as any).pollingInterval = pollingInterval;
    } else if (loading) {
      console.log('⏳ Still loading authentication...');
    } else {
      console.log('❓ Unexpected state - loading:', loading, 'authenticated:', authenticated, 'user:', user);
    }

    return () => {
      if (socket) {
        // Clear polling interval if it exists
        if ((socket as any).pollingInterval) {
          clearInterval((socket as any).pollingInterval);
        }
        try { socket.removeAllListeners && socket.removeAllListeners(); } catch {}
        socket.close();
      }
      // Clean up custom event listener
      window.removeEventListener('orderPlaced', handleOrderPlaced as EventListener);
    };
  }, [loading, authenticated, user?.email]); // Changed from 'user' to 'user?.email'

  // Clear payment confirmed times after delay period and force re-renders
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPaymentConfirmedTimes(prev => {
        const updated: Record<string, Date> = {};
        let hasChanges = false;
        
        Object.entries(prev).forEach(([orderId, confirmedTime]) => {
          const timeSincePaymentConfirmed = now - confirmedTime.getTime();
          if (timeSincePaymentConfirmed < 4000) {
            updated[orderId] = confirmedTime;
          } else {
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          setForceUpdate(prev => prev + 1);
        }
        
        return Object.keys(updated).length > 0 ? updated : {};
      });
    }, 100); // Update every 100ms for smooth transition
    
    return () => clearInterval(interval);
  }, []);

  // Watch for order changes and update selected order automatically
  useEffect(() => {
    if (orders.length > 0) {
      const currentOrder = getCurrentOrder();
      if (currentOrder) {
        // Only update if the order actually changed
        if (!selectedOrder ||
            selectedOrder.order_id !== currentOrder.order_id ||
            selectedOrder.status !== currentOrder.status) {
          console.log('🔄 Auto-updating selected order with new data:', currentOrder);
          setSelectedOrder(currentOrder);
        }
      } else if (selectedOrder) {
        // No current order, clear selected order
        setSelectedOrder(null);
      }
    } else if (selectedOrder) {
      setSelectedOrder(null);
    }
    
    // Reset pagination when orders change
    setCurrentPage(1);
  }, [orders]);

  const fetchOrders = async () => {
    try {
      console.log('🔍 fetchOrders called');
      console.log('  - user:', user);
      console.log('  - user?.email:', user?.email);
      console.log('  - user?.name:', user?.name);
      
      if (!user || !user.email) {
        console.log('❌ No user or user email found');
        return;
      }
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const url = `${API_URL}/api/customer/orders/${user.email}`;
      console.log('  - API URL:', url);
      
      // Include JWT token in Authorization header
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, { 
        credentials: 'omit', // JWT-only: No cookies needed
        headers: headers
      });
      console.log('  - Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('  - API Response:', data);
        
        if (data.success) {
          const sortedOrders = (data.orders || []).sort((a: Order, b: Order) => 
            new Date(b.order_time).getTime() - new Date(a.order_time).getTime()
          );
          console.log('  - Sorted orders:', sortedOrders);
          console.log('  - Orders count:', sortedOrders.length);
          
          // If no orders found, try alternative approach
          if (sortedOrders.length === 0) {
            console.log('⚠️ No orders found via customer API, trying test endpoint...');
            // Try the test endpoint first
            try {
              const testResponse = await fetch(`${API_URL}/api/customer/test-orders/${user.email}`, { credentials: 'omit' });
              if (testResponse.ok) {
                const testData = await testResponse.json();
                console.log('  - Test endpoint response:', testData);
                if (testData.success && testData.orders.length > 0) {
                  console.log('  - Test endpoint found orders:', testData.orders.length);
                  const ordersWithPaymentStatus = testData.orders.map((order: any) => ({
                    ...order,
                    payment_status: order.payment_status || order.paymentStatus || 'pending'
                  }));
                  setOrders(ordersWithPaymentStatus);
                  return;
                }
              }
            } catch (testError) {
              console.log('  - Test endpoint failed:', testError);
            }
            
            // Try fetching all orders and filtering client-side as fallback
            try {
              const altResponse = await fetch(`${API_URL}/api/orders`, { credentials: 'omit' });
              if (altResponse.ok) {
                const altData = await altResponse.json();
                if (altData.success) {
                  const filteredOrders = (altData.orders || []).filter((order: any) => 
                    order.customer_name === user.name || 
                    order.customer_name === user.email ||
                    order.customer_name?.includes(user.email?.split('@')[0])
                  );
                  console.log('  - Alternative orders found:', filteredOrders.length);
                  if (filteredOrders.length > 0) {
                    const ordersWithPaymentStatus = filteredOrders.map((order: any) => ({
                      ...order,
                      payment_status: order.payment_status || order.paymentStatus || 'pending'
                    }));
                    setOrders(ordersWithPaymentStatus);
                    return;
                  }
                }
              }
            } catch (altError) {
              console.log('  - Alternative fetch failed:', altError);
            }
          }
          
          // Debug status values
          sortedOrders.forEach((order: Order, index: number) => {
            console.log(`🔍 CustomerOrders - Order ${index + 1} status:`, order.status, typeof order.status);
            console.log(`🔍 CustomerOrders - Order ${index + 1} payment_status:`, order.payment_status);
            console.log(`🔍 CustomerOrders - Order ${index + 1} payment_method:`, order.payment_method);
            console.log(`🔍 CustomerOrders - Order ${index + 1} table_number:`, order.table_number);
            console.log(`🔍 CustomerOrders - Order ${index + 1} order_time:`, order.order_time);
            console.log(`🔍 CustomerOrders - Order ${index + 1} isActive:`, isActiveStatus(order.status));
            console.log(`🔍 CustomerOrders - Order ${index + 1} isRecent:`, isRecentOrder(order.order_time));
          });
          
          // Ensure payment_status is properly mapped for all orders
          const ordersWithPaymentStatus = sortedOrders.map((order: any) => {
            // Check multiple possible field names for payment_status
            // Priority: payment_status > paymentStatus > default to 'pending'
            const paymentStatus = order.payment_status || order.paymentStatus || 'pending';
            console.log('🔍 Mapping payment_status for order:', {
              order_id: order.order_id,
              payment_status: order.payment_status,
              paymentStatus: order.paymentStatus,
              final_payment_status: paymentStatus
            });
            return {
              ...order,
              payment_status: paymentStatus,
              // Also ensure paymentStatus alias exists for compatibility
              paymentStatus: paymentStatus
            };
          });
          
          console.log('🔍 Orders with payment_status:', ordersWithPaymentStatus.map((o: any) => ({
            order_id: o.order_id,
            status: o.status,
            payment_status: o.payment_status
          })));
          
          setOrders(ordersWithPaymentStatus);
          
          // Only update selectedOrder when it actually changes
          const currentOrders = sortedOrders.filter((order: Order) => {
            // Never treat cancelled orders as active/current
            if (order.status === 'cancelled') return false;
            
            const isActive = isActiveStatus(order.status, (order as any).payment_status);
            const isRecent = isRecentOrder(order.order_time);
            
            // Always show pending/pending_verification orders regardless of age
            if (
              order.status === 'pending' ||
              order.status === 'pending_verification' ||
              (order as any).payment_status === 'pending' ||
              (order as any).payment_status === 'pending_verification'
            ) {
              console.log(`✅ Order ${order.order_id} included (pending/pending_verification):`, order.status);
              return true;
            }
            
            // For other active statuses, only show if recent
            const shouldShow = isActive && isRecent;
            console.log(`🔍 Order ${order.order_id} filtering:`, {
              status: order.status,
              isActive,
              isRecent,
              shouldShow
            });
            return shouldShow;
          });
          const activeOrder = currentOrders.length > 0 ? currentOrders[0] : null;
          
          console.log(`🔍 Current orders found:`, currentOrders.length);
          console.log(`🔍 Active order selected:`, activeOrder);
          
          if (activeOrder) {
            if (!selectedOrder ||
                selectedOrder.order_id !== activeOrder.order_id ||
                selectedOrder.status !== activeOrder.status) {
              setSelectedOrder(activeOrder);
              console.log('  - Selected active order:', activeOrder);
            }
          } else if (selectedOrder) {
            setSelectedOrder(null);
            console.log('  - No active order found; selectedOrder cleared');
          }
        } else {
          console.error('Failed to fetch orders:', data.message);
        }
      } else {
        console.error('API call failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Real-time progress that animates between phases based on elapsed time since order_time
  const [nowTs, setNowTs] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute display status with automatic transition from payment confirmed to preparing
  const getDisplayStatus = (order: Order | null | undefined): string => {
    if (!order) return 'pending';
    const status = String(order.status || 'pending');
    const orderId = order.order_id || (order as any).orderId || '';
    const paymentStatus = String(
      order.payment_status || 
      (order as any).payment_status || 
      (order as any).paymentStatus || 
      'pending'
    );
    
    const normalizedStatus = status.toLowerCase().trim();
    const normalizedPaymentStatus = paymentStatus.toLowerCase().trim();
    
    // Only apply automatic transition if payment was just confirmed
    if (paymentConfirmedTimes[orderId] && normalizedPaymentStatus === 'paid') {
      // Use nowTs to ensure re-renders happen when time updates
      const timeSincePaymentConfirmed = nowTs - paymentConfirmedTimes[orderId].getTime();
      const transitionDelay = 4000; // 4 seconds (within 3-5 second range) before transitioning to preparing
      
      // If status is payment_confirmed or confirmed, check if we should transition to preparing
      if (normalizedStatus === 'payment_confirmed' || normalizedStatus === 'confirmed') {
        // After 4 seconds, automatically transition to preparing
        if (timeSincePaymentConfirmed >= transitionDelay) {
          return 'preparing';
        }
        // Before 4 seconds, still show payment_confirmed
        return status;
      }
      
      // If status is already preparing or ready, and we're still within the transition period
      // Keep showing preparing until the transition period is over
      if ((normalizedStatus === 'preparing' || normalizedStatus === 'ready' || normalizedStatus === 'processing')) {
        // If less than 4 seconds have passed, force show preparing
        if (timeSincePaymentConfirmed < transitionDelay) {
          return 'preparing';
        }
      }
    }
    
    return status;
  };

  const getRealtimeProgress = (order: Order | null | undefined) => {
    if (!order) return 0;
    
    // Use display status to ensure proper progression
    const displayStatus = getDisplayStatus(order);
    const status = displayStatus;
    // Try multiple ways to access payment_status to ensure we get it
    const paymentStatus = String(
      order.payment_status || 
      (order as any).payment_status || 
      (order as any).paymentStatus || 
      'pending'
    );

    const normalizedStatus = status.toLowerCase().trim();
    const normalizedPaymentStatus = paymentStatus.toLowerCase().trim();

    console.log('🔍 getRealtimeProgress called:', {
      orderId: order.order_id,
      status,
      payment_status: paymentStatus,
      normalizedStatus,
      normalizedPaymentStatus,
      order_payment_status: order.payment_status,
      order_paymentStatus: (order as any).paymentStatus
    });

    // Handle cancelled orders first
    if (normalizedStatus === 'cancelled') {
      return 0;
    }

    // Progress calculation based on order status and payment status
    // The flow should be: Order Received (20%) → Payment Confirmed (40%) → Preparing (60%) → Ready (80%) → Completed (100%)
    // IMPORTANT: Check payment status FIRST before checking order status to ensure proper progression

    // Step 1: Order Received (20%)
    // Order is placed but payment not yet verified
    if (normalizedStatus === 'pending' || normalizedStatus === 'pending_verification') {
      // If payment is already paid, we're at payment confirmed stage (40%)
      if (normalizedPaymentStatus === 'paid') {
        console.log('✅ Progress: 40% (Payment verified, status still pending)');
        return 40;
      }
      // Otherwise, order is just received (20%)
      console.log('✅ Progress: 20% (Order received, payment not verified)');
      return 20;
    }

    // Step 2: Payment Confirmed (40%)
    // Payment has been verified OR status is payment_confirmed
    if (normalizedStatus === 'confirmed' || normalizedStatus === 'payment_confirmed') {
      console.log('✅ Progress: 40% (Payment confirmed status)');
      return 40;
    }

    // IMPORTANT: If payment is paid but status hasn't updated yet, we're at 40%
    // This handles the case where payment is verified but order status is still pending
    if (normalizedPaymentStatus === 'paid' && (normalizedStatus === 'pending' || normalizedStatus === 'pending_verification')) {
      console.log('✅ Progress: 40% (Payment paid, status pending)');
      return 40;
    }

    // Step 3: Preparing (60%)
    // Order is being prepared
    if (normalizedStatus === 'processing' || normalizedStatus === 'preparing') {
      console.log('✅ Progress: 60% (Preparing)');
      return 60;
    }

    // Step 4: Ready (80%)
    // Order is ready for pickup
    // BUT: Only show 80% if payment has been verified (we've passed 40%)
    if (normalizedStatus === 'ready') {
      // If payment is not verified yet, we shouldn't be at ready stage
      // But if we are, check if we've passed payment confirmation
      if (normalizedPaymentStatus === 'paid' || normalizedStatus === 'payment_confirmed') {
        console.log('✅ Progress: 80% (Ready, payment verified)');
        return 80;
      } else {
        // Payment not verified but status is ready - this shouldn't happen, but show 40% to indicate payment needed
        console.log('⚠️ Progress: 40% (Ready but payment not verified - showing payment confirmed)');
        return 40;
      }
    }

    // Step 5: Completed (100%)
    // Order is completed
    if (normalizedStatus === 'completed') {
      console.log('✅ Progress: 100% (Completed)');
      return 100;
    }

    // Default: if payment is paid, assume we're at payment confirmed (40%)
    // Otherwise, assume order is just received (20%)
    if (normalizedPaymentStatus === 'paid') {
      console.log('✅ Progress: 40% (Default - payment paid)');
      return 40;
    }

    console.log('✅ Progress: 20% (Default - order received)');
    return 20; // Default to order received
  };

  // Pagination logic for completed orders
  const getPaginatedOrders = () => {
    const completedOrders = getCompletedOrders();
    if (showAll) {
      return completedOrders;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return completedOrders.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const completedOrders = getCompletedOrders();
    return Math.ceil(completedOrders.length / itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page
  };

  const handleShowAllToggle = () => {
    setShowAll(!showAll);
    setCurrentPage(1); // Reset to first page
  };

  const handleOrderCardClick = (order: Order) => {
    setSelectedOrderForDetails(order);
    setShowOrderDetailsModal(true);
  };

  // Helper functions for order filtering
  const isActiveStatus = (s?: string, payment?: string) => {
    const status = s?.toString().toLowerCase();
    const pay = payment?.toString().toLowerCase();
    
    console.log('🔍 isActiveStatus called with:', { status, pay });
    
    // Consider payment pending/verification as active states even if order.status is unset
    if (pay === 'pending' || pay === 'pending_verification') {
      console.log('✅ isActiveStatus: true (payment pending/verification)');
      return true;
    }
    
    const isActive = (
      status === 'pending' ||
      status === 'pending_verification' ||
      status === 'confirmed' ||
      status === 'preparing' ||
      status === 'processing' ||
      status === 'ready'
    );
    
    console.log('🔍 isActiveStatus result:', isActive);
    return isActive;
  };

  const isRecentOrder = (time?: string) => {
    if (!time) return false;
    const now = Date.now();
    const placed = new Date(time).getTime();
    return now - placed <= 24 * 60 * 60 * 1000; // 24 hours
  };

  // Separate current orders from completed orders
  const getCurrentOrders = () => {
    console.log('🔍 getCurrentOrders - All orders:', orders.map(o => ({ id: o.order_id, status: o.status, payment_status: o.payment_status })));
    
    // Show all active orders, but prioritize recent ones
    const activeOrders = orders.filter(order => {
      // Never treat cancelled orders as active/current
      if (order.status === 'cancelled') {
        console.log(`❌ Order ${order.order_id} excluded: cancelled`);
        return false;
      }
      
      const isActive = isActiveStatus(order.status, (order as any).payment_status);
      const isRecent = isRecentOrder(order.order_time);
      
      console.log(`🔍 Order ${order.order_id} filtering:`, {
        status: order.status,
        payment_status: order.payment_status,
        isActive,
        isRecent,
        order_time: order.order_time
      });
      
      // Always show pending/pending_verification orders regardless of age
      if (
        order.status === 'pending' ||
        order.status === 'pending_verification' ||
        (order as any).payment_status === 'pending' ||
        (order as any).payment_status === 'pending_verification'
      ) {
        console.log(`✅ Order ${order.order_id} included: pending/pending_verification`);
        return true;
      }
      
      // For other active statuses, only show if recent
      const shouldShow = isActive && isRecent;
      console.log(`🔍 Order ${order.order_id} final decision:`, shouldShow ? 'INCLUDED' : 'EXCLUDED');
      return shouldShow;
    });

    console.log('🔍 getCurrentOrders - Active orders found:', activeOrders.length);
    
    // Add queue position to active orders
    return activeOrders.map((order, index) => ({
      ...order,
      queue_position: index + 1
    }));
  };

  const getCompletedOrders = () => {
    return orders.filter(order => 
      order.status === 'completed' || order.status === 'cancelled'
    );
  };

  const getCurrentOrder = () => {
    const currentOrders = getCurrentOrders();
    const result = currentOrders.length > 0 ? currentOrders[0] : null;
    if (result) {
      const paymentStatus = result.payment_status || (result as any).paymentStatus;
      console.log('🔍 getCurrentOrder result:', { 
        id: result.order_id, 
        status: result.status,
        payment_status: paymentStatus,
        payment_status_raw: result.payment_status,
        paymentStatus_alt: (result as any).paymentStatus
      });
    } else {
      console.log('🔍 getCurrentOrder result: null');
    }
    return result;
  };

  // Get order ID - always use the full order_id (long ID) for consistency
  const getShortOrderCode = (order: Order | null | undefined): string => {
    if (!order) return 'N/A';
    // Always return the full long order_id in format: ORD-{timestamp}-{random}
    // This ensures consistency across the application
    return order.order_id || order.id || 'N/A';
  };

  const formatOrderTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };

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
      const errorMessage = error instanceof Error ? error.message : 'Error opening receipt. Please try again.';
      alert(errorMessage);
    }
  };

  // Handle receipt file upload
  const handleReceiptFileUpload = (event: React.ChangeEvent<HTMLInputElement>, isModal: boolean = false) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (JPG, PNG, etc.)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      if (isModal) {
        setReceiptFileForModal(file);
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setReceiptPreviewForModal(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setReceiptFile(file);
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setReceiptPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Remove receipt
  const removeReceipt = (isModal: boolean = false) => {
    if (isModal) {
      setReceiptFileForModal(null);
      setReceiptPreviewForModal(null);
    } else {
      setReceiptFile(null);
      setReceiptPreview(null);
    }
  };

  // Upload receipt to backend
  const handleUploadReceipt = async (orderId: string, isModal: boolean = false) => {
    const fileToUpload = isModal ? receiptFileForModal : receiptFile;
    
    if (!fileToUpload) {
      alert('Please select a receipt file to upload');
      return;
    }

    if (isModal) {
      setUploadingReceiptForModal(true);
    } else {
      setUploadingReceipt(true);
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const formData = new FormData();
      formData.append('receipt', fileToUpload);
      formData.append('orderId', orderId);

      const response = await fetch(`${API_URL}/api/receipts/upload-receipt`, {
        method: 'POST',
        credentials: 'omit',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        alert('Receipt uploaded successfully! The staff will verify your payment shortly.');
        // Clear the file inputs
        if (isModal) {
          setReceiptFileForModal(null);
          setReceiptPreviewForModal(null);
        } else {
          setReceiptFile(null);
          setReceiptPreview(null);
        }
        // Refresh orders to get updated payment status
        fetchOrders();
      } else {
        alert(result.message || 'Failed to upload receipt. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading receipt:', error);
      alert('Failed to upload receipt. Please try again.');
    } finally {
      if (isModal) {
        setUploadingReceiptForModal(false);
      } else {
        setUploadingReceipt(false);
      }
    }
  };

  const handleFeedbackClick = (order: Order) => {
    setSelectedOrderForFeedback(order);
    setShowFeedbackModal(true);
  };

  const checkOrderFeedback = async (orderId: string) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/feedback/check-order?order_id=${encodeURIComponent(orderId)}&customer_email=${encodeURIComponent(user?.email || '')}`, {
        credentials: 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.hasFeedback || false;
      } else {
        // Silently fail - assume no feedback exists
        return false;
      }
    } catch (error) {
      // Silently fail - assume no feedback exists
      return false;
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedOrderForFeedback) return;

    const trimmedComment = feedbackComment.trim();
    const trimmedCategory = feedbackCategory.trim() || 'General';

    if (containsProfanity(trimmedComment) || containsProfanity(trimmedCategory)) {
      alert('Please remove inappropriate language before submitting your feedback.');
      return;
    }

    setSubmittingFeedback(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'omit',
        body: JSON.stringify({
          customer_name: user.name || user.email,
          rating: feedbackRating,
          comment: trimmedComment,
          category: trimmedCategory,
          customer_email: user.email,
          order_id: selectedOrderForFeedback.order_id
        }),
      });

      if (response.ok) {
        // Mark this order as having feedback
        setOrdersWithFeedback(prev => new Set([...prev, selectedOrderForFeedback.order_id]));
        setShowFeedbackModal(false);
        setFeedbackRating(5);
        setFeedbackComment('');
        setFeedbackCategory('General');
        setSelectedOrderForFeedback(null);
      } else {
        const error = await response.json().catch(() => ({}));
        console.error('Feedback submission error:', error);
        alert(error?.message || 'Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Load existing feedback status for completed orders
  useEffect(() => {
    const loadFeedbackStatus = async () => {
      if (!user?.email) return;
      
      const completedOrders = orders.filter(order => order.status === 'completed');
      
      // Check feedback status for each completed order
      try {
        const feedbackPromises = completedOrders.map(order => 
          checkOrderFeedback(order.order_id).then(hasFeedback => ({
            orderId: order.order_id,
            hasFeedback
          }))
        );
        
        const results = await Promise.all(feedbackPromises);
        const ordersWithFeedbackSet = new Set(
          results.filter(result => result.hasFeedback).map(result => result.orderId)
        );
        setOrdersWithFeedback(ordersWithFeedbackSet);
        console.log('📝 Loaded feedback status:', ordersWithFeedbackSet);
      } catch (error) {
        console.warn('Could not load feedback status:', error);
        setOrdersWithFeedback(new Set());
      }
    };
    
    if (orders.length > 0) {
      loadFeedbackStatus();
    }
  }, [orders, user?.email]);

  if (loading || loadingOrders) {
    return (
      <div className="min-h-screen bg-[#f8eee4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8 pt-4">
        {/* Header Section */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Track your current order and view order history</p>
            </div>
          </div>
        </div>
        
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Coffee className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
            <p className="text-gray-600 mb-4">Start your coffee journey by placing your first order!</p>
            <button
              onClick={() => {
                const urlParams = new URLSearchParams(window.location.search);
                const tableFromUrl = urlParams.get('table');
                const menuUrl = tableFromUrl ? `/customer/menu?table=${tableFromUrl}` : '/customer/menu';
                navigate(menuUrl);
              }}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700"
               title="Browse Menu"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Left Column - Current Order Status */}
             <div className="space-y-4">
               <h2 className="text-2xl font-bold text-gray-900">Current Order Status</h2>
               
              {getCurrentOrder() ? (
                 <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200 hover:shadow-2xl transition-shadow duration-300">
                   {/* Order Status Header */}
                   <div className="p-6 bg-amber-50">
                     <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center">
                         <div className="p-3 rounded-full bg-amber-100">
                           <Utensils className="w-6 h-6 text-amber-600" />
                         </div>
                         <div className="ml-4">
                           <h3 className="text-xl font-bold text-gray-900">
                             {(() => {
                               const currentOrder = getCurrentOrder();
                               const displayStatus = getDisplayStatus(currentOrder);
                               if (displayStatus === 'completed') return 'Order Completed';
                               if (displayStatus === 'ready') return 'Ready for Pickup';
                               if (displayStatus === 'preparing') return 'Preparing Your Order';
                               if (displayStatus === 'payment_confirmed') return 'Payment Confirmed';
                               return 'Order Received';
                             })()}
                           </h3>
                           <p className="text-sm text-gray-600">
                             {(() => {
                               const currentOrder = getCurrentOrder();
                               const displayStatus = getDisplayStatus(currentOrder);
                               if (displayStatus === 'completed') return 'Your delicious order is ready!';
                               if (displayStatus === 'ready') return 'Your order is ready for pickup!';
                               if (displayStatus === 'preparing') return 'Your delicious order is being carefully prepared.';
                               if (displayStatus === 'payment_confirmed') return 'Your payment has been verified and confirmed.';
                               return 'Your order has been received and is being processed.';
                             })()}
                           </p>
                         </div>
                       </div>
                       <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                         (() => {
                           const currentOrder = getCurrentOrder();
                           const displayStatus = getDisplayStatus(currentOrder);
                           const status = displayStatus?.toString().toLowerCase();
                           console.log('CustomerOrders status badge - display status:', displayStatus, 'raw status:', currentOrder?.status);
                           
                          // Handle null/undefined status - default to VERIFYING color
                          if (!displayStatus) {
                             return 'bg-amber-100 text-amber-800';
                           }
                           
                           if (status === 'completed') return 'bg-green-100 text-green-800';
                           if (status === 'ready') return 'bg-blue-100 text-blue-800';
                           if (status === 'preparing') return 'bg-yellow-100 text-yellow-800';
                           if (status === 'pending') return 'bg-orange-100 text-orange-800';
                           if (status === 'pending_verification') return 'bg-amber-100 text-amber-800';
                           if (status === 'payment_confirmed') return 'bg-blue-100 text-blue-800';
                           if (status === 'confirmed') return 'bg-purple-100 text-purple-800';
                           if (status === 'cancelled') return 'bg-red-100 text-red-800';
                           if (status === 'processing') return 'bg-indigo-100 text-indigo-800';
                           console.warn('Unknown status for badge color:', status);
                           return 'bg-amber-100 text-amber-800'; // Default to VERIFYING color
                         })()
                       }`}>
                         {(() => {
                           const currentOrder = getCurrentOrder();
                           const rawStatus = currentOrder?.status;
                           const paymentStatus = currentOrder?.payment_status || (currentOrder as any)?.paymentStatus;
                           const status = rawStatus?.toString().toLowerCase();
                           console.log('🔍 CustomerOrders status badge - raw status:', rawStatus, 'payment_status:', paymentStatus, 'normalized:', status);
                           
                           // Handle null/undefined status - default to VERIFYING
                           if (!rawStatus) {
                             console.error('❌ CustomerOrders - Invalid status detected:', rawStatus);
                             console.error('❌ CustomerOrders - Full currentOrder:', currentOrder);
                             return 'VERIFYING'; // Default to VERIFYING instead of ERROR
                           }
                           
                           // If payment is paid but status is not payment_confirmed or beyond, show PAYMENT CONFIRMED
                           if (paymentStatus === 'paid' && status !== 'payment_confirmed' && status !== 'preparing' && status !== 'ready' && status !== 'completed') {
                             return 'PAYMENT CONFIRMED';
                           }
                           
                           if (status === 'completed') return 'COMPLETED';
                           if (status === 'ready') return 'READY';
                           if (status === 'preparing') return 'IN PROGRESS';
                           if (status === 'pending') return 'PENDING';
                           if (status === 'pending_verification') return 'VERIFYING';
                           if (status === 'payment_confirmed') return 'PAYMENT CONFIRMED';
                           if (status === 'confirmed') return 'CONFIRMED';
                           if (status === 'cancelled') return 'CANCELLED';
                           if (status === 'processing') return 'PROCESSING';
                           
                           console.warn('❌ CustomerOrders - Unknown status for badge text:', { rawStatus, status, type: typeof rawStatus });
                           return 'UNKNOWN';
                         })()}
                       </div>
                     </div>

                     {/* Order Details */}
                     <div className="grid grid-cols-2 gap-6 mb-6">
                       <div>
                         <p className="text-sm text-gray-600 mb-1">Order ID</p>
                         <p className="font-medium text-gray-900 font-mono text-sm">{getShortOrderCode(getCurrentOrder())}</p>
                       </div>
                       <div>
                         <p className="text-sm text-gray-600 mb-1">Queue Position</p>
                         <p className="font-medium text-gray-900">
                           <span className="bg-[#a87437] text-white px-3 py-1 rounded-full text-sm font-bold">
                             #{getCurrentOrder()?.queue_position || 'N/A'}
                           </span>
                         </p>
                       </div>
                       <div>
                         <p className="text-sm text-gray-600 mb-1">Service Options</p>
                         <p className="font-medium text-gray-900 capitalize">{getCurrentOrder()?.order_type?.replace('_', '-')}</p>
                       </div>
                       {getCurrentOrder()?.order_type === 'dine_in' && (
                         <div>
                           <p className="text-sm text-gray-600 mb-1">Table Number</p>
                           <p className="font-medium text-gray-900">{getCurrentOrder()?.table_number || 'Not specified'}</p>
                         </div>
                       )}
                       <div>
                         <p className="text-sm text-gray-600 mb-1">Order Time</p>
                         <p className="font-medium text-gray-900">{getCurrentOrder()?.order_time ? new Date(getCurrentOrder()!.order_time).toLocaleString('en-US', {
                           month: 'long',
                           day: 'numeric',
                           year: 'numeric',
                           hour: '2-digit',
                           minute: '2-digit'
                         }) : 'N/A'}</p>
                       </div>
                     </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                      <ProgressBar 
                        value={(() => {
                          const currentOrder = getCurrentOrder();
                          // Ensure we're reading payment_status from the order object
                          const paymentStatus = currentOrder?.payment_status || (currentOrder as any)?.paymentStatus || 'pending';
                          const progress = getRealtimeProgress(currentOrder);
                          console.log('🔍 Progress Bar calculation:', {
                            orderId: currentOrder?.order_id,
                            status: currentOrder?.status,
                            payment_status: paymentStatus,
                            payment_status_raw: currentOrder?.payment_status,
                            paymentStatus_alt: (currentOrder as any)?.paymentStatus,
                            progress,
                            timestamp: Date.now()
                          });
                          return progress;
                        })()}
                        variant="amber"
                        key={`progress-${getCurrentOrder()?.order_id}-${getCurrentOrder()?.payment_status}-${nowTs}-${forceUpdate}`}
                      />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {(() => {
                          const currentOrder = getCurrentOrder();
                          return getRealtimeProgress(currentOrder);
                        })()}% Complete
                      </p>
                    </div>
                   </div>

                   {/* Order Progress Steps */}
                   <div className="p-6 border-t border-gray-100">
                     <h4 className="text-lg font-bold text-gray-900 mb-4">Order Progress</h4>
                     <div className="relative">
                       {/* Single continuous vertical line */}
                       <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                       
                       <div className="space-y-4 relative">
                         {/* Order Received */}
                         {(() => {
                           const currentOrder = getCurrentOrder();
                           const paymentStatus = currentOrder?.payment_status || (currentOrder as any)?.paymentStatus;
                           const isOrderReceived = 
                             currentOrder?.status === 'pending' || 
                             currentOrder?.status === 'pending_verification' || 
                             currentOrder?.status === 'payment_confirmed' || 
                             currentOrder?.status === 'preparing' || 
                             currentOrder?.status === 'ready' || 
                             currentOrder?.status === 'completed' || 
                             paymentStatus === 'paid';
                           
                           return (
                             <div className="flex items-center">
                               <div className="relative z-10">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                   isOrderReceived
                                     ? 'bg-[#a87437] text-white' 
                                     : 'bg-gray-300 text-gray-600'
                                 }`}>
                                   <CheckCircle className="h-4 w-4" />
                                 </div>
                               </div>
                               <div className="ml-4 flex-1">
                                 <p className={`text-sm font-medium ${
                                   isOrderReceived ? 'text-[#a87437]' : 'text-gray-600'
                                 }`}>
                                   Order Received
                                 </p>
                                 <p className="text-xs text-gray-500">Your order has been received and is being processed</p>
                               </div>
                             </div>
                           );
                         })()}

                         {/* Payment Confirmed */}
                         {(() => {
                           const currentOrder = getCurrentOrder();
                           const paymentStatus = currentOrder?.payment_status || (currentOrder as any)?.paymentStatus;
                           const isPaymentConfirmed = 
                             currentOrder?.status === 'payment_confirmed' || 
                             currentOrder?.status === 'preparing' || 
                             currentOrder?.status === 'ready' || 
                             currentOrder?.status === 'completed' || 
                             paymentStatus === 'paid';
                           
                           console.log('🔍 Payment Confirmed step check:', {
                             orderId: currentOrder?.order_id,
                             status: currentOrder?.status,
                             payment_status: paymentStatus,
                             isPaymentConfirmed
                           });
                           
                           return (
                             <div className="flex items-center">
                               <div className="relative z-10">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                   isPaymentConfirmed
                                     ? 'bg-[#a87437] text-white' 
                                     : 'bg-gray-300 text-gray-600'
                                 }`}>
                                   <CheckCircle className="h-4 w-4" />
                                 </div>
                               </div>
                               <div className="ml-4 flex-1">
                                 <p className={`text-sm font-medium ${
                                   isPaymentConfirmed
                                     ? 'text-[#a87437]' : 'text-gray-600'
                                 }`}>
                                   Payment Confirmed
                                 </p>
                                 <p className="text-xs text-gray-500">Your payment has been verified and confirmed</p>
                               </div>
                             </div>
                           );
                         })()}

                         {/* Preparing */}
                         <div className="flex items-center">
                           <div className="relative z-10">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                               getCurrentOrder()?.status === 'preparing' || getCurrentOrder()?.status === 'ready' || 
                               getCurrentOrder()?.status === 'completed'
                                 ? 'bg-[#a87437] text-white' 
                                 : 'bg-gray-300 text-gray-600'
                             }`}>
                               <Loader2 className={`h-4 w-4 ${getCurrentOrder()?.status === 'preparing' ? 'animate-spin' : ''}`} />
                             </div>
                           </div>
                           <div className="ml-4 flex-1">
                             <p className={`text-sm font-medium ${
                               getCurrentOrder()?.status === 'preparing' || getCurrentOrder()?.status === 'ready' || 
                               getCurrentOrder()?.status === 'completed' ? 'text-[#a87437]' : 'text-gray-600'
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
                               getCurrentOrder()?.status === 'ready' || getCurrentOrder()?.status === 'completed'
                                 ? 'bg-[#a87437] text-white' 
                                 : 'bg-gray-300 text-gray-600'
                             }`}>
                               <Package className="h-4 w-4" />
                             </div>
                           </div>
                           <div className="ml-4 flex-1">
                             <p className={`text-sm font-medium ${
                               getCurrentOrder()?.status === 'ready' || getCurrentOrder()?.status === 'completed' 
                                 ? 'text-[#a87437]' : 'text-gray-600'
                             }`}>
                               Ready for Pickup
                             </p>
                             <p className="text-xs text-gray-500">Your order is ready for pickup</p>
                           </div>
                         </div>

                         {/* Completed */}
                         <div className="flex items-center">
                           <div className="relative z-10">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                               getCurrentOrder()?.status === 'completed'
                                 ? 'bg-[#a87437] text-white' 
                                 : 'bg-gray-300 text-gray-600'
                             }`}>
                               <CheckCircle className="h-4 w-4" />
                             </div>
                           </div>
                           <div className="ml-4 flex-1">
                             <p className={`text-sm font-medium ${
                               getCurrentOrder()?.status === 'completed' ? 'text-[#a87437]' : 'text-gray-600'
                             }`}>
                               Completed
                             </p>
                             <p className="text-xs text-gray-500">Order has been completed successfully</p>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Ordered Items */}
                   <div className="p-6 border-t border-gray-100">
                     <h4 className="text-lg font-bold text-gray-900 mb-4">Ordered Items</h4>
                     <div className="space-y-3">
                       {getCurrentOrder()?.items?.map((item, index) => (
                         <div key={index} className="flex justify-between items-center">
                           <div className="flex-1">
                             <p className="text-gray-900">{item.quantity} x {item.name}</p>
                             {item.customizations && (
                               <p className="text-sm text-gray-500">
                                 {Object.entries(item.customizations).map(([key, value]) => 
                                   `${key}: ${value}`
                                 ).join(', ')}
                               </p>
                             )}
                           </div>
                           <p className="font-bold text-amber-600">₱{(item.price * item.quantity).toFixed(2)}</p>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Payment Information */}
                   <div className="p-6 border-t border-gray-100">
                     <h4 className="text-lg font-bold text-gray-900 mb-4">Payment Information</h4>
                     <div className="grid grid-cols-2 gap-4 mb-4">
                       <div>
                         <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                         <p className="font-medium text-gray-900 capitalize">{getCurrentOrder()?.payment_method || 'Not specified'}</p>
                       </div>
                       <div>
                         <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                         <p className={`font-medium ${
                           getCurrentOrder()?.payment_status === 'paid' ? 'text-green-600' :
                           getCurrentOrder()?.payment_status === 'failed' ? 'text-red-600' :
                           'text-amber-600'
                         }`}>
                           {getCurrentOrder()?.payment_status === 'paid' ? 'Paid' :
                            getCurrentOrder()?.payment_status === 'failed' ? 'Failed' :
                            'Pending'}
                         </p>
                       </div>
                     </div>

                     {/* Receipt Upload for Digital Payments */}
                     {getCurrentOrder() && (getCurrentOrder()?.payment_method === 'gcash' || getCurrentOrder()?.payment_method === 'paymaya') && 
                      getCurrentOrder()?.payment_status !== 'paid' && (
                       <div className="mt-4">
                         <label className="text-sm font-medium text-gray-700 mb-3 block">
                           Upload Payment Receipt
                           <span className="text-red-500 ml-1">*</span>
                         </label>
                         <div className="space-y-3">
                           {!receiptFile ? (
                             <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#a87437] transition-colors">
                               <input
                                 type="file"
                                 accept="image/*"
                                 onChange={(e) => handleReceiptFileUpload(e, false)}
                                 className="hidden"
                                 id="receipt-upload-current"
                               />
                               <label
                                 htmlFor="receipt-upload-current"
                                 className="cursor-pointer flex flex-col items-center gap-2"
                               >
                                 <Upload className="w-8 h-8 text-gray-400" />
                                 <div className="text-sm text-gray-600">
                                   Click to upload receipt image
                                 </div>
                                 <div className="text-xs text-gray-500">
                                   JPG, PNG (max 5MB)
                                 </div>
                               </label>
                             </div>
                           ) : (
                             <div className="border border-gray-200 rounded-lg p-4">
                               <div className="flex items-center justify-between mb-3">
                                 <div className="flex items-center gap-2">
                                   <FileImage className="w-5 h-5 text-[#a87437]" />
                                   <span className="text-sm font-medium text-gray-700">
                                     {receiptFile.name}
                                   </span>
                                 </div>
                                 <button
                                   type="button"
                                   onClick={() => removeReceipt(false)}
                                   className="text-red-600 hover:text-red-700 text-sm"
                                 >
                                   Remove
                                 </button>
                               </div>
                               {receiptPreview && (
                                 <div className="mt-3">
                                   <img
                                     src={receiptPreview}
                                     alt="Receipt preview"
                                     className="max-w-full h-auto max-h-48 rounded-lg border border-gray-200"
                                   />
                                 </div>
                               )}
                               <button
                                 type="button"
                                 onClick={() => handleUploadReceipt(getCurrentOrder()!.order_id, false)}
                                 disabled={uploadingReceipt}
                                 className="mt-3 w-full px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                               >
                                 {uploadingReceipt ? 'Uploading...' : 'Upload Receipt'}
                               </button>
                             </div>
                           )}
                         </div>
                       </div>
                     )}
                   </div>

                   {/* Total Amount */}
                   <div className="p-6 border-t border-gray-100 bg-gray-50">
                     <h4 className="text-lg font-bold text-gray-900 mb-2">Total Amount</h4>
                     <p className="text-2xl font-bold text-amber-600">₱{formatPrice(getCurrentOrder()?.total_price || 0)}</p>
                   </div>
                 </div>
               ) : (
                 <div className="text-center py-12">
                   <Coffee className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                   <h3 className="text-lg font-medium text-gray-900 mb-2">No current order</h3>
                   <p className="text-gray-600 mb-6">You don't have any active orders at the moment.</p>
                   <div className="space-y-3">
                     <button
                       onClick={() => {
                         const urlParams = new URLSearchParams(window.location.search);
                         const tableFromUrl = urlParams.get('table');
                         const menuUrl = tableFromUrl ? `/customer/menu?table=${tableFromUrl}` : '/customer/menu';
                         navigate(menuUrl);
                       }}
                       className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                     >
                       Browse Menu
                     </button>
                   </div>
                 </div>
               )}
             </div>

             {/* Right Column - Order History */}
             <div className="space-y-4">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
                 
                 {/* Pagination Controls */}
                 <div className="flex flex-col sm:flex-row items-center gap-3">
                   {/* Items per page selector */}
                   {!showAll && (
                     <div className="flex items-center gap-2">
                       <label className="text-sm text-gray-600">Show:</label>
                       <select
                         value={itemsPerPage}
                         onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                         className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                         aria-label="Items per page"
                       >
                         <option value={5}>5</option>
                         <option value={10}>10</option>
                         <option value={20}>20</option>
                       </select>
                       <span className="text-sm text-gray-600">per page</span>
                     </div>
                   )}
                   
                   {/* Show all toggle */}
                   <button
                     onClick={handleShowAllToggle}
                     className={`px-3 py-1 text-sm rounded-md transition-colors ${
                       showAll 
                         ? 'bg-amber-600 text-white hover:bg-amber-700' 
                         : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                     }`}
                   >
                     {showAll ? 'Show Paginated' : 'Show All'}
                   </button>
                 </div>
               </div>
               
               <div className="space-y-4">
                 {getPaginatedOrders().map((order) => (
                   <div 
                     key={order.order_id || order.id} 
                     className="bg-white rounded-2xl shadow-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-2xl border-2 border-transparent hover:border-amber-200"
                     onClick={() => handleOrderCardClick(order)}
                   >
                     {/* Order Header */}
                     <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center space-x-4">
                         <div className="p-3 rounded-full bg-amber-100">
                           <Utensils className="w-6 h-6 text-amber-600" />
                         </div>
                         <div>
                           <p className="font-bold text-gray-900 font-mono text-sm">Order ID: {getShortOrderCode(order)}</p>
                           <div className="flex items-center space-x-4 mt-1">
                             <div className="flex items-center text-sm text-gray-600">
                               <Calendar className="w-4 h-4 mr-1" />
                               <span>{new Date(order.order_time).toLocaleDateString('en-US', {
                                 month: 'long',
                                 day: 'numeric',
                                 year: 'numeric'
                               })}</span>
                             </div>
                             <div className="flex items-center text-sm text-gray-600">
                               <Clock className="w-4 h-4 mr-1" />
                               <span>{formatOrderTime(order.order_time)}</span>
                             </div>
                           </div>
                         </div>
                       </div>
                       <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold min-w-[80px] justify-center ${
                         (() => {
                           const status = order.status?.toString().toLowerCase();
                           
                           if (status === 'completed') return 'bg-green-100 text-green-800';
                           if (status === 'ready') return 'bg-blue-100 text-blue-800';
                           if (status === 'preparing') return 'bg-yellow-100 text-yellow-800';
                           if (status === 'pending') return 'bg-orange-100 text-orange-800';
                           if (status === 'pending_verification') return 'bg-orange-100 text-orange-800';
                           if (status === 'cancelled') return 'bg-red-100 text-red-800';
                           if (status === 'confirmed') return 'bg-purple-100 text-purple-800';
                           if (status === 'processing') return 'bg-indigo-100 text-indigo-800';
                           
                           return 'bg-gray-100 text-gray-800';
                         })()
                       }`}>
                         {(() => {
                           const status = order.status?.toString().toLowerCase();
                           
                           if (status === 'completed') return 'COMPLETED';
                           if (status === 'ready') return 'READY';
                           if (status === 'preparing') return 'PREPARING';
                           if (status === 'pending') return 'PENDING';
                           if (status === 'pending_verification') return 'PENDING';
                           if (status === 'cancelled') return 'CANCELLED';
                           if (status === 'confirmed') return 'CONFIRMED';
                           if (status === 'processing') return 'PROCESSING';
                           
                           return 'UNKNOWN';
                         })()}
                       </div>
                     </div>

                     {/* Order Items */}
                     <div className="mb-4">
                       {order.items.map((item, index) => (
                         <div key={index} className="flex justify-between items-center py-1">
                           <div className="flex-1">
                             <p className="text-gray-900">{item.quantity} x {item.name}</p>
                             {item.customizations && (
                               <p className="text-sm text-gray-500">
                                 {Object.entries(item.customizations).map(([key, value]) => 
                                   `${key}: ${value}`
                                 ).join(', ')}
                               </p>
                             )}
                           </div>
                           <p className="font-bold text-amber-600">₱{(item.price * item.quantity).toFixed(2)}</p>
                         </div>
                       ))}
                     </div>

                     {/* Order Details */}
                     <div className="border-t border-gray-100 pt-4">
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-sm text-gray-600">Service Option</span>
                         <span className="text-sm font-medium text-gray-900 capitalize">{order.order_type.replace('_', '-')}</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-sm text-gray-600">Total Amount</span>
                         <span className="text-lg font-bold text-amber-600">₱{formatPrice(order.total_price)}</span>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>

               {/* Pagination Controls */}
               {!showAll && getCompletedOrders().length > itemsPerPage && (
                 <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
                   {/* Page info */}
                   <div className="text-sm text-gray-600">
                     Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getCompletedOrders().length)} of {getCompletedOrders().length} orders
                   </div>
                   
                   {/* Page navigation */}
                   <div className="flex items-center gap-2">
                     <button
                       onClick={() => handlePageChange(currentPage - 1)}
                       disabled={currentPage === 1}
                       className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       Previous
                     </button>
                     
                     {/* Page numbers */}
                     <div className="flex items-center gap-1">
                       {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                         <button
                           key={page}
                           onClick={() => handlePageChange(page)}
                           className={`px-3 py-1 text-sm rounded-md ${
                             currentPage === page
                               ? 'bg-amber-600 text-white'
                               : 'border border-gray-300 hover:bg-gray-50'
                           }`}
                         >
                           {page}
                         </button>
                       ))}
                     </div>
                     
                     <button
                       onClick={() => handlePageChange(currentPage + 1)}
                       disabled={currentPage === getTotalPages()}
                       className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       Next
                     </button>
                   </div>
                 </div>
               )}

               {/* Show all info */}
               {showAll && (
                 <div className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-200 text-center">
                   Showing all {getCompletedOrders().length} orders
                 </div>
               )}
             </div>
           </div>
        )}
      </div>

      {/* Order History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close order history modal"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Items per page selector */}
                  {!showAll && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Show:</label>
                      <select
                        title="Items per page"
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                      <span className="text-sm text-gray-600">per page</span>
                    </div>
                  )}
                  
                  {/* Show all toggle */}
                  <button
                    onClick={handleShowAllToggle}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      showAll 
                        ? 'bg-amber-600 text-white hover:bg-amber-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {showAll ? 'Show Paginated' : 'Show All'}
                  </button>
                </div>
              </div>
              
              {/* Orders List */}
              <div className="space-y-4">
                {getPaginatedOrders().length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No order history</h3>
                    <p className="text-gray-600">Your completed orders will appear here.</p>
                  </div>
                ) : (
                  getPaginatedOrders().map((order) => (
                    <div 
                      key={order.id} 
                      className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-all duration-200 border border-gray-200"
                    >
                      {/* Order Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 rounded-full bg-amber-100">
                            <Utensils className="w-6 h-6 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 font-mono text-sm">Order ID: {order.order_id || 'N/A'}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="w-4 h-4 mr-1" />
                                <span>{new Date(order.order_time).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="w-4 h-4 mr-1" />
                                <span>{formatOrderTime(order.order_time)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold min-w-[80px] justify-center ${
                          (() => {
                            const status = order.status?.toString().toLowerCase();
                            
                            if (status === 'completed') return 'bg-green-100 text-green-800';
                            if (status === 'ready') return 'bg-blue-100 text-blue-800';
                            if (status === 'preparing') return 'bg-yellow-100 text-yellow-800';
                            if (status === 'pending') return 'bg-orange-100 text-orange-800';
                            if (status === 'pending_verification') return 'bg-orange-100 text-orange-800';
                            if (status === 'cancelled') return 'bg-red-100 text-red-800';
                            if (status === 'confirmed') return 'bg-purple-100 text-purple-800';
                            if (status === 'processing') return 'bg-indigo-100 text-indigo-800';
                            
                            return 'bg-gray-100 text-gray-800';
                          })()
                        }`}>
                          {(() => {
                            const status = order.status?.toString().toLowerCase();
                            
                            if (status === 'completed') return 'COMPLETED';
                            if (status === 'ready') return 'READY';
                            if (status === 'preparing') return 'PREPARING';
                            if (status === 'pending') return 'PENDING';
                            if (status === 'pending_verification') return 'PENDING';
                            if (status === 'cancelled') return 'CANCELLED';
                            if (status === 'confirmed') return 'CONFIRMED';
                            if (status === 'processing') return 'PROCESSING';
                            
                            return 'UNKNOWN';
                          })()}
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="mb-4">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-1">
                            <div className="flex-1">
                              <p className="text-gray-900">{item.quantity} x {item.name}</p>
                              {item.customizations && (
                                <p className="text-sm text-gray-500">
                                  {Object.entries(item.customizations).map(([key, value]) => 
                                    `${key}: ${value}`
                                  ).join(', ')}
                                </p>
                              )}
                            </div>
                            <p className="font-bold text-amber-600">₱{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>

                      {/* Order Details */}
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Service Option</span>
                          <span className="text-sm font-medium text-gray-900 capitalize">{order.order_type.replace('_', '-')}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm text-gray-600">Total Amount</span>
                          <span className="text-lg font-bold text-amber-600">₱{formatPrice(order.total_price)}</span>
                        </div>
                        
                        {/* Download Receipt and Feedback Buttons */}
                        <div className="flex justify-end gap-2">
                          {/* Download Receipt Button - Only shown after payment is verified */}
                          {order.payment_status === 'paid' && (order.status === 'completed' || order.status === 'ready') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadReceipt(order.order_id);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] transition-colors border border-[#a87437]"
                            >
                              <Download className="w-4 h-4" />
                              Download Receipt
                            </button>
                          )}
                          
                          {/* Feedback Button for Completed Orders */}
                          {order.status === 'completed' && !ordersWithFeedback.has(order.order_id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFeedbackClick(order);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                            >
                              <Star className="w-4 h-4" />
                              Leave Feedback
                            </button>
                          )}
                          
                          {/* Feedback Submitted Indicator */}
                          {order.status === 'completed' && ordersWithFeedback.has(order.order_id) && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                              <Star className="w-4 h-4 fill-current" />
                              Feedback Submitted
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination Controls */}
              {!showAll && getCompletedOrders().length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
                  {/* Page info */}
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getCompletedOrders().length)} of {getCompletedOrders().length} orders
                  </div>
                  
                  {/* Page navigation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: getTotalPages() }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 text-sm rounded-md ${
                            currentPage === page
                              ? 'bg-amber-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === getTotalPages()}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Show all info */}
              {showAll && (
                <div className="text-sm text-gray-600 mt-4 pt-4 border-t border-gray-200 text-center">
                  Showing all {getCompletedOrders().length} orders
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {statusNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-[120] w-full max-w-sm space-y-3">
          {statusNotifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-white border border-amber-100 shadow-xl rounded-xl p-4 flex gap-3 transition transform"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Order {notification.orderNumber}
                </p>
                <p className="text-sm text-gray-700">
                  Status updated to{' '}
                  <span className="font-medium text-amber-700">
                    {formatStatusLabel(notification.status)}
                  </span>
                </p>
                {notification.previousStatus && (
                  <p className="text-xs text-gray-500">
                    Previous: {formatStatusLabel(notification.previousStatus)}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetailsModal && selectedOrderForDetails && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
              <button
                title="Close order details"
                onClick={() => {
                  setShowOrderDetailsModal(false);
                  setReceiptFileForModal(null);
                  setReceiptPreviewForModal(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Order Status Card */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-amber-100">
                      <Utensils className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {selectedOrderForDetails.status === 'completed' ? 'Order Completed' :
                         selectedOrderForDetails.status === 'ready' ? 'Order Ready' :
                         selectedOrderForDetails.status === 'preparing' ? 'Order in Progress' :
                         selectedOrderForDetails.status === 'pending' ? 'Order Confirmed' :
                         'Order Status'}
                      </h3>
                      <p className="text-gray-600">
                        {selectedOrderForDetails.status === 'completed' ? 'Your delicious order is ready!' :
                         selectedOrderForDetails.status === 'ready' ? 'Your order is ready for pickup!' :
                         selectedOrderForDetails.status === 'preparing' ? 'Your delicious order is being carefully prepared.' :
                         'We have received your order and will start preparing it soon.'}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold min-w-[80px] justify-center ${
                    (() => {
                      const status = selectedOrderForDetails.status?.toString().toLowerCase();
                      
                      if (status === 'completed') return 'bg-green-100 text-green-800';
                      if (status === 'ready') return 'bg-blue-100 text-blue-800';
                      if (status === 'preparing') return 'bg-yellow-100 text-yellow-800';
                      if (status === 'pending') return 'bg-orange-100 text-orange-800';
                      if (status === 'pending_verification') return 'bg-orange-100 text-orange-800';
                      if (status === 'cancelled') return 'bg-red-100 text-red-800';
                      if (status === 'confirmed') return 'bg-purple-100 text-purple-800';
                      if (status === 'processing') return 'bg-indigo-100 text-indigo-800';
                      
                      return 'bg-gray-100 text-gray-800';
                    })()
                  }`}>
                    {(() => {
                      const status = selectedOrderForDetails.status?.toString().toLowerCase();
                      
                      if (status === 'completed') return 'COMPLETED';
                      if (status === 'ready') return 'READY';
                      if (status === 'preparing') return 'PREPARING';
                      if (status === 'pending') return 'PENDING';
                      if (status === 'pending_verification') return 'PENDING';
                      if (status === 'cancelled') return 'CANCELLED';
                      if (status === 'confirmed') return 'CONFIRMED';
                      if (status === 'processing') return 'PROCESSING';
                      
                      return 'UNKNOWN';
                    })()}
                  </div>
                </div>
                
                {/* Order Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Order ID</p>
                    <p className="font-bold text-gray-900">{getShortOrderCode(selectedOrderForDetails)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Service Options</p>
                    <p className="font-bold text-gray-900 capitalize">{selectedOrderForDetails.order_type.replace('_', '-')}</p>
                  </div>
                  {selectedOrderForDetails.table_number && (
                    <div>
                      <p className="text-sm text-gray-600">Table Number</p>
                      <p className="font-bold text-gray-900">{selectedOrderForDetails.table_number}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Order Time</p>
                    <p className="font-bold text-gray-900">
                      {new Date(selectedOrderForDetails.order_time).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })} at {formatOrderTime(selectedOrderForDetails.order_time)}
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <ProgressBar 
                      value={getRealtimeProgress(selectedOrderForDetails)}
                      variant="gradient"
                      aria-label="Order progress"
                      title="Order progress"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{getRealtimeProgress(selectedOrderForDetails)}% Complete</p>
                </div>
              </div>

              {/* Order Progress Steps */}
              <div className="p-6 border-t border-gray-100">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Order Progress</h4>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full ${
                      selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                      selectedOrderForDetails.status === 'preparing' || selectedOrderForDetails.status === 'payment_confirmed' ||
                      selectedOrderForDetails.status === 'pending' || selectedOrderForDetails.status === 'pending_verification' ||
                      selectedOrderForDetails.paymentStatus === 'paid'
                      ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <CheckCircle className={`w-5 h-5 ${
                        selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                        selectedOrderForDetails.status === 'preparing' || selectedOrderForDetails.status === 'payment_confirmed' ||
                        selectedOrderForDetails.status === 'pending' || selectedOrderForDetails.status === 'pending_verification' ||
                        selectedOrderForDetails.paymentStatus === 'paid'
                        ? 'text-amber-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="font-bold text-gray-900">Order Confirmed</p>
                      <p className="text-sm text-gray-500">
                        {selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                         selectedOrderForDetails.status === 'preparing' || selectedOrderForDetails.status === 'payment_confirmed' ||
                         selectedOrderForDetails.status === 'pending' || selectedOrderForDetails.status === 'pending_verification' ||
                         selectedOrderForDetails.paymentStatus === 'paid'
                          ? 'Confirmed' : 'Pending'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className={`p-2 rounded-full ${
                      selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                      selectedOrderForDetails.status === 'preparing' || selectedOrderForDetails.status === 'payment_confirmed' ||
                      (selectedOrderForDetails.paymentStatus === 'paid' && selectedOrderForDetails.status !== 'pending' && selectedOrderForDetails.status !== 'pending_verification')
                      ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <CheckCircle className={`w-5 h-5 ${
                        selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                        selectedOrderForDetails.status === 'preparing' || selectedOrderForDetails.status === 'payment_confirmed' ||
                        (selectedOrderForDetails.paymentStatus === 'paid' && selectedOrderForDetails.status !== 'pending' && selectedOrderForDetails.status !== 'pending_verification')
                        ? 'text-amber-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="font-bold text-gray-900">Payment Confirmed</p>
                      <p className="text-sm text-gray-500">
                        {selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                         selectedOrderForDetails.status === 'preparing' || selectedOrderForDetails.status === 'payment_confirmed' ||
                         (selectedOrderForDetails.paymentStatus === 'paid' && selectedOrderForDetails.status !== 'pending' && selectedOrderForDetails.status !== 'pending_verification')
                          ? 'Payment verified' : 'Waiting for payment confirmation'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className={`p-2 rounded-full ${
                      selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                      selectedOrderForDetails.status === 'preparing'
                      ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <Utensils className={`w-5 h-5 ${
                        selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' || 
                        selectedOrderForDetails.status === 'preparing'
                        ? 'text-amber-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="font-bold text-gray-900">Preparing Your Order</p>
                      <p className="text-sm text-gray-500">
                        {selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' 
                          ? 'Completed' : 
                          selectedOrderForDetails.status === 'preparing' 
                          ? 'In Progress....' : 
                          'Waiting for payment confirmation'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div className={`p-2 rounded-full ${
                      selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' 
                      ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <Bell className={`w-5 h-5 ${
                        selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' 
                        ? 'text-amber-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="ml-4">
                      <p className="font-bold text-gray-900">Ready</p>
                      <p className="text-sm text-gray-500">
                        {selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready' 
                          ? 'Completed' : 'To serve'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ordered Items */}
              <div className="p-6 border-t border-gray-100">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Ordered Items</h4>
                <div className="space-y-2">
                  {selectedOrderForDetails.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.quantity} x {item.name}</p>
                        {item.customizations && (
                          <p className="text-sm text-gray-500">
                            {Object.entries(item.customizations).map(([key, value]) => 
                              `${key}: ${value}`
                            ).join(', ')}
                          </p>
                        )}
                      </div>
                      <p className="font-bold text-amber-600">₱{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Information */}
              <div className="p-6 border-t border-gray-100">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedOrderForDetails.payment_method || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                    <p className={`font-medium ${
                      selectedOrderForDetails.payment_status === 'paid' ? 'text-green-600' :
                      selectedOrderForDetails.payment_status === 'failed' ? 'text-red-600' :
                      'text-amber-600'
                    }`}>
                      {selectedOrderForDetails.payment_status === 'paid' ? 'Paid' :
                       selectedOrderForDetails.payment_status === 'failed' ? 'Failed' :
                       'Pending'}
                    </p>
                  </div>
                </div>

                {/* Receipt Upload for Digital Payments */}
                {(selectedOrderForDetails.payment_method === 'gcash' || selectedOrderForDetails.payment_method === 'paymaya') && 
                 selectedOrderForDetails.payment_status !== 'paid' && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-700 mb-3 block">
                      Upload Payment Receipt
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="space-y-3">
                      {!receiptFileForModal ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#a87437] transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleReceiptFileUpload(e, true)}
                            className="hidden"
                            id="receipt-upload-modal"
                          />
                          <label
                            htmlFor="receipt-upload-modal"
                            className="cursor-pointer flex flex-col items-center gap-2"
                          >
                            <Upload className="w-8 h-8 text-gray-400" />
                            <div className="text-sm text-gray-600">
                              Click to upload receipt image
                            </div>
                            <div className="text-xs text-gray-500">
                              JPG, PNG (max 5MB)
                            </div>
                          </label>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <FileImage className="w-5 h-5 text-[#a87437]" />
                              <span className="text-sm font-medium text-gray-700">
                                {receiptFileForModal.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeReceipt(true)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                          {receiptPreviewForModal && (
                            <div className="mt-3">
                              <img
                                src={receiptPreviewForModal}
                                alt="Receipt preview"
                                className="max-w-full h-auto max-h-48 rounded-lg border border-gray-200"
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleUploadReceipt(selectedOrderForDetails.order_id, true)}
                            disabled={uploadingReceiptForModal}
                            className="mt-3 w-full px-4 py-2 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                          >
                            {uploadingReceiptForModal ? 'Uploading...' : 'Upload Receipt'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Completion Time - Only shown for completed orders */}
              {selectedOrderForDetails.completed_time && selectedOrderForDetails.status === 'completed' && (
                <div className="p-6 border-t border-gray-100">
                  <div className="text-sm text-gray-500 text-center">
                    Order completed on {new Date(selectedOrderForDetails.completed_time).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })} at {formatOrderTime(selectedOrderForDetails.completed_time)}
                  </div>
                </div>
              )}

              {/* Total Amount */}
              <div className="p-6 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-amber-600">₱{formatPrice(selectedOrderForDetails.total_price)}</span>
                </div>
              </div>

              {/* Download Receipt and Feedback Buttons - Only shown after payment is verified */}
              {(selectedOrderForDetails.payment_status === 'paid' && (selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready')) || 
               (selectedOrderForDetails.status === 'completed' && !ordersWithFeedback.has(selectedOrderForDetails.order_id)) ? (
                <div className="p-6 border-t border-gray-100">
                  <div className="flex justify-center gap-3 flex-wrap">
                    {/* Download Receipt Button */}
                    {selectedOrderForDetails.payment_status === 'paid' && (selectedOrderForDetails.status === 'completed' || selectedOrderForDetails.status === 'ready') && (
                      <button
                        onClick={() => downloadReceipt(selectedOrderForDetails.order_id)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#a87437] text-white rounded-lg hover:bg-[#8f652f] transition-colors font-medium border border-[#a87437]"
                      >
                        <Download className="w-5 h-5" />
                        Download Receipt
                      </button>
                    )}
                    
                    {/* Feedback Button for Completed Orders */}
                    {selectedOrderForDetails.status === 'completed' && !ordersWithFeedback.has(selectedOrderForDetails.order_id) && (
                      <button
                        onClick={() => handleFeedbackClick(selectedOrderForDetails)}
                        className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
                      >
                        <Star className="w-5 h-5" />
                        Leave Feedback
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
              
              {/* Feedback Submitted Indicator */}
              {selectedOrderForDetails.status === 'completed' && ordersWithFeedback.has(selectedOrderForDetails.order_id) && (
                <div className="p-6 border-t border-gray-100">
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 px-6 py-3 bg-green-100 text-green-800 rounded-lg">
                      <Star className="w-5 h-5 fill-current" />
                      Feedback Submitted
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedOrderForFeedback && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Leave Feedback</h2>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close feedback modal"
                  title="Close feedback modal"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <form onSubmit={handleSubmitFeedback} className="space-y-6">
                {/* Order Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Order Details</h3>
                  <p className="text-sm text-gray-600">Order ID: {getShortOrderCode(selectedOrderForFeedback)}</p>
                  <p className="text-sm text-gray-600">Total: ₱{formatPrice(selectedOrderForFeedback.total_price)}</p>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Rating</label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className={`p-1 rounded ${
                            star <= feedbackRating
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          } hover:text-yellow-400 transition-colors`}
                          title={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                        >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-600">
                      {feedbackRating} star{feedbackRating !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    title="Select feedback category"
                    aria-label="Select feedback category"
                  >
                    <option value="General">General</option>
                    <option value="Food Quality">Food Quality</option>
                    <option value="Service">Service</option>
                    <option value="Ambiance">Ambiance</option>
                    <option value="Speed">Speed</option>
                    <option value="Value">Value</option>
                  </select>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comment (Optional)</label>
                  <textarea
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Tell us about your experience..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  {(commentContainsProfanity || categoryContainsProfanity) && (
                    <p className="mt-2 text-sm text-red-600">
                      Please remove inappropriate language. Feedback containing profanity cannot be submitted.
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingFeedback || commentContainsProfanity || categoryContainsProfanity}
                    className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {submittingFeedback ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        Submit Feedback
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrders; 
