import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Minus, Plus, X, Trash2, Upload, FileImage } from 'lucide-react';

export interface CustomerCartItem {
  id: number;
  name: string;
  description?: string;
  base_price: number;
  cartItemId: string;
  quantity: number;
  notes?: string;
  customizations?: Record<string, any> | null;
  customPrice?: number | null;
}

interface Props {
  isOpen: boolean;
  cart: CustomerCartItem[];
  onClose: () => void;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onUpdateNotes: (cartItemId: string, notes: string) => void;
  onRemove: (cartItemId: string) => void;
  onClear: () => void;
  onCheckout: (paymentMethod: string, receiptFile?: File) => void;
  user?: any;
  hasTableAccess?: boolean;
}

export default function CustomerCartModal({
  isOpen,
  cart,
  onClose,
  onUpdateQuantity,
  onUpdateNotes,
  onRemove,
  onClear,
  onCheckout,
  user,
  hasTableAccess = true
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'paymaya'>('cash');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeout'>('dine_in');
  const [tableNumber, setTableNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  // Debug logging
  console.log('Cart Modal Debug:', {
    hasTableAccess,
    tableNumber,
    orderType,
    paymentMethod,
    receiptFile: receiptFile ? receiptFile.name : null,
    isDisabled: orderType === 'dine_in' && (!hasTableAccess || !tableNumber.trim())
  });

  const total = cart.reduce((sum, item) => {
    const price = item.customPrice ?? item.base_price;
    return sum + price * item.quantity;
  }, 0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      
      setReceiptFile(file);
      
      // Create preview
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* BRIGHT RED TESTING BANNER */}
        <div className="bg-red-500 text-white p-2 text-center font-bold">
          TESTING: CustomerCartModal.tsx - Upload Receipt Fix
        </div>
        <div className="flex h-full min-h-[600px]">
          {/* LEFT SIDE - Cart Title */}
          <div className="flex flex-col justify-center items-center bg-gray-50 px-8 py-12 min-w-[280px] border-r">
            <div className="flex flex-col items-center gap-4">
              <svg className="w-12 h-12 text-[#a87437]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
              <div className="text-2xl font-bold text-[#a87437]">Cart</div>
              <div className="text-3xl font-bold text-gray-700">({cart.length})</div>
            </div>
            <button onClick={onClose} className="mt-8 p-3 hover:bg-gray-200 rounded-full" aria-label="Close cart">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* RIGHT SIDE - Cart Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-6 space-y-4 flex-1 overflow-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-500 py-20">
                  <div className="text-9xl mb-8">☕</div>
                  <div className="text-2xl font-medium mb-4 text-gray-700">Cart is empty</div>
                  <div className="text-lg text-gray-500">Add items to get started</div>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartItemId} className="p-4 bg-white rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {item.customPrice && item.customPrice !== item.base_price ? (
                            <>
                              <span className="text-sm text-gray-500 line-through">₱{item.base_price}</span>
                              <span className="text-sm text-blue-600 font-medium">₱{item.customPrice}</span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-600">₱{item.base_price}</span>
                          )}
                          {item.customizations && (
                            <Badge variant="secondary" className="text-xs">Customized</Badge>
                          )}
                        </div>
                        {item.customizations && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                            <div className="font-medium mb-1">Customizations:</div>
                            {Object.entries(item.customizations).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="capitalize">{key}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)} className="h-8 w-8 p-0">
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button size="sm" variant="outline" onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} className="h-8 w-8 p-0">
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onRemove(item.cartItemId)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer - Order Details and Actions */}
            <div className="p-6 border-t bg-gray-50 space-y-4">
              {/* DEBUG INFO */}
              <div className="bg-yellow-200 p-3 rounded-lg border-2 border-yellow-400">
                <div className="text-sm font-bold text-yellow-800">
                  DEBUG: hasTableAccess: {String(hasTableAccess)} | tableNumber: "{tableNumber}" | orderType: {orderType} | isDisabled: {String(orderType === 'dine_in' && (!hasTableAccess || !tableNumber.trim()))}
                </div>
              </div>
              
              {cart.length > 0 && (
                <>
                  {/* Authentication Status */}
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium text-gray-700">
                          {user ? `Logged in as: ${user.name || user.email}` : 'Not logged in'}
                        </span>
                      </div>
                      {!user && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const urlParams = new URLSearchParams(window.location.search);
                            const tableFromUrl = urlParams.get('table');
                            const loginUrl = tableFromUrl ? `/customer-login?table=${tableFromUrl}` : '/customer-login';
                            window.location.href = loginUrl;
                          }}
                          className="text-xs h-7 px-2"
                        >
                          Log In
                        </Button>
                      )}
                    </div>
                    {!user && (
                      <p className="text-xs text-gray-500 mt-1">
                        You need to log in to place an order
                      </p>
                    )}
                    {!hasTableAccess && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ No table access detected. For dine-in orders, please scan the QR code on your table.
                      </p>
                    )}
                  </div>

                  {/* Table Number */}
                  {orderType === 'dine_in' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Table Number</label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="Enter table number (1-20)"
                        className="h-10"
                      />
                    </div>
                  )}

                  {/* Order Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">Order Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['dine_in', 'takeout'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setOrderType(type)}
                          className={`p-3 rounded-lg border-2 transition-all ${orderType === type ? 'border-[#a87437] bg-[#a87437]/10 text-[#a87437]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                        >
                          <div className="text-center">
                            <div className="text-sm font-medium capitalize">{type === 'dine_in' ? 'Dine In' : 'Takeout'}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">Payment Method - TESTING</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['cash','gcash','paymaya'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`p-3 rounded-lg border-2 transition-all ${paymentMethod === m ? 'border-[#a87437] bg-[#a87437]/10 text-[#a87437]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                        >
                          <div className="text-center">
                            <div className="text-sm font-medium capitalize">{m}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Receipt Upload for Digital Payments - ALWAYS VISIBLE FOR TESTING */}
                  <div className="bg-green-500 text-white p-4 border-2 border-green-600 rounded mb-4">
                    <div className="text-lg font-bold mb-2">🚨 UPLOAD RECEIPT SECTION - ALWAYS VISIBLE 🚨</div>
                    <div className="text-sm mb-2">Payment Method: {paymentMethod}</div>
                    <div className="text-sm mb-2">Should Show: {(paymentMethod === 'gcash' || paymentMethod === 'paymaya') ? 'YES' : 'NO'}</div>
                    
                    {(paymentMethod === 'gcash' || paymentMethod === 'paymaya') && (
                      <div className="mt-3 bg-white text-black p-3 rounded">
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
                            Please upload a clear photo of your {paymentMethod.toUpperCase()} payment receipt for verification.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Summary */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-lg mb-3 text-gray-800">Order Summary</h3>
                    <div className="space-y-2 mb-3">
                      {cart.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span>₱{((item.customPrice ?? item.base_price) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span className="text-[#a87437]">₱{total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Order Notes */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Special Instructions (Optional)</label>
                    <Input
                      placeholder="Any special instructions for your order"
                      value={orderNotes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOrderNotes(val);
                        cart.forEach(ci => onUpdateNotes(ci.cartItemId, val));
                      }}
                      className="h-10"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button onClick={onClear} variant="outline" className="flex-1 h-12 border-[#a87437] text-[#a87437] hover:bg-[#a87437]/10">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Cart
                    </Button>
                    <Button 
                      onClick={() => {
                        // Validate table access for dine-in orders
                        if (orderType === 'dine_in' && !hasTableAccess) {
                          alert('Table access is required for dine-in orders. Please scan the QR code on your table to place an order.');
                          return;
                        }
                        
                        // Validate table number for dine-in orders
                        if (orderType === 'dine_in' && !tableNumber.trim()) {
                          alert('Please enter a table number for dine-in orders.');
                          return;
                        }
                        
                        // Validate receipt upload for digital payments
                        if ((paymentMethod === 'gcash' || paymentMethod === 'paymaya') && !receiptFile) {
                          alert('Please upload your payment receipt before placing the order.');
                          return;
                        }
                        
                        onCheckout(paymentMethod, receiptFile);
                      }} 
                      disabled={orderType === 'dine_in' && (!hasTableAccess || !tableNumber.trim())}
                      className={`flex-1 h-12 font-semibold ${
                        orderType === 'dine_in' && (!hasTableAccess || !tableNumber.trim())
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : 'bg-[#a87437] hover:bg-[#8f652f] text-white'
                      }`}
                      title={
                        orderType === 'dine_in' && !hasTableAccess
                          ? 'Table access required - scan QR code on your table'
                          : orderType === 'dine_in' && !tableNumber.trim()
                          ? 'Please enter a table number'
                          : 'Proceed to checkout'
                      }
                    >
                      {orderType === 'dine_in' && !hasTableAccess
                        ? 'Table Access Required'
                        : orderType === 'dine_in' && !tableNumber.trim()
                        ? 'Enter Table Number'
                        : 'Place Order'
                      }
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Minus, Plus, X, Trash2, Upload, FileImage } from 'lucide-react';

export interface CustomerCartItem {
  id: number;
  name: string;
  description?: string;
  base_price: number;
  cartItemId: string;
  quantity: number;
  notes?: string;
  customizations?: Record<string, any> | null;
  customPrice?: number | null;
}

interface Props {
  isOpen: boolean;
  cart: CustomerCartItem[];
  onClose: () => void;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onUpdateNotes: (cartItemId: string, notes: string) => void;
  onRemove: (cartItemId: string) => void;
  onClear: () => void;
  onCheckout: (paymentMethod: string, receiptFile?: File) => void;
  user?: any;
  hasTableAccess?: boolean;
}

export default function CustomerCartModal({
  isOpen,
  cart,
  onClose,
  onUpdateQuantity,
  onUpdateNotes,
  onRemove,
  onClear,
  onCheckout,
  user,
  hasTableAccess = true
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'paymaya'>('cash');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeout'>('dine_in');
  const [tableNumber, setTableNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  // Debug logging
  console.log('Cart Modal Debug:', {
    hasTableAccess,
    tableNumber,
    orderType,
    paymentMethod,
    receiptFile: receiptFile ? receiptFile.name : null,
    isDisabled: orderType === 'dine_in' && (!hasTableAccess || !tableNumber.trim())
  });

  const total = cart.reduce((sum, item) => {
    const price = item.customPrice ?? item.base_price;
    return sum + price * item.quantity;
  }, 0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      
      setReceiptFile(file);
      
      // Create preview
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* BRIGHT RED TESTING BANNER */}
        <div className="bg-red-500 text-white p-2 text-center font-bold">
          TESTING: CustomerCartModal.tsx - Upload Receipt Fix
        </div>
        <div className="flex h-full min-h-[600px]">
          {/* LEFT SIDE - Cart Title */}
          <div className="flex flex-col justify-center items-center bg-gray-50 px-8 py-12 min-w-[280px] border-r">
            <div className="flex flex-col items-center gap-4">
              <svg className="w-12 h-12 text-[#a87437]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
              <div className="text-2xl font-bold text-[#a87437]">Cart</div>
              <div className="text-3xl font-bold text-gray-700">({cart.length})</div>
            </div>
            <button onClick={onClose} className="mt-8 p-3 hover:bg-gray-200 rounded-full" aria-label="Close cart">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* RIGHT SIDE - Cart Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-6 space-y-4 flex-1 overflow-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-500 py-20">
                  <div className="text-9xl mb-8">☕</div>
                  <div className="text-2xl font-medium mb-4 text-gray-700">Cart is empty</div>
                  <div className="text-lg text-gray-500">Add items to get started</div>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartItemId} className="p-4 bg-white rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {item.customPrice && item.customPrice !== item.base_price ? (
                            <>
                              <span className="text-sm text-gray-500 line-through">₱{item.base_price}</span>
                              <span className="text-sm text-blue-600 font-medium">₱{item.customPrice}</span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-600">₱{item.base_price}</span>
                          )}
                          {item.customizations && (
                            <Badge variant="secondary" className="text-xs">Customized</Badge>
                          )}
                        </div>
                        {item.customizations && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                            <div className="font-medium mb-1">Customizations:</div>
                            {Object.entries(item.customizations).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="capitalize">{key}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)} className="h-8 w-8 p-0">
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button size="sm" variant="outline" onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)} className="h-8 w-8 p-0">
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onRemove(item.cartItemId)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer - Order Details and Actions */}
            <div className="p-6 border-t bg-gray-50 space-y-4">
              {/* DEBUG INFO */}
              <div className="bg-yellow-200 p-3 rounded-lg border-2 border-yellow-400">
                <div className="text-sm font-bold text-yellow-800">
                  DEBUG: hasTableAccess: {String(hasTableAccess)} | tableNumber: "{tableNumber}" | orderType: {orderType} | isDisabled: {String(orderType === 'dine_in' && (!hasTableAccess || !tableNumber.trim()))}
                </div>
              </div>
              
              {cart.length > 0 && (
                <>
                  {/* Authentication Status */}
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm font-medium text-gray-700">
                          {user ? `Logged in as: ${user.name || user.email}` : 'Not logged in'}
                        </span>
                      </div>
                      {!user && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const urlParams = new URLSearchParams(window.location.search);
                            const tableFromUrl = urlParams.get('table');
                            const loginUrl = tableFromUrl ? `/customer-login?table=${tableFromUrl}` : '/customer-login';
                            window.location.href = loginUrl;
                          }}
                          className="text-xs h-7 px-2"
                        >
                          Log In
                        </Button>
                      )}
                    </div>
                    {!user && (
                      <p className="text-xs text-gray-500 mt-1">
                        You need to log in to place an order
                      </p>
                    )}
                    {!hasTableAccess && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ No table access detected. For dine-in orders, please scan the QR code on your table.
                      </p>
                    )}
                  </div>

                  {/* Table Number */}
                  {orderType === 'dine_in' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Table Number</label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="Enter table number (1-20)"
                        className="h-10"
                      />
                    </div>
                  )}

                  {/* Order Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">Order Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['dine_in', 'takeout'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setOrderType(type)}
                          className={`p-3 rounded-lg border-2 transition-all ${orderType === type ? 'border-[#a87437] bg-[#a87437]/10 text-[#a87437]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                        >
                          <div className="text-center">
                            <div className="text-sm font-medium capitalize">{type === 'dine_in' ? 'Dine In' : 'Takeout'}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">Payment Method - TESTING</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['cash','gcash','paymaya'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`p-3 rounded-lg border-2 transition-all ${paymentMethod === m ? 'border-[#a87437] bg-[#a87437]/10 text-[#a87437]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                        >
                          <div className="text-center">
                            <div className="text-sm font-medium capitalize">{m}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Receipt Upload for Digital Payments - ALWAYS VISIBLE FOR TESTING */}
                  <div className="bg-green-500 text-white p-4 border-2 border-green-600 rounded mb-4">
                    <div className="text-lg font-bold mb-2">🚨 UPLOAD RECEIPT SECTION - ALWAYS VISIBLE 🚨</div>
                    <div className="text-sm mb-2">Payment Method: {paymentMethod}</div>
                    <div className="text-sm mb-2">Should Show: {(paymentMethod === 'gcash' || paymentMethod === 'paymaya') ? 'YES' : 'NO'}</div>
                    
                    {(paymentMethod === 'gcash' || paymentMethod === 'paymaya') && (
                      <div className="mt-3 bg-white text-black p-3 rounded">
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
                            Please upload a clear photo of your {paymentMethod.toUpperCase()} payment receipt for verification.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Order Summary */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-lg mb-3 text-gray-800">Order Summary</h3>
                    <div className="space-y-2 mb-3">
                      {cart.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span>₱{((item.customPrice ?? item.base_price) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span className="text-[#a87437]">₱{total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Order Notes */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Special Instructions (Optional)</label>
                    <Input
                      placeholder="Any special instructions for your order"
                      value={orderNotes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOrderNotes(val);
                        cart.forEach(ci => onUpdateNotes(ci.cartItemId, val));
                      }}
                      className="h-10"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button onClick={onClear} variant="outline" className="flex-1 h-12 border-[#a87437] text-[#a87437] hover:bg-[#a87437]/10">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear Cart
                    </Button>
                    <Button 
                      onClick={() => {
                        // Validate table access for dine-in orders
                        if (orderType === 'dine_in' && !hasTableAccess) {
                          alert('Table access is required for dine-in orders. Please scan the QR code on your table to place an order.');
                          return;
                        }
                        
                        // Validate table number for dine-in orders
                        if (orderType === 'dine_in' && !tableNumber.trim()) {
                          alert('Please enter a table number for dine-in orders.');
                          return;
                        }
                        
                        // Validate receipt upload for digital payments
                        if ((paymentMethod === 'gcash' || paymentMethod === 'paymaya') && !receiptFile) {
                          alert('Please upload your payment receipt before placing the order.');
                          return;
                        }
                        
                        onCheckout(paymentMethod, receiptFile);
                      }} 
                      disabled={orderType === 'dine_in' && (!hasTableAccess || !tableNumber.trim())}
                      className={`flex-1 h-12 font-semibold ${
                        orderType === 'dine_in' && (!hasTableAccess || !tableNumber.trim())
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : 'bg-[#a87437] hover:bg-[#8f652f] text-white'
                      }`}
                      title={
                        orderType === 'dine_in' && !hasTableAccess
                          ? 'Table access required - scan QR code on your table'
                          : orderType === 'dine_in' && !tableNumber.trim()
                          ? 'Please enter a table number'
                          : 'Proceed to checkout'
                      }
                    >
                      {orderType === 'dine_in' && !hasTableAccess
                        ? 'Table Access Required'
                        : orderType === 'dine_in' && !tableNumber.trim()
                        ? 'Enter Table Number'
                        : 'Place Order'
                      }
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
