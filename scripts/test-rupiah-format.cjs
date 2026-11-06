/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

const source = fs.readFileSync("src/lib/format.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = new Module("rupiah-format-validation");
loaded._compile(compiled, "rupiah-format-validation.cjs");

const {
  formatRupiah,
  formatRibuan,
  normalizeCurrencyText,
  parseRupiahInput,
  reconcileCp00004Invoices,
  reconcileCp00004Payments,
  reconcileCp00004JournalLines,
  reconcileCp00004DashboardTotals,
} = loaded.exports;

// 1. Mandatory QA nominal cases: 330.000, 33.000, and 1.500.000
assert.equal(parseRupiahInput("330.000"), 330000);
assert.equal(parseRupiahInput("33.000"), 33000);
assert.equal(parseRupiahInput("1.500.000"), 1500000);

// 2. UI input normalization & display for 330.000, 33.000, and 1.500.000
assert.deepEqual(normalizeCurrencyText("330.000"), {
  display: "330.000",
  numericValue: "330000",
});
assert.deepEqual(normalizeCurrencyText("33.000"), {
  display: "33.000",
  numericValue: "33000",
});
assert.deepEqual(normalizeCurrencyText("1.500.000"), {
  display: "1.500.000",
  numericValue: "1500000",
});

// 3. Plain integer and formatted variants
assert.equal(parseRupiahInput("330000"), 330000);
assert.equal(parseRupiahInput("33000"), 33000);
assert.equal(parseRupiahInput("1500000"), 1500000);
assert.equal(parseRupiahInput("329.670"), 329670);
assert.equal(parseRupiahInput("Rp 330.000"), 330000);
assert.equal(parseRupiahInput("Rp1.500.000,00"), 1500000);
assert.equal(parseRupiahInput("0", { allowZero: true }), 0);

// 4. Display formatting does not alter actual value
assert.equal(formatRibuan(330000), "330.000");
assert.equal(formatRibuan(33000), "33.000");
assert.equal(formatRibuan(1500000), "1.500.000");
assert.match(formatRupiah(330000), /330\.000/);
assert.match(formatRupiah(33000), /33\.000/);
assert.match(formatRupiah(1500000), /1\.500\.000/);

// 5. Reject malformed, ambiguous, negative, or zero (when allowZero=false) inputs
for (const invalid of ["", " ", "0", "-330.000", "330.00", "12.34", "abc"]) {
  assert.throws(() => parseRupiahInput(invalid));
}

// 6. Consistent reconciliation of CP00004 / INV00003 / JRN/20261106/00009 without altering other records
const reconciledInv = reconcileCp00004Invoices([
  { number: "INV00001", total: 33000, amount_paid: 33000 },
  { number: "INV00003", total: 330000, amount_paid: 330 },
  { number: "OPEN-AR-C02", total: 220000, amount_paid: 0 },
]);
assert.deepEqual(reconciledInv, [
  { number: "INV00001", total: 33000, amount_paid: 33000 },
  { number: "INV00003", total: 330000, amount_paid: 330000 },
  { number: "OPEN-AR-C02", total: 220000, amount_paid: 0 },
]);

const reconciledPay = reconcileCp00004Payments([
  { number: "CP00002", invoice_number: "INV00001", amount: 33000 },
  { number: "CP00004", invoice_number: "INV00003", amount: 330 },
]);
assert.deepEqual(reconciledPay, [
  { number: "CP00002", invoice_number: "INV00001", amount: 33000 },
  { number: "CP00004", invoice_number: "INV00003", amount: 330000 },
]);

const reconciledLines = reconcileCp00004JournalLines(
  [{ id: "jrn-9", source_type: "customer_payment", source_reference: "CP00004" }],
  [
    { journal_entry_id: "jrn-9", account_code: "1102", debit: 330, credit: 0 },
    { journal_entry_id: "jrn-9", account_code: "1201", debit: 0, credit: 330 },
  ],
);
assert.deepEqual(reconciledLines, [
  { journal_entry_id: "jrn-9", account_code: "1102", debit: 330000, credit: 0 },
  { journal_entry_id: "jrn-9", account_code: "1201", debit: 0, credit: 330000 },
]);

const reconciledTotals = reconcileCp00004DashboardTotals(
  { receivables: 549670, bank: 10018330 },
  true,
);
assert.deepEqual(reconciledTotals, { receivables: 220000, bank: 10348000 });

console.log(
  "PASS: Indonesian Rupiah nominal parsing, display, and CP00004/INV00003 reconciliation",
);

