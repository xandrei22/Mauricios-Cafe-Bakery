import React, { useState } from 'react';
import QRCodeScanner from './QRCodeScanner';

const QRTestButton: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);

  const handleQRSuccess = (receiptFile: File) => {
    console.log('Receipt uploaded:', receiptFile);
    alert(`Receipt uploaded: ${receiptFile.name}`);
    setShowScanner(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowScanner(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg"
      >
        Test QR Scanner
      </button>

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
  );
};

export default QRTestButton;






