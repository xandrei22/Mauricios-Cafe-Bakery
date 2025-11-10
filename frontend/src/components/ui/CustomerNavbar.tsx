import { Link } from "react-router-dom";
import { Home, Info, Star, MapPin, Heart, User, QrCode } from "lucide-react";
import { useState, useEffect } from "react";

export function CustomerNavbar() {
  const [open, setOpen] = useState(false);
  const [qrCodesOpen, setQrCodesOpen] = useState(false);
  // Capture table param if present so Login/Signup links preserve it
  const tableParam = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('table');
    } catch {
      return null;
    }
  })();

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close QR codes dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (qrCodesOpen && !target.closest('.qr-codes-dropdown')) {
        setQrCodesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [qrCodesOpen]);

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "#about", label: "About", icon: Info },
    { href: "#best-sellers", label: "Best Sellers", icon: Star },
    { href: "#why-love-us", label: "Offers", icon: Heart },
    { href: "#location", label: "Location", icon: MapPin },
  ];

  // Generate QR code URLs for tables 1-6
  const baseUrl = 'https://mauricios-cafe-bakery.shop';
  const tables = [1, 2, 3, 4, 5, 6];
  const generateQRCodeUrl = (tableNumber: number) => {
    const url = `${baseUrl}?table=${tableNumber}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-[#a87437] backdrop-blur border-b shadow-[0_8px_30px_rgba(0,0,0,0.15)] z-50">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-12">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 flex items-center justify-center p-1 border border-white/80 flex-shrink-0">
              <img 
                src="/images/mau-removebg-preview.png" 
                alt="Mauricio's Cafe and Bakery Logo" 
                className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
              />
            </div>
            <span className="text-lg sm:text-xl lg:text-2xl xl:text-3xl tracking-tight text-white font-bold truncate">Mauricio's Cafe and Bakery</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3 ml-4 xl:ml-8">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                className="flex items-center gap-1 xl:gap-2 py-2 px-3 rounded-lg text-white/80 hover:text-white hover:bg-[#f6efe7]/20 hover:shadow-md hover:scale-105 transition-all duration-200"
              >
                <Icon className="h-4 w-4 xl:h-5 xl:w-5" />
                <span className="text-sm xl:text-base">{label}</span>
              </a>
            ))}
            <div className="flex items-center gap-2 xl:gap-3 ml-4 xl:ml-6">
              {/* QR Codes Dropdown */}
              <div className="relative qr-codes-dropdown">
                <button
                  onClick={() => setQrCodesOpen(!qrCodesOpen)}
                  className="inline-flex items-center gap-1 px-3 xl:px-4 py-1.5 text-white bg-white/20 border border-white/30 text-xs xl:text-sm font-semibold rounded-full hover:bg-white/30 hover:shadow-lg hover:scale-105 transition-all duration-200"
                  aria-label="QR Codes"
                >
                  <QrCode className="h-3 w-3 xl:h-4 xl:w-4" />
                  <span className="hidden sm:inline">QR Codes</span>
                </button>
                {qrCodesOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 qr-codes-dropdown">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-[#a87437]">Table QR Codes (Testing)</h3>
                      <button
                        onClick={() => setQrCodesOpen(false)}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Close"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                      {tables.map((tableNum) => (
                        <div key={tableNum} className="flex flex-col items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <img
                            src={generateQRCodeUrl(tableNum)}
                            alt={`QR Code for Table ${tableNum}`}
                            className="w-full h-auto rounded border border-gray-200"
                          />
                          <span className="text-xs font-medium text-gray-700 mt-1">Table {tableNum}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Scan to access menu for specific table
                    </p>
                  </div>
                )}
              </div>
              <Link to={`/customer-login${tableParam ? `?table=${encodeURIComponent(tableParam)}` : ''}`} className="inline-flex items-center gap-1 px-3 xl:px-4 py-1.5 text-[#a87437] bg-white text-xs xl:text-sm font-semibold rounded-full hover:bg-[#f6efe7] hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-[0_8px_16px_rgba(0,0,0,0.12)]">
                <User className="h-3 w-3 xl:h-4 xl:w-4" />
                Login
              </Link>
              <Link to={`/customer-signup${tableParam ? `?table=${encodeURIComponent(tableParam)}` : ''}`} className="px-3 xl:px-4 py-1.5 bg-transparent text-white border border-white text-xs xl:text-sm font-semibold rounded-full hover:bg-[#f6efe7]/20 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-[0_8px_16px_rgba(0,0,0,0.08)]">Signup</Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-md text-white hover:bg-white/20 shrink-0"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <span className="sr-only">Open menu</span>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={open ? "M6 18L18 6M6 6l12 12" : "M3.5 6.75h17M3.5 12h17M3.5 17.25h17"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="lg:hidden fixed top-16 left-0 right-0 bg-[#a87437] border-b shadow-xl z-50">
          <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-12 py-2 divide-y divide-white/20">
            {navLinks.map(({ href, label }) => (
              <a
                key={label}
                href={href}
                className="block px-1 py-3 min-h-[44px] text-lg text-white hover:text-white/80 flex items-center"
              >
                {label}
              </a>
            ))}
            {/* Mobile QR Codes Section */}
            <div className="py-3 border-t border-white/20">
              <button
                onClick={() => setQrCodesOpen(!qrCodesOpen)}
                className="w-full flex items-center justify-between px-1 py-3 min-h-[44px] text-lg text-white hover:text-white/80"
              >
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  <span>QR Codes (Testing)</span>
                </div>
                <svg className={`h-5 w-5 transition-transform ${qrCodesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {qrCodesOpen && (
                <div className="px-1 py-3 bg-white/10 rounded-lg mt-2">
                  <div className="grid grid-cols-2 gap-2">
                      {tables.map((tableNum) => (
                      <div key={tableNum} className="flex flex-col items-center p-2 bg-white rounded-lg">
                        <img
                          src={generateQRCodeUrl(tableNum)}
                          alt={`QR Code for Table ${tableNum}`}
                          className="w-full h-auto rounded border border-gray-200"
                        />
                        <span className="text-xs font-medium text-[#a87437] mt-1">Table {tableNum}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-white/80 mt-2 text-center">
                    Scan to access menu for specific table
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 my-4">
              <Link to={`/customer-login${tableParam ? `?table=${encodeURIComponent(tableParam)}` : ''}`} className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-full text-[#a87437] bg-white text-base hover:bg-gray-100 shadow-[0_8px_16px_rgba(0,0,0,0.12)] w-full">
                <User className="h-4 w-4" />
                Login
              </Link>
              <Link to={`/customer-signup${tableParam ? `?table=${encodeURIComponent(tableParam)}` : ''}`} className="inline-flex items-center justify-center px-4 py-3 min-h-[44px] rounded-full bg-transparent text-white border border-white text-base font-semibold hover:bg-white/10 shadow-[0_8px_16px_rgba(0,0,0,0.08)] w-full">Signup</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}