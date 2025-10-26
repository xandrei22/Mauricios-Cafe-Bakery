import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { CustomerNavbar } from '../ui/CustomerNavbar';
import { MapPin, Clock, Phone, Utensils, ShoppingBag, Coffee, Star, QrCode, Tablet, CheckCircle, User, LogIn } from 'lucide-react';

const VisitMauricio: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'guest' | 'registered'>('guest');

  return (
    <div className="min-h-screen bg-white">
      <CustomerNavbar />

      <div className="max-w-7xl mx-auto px-4 py-12 pt-24">
        {/* Main Title */}
          <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-black mb-4">
            Visit Mauricio Coffee Shop
            </h1>
          <p className="text-xl text-gray-600">
            Experience the perfect blend of tradition and innovation in every cup
            </p>
          </div>

        {/* Content Sections */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Location & Hours */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-[#a87437] text-white px-6 py-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Location & Hours</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-[#a87437] mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">Address</h3>
                  <p className="text-gray-600">98 Poblacion west, Alitagtag, Philippines, 4205</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-[#a87437] mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">Operating Hours</h3>
                  <p className="text-gray-600">Tuesday - Sunday: 3:00 PM - 10:00 PM</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-[#a87437] mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">Contact</h3>
                  <p className="text-gray-600">(0917) 503-9974</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dining Options */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-[#a87437] text-white px-6 py-4 flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Dining Options</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Utensils className="h-5 w-5 text-[#a87437] mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">Dine-In Experience</h3>
                  <p className="text-gray-600">Enjoy your coffee in our cozy, comfortable seating area with free WiFi and a relaxing atmosphere.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShoppingBag className="h-5 w-5 text-[#a87437] mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-800">Takeout Service</h3>
                  <p className="text-gray-600">Quick and convenient takeout service. Perfect for busy mornings or on-the-go coffee lovers.</p>
                </div>
              </div>
                </div>
              </div>
            </div>

        {/* Customization Options */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-12">
          <div className="bg-[#a87437] text-white px-6 py-4 flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Customization Options</h2>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#a87437]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coffee className="h-8 w-8 text-[#a87437]" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Drink Customization</h3>
                <p className="text-gray-600 text-sm">Customize your coffee with different milk types, syrups, and brewing methods.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#a87437]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Utensils className="h-8 w-8 text-[#a87437]" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Food Pairings</h3>
                <p className="text-gray-600 text-sm">Choose from our selection of pastries, sandwiches, and snacks to complement your drink.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#a87437]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-[#a87437]" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Special Requests</h3>
                <p className="text-gray-600 text-sm">Add special instructions for temperature, sweetness, or any dietary preferences.</p>
              </div>
            </div>
            </div>
          </div>

        {/* How to Order */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-[#a87437] text-white px-6 py-4 flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            <h2 className="text-xl font-semibold">How to Order</h2>
          </div>
          <div className="p-6">
            {/* Customer Type Tabs */}
            <div className="flex mb-6">
              <button 
                onClick={() => setActiveTab('guest')}
                className={`px-6 py-3 font-semibold rounded-l-lg transition-colors ${
                  activeTab === 'guest' 
                    ? 'bg-[#a87437] text-white' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                Guest Customer
              </button>
              <button 
                onClick={() => setActiveTab('registered')}
                className={`px-6 py-3 font-semibold rounded-r-lg transition-colors ${
                  activeTab === 'registered' 
                    ? 'bg-[#a87437] text-white' 
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                Registered Customer
              </button>
            </div>

            {/* Conditional Content Based on Active Tab */}
            {activeTab === 'guest' && (
              <>
                {/* Guest Ordering Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600">👤</span>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-800">Guest Ordering</h3>
                  </div>
                  <p className="text-blue-700">Order as a guest without creating an account. You can still enjoy all our services!</p>
                </div>

                {/* 4-Step Process */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#a87437] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                      1
                    </div>
                    <div className="w-12 h-12 bg-[#a87437]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <QrCode className="h-6 w-6 text-[#a87437]" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Scan QR Code</h3>
                    <p className="text-gray-600 text-sm">Use your smartphone camera to scan the QR code on your table or at the counter.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#a87437] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                      2
                    </div>
                    <div className="w-12 h-12 bg-[#a87437]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Tablet className="h-6 w-6 text-[#a87437]" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Browse Menu</h3>
                    <p className="text-gray-600 text-sm">Explore our digital menu with detailed descriptions, prices, and customization options.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#a87437] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                      3
                    </div>
                    <div className="w-12 h-12 bg-[#a87437]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ShoppingBag className="h-6 w-6 text-[#a87437]" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Add to Cart</h3>
                    <p className="text-gray-600 text-sm">Select your items, customize them to your preference, and add them to your cart.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#a87437] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                      4
                    </div>
                    <div className="w-12 h-12 bg-[#a87437]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-6 w-6 text-[#a87437]" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Checkout</h3>
                    <p className="text-gray-600 text-sm">Enter your contact details, choose payment method, and submit. We'll prepare your order!</p>
                  </div>
                </div>

                {/* Guest Benefits */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-3">Guest Benefits:</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      <span>No account required - order immediately</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      <span>Full access to menu and customization</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      <span>Order tracking with order number</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-600 mt-1">•</span>
                      <span>Can create account later to save preferences</span>
                    </li>
                  </ul>
                </div>
              </>
            )}

            {activeTab === 'registered' && (
              <>
                {/* Registered Customer Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-800">Registered Customer Ordering</h3>
                  </div>
                  <p className="text-green-700">Enjoy enhanced features with your account including order history, loyalty points, and saved preferences!</p>
                </div>

                {/* 5-Step Process for Registered Customers */}
                <div className="grid md:grid-cols-5 gap-4 mb-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#a87437] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                      1
                    </div>
                    <div className="w-12 h-12 bg-[#a87437]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <QrCode className="h-6 w-6 text-[#a87437]" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Scan QR Code</h3>
                    <p className="text-gray-600 text-sm">Use your smartphone camera to scan the QR code on your table or at the counter.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#a87437] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                      2
                    </div>
                    <div className="w-12 h-12 bg-[#a87437]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <LogIn className="h-6 w-6 text-[#a87437]" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Sign In</h3>
                    <p className="text-gray-600 text-sm">Log in to your account to access personalized menu and features.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#a87437] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                      3
                    </div>
                    <div className="w-12 h-12 bg-[#a87437]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Tablet className="h-6 w-6 text-[#a87437]" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Browse Menu</h3>
                    <p className="text-gray-600 text-sm">Explore personalized recommendations, reorder favorites, and customize your items.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#a87437] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                      4
                    </div>
                    <div className="w-12 h-12 bg-[#a87437]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ShoppingBag className="h-6 w-6 text-[#a87437]" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Quick Order</h3>
                    <p className="text-gray-600 text-sm">Reorder favorites, use saved preferences, and earn loyalty points with each purchase.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[#a87437] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                      5
                    </div>
                    <div className="w-12 h-12 bg-[#a87437]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-6 w-6 text-[#a87437]" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Easy Checkout</h3>
                    <p className="text-gray-600 text-sm">Checkout with saved payment methods and receive order updates via email/SMS.</p>
                  </div>
                </div>

                {/* Account Benefits */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-green-800 mb-3">Account Benefits:</h3>
                  <ul className="space-y-2 text-sm text-green-800">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>Earn loyalty points with every purchase</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>Save favorite orders and preferences</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>Order history and easy reordering</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>Exclusive offers and promotions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>Order tracking and notifications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>Event booking and special requests</span>
                    </li>
                  </ul>
                </div>

                {/* Sign In Button */}
                <div className="text-center">
                  <Button 
                    onClick={() => navigate('/customer-login')}
                    className="bg-[#a87437] hover:bg-[#8f652f] text-white px-8 py-3 text-lg font-semibold rounded-lg shadow-lg flex items-center gap-2 mx-auto"
                  >
                    <LogIn className="h-5 w-5" />
                    Sign In to Your Account
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitMauricio;