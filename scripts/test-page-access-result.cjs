/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner. */
const assert = require("node:assert/strict");
const { inspectPageAccess } = require("./page-access-result.cjs");
const allowed = '<h1>Penjualan</h1><script>self.__next_f.push(["notFound: Halaman tidak tersedia"])</script>';
assert.equal(inspectPageAccess(200, allowed, "Penjualan").allowed, true);
assert.equal(inspectPageAccess(200, allowed, "Penjualan").denied, false);
assert.equal(inspectPageAccess(200, '<script>digest="NEXT_HTTP_ERROR_FALLBACK;404"</script>', "Penjualan").denied, true);
assert.equal(inspectPageAccess(404, "", "Penjualan").denied, true);
assert.equal(inspectPageAccess(200, '<h1>Penjualan</h1><p>Data Supabase gagal dimuat</p>', "Penjualan").allowed, false);
assert.equal(inspectPageAccess(200, '<h1>Masuk</h1>', "Penjualan").allowed, false);
assert.equal(inspectPageAccess(307, "", "Penjualan").allowed, false);
assert.equal(inspectPageAccess(200, '<h1>Tagihan &amp; Pembayaran</h1>', "Tagihan & Pembayaran").allowed, true);
console.log("PASS: Next.js fallback template, real streamed denial, wrong page, and data errors distinguished");
