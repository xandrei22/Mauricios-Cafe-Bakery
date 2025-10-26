import React from 'react';
import Swal from 'sweetalert2';
import OptimizedImage from './ui/OptimizedImage';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Coffee } from 'lucide-react';

interface MenuItemProps {
  item: {
    id: number;
    name: string;
    description: string;
    price: number;
    image_url?: string;
    category?: string;
    is_available?: boolean;
    allow_customization?: boolean;
  };
  onAddToCart: (item: any) => void;
  hasTableAccess?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, onAddToCart, hasTableAccess = true }) => {
  const handleAddToCart = () => {
    onAddToCart(item);
    
    // Show sweet alert
    Swal.fire({
      position: 'top-end',
      icon: 'success',
      title: 'Added to Cart!',
      text: `${item.name} has been added to your cart`,
      showConfirmButton: false,
      timer: 1500,
      toast: true
    });
  };

  const isAvailable = item.is_available !== false; // Default to true if not specified

  return (
    <Card className="bg-white border shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Image - Smaller container */}
          <div className="h-32 w-24 flex-shrink-0 flex items-center justify-center overflow-hidden p-2">
            {item.image_url && item.image_url !== '' && item.image_url !== 'null' && item.image_url !== 'undefined' ? (
              <OptimizedImage
                src={(() => {
                  const path = (item.image_url || '').trim();
                  if (!path) return '';
                  if (/^https?:\/\//i.test(path)) return path;
                  const withSlash = path.startsWith('/') ? path : `/${path}`;
                  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                  return withSlash;
                })()}
                alt={item.name}
                className="w-full h-full object-contain"
                lazy={true}
                sizes="128px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-2 bg-white rounded-full flex items-center justify-center shadow-sm border-2 border-gray-200">
                    <span className="text-gray-500 text-lg">🍽️</span>
                  </div>
                  <p className="text-xs text-gray-500">No Image</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold text-[#3f3532] mb-1 line-clamp-2">
              {item.name}
            </h3>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
              {item.description}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3">
              {item.category && (
                <Badge variant="outline" className="text-sm">
                  {item.category}
                </Badge>
              )}
              <span className="text-base sm:text-lg font-semibold text-amber-700">
                ₱{Number(item.price || item.base_price || 0).toFixed(2)}
              </span>
              <Badge 
                variant={isAvailable ? "default" : "secondary"}
                className={`text-sm ${
                  isAvailable 
                    ? "bg-green-100 text-green-800 border-green-200" 
                    : "bg-gray-100 text-gray-600 border-gray-200"
                }`}
              >
                {isAvailable ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {item.allow_customization && (
              <Button
                onClick={() => onAddToCart({ ...item, customization: true })}
                disabled={!hasTableAccess || !isAvailable}
                size="sm"
                variant="outline"
                className="text-xs whitespace-nowrap"
                title={!hasTableAccess ? 'Table access required to customize items' : !isAvailable ? 'Item unavailable' : 'Customize this item'}
              >
                Customize
              </Button>
            )}
            <Button
              onClick={handleAddToCart}
              disabled={!hasTableAccess || !isAvailable}
              size="sm"
              className="bg-[#a87437] hover:bg-[#8f652f] text-white text-xs whitespace-nowrap"
              title={!hasTableAccess ? 'Table access required to add items to cart' : !isAvailable ? 'Item unavailable' : 'Add to cart'}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItem;