import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, User, CreditCard, Upload, FileImage } from 'lucide-react';
import { encodeId } from '../../utils/idObfuscation';

interface GuestOrderFormProps {
  cartItems: any[];
  onOrderPlaced: (orderId: string) => void;
  onClose: () => void;
  tableNumber?: string;
}

interface GuestCustomerInfo {
  name: string;
  paymentMethod: string;
  notes: string;
  tableNumber: string;
}

export default function GuestOrderForm({ cartItems, onOrderPlaced, onClose, tableNumber }: GuestOrderFormProps) {
  const navigate = useNavigate();
  const [customerInfo, setCustomerInfo] = useState<GuestCustomerInfo>({
    name: '',
    paymentMethod: 'cash',
    notes: '',
    tableNumber: tableNumber || ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const handleInputChange = (field: keyof GuestCustomerInfo, value: string) => {
    setCustomerInfo((prev: GuestCustomerInfo) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange('name', e.target.value);
  };

  const handleTableNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange('tableNumber', e.target.value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange('notes', e.target.value);
  };

  const handlePaymentChange = (value: string) => {
    handleInputChange('paymentMethod', value);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const itemTotal = (item.customPrice || item.price) * item.quantity;
      return total + itemTotal;
    }, 0);
  };

  const handleGuestCheckout = async () => {
    if (!customerInfo.name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate receipt upload for digital payments
    if ((customerInfo.paymentMethod === 'gcash' || customerInfo.paymentMethod === 'paymaya') && !receiptFile) {
      setError('Please upload your payment receipt');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';
      
      // Get table number from URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const tableFromUrl = urlParams.get('table');
      const tableNumber = tableFromUrl ? parseInt(tableFromUrl) : (customerInfo.tableNumber ? parseInt(customerInfo.tableNumber) : null);

      const orderData = {
        customerName: customerInfo.name,
        customerEmail: undefined,
        customerPhone: undefined,
        items: cartItems.map(item => ({
          menuItemId: parseInt(item.id),
          name: item.name,
          quantity: item.quantity,
          price: item.customPrice || item.price,
          notes: item.notes || '',
          customizations: Array.isArray(item.customizations) ? item.customizations : []
        })),
        totalAmount: calculateTotal(),
        paymentMethod: customerInfo.paymentMethod,
        notes: customerInfo.notes,
        tableNumber: tableNumber
      };

      console.log('Sending guest order data:', orderData);

      // Use FormData for file upload
      const formData = new FormData();
      formData.append('orderData', JSON.stringify(orderData));
      
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      const response = await fetch(`${API_URL}/api/guest/checkout`, {
        method: 'POST',
        credentials: 'omit',
        body: formData
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to place order');
      }

      console.log('Guest order placed successfully:', result);
      onOrderPlaced(result.orderId);
      // Navigate with obfuscated id
      const encoded = encodeId(result.orderId);
      navigate(`/guest/order-success/${encoded}`);
      
    } catch (error) {
      console.error('Guest checkout error:', error);
      setError(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="h-5 w-5" />
            Guest Checkout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="name" className="mb-1 block">Name to call *</Label>
              <Input
                id="name"
                type="text"
                value={customerInfo.name}
                onChange={handleNameChange}
                placeholder="Enter the name we'll call for serving"
                required
              />
            </div>

            <div>
              <Label htmlFor="tableNumber" className="mb-1 block">
                Table Number {tableNumber ? '(Detected from QR Code)' : '(Optional)'}
              </Label>
              <Input
                id="tableNumber"
                type="number"
                min="1"
                max="6"
                value={customerInfo.tableNumber}
                onChange={handleTableNumberChange}
                placeholder={tableNumber ? `Table ${tableNumber} detected` : "Enter table number (1-6)"}
                disabled={!!tableNumber}
                className={tableNumber ? "bg-green-50 border-green-300" : ""}
              />
              {tableNumber && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Table {tableNumber} automatically detected from QR code scan
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="paymentMethod" className="mb-1 block">Payment Method</Label>
              <Select value={customerInfo.paymentMethod} onValueChange={handlePaymentChange}>
                <SelectTrigger className="w-full pr-4 [&>svg]:text-black">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="paymaya">PayMaya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Receipt Upload for Digital Payments */}
            {(customerInfo.paymentMethod === 'gcash' || customerInfo.paymentMethod === 'paymaya') && (
              <div>
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
                        onChange={handleFileUpload}
                        className="hidden"
                        id="receipt-upload"
                      />
                      <label
                        htmlFor="receipt-upload"
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeReceipt}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                      {receiptPreview && (
                        <div className="mt-3">
                          <img
                            src={receiptPreview}
                            alt="Receipt preview"
                            className="w-full h-32 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Please upload a clear photo of your {customerInfo.paymentMethod.toUpperCase()} payment receipt for verification.
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="notes" className="mb-1 block">Special Instructions (Optional)</Label>
              <textarea
                id="notes"
                value={customerInfo.notes}
                onChange={handleNotesChange}
                placeholder="Any special instructions for your order"
                className="w-full p-2 border border-gray-300 rounded-md h-20 resize-none"
              />
            </div>
          </div>

          {/* Minimal Guest Inputs removed; captured above */}

          {/* Order Summary */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-2">Order Summary</h3>
            <div className="space-y-2">
              {cartItems.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>₱{((item.customPrice || item.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-2 mt-2">
              <span>Total:</span>
              <span>₱{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGuestCheckout}
              disabled={isProcessing || !customerInfo.name.trim()}
              className="flex-1 bg-[#a87437] hover:bg-[#8f652f]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Place Order
                </>
              )}
            </Button>
          </div>

          {/* Guest Notice */}
          <div className="text-xs text-gray-600 bg-yellow-50 p-3 rounded-md">
            <strong>Guest Order Notice:</strong> As a guest, you won't earn loyalty points or have access to order history. 
            Consider creating an account for a better experience!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}