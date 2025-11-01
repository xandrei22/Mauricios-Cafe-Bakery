const SALT: string = (import.meta as any).env?.VITE_ID_SALT || 'lakbay_default_salt';

export function encodeId(rawId: string): string {
  try {
    const combined = `${SALT}:${rawId}`;
    const bytes = typeof window !== 'undefined' ? new TextEncoder().encode(combined) : Buffer.from(combined, 'utf-8');
    const base64 = (typeof window === 'undefined' ? Buffer.from(bytes) : bytesToBase64(bytes)) as unknown as string;
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return rawId;
  }
}

export function decodeId(encoded: string | undefined): string | null {
  if (!encoded) return null;
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 0 ? '' : '==='.slice(0, 4 - (base64.length % 4));
    const b64 = base64 + pad;
    const bytes = typeof window === 'undefined' ? Buffer.from(b64, 'base64') : base64ToBytes(b64);
    const decoded = (typeof window === 'undefined' ? (bytes as Buffer).toString('utf-8') : new TextDecoder().decode(bytes as Uint8Array)) as string;
    const [salt, id] = decoded.split(':');
    if (salt !== SALT) return null;
    return id || null;
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}





