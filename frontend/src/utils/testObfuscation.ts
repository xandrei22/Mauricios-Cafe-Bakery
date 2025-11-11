// Test file to demonstrate the ID obfuscation
import { encodeId, decodeId, generateTestId, isValidEncodedId } from './idObfuscator';

// Test with sample table IDs
const testTableIds = ['1', '2', '3', '10', '25', '100'];

console.log('=== ID Obfuscation Test ===\n');

testTableIds.forEach(tableId => {
  const encoded = encodeId(tableId);
  const decoded = decodeId(encoded);
  const isValid = isValidEncodedId(encoded);
  
  console.log(`Table ID: ${tableId}`);
  console.log(`Encoded:  ${encoded}`);
  console.log(`Decoded:  ${decoded}`);
  console.log(`Valid:    ${isValid}`);
  console.log(`Match:    ${tableId === decoded ? '✅' : '❌'}`);
  console.log('---');
});

console.log('\n=== Random Test IDs ===\n');

// Generate some random test IDs
for (let i = 0; i < 3; i++) {
  const testId = generateTestId('table');
  console.log(`Original:  ${testId.original}`);
  console.log(`Obfuscated: ${testId.obfuscated}`);
  console.log('---');
}

// Example usage for URL generation
const exampleTableId = '5';
const obfuscatedTableId = encodeId(exampleTableId);
const exampleUrl = `http://localhost:5173/?table=${obfuscatedTableId}`;

console.log('\n=== URL Example ===');
console.log(`Original URL: http://localhost:5173/?table=${exampleTableId}`);
console.log(`Obfuscated URL: ${exampleUrl}`);
console.log(`Decoded from URL: ${decodeId(obfuscatedTableId)}`);



































