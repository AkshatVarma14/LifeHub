/**
 * Crypto Polyfill for LifeHub.
 * Stage 2: Fix Secure Randomness for Hermes / Android runtime.
 * Ensures globalThis.crypto.randomUUID() and globalThis.crypto.getRandomValues()
 * are securely backed by expo-crypto on Android and iOS.
 */
export function setupCryptoPolyfill(): void {
  if (typeof globalThis !== 'undefined') {
    if (!globalThis.crypto) {
      (globalThis as any).crypto = {};
    }

    if (
      typeof globalThis.crypto.randomUUID !== 'function' ||
      typeof globalThis.crypto.getRandomValues !== 'function'
    ) {
      try {
        // Dynamically load expo-crypto in React Native / Expo runtimes
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Crypto = require('expo-crypto');
        if (typeof globalThis.crypto.randomUUID !== 'function' && typeof Crypto.randomUUID === 'function') {
          globalThis.crypto.randomUUID = () => Crypto.randomUUID();
        }
        if (typeof globalThis.crypto.getRandomValues !== 'function' && typeof Crypto.getRandomValues === 'function') {
          globalThis.crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
            if (array) {
              return Crypto.getRandomValues(array as any) as T;
            }
            return array;
          };
        }
      } catch {
        // In environments where expo-crypto is absent (e.g. standard Node), retain native crypto
      }
    }
  }
}

setupCryptoPolyfill();
