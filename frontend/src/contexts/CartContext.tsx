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
  // Track if cart was just cleared to prevent race conditions
  const clearTimestampRef = useRef<number>(0);
  // Flag to prevent reloading from localStorage after clear
  const isClearedRef = useRef<boolean>(false);
  
  const [items, setItems] = useState<CartItem[]>(() => {
    // Check if cart was recently cleared (within last 2 seconds)
    const lastClearTime = localStorage.getItem('cartLastCleared');
    if (lastClearTime) {
      const timeSinceClear = Date.now() - parseInt(lastClearTime);
      if (timeSinceClear < 2000) {
        console.log('🛑 Cart was recently cleared, starting with empty cart');
        isClearedRef.current = true;
        return [];
      }
    }
    
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
    // CRITICAL: If cart was just cleared, don't save anything yet
    // This prevents the useEffect from overwriting the cleared state
    if (isClearedRef.current && items.length === 0) {
      console.log('🛑 Cart was cleared, skipping save to prevent reload');
      // Reset the flag after a brief delay
      setTimeout(() => {
        isClearedRef.current = false;
      }, 1000);
      return;
    }
    
    try {
      // Always save current state to localStorage (even if empty array)
      // This ensures localStorage stays in sync with state
      const cartData = JSON.stringify(items);
      
      // CRITICAL: Only save if items array matches what we expect
      // If items is empty, ensure we save '[]' not any other value
      if (items.length === 0) {
        localStorage.setItem('cart', '[]');
      } else {
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
      // On error, ensure localStorage is at least set to empty array
      try {
        localStorage.setItem('cart', '[]');
      } catch (e) {
        console.error('Failed to set empty cart in localStorage:', e);
      }
    }
  }, [items]);

  const addToCart = (item: CartItem) => {
    setItems(prev => {
      // CRITICAL: Check if cart was recently cleared (within last 3 seconds)
      // This prevents race conditions where localStorage might still have old data
      const lastClearTime = localStorage.getItem('cartLastCleared');
      if (lastClearTime) {
        const timeSinceClear = Date.now() - parseInt(lastClearTime);
        if (timeSinceClear < 3000) {
          console.log('⚠️ Cart was recently cleared, ensuring localStorage is empty...');
          localStorage.setItem('cart', '[]');
          // If state is empty, start fresh
          if (prev.length === 0) {
            console.log('✅ Starting fresh cart after clear');
            return [{ ...item, quantity: item.quantity || 1 }];
          }
        }
      }
      
      // CRITICAL: Verify localStorage is in sync before adding
      // This prevents merging with stale localStorage data
      try {
        const storedCart = localStorage.getItem('cart');
        if (storedCart && storedCart !== '[]' && storedCart.trim() !== '[]') {
          const parsedStored = JSON.parse(storedCart);
          // If localStorage has different items than state, use state (state is source of truth)
          // But if state is empty and localStorage has items, that means we need to clear localStorage
          if (Array.isArray(parsedStored) && parsedStored.length > 0 && prev.length === 0) {
            console.warn('⚠️ State is empty but localStorage has items. Clearing localStorage...');
            localStorage.setItem('cart', '[]');
            // Continue with empty state and add new item
            return [{ ...item, quantity: item.quantity || 1 }];
          }
        }
      } catch (error) {
        console.error('Error checking localStorage in addToCart:', error);
        localStorage.setItem('cart', '[]');
      }
      
      // Ensure we're working with clean state (not accidentally merging with old localStorage data)
      const currentItems = Array.isArray(prev) ? prev : [];
      
      // Double-check: if state is empty, ensure localStorage is also empty
      if (currentItems.length === 0) {
        const storedCart = localStorage.getItem('cart');
        if (storedCart && storedCart !== '[]' && storedCart.trim() !== '[]') {
          console.warn('⚠️ State is empty but localStorage is not. Forcing localStorage to empty.');
          localStorage.setItem('cart', '[]');
          // Start fresh with just the new item
          return [{ ...item, quantity: item.quantity || 1 }];
        }
      }
      
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
    console.log('🧹 Clearing cart completely...');
    
    // Set flag to prevent reloading from localStorage
    isClearedRef.current = true;
    
    // Record clear timestamp to prevent race conditions
    clearTimestampRef.current = Date.now();
    
    // CRITICAL: Set timestamp in localStorage to mark cart as cleared
    localStorage.setItem('cartLastCleared', Date.now().toString());
    
    // CRITICAL: Set state to empty FIRST (synchronous, immediate update)
    // This ensures React re-renders immediately
    setItems([]);
    
    // Step 1: Clear ALL cart-related localStorage keys
    const cartKeys = ['cart', 'guest-cart', 'pos-cart', 'customer-cart', 'menu-cart'];
    cartKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log('Removed cart key:', key);
    });
    
    // Step 2: Clear ALL cart-related keys (case-insensitive search) as backup
    Object.keys(localStorage).forEach(key => {
      if (key.toLowerCase().includes('cart') && key !== 'cartLastCleared') {
        localStorage.removeItem(key);
        console.log('Removed additional cart key:', key);
      }
    });
    
    // Step 3: Explicitly set localStorage to empty array to prevent any race conditions
    localStorage.setItem('cart', '[]');
    
    // Step 4: Force a re-render by dispatching the cart update event immediately
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    
    // Step 5: Close the cart modal if it's open
    setIsCartModalOpen(false);
    
    // Step 6: Double-check and force clear after a brief delay to catch any race conditions
    setTimeout(() => {
      const remainingCart = localStorage.getItem('cart');
      if (remainingCart && remainingCart !== '[]' && remainingCart.trim() !== '[]') {
        console.warn('⚠️ Cart data still exists in localStorage after clear, force removing...');
        localStorage.setItem('cart', '[]');
        localStorage.setItem('cartLastCleared', Date.now().toString());
        setItems([]);
        window.dispatchEvent(new CustomEvent('cartUpdated'));
      } else {
        console.log('✅ Cart successfully cleared');
      }
    }, 50);
    
    // Step 7: Final verification after useEffect has run
    setTimeout(() => {
      const finalCheck = localStorage.getItem('cart');
      if (finalCheck && finalCheck !== '[]' && finalCheck.trim() !== '[]') {
        console.error('❌ Cart still not empty after all clear attempts:', finalCheck);
        localStorage.setItem('cart', '[]');
        localStorage.setItem('cartLastCleared', Date.now().toString());
        setItems([]);
        window.dispatchEvent(new CustomEvent('cartUpdated'));
      }
    }, 200);
    
    // Step 8: Remove the clear timestamp after 3 seconds (allows time for all components to sync)
    setTimeout(() => {
      localStorage.removeItem('cartLastCleared');
      isClearedRef.current = false;
      console.log('🔄 Clear timestamp removed, cart can now be loaded normally');
    }, 3000);
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
