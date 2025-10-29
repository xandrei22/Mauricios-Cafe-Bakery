import { Link } from "react-router-dom";
import { Home, Info, Star, MapPin, Heart, User } from "lucide-react";
import { useState, useEffect } from "react";

export function CustomerNavbar() {
  const [open, setOpen] = useState(false);
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
            <a href="/" className="flex items-center gap-1 xl:gap-2 py-2 px-3 rounded-lg text-white/80 hover:text-white hover:bg-[#f6efe7]/20 hover:shadow-md hover:scale-105 transition-all duration-200">
              <Home className="h-4 w-4 xl:h-5 xl:w-5" />
              <span className="text-sm xl:text-base">Home</span>
            </a>
            <a href="#about" className="flex items-center gap-1 xl:gap-2 py-2 px-3 rounded-lg text-white/80 hover:text-white hover:bg-[#f6efe7]/20 hover:shadow-md hover:scale-105 transition-all duration-200">
              <Info className="h-4 w-4 xl:h-5 xl:w-5" />
              <span className="text-sm xl:text-base">About</span>
            </a>
            <a href="#best-sellers" className="flex items-center gap-1 xl:gap-2 py-2 px-3 rounded-lg text-white/80 hover:text-white hover:bg-[#f6efe7]/20 hover:shadow-md hover:scale-105 transition-all duration-200">
              <Star className="h-4 w-4 xl:h-5 xl:w-5" />
              <span className="text-sm xl:text-base">Best Sellers</span>
            </a>
            <a href="#why-love-us" className="flex items-center gap-1 xl:gap-2 py-2 px-3 rounded-lg text-white/80 hover:text-white hover:bg-[#f6efe7]/20 hover:shadow-md hover:scale-105 transition-all duration-200">
              <Heart className="h-4 w-4 xl:h-5 xl:w-5" />
              <span className="text-sm xl:text-base">Offers</span>
            </a>
            <a href="#location" className="flex items-center gap-1 xl:gap-2 py-2 px-3 rounded-lg text-white/80 hover:text-white hover:bg-[#f6efe7]/20 hover:shadow-md hover:scale-105 transition-all duration-200">
              <MapPin className="h-4 w-4 xl:h-5 xl:w-5" />
              <span className="text-sm xl:text-base">Location</span>
            </a>
            <div className="flex items-center gap-2 xl:gap-3 ml-4 xl:ml-6">
              <Link to={`/customer-login${tableParam ? `?table=${encodeURIComponent(tableParam)}` : ''}`} className="inline-flex items-center gap-1 px-3 xl:px-4 py-1.5 text-[#a87437] bg-white text-xs xl:text-sm font-semibold rounded-full hover:bg-[#f6efe7] hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-[0_8px_16px_rgba(0,0,0,0.12)]">
                <User className="h-3 w-3 xl:h-4 xl:w-4" />
                Login
              </Link>
              <Link to={`/customer-signup${tableParam ? `?table=${encodeURIComponent(tableParam)}` : ''}`} className="px-3 xl:px-4 py-1.5 bg-transparent text-white border border-white text-xs xl:text-sm font-semibold rounded-full hover:bg-[#f6efe7]/20 hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-[0_8px_16px_rgba(0,0,0,0.08)]">Signup</Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-white hover:bg-white/20 shrink-0"
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
            <a href="/" className="block px-1 py-3 text-lg text-white hover:text-white/80">Home</a>
            <a href="#about" className="block px-1 py-3 text-lg text-white hover:text-white/80">About</a>
            <a href="#best-sellers" className="block px-1 py-3 text-lg text-white hover:text-white/80">Best Sellers</a>
            <a href="#why-love-us" className="block px-1 py-3 text-lg text-white hover:text-white/80">Offers</a>
            <a href="#location" className="block px-1 py-3 text-lg text-white hover:text-white/80">Location</a>
            <div className="flex flex-col gap-3 my-4">
              <Link to={`/customer-login${tableParam ? `?table=${encodeURIComponent(tableParam)}` : ''}`} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-[#a87437] bg-white text-base hover:bg-gray-100 shadow-[0_8px_16px_rgba(0,0,0,0.12)] w-full">
                <User className="h-4 w-4" />
                Login
              </Link>
              <Link to={`/customer-signup${tableParam ? `?table=${encodeURIComponent(tableParam)}` : ''}`} className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-transparent text-white border border-white text-base font-semibold hover:bg-white/10 shadow-[0_8px_16px_rgba(0,0,0,0.08)] w-full">Signup</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}