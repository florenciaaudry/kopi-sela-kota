"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";

export function PurchaseOrderFields({ vendors, prices, products }: {
  vendors: { id: string; name: string }[];
  prices: { vendor_id: string; sku: string; minimum_quantity: number; purchase_price: number }[];
  products: { sku: string; name: string }[];
}) {
  const [vendor, setVendor] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const available = prices.filter((price) => price.vendor_id === vendor);
  const selected = available.find((price) => price.sku === sku);
  return <>
    <label className="demo-field"><span>Pemasok</span><select name="vendor_id" required value={vendor} onChange={(event) => { setVendor(event.target.value); setSku(""); setQuantity(1); }}><option value="">Pilih pemasok…</option>{vendors.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label>
    <label className="demo-field"><span>Produk pemasok</span><select name="sku" required disabled={!vendor} value={sku} onChange={(event) => { const next = available.find((item) => item.sku === event.target.value); setSku(event.target.value); setQuantity(next?.minimum_quantity ?? 1); }}><option value="">{vendor ? "Pilih produk…" : "Pilih pemasok terlebih dahulu"}</option>{available.map((item) => <option key={`${item.vendor_id}-${item.sku}`} value={item.sku}>{item.sku} · {products.find((product) => product.sku === item.sku)?.name ?? item.sku} · {formatRupiah(Number(item.purchase_price))}</option>)}</select></label>
    <label className="demo-field"><span>Kuantitas</span><input name="quantity" required type="number" min={selected?.minimum_quantity ?? 1} step={1} value={Number.isNaN(quantity) ? "" : quantity} onChange={(event) => setQuantity(event.target.valueAsNumber)} /></label>
    <p className="muted-copy">{selected ? `Minimum pembelian ${selected.minimum_quantity} unit. Estimasi total ${formatRupiah(Number.isSafeInteger(quantity) && quantity > 0 ? quantity * Number(selected.purchase_price) : 0)}; pajak beli 0 sesuai dataset. Harga dan minimum diperiksa ulang saat disimpan.` : vendor && available.length === 0 ? "Belum ada produk pada daftar harga pemasok ini." : "Produk dan harga mengikuti pemasok yang dipilih."}</p>
  </>;
}
