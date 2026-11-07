/* eslint-disable @typescript-eslint/no-require-imports -- Domain links and role-boundary unit checks. */
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module');
const m=new Module('document-links');m._compile(ts.transpileModule(fs.readFileSync('src/lib/document-navigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'document-links.cjs');
const {documentHref,resolveDocumentLink,knownDocumentKind,canOpenDocument,sourceDocumentKind}=m.exports;
assert.equal(resolveDocumentLink('sales','S00008','owner'),'/documents/sales/S00008');
assert.equal(resolveDocumentLink('sales','S00008','cashier'),null);
assert.equal(resolveDocumentLink('customer','C04 · Klinik Harapan Ibu','sales'),'/documents/customer/C04');
assert.equal(resolveDocumentLink('customer','Pembeli umum','cashier'),null);
assert.equal(resolveDocumentLink('invoice','OPEN-AR-C02','finance'),'/documents/invoice/OPEN-AR-C02');
assert.equal(resolveDocumentLink('bill','OPEN-AP-V01','finance'),'/documents/bill/OPEN-AP-V01');
assert.equal(resolveDocumentLink('payment','VP00006','finance'),'/documents/vendor-payment/VP00006');
assert.equal(resolveDocumentLink('invoice','BILL00005','finance'),'/documents/bill/BILL00005');
assert.equal(resolveDocumentLink('invoice','INV00015','sales'),null);
assert.equal(documentHref('journal','JRN/OPEN/20261020'),'/documents/journal/JRN~OPEN~20261020');
assert.equal(documentHref('sales','S00008:internal-key'),'/documents/sales/S00008');
for(const kind of ['constructor','toString','__proto__','missing']){assert.equal(knownDocumentKind(kind),false);assert.equal(canOpenDocument(kind,'owner'),false);}
assert.equal(sourceDocumentKind('customer_invoice'),'invoice');assert.equal(sourceDocumentKind('pos_hold'),'hold');
console.log('PASS links: roles, customer labels, anonymous buyers, opening balances, customer/vendor payment distinction, slash references, no internal key leakage, invalid document types.');
