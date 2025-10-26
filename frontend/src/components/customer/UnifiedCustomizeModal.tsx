import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Coffee, Star, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import LayeredCupVisualization from './LayeredCupVisualization';
import LayerBasedCustomization from './LayerBasedCustomization';

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

interface AISuggestion {
  name: string;
  description: string;
  price: string;
  dietaryNotes: string;
  isPopular?: boolean;
}

interface AICombination {
  name: string;
  customizations: string[];
  description: string;
  totalPrice: string;
  rating?: number;
}

// MenuItem interface removed (unused)

interface UnifiedCustomizeModalProps {
  item: any;
  onClose: () => void;
  onAdd: (customizedItem: any) => void;
}

const UnifiedCustomizeModal: React.FC<UnifiedCustomizeModalProps> = ({ 
  item, 
  onClose, 
  onAdd 
}) => {
  // Basic customization states
  const [size, setSize] = useState('Regular');
  const [temperature, setTemperature] = useState('Hot');
  const [milk, setMilk] = useState('');
  const [sweetener, setSweetener] = useState('');
  const [sugarLevel, setSugarLevel] = useState(100);
  const [instructions, setInstructions] = useState('');
  
  // Customization quantities state
  const [customizations, setCustomizations] = useState<{[key: string]: {selected: boolean, quantity: number}}>({});
  
  // AI suggestions state
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiCombinations, setAiCombinations] = useState<AICombination[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const sizePrices = { Regular: 0, Large: 30 };
  const basePrice = parseFloat(item.base_price || item.price || 0) || 0;
  
  // Debug logging for item object
  console.log('UnifiedCustomizeModal item object:', item);
  console.log('Base price resolved to:', basePrice);
  console.log('Raw base_price:', item.base_price, 'Raw price:', item.price);

  // API base - use relative path since Vite proxy handles the backend
  const API_BASE = '';

  // Dynamic options sourced from inventory
  const [milkOptions, setMilkOptions] = useState<string[]>([]);
  const [sweetenerOptions, setSweetenerOptions] = useState<string[]>([]);
  const [customizationOptions, setCustomizationOptions] = useState<CustomizationOption[]>([]);

  // Helper to slugify ids from names
  const toId = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  // Calculate dynamic sugar level based on actual ingredients
  const calculateSugarLevel = () => {
    let totalSugarLevel = 0;
    let ingredientCount = 0;

    // Check main sweetener selection
    if (sweetener && sweetener !== 'No Sweetener') {
      // Different sweeteners have different base sugar levels
      const sweetenerLevels: { [key: string]: number } = {
        'Sugar': 100,
        'Honey': 80,
        'Stevia': 20,
        'Agave': 70,
        'Maple Syrup': 75,
        'Brown Sugar': 90,
        'Coconut Sugar': 85,
        'Monk Fruit': 15,
        'Erythritol': 10,
        'Xylitol': 25
      };
      totalSugarLevel += sweetenerLevels[sweetener] || 50;
      ingredientCount++;
    }

    // Check customization ingredients for sweeteners
    Object.entries(customizations).forEach(([id, config]) => {
      if (config.selected && config.quantity > 0) {
        const option = customizationOptions.find(opt => opt.id === id);
        if (option) {
          const label = option.label.toLowerCase();
          if (label.includes('syrup') || label.includes('sweetener') || label.includes('sugar') || 
              label.includes('honey') || label.includes('stevia') || label.includes('agave')) {
            // Sweetener ingredients contribute to sugar level
            const sweetnessMultiplier = config.quantity;
            const baseSweetness = 30; // Base sweetness per unit
            totalSugarLevel += baseSweetness * sweetnessMultiplier;
            ingredientCount++;
          }
        }
      }
    });

    // If no sweeteners, return 0
    if (ingredientCount === 0) return 0;

    // Average the sugar level and cap at 100
    return Math.min(100, Math.round(totalSugarLevel / ingredientCount));
  };

  // Calculate current sugar level
  const currentSugarLevel = calculateSugarLevel();

  // Update sugar level when ingredients change (but allow manual override)
  useEffect(() => {
    // Only auto-update if no manual adjustment has been made recently
    if (currentSugarLevel > 0) {
      setSugarLevel(currentSugarLevel);
    }
  }, [sweetener, customizations]);

  // Fetch available ingredients from inventory
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        // Use only the global ingredients endpoint
        const response = await fetch(`${API_BASE}/api/menu/ingredients`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Ingredients API response:', data);
          
          if (data.success && data.ingredients) {
            const ingredients = data.ingredients;
            console.log('Raw ingredients from API:', ingredients);
            
            // Categorize ingredients - be more flexible with filtering
            const milkTypes = ingredients
              .filter((ing: any) => 
                (ing.category && ing.category.toLowerCase().includes('milk')) || 
                ing.name.toLowerCase().includes('milk') ||
                ing.name.toLowerCase().includes('cream')
              )
              .map((ing: any) => ing.name || ing.ingredient_name || ing.display_name || 'Milk');
            
            const sweeteners = ingredients
              .filter((ing: any) => 
                (ing.category && ing.category.toLowerCase().includes('sweetener')) || 
                ing.name.toLowerCase().includes('sugar') || 
                ing.name.toLowerCase().includes('syrup') ||
                ing.name.toLowerCase().includes('honey')
              )
              .map((ing: any) => ing.name || ing.ingredient_name || ing.display_name || 'Sweetener');
            
            const customizations = ingredients
              .filter((ing: any) => 
                (ing.category && ['topping', 'add-on', 'extra', 'spice', 'flavor', 'milk', 'sweetener'].includes(ing.category.toLowerCase())) ||
                ing.name.toLowerCase().includes('shot') ||
                ing.name.toLowerCase().includes('whipped') ||
                ing.name.toLowerCase().includes('cinnamon') ||
                ing.name.toLowerCase().includes('syrup')
              )
              .map((ing: any, idx: number) => {
                const rawLabel = ing.name || '';
                const label = (typeof rawLabel === 'string' && rawLabel.trim().length > 0)
                  ? rawLabel.trim()
                  : `Add-on ${idx + 1}`;
                const unit = ing.actual_unit || 'serving';
                const price = (typeof ing.extra_price_per_unit === 'number' && !isNaN(ing.extra_price_per_unit))
                  ? Number(ing.extra_price_per_unit)
                  : (Number(ing.price_per_unit) || Number(ing.cost_per_actual_unit) || 0);
                
                console.log(`Processing ingredient: ${label}, price: ${price}, type: ${typeof price}`);
                
                return {
                  id: toId(label),
                  label: label,
                  unit: unit,
                  pricePerUnit: price,
                  defaultQuantity: 1,
                  maxQuantity: 5,
                  category: ing.category || 'Extra',
                  ingredientId: ing.id
                };
              });
            
            console.log('Processed milk types:', milkTypes);
            console.log('Processed sweeteners:', sweeteners);
            console.log('Processed customizations:', customizations);
            
            if (Array.isArray(ingredients) && ingredients.length > 0 && customizations.length > 0) {
              setMilkOptions(['No Milk', ...milkTypes]);
              setSweetenerOptions(['No Sweetener', ...sweeteners]);
              setCustomizationOptions(customizations);
            } else {
              // Fallback: fetch item-specific allowed ingredients
              await fetchItemAllowedIngredients();
            }
          } else {
            // Fallback: fetch item-specific allowed ingredients
            await fetchItemAllowedIngredients();
          }
        } else {
          // Fallback: fetch item-specific allowed ingredients
          await fetchItemAllowedIngredients();
        }
      } catch (error) {
        console.error('Error fetching ingredients:', error);
        // Fallback: fetch item-specific allowed ingredients
        await fetchItemAllowedIngredients();
      }
    };

    const setFallbackOptions = () => {
      setMilkOptions(['No Milk']);
      setSweetenerOptions(['No Sweetener']);
      setCustomizationOptions([]);
    };

    const fetchItemAllowedIngredients = async () => {
      try {
        if (!item?.id) return setFallbackOptions();
        const res = await fetch(`${API_BASE}/api/menu/items/${item.id}/ingredients`, { credentials: 'include' });
        if (!res.ok) return setFallbackOptions();
        const data = await res.json();
        if (!data?.success || !Array.isArray(data.ingredients)) return setFallbackOptions();

        const ingredients: any[] = data.ingredients as any[];
        const milkTypes = ingredients
          .filter((ing: any) => ((ing.category || '').toLowerCase().includes('milk')) || (ing.name || '').toLowerCase().includes('milk') || (ing.name || '').toLowerCase().includes('cream'))
          .map((ing: any) => ing.name || ing.ingredient_name || 'Milk');

        const sweeteners = ingredients
          .filter((ing: any) => ((ing.category || '').toLowerCase().includes('sweetener')) || (ing.name || '').toLowerCase().includes('sugar') || (ing.name || '').toLowerCase().includes('syrup') || (ing.name || '').toLowerCase().includes('honey'))
          .map((ing: any) => ing.name || ing.ingredient_name || 'Sweetener');

        const customizations = ingredients.map((ing: any, idx: number) => {
          const rawLabel = ing.name || ing.ingredient_name || '';
          const label = (typeof rawLabel === 'string' && rawLabel.trim().length > 0) ? rawLabel.trim() : `Add-on ${idx + 1}`;
          const unit = ing.actual_unit || ing.display_unit || 'serving';
          const price = (typeof ing.extra_price_per_unit === 'number' && !isNaN(ing.extra_price_per_unit))
            ? Number(ing.extra_price_per_unit)
            : (Number(ing.price_per_unit) || Number(ing.cost_per_actual_unit) || 0);
          return {
            id: toId(label),
            label,
            unit,
            pricePerUnit: price,
            defaultQuantity: 1,
            maxQuantity: 5,
            category: ing.category || 'Extra',
            ingredientId: ing.id || ing.ingredient_id
          } as CustomizationOption;
        });

        setMilkOptions(['No Milk', ...milkTypes]);
        setSweetenerOptions(['No Sweetener', ...sweeteners]);
        setCustomizationOptions(customizations);
      } catch (e) {
        console.error('Error fetching item-allowed ingredients:', e);
        setFallbackOptions();
      }
    };

    fetchIngredients();
    // Pre-fetch AI suggestions when modal opens
    fetchAISuggestions();
  }, [API_BASE]);


  // Fetch AI suggestions
  const fetchAISuggestions = async () => {
    setLoadingAI(true);
    try {
      const requestBody = {
        drinkName: item.name,
        drinkCategory: item.category,
        currentIngredients: getCurrentIngredients(),
        preferences: {
          temperature: temperature,
          milkPreference: milk,
          sweetnessLevel: sugarLevel
        }
      };
      
      const response = await fetch(`${API_BASE}/api/ai-chat/ingredient-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAiSuggestions(data.recommendations || []);
          setAiCombinations(data.combinations || []);
        }
      } else {
        console.error('AI API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      // Generate fallback suggestions based on ACTUALLY available ingredients
      const availableIngredients = customizationOptions.map(opt => opt.label);
      
      // Only suggest ingredients that are actually available
      const fallbackSuggestions = [];
      const fallbackCombinations = [];
      
      if (availableIngredients.some(ing => ing.toLowerCase().includes('almond'))) {
        fallbackSuggestions.push({
          name: 'Almond Milk Boost',
          description: 'Creamy dairy-free alternative with subtle nutty flavor',
          price: '+₱15',
          dietaryNotes: 'Vegan, dairy-free, lower in calories',
          isPopular: true
        });
      }
      
      if (availableIngredients.some(ing => ing.toLowerCase().includes('honey'))) {
        fallbackSuggestions.push({
          name: 'Honey Sweetener',
          description: 'Natural sweetener with antibacterial properties',
          price: '+₱10',
          dietaryNotes: 'Contains antioxidants and trace minerals',
          isPopular: true
        });
      }
      
      if (availableIngredients.some(ing => ing.toLowerCase().includes('cinnamon'))) {
        fallbackSuggestions.push({
          name: 'Cinnamon Spice',
          description: 'Warm spice that enhances flavor and aroma',
          price: '+₱8',
          dietaryNotes: 'Antioxidant-rich, helps regulate blood sugar',
          isPopular: false
        });
      }
      
      if (availableIngredients.some(ing => ing.toLowerCase().includes('vanilla'))) {
        fallbackSuggestions.push({
          name: 'Vanilla Delight',
          description: 'Classic flavoring that enhances coffee naturally',
          price: '+₱12',
          dietaryNotes: 'Natural vanilla extract with antioxidant properties',
          isPopular: true
        });
      }
      
      // Create combinations only from available ingredients
      const availableForCombos = availableIngredients.filter(ing => 
        ing.toLowerCase().includes('almond') || 
        ing.toLowerCase().includes('honey') || 
        ing.toLowerCase().includes('cinnamon') || 
        ing.toLowerCase().includes('vanilla')
      );
      
      if (availableForCombos.length >= 2) {
        fallbackCombinations.push({
          name: 'Healthy Combo',
          customizations: availableForCombos.slice(0, 2),
          description: 'A nutritious combination of available ingredients',
          totalPrice: '+₱20',
          rating: 4.7
        });
      }
      
      setAiSuggestions(fallbackSuggestions);
      setAiCombinations(fallbackCombinations);
    } finally {
      setLoadingAI(false);
    }
  };

  const getCurrentIngredients = () => {
    const ingredients = [];
    if (milk && milk !== 'No Milk') ingredients.push(milk);
    if (sweetener && sweetener !== 'No Sweetener') ingredients.push(sweetener);
    return ingredients;
  };

  const calculateTotalPrice = () => {
    let total = basePrice + (sizePrices[size as keyof typeof sizePrices] || 0);
    
    // Debug logging
    console.log('Price calculation:', {
      basePrice,
      size,
      sizePrice: sizePrices[size as keyof typeof sizePrices],
      total
    });
    
    // Add customization costs
    Object.entries(customizations).forEach(([id, config]) => {
      if (config.selected && config.quantity > 0) {
        const option = customizationOptions.find(opt => opt.id === id);
        if (option) {
          const addonCost = option.pricePerUnit * config.quantity;
          total += addonCost;
          console.log(`Adding ${option.label}: ${option.pricePerUnit} x ${config.quantity} = ${addonCost}`);
        }
      }
    });
    
    console.log('Final total:', total);
    return total;
  };

  const handleAdd = () => {
    const extras = Object.entries(customizations)
      .filter(([_, config]) => config.selected && config.quantity > 0)
      .map(([id, config]) => {
        const option = customizationOptions.find(opt => opt.id === id);
        return {
          ingredientId: option?.ingredientId,
          amount: config.quantity,
          unit: option?.unit,
          name: option?.label || id
        };
      });

    const customizedItem = {
      id: item.id,
      name: item.name,
      price: calculateTotalPrice(),
      customizations: {
        size,
        temperature,
        milk,
        sweetener,
        sugarLevel,
        instructions,
        addOns: extras.map(e => ({ id: toId(e.name || ''), quantity: e.amount, name: e.name })),
        // Extras array used by backend deduction (base + extra)
        extras
      },
      instructions: instructions || 'Customized drink'
    };

    onAdd(customizedItem);
    onClose();
  };

  // Try to resolve which options a suggestion refers to based on label keywords
  const resolveSuggestionTargets = (suggestion: AISuggestion) => {
    const tokens = `${suggestion.name} ${suggestion.description}`.toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean);
    const matchedOptionIds: string[] = [];

    customizationOptions.forEach((opt) => {
      const label = (opt.label || '').toLowerCase();
      if (label && tokens.some((t) => label.includes(t))) {
        matchedOptionIds.push(opt.id);
      }
    });

    // Also try milk/sweetener mapping by keyword
    let matchedMilk: string | undefined;
    if (milkOptions && milkOptions.length > 0) {
      const foundMilk = milkOptions.find((m) => tokens.some((t) => m.toLowerCase().includes(t)));
      if (foundMilk && foundMilk !== 'No Milk') matchedMilk = foundMilk;
    }

    let matchedSweetener: string | undefined;
    if (sweetenerOptions && sweetenerOptions.length > 0) {
      const foundSweet = sweetenerOptions.find((s) => tokens.some((t) => s.toLowerCase().includes(t)));
      if (foundSweet && foundSweet !== 'No Sweetener') matchedSweetener = foundSweet;
    }

    return { matchedOptionIds, matchedMilk, matchedSweetener };
  };

  const applyAISuggestion = (suggestion: AISuggestion) => {
    const { matchedOptionIds, matchedMilk, matchedSweetener } = resolveSuggestionTargets(suggestion);

    if (matchedMilk) setMilk(matchedMilk);
    if (matchedSweetener) setSweetener(matchedSweetener);

    if (matchedOptionIds.length > 0) {
      setCustomizations((prev) => {
        const next = { ...prev } as { [key: string]: { selected: boolean; quantity: number } };
        matchedOptionIds.forEach((id) => {
          const defaultQty = customizationOptions.find((o) => o.id === id)?.defaultQuantity || 1;
          next[id] = { selected: true, quantity: Math.max(defaultQty, 1) };
        });
        return next;
      });
    }

    setShowAISuggestions(false);
  };

  const applyAICombination = (combination: AICombination) => {
    const newCustomizations = { ...customizations } as { [key: string]: { selected: boolean; quantity: number } };
    combination.customizations.forEach((customization) => {
      const option = customizationOptions.find((opt) => (opt.label || '').toLowerCase() === customization.toLowerCase());
      if (option) {
        const defaultQty = option.defaultQuantity || 1;
        newCustomizations[option.id] = { selected: true, quantity: Math.max(defaultQty, 1) };
      }
    });
    setCustomizations(newCustomizations);
    setShowAISuggestions(false);
  };

  // Filter AI outputs based on available ingredients (customizationOptions)
  const availableLabelSet = useMemo(() => new Set(customizationOptions.map((o) => (o.label || '').toLowerCase())), [customizationOptions]);

  const filteredAISuggestions = useMemo(() => {
    // Keep only suggestions that can map to at least one available option or milk/sweetener
    return aiSuggestions.filter((sugg) => {
      const { matchedOptionIds, matchedMilk, matchedSweetener } = resolveSuggestionTargets(sugg);
      return matchedOptionIds.length > 0 || Boolean(matchedMilk) || Boolean(matchedSweetener);
    });
  }, [aiSuggestions, customizationOptions, milkOptions, sweetenerOptions]);

  const filteredAICombinations = useMemo(() => {
    // Prune each combo to only available ingredients; keep combos that still have at least 1 item
    return aiCombinations
      .map((combo) => {
        const kept = (combo.customizations || []).filter((c) => availableLabelSet.has((c || '').toLowerCase()));
        return { ...combo, customizations: kept } as AICombination;
      })
      .filter((combo) => Array.isArray(combo.customizations) && combo.customizations.length > 0);
  }, [aiCombinations, availableLabelSet]);

  // If AI returns nothing usable, synthesize simple local suggestions from available options
  const localFallbackSuggestions = useMemo(() => {
    if (filteredAISuggestions.length > 0 || filteredAICombinations.length > 0) return { suggs: [], combos: [] };
    if (customizationOptions.length === 0) return { suggs: [], combos: [] };

    const labels = customizationOptions.map((o) => o.label || '').filter(Boolean);
    const pick = (kw: string) => labels.find((l) => l.toLowerCase().includes(kw));

    const suggs: AISuggestion[] = [];
    const almond = pick('almond');
    if (almond) suggs.push({ name: `${almond}`, description: `Add ${almond} for a smooth twist`, price: '+₱' + (customizationOptions.find(o=>o.label===almond)?.pricePerUnit ?? 0), dietaryNotes: 'Based on available stock' });
    const honey = pick('honey');
    if (honey) suggs.push({ name: `${honey}`, description: `Natural sweetness from ${honey}`, price: '+₱' + (customizationOptions.find(o=>o.label===honey)?.pricePerUnit ?? 0), dietaryNotes: 'Based on available stock' });
    const cinnamon = pick('cinnamon');
    if (cinnamon) suggs.push({ name: `${cinnamon}`, description: `Warm spice from ${cinnamon}`, price: '+₱' + (customizationOptions.find(o=>o.label===cinnamon)?.pricePerUnit ?? 0), dietaryNotes: 'Based on available stock' });

    const combos: AICombination[] = [];
    if (almond && honey) combos.push({ name: 'Nutty Honey', customizations: [almond, honey], description: 'Balanced and creamy', totalPrice: '+₱' + ((customizationOptions.find(o=>o.label===almond)?.pricePerUnit ?? 0) + (customizationOptions.find(o=>o.label===honey)?.pricePerUnit ?? 0)), rating: 4.6 });

    return { suggs, combos };
  }, [filteredAISuggestions, filteredAICombinations, customizationOptions]);

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coffee className="w-6 h-6 text-orange-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-800">Customize {item.name}</h2>
                <p className="text-sm text-gray-600">Make it your perfect drink</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Customization Options */}
            <div className="space-y-6">
              {/* Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Size</label>
                <div className="flex gap-2">
                  {Object.entries(sizePrices).map(([sizeOption, price]) => (
                    <button
                      key={sizeOption}
                      onClick={() => setSize(sizeOption)}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        size === sizeOption
                          ? 'bg-[#a87437] text-white border-[#a87437]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#a87437]/50'
                      }`}
                    >
                      {sizeOption}
                      {price > 0 && <span className="text-xs ml-1">+₱{price}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Temperature</label>
                <div className="flex gap-2">
                  {['Hot', 'Iced'].map((temp) => (
                    <button
                      key={temp}
                      onClick={() => setTemperature(temp)}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        temperature === temp
                          ? 'bg-[#a87437] text-white border-[#a87437]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#a87437]/50'
                      }`}
                    >
                      {temp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Milk Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Milk Type</label>
                <select
                  value={milk}
                  onChange={(e) => setMilk(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]"
                  title="Select milk type"
                  aria-label="Milk type selection"
                >
                  {milkOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sweetener */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Sweetener</label>
                <select
                  value={sweetener}
                  onChange={(e) => setSweetener(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437]"
                  title="Select sweetener"
                  aria-label="Sweetener selection"
                >
                  {sweetenerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sugar Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sugar Level: {sugarLevel}%
                  {currentSugarLevel > 0 && sugarLevel !== currentSugarLevel && (
                    <span className="text-xs text-blue-600 ml-2">
                      (Manual override)
                    </span>
                  )}
                  {currentSugarLevel > 0 && sugarLevel === currentSugarLevel && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Based on ingredients)
                    </span>
                  )}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="25"
                  value={sugarLevel}
                  onChange={(e) => setSugarLevel(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  title="Adjust sugar level to control drink sweetness"
                  aria-label="Sugar level slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
                {currentSugarLevel > 0 && (
                  <div className="text-xs text-amber-600 mt-2">
                    💡 Move the slider to adjust sweetness - it will update the drink layers in real-time
                  </div>
                )}
              </div>

              {/* Layer-Based Customization */}
              <div>
                <LayerBasedCustomization
                  options={customizationOptions}
                  customizations={customizations}
                  onCustomizationChange={(id, selected, quantity) =>
                    setCustomizations((prev) => ({
                      ...prev,
                      [id]: {
                        selected,
                        quantity: selected ? quantity : 0,
                      },
                    }))
                  }
                />
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Special Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Any special requests or modifications..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a87437] focus:border-[#a87437] h-20 resize-none"
                />
              </div>
            </div>

            {/* Right Column - Drink Preview and Order Summary */}
            <div className="space-y-6">
              {/* Your Drink Layers */}
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Your Drink Layers</h3>
                    <p className="text-sm text-gray-600">See how your customizations build up</p>
                  </div>
                  <div className="flex justify-center">
                    <LayeredCupVisualization
                      customizations={{
                        base: item.name,
                        milk: milk,
                        syrup: sweetener,
                        toppings: Object.entries(customizations)
                          .filter(([_, config]) => config.selected && config.quantity > 0)
                          .map(([id, _]) => customizationOptions.find(opt => opt.id === id)?.label || id),
                        ice: temperature === 'Iced',
                        size: size === 'Large' ? 'large' : 'medium',
                        sugarLevel: sugarLevel
                      } as any}
                      className="w-full h-80"
                    />
                  </div>
                  
                  {/* Layer Legend */}
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold text-gray-800 text-sm">Current Layers:</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">Base: {item.name}</Badge>
                      {milk && milk !== 'no milk' && <Badge variant="outline" className="text-xs">Milk: {milk}</Badge>}
                      {sweetener && sweetener !== 'no sweetener' && <Badge variant="outline" className="text-xs">Sweetener: {sweetener}</Badge>}
                      {temperature === 'Iced' && <Badge variant="outline" className="text-xs">Ice</Badge>}
                      {Object.entries(customizations)
                        .filter(([_, config]) => config.selected && config.quantity > 0)
                        .map(([id, config]) => {
                          const option = customizationOptions.find(opt => opt.id === id);
                          return (
                            <Badge key={id} variant="outline" className="text-xs">
                              {option?.label}: {config.quantity}
                            </Badge>
                          );
                        })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-6">
                  <h3 className="font-bold mb-4">Order Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{item.name} ({size})</span>
                      <span>₱{(() => {
                        const price = basePrice + (sizePrices[size as keyof typeof sizePrices] || 0);
                        return isNaN(price) ? '0.00' : price.toFixed(2);
                      })()}</span>
                    </div>
                    
                    {Object.entries(customizations).map(([id, config]) => {
                      if (config.selected && config.quantity > 0) {
                        const option = customizationOptions.find(opt => opt.id === id);
                        if (option) {
                          return (
                            <div key={id} className="flex justify-between text-sm">
                              <span>{option.label} (x{config.quantity})</span>
                              <span>₱{(option.pricePerUnit * config.quantity).toFixed(2)}</span>
                            </div>
                          );
                        }
                      }
                      return null;
                    })}
                    
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span>₱{(() => {
                        const total = calculateTotalPrice();
                        return isNaN(total) ? '0.00' : total.toFixed(2);
                      })()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Suggestions Teaser (below Order Summary) */}
              {!showAISuggestions && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI-Powered Suggestions
                      </h3>
                      <p className="text-sm text-blue-700">Get personalized ingredient recommendations</p>
                    </div>
                    <Button
                      variant="outline"
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                      onClick={() => setShowAISuggestions(true)}
                    >
                      Show Suggestions
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* AI Suggestions Panel */}
              {showAISuggestions && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI Recommendations
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAISuggestions(false)}
                        className="text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        Hide Suggestions
                      </Button>
                    </div>
                    
                    {loadingAI ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-blue-600 mt-2">Getting suggestions...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* AI Suggestions */}
                        {(filteredAISuggestions.length > 0 || localFallbackSuggestions.suggs.length > 0) && (
                          <div>
                            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                              <Star className="w-4 h-4" />
                              Recommended Combinations
                            </h4>
                            <div className="space-y-2">
                              {(filteredAISuggestions.length > 0 ? filteredAISuggestions : localFallbackSuggestions.suggs).map((suggestion, index) => (
                                <div key={index} className="bg-white p-3 rounded-lg border border-blue-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="font-medium text-gray-900">{suggestion.name}</h5>
                                      <p className="text-sm text-gray-600">{suggestion.description}</p>
                                      <p className="text-xs text-blue-600">{suggestion.dietaryNotes}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-green-600">{suggestion.price}</span>
                                      <Button
                                        onClick={() => applyAISuggestion(suggestion)}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        Apply
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI Combinations */}
                        {(filteredAICombinations.length > 0 || localFallbackSuggestions.combos.length > 0) && (
                          <div>
                            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                              <Zap className="w-4 h-4" />
                              Popular Combinations
                            </h4>
                            <div className="space-y-2">
                              {(filteredAICombinations.length > 0 ? filteredAICombinations : localFallbackSuggestions.combos).map((combination, index) => (
                                <div key={index} className="bg-white p-3 rounded-lg border border-blue-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="font-medium text-gray-900">{combination.name}</h5>
                                      <p className="text-sm text-gray-600">{combination.description}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {combination.customizations.map((customization, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {customization}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-green-600">{combination.totalPrice}</span>
                                      <Button
                                        onClick={() => applyAICombination(combination)}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                      >
                                        Apply
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {filteredAISuggestions.length === 0 && filteredAICombinations.length === 0 && localFallbackSuggestions.suggs.length === 0 && localFallbackSuggestions.combos.length === 0 && !loadingAI && (
                          <div className="text-center py-4 text-gray-500">
                            <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No AI suggestions available right now.</p>
                            <p className="text-xs">Check back later or ask our staff for recommendations.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAdd} className="bg-[#a87437] hover:bg-[#8f652f]">
              Add to Cart - ₱{(() => {
                const total = calculateTotalPrice();
                return isNaN(total) ? '0.00' : total.toFixed(2);
              })()}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedCustomizeModal;
