// URL Generator for creating obfuscated table URLs
import { encodeId } from './idObfuscator';

/**
 * Generates an obfuscated URL for a table
 * @param tableId - The table ID to obfuscate
 * @param baseUrl - The base URL (defaults to current origin)
 * @returns Obfuscated URL with encoded table parameter
 */
export function generateTableUrl(tableId: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  const obfuscatedTableId = encodeId(tableId);
  return `${base}/?table=${obfuscatedTableId}`;
}

/**
 * Generates multiple table URLs for QR code generation
 * @param tableIds - Array of table IDs
 * @param baseUrl - The base URL (defaults to current origin)
 * @returns Array of objects with table ID and obfuscated URL
 */
export function generateTableUrls(tableIds: string[], baseUrl?: string): Array<{ tableId: string; url: string }> {
  return tableIds.map(tableId => ({
    tableId,
    url: generateTableUrl(tableId, baseUrl)
  }));
}

/**
 * Example usage for generating QR codes
 */
export function generateQRCodeData(tableId: string): string {
  return generateTableUrl(tableId);
}

// Example: Generate URLs for tables 1-10
export function generateSampleTableUrls(): Array<{ tableId: string; url: string }> {
  const tableIds = Array.from({ length: 10 }, (_, i) => (i + 1).toString());
  return generateTableUrls(tableIds);
}














