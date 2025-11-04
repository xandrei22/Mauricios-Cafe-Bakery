// Live test of the obfuscation system
import { encodeId, decodeId, generateTableUrl } from './idObfuscator';

// Test the obfuscation system
console.log('=== Live Obfuscation Test ===\n');

// Test with table ID "1" (like in your screenshot)
const testTableId = '1';
const obfuscatedId = encodeId(testTableId);
const decodedId = decodeId(obfuscatedId);
const obfuscatedUrl = generateTableUrl(testTableId);

console.log(`Original Table ID: ${testTableId}`);
console.log(`Obfuscated ID: ${obfuscatedId}`);
console.log(`Decoded ID: ${decodedId}`);
console.log(`Match: ${testTableId === decodedId ? '✅' : '❌'}`);
console.log(`Obfuscated URL: ${obfuscatedUrl}`);

// Test with a few more table IDs
const testTableIds = ['2', '3', '5', '10'];
console.log('\n=== Multiple Table IDs Test ===');
testTableIds.forEach(tableId => {
  const encoded = encodeId(tableId);
  const decoded = decodeId(encoded);
  const url = generateTableUrl(tableId);
  
  console.log(`Table ${tableId}: ${encoded} -> ${decoded} (${decoded === tableId ? '✅' : '❌'})`);
  console.log(`  URL: ${url}`);
});

// Show the difference
console.log('\n=== Before vs After ===');
console.log(`Before: http://localhost:5173/?table=1`);
console.log(`After:  ${obfuscatedUrl}`);
console.log('\nThe table ID is now hidden from casual users!');























