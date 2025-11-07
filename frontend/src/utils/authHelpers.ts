/**
 * Authentication Helper Utilities
 * Handles mobile vs desktop authentication strategies
 */

/**
 * Detect if running on a mobile device (iOS or Android)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Detect if running on iOS specifically
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * Check if cookies are likely to work
 * Mobile devices (especially iOS) block cross-origin cookies
 */
export function cookiesLikelyWork(): boolean {
  // Cookies work on desktop browsers
  // Cookies DON'T work reliably on mobile devices (especially iOS Safari)
  return !isMobileDevice();
}

/**
 * Get authentication strategy preference
 * Returns 'token' for mobile, 'cookie' for desktop
 */
export function getAuthStrategy(): 'token' | 'cookie' | 'hybrid' {
  if (isMobileDevice()) {
    return 'token'; // Use JWT token as PRIMARY for mobile
  }
  return 'hybrid'; // Use both cookies and token for desktop
}

/**
 * Check if we should prioritize localStorage/token over cookies
 */
export function shouldUseTokenAuth(): boolean {
  // Always use token auth on mobile devices
  // Cookies are blocked on cross-origin requests for mobile
  return isMobileDevice();
}




