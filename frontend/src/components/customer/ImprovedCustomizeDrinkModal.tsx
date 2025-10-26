import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { SugarSlider } from './SugarSlider';
import LayeredCupVisualization from './LayeredCupVisualization';
import CustomizationQuantitySelector from './CustomizationQuantitySelector';

interface CustomizationOption {
  id: string;
  label: string;
  unit: string;
  pricePerUnit: number;
  defaultQuantity: number;
  maxQuantity: number;
  category?: string;
}

interface ImprovedCustomizeDrinkModalProps {
  item: any;
  onClose: () => void;
  onAdd: (customizedItem: any) => void;
}

const ImprovedCustomizeDrinkModal: React.FC<ImprovedCustomizeDrinkModalProps> = ({ 
  item, 
  onClose, 
  onAdd 
}) => {
  const [size, setSize] = useState('Regular');
  const [temperature, setTemperature] = useState('Hot');
  const [milk, setMilk] = useState('');
  const [sweetener, setSweetener] = useState('');
  const [sugarLevel, setSugarLevel] = useState(100);
  const [instructions, setInstructions] = useState('');
  
  // Customization quantities state
  const [customizations, setCustomizations] = useState<{[key: string]: {selected: boolean, quantity: number}}>({});

  const sizePrices = { Regular: 0, Large: 30 }; // Updated pricing
  const basePrice = item.price;

  // API base
  const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

  // Dynamic options sourced from inventory
  const [milkOptions, setMilkOptions] = useState<string[]>([]);
  const [sweetenerOptions, setSweetenerOptions] = useState<string[]>([]);
  const [customizationOptions, setCustomizationOptions] = useState<CustomizationOption[]>([]);

  // Helper to slugify ids from names
  const toId = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  useEffect(() => {
    const loadIngredients = async () => {
      try {
        // Prefer menu route that already filters availability if present; fallback to inventory
        const res = await fetch(`${API_URL}/api/inventory`);
        const data = await res.json();
        const ingredients = data?.ingredients || [];

        // Only include items that are available and in stock
        const inStock = ingredients.filter((i: any) => i?.is_available && Number(i?.actual_quantity) > 0);

        const milks = inStock
          .filter((i: any) => (i.category || '').toLowerCase() === 'milk' && (!!i.visible_in_customization))
          .map((i: any) => i.name);
        const sweets = inStock
          .filter((i: any) => (i.category || '').toLowerCase() === 'sweetener' && (!!i.visible_in_customization))
          .map((i: any) => i.name);

        setMilkOptions([...milks, 'No Milk']);
        setSweetenerOptions([...sweets, 'No Sweetener']);

        // Initialize defaults if empty state
        if (!milk && milks.length > 0) setMilk(milks[0]);
        if (!sweetener && sweets.length > 0) setSweetener(sweets[0]);

        const options: CustomizationOption[] = [];

        // Extra espresso shot if inventory has an espresso-related item
        const espressoItem = inStock.find((i: any) => (i.category || '').toLowerCase() === 'coffee' && /espresso/i.test(i.name) && (!!i.visible_in_customization));
        if (espressoItem) {
          options.push({
            id: 'extra_shot',
            label: 'Extra Espresso Shot',
            unit: 'shot',
            pricePerUnit: 35,
            defaultQuantity: 1,
            maxQuantity: 4,
            category: 'coffee'
          });
        }

        // Syrups
        inStock
          .filter((i: any) => (i.category || '').toLowerCase() === 'syrup' && (!!i.visible_in_customization))
          .forEach((i: any) => {
            options.push({
              id: `${toId(i.name)}_syrup`,
              label: i.name,
              unit: 'pump',
              pricePerUnit: 20,
              defaultQuantity: 1,
              maxQuantity: 5,
              category: 'syrup'
            });
          });

        // Toppings
        inStock
          .filter((i: any) => ['topping', 'spice'].includes((i.category || '').toLowerCase()) && (!!i.visible_in_customization))
          .forEach((i: any) => {
            options.push({
              id: toId(i.name),
              label: i.name,
              unit: 'serving',
              pricePerUnit: /cream/i.test(i.name) ? 25 : 10,
              defaultQuantity: 1,
              maxQuantity: /cream/i.test(i.name) ? 3 : 3,
              category: 'topping'
            });
          });

        setCustomizationOptions(options);
      } catch (e) {
        console.error('Failed to load inventory for customization', e);
        // If API fails, show nothing; user requirement: only show saved inputs
        setMilkOptions(['No Milk']);
        setSweetenerOptions(['No Sweetener']);
        setCustomizationOptions([]);
      }
    };
    loadIngredients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate total price
  const calculateTotalPrice = () => {
    let total = basePrice + (sizePrices[size as keyof typeof sizePrices] || 0);
    
    // Add customization costs
    Object.entries(customizations).forEach(([id, config]) => {
      if (config.selected) {
        const option = customizationOptions.find(opt => opt.id === id);
        if (option) {
          total += option.pricePerUnit * config.quantity;
        }
      }
    });
    
    return total;
  };

  const handleCustomizationChange = (id: string, selected: boolean, quantity: number) => {
    setCustomizations(prev => ({
      ...prev,
      [id]: { selected, quantity }
    }));
  };

  const handleAdd = () => {
    // Prepare customization data for backend
    const selectedCustomizations: {[key: string]: any} = {};
    
    Object.entries(customizations).forEach(([id, config]) => {
      if (config.selected && config.quantity > 0) {
        const option = customizationOptions.find(opt => opt.id === id);
        if (option) {
          selectedCustomizations[id] = {
            label: option.label,
            unit: option.unit,
            quantity: config.quantity,
            pricePerUnit: option.pricePerUnit,
            totalPrice: option.pricePerUnit * config.quantity
          };
        }
      }
    });

    const customizedItem = {
      ...item,
      size,
      temperature,
      milk,
      sweetener,
      sugarLevel: sweetener === 'Sugar' ? sugarLevel : null,
      customizations: selectedCustomizations,
      instructions,
      custom: true,
      price: calculateTotalPrice(),
    };

    onAdd(customizedItem);
    onClose();
  };

  // Get base drink type for visualization
  const getBaseType = () => {
    const name = item.name.toLowerCase();
    if (name.includes('espresso') || name.includes('latte') || name.includes('mocha') || name.includes('macchiato')) {
      return 'espresso';
    } else if (name.includes('americano')) {
      return 'americano';
    } else if (name.includes('matcha')) {
      return 'matcha';
    } else if (name.includes('iced coffee')) {
      return 'brewed coffee';
    } else {
      return 'brewed coffee';
    }
  };

  // Get syrup type from customizations
  const getSyrupType = () => {
    const selected = Object.entries(customizations).find(([id, cfg]) => cfg?.selected && id.endsWith('_syrup'));
    if (selected) {
      return selected[0].replace('_syrup', '');
    }
    return 'none';
  };

  // Get toppings from customizations
  const getToppings = () => {
    const selectedToppings: string[] = [];
    customizationOptions.forEach((opt) => {
      if ((opt.category === 'topping' || opt.category === 'spice') && customizations[opt.id]?.selected) {
        selectedToppings.push(opt.label.toLowerCase());
      }
    });
    return selectedToppings;
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">Customize {item.name}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
            title="Close customization"
            aria-label="Close customization"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Customization Options */}
          <div className="space-y-6">
            {/* Size Selection */}
            <div>
              <div className="font-bold mb-3 text-black">Size</div>
              <div className="flex gap-3">
                {Object.keys(sizePrices).map(s => (
                  <button
                    key={s}
                    className={`border px-6 py-3 rounded-xl font-medium text-base transition-all duration-150 ${
                      size === s 
                        ? 'bg-amber-50 border-amber-700 text-amber-800 shadow' 
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                    onClick={() => setSize(s)}
                  >
                    {s}
                    {s === 'Regular' && <span className="text-xs ml-1 block">Standard</span>}
                    {s === 'Large' && <span className="text-xs ml-1 block">+₱{sizePrices[s]}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Temperature Selection */}
            <div>
              <div className="font-bold mb-3 text-black">Temperature</div>
              <div className="flex gap-3">
                {['Hot', 'Iced'].map(t => (
                  <button
                    key={t}
                    className={`border px-6 py-3 rounded-xl font-medium text-base transition-all duration-150 ${
                      temperature === t 
                        ? 'bg-amber-50 border-amber-700 text-amber-800 shadow' 
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                    onClick={() => setTemperature(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Milk Selection */}
            <div>
              <div className="font-bold mb-3 text-black">Milk Type</div>
              <div className="grid grid-cols-2 gap-2">
                {milkOptions.map(m => (
                  <button
                    key={m}
                    className={`border px-3 py-2 rounded-xl font-medium text-sm transition-all duration-150 ${
                      milk === m 
                        ? 'bg-amber-50 border-amber-700 text-amber-800 shadow' 
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                    onClick={() => setMilk(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Sweetener Selection */}
            <div>
              <div className="font-bold mb-3 text-black">Sweetener</div>
              <div className="grid grid-cols-2 gap-2">
                {sweetenerOptions.map(s => (
                  <button
                    key={s}
                    className={`border px-3 py-2 rounded-xl font-medium text-sm transition-all duration-150 ${
                      sweetener === s 
                        ? 'bg-amber-50 border-amber-700 text-amber-800 shadow' 
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                    onClick={() => setSweetener(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Sugar Level Slider */}
            {sweetener.toLowerCase() === 'sugar' && (
              <div>
                <div className="font-bold mb-3 text-black">Sugar Level</div>
                <SugarSlider value={sugarLevel} onChange={setSugarLevel} />
              </div>
            )}

            {/* Customization Options with Quantities */}
            <div>
              <div className="font-bold mb-3 text-black">
                Add-ons & Extras
                <span className="text-sm font-normal text-gray-500 ml-2">Choose your quantities</span>
              </div>
              <div className="space-y-3">
                {customizationOptions.map(option => (
                  <CustomizationQuantitySelector
                    key={option.id}
                    label={option.label}
                    unit={option.unit}
                    defaultQuantity={option.defaultQuantity}
                    maxQuantity={option.maxQuantity}
                    pricePerUnit={option.pricePerUnit}
                    styleVariant={
                      option.category?.toLowerCase().includes('milk') ? 'sky' :
                      option.category?.toLowerCase().includes('sweet') ? 'rose' :
                      option.category?.toLowerCase().includes('spice') ? 'orange' :
                      option.category?.toLowerCase().includes('flavor') ? 'violet' :
                      'amber'
                    }
                    selected={customizations[option.id]?.selected || false}
                    onToggle={(selected) => handleCustomizationChange(
                      option.id, 
                      selected, 
                      selected ? option.defaultQuantity : 0
                    )}
                    onChange={(quantity) => handleCustomizationChange(
                      option.id, 
                      quantity > 0, 
                      quantity
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Special Instructions */}
            <div>
              <div className="font-bold mb-3 text-black">Special Instructions</div>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Any special requests or modifications..."
                className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>

          {/* Right Column - Visualization and Summary */}
          <div className="space-y-6">
            {/* Drink Visualization */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-bold mb-4 text-center">Your Drink</h3>
              <LayeredCupVisualization
                customizations={{
                  base: getBaseType(),
                  milk: milk,
                  syrup: getSyrupType(),
                  toppings: getToppings(),
                  ice: temperature === 'Iced',
                  size: size === 'Large' ? 'large' : 'medium',
                  sugarLevel: 0
                }}
                className="w-full h-64"
              />
            </div>

            {/* Price Summary */}
            <div className="bg-amber-50 rounded-xl p-6">
              <h3 className="font-bold mb-4">Order Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{item.name} ({size})</span>
                  <span>₱{(basePrice + (sizePrices[size as keyof typeof sizePrices] || 0)).toFixed(2)}</span>
                </div>
                
                {Object.entries(customizations).map(([id, config]) => {
                  if (!config.selected) return null;
                  const option = customizationOptions.find(opt => opt.id === id);
                  if (!option) return null;
                  
                  return (
                    <div key={id} className="flex justify-between text-sm">
                      <span>{option.label} ({config.quantity} {option.unit}{config.quantity !== 1 ? 's' : ''})</span>
                      <span>₱{(option.pricePerUnit * config.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
                
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>₱{calculateTotalPrice().toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAdd}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-150"
            >
              Add to Cart - ₱{calculateTotalPrice().toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedCustomizeDrinkModal;
