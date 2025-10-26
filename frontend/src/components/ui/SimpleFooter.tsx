import React from 'react';
import { MapPin, Phone, Mail, Facebook } from 'lucide-react';

interface SimpleFooterProps {
  className?: string;
}

const SimpleFooter: React.FC<SimpleFooterProps> = ({ className = '' }) => {
  return (
    <footer className={`w-full bg-white border-t border-gray-200 py-8 px-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Contact Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Location */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#6B5B5B]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-[#6B5B5B]" />
            </div>
            <div>
              <p className="text-sm text-[#6B5B5B]/80">
                98 Poblacion west,<br />
                Alitagtag, Philippines, 4205
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#6B5B5B]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-[#6B5B5B]" />
            </div>
            <div>
              <p className="text-sm text-[#6B5B5B]/80">
                0917 503 9974
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#6B5B5B]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-[#6B5B5B]" />
            </div>
            <div>
              <p className="text-sm text-[#6B5B5B]/80 break-all">
                maurioscb23@gmail.com
              </p>
            </div>
          </div>

          {/* Facebook */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#6B5B5B]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Facebook className="w-4 h-4 text-[#6B5B5B]" />
            </div>
            <div>
              <p className="text-sm text-[#6B5B5B]/80">
                @mauricios
              </p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-center text-sm text-[#6B5B5B]/70">
            © {new Date().getFullYear()} Mauricio's Cafe and Bakery. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default SimpleFooter;















