"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

type Product = { sku: string; name: string; sales_price: number };

function SubmitHold() {
  const { pending } = useFormStatus();
  return <button className="primary-button" disabled={pending} type="submit">{pending ? "Menyimpan…" : "Hold Order · 10 menit"}</button>;
}

export function PosCart({ products, action, transactionKey }: {
  products: Product[];
  action: (form: FormData) => Promise<void>;
  transactionKey: string;
}) {
  const [lines, setLines] = useState([{ id: 0, sku: "", quantity: 1 }]);
  const [nextId, setNextId] = useState(1);
  const currency = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
  const totals = lines.reduce((sum, line) => {
    const price = Number(products.find((product) => product.sku === line.sku)?.sales_price ?? 0);
    const subtotal = price * (Number.isSafeInteger(line.quantity) && line.quantity > 0 ? line.quantity : 0);
    return { subtotal: sum.subtotal + subtotal, tax: sum.tax + Math.round(subtotal / 10) };
  }, { subtotal: 0, tax: 0 });

  return (
    <form action={action} className="pos-cart">
      <input name="idempotency_key" type="hidden" value={transactionKey} />
      <p className="muted-copy">Tambah produk sesuai pesanan. Menahan pesanan mencadangkan stok, belum mencatat pembayaran.</p>
      {lines.map((line, index) => (
        <div className="pos-cart-line" key={line.id}>
          <label className="demo-field"><span>Product {index + 1}</span>
            <select name="cart_sku" required value={line.sku} onChange={(event) => setLines(lines.map((item) => item.id === line.id ? { ...item, sku: event.target.value } : item))}>
              <option value="">Pilih produk…</option>
              {products.map((product) => <option key={product.sku} value={product.sku} disabled={lines.some((item) => item.id !== line.id && item.sku === product.sku)}>{product.sku} · {product.name} · {currency(Number(product.sales_price))}</option>)}
            </select>
          </label>
          <label className="demo-field"><span>Quantity</span><input name="cart_quantity" type="number" min={1} step={1} required value={Number.isNaN(line.quantity) ? "" : line.quantity} onChange={(event) => setLines(lines.map((item) => item.id === line.id ? { ...item, quantity: event.target.valueAsNumber } : item))} /></label>
          <button type="button" className="text-button" aria-label={`Hapus produk ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines(lines.filter((item) => item.id !== line.id))}>Hapus</button>
        </div>
      ))}
      <button className="secondary-button" type="button" disabled={lines.length >= products.length} onClick={() => { setLines([...lines, { id: nextId, sku: "", quantity: 1 }]); setNextId(nextId + 1); }}>+ Add Product</button>
      <dl className="cart-summary" aria-live="polite"><div><dt>Subtotal</dt><dd>{currency(totals.subtotal)}</dd></div><div><dt>PBJT 10%</dt><dd>{currency(totals.tax)}</dd></div><div><dt>Estimasi total</dt><dd>{currency(totals.subtotal + totals.tax)}</dd></div></dl>
      <p className="muted-copy">Nilai akhir dan ketersediaan stok diperiksa ulang oleh server saat disimpan. Harga dikunci pada pesanan tertahan.</p>
      <SubmitHold />
    </form>
  );
}
