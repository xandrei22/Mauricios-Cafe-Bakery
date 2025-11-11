import { Link } from "react-router-dom";
import { Home, Info, Star, MapPin, Heart, User, QrCode } from "lucide-react";
import { useState, useEffect } from "react";
import { getApiUrl } from "../../utils/apiConfig";

interface TableMapping {
  tableNumber: number;
  obfuscatedId: string;
  url: string;
}

export function CustomerNavbar() {
  const [open, setOpen] = useState(false);
  const [qrCodesOpen, setQrCodesOpen] = useState(false);
  const [tableMappings, setTableMappings] = useState<TableMapping[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(true);
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

  // Fetch table mappings on component mount
  useEffect(() => {
    const fetchTableMappings = async () => {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/table/table-mappings`);
        const data = await response.json();
        if (data.success && data.mappings) {
          setTableMappings(data.mappings);
        }
      } catch (error) {
        console.error('Error fetching table mappings:', error);
      } finally {
        setLoadingMappings(false);
      }
    };
    fetchTableMappings();
  }, []);

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

  // Generate QR code URLs using obfuscated table IDs
  const baseUrl = 'https://mauricios-cafe-bakery.shop';
  const generateQRCodeUrl = (url: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };
  const handleCopyLink = (url: string, tableNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => {
      alert(`Link for Table ${tableNumber} copied to clipboard!`);
    }).catch(() => {
      alert(`Failed to copy link. URL: ${url}`);
    });
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
                    {loadingMappings ? (
                      <div className="text-center py-8 text-gray-500">Loading QR codes...</div>
                    ) : tableMappings.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No table mappings available</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                        {tableMappings.map((mapping) => (
                          <a
                            key={mapping.tableNumber}
                            href={mapping.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-[#a87437]/10 hover:border-[#a87437] border-2 border-transparent transition-all cursor-pointer group"
                            onClick={(e) => {
                              // Allow copy button to work without navigating
                              if ((e.target as HTMLElement).closest('.copy-btn')) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <div className="w-full aspect-square mb-2 relative">
                              <img
                                src={generateQRCodeUrl(mapping.url)}
                                alt={`QR Code for Table ${mapping.tableNumber}`}
                                className="w-full h-full object-contain rounded border-2 border-gray-300 group-hover:border-[#a87437] transition-colors"
                              />
                            </div>
                            <div className="w-full text-center">
                              <div className="text-base font-bold text-[#a87437] mb-1">Table {mapping.tableNumber}</div>
                              <button
                                onClick={(e) => handleCopyLink(mapping.url, mapping.tableNumber, e)}
                                className="copy-btn text-xs text-gray-600 hover:text-[#a87437] underline"
                                title="Copy link"
                              >
                                Copy Link
                              </button>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
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
                  {loadingMappings ? (
                    <div className="text-center py-4 text-white/80">Loading QR codes...</div>
                  ) : tableMappings.length === 0 ? (
                    <div className="text-center py-4 text-white/80">No table mappings available</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {tableMappings.map((mapping) => (
                        <a
                          key={mapping.tableNumber}
                          href={mapping.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center p-2 bg-white rounded-lg border-2 border-transparent hover:border-[#a87437] transition-all"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.copy-btn')) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <div className="w-full aspect-square mb-2">
                            <img
                              src={generateQRCodeUrl(mapping.url)}
                              alt={`QR Code for Table ${mapping.tableNumber}`}
                              className="w-full h-full object-contain rounded border border-gray-200"
                            />
                          </div>
                          <div className="w-full text-center">
                            <div className="text-sm font-bold text-[#a87437] mb-1">Table {mapping.tableNumber}</div>
                            <button
                              onClick={(e) => handleCopyLink(mapping.url, mapping.tableNumber, e)}
                              className="copy-btn text-xs text-white/80 hover:text-white underline"
                              title="Copy link"
                            >
                              Copy Link
                            </button>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
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