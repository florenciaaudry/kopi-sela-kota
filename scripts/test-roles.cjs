/* eslint-disable @typescript-eslint/no-require-imports -- Local integration test runner. */
const fs = require("node:fs");
const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
const { createServerClient } = require("@supabase/ssr");
const ts = require("typescript");
const Module = require("node:module");
const { inspectPageAccess } = require("./page-access-result.cjs");
const scenarioNames = require("../src/lib/scenario-identities.json");
require("@next/env").loadEnvConfig(process.cwd());

const roleModule = new Module("role-policy");
roleModule._compile(ts.transpileModule(fs.readFileSync("src/lib/roles.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, "role-policy.cjs");
const { routeAccess } = roleModule.exports;
const results = [];
const termModule = new Module("erp-terminology");
termModule._compile(ts.transpileModule(fs.readFileSync("src/lib/erp-terminology.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, "erp-terminology.cjs");
const titles = Object.fromEntries(Object.entries(termModule.exports.moduleTitles).map(([key, value]) => ["/" + key, value]));
function record(role, check, pass, detail) {
  results.push({ role, check, status: pass ? "PASS" : "FAIL", detail });
  const expectation = detail?.includes("expected=denied") ? " [harus ditolak]" : detail?.includes("expected=allowed") ? " [harus diizinkan]" : "";
  console.log(`${pass ? "PASS" : "FAIL"} ${role}: ${check}${expectation}`);
}

async function main() {
  if (!fs.existsSync(".env.role-accounts.local")) throw new Error("Akun uji belum tersedia. Jalankan npm run roles:setup terlebih dahulu.");
  const { project, accounts } = JSON.parse(fs.readFileSync(".env.role-accounts.local", "utf8"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || new URL(url).hostname !== project) throw new Error("Konfigurasi akun dan Supabase tidak cocok.");
  const base = process.env.ERP_TEST_BASE_URL || "http://127.0.0.1:3000";
  if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Tes halaman dibatasi pada server lokal.");
  const anonymous = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const anonymousJournal = await anonymous.from("journal_entries").select("id").limit(1);
  record("anonymous", "jurnal tidak dapat dibaca", Boolean(anonymousJournal.error) || anonymousJournal.data?.length === 0, anonymousJournal.error?.code || "RLS");
  for (const role of ["sales", "warehouse", "procurement", "finance", "cashier", "owner"]) {
    const account = accounts.find((item) => item.role === role);
    if (!account) { record(role, "akun tersedia", false, "Belum dibuat"); continue; }
    const cookieJar = new Map();
    const client = createServerClient(url, key, { cookies: { getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })), setAll: (cookies) => cookies.forEach(({ name, value }) => cookieJar.set(name, value)) } });
    const { data, error } = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    record(role, "login password nyata", !error && data.user?.id === account.id, error?.code || "Auth berhasil");
    if (error || !data.user) continue;
    const profile = await client.from("profiles").select("role,full_name").eq("id", data.user.id).single();
    record(role, "profil sesuai", !profile.error && profile.data?.role === role, profile.error?.code || "profil cocok");
    record(role, "nama sesuai tokoh PDF", !profile.error && profile.data?.full_name === scenarioNames[role], profile.error?.code || scenarioNames[role]);
    const cookies = [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
    for (const [route, roles] of Object.entries(routeAccess)) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch(base + route, { headers: { cookie: cookies }, redirect: "manual", signal: AbortSignal.timeout(45000) });
          const body = await response.text();
          const allowed = roles.includes(role);
          const actual = inspectPageAccess(response.status, body, titles[route]);
          record(role, `URL ${route}`, allowed ? actual.allowed : actual.denied, `HTTP ${response.status}; expected=${allowed ? "allowed" : "denied"}; actual=${actual.denied ? "denied" : actual.allowed ? "allowed" : "unverified"}; title=${actual.headings.join(" / ") || "none"}; network_attempt=${attempt}`);
          break;
        } catch {
          if (attempt === 1) console.log(`WARN ${role}: ${route} koneksi/batas waktu; ulangi satu kali (bukan retry kegagalan otorisasi).`);
          else record(role, `URL ${route}`, false, "Server tidak merespons / batas waktu pada dua percobaan");
        }
      }
    }
    for (const [table, roles] of [["journal_entries", ["finance", "owner"]], ["chart_of_accounts", ["finance", "owner"]], ["product_costs", ["warehouse", "procurement", "finance", "owner"]]]) {
      const read = await client.from(table).select("*").limit(1);
      const allowed = roles.includes(role);
      record(role, `RLS baca ${table}`, allowed ? !read.error && read.data?.length > 0 : Boolean(read.error) || read.data?.length === 0, read.error?.code || `${read.data?.length ?? 0} baris`);
    }
    // A zero-match update detects missing table grants without changing any profile.
    const escalation = await client.from("profiles").update({ role: "owner" }).eq("id", "00000000-0000-0000-0000-000000000000").select("id");
    record(role, "UPDATE profiles langsung ditolak", escalation.error?.code === "42501", escalation.error?.code || "Tidak ditolak oleh grant");
    const costWrite = await client.from("product_costs").update({ standard_cost: 0 }).eq("sku", "__ROLE_TEST_NONEXISTENT_SKU__").select("sku");
    record(role, "UPDATE biaya langsung ditolak", costWrite.error?.code === "42501", costWrite.error?.code || "Tidak ditolak oleh grant");
    // An incomplete journal can never satisfy required fields, even if grants regress.
    const journalWrite = await client.from("journal_entries").insert({});
    record(role, "INSERT jurnal langsung ditolak", journalWrite.error?.code === "42501", journalWrite.error?.code || "Tidak ditolak oleh grant");
    if (role !== "owner") {
      const forbidden = role === "sales"
        ? await client.rpc("open_pos_session", { p_opening_cash: 0, p_idempotency_key: crypto.randomUUID() })
        : await client.rpc("create_sales_order", { p_customer_id: "__ROLE_TEST_NO_CUSTOMER__", p_sku: "__ROLE_TEST_NO_SKU__", p_quantity: 1, p_discount_percent: 0, p_idempotency_key: crypto.randomUUID() });
      record(role, "RPC lintas-role ditolak sebelum transaksi", forbidden.error?.code === "42501", forbidden.error?.code || "Tidak ditolak oleh role guard");
    }
    const logout = await client.auth.signOut({ scope: "local" });
    const after = await client.auth.getSession();
    record(role, "logout", !logout.error && !after.data.session, logout.error?.code || "sesi lokal berakhir");
    const clearedCookies = [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
    const afterLogout = await fetch(base + "/", { headers: { cookie: clearedCookies }, redirect: "manual", signal: AbortSignal.timeout(20000) });
    record(role, "URL internal setelah logout diarahkan ke login", [302, 303, 307, 308].includes(afterLogout.status) && (afterLogout.headers.get("location") || "").includes("/login"), `HTTP ${afterLogout.status}`);
  }
  const report = { checkedAt: new Date().toISOString(), scope: "Login Auth, profile, SSR URL access, RLS reads, direct profile grant, logout. No business transactions posted.", results };
  fs.writeFileSync("docs/role-test-results.json", JSON.stringify(report, null, 2));
  console.log(`Hasil: ${results.filter((item) => item.status === "PASS").length} lulus; ${results.filter((item) => item.status === "FAIL").length} gagal. Laporan tidak memuat password/token.`);
  if (results.some((item) => item.status === "FAIL")) process.exitCode = 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
