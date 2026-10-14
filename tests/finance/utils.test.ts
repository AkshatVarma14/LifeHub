import test from 'node:test';
import assert from 'node:assert';
import { generateUUID } from '../../src/utils/id.ts';
import {
  parseCategoryLimitsSafely,
  serializeCategoryLimits,
  updateCategoryLimit,
  removeCategoryLimit,
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

test('Category Limits Utilities: Configured zero limits (0 paise) serialization and parsing', () => {
  // Configured zero limit is valid and distinct from unset
  const zeroLimitMap = {
    Housing: 2500000,
    'Food & Dining': 0, // Configured ₹0 limit!
  };

  const serialized = serializeCategoryLimits(zeroLimitMap);
  assert.strictEqual(typeof serialized, 'string');
  assert.ok(serialized?.includes('"Food & Dining":0'));

  const parsed = parseCategoryLimitsSafely(serialized);
  assert.strictEqual(parsed.isCorrupt, false);
  assert.strictEqual(parsed.corruptKeys.length, 0);
  assert.strictEqual(parsed.limits['Housing'], 2500000);
  assert.strictEqual(parsed.limits['Food & Dining'], 0);
  assert.strictEqual(parsed.limits['Transportation'], undefined); // Unset remains undefined
});

test('Category Limits Utilities: updateCategoryLimit and removeCategoryLimit helpers', () => {
  const initial = {
    Housing: 2500000,
    Transportation: 500000,
  };

  // 1. Update existing limit
  const updated1 = updateCategoryLimit(initial, 'Housing', 3000000);
  assert.strictEqual(updated1.Housing, 3000000);
  assert.strictEqual(updated1.Transportation, 500000); // Preserves other limit!
  assert.strictEqual(initial.Housing, 2500000); // Immutability

  // 2. Add new limit
  const added = updateCategoryLimit(updated1, 'Food & Dining', 1200000);
  assert.strictEqual(added.Housing, 3000000);
  assert.strictEqual(added.Transportation, 500000);
  assert.strictEqual(added['Food & Dining'], 1200000);

  // 3. Set configured zero limit
  const zeroAdded = updateCategoryLimit(added, 'Healthcare', 0);
  assert.strictEqual(zeroAdded.Healthcare, 0);

  // 4. Remove a limit
  const removed = removeCategoryLimit(zeroAdded, 'Transportation');
  assert.strictEqual(removed.Transportation, undefined);
  assert.strictEqual(removed.Housing, 3000000);
  assert.strictEqual(removed['Food & Dining'], 1200000);
  assert.strictEqual(removed.Healthcare, 0);

  // 5. Remove remaining limits until empty
  const removedHousing = removeCategoryLimit(removed, 'Housing');
  const removedFood = removeCategoryLimit(removedHousing, 'Food & Dining');
  const finalEmpty = removeCategoryLimit(removedFood, 'Healthcare');
  assert.deepStrictEqual(finalEmpty, {});
  assert.strictEqual(serializeCategoryLimits(finalEmpty), null);
});

