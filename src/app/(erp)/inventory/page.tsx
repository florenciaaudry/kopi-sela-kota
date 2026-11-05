import type { Metadata } from "next";

import { requireRole } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import { getInventorySnapshot } from "@/lib/inventory";
import { isDemoMode } from "@/lib/runtime-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DemoWorkspace } from "../demo-workspace";
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
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">INVENTORY / MASTER DATA</p>
          <h1>Produk &amp; stok</h1>
          <p className="muted-copy">
            Stok ditampilkan per SKU dan lokasi; ukuran produk tidak saling
            menggantikan.
          </p>
        </div>
        <span className="date-chip">List · Baseline</span>
      </div>

      {message.error ? <section className="notice notice-error" role="alert">{message.error}</section> : null}
      {message.success ? <section className="notice notice-info" role="status">{message.success}</section> : null}
      {profile.role === "warehouse" || profile.role === "owner" ? (
        <section className="section-card demo-panel">
          <div className="section-heading"><h2>Transfer antar lokasi</h2></div>
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
            <button className="primary-button" type="submit">Posting transfer</button>
          </form>
        </section>
      ) : null}

      {snapshot.rows.length === 0 ? (
        <section className="empty-state">
          <h2>Belum ada saldo stok</h2>
          <p>Pastikan seed baseline sudah diterapkan ke database.</p>
        </section>
      ) : (
        <section className="table-card">
          <div className="table-summary">
            <span>
              {snapshot.productCount} SKU · {snapshot.locationCount} lokasi
            </span>
            <span>
              {snapshot.onHand.toLocaleString("id-ID")} unit ·{" "}
              {formatRupiah(snapshot.inventoryValue)}
            </span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col">Produk</th>
                  <th scope="col">Ukuran</th>
                  <th scope="col">Lokasi</th>
                  <th className="numeric" scope="col">On Hand</th>
                  <th className="numeric" scope="col">Reserved</th>
                  <th className="numeric" scope="col">Available</th>
                  <th className="numeric" scope="col">Biaya standar</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.rows.map((row) => (
                  <tr key={`${row.sku}-${row.locationCode}`}>
                    <td className="sku-cell">{row.sku}</td>
                    <td>{row.name}</td>
                    <td>{row.size}</td>
                    <td>{row.locationCode}</td>
                    <td className="numeric">{row.onHand}</td>
                    <td className="numeric">{row.reserved}</td>
                    <td className="numeric">{row.available}</td>
                    <td className="numeric">{formatRupiah(row.standardCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="section-card demo-panel">
        <div className="section-heading"><h2>Riwayat transfer</h2></div>
        {transfers.data.length === 0 ? <p className="muted-copy">Belum ada transfer.</p> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Nomor</th><th>SKU</th><th>Sumber</th><th>Tujuan</th><th>Kuantitas</th><th>Waktu</th></tr></thead>
              <tbody>{transfers.data.map((transfer) => (
                <tr key={transfer.number}>
                  <td>{transfer.number}</td><td>{transfer.sku}</td><td>{transfer.source_location}</td>
                  <td>{transfer.destination_location}</td><td>{transfer.quantity}</td>
                  <td>{new Date(transfer.transferred_at).toLocaleString("id-ID")}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
