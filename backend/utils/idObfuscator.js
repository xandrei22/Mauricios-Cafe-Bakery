// Custom ID Obfuscation Utility for Backend (Node.js)
// This provides the same obfuscation as the frontend but for Node.js environment

const CUSTOM_SALT = "coffee_shop_2024_secure";
const ROTATION_OFFSET = 13; // Caesar cipher offset
const XOR_KEY = 0x5A; // XOR key for additional obfuscation

/**
 * Encodes a raw ID into an obfuscated string
 * @param {string} rawId - The original ID to encode
 * @returns {string} Obfuscated string safe for URLs
 */
function encodeId(rawId) {
    try {
        // Step 1: Add salt and timestamp for uniqueness
        const timestamp = Date.now().toString(36);
        const salted = `${CUSTOM_SALT}:${rawId}:${timestamp}`;

        // Step 2: Apply Caesar cipher rotation
        const rotated = applyCaesarCipher(salted, ROTATION_OFFSET);

        // Step 3: Apply XOR obfuscation
        const xored = applyXOR(rotated, XOR_KEY);

        // Step 4: Convert to base64 and make URL-safe
        const base64 = Buffer.from(xored, 'utf-8').toString('base64');
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
 * @param {string} encoded - The obfuscated string
 * @returns {string|null} Original ID or null if invalid
 */
function decodeId(encoded) {
    if (!encoded) return null;

    try {
        // Step 1: Restore base64 format
        const base64 = encoded
            .replace(/-/g, "+")
            .replace(/_/g, "/");
        const padded = base64 + "===".slice(0, (4 - base64.length % 4) % 4);

        // Step 2: Decode from base64
        const decoded = Buffer.from(padded, 'base64').toString('utf-8');

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
 * @param {string} str - String to rotate
 * @param {number} offset - Rotation offset (positive for encode, negative for decode)
 * @returns {string} Rotated string
 */
function applyCaesarCipher(str, offset) {
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
 * @param {string} str - String to obfuscate
 * @param {number} key - XOR key
 * @returns {string} XORed string
 */
function applyXOR(str, key) {
    return str
        .split('')
        .map(char => String.fromCharCode(char.charCodeAt(0) ^ key))
        .join('');
}

/**
 * Generates an obfuscated URL for a table
 * @param {string} tableId - The table ID to obfuscate
 * @param {string} baseUrl - The base URL (defaults to process.env.FRONTEND_URL)
 * @returns {string} Obfuscated URL with encoded table parameter
 */
function generateTableUrl(tableId, baseUrl = null) {
    const base = baseUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
    const obfuscatedTableId = encodeId(tableId);
    return `${base}/?table=${obfuscatedTableId}`;
}

module.exports = {
    encodeId,
    decodeId,
    generateTableUrl
};