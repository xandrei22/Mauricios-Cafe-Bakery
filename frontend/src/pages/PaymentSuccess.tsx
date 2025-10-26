import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Receipt, Clock, Coffee } from 'lucide-react';
import SimpleFooter from '../components/ui/SimpleFooter';

interface PaymentSuccessProps {}

const PaymentSuccess: React.FC<PaymentSuccessProps> = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const orderId = searchParams.get('orderId');
  const method = searchParams.get('method');
  const amount = searchParams.get('amount');

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payment/status/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setOrderDetails(data);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'gcash':
        return '💚'; // GCash green
      case 'paymaya':
        return '💙'; // PayMaya blue
      default:
        return '💳';
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'gcash':
        return 'GCash';
      case 'paymaya':
        return 'PayMaya';
      default:
        return 'Digital Payment';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Your order has been confirmed</p>
        </div>

        {/* Payment Details */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">{getPaymentMethodIcon(method)}</span>
              <div>
                <p className="font-semibold text-gray-800">{getPaymentMethodName(method)}</p>
                <p className="text-sm text-gray-600">Digital Payment</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">₱{amount}</p>
              <p className="text-sm text-gray-600">Amount Paid</p>
            </div>
          </div>

          {/* Order Details */}
          {orderDetails && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Receipt className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600">Order ID</span>
                </div>
                <span className="text-sm font-mono text-gray-800">{orderId}</span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600">Payment Time</span>
                </div>
                <span className="text-sm text-gray-800">
                  {orderDetails.completedAt ? 
                    new Date(orderDetails.completedAt).toLocaleTimeString() : 
                    new Date().toLocaleTimeString()
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Coffee className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-600">Status</span>
                </div>
                <span className="text-sm font-semibold text-green-600 uppercase">
                  {orderDetails.paymentStatus || 'Paid'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">What's Next?</h3>
          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Your order is being prepared</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>You'll be notified when it's ready</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Collect your order at the counter</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/menu')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200"
          >
            Order More
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 rounded-xl transition-colors duration-200"
          >
            Back to Home
          </button>
        </div>

        {/* Thank You Message */}
        <div className="text-center mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Thank you for choosing our coffee shop! ☕
          </p>
        </div>
        </div>
      </div>
      
      {/* Footer */}
      <SimpleFooter />
    </div>
  );
};

export default PaymentSuccess; 