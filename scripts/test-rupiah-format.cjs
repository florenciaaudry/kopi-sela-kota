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

// Invalid text must not become a different valid payment through the UI.
for (const raw of ["-330.000", "12.34", "1e3", "330.000,50", "abc330"] ) {
  const normalized = normalizeCurrencyText(raw);
  assert.equal(normalized.numericValue, raw);
  assert.throws(() => parseRupiahInput(normalized.numericValue));
}
console.log("PASS: Rupiah parsing and UI normalization preserve invalid amounts for rejection");
