import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Calculator, 
  Settings,
  Plus,
  X,
  Save,
  X as CloseIcon,
  Image as ImageIcon
} from 'lucide-react';

interface ProductDetailsFormProps {
  product?: any;
  onSave: (product: any) => void;
  onClose: () => void;
}

interface Variant {
  id: string;
  name: string;
  price: number;
  cost: number;
}

interface IngredientOption {
  id: number;
  name: string;
  actual_unit: string;
}

interface RecipeRow {
  id: string;
  ingredient_id: number;
  amount: number;
  unit: string;
  is_optional: boolean;
  extra_price_per_unit?: number; // customer price per 1 unit of extra (unit = row.unit)
}

const ProductDetailsForm: React.FC<ProductDetailsFormProps> = ({ product, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || '',
    productType: product?.productType || 'default',
    description: product?.description || '',
    image_url: product?.image_url || product?.imageUrl || '',
    sellingPrice: product?.sellingPrice || product?.base_price || 0,
    cost: product?.cost || 0,
    visibleInPos: product?.visible_in_pos !== undefined ? product.visible_in_pos : true,
    visibleInCustomerMenu: product?.visible_in_customer_menu !== undefined ? product.visible_in_customer_menu : true,
    allowCustomization: product?.allow_customization !== undefined
      ? product.allow_customization
      : (product?.is_customizable !== undefined ? product.is_customizable : true),

    addOns: product?.addOns || false,
    orderNotes: product?.orderNotes || false,
    notes: product?.notes || '',
    variants: product?.variants || []
  });

  const [newVariant, setNewVariant] = useState({ name: '', price: 0, cost: 0 });
  const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([]);
  const [recipe, setRecipe] = useState<RecipeRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    // load ingredients for recipe builder
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/inventory`);
        const data = await res.json();
        if (data?.ingredients) {
          setIngredientOptions(
            data.ingredients.map((i: any) => ({ id: i.id, name: i.name, actual_unit: i.actual_unit }))
          );
        }
      } catch (e) {
        console.error('Load ingredients failed', e);
      }
    };
    load();

    // Load existing recipe data if editing
    if (product && product.ingredients && product.ingredients.length > 0) {
      console.log('Loading existing recipe:', product.ingredients);
      setRecipe(product.ingredients.map((ing: any) => ({
        id: crypto.randomUUID(),
        ingredient_id: ing.ingredient_id || ing.id || 0,
        amount: ing.base_quantity || ing.amount || 0,
        unit: ing.base_unit || ing.unit || '',
        is_optional: ing.is_optional || false,
        extra_price_per_unit: ing.extra_price_per_unit || ing.extra_step_price || 0
      })));
    }
  }, [product]);

  useEffect(() => {
    // Load categories from backend so they are shared globally
    const loadCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/api/menu/categories`);
        const data = await res.json();
        if (data.success) setCategories(data.categories || []);
      } catch (_) {}
    };
    loadCategories();
  }, []);

  const addCustomCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const res = await fetch(`${API_URL}/api/menu/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success) {
        setCategories(prev => (prev.includes(name) ? prev : [...prev, name]));
        setFormData(prev => ({ ...prev, category: name }));
      }
    } catch (_) {}
    setShowNewCategory(false);
    setNewCategoryName('');
  };

  const deleteCategory = async (name: string) => {
    try {
      const res = await fetch(`${API_URL}/api/menu/categories/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setCategories(prev => prev.filter(c => c !== name));
        if (formData.category === name) {
          setFormData(prev => ({ ...prev, category: '' }));
        }
      } else {
        alert(data.error || 'Cannot delete category');
      }
    } catch (e) {
      alert('Failed to delete category');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('image', file);

    try {
      const response = await fetch(`${API_URL}/api/upload/menu-image`, {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        // Store the full versions object for responsive images
        setFormData(prev => ({ ...prev, image_url: result.versions }));
      } else {
        const errorData = await response.json();
        console.error('Failed to upload image:', errorData);
        alert(`Failed to upload image: ${errorData.error || 'Please try again.'}`);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate recipe before submission
    const invalidIngredients = recipe.filter(row => !row.ingredient_id || row.ingredient_id <= 0 || row.amount <= 0);
    if (invalidIngredients.length > 0) {
      alert('Please complete all ingredient information before saving.');
      return;
    }

    // Prepare data for backend with proper recipe structure
    const submitData = {
      name: formData.name,
      category: formData.category,
      description: formData.description,
      sellingPrice: parseFloat(formData.sellingPrice.toString()),
      cost: parseFloat(formData.cost.toString()),
      visibleInPos: formData.visibleInPos,
      visibleInCustomerMenu: formData.visibleInCustomerMenu,
      allow_customization: formData.allowCustomization,

      addOns: formData.addOns,
      orderNotes: formData.orderNotes,
      notes: formData.notes,
      image_url: typeof formData.image_url === 'object' ? formData.image_url.medium : formData.image_url,
      variants: formData.variants,
      // Enhanced recipe data for unit conversion system
      ingredients: recipe.map(row => ({
        ingredient_id: row.ingredient_id,
        base_quantity: row.amount,
        base_unit: row.unit,
        is_optional: row.is_optional,
        extra_price_per_unit: Number(row.extra_price_per_unit) || 0
      }))
    };

    console.log('🔧 ProductDetailsForm - Sending data:', {
      id: product?.id,
      name: submitData.name,
      visibleInPos: submitData.visibleInPos,
      visibleInCustomerMenu: submitData.visibleInCustomerMenu,
      allow_customization: submitData.allow_customization
    });

    onSave(submitData);
  };

  const addRecipeRow = () => {
    setRecipe(prev => [
      ...prev,
      { id: crypto.randomUUID(), ingredient_id: 0, amount: 0, unit: '', is_optional: false, extra_price_per_unit: 0 }
    ]);
  };

  const removeRecipeRow = (id: string) => {
    setRecipe(prev => prev.filter(r => r.id !== id));
  };

  const updateRecipeRow = (id: string, patch: Partial<RecipeRow>) => {
    setRecipe(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addVariant = () => {
    if (newVariant.name && newVariant.price > 0) {
      setFormData(prev => ({
        ...prev,
        variants: [...prev.variants, { ...newVariant, id: crypto.randomUUID() }]
      }));
      setNewVariant({ name: '', price: 0, cost: 0 });
    }
  };

  const removeVariant = (id: string) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== id)
    }));
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Product Details</h2>
                <p className="text-gray-600 text-sm">Enter details of your product</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
              aria-label="Close product form"
              title="Close"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content - Single Column Layout */}
            <div className="space-y-6">
            {/* Step 1: Basic Information & Image */}
              <Card>
                <CardHeader className="pb-5">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-500" />
                  Step 1: Basic Information & Image
                  </CardTitle>
                </CardHeader>
                            <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Side - Form Fields */}
                  <div className="lg:col-span-2 space-y-4">
                                         {/* Image Upload Section */}
                  <div>
                    <Label htmlFor="image" className="mb-2 block">Product Image *</Label>
                       <div className="mt-2 space-y-2">
                         <Input
                           id="image"
                           type="file"
                           accept="image/*"
                           onChange={handleImageUpload}
                           className="cursor-pointer"
                         />
                         <p className="text-xs text-gray-500">Max size: 3MB. Supported: JPG, PNG, GIF</p>
                       </div>
                     </div>

                    {/* Basic Info Fields */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="w-full">
                    <Label htmlFor="name" className="mb-2 block">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter product name"
                      required
                              className="w-full"
                    />
                  </div>
                  
                          <div className="w-full">
                    <Label htmlFor="category" className="mb-2 block">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: string) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                              <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-2 flex items-center gap-3 flex-nowrap">
                      {!showNewCategory ? (
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                          onClick={() => setShowNewCategory(true)}
                        >
                          + Add new category
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Enter new category"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                          />
                          <Button type="button" size="sm" onClick={addCustomCategory}>Save</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}>Cancel</Button>
                        </div>
                      )}
                      <button
                        type="button"
                        className="text-xs text-gray-600 hover:underline whitespace-nowrap"
                        onClick={() => setShowCategoryManager(true)}
                      >
                        Manage categories
                      </button>
                    </div>
                          </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="mb-2 block">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the menu item..."
                            rows={2}
                    />
                  </div>
                      </div>
                    </div>
                  </div>
                  
                                     {/* Right Side - Image Preview */}
                   <div className="lg:col-span-1">
                     <div className="sticky top-4">
                       <Label className="text-sm font-medium text-gray-700 mb-3 block">Image Preview</Label>
                       {formData.image_url ? (
                         <div className="space-y-3">
                           <div className="relative">
                      <img
                        src={(() => {
                          const val: any = formData.image_url as any;
                          const url = typeof val === 'object' && val !== null ? (val.medium || val.url || val.path) : val;
                          if (!url) return '';
                          if (/^https?:\/\//i.test(url)) return url;
                          const withSlash = url.startsWith('/') ? url : `/${url}`;
                          return `${API_URL}${withSlash}`;
                        })()}
                        alt="Product preview"
                               className="w-full h-48 object-cover rounded-lg border border-gray-300 shadow-sm"
                      />
                           </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                             className="w-full text-red-500 hover:text-red-700 text-sm py-2 px-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remove Image
                      </button>
                    </div>
                       ) : (
                         <div className="w-full h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center">
                           <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                           <p className="text-xs text-gray-500 text-center">No image selected</p>
                           <p className="text-xs text-gray-400 text-center">Upload an image to see preview</p>
                         </div>
                       )}
                     </div>
                   </div>
                </div>
                </CardContent>
              </Card>

            {/* Step 2: Pricing */}
              <Card>
                <CardHeader className="pb-5">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-purple-500" />
                  Step 2: Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="sellingPrice" className="mb-2 block">Selling Price *</Label>
                      <Input
                        id="sellingPrice"
                        type="number"
                        placeholder="Enter price"
                        value={formData.sellingPrice === 0 ? '' : formData.sellingPrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, sellingPrice: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0) }))}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cost" className="mb-2 block">Cost</Label>
                      <Input
                        id="cost"
                        type="number"
                        placeholder="Enter cost"
                        value={formData.cost === 0 ? '' : formData.cost}
                        onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0) }))}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Step 3: Visibility Settings */}
              <Card>
                <CardHeader className="pb-5">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-orange-500" />
                  Step 3: Visibility Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="visibleInPos"
                      checked={formData.visibleInPos}
                      onChange={(e) => setFormData(prev => ({ ...prev, visibleInPos: e.target.checked }))}
                      className="rounded"
                      aria-label="Visible in POS"
                    />
                    <Label htmlFor="visibleInPos">Visible in POS</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="visibleInCustomerMenu"
                      checked={formData.visibleInCustomerMenu}
                      onChange={(e) => setFormData(prev => ({ ...prev, visibleInCustomerMenu: e.target.checked }))}
                      className="rounded"
                      aria-label="Visible in Customer Menu"
                    />
                    <Label htmlFor="visibleInCustomerMenu">Visible in Customer Menu</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowCustomization"
                      checked={formData.allowCustomization}
                      onChange={(e) => setFormData(prev => ({ ...prev, allowCustomization: e.target.checked }))}
                      className="rounded"
                      aria-label="Allow customization"
                    />
                    <Label htmlFor="allowCustomization">Allow customization</Label>
                  </div>
                  </div>
                </CardContent>
              </Card>

            {/* Step 4: Variants */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5 text-green-500" />
                  Step 4: Variants (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      placeholder="Variant name"
                      value={newVariant.name}
                      onChange={(e) => setNewVariant(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={newVariant.price === 0 ? '' : newVariant.price}
                      onChange={(e) => setNewVariant(prev => ({ ...prev, price: e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0) }))}
                      min="0"
                      step="0.01"
                    />
                                         <Button type="button" onClick={addVariant} size="sm" aria-label="Add variant">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Variant
                     </Button>
                  </div>
                  
                  {formData.variants.length > 0 && (
                    <div className="space-y-2">
                    {formData.variants.map((variant: Variant, index: number) => (
                        <div key={variant.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <span className="flex-1 text-sm">{variant.name}</span>
                          <span className="text-sm font-medium">₱{variant.price}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeVariant(variant.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            {/* Step 5: Recipe */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-500" />
                  Step 5: Recipe (Required for Inventory Management)
                  </CardTitle>
                <p className="text-sm text-gray-600 font-normal">
                  Define ingredients and quantities. The system will automatically convert units and deduct from inventory.
                </p>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <Button 
                    type="button" 
                    onClick={addRecipeRow} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Ingredient
                  </Button>
                  <span className="text-sm text-gray-500">
                    {recipe.length} ingredient{recipe.length !== 1 ? 's' : ''} added
                  </span>
                </div>
                  
                  {recipe.length > 0 && (
                  <div className="space-y-0">
                    {/* Header Row */}
                    <div className="grid grid-cols-5 gap-6 bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 rounded-t-lg border-b-2 border-gray-200">
                      <div className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Ingredient</div>
                      <div className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Amount</div>
                      <div className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Unit</div>
                      <div className="font-semibold text-gray-800 text-sm uppercase tracking-wide text-center">Optional</div>
                      <div className="font-semibold text-gray-800 text-sm uppercase tracking-wide text-center">Action</div>
                    </div>
                    
                    {/* Ingredient Rows */}
                    {recipe.map((row) => {
                      const selectedIngredient = ingredientOptions.find(i => i.id === row.ingredient_id);
                      return (
                        <div key={row.id} className="grid grid-cols-5 gap-6 items-center p-4 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 last:rounded-b-lg">
                          <div className="flex items-center">
                          <Select
                            value={row.ingredient_id && row.ingredient_id > 0 ? row.ingredient_id.toString() : ''}
                              onValueChange={(value: string) => {
                                const ingredientId = parseInt(value);
                                if (!isNaN(ingredientId)) {
                                  updateRecipeRow(row.id, { 
                                    ingredient_id: ingredientId
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="h-10 w-full">
                                <SelectValue placeholder="Select ingredient" />
                            </SelectTrigger>
                            <SelectContent>
                              {ingredientOptions.map((ingredient) => (
                                <SelectItem key={ingredient.id} value={ingredient.id.toString()}>
                                  {ingredient.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          </div>
                          
                          <div className="flex items-center">
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={row.amount ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const num = parseFloat(val);
                              updateRecipeRow(row.id, { amount: val === '' || isNaN(num) ? (undefined as unknown as number) : num });
                            }}
                            className="h-10 w-full"
                            min="0"
                            step="0.01"
                          />
                          </div>
                          
                          <div className="relative flex items-center">
                            <Select
                            value={row.unit}
                              onValueChange={(value: string) => updateRecipeRow(row.id, { unit: value })}
                            >
                              <SelectTrigger className="h-10 w-full">
                                <SelectValue placeholder="Select Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ml">ml (milliliters)</SelectItem>
                                <SelectItem value="g">g (grams)</SelectItem>
                                <SelectItem value="pieces">pieces</SelectItem>
                                <SelectItem value="cups">cups</SelectItem>
                                <SelectItem value="tbsp">tbsp (tablespoons)</SelectItem>
                                <SelectItem value="tsp">tsp (teaspoons)</SelectItem>
                                <SelectItem value="oz">oz (ounces)</SelectItem>
                                <SelectItem value="lbs">lbs (pounds)</SelectItem>
                                <SelectItem value="shots">shots</SelectItem>
                                <SelectItem value="scoops">scoops</SelectItem>
                              </SelectContent>
                            </Select>
                            {selectedIngredient && (
                              <div className="absolute -top-7 left-0 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-md border border-blue-200 font-medium">
                                📦 Inventory: {selectedIngredient.actual_unit}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              id={`optional-${row.id}`}
                              checked={row.is_optional}
                              onChange={(e) => updateRecipeRow(row.id, { is_optional: e.target.checked })}
                              className="rounded w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                              aria-label="Optional ingredient"
                              title="Optional ingredient"
                            />
                          </div>
                          
                          <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeRecipeRow(row.id)}
                              className="h-9 w-9 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 hover:scale-105 transition-all duration-150 border-red-200"
                              title="Remove ingredient"
                              aria-label="Remove ingredient"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          </div>
                          
                          {/* Extra Pricing (per unit) */}
                          <div className="col-span-5 grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 bg-gray-50 rounded p-3 border border-gray-100">
                            <div>
                              <Label className="text-xs text-gray-600">Extra price per unit (₱ / unit)</Label>
                              <Input
                                type="number"
                                value={row.extra_price_per_unit ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const num = parseFloat(val);
                                  updateRecipeRow(row.id, { extra_price_per_unit: val === '' || isNaN(num) ? (undefined as unknown as number) : num });
                                }}
                                min="0"
                                step="0.01"
                                placeholder="e.g., 0.50"
                              />
                              <p className="text-[10px] text-gray-500 mt-1">Unit uses the recipe unit above (e.g., g, ml).</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recipe Information */}
                {recipe.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
                    <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Recipe Information
                    </h4>
                    <div className="text-xs text-blue-700 space-y-2">
                      <div className="flex items-start">
                        <span className="text-blue-500 mr-2 mt-0.5">•</span>
                        <span><strong>Unit Conversion:</strong> The system automatically converts recipe units to inventory units</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-blue-500 mr-2 mt-0.5">•</span>
                        <span><strong>Inventory Deduction:</strong> Ingredients are automatically deducted when orders are placed</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-blue-500 mr-2 mt-0.5">•</span>
                        <span><strong>Low Stock Alerts:</strong> You'll be notified when ingredients run low</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-blue-500 mr-2 mt-0.5">•</span>
                        <span><strong>Optional Ingredients:</strong> Ingredient is customizable per order; deducted only if included for that order</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Validation Warnings */}
                {recipe.length > 0 && (
                  <div className="space-y-2">
                    {recipe.map((row) => {
                      if (!row.ingredient_id || row.amount <= 0) {
                        return (
                          <div key={row.id} className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                            ⚠️ Please select an ingredient and enter a valid amount for complete recipe setup.
                          </div>
                        );
                      }
                      return null;
                    })}
                    </div>
                  )}
                </CardContent>
              </Card>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#a87437] hover:bg-[#a87437]/90 text-white">
              <Save className="w-4 h-4 mr-2" />
              {product ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </div>
    
    {showCategoryManager && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Manage Categories</h3>
            <Button size="sm" variant="outline" onClick={() => setShowCategoryManager(false)}>Close</Button>
          </div>
          <div className="space-y-2 max-h-72 overflow-auto">
            {categories.map((c) => (
              <div key={c} className="flex items-center justify-between border rounded px-2 py-1">
                <span>{c}</span>
                <Button size="sm" variant="outline" onClick={() => deleteCategory(c)}>Delete</Button>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-sm text-gray-500">No categories</div>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default ProductDetailsForm; 