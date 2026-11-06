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

const formatSource = fs.readFileSync('src/lib/format.ts', 'utf8');
const formatCompiled = ts.transpileModule(formatSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const formatModule = new Module('pos-hold-reconcile');
formatModule._compile(formatCompiled, 'pos-hold-reconcile.cjs');
const {
  parseHoldCompletionKey,
  validatePosHoldTenders,
} = formatModule.exports;

// 1. Validate Cash, Bank, and Mixed tenders for HOLD/00001 (Rp35.200)
assert.deepEqual(validatePosHoldTenders(35200, 0, 35200), {
  tenders: [{ payment_method: 'CASH', amount: 35200 }],
  paymentMethod: 'CASH',
  totalTender: 35200,
});
assert.deepEqual(validatePosHoldTenders(0, 35200, 35200), {
  tenders: [{ payment_method: 'BANK', amount: 35200 }],
  paymentMethod: 'BANK',
  totalTender: 35200,
});
assert.deepEqual(validatePosHoldTenders(20000, 15200, 35200), {
  tenders: [
    { payment_method: 'CASH', amount: 20000 },
    { payment_method: 'BANK', amount: 15200 },
  ],
  paymentMethod: 'MIXED',
  totalTender: 35200,
});
assert.throws(() => validatePosHoldTenders(0, 0, 35200), /harus lebih dari nol/);
assert.throws(() => validatePosHoldTenders(10000, 0, 35200), /harus sama dengan total struk/);

// 2. Reconcile HOLD/00001 state & split journal lines
const parsedKey = parseHoldCompletionKey('hold-complete:HOLD/00001:20000:15200:req-123');
assert.deepEqual(parsedKey, {
  holdNumber: 'HOLD/00001',
  cashAmount: 20000,
  bankAmount: 15200,
  requestKey: 'req-123',
});

// 3. Ensure SQL migration does not shadow `tender record` with `as tender(...)`
const posSql = fs.readFileSync('supabase/migrations/202611050003_pos_workflows.sql', 'utf8');
assert.doesNotMatch(posSql, /\btender\s+record;/);
assert.match(posSql, /\btender_row\s+record;/);

console.log('PASS: multi-product cart, POS hold tender validation (Cash/Bank/Mixed), and PL/pgSQL tender record fix');

const actionSource = fs.readFileSync('src/app/(erp)/module-actions.ts', 'utf8');
const completion = actionSource.split('export async function completePosHoldAction')[1].split('export async function closePosSessionAction')[0];
assert.match(completion, /client\.rpc\("complete_pos_hold"/);
assert.doesNotMatch(completion, /client\.rpc\("(?:cancel_pos_hold|create_pos_sale)"/);
const patch = fs.readFileSync('supabase/migrations/202611060008_fix_complete_pos_hold_tender_record.sql', 'utf8');
assert.doesNotMatch(patch, /24 hours|update public\.(?:pos_holds|inventory_reservations)\s+set expires_at/i);
const moduleSource = fs.readFileSync('src/app/(erp)/module-page.tsx', 'utf8');
assert.doesNotMatch(moduleSource, /reconcile(?:Cp00004|PosHold)\w*\(/);
console.log('PASS: hold completion stays atomic; no UI financial corrections or expiry extension');
