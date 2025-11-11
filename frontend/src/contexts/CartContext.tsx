import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  // Flag to prevent reloading from localStorage after clear
  const isClearedRef = useRef<boolean>(false);
  
  const [items, setItems] = useState<CartItem[]>(() => {
    // Check if cart was recently cleared (within last 5 seconds)
    const lastClearTime = localStorage.getItem('cartLastCleared');
    if (lastClearTime) {
      const timeSinceClear = Date.now() - parseInt(lastClearTime);
      if (timeSinceClear < 5000) {
        console.log('🛑 Cart was recently cleared, starting with empty cart');
        isClearedRef.current = true;
        // Ensure localStorage is also removed
        localStorage.removeItem('cart');
        return [];
      }
    }
    
    // Load cart from localStorage on initialization
    try {
      const savedCart = localStorage.getItem('cart');
      
      // If no cart key exists, return empty
      if (!savedCart) {
        console.log('No cart in localStorage, starting with empty cart');
        return [];
      }
      
      // If cart is empty array string, return empty
      if (savedCart === '[]' || savedCart.trim() === '[]') {
        console.log('Cart is empty in localStorage, starting with empty cart');
        // Remove the key since it's empty
        localStorage.removeItem('cart');
        return [];
      }
      
      const parsedCart = JSON.parse(savedCart);
      
      // Validate that the cart is an array
      if (!Array.isArray(parsedCart)) {
        console.warn('Invalid cart data: not an array, clearing...');
        localStorage.removeItem('cart');
        return [];
      }
      
      // If array is empty, return empty and remove key
      if (parsedCart.length === 0) {
        console.log('Cart array is empty, starting with empty cart');
        localStorage.removeItem('cart');
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
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      localStorage.removeItem('cart');
      return [];
    }
  });

  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    // CRITICAL: If cart was just cleared, don't save anything
    // This prevents the useEffect from restoring old data
    if (isClearedRef.current) {
      console.log('🛑 Cart was cleared, skipping save to prevent reload');
      return;
    }
    
    try {
      // Only save if we have items
      if (items.length === 0) {
        // If empty, remove the key completely (don't set to '[]')
        localStorage.removeItem('cart');
      } else {
        // Save cart data
        const cartData = JSON.stringify(items);
        localStorage.setItem('cart', cartData);
      }
      
      // Dispatch custom event to notify other components (like navbar) that cart has changed
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
      // Debug: log cart state changes in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🛒 Cart state saved to localStorage:', items.length, 'items');
      }
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
      // On error, remove the key
      try {
        localStorage.removeItem('cart');
      } catch (e) {
        console.error('Failed to remove cart from localStorage:', e);
      }
    }
  }, [items]);

  const addToCart = (item: CartItem) => {
    setItems(prev => {
      // CRITICAL: Check if cart was recently cleared (within last 5 seconds)
      const lastClearTime = localStorage.getItem('cartLastCleared');
      if (lastClearTime) {
        const timeSinceClear = Date.now() - parseInt(lastClearTime);
        if (timeSinceClear < 5000) {
          console.log('⚠️ Cart was recently cleared, ensuring localStorage is removed...');
          localStorage.removeItem('cart');
          // If state is empty, start fresh with just the new item
          if (prev.length === 0) {
            console.log('✅ Starting fresh cart after clear');
            return [{ ...item, quantity: item.quantity || 1 }];
          }
        }
      }
      
      // CRITICAL: If state is empty, ensure localStorage is also empty/removed
      // This prevents loading old data from localStorage
      if (prev.length === 0) {
        const storedCart = localStorage.getItem('cart');
        if (storedCart) {
          console.warn('⚠️ State is empty but localStorage has data. Removing localStorage...');
          localStorage.removeItem('cart');
          // Start fresh with just the new item
          return [{ ...item, quantity: item.quantity || 1 }];
        }
      }
      
      // Ensure we're working with clean state
      const currentItems = Array.isArray(prev) ? prev : [];
      
      // Find existing item or add new one
      const existing = currentItems.find(i => i.id === item.id);
      if (existing) {
        // CRITICAL: When adding an existing item, always add exactly 1
        // The item.quantity parameter should be ignored for existing items to prevent bugs
        // where stale quantity data from menu items causes incorrect calculations
        // Example: If user reduces quantity from 5 to 3, then clicks "Add to Cart" again,
        // we should add 1 to 3 = 4, NOT use item.quantity (which might be 5) = 8
        const currentQuantity = existing.quantity || 0;
        const quantityToAdd = 1; // Always add 1 when clicking "Add to Cart" button
        const newQuantity = currentQuantity + quantityToAdd;
        
        console.log(`🛒 Adding to existing item: current=${currentQuantity}, adding=${quantityToAdd}, new=${newQuantity}`);
        
        const updated = currentItems.map(i => 
          i.id === item.id ? { ...i, quantity: newQuantity } : i
        );
        return updated;
      }
      // New item - use the quantity from the item parameter or default to 1
      // For new items, item.quantity is the initial quantity to add
      const initialQuantity = (item.quantity && item.quantity > 0) ? item.quantity : 1;
      return [...currentItems, { ...item, quantity: initialQuantity }];
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
    console.log('🧹 Clearing cart completely...');
    
    // CRITICAL: Set timestamp FIRST (before anything else)
    // This prevents other components from reloading old data
    const clearTimestamp = Date.now().toString();
    localStorage.setItem('cartLastCleared', clearTimestamp);
    
    // CRITICAL: Set flag to prevent useEffect from saving
    isClearedRef.current = true;
    
    // CRITICAL: Remove localStorage COMPLETELY (not just set to '[]')
    // This is the key fix - completely remove the key, don't just set it to empty
    localStorage.removeItem('cart');
    
    // Clear ALL other cart-related localStorage keys
    const cartKeys = ['guest-cart', 'pos-cart', 'customer-cart', 'menu-cart'];
    cartKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log('Removed cart key:', key);
    });
    
    // Clear ALL cart-related keys (case-insensitive search) as backup
    Object.keys(localStorage).forEach(key => {
      if (key.toLowerCase().includes('cart') && key !== 'cartLastCleared') {
        localStorage.removeItem(key);
        console.log('Removed additional cart key:', key);
      }
    });
    
    // CRITICAL: Set state to empty (synchronous, immediate update)
    setItems([]);
    
    // Close the cart modal
    setIsCartModalOpen(false);
    
    // Dispatch event AFTER everything is cleared
    // Use setTimeout to ensure localStorage is cleared before event fires
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      console.log('✅ Cart state and localStorage cleared, event dispatched');
    }, 10);
    
    // Remove the clear timestamp after 5 seconds
    setTimeout(() => {
      localStorage.removeItem('cartLastCleared');
      isClearedRef.current = false;
      console.log('🔄 Clear timestamp removed');
    }, 5000);
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
