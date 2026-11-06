"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import { SelectField } from "./select-field";

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
    <SelectField
      label="Vendor"
      name="vendor_id"
      placeholder="Pilih pemasok…"
      value={vendor}
      options={vendors.map((item) => ({ value: item.id, label: `${item.id} · ${item.name}` }))}
      onValueChange={(nextVendor) => {
        setVendor(nextVendor);
        setSku("");
        setQuantity(1);
      }}
    />
    <SelectField
      label="Vendor Product"
      name="sku"
      placeholder={vendor ? "Pilih produk…" : "Pilih pemasok terlebih dahulu"}
      disabled={!vendor}
      value={sku}
      options={available.map((item) => ({
        value: item.sku,
        label: `${item.sku} · ${products.find((product) => product.sku === item.sku)?.name ?? item.sku} · ${formatRupiah(Number(item.purchase_price))}`,
      }))}
      onValueChange={(nextSku) => {
        const next = available.find((item) => item.sku === nextSku);
        setSku(nextSku);
        setQuantity(next?.minimum_quantity ?? 1);
      }}
    />
    <label className="demo-field"><span>Quantity</span><input name="quantity" required type="number" min={selected?.minimum_quantity ?? 1} step={1} value={Number.isNaN(quantity) ? "" : quantity} onChange={(event) => setQuantity(event.target.valueAsNumber)} /></label>
    <p className="muted-copy">{selected ? `Minimum pembelian ${selected.minimum_quantity} unit. Estimasi total ${formatRupiah(Number.isSafeInteger(quantity) && quantity > 0 ? quantity * Number(selected.purchase_price) : 0)}; Purchase Tax 0%. Harga dan minimum diperiksa ulang saat disimpan.` : vendor && available.length === 0 ? "Belum ada produk pada daftar harga pemasok ini." : "Produk dan harga mengikuti pemasok yang dipilih."}</p>
  </>;
}
