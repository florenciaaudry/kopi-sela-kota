"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";

import {
  createInitialDemoState,
  demoCustomers,
  demoVendors,
  isDemoState,
  type DemoState,
} from "@/lib/demo-data";
import { formatRupiah, parseRupiahInput } from "@/lib/format";
import { applicationAccess } from "@/lib/roles";
import { CurrencyInput } from "./currency-input";

export type DemoModule =
  | "dashboard"
  | "sales"
  | "crm"
  | "purchase"
  | "inventory"
  | "accounting"
  | "invoicing"
  | "pos"
  | "returns";

const storageKey = "kopi-sela-erp-demo-v1";
const taxRate = 0.1;
const serverDemoSnapshot = createInitialDemoState();
const demoListeners = new Set<() => void>();
let cachedDemoRaw: string | null | undefined;
let cachedDemoState = serverDemoSnapshot;
let demoSnapshotError = "";

function getDemoSnapshot(): DemoState {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === cachedDemoRaw) return cachedDemoState;
    cachedDemoRaw = raw;
    if (!raw) {
      cachedDemoState = createInitialDemoState();
      demoSnapshotError = "";
      return cachedDemoState;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isDemoState(parsed)) {
      throw new Error("Format data demo lokal tidak dikenali. Reset demo untuk memulai ulang.");
    }
    cachedDemoState = parsed;
    demoSnapshotError = "";
    return cachedDemoState;
  } catch (snapshotError) {
    demoSnapshotError = snapshotError instanceof Error
      ? snapshotError.message
      : "Data demo lokal gagal dibaca.";
    cachedDemoRaw = undefined;
    return serverDemoSnapshot;
  }
}

function subscribeToDemo(listener: () => void) {
  demoListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    demoListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function publishDemoChange() {
  cachedDemoRaw = undefined;
  for (const listener of demoListeners) listener();
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function quantityField(form: FormData, name = "quantity"): number {
  const value = Number(field(form, name));
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Jumlah harus berupa bilangan bulat lebih besar dari nol.");
  }
  return value;
}

function moneyField(form: FormData, name = "amount"): number {
  return parseRupiahInput(field(form, name), { label: "Nilai pembayaran" });
}

function lineAmounts(quantity: number, price: number, discount: number) {
  const subtotal = Math.round(quantity * price * (1 - discount / 100));
  return { subtotal, tax: Math.round(subtotal * taxRate) };
}

function customerName(id: string): string {
  return demoCustomers.find((customer) => customer.id === id)?.name ?? id;
}

function vendorName(id: string): string {
  return demoVendors.find((vendor) => vendor.id === id)?.name ?? id;
}

function getProduct(state: DemoState, sku: string) {
  const product = state.products.find((item) => item.sku === sku);
  if (!product) {
    throw new Error(`SKU ${sku} tidak ditemukan.`);
  }
  return product;
}

function getOrder(state: DemoState, number: string) {
  const order = state.salesOrders.find((item) => item.number === number);
  if (!order) {
    throw new Error("Sales Order tidak ditemukan.");
  }
  return order;
}

function getPurchaseOrder(state: DemoState, number: string) {
  const order = state.purchaseOrders.find((item) => item.number === number);
  if (!order) {
    throw new Error("Purchase Order tidak ditemukan.");
  }
  return order;
}

function addJournal(state: DemoState, source: string, memo: string, amount: number) {
  state.journals.unshift({
    number: `JRN/DEMO/${String(state.nextJournal++).padStart(4, "0")}`,
    source,
    memo,
    debit: amount,
    credit: amount,
  });
}

function recordEvent(state: DemoState, text: string) {
  state.events.unshift(`${new Date().toLocaleString("id-ID")} · ${text}`);
  state.events = state.events.slice(0, 12);
}

function PageTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted-copy">{subtitle}</p>
      </div>
      <span className="date-chip">DEMO · Lokal di browser</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section-card demo-panel">
      <div className="section-heading"><h2>{title}</h2></div>
      {children}
    </section>
  );
}

function DemoForm({
  onSubmit,
  children,
  submitLabel,
}: {
  onSubmit: (form: FormData) => void;
  children: ReactNode;
  submitLabel: string;
}) {
  return (
    <form
      className="demo-form"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
    >
      {children}
      <button className="primary-button" type="submit">{submitLabel}</button>
    </form>
  );
}

function SelectField({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children: ReactNode;
}) {
  return (
    <label className="demo-field">
      <span>{label}</span>
      <select defaultValue="" name={name} required>
        {children}
      </select>
    </label>
  );
}

function NumberField({
  label,
  name = "quantity",
  min = 1,
  max,
  defaultValue,
}: {
  label: string;
  name?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
}) {
  return (
    <label className="demo-field">
      <span>{label}</span>
      <input
        defaultValue={defaultValue}
        max={max}
        min={min}
        name={name}
        required
        type="number"
      />
    </label>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
          )) : <tr><td className="demo-empty" colSpan={headers.length}>Belum ada transaksi pada demo ini.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return <span className="demo-status">{children}</span>;
}

export function DemoWorkspace({ module }: { module: DemoModule }) {
  const state = useSyncExternalStore(
    subscribeToDemo,
    getDemoSnapshot,
    () => serverDemoSnapshot,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function perform(operation: (draft: DemoState) => void, success: string) {
    try {
      const draft = structuredClone(state);
      operation(draft);
      window.localStorage.setItem(storageKey, JSON.stringify(draft));
      publishDemoChange();
      setError("");
      setMessage(success);
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "Transaksi demo gagal.");
      setMessage("");
    }
  }

  function resetDemo() {
    if (!window.confirm("Reset seluruh perubahan demo di browser ini ke baseline awal?")) {
      return;
    }
    const initial = createInitialDemoState();
    try {
      window.localStorage.removeItem(storageKey);
      cachedDemoState = initial;
      publishDemoChange();
      setError("");
      setMessage("Demo direset ke fixture baseline.");
    } catch {
      setError("Data demo gagal direset dari penyimpanan browser.");
    }
  }

  const stockUnits = state.products.reduce((sum, product) => sum + product.wh + product.cafe, 0);
  const inventoryValue = state.products.reduce(
    (sum, product) => sum + (product.wh + product.cafe) * product.cost,
    0,
  );
  const receivables = state.invoices.reduce(
    (sum, invoice) => sum + invoice.subtotal + invoice.tax - invoice.paid - (invoice.credited ?? 0),
    0,
  );
  const payables = state.bills.reduce((sum, bill) => sum + bill.total - bill.paid, 0);

  function createSalesOrder(draft: DemoState, form: FormData) {
    const customerId = field(form, "customer");
    const sku = field(form, "sku");
    const quantity = quantityField(form);
    const discount = Number(field(form, "discount") || 0);
    const customer = demoCustomers.find((item) => item.id === customerId);
    if (!customer) throw new Error("Pelanggan tidak valid.");
    if (!Number.isFinite(discount) || discount < 0 || discount > 5) {
      throw new Error("Diskon demo maksimal 5%. Diskon lebih dari 5% memerlukan persetujuan Owner.");
    }
    const product = getProduct(draft, sku);
    if (product.wh - product.reserved < quantity) throw new Error("Stok Available WH-TBT tidak mencukupi.");
    const amount = lineAmounts(quantity, product.price, discount);
    const total = amount.subtotal + amount.tax;
    const invoiceExposure = draft.invoices
      .filter((invoice) => invoice.customerId === customerId)
      .reduce((sum, invoice) => sum + invoice.subtotal + invoice.tax - invoice.paid - (invoice.credited ?? 0), 0);
    const openOrderExposure = draft.salesOrders
      .filter((order) => order.customerId === customerId)
      .reduce((sum, order) => {
        const unbilledQuantity = order.quantity - order.invoiced;
        if (unbilledQuantity <= 0) return sum;
        const amounts = lineAmounts(unbilledQuantity, getProduct(draft, order.sku).price, order.discount);
        return sum + amounts.subtotal + amounts.tax;
      }, 0);
    const exposure = invoiceExposure + openOrderExposure;
    if (exposure + total > customer.limit) {
      throw new Error(`Pesanan ditolak: eksposur ${formatRupiah(exposure + total)} melampaui limit ${formatRupiah(customer.limit)}.`);
    }
    const number = `S${String(draft.nextSales++).padStart(5, "0")}`;
    product.reserved += quantity;
    draft.salesOrders.unshift({
      number, customerId, sku, quantity, delivered: 0, invoiced: 0,
      discount, status: "Sales Order", reservationActive: true,
    });
    recordEvent(draft, `${number} dibuat untuk ${customer.name}; ${quantity} ${sku}`);
  }

  function deliverSalesOrder(draft: DemoState, form: FormData) {
    const order = getOrder(draft, field(form, "order"));
    const quantity = quantityField(form);
    const remaining = order.quantity - order.delivered;
    const product = getProduct(draft, order.sku);
    if (quantity > remaining || !order.reservationActive || quantity > product.reserved) {
      throw new Error("Kuantitas pengiriman melebihi sisa pesanan atau reservasi aktif.");
    }
    if (quantity > product.wh) throw new Error("Stok WH-TBT tidak mencukupi.");
    product.wh -= quantity;
    product.reserved -= quantity;
    order.delivered += quantity;
    if (order.delivered === order.quantity) {
      order.status = "Delivered";
      order.reservationActive = false;
    } else {
      order.status = "Partial Delivery";
    }
    const cogs = quantity * product.cost;
    addJournal(draft, `Delivery ${order.number}`, `COGS dan persediaan ${order.sku}`, cogs);
    recordEvent(draft, `${quantity} unit ${order.sku} dikirim dari ${order.number}`);
  }

  function invoiceSalesOrder(draft: DemoState, form: FormData) {
    const order = getOrder(draft, field(form, "order"));
    const quantity = order.delivered - order.invoiced;
    if (quantity <= 0) throw new Error("Belum ada kuantitas Delivered yang dapat ditagih.");
    const product = getProduct(draft, order.sku);
    const amount = lineAmounts(quantity, product.price, order.discount);
    const number = `INV${String(draft.nextInvoice++).padStart(5, "0")}`;
    draft.invoices.unshift({
      number,
      customerId: order.customerId,
      source: order.number,
      sku: order.sku,
      quantity,
      subtotal: amount.subtotal,
      tax: amount.tax,
      paid: 0,
    });
    order.invoiced += quantity;
    if (order.invoiced === order.quantity) order.status = "Invoiced";
    const total = amount.subtotal + amount.tax;
    addJournal(draft, number, "Piutang, pendapatan, PBJT, COGS, dan persediaan", total + quantity * product.cost);
    recordEvent(draft, `${number} dibuat untuk ${quantity} unit Delivered dari ${order.number}`);
  }

  function createPurchaseOrder(draft: DemoState, form: FormData) {
    const vendorId = field(form, "vendor");
    const sku = field(form, "sku");
    const quantity = quantityField(form);
    const vendor = demoVendors.find((item) => item.id === vendorId);
    const product = getProduct(draft, sku);
    if (!vendor || product.vendorId !== vendorId) throw new Error("SKU tidak tersedia pada daftar harga pemasok yang dipilih.");
    const number = `PO${String(draft.nextPurchase++).padStart(5, "0")}`;
    draft.purchaseOrders.unshift({
      number, vendorId, sku, quantity, received: 0, billed: 0,
      unitCost: product.cost, status: "Purchase Order",
    });
    recordEvent(draft, `${number} dibuat untuk ${vendor.name}; stok dan utang belum berubah`);
  }

  function receivePurchaseOrder(draft: DemoState, form: FormData) {
    const order = getPurchaseOrder(draft, field(form, "order"));
    const quantity = quantityField(form, "accepted");
    if (quantity > order.quantity - order.received) throw new Error("Jumlah diterima melebihi sisa kuantitas PO.");
    const product = getProduct(draft, order.sku);
    product.wh += quantity;
    order.received += quantity;
    order.status = order.received === order.quantity ? "Received" : "Partial Receipt";
    addJournal(draft, `Receipt ${order.number}`, "Persediaan diterima / barang belum ditagih", quantity * order.unitCost);
    recordEvent(draft, `${quantity} unit ${order.sku} diterima baik untuk ${order.number}`);
  }

  function createVendorBill(draft: DemoState, form: FormData) {
    const order = getPurchaseOrder(draft, field(form, "order"));
    const quantity = order.received - order.billed;
    if (quantity <= 0) throw new Error("Belum ada barang diterima-baik yang dapat ditagih.");
    const total = quantity * order.unitCost;
    const number = `BILL${String(draft.nextBill++).padStart(5, "0")}`;
    draft.bills.unshift({ number, vendorId: order.vendorId, source: order.number, total, paid: 0 });
    order.billed += quantity;
    addJournal(draft, number, "Barang belum ditagih dipindahkan ke utang usaha", total);
    recordEvent(draft, `${number} diposting senilai ${formatRupiah(total)}`);
  }

  function payDocument(draft: DemoState, form: FormData) {
    const number = field(form, "document");
    const method = field(form, "method");
    const amount = moneyField(form);
    if (method !== "Cash" && method !== "Bank") throw new Error("Pilih metode pembayaran Cash atau Bank.");
    const invoice = draft.invoices.find((item) => item.number === number);
    const bill = draft.bills.find((item) => item.number === number);
    if (!invoice && !bill) throw new Error("Dokumen pembayaran tidak ditemukan.");
    const due = invoice
      ? invoice.subtotal + invoice.tax - invoice.paid - (invoice.credited ?? 0)
      : bill!.total - bill!.paid;
    if (amount > due) throw new Error(`Pembayaran melebihi sisa ${formatRupiah(due)}.`);
    const account = method === "Bank" ? "bank" : "cash";
    if (account === "bank") {
      if (bill && amount > draft.bank) throw new Error("Saldo Bank demo tidak mencukupi.");
      draft.bank += invoice ? amount : -amount;
    } else {
      if (bill && amount > draft.cash) throw new Error("Saldo Kas demo tidak mencukupi.");
      draft.cash += invoice ? amount : -amount;
    }
    if (invoice) invoice.paid += amount;
    if (bill) bill.paid += amount;
    addJournal(draft, `Payment ${number}`, `${method} / ${invoice ? "pelunasan piutang" : "pembayaran utang"}`, amount);
    recordEvent(draft, `${formatRupiah(amount)} ${method} untuk ${number}`);
  }

  function createPosReceipt(draft: DemoState, form: FormData) {
    const sku = field(form, "sku");
    const quantity = quantityField(form);
    const method = field(form, "method");
    const customerId = field(form, "customer") || "C06";
    const customer = demoCustomers.find((item) => item.id === customerId);
    if (!customer) throw new Error("Pelanggan POS tidak valid.");
    const product = getProduct(draft, sku);
    if (product.cafe < quantity) throw new Error("Available CAFE-TBT tidak mencukupi; POS menolak stok negatif.");
    const amount = lineAmounts(quantity, product.price, 0);
    const total = amount.subtotal + amount.tax;
    product.cafe -= quantity;
    if (method === "Cash") {
      draft.cash += total;
      draft.drawer += total;
    } else {
      draft.bank += total;
    }
    const number = `POS/${String(draft.nextReceipt++).padStart(5, "0")}`;
    const receiptNumber = `STRUK-${number.replace("/", "-")}`;
    draft.receipts.unshift({ number, customerId, total, method, sku, quantity });
    draft.invoices.unshift({
      number: receiptNumber,
      customerId,
      source: number,
      sku,
      quantity,
      subtotal: amount.subtotal,
      tax: amount.tax,
      paid: total,
    });
    addJournal(draft, number, `Penjualan POS ${method}; pendapatan, PBJT, dan COGS`, total + quantity * product.cost);
    recordEvent(draft, `${number} lunas ${formatRupiah(total)} via ${method} untuk ${customer.name}`);
  }

  function transferStock(draft: DemoState, form: FormData) {
    const sku = field(form, "sku");
    const quantity = quantityField(form);
    const product = getProduct(draft, sku);
    if (product.wh - product.reserved < quantity) throw new Error("Transfer ditolak: Available WH-TBT tidak mencukupi.");
    product.wh -= quantity;
    product.cafe += quantity;
    const number = `TRF${String(draft.nextTransfer++).padStart(5, "0")}`;
    draft.transfers.unshift({ number, sku, quantity });
    recordEvent(draft, `${number} memindahkan ${quantity} ${sku} ke CAFE-TBT tanpa jurnal`);
  }

  function processReturn(draft: DemoState, form: FormData) {
    const invoiceNumber = field(form, "invoice");
    const quantity = quantityField(form);
    const condition = field(form, "condition");
    if (condition !== "Sealed" && condition !== "Rusak") throw new Error("Pilih kondisi retur yang valid.");
    const invoice = draft.invoices.find((item) => item.number === invoiceNumber);
    if (!invoice || !invoice.sku || !invoice.quantity) throw new Error("Pilih invoice penjualan yang memiliki detail barang.");
    const returned = invoice.returned ?? 0;
    if (quantity > invoice.quantity - returned) throw new Error("Retur melebihi kuantitas yang pernah dijual.");
    const balance = invoice.subtotal + invoice.tax - invoice.paid - (invoice.credited ?? 0);
    const unitTotal = Math.round((invoice.subtotal + invoice.tax) / invoice.quantity);
    const credit = unitTotal * quantity;
    if (credit > balance) throw new Error("Credit Note melebihi piutang tersisa; refund tunai belum tersedia di demo.");
    invoice.returned = returned + quantity;
    invoice.credited = (invoice.credited ?? 0) + credit;
    if (condition === "Sealed") {
      const product = getProduct(draft, invoice.sku);
      product.wh += quantity;
    }
    const number = `CN${String(draft.nextReturn++).padStart(5, "0")}`;
    draft.returns.unshift({ number, source: invoice.number, sku: invoice.sku, quantity, condition, total: credit });
    addJournal(draft, number, `Credit Note; barang ${condition === "Sealed" ? "kembali ke stok" : "rusak, tidak menambah stok"}`, credit);
    recordEvent(draft, `${number} untuk ${invoice.number}; ${quantity} unit ${condition}`);
  }

  function createLead(draft: DemoState, form: FormData) {
    const customerId = field(form, "customer");
    const sku = field(form, "sku");
    const quantity = quantityField(form);
    const probability = Number(field(form, "probability"));
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) throw new Error("Probabilitas harus 0–100%.");
    const product = getProduct(draft, sku);
    const number = `L${String(draft.nextLead++).padStart(5, "0")}`;
    draft.leads.unshift({
      number, customerId, sku, quantity, stage: "New",
      expected: quantity * product.price, probability,
    });
    recordEvent(draft, `Lead ${number} dibuat; nilai tertimbang ${formatRupiah(quantity * product.price * probability / 100)}`);
  }

  function changeLead(draft: DemoState, form: FormData) {
    const lead = draft.leads.find((item) => item.number === field(form, "lead"));
    if (!lead) throw new Error("Lead tidak ditemukan.");
    const stage = field(form, "stage");
    const reason = field(form, "reason").trim();
    if (stage === "Lost" && !reason) throw new Error("Alasan wajib diisi untuk status Lost.");
    lead.stage = stage;
    if (stage === "Lost") lead.lostReason = reason;
    recordEvent(draft, `${lead.number} berubah ke ${stage}${reason ? `: ${reason}` : ""}`);
  }

  const productOptions = state.products.map((product) => (
    <option key={product.sku} value={product.sku}>{product.sku} · {product.name} ({product.size})</option>
  ));
  const pageTitles: Record<DemoModule, { eyebrow: string; title: string; subtitle: string }> = {
    dashboard: { eyebrow: "KOPI SELA KOTA / OVERVIEW", title: "Ringkasan operasional", subtitle: "Snapshot fixture awal dan aktivitas demo yang tersimpan di browser ini." },
    sales: { eyebrow: "SALES / ORDER MANAGEMENT", title: "Pesanan penjualan", subtitle: "Buat Sales Order, kirim sesuai reservasi, lalu tagih kuantitas Delivered." },
    crm: { eyebrow: "CRM / PIPELINE", title: "Peluang pelanggan", subtitle: "Kelola tahapan lead dan alasan kehilangan secara sederhana." },
    purchase: { eyebrow: "PURCHASE / RECEIVING", title: "Pengadaan & penerimaan", subtitle: "PO tidak mengubah stok atau utang sampai barang diterima dan ditagih." },
    inventory: { eyebrow: "INVENTORY / STOCK", title: "Produk & stok", subtitle: "Saldo per SKU dan lokasi; transfer menghormati reservasi aktif." },
    accounting: { eyebrow: "ACCOUNTING / GENERAL LEDGER", title: "Jurnal & posisi keuangan", subtitle: "Jurnal simulasi untuk alur demo; bukan buku besar database." },
    invoicing: { eyebrow: "INVOICING / PAYMENTS", title: "Faktur & pembayaran", subtitle: "Tagih barang yang terkirim dan bayar tidak lebih dari saldo dokumen." },
    pos: { eyebrow: "POINT OF SALE / TEBET", title: "Kasir", subtitle: "Penjualan memakai stok CAFE-TBT yang Available dan pembayaran Cash atau Bank." },
    returns: { eyebrow: "RETURNS / CREDIT NOTES", title: "Retur pelanggan", subtitle: "Credit Note dibatasi kuantitas terjual; barang rusak tidak menambah stok." },
  };
  const title = pageTitles[module];

  return (
    <div className="page-stack">
      <PageTitle {...title} />
      <div className="notice notice-warning demo-notice">
        <strong>MODE DEMO — bukan integrasi database.</strong> Data berasal dari fixture PDF dan perubahan hanya tersimpan di localStorage browser ini. Tidak ada transaksi yang dikirim ke Supabase atau menjadi catatan resmi.{" "}
        <button className="text-button" onClick={resetDemo} type="button">Reset fixture demo</button>
      </div>
      {message ? <div className="notice notice-info" role="status">{message}</div> : null}
      {demoSnapshotError ? <div className="notice notice-error" role="alert">{demoSnapshotError}</div> : null}
      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}

      {module === "dashboard" ? (
        <>
          <div className="metric-grid" id="reporting">
            <article className="metric-card"><span>SKU / stok</span><strong>{state.products.length} SKU · {stockUnits} unit</strong><p>Nilai persediaan {formatRupiah(inventoryValue)}</p></article>
            <article className="metric-card"><span>Piutang terbuka</span><strong>{formatRupiah(receivables)}</strong><p>Saldo awal dan invoice demo</p></article>
            <article className="metric-card"><span>Utang terbuka</span><strong>{formatRupiah(payables)}</strong><p>Saldo awal dan bill demo</p></article>
            <article className="metric-card"><span>Kas / Bank</span><strong>{formatRupiah(state.cash)} / {formatRupiah(state.bank)}</strong><p>Laci kas {formatRupiah(state.drawer)}</p></article>
          </div>
          <Panel title="Aplikasi demo · 7 aplikasi / 4 modul">
            {(["Komersial", "Rantai pasok", "Keuangan", "Kasir"] as const).map((group) => (
              <div className="application-group" key={group}>
                <h3>{group}</h3>
                <div className="demo-module-grid">
                  {applicationAccess.filter((app) => app.group === group).map((app) => (
                    app.href ? (
                      <Link className="demo-module-card" href={app.href} key={app.name}>
                        <strong>{app.name}</strong><span>Buka workspace →</span>
                      </Link>
                    ) : null
                  ))}
                </div>
              </div>
            ))}
          </Panel>
          <Panel title="Kapabilitas lintas modul">
            <p className="muted-copy">Retur dan Credit Note menghubungkan pemeriksaan Inventory dengan koreksi Invoicing.</p>
            <Link className="secondary-button" href="/returns">Buka Retur &amp; Credit Note</Link>
          </Panel>
          <Panel title="Aktivitas demo terbaru">
            <ul className="demo-event-list">{state.events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}</ul>
          </Panel>
        </>
      ) : null}

      {module === "sales" ? (
        <>
          <Panel title="Buat Sales Order">
            <DemoForm onSubmit={(form) => perform((draft) => createSalesOrder(draft, form), "Sales Order demo dibuat dan stok direservasi.")} submitLabel="Buat Sales Order">
              <SelectField label="Pelanggan" name="customer"><option value="">Pilih pelanggan</option>{demoCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.id} · {customer.name} · limit {formatRupiah(customer.limit)}</option>)}</SelectField>
              <SelectField label="Produk" name="sku"><option value="">Pilih produk</option>{productOptions}</SelectField>
              <NumberField label="Jumlah" />
              <NumberField label="Diskon (%) · maksimal 5" name="discount" min={0} max={5} defaultValue={0} />
            </DemoForm>
          </Panel>
          <Panel title="Sales Order & pengiriman">
            <DataTable headers={["Nomor", "Pelanggan", "SKU", "Pesan", "Delivered", "Ditagih", "Status", "Aksi"]} rows={state.salesOrders.map((order) => [
              <strong className="sku-cell" key="no">{order.number}</strong>,
              customerName(order.customerId), order.sku, order.quantity, order.delivered, order.invoiced,
              <Status key="status">{order.status}</Status>,
              <div className="inline-actions" key="actions">
                <DemoForm onSubmit={(form) => perform((draft) => deliverSalesOrder(draft, withField(form, "order", order.number)), "Delivery dicatat di demo.")} submitLabel="Kirim">
                  <NumberField label="Kirim qty" name="quantity" max={Math.max(1, order.quantity - order.delivered)} defaultValue={Math.max(1, order.quantity - order.delivered)} />
                </DemoForm>
                <button className="secondary-button compact-button" disabled={order.delivered <= order.invoiced} onClick={() => perform((draft) => invoiceSalesOrder(draft, withField(new FormData(), "order", order.number)), "Invoice demo dibuat dari kuantitas Delivered.")} type="button">Buat Invoice</button>
              </div>,
            ])} />
          </Panel>
        </>
      ) : null}

      {module === "crm" ? (
        <>
          <Panel title="Catat peluang baru">
            <DemoForm onSubmit={(form) => perform((draft) => createLead(draft, form), "Lead demo ditambahkan ke pipeline.")} submitLabel="Buat lead">
              <SelectField label="Pelanggan" name="customer"><option value="">Pilih pelanggan</option>{demoCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.id} · {customer.name}</option>)}</SelectField>
              <SelectField label="Produk" name="sku"><option value="">Pilih produk</option>{productOptions}</SelectField>
              <NumberField label="Jumlah" />
              <NumberField label="Probabilitas (%)" name="probability" min={0} max={100} defaultValue={40} />
            </DemoForm>
          </Panel>
          <Panel title="Pipeline">
            <DataTable headers={["Lead", "Pelanggan", "Produk", "Qty", "Tahap", "Nilai harapan", "Tertimbang", "Perbarui tahap"]} rows={state.leads.map((lead) => [
              <strong className="sku-cell" key="no">{lead.number}</strong>, customerName(lead.customerId), lead.sku, lead.quantity,
              <span key="stage">{lead.stage}{lead.lostReason ? ` · ${lead.lostReason}` : ""}</span>,
              formatRupiah(lead.expected), formatRupiah(lead.expected * lead.probability / 100),
              <DemoForm key="update" onSubmit={(form) => perform((draft) => changeLead(draft, withField(form, "lead", lead.number)), `Tahap ${lead.number} diperbarui.`)} submitLabel="Simpan">
                <SelectField label="Tahap" name="stage"><option>New</option><option>Qualified</option><option>Proposition</option><option>Won</option><option>Lost</option></SelectField>
                <label className="demo-field"><span>Alasan jika Lost</span><input name="reason" /></label>
              </DemoForm>,
            ])} />
          </Panel>
        </>
      ) : null}

      {module === "purchase" ? (
        <>
          <Panel title="Buat Purchase Order">
            <DemoForm onSubmit={(form) => perform((draft) => createPurchaseOrder(draft, form), "Purchase Order demo dibuat; stok dan utang tidak berubah.")} submitLabel="Buat PO">
              <SelectField label="Pemasok" name="vendor"><option value="">Pilih pemasok</option>{demoVendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.id} · {vendor.name}</option>)}</SelectField>
              <SelectField label="Produk" name="sku"><option value="">Pilih produk</option>{productOptions}</SelectField>
              <NumberField label="Jumlah" />
            </DemoForm>
          </Panel>
          <Panel title="PO, penerimaan, dan vendor bill">
            <DataTable headers={["PO", "Pemasok", "SKU", "Pesan", "Diterima", "Ditagih", "Nilai diterima", "Aksi"]} rows={state.purchaseOrders.map((order) => [
              <strong className="sku-cell" key="no">{order.number}</strong>, vendorName(order.vendorId), order.sku,
              order.quantity, order.received, order.billed, formatRupiah(order.received * order.unitCost),
              <div className="inline-actions" key="actions">
                <DemoForm onSubmit={(form) => perform((draft) => receivePurchaseOrder(draft, withField(form, "order", order.number)), "Penerimaan baik menambah stok dan jurnal demo.")} submitLabel="Terima">
                  <NumberField label="Diterima baik" name="accepted" max={Math.max(1, order.quantity - order.received)} defaultValue={Math.max(1, order.quantity - order.received)} />
                </DemoForm>
                <button className="secondary-button compact-button" disabled={order.received <= order.billed} onClick={() => perform((draft) => createVendorBill(draft, withField(new FormData(), "order", order.number)), "Vendor Bill demo diposting sesuai barang diterima-baik.")} type="button">Buat Bill</button>
              </div>,
            ])} />
          </Panel>
        </>
      ) : null}

      {module === "inventory" ? (
        <>
          <div className="metric-grid">
            <article className="metric-card"><span>Total On Hand</span><strong>{stockUnits} unit</strong><p>Seluruh lokasi</p></article>
            <article className="metric-card"><span>Reserved</span><strong>{state.products.reduce((sum, product) => sum + product.reserved, 0)} unit</strong><p>Pesanan penjualan aktif</p></article>
            <article className="metric-card"><span>Available</span><strong>{state.products.reduce((sum, product) => sum + product.wh - product.reserved + product.cafe, 0)} unit</strong><p>Setelah reservasi aktif</p></article>
            <article className="metric-card"><span>Nilai persediaan</span><strong>{formatRupiah(inventoryValue)}</strong><p>Biaya standar demo</p></article>
          </div>
          <Panel title="Transfer WH-TBT → CAFE-TBT">
            <DemoForm onSubmit={(form) => perform((draft) => transferStock(draft, form), "Transfer antar lokasi demo selesai; nilai total stok tidak berubah.")} submitLabel="Transfer stok">
              <SelectField label="Produk" name="sku"><option value="">Pilih produk</option>{productOptions}</SelectField>
              <NumberField label="Jumlah" />
            </DemoForm>
          </Panel>
          <Panel title="Saldo per produk dan lokasi">
            <DataTable headers={["SKU", "Produk", "Ukuran", "WH-TBT", "Reserved", "Available WH", "CAFE-TBT", "Biaya standar", "Nilai total"]} rows={state.products.map((product) => [
              <strong className="sku-cell" key="sku">{product.sku}</strong>, product.name, product.size,
              product.wh, product.reserved, product.wh - product.reserved, product.cafe,
              formatRupiah(product.cost), formatRupiah((product.wh + product.cafe) * product.cost),
            ])} />
          </Panel>
        </>
      ) : null}

      {module === "invoicing" ? (
        <>
          <Panel title="Terima pembayaran pelanggan / bayar pemasok">
            <DemoForm onSubmit={(form) => perform((draft) => payDocument(draft, form), "Pembayaran demo diposting dan saldo diperbarui.")} submitLabel="Posting pembayaran">
              <SelectField label="Dokumen" name="document"><option value="">Pilih invoice atau bill</option>
                <optgroup label="Piutang pelanggan">{state.invoices.filter((invoice) => invoice.subtotal + invoice.tax - invoice.paid - (invoice.credited ?? 0) > 0).map((invoice) => <option key={invoice.number} value={invoice.number}>{invoice.number} · {customerName(invoice.customerId)} · sisa {formatRupiah(invoice.subtotal + invoice.tax - invoice.paid - (invoice.credited ?? 0))}</option>)}</optgroup>
                <optgroup label="Utang pemasok">{state.bills.filter((bill) => bill.total > bill.paid).map((bill) => <option key={bill.number} value={bill.number}>{bill.number} · {vendorName(bill.vendorId)} · sisa {formatRupiah(bill.total - bill.paid)}</option>)}</optgroup>
              </SelectField>
              <CurrencyInput label="Jumlah pembayaran (Rp)" name="amount" />
              <SelectField label="Akun pembayaran" name="method"><option value="">Pilih akun</option><option>Cash</option><option>Bank</option></SelectField>
            </DemoForm>
          </Panel>
          <Panel title="Customer invoices">
            <DataTable headers={["Invoice", "Pelanggan", "Sumber", "Subtotal", "PBJT", "Dibayar", "Credit Note", "Sisa"]} rows={state.invoices.map((invoice) => [
              <strong className="sku-cell" key="no">{invoice.number}</strong>, customerName(invoice.customerId), invoice.source,
              formatRupiah(invoice.subtotal), formatRupiah(invoice.tax), formatRupiah(invoice.paid),
              formatRupiah(invoice.credited ?? 0),
              formatRupiah(invoice.subtotal + invoice.tax - invoice.paid - (invoice.credited ?? 0)),
            ])} />
          </Panel>
          <Panel title="Vendor bills">
            <DataTable headers={["Bill", "Pemasok", "Sumber", "Total", "Dibayar", "Sisa"]} rows={state.bills.map((bill) => [
              <strong className="sku-cell" key="no">{bill.number}</strong>, vendorName(bill.vendorId), bill.source,
              formatRupiah(bill.total), formatRupiah(bill.paid), formatRupiah(bill.total - bill.paid),
            ])} />
          </Panel>
        </>
      ) : null}

      {module === "pos" ? (
        <>
          <div className="metric-grid">
            <article className="metric-card"><span>Loket</span><strong>CAFE-TBT</strong><p>Sesi demo terbuka</p></article>
            <article className="metric-card"><span>Kas perusahaan</span><strong>{formatRupiah(state.cash)}</strong><p>Saldo pembuka Rp500.000</p></article>
            <article className="metric-card"><span>Bank</span><strong>{formatRupiah(state.bank)}</strong><p>Saldo pembuka Rp10.000.000</p></article>
            <article className="metric-card"><span>Uang di laci</span><strong>{formatRupiah(state.drawer)}</strong><p>Modal awal Rp100.000 termasuk Kas</p></article>
          </div>
          <Panel title="Penjualan tunai">
            <DemoForm onSubmit={(form) => perform((draft) => createPosReceipt(draft, form), "Struk lunas demo dibuat; stok CAFE-TBT dan kas/bank diperbarui.")} submitLabel="Bayar & buat struk">
              <SelectField label="Pelanggan" name="customer"><option value="">Pilih pelanggan</option>{demoCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.id} · {customer.name}{customer.limit === 0 ? " · cash" : ""}</option>)}</SelectField>
              <SelectField label="Produk" name="sku"><option value="">Pilih produk</option>{productOptions}</SelectField>
              <NumberField label="Jumlah" />
              <SelectField label="Metode" name="method"><option value="">Pilih metode</option><option>Cash</option><option>Bank</option></SelectField>
            </DemoForm>
          </Panel>
          <Panel title="Struk POS demo">
            <DataTable headers={["Struk", "Pelanggan", "SKU", "Qty", "Metode", "Total lunas"]} rows={state.receipts.map((receipt) => [
              <strong className="sku-cell" key="no">{receipt.number}</strong>, customerName(receipt.customerId || "C06"), receipt.sku, receipt.quantity, receipt.method, formatRupiah(receipt.total),
            ])} />
          </Panel>
        </>
      ) : null}

      {module === "returns" ? (
        <>
          <Panel title="Buat Credit Note">
            <DemoForm onSubmit={(form) => perform((draft) => processReturn(draft, form), "Credit Note demo tercatat; refund tunai tidak dilakukan.")} submitLabel="Buat Credit Note">
              <SelectField label="Invoice penjualan" name="invoice"><option value="">Pilih invoice</option>{state.invoices.filter((invoice) => invoice.sku && invoice.quantity).map((invoice) => <option key={invoice.number} value={invoice.number}>{invoice.number} · {invoice.sku} · {customerName(invoice.customerId)} · sudah retur {invoice.returned ?? 0}/{invoice.quantity}</option>)}</SelectField>
              <NumberField label="Jumlah retur" />
              <SelectField label="Kondisi barang" name="condition"><option value="">Pilih kondisi</option><option>Sealed</option><option>Rusak</option></SelectField>
            </DemoForm>
          </Panel>
          <Panel title="Credit Notes">
            <DataTable headers={["Credit Note", "Invoice sumber", "SKU", "Qty", "Kondisi", "Nilai"]} rows={state.returns.map((item) => [
              <strong className="sku-cell" key="no">{item.number}</strong>, item.source, item.sku, item.quantity, item.condition, formatRupiah(item.total),
            ])} />
          </Panel>
        </>
      ) : null}

      {module === "accounting" ? (
        <>
          <div className="metric-grid">
            <article className="metric-card"><span>Kas</span><strong>{formatRupiah(state.cash)}</strong><p>Akun 1101</p></article>
            <article className="metric-card"><span>Bank</span><strong>{formatRupiah(state.bank)}</strong><p>Akun 1102</p></article>
            <article className="metric-card"><span>Piutang</span><strong>{formatRupiah(receivables)}</strong><p>Akun 1201</p></article>
            <article className="metric-card"><span>Utang</span><strong>{formatRupiah(payables)}</strong><p>Akun 2101</p></article>
          </div>
          <Panel title="Jurnal demo">
            <p className="muted-copy demo-caption">Jurnal ini merupakan ringkasan simulasi. Tidak ada entri yang diposting ke buku besar Supabase.</p>
            <DataTable headers={["Nomor", "Sumber", "Memo", "Debit", "Kredit", "Status"]} rows={state.journals.map((journal) => [
              <strong className="sku-cell" key="no">{journal.number}</strong>, journal.source, journal.memo,
              formatRupiah(journal.debit), formatRupiah(journal.credit), <Status key="status">Seimbang · demo</Status>,
            ])} />
          </Panel>
        </>
      ) : null}
    </div>
  );

}

function withField(form: FormData, name: string, value: string) {
  const clone = new FormData();
  form.forEach((entry, key) => clone.append(key, entry));
  clone.set(name, value);
  return clone;
}
