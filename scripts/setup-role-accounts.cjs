/* eslint-disable @typescript-eslint/no-require-imports -- Local Node administration script. */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
require("@next/env").loadEnvConfig(process.cwd());

const roles = ["sales", "warehouse", "procurement", "finance", "cashier", "owner"];
const credentialsPath = path.join(process.cwd(), ".env.role-accounts.local");

async function readSecret() {
  const localAdminFile = path.join(process.cwd(), ".env.role-admin.local");
  if (fs.existsSync(localAdminFile)) {
    const content = fs.readFileSync(localAdminFile, "utf8").replace(/^\uFEFF/, "");
    const match = content.match(/^\s*SUPABASE_(?:SECRET_KEY|SERVICE_ROLE_KEY)\s*=\s*(.*?)\s*$/m);
    const secret = match?.[1]?.replace(/^(["'])(.*)\1$/, "$2").trim();
    if (!secret || secret === "ISI_KEY_DI_SINI") {
      throw new Error("Buka .env.role-admin.local, isi nilai setelah SUPABASE_SECRET_KEY=, simpan, lalu jalankan ulang. Jangan tempel key sebagai perintah terminal.");
    }
    return secret;
  }
  const configured = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (configured) return configured.trim();
  throw new Error("Buat .env.role-admin.local berisi SUPABASE_SECRET_KEY=key_admin_Anda. File ini diabaikan Git; jangan kirim isinya ke chat.");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("URL proyek belum ada di .env.local.");
  const hostname = new URL(url).hostname;
  const key = await readSecret();
  if (!key || key.startsWith("sb_publishable_")) throw new Error("Pembuatan akun memerlukan secret/service-role key, bukan publishable key.");
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const stored = fs.existsSync(credentialsPath) ? JSON.parse(fs.readFileSync(credentialsPath, "utf8")) : { project: hostname, accounts: [] };
  if (stored.project !== hostname) throw new Error("File akun lokal berasal dari proyek berbeda. Jangan dicampur.");
  const existingUsers = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`Tidak dapat membaca akun Auth: ${error.message}`);
    existingUsers.push(...data.users);
    if (data.users.length < 100) break;
  }
  for (const role of roles) {
    const email = `qa-${role}@kopiselakota.test`;
    let account = stored.accounts.find((item) => item.email === email);
    let user = existingUsers.find((item) => item.email?.toLowerCase() === email);
    if (user && (!user.app_metadata?.erp_role_test || !account || account.id !== user.id)) {
      throw new Error(`Akun ${email} sudah ada tetapi bukan akun uji yang tercatat. Tidak mengubah akun/password tersebut.`);
    }
    if (!user) {
      const password = crypto.randomBytes(24).toString("base64url");
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { erp_role_test: true }, user_metadata: { full_name: `Uji ${role}` } });
      if (error || !data.user) throw new Error(`Gagal membuat ${role}: ${error?.message ?? "tidak ada user"}`);
      user = data.user;
      account = { role, email, password, id: user.id };
      stored.accounts = stored.accounts.filter((item) => item.email !== email);
      stored.accounts.push(account);
      // Persist after every creation so partial setup never loses generated passwords.
      fs.writeFileSync(credentialsPath, JSON.stringify(stored, null, 2), { mode: 0o600 });
    }
    const { data: profile, error: profileError } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) throw new Error(`Profil ${role}: ${profileError.message}`);
    if (profile && profile.role !== role) throw new Error(`Role profil ${email} berbeda. Tidak mengubah akses yang sudah ada.`);
    if (!profile) {
      const { error } = await admin.from("profiles").insert({ id: user.id, full_name: `Uji ${role}`, role });
      if (error) throw new Error(`Gagal membuat profil ${role}: ${error.message}`);
    }
    console.log(`Siap: ${role} (${email})`);
  }
  console.log("Akun uji tersimpan di .env.role-accounts.local (diabaikan Git). Password tidak dicetak; akun asli tidak diubah.");
  console.log("Lanjutkan: npm run test:roles");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
