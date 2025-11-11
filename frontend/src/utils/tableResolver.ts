import { getApiUrl } from './apiConfig';

// Cache for resolved table numbers to avoid repeated API calls
const tableCache: { [key: string]: number | null } = {};

/**
 * Resolves an obfuscated table ID to the real table number
 * @param obfuscatedId - The obfuscated table ID from the URL
 * @returns Promise<number | null> - The real table number, or null if invalid
 */
export async function resolveTableId(obfuscatedId: string): Promise<number | null> {
  // Check cache first
  if (tableCache[obfuscatedId] !== undefined) {
    return tableCache[obfuscatedId];
  }

  // If it's already a number (1-6), return it directly
  const numericId = parseInt(obfuscatedId);
  if (!isNaN(numericId) && numericId >= 1 && numericId <= 6) {
    tableCache[obfuscatedId] = numericId;
    return numericId;
  }

  // Otherwise, try to resolve it from the backend
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/table/resolve-table/${encodeURIComponent(obfuscatedId)}`);
    const data = await response.json();
    
    if (data.success && data.tableNumber) {
      tableCache[obfuscatedId] = data.tableNumber;
      return data.tableNumber;
    } else {
      tableCache[obfuscatedId] = null;
      return null;
    }
  } catch (error) {
    console.error('Error resolving table ID:', error);
    tableCache[obfuscatedId] = null;
    return null;
  }
}

/**
 * Gets the table number from URL, resolving obfuscated IDs if necessary
 * @returns Promise<number | null> - The real table number, or null if not found
 */
export async function getTableNumberFromUrl(): Promise<number | null> {
  const urlParams = new URLSearchParams(window.location.search);
  const tableParam = urlParams.get('table');
  
  if (!tableParam) {
    return null;
  }

  return await resolveTableId(tableParam);
}





