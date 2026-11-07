import { readLocalTestAccounts } from "@/lib/local-test-accounts";
import { roleLabels } from "@/lib/roles";
import names from "@/lib/scenario-identities.json";
import { TestAccountPicker } from "./test-account-picker";
import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "./login-form";
import { LoginSessionNotice } from "./login-session-notice";
import Link from "next/link";
import {
  hasPartialSupabaseConfig,
  isDemoMode,
} from "@/lib/runtime-mode";

export const metadata: Metadata = {
  title: "Masuk",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const testAccounts = await readLocalTestAccounts();
  const tasks = { owner: "Seluruh aplikasi & persetujuan", sales: "Sales Order & CRM", warehouse: "Delivery, Receipt & Inventory", procurement: "Purchase Order & pemasok", finance: "Invoice, Payment & Reporting", cashier: "POS, Hold & sesi kasir" };
  const demoMode = isDemoMode();
  const configurationInvalid = hasPartialSupabaseConfig();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="brand-mark" aria-hidden="true">
          KS
        </div>
        <p className="eyebrow">Kopi Sela Kota</p>
        <h1>Ruang kerja operasional yang rapi, dari pesanan sampai kas.</h1>
        <p className="brand-description">
          Sistem ERP untuk penjualan, persediaan, pengadaan, keuangan, dan
          layanan kasir.
        </p>
        <div className="brand-footer">Tebet, Jakarta · WIB</div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <p className="eyebrow">ERP KOPI SELA KOTA</p>
          <h2>Selamat datang</h2>
          <p className="muted-copy">Masuk dengan akun kerja yang telah disiapkan.</p>

          {demoMode ? (
            <div className="notice notice-warning" role="status">
              Supabase belum dikonfigurasi. Untuk melihat tampilan dan mencoba alur, buka mode demo. Data demo hanya tersimpan di browser ini.
              <Link className="demo-entry-link" href="/">Buka workspace demo</Link>
            </div>
          ) : configurationInvalid ? (
            <div className="notice notice-error" role="alert">
              Konfigurasi Supabase belum lengkap. Periksa
              NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di
              .env.local, lalu restart server. Mode demo dinonaktifkan karena
              konfigurasi Supabase sudah dimulai.
            </div>
          ) : !configured ? (
            <div className="notice notice-warning" role="status">
              Login belum tersedia karena Supabase belum dikonfigurasi. Isi
              environment variable lokal sesuai README untuk mengaktifkan
              autentikasi.
            </div>
          ) : null}

          <Suspense fallback={null}>
            <LoginSessionNotice />
          </Suspense>

          <LoginForm disabled={!configured} />
          {testAccounts.length ? <TestAccountPicker accounts={testAccounts.map(a => ({ role: a.role, label: roleLabels[a.role], name: names[a.role], task: tasks[a.role] }))} /> : null}
          <p className="login-footnote">
            Akses hanya untuk pengguna yang akunnya dibuat oleh administrator.
            Pendaftaran publik tidak tersedia.
          </p>
        </div>
      </section>
    </main>
  );
}
