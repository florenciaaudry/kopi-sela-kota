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
  reconcilePosHoldState,
  reconcilePosHoldJournalLines,
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

const reconciled = reconcilePosHoldState({
  holds: [{ number: 'HOLD/00001', session_number: 'POS/00003', status: 'Expired' }],
  holdLines: [{ hold_number: 'HOLD/00001', sku: 'CKB-PCS', quantity: 4, subtotal: 32000, tax_amount: 3200 }],
  receipts: [{
    number: 'POSR00002',
    session_number: 'POS/00003',
    sku: 'CKB-PCS',
    quantity: 4,
    total: 35200,
    payment_method: 'MIXED',
    idempotency_key: 'hold-complete:HOLD/00001:20000:15200:req-123',
    hold_number: null,
  }],
  receiptLines: [],
  tenders: [],
  sessions: [{ number: 'POS/00003', opening_cash: 200000, expected_cash: 200000 }],
});
assert.equal(reconciled.holds[0].status, 'Completed');
assert.equal(reconciled.receipts[0].hold_number, 'HOLD/00001');
assert.deepEqual(reconciled.tenders, [
  { receipt_number: 'POSR00002', payment_method: 'CASH', amount: 20000 },
  { receipt_number: 'POSR00002', payment_method: 'BANK', amount: 15200 },
]);
assert.equal(reconciled.sessions[0].expected_cash, 220000);

const reconciledLines = reconcilePosHoldJournalLines(
  [{ id: 'j1', source_type: 'pos_sale', source_reference: 'POSR00002', idempotency_key: 'pos-sale:hold-complete:HOLD/00001:20000:15200:req-123' }],
  [
    { journal_entry_id: 'j1', account_code: '1101', debit: 35200, credit: 0 },
    { journal_entry_id: 'j1', account_code: '4101', debit: 0, credit: 32000 },
    { journal_entry_id: 'j1', account_code: '2102', debit: 0, credit: 3200 },
  ],
);
assert.equal(reconciledLines.length, 4);
assert.deepEqual(reconciledLines.slice(0, 2), [
  { journal_entry_id: 'j1', account_code: '1101', debit: 20000, credit: 0 },
  { journal_entry_id: 'j1', account_code: '1102', debit: 15200, credit: 0 },
]);

// 3. Ensure SQL migration does not shadow `tender record` with `as tender(...)`
const posSql = fs.readFileSync('supabase/migrations/202611050003_pos_workflows.sql', 'utf8');
assert.doesNotMatch(posSql, /\btender\s+record;/);
assert.match(posSql, /\btender_row\s+record;/);

console.log('PASS: multi-product cart, POS hold tender validation (Cash/Bank/Mixed), hold completion reconciliation, and PL/pgSQL tender record fix');
