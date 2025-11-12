import React, { useState, useRef } from 'react';
import { CheckCircle, CreditCard, FileImage, X, Download, Printer } from 'lucide-react';
import CashPaymentModal from './CashPaymentModal';
import { encodeId } from '../../utils/idObfuscation';
import axiosInstance from '../../utils/axiosInstance';
import { getApiUrl } from '../../utils/apiConfig';

interface Order {
  orderId: string;
  customerName: string;
  tableNumber: number;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  items: any[];
  cancelledBy?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  receiptPath?: string;
  placedBy?: 'customer' | 'admin' | 'staff';
}

interface PaymentProcessorProps {
  orders: Order[];
  onPaymentProcessed: () => void;
  staffId: string;
  children?: React.ReactNode;
}

const PaymentProcessor: React.FC<PaymentProcessorProps> = ({ orders, onPaymentProcessed, staffId, children }) => {
  const API_URL = getApiUrl();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'cancelled'>('pending');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const pendingOrders = orders.filter(order => {
    // Include orders with pending payment status regardless of order status
    // This ensures admin/staff placed orders with pending payment appear here
    const paymentStatus = (order.paymentStatus || '').toLowerCase();
    const hasPendingPayment = paymentStatus === 'pending' || paymentStatus === 'pending_verification';
    const isNotCancelled = order.status !== 'cancelled';
    const isNotCompleted = order.status !== 'completed';
    
    // Also include orders that are paid but still in pending/preparing status (might need review)
    // This helps catch orders that were marked as paid but shouldn't have been
    const isPaidButPending = paymentStatus === 'paid' && (order.status === 'pending' || order.status === 'preparing');
    
    const include = (hasPendingPayment || isPaidButPending) && isNotCancelled && isNotCompleted;
    console.log(`🔍 Order ${order.orderId}: paymentStatus=${order.paymentStatus}, status=${order.status}, placedBy=${order.placedBy}, includeInPending=${include}, isPaidButPending=${isPaidButPending}`);
    return include;
  });
  
  // Debug logging
  React.useEffect(() => {
    console.log('🔍 PaymentProcessor - All orders received:', orders.length);
    console.log('🔍 PaymentProcessor - All orders details:', orders.map(o => ({ 
      orderId: o.orderId, 
      status: o.status, 
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      placedBy: o.placedBy
    })));
    
    const ordersWithPendingPayment = orders.filter(o => {
      const ps = (o.paymentStatus || '').toLowerCase();
      return ps === 'pending' || ps === 'pending_verification';
    });
    console.log('🔍 PaymentProcessor - Orders with pending payment:', ordersWithPendingPayment.length);
    console.log('🔍 PaymentProcessor - Orders with pending payment details:', ordersWithPendingPayment);
    
    const ordersWithPaidStatus = orders.filter(o => {
      const ps = (o.paymentStatus || '').toLowerCase();
      return ps === 'paid';
    });
    console.log('🔍 PaymentProcessor - Orders with paid status:', ordersWithPaidStatus.length);
    console.log('🔍 PaymentProcessor - Orders with paid status details:', ordersWithPaidStatus.map(o => ({
      orderId: o.orderId,
      status: o.status,
      paymentStatus: o.paymentStatus
    })));
    
    console.log('🔍 PaymentProcessor - Pending orders after filter:', pendingOrders.length);
    console.log('🔍 PaymentProcessor - Pending orders details:', pendingOrders.map(o => ({ 
      orderId: o.orderId, 
      paymentStatus: o.paymentStatus, 
      status: o.status 
    })));
  }, [orders, pendingOrders]);
  
  const cancelledOrders = orders.filter(order => order.status === 'cancelled');

  const toShortId = (rawOrderId: string) => {
    try {
      const encoded = encodeId(String(rawOrderId || ''));
      const letters = encoded.replace(/[^A-Za-z]/g, '').slice(0, 3);
      const digits = encoded.replace(/\D/g, '').slice(-2);
      const partA = (letters || encoded.slice(0, 3)).padEnd(3, 'X');
      const partB = (digits || '00').padStart(2, '0');
      return partA + partB;
    } catch {
      // Fallback: last 5 non-separator characters
      return String(rawOrderId || '').replace(/[^A-Za-z0-9]/g, '').slice(-5) || String(rawOrderId || '');
    }
  };

  // Real-time updates are handled automatically by the parent component

  // Add a small indicator to show real-time updates are working
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);
  
  React.useEffect(() => {
    if (orders.length > 0) {
      setLastUpdate(new Date());
    }
  }, [orders]);

  const viewReceipt = async (orderId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/receipts/receipt/${orderId}`, {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setReceiptImage(imageUrl);
        setShowReceiptModal(true);
      } else {
        alert('No receipt found for this order. Customer may not have uploaded it yet.');
      }
    } catch (error) {
      console.error('Error viewing receipt:', error);
      alert('Error loading receipt. Please try again.');
    }
  };

  const downloadReceipt = async (orderId: string) => {
    try {
      // Download JPEG receipt for customers
      const receiptUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/receipts/download-jpeg/${orderId}`;
      const link = document.createElement('a');
      link.href = receiptUrl;
      link.download = `receipt_${orderId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Error downloading receipt. Please try again.');
    }
  };

  const printReceipt = async (orderId: string) => {
    try {
      // Open HTML receipt in new tab for printing
      const receiptUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/receipts/generate/${orderId}`;
      const printWindow = window.open(receiptUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('Error printing receipt. Please try again.');
    }
  };

  const verifyPayment = async (orderId: string, reference?: string, transactionId?: string) => {
    try {
      setProcessingPayment(true);
      // Correct endpoint lives under /api/orders, not /api/admin/orders
      const res = await axiosInstance.post(`${API_URL}/api/orders/${orderId}/verify-payment`, {
        paymentMethod: selectedOrder?.paymentMethod,
        verifiedBy: 'admin',
        reference,
        transactionId
      });

      if (res.status >= 200 && res.status < 300) {
        const result = res.data || {};
        if (result.success) {
          // Show success message with better visibility
          alert('Payment verified successfully! Order is now pending preparation.');
          onPaymentProcessed();
          setSelectedOrder(null);
          setShowReceiptModal(false);
          // Stay in POS - no navigation needed
        } else {
          alert(`Failed to verify payment: ${result.message || result.error || 'Unknown error'}`);
        }
      } else {
        alert(`Failed to verify payment: HTTP ${res.status}`);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Error verifying payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };


  const getPaymentMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <span className="bg-green-100 text-green-800 text-sm px-3 py-1.5 rounded-full font-medium">Cash</span>;
      case 'gcash':
        return <span className="bg-green-100 text-green-800 text-sm px-3 py-1.5 rounded-full font-medium">GCash</span>;
      case 'paymaya':
        return <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1.5 rounded-full font-medium">PayMaya</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-sm px-3 py-1.5 rounded-full font-medium">{method}</span>;
    }
  };

  const handleCashPayment = () => {
    setShowCashModal(true);
  };

  const handleCashPaymentProcessed = () => {
    setShowCashModal(false);
    setSelectedOrder(null);
    onPaymentProcessed();
  };

  const handleReferenceSubmit = () => {
    if (!referenceNumber.trim()) {
      alert('Please enter a reference number');
      return;
    }
    verifyPayment(selectedOrder?.orderId || '', referenceNumber.trim(), transactionId.trim() || undefined);
    setShowReferenceModal(false);
    setReferenceNumber('');
    setTransactionId('');
  };



  return (
    <div className="bg-white rounded-lg shadow-md p-6 w-full self-start overflow-hidden h-96">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-800">Payment Processing</h2>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Updated {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Optional slot: render Customer Info / Cart directly under the title */}
      {children && (
        <div className="mb-6">
          {children}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
        {/* Orders Tabs */}
        <div className="min-w-0 max-w-full flex flex-col bg-white rounded-lg overflow-hidden">
          <div className="flex border-b border-gray-200 mb-3 px-3 pt-3">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-[#a87437] text-[#a87437] bg-[#a87437]/10'
                  : 'border-transparent text-[#6B5B5B] hover:text-[#3f3532] hover:border-[#a87437]/30'
              }`}
            >
              Pending Payments ({pendingOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'cancelled'
                  ? 'border-red-500 text-red-600 bg-red-50'
                  : 'border-transparent text-[#6B5B5B] hover:text-[#3f3532] hover:border-red-300'
              }`}
            >
              Cancelled Orders ({cancelledOrders.length})
            </button>
          </div>
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto max-h-[200px] relative scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 pr-2 px-3">

          {/* Pending Orders Tab */}
          {activeTab === 'pending' && (
            <>
              {pendingOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No pending payments</p>
                </div>
              ) : (
                <div className="space-y-3 pb-6 pt-4">
                  {pendingOrders.map((order) => (
                    <div
                      key={order.orderId}
                      className={`p-4 pb-4 border rounded-lg cursor-pointer transition-colors mb-2 ${
                        selectedOrder?.orderId === order.orderId
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex flex-col mb-2">
                        <div className="flex items-center justify-end mb-2">
                          <div className="flex items-center gap-1">
                            {order.paymentStatus === 'pending_verification' && (
                              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                                Receipt Uploaded
                              </span>
                            )}
                            {getPaymentMethodBadge(order.paymentMethod)}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <div className="text-sm font-bold text-gray-900">{toShortId(order.orderId)}</div>
                          <span className="text-sm text-gray-500">Click to view details</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {order.paymentStatus === 'pending_verification' && (
                          <span className="text-orange-600 font-medium">Awaiting verification</span>
                        )}
                        {order.paymentStatus === 'pending' && (
                          <span className="text-yellow-600 font-medium">Payment pending</span>
                        )}
                        {order.paymentStatus === 'paid' && (order.status === 'pending' || order.status === 'preparing') && (
                          <span className="text-blue-600 font-medium">✓ Payment verified - Ready for preparation</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Cancelled Orders Tab */}
          {activeTab === 'cancelled' && (
            <>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Cancelled Orders</h3>
              {cancelledOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No cancelled orders</p>
                </div>
              ) : (
                <div className="space-y-3 pb-6 pt-4">
                  {cancelledOrders.map((order) => (
                    <div
                      key={order.orderId}
                      className="p-4 pb-4 border border-red-200 rounded-lg bg-red-50 cursor-pointer hover:bg-red-100 transition-colors mb-2"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="flex flex-col mb-2">
                        <div className="flex items-center justify-end mb-2">
                          <span className="bg-red-100 text-red-800 text-sm px-2 py-1 rounded-full">Cancelled</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="text-sm font-bold text-red-900">
                            {(() => {
                              const parts = order.orderId.split('-');
                              if (parts.length >= 2) {
                                return (
                                  <>
                                    {parts[0]}-{parts[1]}
                                    <br />
                                    {parts.slice(2).join('-')}
                                  </>
                                );
                              }
                              return order.orderId;
                            })()}
                          </div>
                          <span className="text-sm text-red-600">Click to view details</span>
                        </div>
                      </div>
                      <div className="text-sm text-red-700">
                        <p className="text-red-600">
                          Cancelled by: {order.cancelledBy || 'Staff'} • Reason: {order.cancellationReason || 'No reason provided'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          </div>
        </div>

        {/* Payment Processing Panel */}
        <div className="min-w-0 max-w-full overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Process Payment</h3>
          
          {selectedOrder ? (
            <>
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">Order Details</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Order ID:</strong> {toShortId(selectedOrder.orderId)}</p>
                  <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
                  <p><strong>{selectedOrder.tableNumber === 0 ? 'Takeout' : 'Table'}:</strong> {selectedOrder.tableNumber === 0 ? '' : selectedOrder.tableNumber}</p>
                  <p><strong>Total:</strong> ₱{selectedOrder.totalPrice}</p>
                  <p><strong>Payment Method:</strong> <span className="font-medium text-gray-800">{selectedOrder.paymentMethod.toUpperCase()}</span></p>
                </div>
              </div>

              {/* Payment Options */}
              <div className="space-y-1">
                {selectedOrder.paymentStatus === 'paid' && selectedOrder.status === 'pending' ? (
                  <div className="space-y-2">
                    <div className="w-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Payment Verified - Ready for Kitchen Preparation
                    </div>
                    {selectedOrder.receiptPath && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadReceipt(selectedOrder.orderId)}
                          className="flex-1 bg-[#a87437] hover:bg-[#8f652f] text-white font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Download Receipt
                        </button>
                        <button
                          onClick={() => printReceipt(selectedOrder.orderId)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                        >
                          <Printer className="w-4 h-4" />
                          Print Receipt
                        </button>
                      </div>
                    )}
                  </div>
                ) : selectedOrder.paymentMethod === 'cash' ? (
                  <button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                    onClick={handleCashPayment}
                    disabled={processingPayment}
                  >
                    <span className="text-lg font-bold">₱</span>
                    Process Cash Payment
                  </button>
                ) : selectedOrder.paymentMethod === 'gcash' || selectedOrder.paymentMethod === 'paymaya' ? (
                  <>
                    <div className="flex gap-2">
                      {/* Show View Receipt button only if order was placed by customer and has a receipt */}
                      {selectedOrder.placedBy === 'customer' && selectedOrder.receiptPath && (
                        <button
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-1.5 px-2 rounded-lg flex items-center justify-center transition-colors text-xs"
                          onClick={() => viewReceipt(selectedOrder.orderId)}
                          disabled={processingPayment}
                        >
                          View {selectedOrder.paymentMethod.toUpperCase()} Receipt
                        </button>
                      )}

                      <button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-2 rounded-lg flex items-center justify-center transition-colors text-xs"
                        onClick={() => setShowReferenceModal(true)}
                        disabled={processingPayment}
                      >
                        Enter Reference Number
                      </button>
                    </div>

                  </>
                ) : (
                  <>
                    <div className="flex gap-1">
                      {/* Show View Receipt button only if order was placed by customer and has a receipt */}
                      {selectedOrder.placedBy === 'customer' && selectedOrder.receiptPath && (
                        <button
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-1.5 px-2 rounded-lg flex items-center justify-center transition-colors text-xs"
                          onClick={() => viewReceipt(selectedOrder.orderId)}
                          disabled={processingPayment}
                        >
                          View {selectedOrder.paymentMethod.toUpperCase()} Receipt
                        </button>
                      )}
                    </div>

                    {/* Removed inline verify button to ensure verification is done via the receipt modal */}

                  </>
                )}

                <div className="flex gap-1">
                  <button
                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-medium py-1 px-2 rounded-lg transition-colors text-sm"
                    onClick={async () => {
                      if (confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
                        try {
                          // Use the staff orders endpoint instead of admin
                          const res = await axiosInstance.put(`${API_URL}/api/orders/${selectedOrder.orderId}/status`, {
                            status: 'cancelled',
                            cancelledBy: staffId,
                            cancellationReason: 'Cancelled by staff during payment processing',
                            cancelledAt: new Date().toISOString()
                          });

                          if (res.status >= 200 && res.status < 300) {
                            const result = res.data || {};
                            if (result.success) {
                              alert('Order cancelled successfully');
                              onPaymentProcessed(); // Refresh the orders list
                              setSelectedOrder(null);
                            } else {
                              alert(`Failed to cancel order: ${result.error || 'Unknown error'}`);
                            }
                          } else {
                            alert(`Failed to cancel order: HTTP ${res.status}`);
                          }
                        } catch (error) {
                          console.error('Error cancelling order:', error);
                          alert('Error cancelling order: Network or server error');
                        }
                      }
                    }}
                  >
                    Cancel Order
                  </button>
                  <button
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1 px-2 rounded-lg transition-colors text-sm"
                    onClick={() => {
                      setSelectedOrder(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Select an order to process payment</p>
            </div>
          )}
        </div>
      </div>

      {/* Cash Payment Modal */}
      {showCashModal && selectedOrder && (
        <CashPaymentModal
          order={selectedOrder}
          onClose={() => setShowCashModal(false)}
          onPaymentProcessed={handleCashPaymentProcessed}
          staffId={staffId}
        />
      )}

      {/* Receipt Viewing Modal */}
      {showReceiptModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Payment Receipt - {selectedOrder.paymentMethod.toUpperCase()}
              </h3>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  if (receiptImage) {
                    URL.revokeObjectURL(receiptImage);
                    setReceiptImage(null);
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Close Receipt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Order Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <p><strong>Order ID:</strong> {toShortId(selectedOrder.orderId)}</p>
                  <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
                  <p><strong>{selectedOrder.tableNumber === 0 ? 'Takeout' : 'Table'}:</strong> {selectedOrder.tableNumber === 0 ? '' : selectedOrder.tableNumber}</p>
                  <p><strong>Total:</strong> ₱{selectedOrder.totalPrice}</p>
                </div>
              </div>

              {/* Receipt Image */}
              {receiptImage && (
                <div className="text-center">
                  <img 
                    src={receiptImage} 
                    alt="Payment Receipt" 
                    className="max-w-full max-h-96 mx-auto border rounded-lg shadow-sm"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Customer uploaded receipt for verification
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReceiptModal(false);
                    if (receiptImage) {
                      URL.revokeObjectURL(receiptImage);
                      setReceiptImage(null);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => verifyPayment(selectedOrder.orderId)}
                  disabled={processingPayment}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Verify Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reference Number Modal */}
      {showReferenceModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Enter Payment Reference
              </h3>
              <button
                onClick={() => {
                  setShowReferenceModal(false);
                  setReferenceNumber('');
                  setTransactionId('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Order Details</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Order ID:</strong> {toShortId(selectedOrder.orderId)}</p>
                  <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
                  <p><strong>Total:</strong> ₱{selectedOrder.totalPrice}</p>
                  <p><strong>Method:</strong> {selectedOrder.paymentMethod.toUpperCase()}</p>
                </div>
              </div>

              {/* Reference Input */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number *
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setReferenceNumber(value);
                    }}
                    placeholder={`Enter ${selectedOrder.paymentMethod.toUpperCase()} reference number`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction ID if available"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReferenceModal(false);
                    setReferenceNumber('');
                    setTransactionId('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReferenceSubmit}
                  disabled={processingPayment || !referenceNumber.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Verify Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentProcessor; 