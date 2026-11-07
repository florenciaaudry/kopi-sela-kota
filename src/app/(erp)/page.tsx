import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import { getInventorySnapshot } from "@/lib/inventory";
import { applicationAccess } from "@/lib/roles";
import { isDemoMode } from "@/lib/runtime-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OwnerDashboard } from "@/lib/supabase/database.types";
import { DemoWorkspace } from "./demo-workspace";
import { AppDirectory } from "./app-directory";

export const metadata = { title: "Dashboard | Kopi Sela Kota" };

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
    <div className="ksk-home-heading"><div><h1>Dashboard</h1><p>Pilih aplikasi untuk mulai bekerja.</p></div><span className="dashboard-app-count">{visibleApplications.length} apps available</span></div>
    {snapshot && "error" in snapshot ? <section className="notice notice-error" role="alert"><strong>Data stok belum dapat dimuat.</strong><p>{snapshot.error}</p></section> : null}
    {financialSummary?.error ? <section className="notice notice-error" role="alert">Financial Summary belum dapat dimuat. Buka Reporting atau coba muat ulang.</section> : null}
    <AppDirectory applications={visibleApplications.map(({ name, group, href }) => ({ name, group, href }))} />
    {financialSummary ? <details id="reporting" className="ksk-reporting dashboard-secondary"><summary>Financial Summary</summary><div className="ksk-section-header"><div><p className="eyebrow">LAPORAN</p><h2 id="finance-heading">Reporting</h2><p>Saldo dari transaksi yang sudah dibukukan.</p></div><Link className="ksk-detail-link" href="/reporting">Lihat Reporting <span aria-hidden="true">↗</span></Link></div>
      {financialSummary.error ? <div className="notice notice-error" role="alert"><strong>Ringkasan keuangan belum dapat dimuat.</strong><p>{financialSummary.error}</p></div> : financialSummary.data ? <div className="ksk-overview-grid ksk-money-grid">{[
        ["Accounts Receivable", financialSummary.data.receivables, "Tagihan pelanggan yang belum lunas"],
        ["Accounts Payable", financialSummary.data.payables, "Tagihan pemasok yang belum lunas"],
        ["Cash", financialSummary.data.cash, "Saldo kas yang tercatat"],
        ["Bank", financialSummary.data.bank, "Saldo bank yang tercatat"],
      ].map(([label, value, detail]) => <article className="ksk-overview-card" key={String(label)}><span>{label}</span><strong>{formatRupiah(Number(value))}</strong><p>{detail}</p></article>)}</div> : <div className="notice notice-error" role="alert">Ringkasan keuangan belum tersedia.</div>}
    </details> : null}
    {stock ? <section className="dashboard-stock-bar" aria-label="Inventory summary"><div><span>Available Stock</span><strong>{stock.available.toLocaleString("id-ID")} <small>units</small></strong></div><span>On Hand {stock.onHand.toLocaleString("id-ID")} · Reserved {stock.reserved.toLocaleString("id-ID")}</span><span>{stock.productCount} Products · {stock.locationCount} Locations</span><Link href="/inventory" className="ksk-detail-link">Open Inventory →</Link></section> : null}
    <details className="dashboard-help"><summary>Business flow guide</summary><p>Sales: Quotation → Sales Order → Delivery → Invoice → Payment.</p><p>Purchase: RFQ → Purchase Order → Receipt → Vendor Bill → Payment.</p><p>Point of Sale: Open Session → Order → Payment → Receipt → Close Session.</p></details>
  </div>;
}
