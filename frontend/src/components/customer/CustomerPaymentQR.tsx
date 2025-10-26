import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload } from 'lucide-react';

interface Props {
  orderId: string;
  onScanned: (payload: { reference: string; amount?: number }) => void;
}

// Lightweight camera scanner using native getUserMedia and a hidden canvas
// Does not install drivers; uses browser APIs only
const CustomerPaymentQR: React.FC<Props> = ({ orderId, onScanned }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    return () => {
      // Cleanly stop camera on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        streamRef.current = stream;
        setIsActive(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Unable to access camera');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  };

  // Placeholder scanner: let the user capture a frame and paste reference manually
  // For production, integrate a decoder like jsQR or @zxing/library
  const handleMockScan = () => {
    const reference = prompt('Enter payment reference (mock scan)') || '';
    if (reference) onScanned({ reference });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-[#f5f5f5] p-4">
        <div className="rounded-xl overflow-hidden bg-black/60 aspect-video relative">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          {!isActive && (
            <div className="absolute inset-0 grid place-items-center">
              <button onClick={startCamera} className="bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Camera className="w-5 h-5" /> Start Scanner
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          {isActive && (
            <button onClick={handleMockScan} className="bg-amber-600 text-white px-4 py-2 rounded-lg">Scan</button>
          )}
          {isActive && (
            <button onClick={stopCamera} className="bg-gray-200 px-4 py-2 rounded-lg">Stop</button>
          )}
          {!isActive && (
            <button onClick={startCamera} className="bg-amber-600 text-white px-4 py-2 rounded-lg">Enable Camera</button>
          )}
        </div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </div>

      <div className="rounded-xl bg-[#f5f5f5] p-4">
        <label htmlFor="receipt-upload" className="block text-sm mb-1">Upload Receipt (optional for GCash/PayMaya)</label>
        <input
          id="receipt-upload"
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.append('receipt', file);
            const res = await fetch(`/api/receipts/${orderId}/receipts`, { method: 'POST', body: form });
            const data = await res.json();
            if (!data.success) alert('Upload failed');
          }}
          className="block w-full"
        />
      </div>
    </div>
  );
};

export default CustomerPaymentQR; 