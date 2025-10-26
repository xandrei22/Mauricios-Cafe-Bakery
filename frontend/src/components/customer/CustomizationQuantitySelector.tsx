import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface CustomizationQuantitySelectorProps {
  label: string;
  unit: string; // e.g., "shot", "pump", "tsp"
  defaultQuantity?: number;
  minQuantity?: number;
  maxQuantity?: number;
  pricePerUnit?: number;
  onChange: (quantity: number) => void;
  selected: boolean;
  onToggle: (selected: boolean) => void;
  styleVariant?: 'amber' | 'rose' | 'emerald' | 'sky' | 'orange' | 'violet' | 'purple';
}

export const CustomizationQuantitySelector: React.FC<CustomizationQuantitySelectorProps> = ({
  label,
  unit,
  defaultQuantity = 1,
  minQuantity = 0,
  maxQuantity = 10, // Reasonable upper limit for UX, not inventory-based
  pricePerUnit = 0,
  onChange,
  selected,
  onToggle = () => {},
  styleVariant = 'amber',
}) => {
  const [quantity, setQuantity] = useState(defaultQuantity);

  const variant = (styleVariant || 'amber');
  const theme = {
    amber: {
      selectedContainer: 'bg-amber-50 border-amber-700',
      checkbox: 'text-amber-600 focus:ring-amber-500',
      priceText: 'text-amber-700',
    },
    rose: {
      selectedContainer: 'bg-rose-50 border-rose-700',
      checkbox: 'text-rose-600 focus:ring-rose-500',
      priceText: 'text-rose-700',
    },
    emerald: {
      selectedContainer: 'bg-emerald-50 border-emerald-700',
      checkbox: 'text-emerald-600 focus:ring-emerald-500',
      priceText: 'text-emerald-700',
    },
    sky: {
      selectedContainer: 'bg-sky-50 border-sky-700',
      checkbox: 'text-sky-600 focus:ring-sky-500',
      priceText: 'text-sky-700',
    },
    orange: {
      selectedContainer: 'bg-orange-50 border-orange-700',
      checkbox: 'text-orange-600 focus:ring-orange-500',
      priceText: 'text-orange-700',
    },
    violet: {
      selectedContainer: 'bg-violet-50 border-violet-700',
      checkbox: 'text-violet-600 focus:ring-violet-500',
      priceText: 'text-violet-700',
    },
    purple: {
      selectedContainer: 'bg-purple-50 border-purple-700',
      checkbox: 'text-purple-600 focus:ring-purple-500',
      priceText: 'text-purple-700',
    },
  }[variant];

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= minQuantity && newQuantity <= maxQuantity) {
      setQuantity(newQuantity);
      onChange(newQuantity);
    }
  };

  const handleToggle = () => {
    const newSelected = !selected;
    try {
      if (typeof onToggle === 'function') {
        onToggle(newSelected);
      }
    } catch (_) {
      // ignore
    }
    if (newSelected) {
      onChange(quantity);
    } else {
      onChange(0);
    }
  };

  const increment = () => {
    handleQuantityChange(quantity + 1);
  };

  const decrement = () => {
    handleQuantityChange(quantity - 1);
  };

  const totalPrice = selected ? quantity * pricePerUnit : 0;

  return (
    <div className={`border-2 rounded-xl p-4 transition-all duration-200 ${
      selected 
        ? `${theme.selectedContainer} shadow-lg border-opacity-100` 
        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="checkbox"
              checked={selected}
              onChange={handleToggle}
              className={`w-5 h-5 ${theme.checkbox} bg-white border-2 rounded-md focus:ring-2 focus:ring-offset-2`}
              aria-label={`Select ${label}`}
            />
            {selected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-sm"></div>
              </div>
            )}
          </div>
          <label className="font-semibold text-gray-800 text-base" title={label || '(Unnamed)'}>
            {label && label.trim().length > 0 ? label : '(Unnamed ingredient)'}
          </label>
        </div>
        {totalPrice > 0 && (
          <div className={`text-sm font-bold px-3 py-1 rounded-lg ${theme.priceText} bg-opacity-20`}>
            +₱{totalPrice.toFixed(2)}
          </div>
        )}
      </div>
      
      {selected && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={decrement}
              disabled={quantity <= minQuantity}
              className="h-9 w-9 p-0 rounded-lg border-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4" />
            </Button>
            
            <div className="min-w-[80px] text-center">
              <div className="text-lg font-bold text-gray-800">
                {quantity}
              </div>
              <div className="text-xs text-gray-500">
                {unit}{quantity !== 1 ? 's' : ''}
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={increment}
              disabled={quantity >= maxQuantity}
              className="h-9 w-9 p-0 rounded-lg border-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {pricePerUnit > 0 && !isNaN(Number(pricePerUnit)) && (
            <div className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
              ₱{Number(pricePerUnit).toFixed(2)} per {unit}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomizationQuantitySelector;
