import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, CreditCard } from 'lucide-react';

const CustomerPaymentDemo: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPayment, setSelectedPayment] = useState<string>('gcash');

  // Sample order data for testing
  const sampleOrderDetails = {
    orderId: `DEMO-${Date.now()}`,
    items: [
      { name: 'Cappuccino', quantity: 2, price: 120.00 },
      { name: 'Croissant', quantity: 1, price: 85.00 }
    ],
    totalAmount: 325.00,
    pickupTime: '15 minutes',
    location: 'Main Counter'
  };

  const handleStartPayment = () => {
    navigate('/customer/payment', { 
      state: { orderDetails: sampleOrderDetails } 
    });
  };

  const paymentMethods = [
    {
      id: 'gcash',
      name: 'GCash',
      icon: '📱',
      description: 'Instant QR payment - Auto-processed',
      color: 'bg-blue-50 border-blue-200 text-blue-600'
    },
    {
      id: 'paymaya',
      name: 'PayMaya',
      icon: '💳',
      description: 'Secure QR payment - Manual confirmation',
      color: 'bg-green-50 border-green-200 text-green-600'
    },
    {
      id: 'counter',
      name: 'Pay at Counter',
      icon: '🏪',
      description: 'Cash or card at store',
      color: 'bg-gray-50 border-gray-200 text-gray-600'
    }
  ];

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
          <h1 className="text-lg font-semibold">Payment Flow Demo</h1>
          <div className="w-9"></div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Demo Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="font-semibold text-blue-800 mb-2">🧪 Payment Flow Testing</h2>
          <p className="text-sm text-blue-700">
            This demo shows the complete payment flow for GCash and PayMaya. 
            Use the sample order below to test the payment process.
          </p>
        </div>

        {/* Sample Order */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Sample Order
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID</span>
              <span className="font-medium">#{sampleOrderDetails.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Items</span>
              <span className="font-medium">{sampleOrderDetails.items.length} items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount</span>
              <span className="font-medium">₱{sampleOrderDetails.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup Time</span>
              <span className="font-medium">{sampleOrderDetails.pickupTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location</span>
              <span className="font-medium">{sampleOrderDetails.location}</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <h3 className="font-semibold mb-3">Choose Payment Method to Test</h3>
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
                    <div className="text-2xl">{method.icon}</div>
                    <div>
                      <h4 className="font-medium">{method.name}</h4>
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

        {/* Flow Explanation */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-3">📋 Payment Flow Steps</h3>
          <div className="space-y-2 text-sm text-yellow-700">
            {selectedPayment === 'gcash' && (
              <>
                <p><strong>GCash Flow:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Click "Start Payment Demo"</li>
                  <li>Select GCash payment method</li>
                  <li>Click "Process Method" to generate QR</li>
                  <li>GCash payment is automatically processed</li>
                  <li>Redirected to orders section</li>
                </ol>
              </>
            )}
            {selectedPayment === 'paymaya' && (
              <>
                <p><strong>PayMaya Flow:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Click "Start Payment Demo"</li>
                  <li>Select PayMaya payment method</li>
                  <li>Click "Process Method" to generate QR</li>
                  <li>Scan QR code with PayMaya app</li>
                  <li>Complete payment in app</li>
                  <li>Payment status updates automatically</li>
                  <li>Redirected to orders section</li>
                </ol>
              </>
            )}
            {selectedPayment === 'counter' && (
              <>
                <p><strong>Counter Payment Flow:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Click "Start Payment Demo"</li>
                  <li>Select "Pay at Counter" method</li>
                  <li>Order marked as pending payment</li>
                  <li>Redirected to orders section</li>
                  <li>Pay at counter when ready</li>
                </ol>
              </>
            )}
          </div>
        </div>

        {/* Start Demo Button */}
        <button
          onClick={handleStartPayment}
          className="w-full bg-amber-600 text-white py-4 rounded-lg font-semibold hover:bg-amber-700 flex items-center justify-center text-lg"
        >
          <CreditCard className="w-6 h-6 mr-2" />
          Start Payment Demo
        </button>

        {/* Notes */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">📝 Notes:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• This is a demo environment - no real payments will be processed</li>
            <li>• QR codes are generated for demonstration purposes</li>
            <li>• Payment status updates are simulated</li>
            <li>• Use this to test the complete user experience</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CustomerPaymentDemo;
