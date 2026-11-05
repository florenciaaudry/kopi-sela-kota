import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import { getInventorySnapshot } from "@/lib/inventory";
import { isDemoMode } from "@/lib/runtime-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DemoWorkspace } from "../demo-workspace";
import { WorkspaceViews } from "../workspace-views";
import { DataTable } from "../data-table";
import { SubmitButton } from "../submit-button";
import { transferInventoryAction } from "../module-actions";

export const metadata: Metadata = {
  title: "Produk & Stok",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  if (isDemoMode()) {
    return <DemoWorkspace module="inventory" />;
  }
  const profile = await requireRole(["warehouse", "procurement", "owner"]);
  const message = await searchParams;
  const snapshot = await getInventorySnapshot();

  if ("error" in snapshot) {
    return (
      <section className="notice notice-error" role="alert">
        <strong>Produk dan stok gagal dimuat.</strong>
        <p>{snapshot.error}</p>
      </section>
    );
  }
  const supabase = await createSupabaseServerClient();
  const [locations, transfers] = await Promise.all([
    supabase.from("locations").select("code, name").order("code"),
    supabase.from("inventory_transfers").select("number, sku, source_location, destination_location, quantity, transferred_at").order("transferred_at", { ascending: false }),
  ]);
  if (locations.error) {
    return (
      <section className="notice notice-error" role="alert">
        <strong>Data transfer Supabase gagal dimuat.</strong>
        <p>{locations.error.message}</p>
        <p>Periksa apakah migrasi transaksi sudah diterapkan. Data demo tidak digunakan sebagai pengganti.</p>
      </section>
    );
  }
  if (transfers.error) {
    return (
      <section className="notice notice-error" role="alert">
        <strong>Riwayat transfer Supabase gagal dimuat.</strong>
        <p>{transfers.error.message}</p>
        <p>Periksa apakah migrasi transaksi sudah diterapkan. Data demo tidak digunakan sebagai pengganti.</p>
      </section>
    );
  }
  if (!locations.data || !transfers.data) {
    return (
      <section className="notice notice-error" role="alert">
        <strong>Data transfer Supabase tidak lengkap.</strong>
        <p>Database tidak mengembalikan lokasi atau riwayat transfer.</p>
      </section>
    );
  }

  return (
    <div className="page-stack module-workspace">
      <div className="page-heading"><div><p className="eyebrow">KOPI SELA KOTA / INVENTORY</p><h1>Produk &amp; Stok</h1><p className="muted-copy">Periksa stok tiap lokasi dan pindahkan barang sesuai ketersediaannya.</p></div><span className="date-chip"><span className="connection-dot" aria-hidden="true" /> Data tersimpan online</span></div>
      {message.error ? <section className="notice notice-error" role="alert">{message.error}</section> : null}
      {message.success ? <section className="notice notice-info" role="status">{message.success}</section> : null}
      <section className="inventory-summary" aria-label="Ringkasan stok">
        <div><span>Produk</span><strong>{snapshot.productCount} SKU</strong></div>
        <div><span>Lokasi</span><strong>{snapshot.locationCount}</strong></div>
        <div><span>Stok fisik · On Hand</span><strong>{snapshot.onHand.toLocaleString("id-ID")} unit</strong></div>
        <div><span>Nilai persediaan</span><strong>{formatRupiah(snapshot.inventoryValue)}</strong></div>
      </section>
      <WorkspaceViews actions={profile.role === "warehouse" || profile.role === "owner" ? [{
        id: "transfer", title: "Transfer antar lokasi", content: (
          <form action={transferInventoryAction} className="demo-form">
            <input name="idempotency_key" type="hidden" value={crypto.randomUUID()} />
            <label className="demo-field">
              <span>SKU</span>
              <select defaultValue="" name="sku" required>
                <option disabled value="">Pilih SKU…</option>
                {[...new Map(snapshot.rows.map((row) => [row.sku, row.name])).entries()].map(([sku, name]) => (
                  <option key={sku} value={sku}>{sku} · {name}</option>
                ))}
              </select>
            </label>
            <label className="demo-field">
              <span>Lokasi sumber</span>
              <select defaultValue="" name="source_location" required>
                <option disabled value="">Pilih lokasi…</option>
                {locations.data.map((location) => <option key={location.code} value={location.code}>{location.code} · {location.name}</option>)}
              </select>
            </label>
            <label className="demo-field">
              <span>Lokasi tujuan</span>
              <select defaultValue="" name="destination_location" required>
                <option disabled value="">Pilih lokasi…</option>
                {locations.data.map((location) => <option key={location.code} value={location.code}>{location.code} · {location.name}</option>)}
              </select>
            </label>
            <label className="demo-field">
              <span>Kuantitas</span>
              <input min={1} name="quantity" required step={1} type="number" />
            </label>
            <SubmitButton label="Simpan transfer" />
          </form>
        ),
      }] : []} views={[
        { id: "stock", title: "Stok per lokasi", content: <section className="section-card demo-panel"><div className="section-heading"><h2>Ketersediaan produk</h2></div><p className="muted-copy">On Hand = stok fisik · Reserved = sudah dipesan · Available = stok yang masih bisa digunakan.</p><DataTable headers={["SKU", "Produk", "Ukuran", "Lokasi", "On Hand", "Reserved", "Available", "Biaya standar"]} rows={snapshot.rows.map((row) => [row.sku, row.name, row.size, row.locationCode, row.onHand, row.reserved, row.available, formatRupiah(row.standardCost)])} /></section> },
        { id: "transfers", title: "Riwayat transfer", content: <section className="section-card demo-panel"><div className="section-heading"><h2>Perpindahan barang</h2></div><DataTable headers={["Nomor", "SKU", "Sumber", "Tujuan", "Kuantitas", "Waktu"]} rows={transfers.data.map((transfer) => [transfer.number, transfer.sku, transfer.source_location, transfer.destination_location, transfer.quantity, new Date(transfer.transferred_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB"])} /></section> },
      ]} />
    </div>
  );
}
