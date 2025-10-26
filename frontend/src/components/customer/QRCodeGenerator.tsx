import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CustomerNavbar } from '../ui/CustomerNavbar';
import { generateTableUrl } from '../../utils/urlGenerator';

const QRCodeGenerator: React.FC = () => {
  const navigate = useNavigate();

  const generateQRCode = (tableNumber: number) => {
    const url = generateTableUrl(tableNumber.toString());
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  const handleQRCodeClick = (tableNumber: number) => {
    const url = generateTableUrl(tableNumber.toString());
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNavbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold text-[#6B5B5B]">Table QR Codes</h1>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center gap-2 text-blue-800 mb-2">
            <QrCode className="h-5 w-5" />
            <span className="font-semibold">QR Code Instructions</span>
          </div>
          <p className="text-blue-700 text-sm">
            Each QR code below links directly to the guest menu for that specific table. 
            Customers can scan the QR code with their phone camera to start ordering immediately.
          </p>
        </div>

        {/* QR Codes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }, (_, i) => i + 1).map(tableNumber => (
            <Card key={tableNumber} className="text-center">
              <CardHeader>
                <CardTitle className="text-xl">Table {tableNumber}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <img
                    src={generateQRCode(tableNumber)}
                    alt={`QR Code for Table ${tableNumber}`}
                    className="border-2 border-gray-200 rounded-lg"
                    onError={(e) => {
                      console.error('Failed to load QR code for table', tableNumber);
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Scan to order for Table {tableNumber}
                </p>
                <Button
                  onClick={() => handleQRCodeClick(tableNumber)}
                  className="w-full bg-[#a87437] hover:bg-[#8f652f] text-white"
                >
                  Test Table {tableNumber} Link
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">For Staff Use</h3>
          <p className="text-yellow-700 text-sm">
            Print these QR codes and place them on each table. Customers can scan them to start ordering immediately.
            The QR codes automatically detect the table number and pre-fill it in the order form.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
