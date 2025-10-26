import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Smartphone, CreditCard, Building, QrCode, CheckCircle } from 'lucide-react';
import CustomerPaymentQR from './CustomerPaymentQR';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  tag?: string;
  color: string;
}

interface OrderDetails {
  orderId: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  pickupTime: string;
  location: string;
}

const CustomerPayment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPayment, setSelectedPayment] = useState<string>('gcash');
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'paid' | 'failed'>('pending');

  useEffect(() => {
    // Get order details from location state or fetch from API
    if (location.state?.orderDetails) {
      setOrderDetails(location.state.orderDetails);
    }
  }, [location]);

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'gcash',
      name: 'Gcash',
      icon: <Smartphone className="w-6 h-6" />,
      description: 'Pay with QR code - Instant',
      tag: 'Popular',
      color: 'bg-blue-50 border-blue-200 text-blue-600'
    },
    {
      id: 'paymaya',
      name: 'Paymaya',
      icon: <CreditCard className="w-6 h-6" />,
      description: 'Pay with QR code - Secure',
      color: 'bg-green-50 border-green-200 text-green-600'
    },
    {
      id: 'counter',
      name: 'Pay at Counter',
      icon: <Building className="w-6 h-6" />,
      description: 'Cash or card payment',
      color: 'bg-gray-50 border-gray-200 text-gray-600'
    }
  ];

  // For QR-wallets, we scan the shop's static QR and the user pays inside GCash/PayMaya.
  // We mark the order as pending with the chosen payment method and rely on receipt upload + admin verification.
  const markPendingForWallet = async () => {
    try {
      await fetch(`/api/orders/${orderDetails?.orderId}/payment-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'pending', payment_method: selectedPayment })
      });
    } catch (e) {
      console.error('Failed to mark pending', e);
    }
  };

  const handleCounterPayment = async () => {
    try {
      const response = await fetch(`/api/orders/${orderDetails?.orderId}/payment-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'pending' })
      });
      
      if (response.ok) {
        navigate('/customer/orders', { 
          state: { 
            message: 'Order placed! Please pay at the counter.',
            orderId: orderDetails?.orderId 
          } 
        });
      }
    } catch (error) {
      console.error('Counter payment error:', error);
    }
  };

  const handleScanQR = () => {
    // handled inside embedded scanner now
  };

  const handlePaymentConfirm = async () => {
    setLoading(true);
    try {
      if (selectedPayment === 'counter') {
        await handleCounterPayment();
      } else {
        await markPendingForWallet();
        alert('After paying in your wallet app, please upload the receipt below.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-[#f8eee4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No order details found</p>
          <button
            onClick={() => navigate('/customer/menu')}
            className="mt-4 bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8eee4]">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Payment</h1>
          <div className="w-9"></div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Payment Methods */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Choose Payment Method</h2>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                onClick={() => setSelectedPayment(method.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPayment === method.id
                    ? `${method.color} border-current`
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      selectedPayment === method.id ? 'bg-white/20' : 'bg-gray-50'
                    }`}>
                      {method.icon}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{method.name}</h3>
                        {method.tag && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                            {method.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                  </div>
                  {selectedPayment === method.id && (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wallet flow: scan shop QR and upload receipt */}
        {(selectedPayment === 'gcash' || selectedPayment === 'paymaya') && (
          <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
            <h3 className="font-semibold mb-1 flex items-center">
              <QrCode className="w-5 h-5 mr-2" />
              Scan Shop QR with {selectedPayment === 'gcash' ? 'GCash' : 'PayMaya'}
            </h3>
            <ol className="text-sm text-gray-600 list-decimal ml-5 space-y-1">
              <li>Tap Enable Camera and scan the shop QR code.</li>
              <li>The wallet app opens. Enter the exact amount and pay.</li>
              <li>Return here and upload the payment receipt screenshot.</li>
            </ol>
            <CustomerPaymentQR
              orderId={orderDetails.orderId}
              onScanned={async () => { await markPendingForWallet(); }}
            />
          </div>
        )}

        {/* Order Details */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Order Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup Time</span>
              <span className="font-medium">{orderDetails.pickupTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location</span>
              <span className="font-medium">{orderDetails.location}</span>
            </div>
            <div className="border-t border-yellow-200 pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span>Total Amount</span>
                <span>₱{orderDetails.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Payment Button */}
        {(selectedPayment === 'counter') && (
          <button
            onClick={handlePaymentConfirm}
            disabled={loading}
            className="w-full bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CustomerPayment; 