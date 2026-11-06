/* eslint-disable @typescript-eslint/no-require-imports -- Receipt integrity regression checks. */
const fs=require("node:fs"),assert=require("node:assert/strict"),ts=require("typescript"),Module=require("node:module");
const m=new Module("receipt-integrity");m._compile(ts.transpileModule(fs.readFileSync("src/lib/receipt-integrity.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,"receipt.cjs");
const valid=m.exports.receiptReconciles;
const head={quantity:2,subtotal:12000,tax_amount:1200,total:13200},lines=[{quantity:1,subtotal:6000,tax_amount:600},{quantity:1,subtotal:6000,tax_amount:600}],tenders=[{amount:6600},{amount:6600}];
assert.equal(valid(head,lines,tenders),true);assert.equal(valid(head,[],tenders),false);assert.equal(valid(head,lines,[]),false);assert.equal(valid(head,lines,[{amount:6600}]),false);assert.equal(valid({...head,total:13201},lines,tenders),false);assert.equal(valid({...head,quantity:3},lines,tenders),false);assert.equal(valid({...head,tax_amount:1201},lines,tenders),false);assert.equal(valid(head,[{quantity:2,subtotal:12001,tax_amount:1200}],tenders),false);
assert.equal(valid(head,lines,[{amount:-6600},{amount:19800}]),false);assert.equal(valid(head,[{quantity:-1,subtotal:6000,tax_amount:600},{quantity:3,subtotal:6000,tax_amount:600}],tenders),false);
console.log("PASS: complete mixed-tender receipt accepted; missing details, partial tender, quantity, tax and total mismatches blocked before printing.");
