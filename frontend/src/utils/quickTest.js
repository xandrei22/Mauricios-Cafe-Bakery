// Quick test to see obfuscated URLs
// Run this in browser console to test

// Simulate the obfuscation functions
const CUSTOM_SALT = "coffee_shop_2024_secure";
const ROTATION_OFFSET = 13;
const XOR_KEY = 0x5A;

function applyCaesarCipher(str, offset) {
    return str.split('').map(char => {
        const code = char.charCodeAt(0);
        if (code >= 32 && code <= 126) {
            return String.fromCharCode(((code - 32 + offset + 95) % 95) + 32);
        }
        return char;
    }).join('');
}

function applyXOR(str, key) {
    return str.split('').map(char => String.fromCharCode(char.charCodeAt(0) ^ key)).join('');
}

function encodeId(rawId) {
    try {
        const timestamp = Date.now().toString(36);
        const salted = `${CUSTOM_SALT}:${rawId}:${timestamp}`;
        const rotated = applyCaesarCipher(salted, ROTATION_OFFSET);
        const xored = applyXOR(rotated, XOR_KEY);
        const base64 = btoa(xored);
        return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    } catch (error) {
        return rawId;
    }
}

// Test with table ID "1"
const tableId = "1";
const obfuscated = encodeId(tableId);
const url = `http://localhost:5173/?table=${obfuscated}`;

console.log('=== Quick Test Results ===');
console.log(`Original: http://localhost:5173/?table=1`);
console.log(`Obfuscated: ${url}`);
console.log(`Obfuscated ID: ${obfuscated}`);





















