/**
 * Cross-platform RFC4122 v4 UUID generator for LifeHub.
 * Uses globalThis.crypto.randomUUID() when available (Node 24, Hermes / modern React Native).
 * Uses globalThis.crypto.getRandomValues() as a secure CSPRNG fallback.
 * Strictly throws if no cryptographically secure source is available (never relies on Math.random).
 */

export function generateUUID(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  // RFC4122 v4 CSPRNG fallback using crypto.getRandomValues if present
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
      .join('')
      .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
  }

  throw new Error(
    'No cryptographically secure random source available (crypto.randomUUID or crypto.getRandomValues is required)'
  );
}
