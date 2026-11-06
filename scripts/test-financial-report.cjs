/* eslint-disable @typescript-eslint/no-require-imports -- Financial reconciliation tests. */
const assert=require("node:assert/strict"),fs=require("node:fs"),ts=require("typescript"),Module=require("node:module");
const m=new Module("financial-report");m._compile(ts.transpileModule(fs.readFileSync("src/lib/financial-report.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,"report.cjs");
const {financialReport,validReportDate}=m.exports;
const entry=(id,date,status="posted")=>({id,number:id,entry_date:date,status,source_type:"test",source_reference:id,memo:""});
const line=(id,account,debit,credit)=>({journal_entry_id:id,account_code:account,debit,credit});
const entries=[entry("opening","2026-10-19"),entry("invoice","2026-10-20"),entry("delivery","2026-10-20"),entry("payment","2026-10-20"),entry("future","2026-10-21"),entry("draft","2026-10-20","draft")];
const lines=[line("opening","1201",220000,0),line("opening","1102",10000000,0),line("opening","1101",500000,0),line("opening","2101",0,300000),line("opening","1301",4290000,0),line("invoice","4101",0,240000),line("invoice","2102",0,24000),line("invoice","1201",264000,0),line("delivery","5101",120000,0),line("delivery","1301",0,120000),line("payment","1102",100000,0),line("payment","1201",0,100000),line("future","4101",0,999),line("draft","4101",0,999)];
let result=financialReport(entries,lines,"2026-10-20","2026-10-20");
assert.deepEqual(result.totals,{sales:240000,pbjt:24000,cogs:120000,margin:120000,receivable:384000,payable:300000,cash:500000,bank:10100000,inventory:4170000});
assert.equal(result.contributions.sales.size,1);assert.equal(result.contributions.sales.get("invoice"),240000);
entries.push(entry("credit","2026-10-20"));lines.push(line("credit","4101",60000,0),line("credit","2102",6000,0),line("credit","1201",0,66000),line("credit","5101",0,30000),line("credit","1301",30000,0));
result=financialReport(entries,lines,"2026-10-20","2026-10-20");assert.equal(result.totals.sales,180000);assert.equal(result.totals.cogs,90000);assert.equal(result.totals.margin,90000);assert.equal(result.totals.pbjt,18000);assert.equal(result.totals.receivable,318000);
for(const key of Object.keys(result.totals))assert.equal([...result.contributions[key].values()].reduce((a,b)=>a+b,0),result.totals[key],key+" drill-down reconciles");
assert.equal(validReportDate("2026-02-30"),false);assert.equal(validReportDate("2028-02-29"),true);assert.throws(()=>financialReport(entries,lines,"2026-10-21","2026-10-20"));
console.log("PASS: PDF T-35 financial arithmetic, period vs ending balance, exclusion of future/draft, credit reversal, tax-free margin, all drill-down totals and date validation. Unit fixture only; not database T-35 completion.");
