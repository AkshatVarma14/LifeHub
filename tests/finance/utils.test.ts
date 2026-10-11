import test from 'node:test';
import assert from 'node:assert';
import { generateUUID } from '../../src/utils/id.ts';
import {
  parseCategoryLimitsSafely,
  serializeCategoryLimits,
} from '../../src/features/finance/utils/categoryLimits.ts';

test('ID Utilities: generateUUID generates valid RFC4122 v4 strings', () => {
  const uuid1 = generateUUID();
  const uuid2 = generateUUID();

  assert.strictEqual(typeof uuid1, 'string');
  assert.strictEqual(typeof uuid2, 'string');
  assert.notStrictEqual(uuid1, uuid2);

  // RFC4122 v4 regex
  const v4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.match(uuid1, v4Regex, 'Must be valid RFC4122 v4 UUID');
  assert.match(uuid2, v4Regex, 'Must be valid RFC4122 v4 UUID');
});

test('Category Limits Utilities: serializeCategoryLimits and valid parsing', () => {
  // Empty or null
  assert.strictEqual(serializeCategoryLimits(null), null);
  assert.strictEqual(serializeCategoryLimits(undefined), null);
  assert.strictEqual(serializeCategoryLimits({}), null);

  // Valid partial record
  const limits = {
    Housing: 2500000, // ₹25,000
    'Food & Dining': 1200000, // ₹12,000
  };

  const serialized = serializeCategoryLimits(limits);
  assert.strictEqual(typeof serialized, 'string');

  const parsed = parseCategoryLimitsSafely(serialized);
  assert.strictEqual(parsed.isCorrupt, false);
  assert.strictEqual(parsed.corruptKeys.length, 0);
  assert.strictEqual(parsed.limits['Housing'], 2500000);
  assert.strictEqual(parsed.limits['Food & Dining'], 1200000);
  assert.strictEqual(parsed.limits['Transportation'], undefined); // Optional per category!
});

test('Category Limits Utilities: Corrupt JSON detection preserves rawJson without crashing', () => {
  // Malformed JSON syntax
  const badSyntax = '{"Housing": 1000';
  const resBadSyntax = parseCategoryLimitsSafely(badSyntax);
  assert.strictEqual(resBadSyntax.isCorrupt, true);
  assert.strictEqual(resBadSyntax.rawJson, badSyntax);
  assert.deepStrictEqual(resBadSyntax.limits, {});

  // Not an object (e.g. JSON array or number)
  const badArray = '[1, 2, 3]';
  const resBadArray = parseCategoryLimitsSafely(badArray);
  assert.strictEqual(resBadArray.isCorrupt, true);
  assert.strictEqual(resBadArray.rawJson, badArray);

  // Corrupt entries (negative paise, float paise, unknown categories)
  const corruptEntriesJson = JSON.stringify({
    Housing: 100000,
    InvalidCategory: 50000,
    'Food & Dining': -100,
    Transportation: 12.5,
  });

  const resCorrupt = parseCategoryLimitsSafely(corruptEntriesJson);
  assert.strictEqual(resCorrupt.isCorrupt, true);
  assert.strictEqual(resCorrupt.rawJson, corruptEntriesJson);
  // Valid entry is preserved in limits
  assert.strictEqual(resCorrupt.limits['Housing'], 100000);
  // Corrupt keys are recorded
  assert.ok(resCorrupt.corruptKeys.includes('InvalidCategory'));
  assert.ok(resCorrupt.corruptKeys.includes('Food & Dining'));
  assert.ok(resCorrupt.corruptKeys.includes('Transportation'));
});
