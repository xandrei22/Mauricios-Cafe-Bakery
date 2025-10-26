import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Plus, Minus, Check, Coffee, Droplets, Sparkles, Snowflake } from 'lucide-react';

interface CustomizationOption {
  id: string;
  label: string;
  unit: string;
  pricePerUnit: number;
  defaultQuantity: number;
  maxQuantity: number;
  category?: string;
  ingredientId?: number;
}

interface LayerBasedCustomizationProps {
  options: CustomizationOption[];
  customizations: {[key: string]: {selected: boolean, quantity: number}};
  onCustomizationChange: (id: string, selected: boolean, quantity: number) => void;
}

const LayerBasedCustomization: React.FC<LayerBasedCustomizationProps> = ({
  options,
  customizations,
  onCustomizationChange
}) => {
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null);

  const getLayerIcon = (category: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('milk')) return <Droplets className="w-5 h-5" />;
    if (cat.includes('sweet') || cat.includes('syrup')) return <Sparkles className="w-5 h-5" />;
    if (cat.includes('ice')) return <Snowflake className="w-5 h-5" />;
    return <Coffee className="w-5 h-5" />;
  };

  const getLayerColor = (category: string) => {
    const cat = category?.toLowerCase() || '';
    if (cat.includes('milk')) return 'bg-blue-100 border-blue-300 text-blue-800';
    if (cat.includes('sweet') || cat.includes('syrup')) return 'bg-pink-100 border-pink-300 text-pink-800';
    if (cat.includes('spice')) return 'bg-orange-100 border-orange-300 text-orange-800';
    if (cat.includes('flavor')) return 'bg-purple-100 border-purple-300 text-purple-800';
    return 'bg-amber-100 border-amber-300 text-amber-800';
  };

  const groupedOptions = options.reduce((acc, option) => {
    const category = option.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(option);
    return acc;
  }, {} as {[key: string]: CustomizationOption[]});

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Build Your Drink Layers</h3>
        <p className="text-sm text-gray-600">Select ingredients to add layers to your drink</p>
      </div>

      {Object.entries(groupedOptions).map(([category, categoryOptions]) => (
        <Card key={category} className="overflow-hidden">
          <CardContent className="p-0">
            {/* Category Header */}
            <div 
              className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                expandedLayer === category ? 'bg-gray-50' : ''
              }`}
              onClick={() => setExpandedLayer(expandedLayer === category ? null : category)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getLayerIcon(category)}
                  <h4 className="font-semibold text-gray-900">{category}</h4>
                  <Badge variant="outline" className="text-xs">
                    {categoryOptions.length} options
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {categoryOptions.some(opt => customizations[opt.id]?.selected) && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    {expandedLayer === category ? '−' : '+'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Layer Options */}
            {expandedLayer === category && (
              <div className="border-t bg-gray-50 p-4 space-y-3">
                {categoryOptions.map((option) => {
                  const isSelected = customizations[option.id]?.selected || false;
                  const quantity = customizations[option.id]?.quantity || 0;
                  
                  return (
                    <div
                      key={option.id}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? `${getLayerColor(option.category || '')} shadow-md` 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => onCustomizationChange(option.id, !isSelected, !isSelected ? option.defaultQuantity : 0)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => onCustomizationChange(option.id, e.target.checked, e.target.checked ? option.defaultQuantity : 0)}
                              className="w-5 h-5 rounded border-2 focus:ring-2 focus:ring-offset-2 cursor-pointer appearance-none border-gray-300 checked:bg-blue-600 checked:border-blue-600"
                              aria-label={`Select ${option.label}`}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-900">{option.label}</h5>
                            {option.pricePerUnit > 0 && (
                              <p className="text-sm text-gray-600">₱{option.pricePerUnit.toFixed(2)} per {option.unit}</p>
                            )}
                          </div>
                        </div>
                        {isSelected && quantity > 0 && (
                          <div className="text-lg font-bold text-gray-800">
                            +₱{(quantity * option.pricePerUnit).toFixed(2)}
                          </div>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      {isSelected && (
                        <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onCustomizationChange(option.id, true, Math.max(0, quantity - 1))}
                              disabled={quantity <= 0}
                              className="h-9 w-9 p-0 rounded-lg border-2"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            
                            <div className="min-w-[80px] text-center">
                              <div className="text-lg font-bold text-gray-800">
                                {quantity}
                              </div>
                              <div className="text-xs text-gray-500">
                                {option.unit}{quantity !== 1 ? 's' : ''}
                              </div>
                            </div>
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onCustomizationChange(option.id, true, Math.min(option.maxQuantity, quantity + 1))}
                              disabled={quantity >= option.maxQuantity}
                              className="h-9 w-9 p-0 rounded-lg border-2"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            Max: {option.maxQuantity}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default LayerBasedCustomization;
