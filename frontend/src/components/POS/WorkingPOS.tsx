import React, { useState, useEffect } from 'react';
// removed unused Card imports after removing stats cards
import { io } from 'socket.io-client';
// removed unused icons after removing stats cards
import PaymentProcessor from './PaymentProcessor';
import SimplePOS from './SimplePOS';

interface Order {
  id: string;
  orderId: string;
  customerName: string;
  tableNumber: number;
  items: any[];
  totalPrice: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'pending_verification' | 'paid' | 'failed';
  paymentMethod: string;
  orderTime: string;
  notes?: string;
}


const WorkingPOS: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io();

    // Join staff room for real-time updates
    newSocket.emit('join-staff-room');

    // Listen for real-time updates
    newSocket.on('new-order-received', (orderData) => {
      console.log('New order received:', orderData);
      fetchOrders();
    });

    newSocket.on('order-updated', (updateData) => {
      console.log('Order updated:', updateData);
      fetchOrders();
    });

    newSocket.on('payment-updated', (paymentData) => {
      console.log('Payment updated:', paymentData);
      fetchOrders();
    });

    // Initial data fetch
    fetchOrders();

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/staff/orders`, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        const normalized = (data.orders || []).map((o: any) => ({
          ...o,
          orderId: o.orderId || o.id || o.order_id,
          paymentStatus: o.paymentStatus || o.payment_status,
          totalPrice: Number(o.totalPrice ?? o.total_price ?? 0),
        }));
        setOrders(normalized);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4 bg-gray-50 min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#3f3532] mb-2">Point of Sale</h1>
          <p className="text-[#6B5B5B]">Select items and manage orders</p>
        </div>

        {/* Stats cards removed per request */}

        {/* Main Content - Menu and sidebar with spacious proportions */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_24rem] gap-6 items-start">
          {/* Left: Take Order (menu filters + grid) under Completed */}
          <div className="space-y-4 order-1">
            <SimplePOS 
              children={
                <PaymentProcessor 
                  orders={orders.filter(o => o.paymentStatus === 'pending' || o.paymentStatus === 'pending_verification')}
                  onPaymentProcessed={fetchOrders}
                  staffId="admin"
                />
              }
            />
          </div>

          {/* Right: Empty space - PaymentProcessor now under cart */}
          <div className="space-y-4 order-2">
            {/* Payment processing is now under the cart in SimplePOS */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkingPOS; 