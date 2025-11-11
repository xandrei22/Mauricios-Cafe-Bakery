// Cart Clear Debug Utility
// Run this in browser console to debug cart clearing issues

export const cartClearDebug = {
  // Check current cart state
  checkState: () => {
    console.log('=== Cart Clear Debug ===');
    console.log('localStorage cart:', localStorage.getItem('cart'));
    console.log('cartLastCleared:', localStorage.getItem('cartLastCleared'));
    console.log('All localStorage keys:', Object.keys(localStorage));
    console.log('Cart-related keys:', Object.keys(localStorage).filter(key =>
      key.toLowerCase().includes('cart')
    ));
    
    // Check if cart was recently cleared
    const lastClearTime = localStorage.getItem('cartLastCleared');
    if (lastClearTime) {
      const timeSinceClear = Date.now() - parseInt(lastClearTime);
      console.log(`Time since clear: ${timeSinceClear}ms (${timeSinceClear < 5000 ? 'RECENTLY CLEARED' : 'NOT RECENTLY CLEARED'})`);
    } else {
      console.log('No clear timestamp found');
    }
  },

  // Force clear everything
  forceClear: () => {
    console.log('🧹 Force clearing all cart data...');
    
    // Set timestamp first
    localStorage.setItem('cartLastCleared', Date.now().toString());
    
    // Remove all cart keys
    Object.keys(localStorage).forEach(key => {
      if (key.toLowerCase().includes('cart') && key !== 'cartLastCleared') {
        localStorage.removeItem(key);
        console.log('Removed:', key);
      }
    });
    
    // Remove cart key specifically
    localStorage.removeItem('cart');
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    
    console.log('✅ Force clear complete');
    console.log('Reload page to see if cart stays empty');
  },

  // Monitor localStorage changes
  monitor: () => {
    console.log('🔍 Monitoring localStorage changes...');
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    
    localStorage.setItem = function(key: string, value: string) {
      if (key.toLowerCase().includes('cart')) {
        console.log(`📝 localStorage.setItem('${key}', ...)`);
        console.trace('Stack trace:');
      }
      return originalSetItem.apply(this, arguments);
    };
    
    localStorage.removeItem = function(key: string) {
      if (key.toLowerCase().includes('cart')) {
        console.log(`🗑️ localStorage.removeItem('${key}')`);
        console.trace('Stack trace:');
      }
      return originalRemoveItem.apply(this, arguments);
    };
    
    console.log('✅ Monitoring enabled. Check console for cart-related localStorage changes.');
  }
};

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).cartClearDebug = cartClearDebug;
}

