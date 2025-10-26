// Cart Debug Utilities
// Run these functions in the browser console to debug cart issues

export const cartDebug = {
    // Check current cart state
    checkCartState: () => {
        console.log('=== Cart State Debug ===');
        console.log('localStorage cart:', localStorage.getItem('cart'));
        console.log('All localStorage keys:', Object.keys(localStorage));
        console.log('Cart-related keys:', Object.keys(localStorage).filter(key =>
            key.toLowerCase().includes('cart')
        ));
    },

    // Clear all cart data
    clearAllCartData: () => {
        console.log('Clearing all cart data...');
        Object.keys(localStorage).forEach(key => {
            if (key.toLowerCase().includes('cart')) {
                localStorage.removeItem(key);
                console.log('Removed:', key);
            }
        });
        console.log('All cart data cleared');
    },

    // Force cart reset
    forceCartReset: () => {
        console.log('Forcing cart reset...');
        // Clear localStorage
        cartDebug.clearAllCartData();
        // Dispatch reset event
        window.dispatchEvent(new CustomEvent('cartUpdated'));
        // Reload page to reset state
        window.location.reload();
    },

    // Monitor cart changes
    monitorCartChanges: () => {
        console.log('Monitoring cart changes...');
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            if (key.toLowerCase().includes('cart')) {
                console.log('Cart data changed:', key, value);
            }
            return originalSetItem.apply(this, arguments);
        };
    }
};

// Make available globally for console access
if (typeof window !== 'undefined') {
    window.cartDebug = cartDebug;
}


