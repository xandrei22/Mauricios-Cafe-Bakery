import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CreditCard, Smartphone, Loader2, Coffee, Package } from 'lucide-react';

const CheckoutButton = () => {
  const { items: cartItems, total, clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeout'>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'paymaya'>('cash');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const navigate = useNavigate();

  // Load customer name from localStorage if available
  useEffect(() => {
    const savedName = localStorage.getItem('customerName');
    if (savedName) {
      setCustomerName(savedName);
    }

    // Auto-detect table number from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tableFromUrl = urlParams.get('table');
    if (tableFromUrl) {
      const tableNum = parseInt(tableFromUrl);
      if (tableNum >= 1 && tableNum <= 6) {
        setTableNumber(tableNum.toString());
        setOrderType('dine_in'); // Auto-set to dine-in if table is specified
      }
    }
  }, []);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Empty Cart',
        text: 'Please add items to your cart before checking out'
      });
      return;
    }

    // Basic validation
    if (orderType === 'dine_in' && !tableNumber.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Table Number Required',
        text: 'Please enter a table number for dine-in orders',
      });
      return;
    }

    if (orderType === 'dine_in' && (parseInt(tableNumber) < 1 || parseInt(tableNumber) > 6)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Table Number',
        text: 'Table number must be between 1 and 6',
      });
      return;
    }

    if (!customerName.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Name Required',
        text: 'Please enter your name for the order',
      });
      return;
    }

    // Save customer name for future orders
    localStorage.setItem('customerName', customerName.trim());

    // Show payment modal for cash payments
    if (paymentMethod === 'cash') {
      setShowPaymentModal(true);
      return;
    }

    // Process digital payments
    await processOrder();
  };

  const processOrder = async () => {
    setIsProcessingPayment(true);
    try {
      const orderData = {
        items: cartItems,
        totalPrice: total,
        customerName: customerName.trim(),
        tableNumber: orderType === 'dine_in' ? tableNumber.trim() : null,
        orderType,
        paymentMethod,
        status: paymentMethod === 'cash' ? 'pending_verification' : 'pending',
        paymentStatus: 'pending'
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) throw new Error('Failed to place order');
      
      const { orderId } = await response.json();
      setShowPaymentModal(false);
      
      if (paymentMethod === 'cash') {
        await Swal.fire({
          icon: 'success',
          title: 'Order Placed!',
          text: `Please proceed to counter for payment. Order #${orderId}`,
          confirmButtonText: 'View Orders'
        });
        clearCart();
        // Preserve table parameter when navigating to orders
        const urlParams = new URLSearchParams(window.location.search);
        const tableFromUrl = urlParams.get('table');
        const ordersUrl = tableFromUrl ? `/customer/orders?table=${tableFromUrl}` : '/customer/orders';
        navigate(ordersUrl);
      } else {
        // Handle digital payment flow
        navigate(`/customer/payment?orderId=${orderId}`);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Order Failed',
        text: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleConfirmCashPayment = async () => {
    await processOrder();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer Name */}
          <div>
            <Label htmlFor="customerName" className="mb-1 block">
              Your Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          {/* Order Type */}
          <div>
            <Label className="mb-2 block">Order Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={orderType === 'dine_in' ? 'default' : 'outline'}
                onClick={() => setOrderType('dine_in')}
                type="button"
                className="flex items-center justify-center gap-2"
              >
                <Coffee className="h-4 w-4" /> Dine-in
              </Button>
              <Button
                variant={orderType === 'takeout' ? 'default' : 'outline'}
                onClick={() => setOrderType('takeout')}
                type="button"
                className="flex items-center justify-center gap-2"
              >
                <Package className="h-4 w-4" /> Takeout
              </Button>
            </div>
          </div>

          {/* Table Number (only for dine-in) */}
          {orderType === 'dine_in' && (
            <div>
              <Label htmlFor="tableNumber" className="mb-1 block">
                Table Number <span className="text-red-500">*</span>
                <span className="text-sm text-gray-500 ml-2">(1-6)</span>
              </Label>
              <Input
                id="tableNumber"
                type="number"
                min="1"
                max="6"
                value={tableNumber}
                onChange={(e) => {
                  const value = e.target.value;
                  const num = parseInt(value);
                  if (value === '' || (num >= 1 && num <= 6)) {
                    setTableNumber(value);
                  }
                }}
                placeholder="Enter table number (1-6)"
                required={orderType === 'dine_in'}
              />
              {tableNumber && (parseInt(tableNumber) < 1 || parseInt(tableNumber) > 6) && (
                <p className="text-sm text-red-500 mt-1">Table number must be between 1 and 6</p>
              )}
            </div>
          )}

          {/* Payment Method */}
          <div>
            <Label className="mb-2 block">Payment Method</Label>
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={(value: 'cash' | 'gcash' | 'paymaya') => setPaymentMethod(value)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-bold">₱</span>
                  <span>Cash (Pay at Counter)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gcash" id="gcash" />
                <Label htmlFor="gcash" className="flex items-center gap-2 cursor-pointer">
                  <Smartphone className="h-4 w-4 text-green-600" />
                  <span>GCash</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paymaya" id="paymaya" />
                <Label htmlFor="paymaya" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <span>PayMaya</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Checkout Button */}
          <Button
            onClick={handleCheckout}
            disabled={isLoading || cartItems.length === 0}
            className="w-full mt-4"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Place Order'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Cash Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Pay at Counter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-gray-600">
                Please proceed to the counter to complete your payment.
                Your order will be prepared after payment verification.
              </p>
              <div className="text-xl font-bold text-center">
                Total: ₱{total.toFixed(2)}
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isProcessingPayment}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmCashPayment}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Order'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CheckoutButton;
 
