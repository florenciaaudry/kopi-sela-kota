/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const source = fs.readFileSync('src/lib/pos-cart.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = new Module('pos-cart-validation');
loaded._compile(compiled, 'pos-cart-validation.cjs');
const { parseCartLines } = loaded.exports;

assert.deepEqual(parseCartLines(['CBW-250', 'TEH-250', 'PAS-01'], ['2', '1', '3']), [
  { sku: 'CBW-250', quantity: 2 }, { sku: 'TEH-250', quantity: 1 }, { sku: 'PAS-01', quantity: 3 },
]);
assert.throws(() => parseCartLines([], []));
assert.throws(() => parseCartLines(['CBW-250'], []));
assert.throws(() => parseCartLines([''], ['1']));
assert.throws(() => parseCartLines(['CBW-250', ' CBW-250 '], ['1', '2']), /SKU sama/);
for (const quantity of ['', ' ', '0', '-1', '1.5', 'NaN', 'Infinity', '9007199254740992']) {
  assert.throws(() => parseCartLines(['CBW-250'], [quantity]), /bilangan bulat/);
}
assert.throws(() => parseCartLines(['CBW-250'], [new Blob(['1'])]));
console.log('PASS: multi-product cart and malformed/duplicate/non-integer form submissions');
