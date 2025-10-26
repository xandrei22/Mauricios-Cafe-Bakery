import React from 'react';
import { Coffee } from 'lucide-react';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  return (
    <footer className={`w-full bg-white py-12 px-4 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Mauricio's Branding */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#a87437] rounded-full flex items-center justify-center">
                <Coffee className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-[#a87437]">Mauricio's</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Where tradition meets taste. Experience the finest coffee and freshly baked pastries in a warm, welcoming atmosphere.
            </p>
            <div className="flex space-x-3">
              <a 
                href="https://www.facebook.com/share/1JzrLtpuwg/?mibextid=wwXIfr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 bg-[#a87437] rounded-full flex items-center justify-center hover:bg-[#8f652f] transition-colors"
              >
                <span className="text-white text-sm font-bold">f</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#a87437]">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="/" className="hover:text-[#a87437] transition-colors">Home</a></li>
              <li><a href="#about" className="hover:text-[#a87437] transition-colors">About</a></li>
              <li><a href="#best-sellers" className="hover:text-[#a87437] transition-colors">Best Sellers</a></li>
              <li><a href="#why-love-us" className="hover:text-[#a87437] transition-colors">Offers</a></li>
              <li><a href="#location" className="hover:text-[#a87437] transition-colors">Location</a></li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#a87437]">Contact</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <span>98 Poblacion west,<br />Alitagtag, Philippines, 4205</span>
              </div>
              <div>
                <span>(0917) 503-9974</span>
              </div>
              <div>
                <span>maurioscb23@gmail.com</span>
              </div>
            </div>
          </div>

          {/* Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#a87437]">Hours</h3>
            <div className="text-sm text-gray-600">
              <div className="bg-white rounded-lg px-4 py-3 text-center">
                <div className="font-semibold text-[#a87437] mb-1">TUESDAY-SUNDAY</div>
                <div className="text-gray-600">3:00 PM - 10:00 PM</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <p className="text-sm text-gray-600">
              © 2025 Mauricio's Cafe & Bakery. All rights reserved.
            </p>
            <div className="flex space-x-4 text-sm text-gray-600">
              <a href="/privacy" className="hover:text-[#a87437] transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-[#a87437] transition-colors">Terms of Service</a>
              <a href="/accessibility" className="hover:text-[#a87437] transition-colors">Accessibility</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
