import React, { useState } from 'react';
import QRCodeScanner from './QRCodeScanner';

const QRTestPage: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);

  const handleQRSuccess = (receiptFile: File) => {
    console.log('Receipt uploaded:', receiptFile);
    alert(`Receipt uploaded: ${receiptFile.name}`);
    setShowScanner(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">QR Scanner Test</h1>
        
        <div className="space-y-4">
          <button
            onClick={() => setShowScanner(true)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Test GCash QR Scanner
          </button>
          
          <button
            onClick={() => setShowScanner(true)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Test PayMaya QR Scanner
          </button>
        </div>

        {showScanner && (
          <QRCodeScanner
            isOpen={showScanner}
            onClose={() => setShowScanner(false)}
            onSuccess={handleQRSuccess}
            paymentMethod="gcash"
            orderId="TEST-ORDER-123"
            amount={100.00}
          />
        )}
      </div>
    </div>
  );
};

export default QRTestPage;






