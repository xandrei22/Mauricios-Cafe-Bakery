// Custom ID Obfuscation Utility
// This provides a different approach from the co-developer's implementation

const CUSTOM_SALT = "coffee_shop_2024_secure";
const ROTATION_OFFSET = 13; // Caesar cipher offset
const XOR_KEY = 0x5A; // XOR key for additional obfuscation

/**
 * Encodes a raw ID into an obfuscated string
 * @param rawId - The original ID to encode
 * @returns Obfuscated string safe for URLs
 */
export function encodeId(rawId: string): string {
  try {
    // Step 1: Add salt and timestamp for uniqueness
    const timestamp = Date.now().toString(36);
    const salted = `${CUSTOM_SALT}:${rawId}:${timestamp}`;
    
    // Step 2: Apply Caesar cipher rotation
    const rotated = applyCaesarCipher(salted, ROTATION_OFFSET);
    
    // Step 3: Apply XOR obfuscation
    const xored = applyXOR(rotated, XOR_KEY);
    
    // Step 4: Convert to base64 and make URL-safe
    const base64 = btoa(xored);
    return base64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  } catch (error) {
    console.error('Error encoding ID:', error);
    return rawId; // Fallback to original ID
  }
}

/**
 * Decodes an obfuscated string back to the original ID
 * @param encoded - The obfuscated string
 * @returns Original ID or null if invalid
 */
export function decodeId(encoded: string | undefined): string | null {
  if (!encoded) return null;
  
  try {
    // Step 1: Restore base64 format
    const base64 = encoded
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = base64 + "===".slice(0, (4 - base64.length % 4) % 4);
    
    // Step 2: Decode from base64
    const decoded = atob(padded);
    
    // Step 3: Reverse XOR obfuscation
    const unxored = applyXOR(decoded, XOR_KEY);
    
    // Step 4: Reverse Caesar cipher
    const unrotated = applyCaesarCipher(unxored, -ROTATION_OFFSET);
    
    // Step 5: Extract ID from salted string
    const parts = unrotated.split(":");
    if (parts.length !== 3 || parts[0] !== CUSTOM_SALT) {
      return null; // Invalid format or wrong salt
    }
    
    return parts[1]; // Return the original ID
  } catch (error) {
    console.error('Error decoding ID:', error);
    return null;
  }
}

/**
 * Applies Caesar cipher rotation to a string
 * @param str - String to rotate
 * @param offset - Rotation offset (positive for encode, negative for decode)
 * @returns Rotated string
 */
function applyCaesarCipher(str: string, offset: number): string {
  return str
    .split('')
    .map(char => {
      const code = char.charCodeAt(0);
      if (code >= 32 && code <= 126) { // Printable ASCII range
        return String.fromCharCode(((code - 32 + offset + 95) % 95) + 32);
      }
      return char;
    })
    .join('');
}

/**
 * Applies XOR obfuscation to a string
 * @param str - String to obfuscate
 * @param key - XOR key
 * @returns XORed string
 */
function applyXOR(str: string, key: number): string {
  return str
    .split('')
    .map(char => String.fromCharCode(char.charCodeAt(0) ^ key))
    .join('');
}

/**
 * Generates a random obfuscated ID for testing
 * @param prefix - Optional prefix for the ID
 * @returns Object with original and obfuscated ID
 */
export function generateTestId(prefix: string = "table"): { original: string; obfuscated: string } {
  const randomId = `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
  const obfuscated = encodeId(randomId);
  return { original: randomId, obfuscated };
}

/**
 * Validates if an obfuscated string can be decoded
 * @param encoded - The obfuscated string to validate
 * @returns True if valid, false otherwise
 */
export function isValidEncodedId(encoded: string): boolean {
  return decodeId(encoded) !== null;
}





















