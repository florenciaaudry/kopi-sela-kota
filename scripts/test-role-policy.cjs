/* eslint-disable @typescript-eslint/no-require-imports -- Local Node test runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
const compiled = ts.transpileModule(fs.readFileSync("src/lib/roles.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = new Module("role-policy");
loaded._compile(compiled, "role-policy.cjs");
const { routeAccess, applicationAccess } = loaded.exports;
const expected = {
  sales: ["/sales", "/crm"],
  warehouse: ["/sales", "/purchase", "/inventory", "/returns"],
  procurement: ["/purchase", "/inventory"],
  finance: ["/accounting", "/invoicing", "/returns", "/reporting"],
  cashier: ["/pos"],
  owner: Object.keys(routeAccess),
};
for (const [role, routes] of Object.entries(expected)) {
  assert.deepEqual(Object.entries(routeAccess).filter(([, roles]) => roles.includes(role)).map(([route]) => route).sort(), [...routes].sort(), `Route permissions for ${role}`);
}
assert.equal(applicationAccess.length, 7);
for (const app of applicationAccess) {
  assert.deepEqual([...app.roles].sort(), [...routeAccess[app.href]].sort(), `Menu/route drift: ${app.name}`);
}
const actions = fs.readFileSync("src/app/(erp)/module-actions.ts", "utf8");
const creditNote = actions.split("export async function createCreditNoteAction")[1].split("export async function approvePosVarianceAction")[0];
assert.match(creditNote, /submitRpc\(path, \["finance", "owner"\]/);
assert.doesNotMatch(creditNote, /\["warehouse", "finance"/);
console.log("PASS: six-role route matrix, seven application menus, and Credit Note server-action boundary");
