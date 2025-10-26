import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Coffee, 
  Calculator, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Package
} from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  category: string;
  display_price: number;
  ingredients: MenuItemIngredient[];
}

interface MenuItemIngredient {
  ingredient_id: number;
  ingredient_name: string;
  required_actual_amount: number;
  required_display_amount: number;
  actual_unit: string;
  display_unit: string;
  is_optional: boolean;
}

interface Ingredient {
  id: number;
  name: string;
  actual_unit: string;
  actual_quantity: number;
  display_unit: string;
  display_quantity: number;
  conversion_rate: number;
}

const DrinkRecipeManager: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedDrink, setSelectedDrink] = useState<MenuItem | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  const API_URL = '';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch menu items with ingredients
      const menuResponse = await fetch('/api/inventory/menu/items');
      const menuData = await menuResponse.json();
      
      // Fetch ingredients
      const ingredientsResponse = await fetch('/api/inventory');
      const ingredientsData = await ingredientsResponse.json();
      
      if (menuData.success && ingredientsData.success) {
        setMenuItems(menuData.menuItems || []);
        setIngredients(ingredientsData.ingredients || []);
        
        if (menuData.menuItems.length > 0) {
          setSelectedDrink(menuData.menuItems[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateIngredientUsage = (drink: MenuItem, quantity: number) => {
    return drink.ingredients.map(ingredient => {
      const totalRequired = ingredient.required_actual_amount * quantity;
      const displayRequired = ingredient.required_display_amount * quantity;
      
      // Find current stock
      const stock = ingredients.find(i => i.id === ingredient.ingredient_id);
      const currentStock = stock ? stock.actual_quantity : 0;
      const currentDisplayStock = stock ? stock.display_quantity : 0;
      
      const remainingStock = currentStock - totalRequired;
      const remainingDisplayStock = currentDisplayStock - displayRequired;
      
      return {
        ...ingredient,
        totalRequired,
        displayRequired,
        currentStock,
        currentDisplayStock,
        remainingStock,
        remainingDisplayStock,
        canMake: remainingStock >= 0,
        stock: stock
      };
    });
  };

  const getStockStatusBadge = (canMake: boolean, isOptional: boolean) => {
    if (canMake) {
      return <Badge className="bg-green-500 text-white">Available</Badge>;
    } else if (isOptional) {
      return <Badge className="bg-yellow-500 text-white">Low Stock</Badge>;
    } else {
      return <Badge className="bg-red-500 text-white">Insufficient</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Drink Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coffee className="w-5 h-5" />
                  Select Drink
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="drink-select">Choose a Drink</Label>
                  <Select 
                    value={selectedDrink?.id.toString() || ''} 
                    onValueChange={(value) => {
                      const drink = menuItems.find(d => d.id.toString() === value);
                      setSelectedDrink(drink || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a drink" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItems.map((drink) => (
                        <SelectItem key={drink.id} value={drink.id.toString()}>
                          {drink.name} - ₱{drink.display_price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 1)}
                    placeholder="1"
                  />
                </div>

                {selectedDrink && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900">{selectedDrink.name}</h3>
                    <p className="text-sm text-blue-700">{selectedDrink.description}</p>
                    <p className="text-sm text-blue-600 mt-1">Price: ₱{selectedDrink.display_price}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recipe Details */}
          <div className="lg:col-span-2">
            {selectedDrink ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Recipe for {selectedDrink.name} ({orderQuantity}x)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Recipe Overview */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">📋 Recipe Overview</h3>
                      <p className="text-sm text-gray-700">
                        This drink requires {selectedDrink.ingredients.length} ingredients. 
                        The system will automatically deduct the exact amounts from inventory.
                      </p>
                    </div>

                    {/* Ingredient Requirements */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">🧾 Ingredient Requirements</h3>
                      
                      {calculateIngredientUsage(selectedDrink, orderQuantity).map((ingredient, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{ingredient.ingredient_name}</h4>
                              <p className="text-sm text-gray-600">
                                {ingredient.required_actual_amount} {ingredient.actual_unit} per drink
                                {ingredient.is_optional && <span className="text-orange-600 ml-1">(Optional)</span>}
                              </p>
                            </div>
                            {getStockStatusBadge(ingredient.canMake, ingredient.is_optional)}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Required ({orderQuantity}x):</span>
                              <div className="font-medium">
                                {ingredient.totalRequired.toFixed(3)} {ingredient.actual_unit}
                              </div>
                              <div className="text-gray-500">
                                ({ingredient.displayRequired.toFixed(2)} {ingredient.display_unit})
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-gray-600">Current Stock:</span>
                              <div className="font-medium">
                                {ingredient.currentStock.toFixed(3)} {ingredient.actual_unit}
                              </div>
                              <div className="text-gray-500">
                                ({ingredient.currentDisplayStock.toFixed(2)} {ingredient.display_unit})
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-gray-600">After Order:</span>
                              <div className="font-medium">
                                {ingredient.remainingStock.toFixed(3)} {ingredient.actual_unit}
                              </div>
                              <div className="text-gray-500">
                                ({ingredient.remainingDisplayStock.toFixed(2)} {ingredient.display_unit})
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-gray-600">Status:</span>
                              <div className={`font-medium ${ingredient.canMake ? 'text-green-600' : 'text-red-600'}`}>
                                {ingredient.canMake ? 'Can Make' : 'Cannot Make'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Summary */}
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h3 className="font-semibold text-green-900 mb-2">📊 Order Summary</h3>
                      <div className="text-sm text-green-800">
                        <div><strong>Drink:</strong> {selectedDrink.name}</div>
                        <div><strong>Quantity:</strong> {orderQuantity}</div>
                        <div><strong>Total Price:</strong> ₱{selectedDrink.display_price * orderQuantity}</div>
                        <div><strong>Ingredients Used:</strong> {selectedDrink.ingredients.length}</div>
                      </div>
                    </div>

                    {/* How It Works */}
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">🔄 How Automatic Deduction Works</h3>
                      <div className="text-sm text-blue-800 space-y-2">
                        <div><strong>1. Recipe Lookup:</strong> System finds exact ingredient requirements for {selectedDrink.name}</div>
                        <div><strong>2. Quantity Calculation:</strong> Multiplies requirements by {orderQuantity}</div>
                        <div><strong>3. Stock Check:</strong> Verifies if enough inventory is available</div>
                        <div><strong>4. Automatic Deduction:</strong> Deducts exact amounts from inventory</div>
                        <div><strong>5. Transaction Record:</strong> Logs all changes for tracking</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Coffee className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Drink</h3>
                  <p className="text-gray-500">Choose a drink from the menu to see its recipe and ingredient requirements.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Example Scenarios */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Example Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">☕ Espresso (Simple)</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>• Requires: 18g coffee beans (1 shot)</div>
                  <div>• System deducts: Exactly 18g from inventory</div>
                  <div>• Customer sees: "1 shot of espresso"</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">🥛 Vanilla Latte (Complex)</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>• Requires: 18g coffee + 15ml vanilla + 105ml milk</div>
                  <div>• System deducts: Exact amounts from each ingredient</div>
                  <div>• Customer sees: "Vanilla latte with 1 shot, 1 pump vanilla, 4.2 shots milk"</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">🍫 Mocha (Multiple Ingredients)</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>• Requires: 18g coffee + 30ml chocolate + 90ml milk</div>
                  <div>• System deducts: Precise amounts from 3 different ingredients</div>
                  <div>• Customer sees: "Mocha with 1 shot, 1.5 pumps chocolate, 3.6 shots milk"</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">📦 Bulk Orders</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>• Order 5 lattes: System multiplies all requirements by 5</div>
                  <div>• Deducts: 90g coffee + 600ml milk total</div>
                  <div>• Customer sees: "5 lattes" (no technical details)</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DrinkRecipeManager; 