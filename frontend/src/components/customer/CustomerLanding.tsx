import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { CustomerNavbar } from "../ui/CustomerNavbar";
import { ArrowRight } from "lucide-react";
import MenuModal from "./MenuModal";
import AIChatbot from "./AIChatbot";
import Footer from "../ui/Footer";

export default function CustomerLanding() {
  const [showMenu, setShowMenu] = useState(false);
  const [tableNumber, setTableNumber] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    // Detect table number from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tableFromUrl = urlParams.get('table');
    if (tableFromUrl) {
      setTableNumber(tableFromUrl);
    }
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
      <CustomerNavbar />
      
      {/* Unified AI Chatbot widget - matches logged-in UI; resets on close on landing page */}
      <AIChatbot onClose={() => {}} resetOnClose={true} />
      
      {/* Hero Section - responsive and constrained width */}
      <section className="w-full bg-[#f5f5f5]">
        <div className="mx-auto max-w-[1600px] px-6 sm:px-10 lg:px-12 min-h-screen flex items-center pt-20 md:pt-24 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Text Content */}
        <div className="text-center lg:text-left">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#6B5B5B] mb-4">
            Experience Smarter Service at
          </h2>
          <h1 className="font-extrabold tracking-tight text-[#a87437] mb-8 leading-tight text-[clamp(3rem,8.5vw,6.5rem)]">
            <span className="block">Mauricio's</span>
            <span className="block">Cafe & Bakery</span>
            <span className="block">with CaféIQ</span>
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl text-[#6B5B5B] mb-12 max-w-4xl">
            CaféIQ powers seamless service at Mauricio's Cafe & Bakery. Enjoy faster orders, digital payments, and personalized experiences — all in one smart system.
          </p>
          
          {/* Table detection banner intentionally not displayed on landing */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
            {tableNumber ? (
              <>
                <Button
                  size="lg"
                  className="bg-[#a87437] hover:bg-[#8f652f] text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg flex items-center gap-3"
                  onClick={() => navigate(`/guest/menu?table=${tableNumber}`)}
                >
                  Order Now
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-[#a87437] text-[#a87437] bg-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:bg-[#f6efe7]"
                  onClick={() => setShowMenu(true)}
                >
                  View Menu
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  className="bg-[#a87437] hover:bg-[#8f652f] text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg flex items-center gap-3"
                  onClick={() => navigate('/visit-mauricio')}
                >
                  Order Now
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-[#a87437] text-[#a87437] bg-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:bg-[#f6efe7]"
                  onClick={() => setShowMenu(true)}
                >
                  View Menu
                </Button>
              </>
            )}
          </div>
          
          {/* Secondary action removed: Track Order moved to menu page */}
        </div>
        
        {/* Right Side - Drinks Image */}
        <div className="relative">
          <img 
            src="/images/1stpage_image-removebg-preview.png" 
            alt="Mauricio's Cafe Iced Beverages with Chocolate Splash"
            className="w-full h-auto max-h-[95vh] object-contain ml-auto lg:scale-[1.12]"
          />
        </div>
          </div>
        </div>
      </section>
      
      {/* About Section - Bottom half with brown background and text overlay */}
      <section id="about" className="relative w-full px-6 overflow-hidden min-h-screen py-16 scroll-mt-16">
        {/* Background image */}
        <img
          src="/images/cozy.jpg"
          alt="Mauricio's Cafe and Bakery cozy ambience"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 40%' }}
        />
        {/* Darker warm overlay to improve text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#8a5f2d]/80 via-[#b88347]/65 to-black/20"></div>

        {/* Text block (responsive: left side on large screens, centered on small screens) */}
        <div className="relative z-10 text-center text-white h-full flex flex-col justify-center items-center mx-auto lg:ml-8 lg:mr-auto lg:w-1/2 w-full px-4 lg:px-0 pt-16">
          <h2 className="text-2xl md:text-4xl font-bold mb-8">About Mauricio's Cafe and Bakery</h2>

          <p className="text-2xl md:text-3xl font-semibold mb-6 text-white/95">Hello! Hope all is well with you!</p>

          <div className="text-xl md:text-2xl leading-relaxed space-y-6 w-full">
            <p>
              Mauricio's Cafe and Bakery is a cozy spot where tradition meets taste. Enjoy our hand-crafted
              pastries, specialty coffee, and a welcoming atmosphere perfect for friends, family, or a quiet moment
              alone. Our outdoor seating and rustic charm make every visit memorable.
            </p>
            <p>
              Whether you're here for a quick bite or a relaxing evening, we invite you to experience the warmth
              and flavors that make us a neighborhood favorite.
            </p>
            <p className="font-semibold">So, what are you waiting for? Come and visit us!</p>
            <p className="italic">Tara, kwentuhan tayo?</p>
          </div>
        </div>
      </section>

      {/* Menu Highlights Section - Full Page */}
      <section id="best-sellers" className="min-h-screen bg-[#f5f5f5] flex items-center py-16 px-4 scroll-mt-16">
        <div className="mx-auto max-w-7xl w-full">
          {/* Featured Items Tag */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 bg-[#a87437] text-white px-4 py-2 rounded-full text-sm font-medium">
              <span>✨</span>
              <span>Featured Items</span>
            </div>
          </div>
          
          {/* Main Title */}
          <h2 className="text-5xl md:text-6xl font-bold text-center text-[#2D1810] mb-6">
            Menu Highlights
          </h2>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-center text-black mb-16 max-w-4xl mx-auto">
            Discover our most beloved creations, crafted with passion and served with precision
          </p>
          
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Cappuccino Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="relative">
                <img 
                  src="/images/mc2.jpg" 
                  alt="Cappuccino" 
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-4 right-4">
                  <span className="bg-[#8B4513] text-white px-3 py-1 rounded-full text-sm font-medium">
                    Popular
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-[#2D1810] mb-3">Cappuccino</h3>
                <p className="text-[#6B5B5B] text-lg">
                  Rich espresso with steamed milk and a velvety foam top
                </p>
              </div>
            </div>
            
            {/* Chocolate Croissant Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="relative">
                <img 
                  src="/images/mc3.jpg" 
                  alt="Chocolate Croissant" 
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-4 right-4">
                  <span className="bg-[#8B4513] text-white px-3 py-1 rounded-full text-sm font-medium">
                    Fresh Daily
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-[#2D1810] mb-3">Chocolate Croissant</h3>
                <p className="text-[#6B5B5B] text-lg">
                  Flaky, buttery pastry filled with rich chocolate
                </p>
              </div>
            </div>
            
            {/* Iced Matcha Latte Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="relative">
                <img 
                  src="/images/mc4.jpg" 
                  alt="Iced Matcha Latte" 
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-4 right-4">
                  <span className="bg-[#8B4513] text-white px-3 py-1 rounded-full text-sm font-medium">
                    Signature
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-[#2D1810] mb-3">Iced Matcha Latte</h3>
                <p className="text-[#6B5B5B] text-lg">
                  Refreshing matcha green tea with creamy milk over ice
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Offers Section - Full Page */}
      <section id="why-love-us" className="min-h-screen bg-[#f0d9b8] flex items-center py-16 px-4 scroll-mt-16">
        <div className="mx-auto max-w-7xl w-full">
          {/* Our Promise Tag */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 bg-[#a87437] text-white px-4 py-2 rounded-full text-sm font-medium">
              <span>❤️</span>
              <span>Our Promise</span>
            </div>
          </div>
          
          {/* Main Title */}
          <h2 className="text-5xl md:text-6xl font-bold text-center text-[#2D1810] mb-6">
            Why You'll Love Us
          </h2>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-center text-black mb-16 max-w-4xl mx-auto">
            Every detail is crafted to create an exceptional experience that keeps you coming back
          </p>
          
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Fresh Pastries Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="relative h-64 overflow-hidden">
                <img 
                  src="/images/freshpastries.jpg" 
                  alt="Fresh Pastries" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4">
                  <span className="bg-[#8B4513] text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <span>👨‍🍳</span>
                    <span>Made Fresh Daily</span>
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-[#2D1810] mb-3">Fresh Pastries</h3>
                <p className="text-[#6B5B5B] text-lg">
                  Baked daily with the finest ingredients for that perfect bite every time.
                </p>
              </div>
            </div>
            
            {/* Cozy Ambiance Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="relative h-64 overflow-hidden">
                <img 
                  src="/images/cozy.jpg" 
                  alt="Cozy Ambiance" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4">
                  <span className="bg-[#8B4513] text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <span>👤</span>
                    <span>Perfect Atmosphere</span>
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-[#2D1810] mb-3">Cozy Ambiance</h3>
                <p className="text-[#6B5B5B] text-lg">
                  Relax in our warm, inviting space — perfect for work, study, or catching up with friends.
                </p>
              </div>
            </div>
            
            {/* Coffee Customization Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="relative h-64 overflow-hidden">
                <img 
                  src="/images/customization.jpg" 
                  alt="Coffee Customization" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4">
                  <span className="bg-[#8B4513] text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <span>⭐</span>
                    <span>Your Way, Every Time</span>
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-[#2D1810] mb-3">Coffee Customization</h3>
                <p className="text-[#6B5B5B] text-lg">
                  Personalize your coffee just the way you like it — choose your beans, milk, and flavors for a unique cup every time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Experience Section */}
      <section id="location" className="w-full py-16 px-4 bg-[#8B4513] scroll-mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Ready to Experience<br />
            the Difference?
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who've made Mauricio's their daily coffee destination
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => window.open('https://maps.app.goo.gl/GCFVcV4gxRhg8NSC8', '_blank')}
              className="w-full sm:w-auto bg-white text-[#8B4513] px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2 border-2 border-[#8B4513]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Find Location</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
      
      <MenuModal show={showMenu} onHide={() => setShowMenu(false)} />
    </div>
  );
} 