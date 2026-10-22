/**
 * Cross-platform RFC4122 v4 UUID generator for LifeHub.
 * Uses globalThis.crypto and expo-crypto for CSPRNG randomness.
 * Strictly throws if no cryptographically secure source is available (never relies on Math.random).
 */

export function generateUUID(): string {
  // 1. Standard Web Crypto API (Node 20+, modern Web, or polyfilled Hermes)
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  // 2. Try expo-crypto if available in environment
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require('expo-crypto');
    if (typeof Crypto.randomUUID === 'function') {
      return Crypto.randomUUID();
    }
  } catch {
    // Continue to getRandomValues fallback
  }

  // 3. Fallback: global crypto.getRandomValues or expo-crypto.getRandomValues
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return formatUUIDBytes(bytes);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require('expo-crypto');
    if (typeof Crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      Crypto.getRandomValues(bytes);
      return formatUUIDBytes(bytes);
    }
  } catch {
    // not available
  }

  throw new Error(
    'No cryptographically secure random source available (crypto.randomUUID or crypto.getRandomValues is required)'
  );
}

function formatUUIDBytes(bytes: Uint8Array): string {
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}
