import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import { getInventorySnapshot } from "@/lib/inventory";
import { applicationAccess, roleLabels } from "@/lib/roles";
import { isDemoMode } from "@/lib/runtime-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OwnerDashboard } from "@/lib/supabase/database.types";
import { DemoWorkspace } from "./demo-workspace";
import { AppDirectory } from "./app-directory";
import { AppIcon } from "./app-icon";

export default async function DashboardPage() {
  if (isDemoMode()) return <DemoWorkspace module="dashboard" />;
  const profile = await getCurrentProfile();
  if (!profile) return <section className="notice notice-warning" role="alert">Akun ini belum memiliki peran aplikasi.</section>;
  const hasInventoryAccess = ["warehouse", "procurement", "owner"].includes(profile.role);
  const hasFinancialAccess = ["finance", "owner"].includes(profile.role);
  const [snapshot, financialSummary] = await Promise.all([
    hasInventoryAccess ? getInventorySnapshot() : Promise.resolve(null),
    hasFinancialAccess ? (async (): Promise<{ data: OwnerDashboard | null; error: string | null }> => {
      const client = await createSupabaseServerClient();
      const { data, error } = await client.rpc("get_owner_dashboard");
      return { data, error: error?.message ?? null };
    })() : Promise.resolve(null),
  ]);
  const visibleApplications = applicationAccess.filter(app => app.roles.includes(profile.role));
  const stock = snapshot && !("error" in snapshot) ? snapshot : null;
  return <div className="ksk-home page-stack">
    <div className="ksk-home-heading"><div><p className="eyebrow">RUANG KERJA / KOPI SELA KOTA</p><h1>Beranda Kopi Sela Kota</h1><p>Selamat datang, {profile.full_name}. Mulai dari aplikasi yang kamu butuhkan.</p></div><span className="ksk-location-tag">Tebet, Jakarta <span aria-hidden="true">·</span> WIB</span></div>
    <section className="ksk-overview-grid" aria-label="Ringkasan ruang kerja">
      <article className="ksk-overview-card"><span>Aplikasi untukmu</span><strong>{visibleApplications.length} <small>dari 7 aplikasi</small></strong><p>Sesuai akses {roleLabels[profile.role]}</p></article>
      <article className="ksk-overview-card"><span>Akun yang digunakan</span><strong className="ksk-overview-name">{profile.full_name}</strong><p>{roleLabels[profile.role]}</p></article>
      <article className="ksk-overview-card"><span>Usaha</span><strong className="ksk-overview-name">Kopi Sela Kota</strong><p>Tebet, Jakarta · IDR</p></article>
      <article className="ksk-overview-card"><span>{hasInventoryAccess ? "Stok siap dijual" : "Ruang kerja aktif"}</span><strong>{stock ? <>{stock.available.toLocaleString("id-ID")} <small>unit</small></> : hasInventoryAccess ? "Belum terbaca" : roleLabels[profile.role]}</strong><p>{stock ? `${stock.onHand.toLocaleString("id-ID")} tersedia fisik · ${stock.reserved.toLocaleString("id-ID")} dipesan` : hasInventoryAccess ? "Periksa pesan data di bawah" : "Menu disesuaikan dengan tugasmu"}</p></article>
    </section>
    {snapshot && "error" in snapshot ? <section className="notice notice-error" role="alert"><strong>Data stok belum dapat dimuat.</strong><p>{snapshot.error}</p></section> : null}
    <AppDirectory applications={visibleApplications.map(({ name, group, href }) => ({ name, group, href }))} />
    <section className="ksk-help-strip"><span className="ksk-help-icon" aria-hidden="true">i</span><div><h2>Baru mulai? Ikuti alur kerjanya.</h2><p>Penjualan: pesanan → pengiriman → tagihan → pembayaran.<br/>Pembelian: pesanan pemasok → penerimaan → tagihan → pembayaran.</p></div></section>
    {financialSummary ? <section id="reporting" className="ksk-reporting" aria-labelledby="finance-heading"><div className="ksk-section-header"><div><p className="eyebrow">LAPORAN</p><h2 id="finance-heading">Ringkasan keuangan</h2><p>Saldo dari transaksi yang sudah dibukukan.</p></div><Link className="ksk-detail-link" href="/accounting">Lihat jurnal <span aria-hidden="true">↗</span></Link></div>
      {financialSummary.error ? <div className="notice notice-error" role="alert"><strong>Ringkasan keuangan belum dapat dimuat.</strong><p>{financialSummary.error}</p></div> : financialSummary.data ? <div className="ksk-overview-grid ksk-money-grid">{[
        ["Piutang pelanggan", financialSummary.data.receivables, "Tagihan pelanggan yang belum lunas"],
        ["Utang pemasok", financialSummary.data.payables, "Tagihan pemasok yang belum lunas"],
        ["Kas", financialSummary.data.cash, "Saldo kas yang tercatat"],
        ["Bank", financialSummary.data.bank, "Saldo bank yang tercatat"],
      ].map(([label, value, detail]) => <article className="ksk-overview-card" key={String(label)}><span>{label}</span><strong>{formatRupiah(Number(value))}</strong><p>{detail}</p></article>)}</div> : <div className="notice notice-error" role="alert">Ringkasan keuangan belum tersedia.</div>}
    </section> : null}
    {stock ? <section className="ksk-stock-detail"><div><AppIcon name="Inventory" /><span><strong>{stock.productCount} varian produk · {stock.locationCount} lokasi</strong><small>Nilai persediaan {formatRupiah(stock.inventoryValue)}</small></span></div><Link href="/inventory" className="ksk-detail-link">Lihat produk & stok <span aria-hidden="true">↗</span></Link></section> : null}
  </div>;
}
