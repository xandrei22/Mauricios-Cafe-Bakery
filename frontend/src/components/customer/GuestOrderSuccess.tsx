import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { decodeId } from '../../utils/idObfuscation';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle, ArrowLeft, ShoppingCart, User } from 'lucide-react';
import { CustomerNavbar } from '../ui/CustomerNavbar';

const GuestOrderSuccess: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const decodedId = decodeId(orderId);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNavbar />
      
      <div className="max-w-2xl mx-auto px-4 py-8 pt-20">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-green-600">Order Placed Successfully!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg text-gray-600 mb-2">Your order has been received and is being prepared.</p>
              <p className="text-sm text-gray-500">Order ID: <span className="font-mono font-semibold">{decodedId || 'Unknown'}</span></p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <User className="h-5 w-5" />
                <span className="font-semibold">Guest Order Notice</span>
              </div>
              <p className="text-blue-700 text-sm">
                You ordered as a guest. For order history, loyalty points, and a better experience, 
                consider creating an account for future orders.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(decodedId ? `/guest/order-tracking/${orderId}` : '/guest/order-tracking')}
                className="flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Track Your Order
              </Button>
              <Button
                onClick={() => navigate('/customer-signup')}
                className="bg-[#a87437] hover:bg-[#8f652f] text-white flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Create Account
              </Button>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestOrderSuccess;
