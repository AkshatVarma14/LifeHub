import test from 'node:test';
import assert from 'node:assert';
import { generateUUID } from '../../src/utils/id.ts';
import { setupCryptoPolyfill } from '../../src/utils/cryptoPolyfill.ts';

test('UUID Utility: Generates valid RFC4122 v4 format', () => {
  const uuid = generateUUID();
  assert.strictEqual(typeof uuid, 'string');
  assert.strictEqual(uuid.length, 36);

  // RFC4122 v4 pattern: 8-4-4-4-12 hex digits with version 4 and variant 8/9/a/b
  const rfc4122v4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.match(uuid, rfc4122v4Pattern);
});

test('UUID Utility: Generates unique values with zero collisions across 1,000 calls', () => {
  const set = new Set<string>();
  const total = 1000;
  for (let i = 0; i < total; i++) {
    const id = generateUUID();
    assert.strictEqual(set.has(id), false, `Collision detected on iteration ${i} for id ${id}`);
    set.add(id);
  }
  assert.strictEqual(set.size, total);
});

test('UUID Utility: Crypto polyfill initializes globalThis.crypto methods', () => {
  setupCryptoPolyfill();
  assert.strictEqual(typeof globalThis.crypto, 'object');
  assert.strictEqual(typeof globalThis.crypto.randomUUID, 'function');
  assert.strictEqual(typeof globalThis.crypto.getRandomValues, 'function');

  // Verify globalThis.crypto.randomUUID works directly
  const globalId = globalThis.crypto.randomUUID();
  assert.strictEqual(typeof globalId, 'string');
  assert.strictEqual(globalId.length, 36);

  // Verify globalThis.crypto.getRandomValues fills buffer
  const buf = new Uint8Array(16);
  globalThis.crypto.getRandomValues(buf);
  const hasNonZero = Array.from(buf).some((b) => b !== 0);
  assert.strictEqual(hasNonZero, true);
});
