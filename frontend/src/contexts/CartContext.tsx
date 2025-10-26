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
        const parsedCart = JSON.parse(savedCart);
        // Validate that the cart is an array and has valid items
        if (Array.isArray(parsedCart) && parsedCart.every(item => 
          item && typeof item.id === 'string' && typeof item.quantity === 'number'
        )) {
          return parsedCart;
        } else {
          console.warn('Invalid cart data found in localStorage, clearing...');
          localStorage.removeItem('cart');
          return [];
        }
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
      localStorage.setItem('cart', JSON.stringify(items));
      
      // Dispatch custom event to notify other components (like navbar) that cart has changed
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [items]);

  const addToCart = (item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        );
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
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
    setItems([]);
    // Clear all possible cart-related localStorage keys
    localStorage.removeItem('cart');
    localStorage.removeItem('guest-cart');
    localStorage.removeItem('pos-cart');
    localStorage.removeItem('customer-cart');
    localStorage.removeItem('menu-cart');
    // Force a re-render by dispatching the cart update event
    window.dispatchEvent(new CustomEvent('cartUpdated'));
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
