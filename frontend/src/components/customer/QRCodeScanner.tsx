import React, { useState, useRef } from 'react';
import { X, Camera, AlertCircle, CheckCircle, Upload, Receipt, Download } from 'lucide-react';

interface QRCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (receiptFile: File) => void;
  paymentMethod: 'gcash' | 'paymaya';
  orderId: string;
  amount: number;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  isOpen,
  onClose,
  onSuccess,
  paymentMethod,
  orderId,
  amount
}) => {
  const [step, setStep] = useState<'scan' | 'upload'>('scan');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Static QR code data (in real app, these would be the actual QR codes from the coffee shop)
  const staticQRData = {
    gcash: {
      qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkdDQVNIIFFSIFRPIFBBWTwvdGV4dD48L3N2Zz4=',
      instructions: 'Open GCash app → Scan QR Code → Enter amount → Pay'
    },
    paymaya: {
      qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMwMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlBBWU1BWUEgUVJfVE9fUEFZPC90ZXh0Pjwvc3ZnPg==',
      instructions: 'Open PayMaya app → Scan QR Code → Enter amount → Pay'
    }
  };

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
    }
  };

  const handleUploadReceipt = async () => {
    if (!receiptFile) return;
    
    setIsUploading(true);
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Call the success callback with the receipt file
      onSuccess(receiptFile);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload receipt. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadReceipt = () => {
    // Create a simple receipt for download
    const receiptContent = `
COFFEE SHOP RECEIPT
==================
Order ID: ${orderId}
Payment Method: ${paymentMethod.toUpperCase()}
Amount: ₱${amount.toFixed(2)}
Date: ${new Date().toLocaleString()}

Please keep this receipt as proof of payment.
Thank you for your order!
    `.trim();
    
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${orderId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    console.log('QR Scanner not open');
    return null;
  }

  console.log('QR Scanner rendering for:', paymentMethod, orderId, amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'scan' ? `Pay with ${paymentMethod.toUpperCase()}` : 'Upload Receipt'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close Payment"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Payment Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Order ID: {orderId}</p>
            <p className="text-lg font-bold text-gray-900">₱{amount.toFixed(2)}</p>
            <p className="text-sm text-gray-600">
              {step === 'scan' ? 'Scan the QR code below with your app' : 'Upload your payment receipt'}
            </p>
          </div>
        </div>

        {step === 'scan' ? (
          <>
            {/* Static QR Code Display */}
            <div className="text-center mb-4">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <img 
                  src={staticQRData[paymentMethod].qrCode} 
                  alt={`${paymentMethod.toUpperCase()} QR Code`}
                  className="w-48 h-48 mx-auto"
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Instructions:</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Open your {paymentMethod.toUpperCase()} app</li>
                <li>2. Tap "Scan QR Code" or "Pay QR"</li>
                <li>3. Scan the QR code above</li>
                <li>4. Enter amount: <strong>₱{amount.toFixed(2)}</strong></li>
                <li>5. Complete the payment</li>
                <li>6. Take a screenshot of your payment receipt</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('upload')}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                I've Paid - Upload Receipt
              </button>
              <button
                onClick={handleDownloadReceipt}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                title="Download Receipt Template"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Receipt Upload */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Upload your payment receipt</p>
                <p className="text-sm text-gray-500 mb-4">
                  Take a screenshot of your {paymentMethod.toUpperCase()} payment confirmation
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  aria-label="Upload receipt file"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Choose File
                </button>
                
                {receiptFile && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">File selected: {receiptFile.name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('scan')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Back to QR Code
                </button>
                <button
                  onClick={handleUploadReceipt}
                  disabled={!receiptFile || isUploading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Receipt
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Help Text */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact our staff for assistance with payment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;