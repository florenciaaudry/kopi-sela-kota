/* eslint-disable @typescript-eslint/no-require-imports -- Local scenario administration. */
const fs = require("node:fs");
const { createClient } = require("@supabase/supabase-js");
const names = require("../src/lib/scenario-identities.json");
require("@next/env").loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || new URL(url).hostname !== "tswkkutgqayvxwzepqfs.supabase.co") throw Error("Proyek tidak cocok; hentikan penyelarasan nama.");
  const local = fs.readFileSync(".env.role-admin.local", "utf8").replace(/^\uFEFF/, "");
  const match = local.match(/^\s*SUPABASE_(?:SECRET_KEY|SERVICE_ROLE_KEY)\s*=\s*(.*?)\s*$/m);
  const key = match?.[1]?.replace(/^(["'])(.*)\1$/, "$2").trim();
  if (!key || key.startsWith("sb_publishable_")) throw Error("Key admin lokal diperlukan; tidak dicetak.");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.from("profiles").select("id,full_name,role");
  if (error) throw Error(error.message);
  for (const profile of data) {
    const expected = names[profile.role];
    if (!expected) throw Error("Role tidak dikenali; tidak menebak nama.");
    if (profile.full_name !== expected) {
      const changed = await client.from("profiles").update({ full_name: expected }).eq("id", profile.id).eq("role", profile.role).eq("full_name", profile.full_name).select("id");
      if (changed.error || changed.data?.length !== 1) throw Error("Profil berubah bersamaan atau tidak dapat diperbarui.");
      const audit = await client.from("audit_events").insert({ actor_label: "Konfigurasi identitas skenario PDF", action: "align_scenario_name", document_type: "profile", document_number: profile.id, details: { role: profile.role, previous_full_name: profile.full_name, full_name: expected, source: "PDF pages 4-6", credentials_changed: false } });
      if (audit.error) throw Error("Nama diperbarui, tetapi audit gagal: " + audit.error.message);
    }
  }
  const check = await client.from("profiles").select("full_name,role").order("role");
  if (check.error || check.data.some(p => p.full_name !== names[p.role])) throw Error("Verifikasi nama gagal.");
  for (const p of check.data) console.log(`PASS ${p.role}: ${p.full_name}`);
  console.log("Nama profil cocok PDF. Email, password, role dan histori transaksi tidak diubah.");
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
