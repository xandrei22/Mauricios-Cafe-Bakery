import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  ShoppingCart,
  Users,
  MoreVertical
} from 'lucide-react';
import ProductDetailsForm from './ProductDetailsForm';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  category: string;
  base_price: number;
  is_available: boolean;
  visible_in_pos: boolean;
  visible_in_customer_menu: boolean;
  created_at: string;
  image_url?: string;
  ingredients?: Array<{
    ingredient_id: number;
    base_quantity: number;
    base_unit: string;
    actual_quantity: number;
    inventory_unit: string;
    ingredient_name: string;
    is_optional: boolean;
  }>;
}

const AdminMenu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      // Use endpoint that includes ingredients
      const response = await fetch(`${API_URL}/api/menu/with-ingredients`, { credentials: 'omit' });
      const data = await response.json();
      if (data.success) {
        // Ensure proper type conversion for numeric fields
        const processedItems = data.menuItems.map((item: any) => ({
          ...item,
          base_price: Number(item.base_price),
          is_available: Boolean(item.is_available),
          visible_in_pos: Boolean(item.visible_in_pos),
          visible_in_customer_menu: Boolean(item.visible_in_customer_menu),
          // Ensure ingredients array is properly formatted
          ingredients: (item.ingredients || []).map((ing: any) => ({
            ingredient_id: ing.ingredient_id,
            id: ing.ingredient_id, // For compatibility
            base_quantity: ing.base_quantity || ing.required_display_amount || 0,
            base_unit: ing.base_unit || ing.recipe_unit || '',
            amount: ing.base_quantity || ing.required_display_amount || 0,
            unit: ing.base_unit || ing.recipe_unit || '',
            is_optional: ing.is_optional || false,
            extra_price_per_unit: ing.extra_price_per_unit || 0
          }))
        }));
        setMenuItems(processedItems);
        console.log('✅ AdminMenu - Loaded menu items with ingredients:', processedItems.length);
      }
    } catch (error) {
      console.error('Failed to load menu items:', error);
      // Fallback to regular endpoint if with-ingredients fails
      try {
        const fallbackResponse = await fetch(`${API_URL}/api/menu`, { credentials: 'omit' });
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.success) {
          const processedItems = fallbackData.menuItems.map((item: any) => ({
            ...item,
            base_price: Number(item.base_price),
            is_available: Boolean(item.is_available),
            visible_in_pos: Boolean(item.visible_in_pos),
            visible_in_customer_menu: Boolean(item.visible_in_customer_menu),
            ingredients: [] // Empty if endpoint doesn't provide them
          }));
          setMenuItems(processedItems);
        }
      } catch (fallbackError) {
        console.error('Fallback endpoint also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Derived values for filtering and categories
  const categories = Array.from(new Set(menuItems.map(i => i.category).filter(Boolean))) as string[];
  const filteredItems = menuItems
    .filter(i => selectedCategory === 'all' || i.category === selectedCategory)
    .filter(i =>
      [i.name, i.description, i.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );

  const handleSave = async (productData: any) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const url = editingItem 
        ? `${API_URL}/api/menu/${editingItem.id}`
        : `${API_URL}/api/menu`;
      
      const method = editingItem ? 'PUT' : 'POST';
      
      console.log('🔧 AdminMenu - Sending request:', {
        url,
        method,
        id: editingItem?.id,
        visibleInPos: productData.visibleInPos,
        visibleInCustomerMenu: productData.visibleInCustomerMenu
      });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
        credentials: 'omit',
      });

      const data = await response.json();
      
      console.log('🔧 AdminMenu - Response:', {
        success: data.success,
        message: data.message,
        error: data.error
      });
      
      if (data.success) {
        setShowForm(false);
        setEditingItem(null);
        loadMenuItems();
      } else {
        alert('Failed to save menu item: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save menu item:', error);
      alert('Failed to save menu item');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this menu item?')) {
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/menu/${id}`, {
        method: 'DELETE',
        credentials: 'omit',
      });

      const data = await response.json();
      
      if (data.success) {
        loadMenuItems();
      } else {
        alert('Failed to delete menu item: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to delete menu item:', error);
      alert('Failed to delete menu item');
    }
  };

  const toggleVisibility = async (id: number, field: 'visible_in_pos' | 'visible_in_customer_menu', value: boolean) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const response = await fetch(`${API_URL}/api/menu/${id}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
        credentials: 'omit',
      });

      const data = await response.json();
      
      if (data.success) {
        // Update the state locally instead of reloading everything
        setMenuItems(prevItems => 
          prevItems.map(item => 
            item.id === id 
              ? { ...item, [field]: value }
              : item
          )
        );
      } else {
        alert('Failed to update visibility: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to update visibility:', error);
      alert('Failed to update visibility');
    }
  };

  const openForm = (item?: MenuItem) => {
    setEditingItem(item || null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading menu items...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-2 sm:mx-4 lg:mx-6 p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Menu</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Create and manage your menu items</p>
        </div>
        <Button 
          onClick={() => openForm()} 
          className="bg-amber-700 hover:bg-amber-800 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      {/* Filters, Search, View toggle */}
      <div className="rounded-xl bg-[#f5f5f5] p-4">
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:min-w-[18rem]">
        <input
          placeholder="Search by name, SKU, category"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10 h-10 rounded-lg bg-white border border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437] px-3 w-full"
        />
        <button
          onClick={() => {
            // Search functionality is already handled by the filtered items
            console.log('Searching for:', searchTerm);
          }}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 flex items-center justify-center hover:bg-[#a87437]/10 rounded-md transition-colors"
          aria-label="Search menu items"
        >
          <svg className="w-4 h-4 text-[#a87437]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"/></svg>
        </button>
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-auto">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-10 rounded-lg bg-white border border-[#a87437] focus:border-[#8f652f] focus:ring-[#a87437] px-3 pr-4">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="w-full sm:w-auto flex sm:justify-end">
            <div className="relative" ref={moreMenuRef}>
              <Button
                variant="outline"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="h-10 border-[#a87437] text-[#6B5B5B] hover:bg-[#a87437]/10"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              
              {/* Dropdown Menu */}
              {showMoreMenu && (
                <div className="absolute right-0 top-11 z-50 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setViewMode("grid");
                        setShowMoreMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                        viewMode === "grid" ? "text-[#a87437] font-medium" : "text-gray-700"
                      }`}
                    >
                      <span>Grid View</span>
                      {viewMode === "grid" && <span className="text-[#a87437]">✓</span>}
                    </button>
                    <button
                      onClick={() => {
                        setViewMode("list");
                        setShowMoreMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                        viewMode === "list" ? "text-[#a87437] font-medium" : "text-gray-700"
                      }`}
                    >
                      <span>List View</span>
                      {viewMode === "list" && <span className="text-[#a87437]">✓</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'grid' && (
      <>
      {filteredItems.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-gray-500">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No menu items found</h3>
              <p className="text-sm">Try adjusting your search or category filter</p>
            </div>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start justify-between gap-4 w-full">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 aspect-square">
                    {item.image_url ? (
                      <img
                        src={item.image_url.startsWith('http') ? item.image_url : item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          console.error('Image failed to load:', (item as any).image_url);
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-gray-200 flex items-center justify-center ${item.image_url ? 'hidden' : ''}`}>
                      <i className="fas fa-image text-gray-400 text-xl"></i>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl truncate">{item.name}</CardTitle>
                    <p className="text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3">
                      <Badge variant="outline" className="text-sm">
                        {item.category}
                      </Badge>
                      <span className="text-base sm:text-lg font-semibold text-amber-700">
                        ₱{Number(item.base_price).toFixed(2)}
                      </span>
                      <Badge 
                        variant={item.is_available ? "default" : "secondary"}
                        className="text-sm"
                      >
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 sm:ml-0 justify-start shrink-0 w-full sm:basis-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleVisibility(item.id, 'visible_in_pos', !item.visible_in_pos)}
                    className={`flex items-center gap-1 ${
                      item.visible_in_pos ? 'text-green-600 border-green-600' : 'text-gray-400 border-gray-400'
                    }`}
                  >
                    {item.visible_in_pos ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleVisibility(item.id, 'visible_in_customer_menu', !item.visible_in_customer_menu)}
                    className={`flex items-center gap-1 ${
                      item.visible_in_customer_menu ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-gray-400'
                    }`}
                  >
                    {item.visible_in_customer_menu ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <Users className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openForm(item)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
      )}
      </>
      )}

      {viewMode === 'list' && (
        filteredItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-500">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No menu items found</h3>
                <p className="text-sm">Try adjusting your search or category filter</p>
              </div>
            </CardContent>
          </Card>
        ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-xs table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left pl-6 pr-3 py-2">Image</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-left px-3 py-2">Price</th>
                <th className="text-center px-3 py-2 w-28">POS</th>
                <th className="text-center px-3 py-2 w-40">Customer Menu</th>
                <th className="text-center px-3 py-2 w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="pl-6 pr-3 py-1 text-gray-600 truncate max-w-[16rem]" title={item.image_url || 'No image'}>
                    {item.image_url ? item.image_url : 'No image'}
                  </td>
                  <td className="px-3 py-1 font-medium truncate max-w-[12rem]">{item.name}</td>
                  <td className="px-3 py-1 truncate whitespace-nowrap">{item.category}</td>
                  <td className="px-3 py-1 text-gray-600 truncate max-w-[22rem]">{item.description}</td>
                  <td className="px-3 py-1 truncate whitespace-nowrap">₱{Number(item.base_price).toFixed(2)}</td>
                  <td className="px-3 py-1 whitespace-nowrap text-center">
                    <button
                      className={`px-2 py-0.5 rounded-md border ${item.visible_in_pos ? 'text-green-600 border-green-500 bg-green-50' : 'text-gray-500 border-gray-300 bg-white'}`}
                      onClick={() => toggleVisibility(item.id, 'visible_in_pos', !item.visible_in_pos)}
                      title="Toggle POS visibility"
                    >
                      {item.visible_in_pos ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-3 py-1 whitespace-nowrap text-center">
                    <button
                      className={`px-2 py-0.5 rounded-md border ${item.visible_in_customer_menu ? 'text-blue-600 border-blue-500 bg-blue-50' : 'text-gray-500 border-gray-300 bg-white'}`}
                      onClick={() => toggleVisibility(item.id, 'visible_in_customer_menu', !item.visible_in_customer_menu)}
                      title="Toggle customer menu visibility"
                    >
                      {item.visible_in_customer_menu ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-3 py-1 text-center whitespace-nowrap">
                    <div className="inline-flex gap-1 justify-center">
                      <button
                        className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
                        title="Edit"
                        onClick={() => openForm(item)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded-md border border-red-400 text-red-600 hover:bg-red-50"
                        title="Delete"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      )}

      {menuItems.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-gray-500">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No menu items yet</h3>
              <p className="text-sm">Create your first menu item to get started</p>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <ProductDetailsForm
          product={editingItem}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  );
};

export default AdminMenu; 