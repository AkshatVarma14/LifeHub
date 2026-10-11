import test from 'node:test';
import assert from 'node:assert';
import {
  parseRupeesToPaise,
  tryParseRupeesToPaise,
  formatPaiseToINR,
  paiseToRupeesString,
  MAX_SAFE_PAISE,
} from '../../src/utils/currency.ts';

test('Currency Utilities: tryParseRupeesToPaise valid rupee inputs', () => {
  // Whole numbers
  assert.strictEqual(tryParseRupeesToPaise('100').paise, 10000);
  assert.strictEqual(tryParseRupeesToPaise('0').paise, 0);
  assert.strictEqual(tryParseRupeesToPaise(500).paise, 50000);

  // Decimal numbers
  assert.strictEqual(tryParseRupeesToPaise('150.50').paise, 15050);
  assert.strictEqual(tryParseRupeesToPaise('150.5').paise, 15050);
  assert.strictEqual(tryParseRupeesToPaise('0.25').paise, 25);
  assert.strictEqual(tryParseRupeesToPaise('0.05').paise, 5);

  // Symbols, prefixes, and commas
  assert.strictEqual(tryParseRupeesToPaise('₹1,50,000.50').paise, 15000050);
  assert.strictEqual(tryParseRupeesToPaise('INR 2,500').paise, 250000);
  assert.strictEqual(tryParseRupeesToPaise('Rs. 1,000.00').paise, 100000);
  // Leading zeros
  assert.strictEqual(tryParseRupeesToPaise('05').paise, 500);
  assert.strictEqual(tryParseRupeesToPaise('00').paise, 0);
  assert.strictEqual(tryParseRupeesToPaise('0.50').paise, 50);
  assert.strictEqual(tryParseRupeesToPaise('007.25').paise, 725);
});

test('Currency Utilities: tryParseRupeesToPaise invalid inputs and rejections', () => {
  // Negative amounts by default
  assert.strictEqual(tryParseRupeesToPaise('-100').success, false);

  // Negative amounts allowed with option
  const negResult = tryParseRupeesToPaise('-150.50', { allowNegative: true });
  assert.strictEqual(negResult.success, true);
  assert.strictEqual(negResult.paise, -15050);

  // More than two decimal places (must be rejected, not rounded silently)
  assert.strictEqual(tryParseRupeesToPaise('10.125').success, false);
  assert.strictEqual(tryParseRupeesToPaise('0.001').success, false);

  // Malformed decimals
  assert.strictEqual(tryParseRupeesToPaise('.50').success, false); // Missing whole part
  assert.strictEqual(tryParseRupeesToPaise('150.').success, false); // Trailing dot without digits
  assert.strictEqual(tryParseRupeesToPaise('10.5.5').success, false); // Multiple dots
  assert.strictEqual(tryParseRupeesToPaise('10..0').success, false);

  // Floating-point number inputs
  assert.strictEqual(tryParseRupeesToPaise(150.5).paise, 15050);
  assert.strictEqual(tryParseRupeesToPaise(150.50).paise, 15050);
  assert.strictEqual(tryParseRupeesToPaise(10.125).success, false); // Number with 3 decimal places rejected
  assert.strictEqual(tryParseRupeesToPaise(NaN).success, false);
  assert.strictEqual(tryParseRupeesToPaise(Infinity).success, false);
  assert.strictEqual(tryParseRupeesToPaise(-Infinity).success, false);

  // Non-numeric characters
  assert.strictEqual(tryParseRupeesToPaise('abc').success, false);
  assert.strictEqual(tryParseRupeesToPaise('100xyz').success, false);
  assert.strictEqual(tryParseRupeesToPaise('').success, false);
  assert.strictEqual(tryParseRupeesToPaise('   ').success, false);

  // Unsafe numbers and boundary check: exceeds max safe paise
  const overMax = (MAX_SAFE_PAISE + 1000).toString();
  assert.strictEqual(tryParseRupeesToPaise(overMax).success, false);
  assert.strictEqual(tryParseRupeesToPaise('9007199254740992').success, false); // > MAX_SAFE_PAISE
});

test('Currency Utilities: parseRupeesToPaise throws on invalid input', () => {
  assert.strictEqual(parseRupeesToPaise('150.50'), 15050);
  assert.throws(() => parseRupeesToPaise('invalid'), /Invalid numeric format/i);
  assert.throws(() => parseRupeesToPaise('10.999'), /more than 2 decimal places/i);
});

test('Currency Utilities: paiseToRupeesString conversion', () => {
  assert.strictEqual(paiseToRupeesString(15050), '150.50');
  assert.strictEqual(paiseToRupeesString(10000), '100.00');
  assert.strictEqual(paiseToRupeesString(5), '0.05');
  assert.strictEqual(paiseToRupeesString(0), '0.00');
  assert.strictEqual(paiseToRupeesString(-2500), '-25.00');
});

test('Currency Utilities: formatPaiseToINR Indian numbering formatting', () => {
  // Small amounts
  assert.strictEqual(formatPaiseToINR(0), '₹0.00');
  assert.strictEqual(formatPaiseToINR(50), '₹0.50');
  assert.strictEqual(formatPaiseToINR(10000), '₹100.00');

  // Hundreds and Thousands
  assert.strictEqual(formatPaiseToINR(150000), '₹1,500.00');
  assert.strictEqual(formatPaiseToINR(2500050), '₹25,000.50');

  // Lakhs and Crores (Indian grouping: 2, 2, 3)
  assert.strictEqual(formatPaiseToINR(15000000), '₹1,50,000.00');
  assert.strictEqual(formatPaiseToINR(1000000000), '₹1,00,00,000.00');

  // Negative formatting
  assert.strictEqual(formatPaiseToINR(-250000), '-₹2,500.00');
  assert.strictEqual(formatPaiseToINR(-15000050), '-₹1,50,000.50');

  // showPaise option
  assert.strictEqual(formatPaiseToINR(150000, { showPaise: false }), '₹1,500');
});
