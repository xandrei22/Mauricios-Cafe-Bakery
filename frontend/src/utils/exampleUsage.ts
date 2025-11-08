// Example usage of the custom ID obfuscation system
import { encodeId, decodeId, generateTableUrl } from './idObfuscator';

// Example 1: Basic encoding/decoding
console.log('=== Basic Example ===');
const tableId = '5';
const obfuscatedId = encodeId(tableId);
const decodedId = decodeId(obfuscatedId);

console.log(`Original Table ID: ${tableId}`);
console.log(`Obfuscated ID: ${obfuscatedId}`);
console.log(`Decoded ID: ${decodedId}`);
console.log(`Match: ${tableId === decodedId ? '✅' : '❌'}`);

// Example 2: Generate QR code URLs
console.log('\n=== QR Code URL Generation ===');
const tableUrls = [
  generateTableUrl('1'),
  generateTableUrl('2'),
  generateTableUrl('3'),
  generateTableUrl('10'),
  generateTableUrl('25')
];

tableUrls.forEach((url, index) => {
  console.log(`Table ${index + 1} QR URL: ${url}`);
});

// Example 3: Decode from URL parameters
console.log('\n=== URL Parameter Decoding ===');
const sampleUrls = [
  'http://localhost:5173/?table=abc123',
  'http://localhost:5173/?table=xyz789',
  'http://localhost:5173/?table=invalid'
];

sampleUrls.forEach(url => {
  const urlObj = new URL(url);
  const obfuscatedTable = urlObj.searchParams.get('table');
  const decodedTable = decodeId(obfuscatedTable);
  
  console.log(`URL: ${url}`);
  console.log(`Obfuscated: ${obfuscatedTable}`);
  console.log(`Decoded: ${decodedTable || 'Invalid'}`);
  console.log('---');
});

// Example 4: Security comparison
console.log('\n=== Security Comparison ===');
const originalUrl = 'http://localhost:5173/?table=5';
const obfuscatedUrl = generateTableUrl('5');

console.log(`Original URL (exposed): ${originalUrl}`);
console.log(`Obfuscated URL (hidden): ${obfuscatedUrl}`);
console.log('The obfuscated URL hides the actual table number from casual users.');































