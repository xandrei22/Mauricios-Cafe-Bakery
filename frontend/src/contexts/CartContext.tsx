import React, { createContext, useContext, useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  customizations?: Record<string, any>;
  customPrice?: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateNotes: (id: string, notes: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  resetCartState: () => void;
  total: number;
  getItemCount: () => number;
  isCartModalOpen: boolean;
  openCartModal: () => void;
  closeCartModal: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    // Load cart from localStorage on initialization
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        // Check if cart is empty array
        if (savedCart === '[]' || savedCart.trim() === '[]') {
          console.log('Cart is empty in localStorage, starting with empty cart');
          return [];
        }
        
        const parsedCart = JSON.parse(savedCart);
        
        // Validate that the cart is an array
        if (!Array.isArray(parsedCart)) {
          console.warn('Invalid cart data: not an array, clearing...');
          localStorage.removeItem('cart');
          return [];
        }
        
        // If array is empty, return empty
        if (parsedCart.length === 0) {
          console.log('Cart array is empty, starting with empty cart');
          return [];
        }
        
        // Validate that all items have required properties
        const validItems = parsedCart.filter(item => 
          item && typeof item.id === 'string' && typeof item.quantity === 'number'
        );
        
        if (validItems.length !== parsedCart.length) {
          console.warn('Some cart items are invalid, removing invalid items...');
          // Save only valid items back to localStorage
          if (validItems.length > 0) {
            localStorage.setItem('cart', JSON.stringify(validItems));
            return validItems;
          } else {
            localStorage.removeItem('cart');
            return [];
          }
        }
        
        console.log('Loaded cart from localStorage:', validItems.length, 'items');
        return validItems;
      }
      return [];
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      localStorage.removeItem('cart');
      return [];
    }
  });

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    try {
      // Always save current state to localStorage (even if empty array)
      // This ensures localStorage stays in sync with state
      const cartData = JSON.stringify(items);
      localStorage.setItem('cart', cartData);
      
      // Dispatch custom event to notify other components (like navbar) that cart has changed
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
      // Debug: log cart state changes in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🛒 Cart state saved to localStorage:', items.length, 'items');
      }
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [items]);

  const addToCart = (item: CartItem) => {
    setItems(prev => {
      // Ensure we're working with clean state (not accidentally merging with old localStorage data)
      const currentItems = Array.isArray(prev) ? prev : [];
      
      const existing = currentItems.find(i => i.id === item.id);
      if (existing) {
        const updated = currentItems.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        );
        return updated;
      }
      return [...currentItems, { ...item, quantity: item.quantity || 1 }];
    });

    Swal.fire({
      toast: true,
      icon: 'success',
      text: 'Item added to cart',
      position: 'bottom-end',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };

  const updateNotes = (id: string, notes: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, notes } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    console.log('Clearing cart completely...');
    
    // CRITICAL: Clear localStorage FIRST before updating state
    // This prevents the useEffect from re-saving old data
    localStorage.removeItem('cart');
    localStorage.removeItem('guest-cart');
    localStorage.removeItem('pos-cart');
    localStorage.removeItem('customer-cart');
    localStorage.removeItem('menu-cart');
    
    // Clear ALL cart-related keys (case-insensitive search)
    Object.keys(localStorage).forEach(key => {
      if (key.toLowerCase().includes('cart')) {
        localStorage.removeItem(key);
        console.log('Removed cart key:', key);
      }
    });
    
    // Now set state to empty array (this will trigger useEffect which will save [] to localStorage)
    setItems([]);
    
    // Force a re-render by dispatching the cart update event
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    
    // Double-check: ensure localStorage is truly empty after state update
    setTimeout(() => {
      const remainingCart = localStorage.getItem('cart');
      if (remainingCart && remainingCart !== '[]') {
        console.warn('⚠️ Cart data still exists in localStorage after clear, removing again...');
        localStorage.removeItem('cart');
        window.dispatchEvent(new CustomEvent('cartUpdated'));
      }
    }, 100);
  };

  const total = items.reduce((sum, item) => {
    const price = item.customPrice ?? item.price;
    return sum + (price * item.quantity);
  }, 0);
  
  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  const openCartModal = () => setIsCartModalOpen(true);
  const closeCartModal = () => setIsCartModalOpen(false);

  // Debug function to completely reset cart state
  const resetCartState = () => {
    console.log('Resetting cart state completely...');
    setItems([]);
    // Clear all localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.toLowerCase().includes('cart')) {
        localStorage.removeItem(key);
      }
    });
    // Force re-render
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const value = {
    items,
    addToCart,
    updateQuantity,
    updateNotes,
    removeItem,
    clearCart,
    resetCartState,
    total,
    getItemCount,
    isCartModalOpen,
    openCartModal,
    closeCartModal
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

// Custom hook to use cart context
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
