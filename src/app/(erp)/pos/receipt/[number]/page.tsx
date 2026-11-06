import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

export default async function ReceiptPage({ params }: { params: Promise<{ number: string }> }) {
  await requireRole(["cashier", "owner"]);
  const { number } = await params;
  const client = await createSupabaseServerClient();
  const [receiptResult, linesResult, tendersResult] = await Promise.all([
    client.from("pos_receipts").select("number, session_number, sku, quantity, subtotal, tax_amount, total, payment_method, sold_at, customer_id, hold_number, idempotency_key").eq("number", number).maybeSingle(),
    client.from("pos_receipt_lines").select("sku, quantity, unit_price, subtotal, tax_amount").eq("receipt_number", number).order("sku"),
    client.from("pos_receipt_tenders").select("payment_method, amount").eq("receipt_number", number).order("payment_method"),
  ]);
  const error = receiptResult.error ?? linesResult.error ?? tendersResult.error;
  if (error) return <section className="notice notice-error" role="alert"><h1>Struk belum bisa dimuat</h1><p>{error.message}</p><Link href="/pos">Kembali ke kasir</Link></section>;
  const receipt = receiptResult.data;
  if (!receipt) notFound();
  const holdNumber = receipt.hold_number;
  const lines = linesResult.data?.length ? linesResult.data : [{ sku: receipt.sku, quantity: receipt.quantity, unit_price: Number(receipt.subtotal) / receipt.quantity, subtotal: receipt.subtotal, tax_amount: receipt.tax_amount }];
  const tenders = tendersResult.data ?? [];
  return <div className="page-stack">
    <div className="receipt-toolbar"><Link className="text-button" href="/pos">← Kembali ke Point of Sale</Link><PrintButton /></div>
    <article className="section-card printable-receipt">
      <header className="receipt-heading"><p className="eyebrow">SALES RECEIPT</p><h1>Kopi Sela Kota</h1><p>Tebet, Jakarta</p><span className="demo-status">Paid</span></header>
      <dl className="receipt-meta"><div><dt>Reference</dt><dd>{receipt.number}</dd></div><div><dt>Date &amp; Time</dt><dd>{new Date(receipt.sold_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</dd></div><div><dt>POS Session</dt><dd>{receipt.session_number}</dd></div><div><dt>Customer</dt><dd>{receipt.customer_id ?? "Pembeli umum"}</dd></div>{holdNumber ? <div><dt>Order on Hold</dt><dd>{holdNumber}</dd></div> : null}</dl>
      <div className="table-scroll"><table><thead><tr><th scope="col">Product</th><th scope="col">Qty</th><th scope="col">Unit Price</th><th scope="col">Subtotal</th><th scope="col">PBJT</th></tr></thead><tbody>{lines.map((line) => <tr key={line.sku}><td>{line.sku}</td><td>{line.quantity}</td><td>{formatRupiah(Number(line.unit_price))}</td><td>{formatRupiah(Number(line.subtotal))}</td><td>{formatRupiah(Number(line.tax_amount))}</td></tr>)}</tbody></table></div>
      <dl className="cart-summary"><div><dt>Subtotal</dt><dd>{formatRupiah(Number(receipt.subtotal))}</dd></div><div><dt>PBJT 10%</dt><dd>{formatRupiah(Number(receipt.tax_amount))}</dd></div><div><dt>Total</dt><dd>{formatRupiah(Number(receipt.total))}</dd></div></dl>
      <h2>Payments</h2>{tenders.length === 0 ? <p role="alert">Rincian tender belum tersedia di database. Periksa transaksi ini sebelum memakai struk sebagai bukti pembayaran.</p> : null}<dl className="receipt-meta">{tenders.map((tender) => <div key={tender.payment_method}><dt>{tender.payment_method === "CASH" ? "Cash" : tender.payment_method === "BANK" ? "Bank" : tender.payment_method}</dt><dd>{formatRupiah(Number(tender.amount))}</dd></div>)}</dl>
      <p className="muted-copy">Terima kasih. Struk ini adalah bukti penjualan POS yang telah dibukukan.</p>
    </article>
  </div>;
}
