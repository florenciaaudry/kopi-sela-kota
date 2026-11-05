import Link from "next/link";

import { getCurrentProfile } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import { getInventorySnapshot } from "@/lib/inventory";
import { applicationAccess } from "@/lib/roles";
import { isDemoMode } from "@/lib/runtime-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OwnerDashboard } from "@/lib/supabase/database.types";
import { DemoWorkspace } from "./demo-workspace";

export default async function DashboardPage() {
  if (isDemoMode()) {
    return <DemoWorkspace module="dashboard" />;
  }
  const profile = await getCurrentProfile();
  if (!profile) {
    return (
      <section className="notice notice-warning" role="alert">
        Akun ini belum memiliki role aplikasi.
      </section>
    );
  }

  const hasInventoryAccess = ["warehouse", "procurement", "owner"].includes(
    profile.role,
  );
  const snapshot = hasInventoryAccess ? await getInventorySnapshot() : null;
  const financialSummary = ["finance", "owner"].includes(profile.role)
    ? await (async (): Promise<{ data: OwnerDashboard | null; error: string | null }> => {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.rpc("get_owner_dashboard");
        return { data, error: error?.message ?? null };
      })()
    : null;
  const visibleApplications = applicationAccess.filter((app) =>
    app.roles.includes(profile.role),
  );

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">KOPI SELA KOTA / OVERVIEW</p>
          <h1>Ringkasan operasional</h1>
          <p className="muted-copy">
            Data stok dibaca langsung dari database. Belum ada transaksi
            operasional baru yang diposting.
          </p>
        </div>
        <span className="date-chip">Baseline · 20 Okt 2026</span>
      </div>

      {!snapshot ? (
        <section className="notice notice-info">
          Ringkasan persediaan hanya tersedia untuk role Warehouse, Procurement,
          dan Owner.
        </section>
      ) : "error" in snapshot ? (
        <section className="notice notice-error" role="alert">
          <strong>Data ringkasan gagal dimuat.</strong>
          <p>{snapshot.error}</p>
        </section>
      ) : (
        <>
          {snapshot.productCount === 0 || snapshot.locationCount === 0 ? (
            <section className="empty-state">
              <h2>Data awal belum tersedia</h2>
              <p>
                Jalankan migrasi dan seed pada database pengembangan untuk
                membaca produk, lokasi, dan saldo stok.
              </p>
            </section>
          ) : (
            <section aria-label="Ringkasan persediaan" className="metric-grid">
              <article className="metric-card">
                <span>Produk / lokasi</span>
                <strong>
                  {snapshot.productCount} <small>SKU</small>
                  <span className="metric-separator">·</span>
                  {snapshot.locationCount} <small>lokasi</small>
                </strong>
                <p>Data master dari database</p>
              </article>
              <article className="metric-card">
                <span>On Hand</span>
                <strong>{snapshot.onHand.toLocaleString("id-ID")} unit</strong>
                <p>Saldo di semua lokasi</p>
              </article>
              <article className="metric-card">
                <span>Reserved / Available</span>
                <strong>
                  {snapshot.reserved.toLocaleString("id-ID")} /{" "}
                  {snapshot.available.toLocaleString("id-ID")}
                </strong>
                <p>Reservasi aktif tidak dihitung sebagai tersedia</p>
              </article>
              <article className="metric-card">
                <span>Nilai persediaan standar</span>
                <strong>{formatRupiah(snapshot.inventoryValue)}</strong>
                <p>Dihitung dari On Hand × biaya standar per SKU</p>
              </article>
            </section>
          )}

          {financialSummary ? (
            financialSummary.error ? (
              <section className="notice notice-error" role="alert">
                <strong>Ringkasan keuangan gagal dimuat.</strong>
                <p>{financialSummary.error}</p>
                <p>Pastikan migrasi transaksi sudah diterapkan. Data demo tidak digunakan sebagai pengganti.</p>
              </section>
            ) : financialSummary.data ? (
              <section aria-label="Ringkasan keuangan" className="metric-grid">
                <article className="metric-card"><span>Piutang</span><strong>{formatRupiah(financialSummary.data.receivables)}</strong><p>Sisa invoice posted</p></article>
                <article className="metric-card"><span>Utang</span><strong>{formatRupiah(financialSummary.data.payables)}</strong><p>Sisa vendor bill posted</p></article>
                <article className="metric-card"><span>Kas</span><strong>{formatRupiah(financialSummary.data.cash)}</strong><p>Dari jurnal posted</p></article>
                <article className="metric-card"><span>Bank</span><strong>{formatRupiah(financialSummary.data.bank)}</strong><p>Dari jurnal posted</p></article>
              </section>
            ) : (
              <section className="notice notice-error" role="alert">
                Database tidak mengembalikan ringkasan keuangan.
              </section>
            )
          ) : null}
        </>
      )}

      <section className="section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">APLIKASI</p>
            <h2>Ruang kerja sesuai peran</h2>
          </div>
        </div>
        <div className="application-grid">
          {visibleApplications.map((app) =>
            app.available && app.href ? (
              <Link className="application-card" href={app.href} key={app.name}>
                <span className="application-icon" aria-hidden="true">
                  {app.name.slice(0, 1)}
                </span>
                <span className="application-name">{app.name}</span>
                <span className="application-state state-ready">Tersedia</span>
              </Link>
            ) : (
              <div className="application-card application-card-pending" key={app.name}>
                <span className="application-icon" aria-hidden="true">
                  {app.name.slice(0, 1)}
                </span>
                <span className="application-name">{app.name}</span>
                <span className="application-state">Dalam pengerjaan</span>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="notice notice-info">
        Angka keuangan hanya dibaca dari jurnal dan dokumen yang tersimpan di Supabase.
      </section>
    </div>
  );
}
