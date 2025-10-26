import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface CashPaymentModalProps {
  order: any;
  onClose: () => void;
  onPaymentProcessed: () => void;
  staffId: string;
}

const CashPaymentModal: React.FC<CashPaymentModalProps> = ({
  order,
  onClose,
  onPaymentProcessed,
  staffId
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [amount, setAmount] = useState(order.totalPrice);
  const [staffNotes, setStaffNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset error state when modal opens or order changes
  useEffect(() => {
    console.log('CashPaymentModal: Resetting state for order:', order.orderId);
    setError(null);
    setSuccess(false);
    setProcessing(false);
    setAmount(order.totalPrice);
    setStaffNotes('');
  }, [order.orderId]);

  // Debug success state changes
  useEffect(() => {
    console.log('CashPaymentModal: Success state changed to:', success);
  }, [success]);

  // Clear error when amount changes to valid value
  useEffect(() => {
    if (error && parseFloat(amount) >= parseFloat(order.totalPrice)) {
      setError(null);
    }
  }, [amount, error, order.totalPrice]);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      clearModalState();
    };
  }, []);

  const clearModalState = () => {
    setError(null);
    setSuccess(false);
    setProcessing(false);
    setAmount(order.totalPrice);
    setStaffNotes('');
  };

  const handleClose = () => {
    clearModalState();
    onClose();
  };

  const handleProcessPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) < parseFloat(order.totalPrice)) {
      setError('Amount cannot be less than order total');
      return;
    }

    // Clear any previous errors if amount is sufficient
    if (error && parseFloat(amount) >= parseFloat(order.totalPrice)) {
      setError(null);
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/payment/cash/${order.orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: parseFloat(amount),
          staffId: staffId,
          notes: staffNotes
        }),
      });

      if (response.ok) {
        console.log('CashPaymentModal: Payment successful, setting success to true');
        setSuccess(true);
        // Don't auto-close - let user manually close the modal
        // onPaymentProcessed(); // Don't call this immediately
        // onClose(); // Don't call this immediately
      } else {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || 'Failed to process payment');
        }
      }
    } catch (error) {
      console.error('Error processing cash payment:', error);
      setError('Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const calculateChange = () => {
    const change = parseFloat(amount) - parseFloat(order.totalPrice);
    return change >= 0 ? change.toFixed(2) : '0.00';
  };

  if (success) {
    console.log('CashPaymentModal: Rendering success modal');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Payment Successful!</h2>
            <p className="text-lg text-gray-600 mb-6">Cash payment has been processed and verified.</p>
            <div className="bg-green-50 rounded-lg p-6 mb-6">
              <p className="text-base text-green-800 mb-2">
                <strong>Order ID:</strong> {order.orderId}
              </p>
              <p className="text-base text-green-800 mb-2">
                <strong>Amount Paid:</strong> ₱{amount}
              </p>
              <p className="text-base text-green-800">
                <strong>Change:</strong> ₱{calculateChange()}
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Click the button below to continue processing orders
            </p>
            <button
              onClick={() => {
                console.log('CashPaymentModal: Continue to POS clicked');
                onPaymentProcessed();
                onClose();
              }}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-lg"
            >
              Continue to POS
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <span className="text-green-600 text-xl font-bold mr-2">₱</span>
            <h2 className="text-xl font-bold text-gray-800">Cash Payment</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Order Details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-2">Order Details</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>Order ID:</strong> {order.orderId}</p>
            <p><strong>{order.tableNumber === 0 ? 'Takeout' : 'Table'}:</strong> {order.tableNumber === 0 ? '' : order.tableNumber}</p>
            <p><strong>Customer:</strong> {order.customerName}</p>
            <p><strong>Total Amount:</strong> ₱{order.totalPrice}</p>
          </div>
          {order.notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">Customer Note:</p>
              <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-md p-2 italic">
                "{order.notes}"
              </p>
            </div>
          )}
        </div>

        {/* Payment Form */}
        <div className="space-y-4">
          {/* Amount Received */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Received (₱)
            </label>
            <input
              type="number"
              step="0.01"
              min={order.totalPrice}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter amount received"
            />
          </div>

          {/* Change Calculation */}
          {parseFloat(amount) >= parseFloat(order.totalPrice) && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Change to give:</strong> ₱{calculateChange()}
              </p>
            </div>
          )}

          {/* Staff Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Staff Notes (Optional)
            </label>
            <textarea
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={3}
              placeholder="Any additional staff notes..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Staff Verification Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Staff Verification Required:</strong> Please verify the cash amount received before processing this payment.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={processing}
          >
            Cancel
          </button>
          <button
            onClick={handleProcessPayment}
            disabled={processing || parseFloat(amount) < parseFloat(order.totalPrice)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify & Process
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CashPaymentModal; 