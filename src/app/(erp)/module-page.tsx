import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth";
import { formatRupiah } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/runtime-mode";

import {
  approvePosVarianceAction,
  cancelPosHoldAction,
  closePosSessionAction,
  completePosHoldAction,
  createCreditNoteAction,
  createInvoiceAction,
  createLeadAction,
  createPosSaleAction,
  createPosHoldAction,
  createPurchaseOrderAction,
  createSalesOrderAction,
  createVendorBillAction,
  deliverSalesOrderAction,
  expirePosHoldsAction,
  openPosSessionAction,
  receivePurchaseOrderAction,
  recordCustomerPaymentAction,
  recordVendorPaymentAction,
  updateLeadStageAction,
} from "./module-actions";
import { DemoWorkspace, type DemoModule } from "./demo-workspace";

type Module = Exclude<DemoModule, "dashboard" | "inventory">;
type Option = { value: string; label: string };
type Message = { error?: string; success?: string };

function PageTitle({ module }: { module: Module }) {
  const title: Record<Module, string> = {
    sales: "Sales",
    crm: "CRM",
    purchase: "Purchase & Receiving",
    accounting: "Accounting",
    invoicing: "Invoicing",
    pos: "Point of Sale",
    returns: "Retur & Credit Note",
  };
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">KOPI SELA KOTA / {module.toUpperCase()}</p>
        <h1>{title[module]}</h1>
        <p className="muted-copy">Transaksi dan status dibaca dari Supabase; perubahan diposting melalui RPC atomik.</p>
      </div>
      <span className="date-chip">Supabase · live</span>
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

function Form({
  action,
  children,
  submitLabel,
  idempotent = true,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  submitLabel: string;
  idempotent?: boolean;
}) {
  return (
    <form action={action} className="demo-form">
      {idempotent ? <input name="idempotency_key" type="hidden" value={crypto.randomUUID()} /> : null}
      {children}
      <button className="primary-button" type="submit">{submitLabel}</button>
    </form>
  );
}

function Select({
  label,
  name,
  options,
  required = true,
}: {
  label: string;
  name: string;
  options: Option[];
  required?: boolean;
}) {
  return (
    <label className="demo-field">
      <span>{label}</span>
      <select defaultValue="" name={name} required={required}>
        <option disabled value="">Pilih…</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function NumberInput({
  label,
  name,
  min = 1,
  step = 1,
  defaultValue,
  required = true,
}: {
  label: string;
  name: string;
  min?: number;
  step?: number;
  defaultValue?: number;
  required?: boolean;
}) {
  return (
    <label className="demo-field">
      <span>{label}</span>
      <input
        defaultValue={defaultValue}
        min={min}
        name={name}
        required={required}
        step={step}
        type="number"
      />
    </label>
  );
}

function TextInput({ label, name, required = true }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="demo-field">
      <span>{label}</span>
      <input name={name} required={required} type="text" />
    </label>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  if (rows.length === 0) return <p className="muted-copy">Belum ada data.</p>;
  return (
    <div className="table-scroll">
      <table>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${String(row[0])}-${index}`}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MessageBanner({ message }: { message?: Message }) {
  if (message?.error) {
    return <section className="notice notice-error" role="alert"><strong>Transaksi gagal.</strong><p>{message.error}</p></section>;
  }
  if (message?.success) {
    return <section className="notice notice-info" role="status">{message.success}</section>;
  }
  return null;
}

function money(value: number) {
  return formatRupiah(Number(value));
}

function option(value: string, label: string): Option {
  return { value, label };
}

function DataLoadError({ error }: { error: string }) {
  return (
    <section className="notice notice-error" role="alert">
      <strong>Data Supabase gagal dimuat.</strong>
      <p>{error}</p>
      <p>Periksa status migrasi dan kebijakan akses; aplikasi tidak mengganti error dengan data demo.</p>
    </section>
  );
}

export async function ModulePage({
  module,
  searchParams,
}: {
  module: Module;
  searchParams?: Promise<Message>;
}) {
  if (isDemoMode()) return <DemoWorkspace module={module} />;

  const message = searchParams ? await searchParams : undefined;
  const roleMap = {
    sales: ["sales", "warehouse", "owner"],
    crm: ["sales", "owner"],
    purchase: ["procurement", "warehouse", "owner"],
    accounting: ["finance", "owner"],
    invoicing: ["finance", "owner"],
    pos: ["cashier", "owner"],
    returns: ["warehouse", "finance", "owner"],
  } as const;
  await requireRole([...roleMap[module]]);
  const supabase = await createSupabaseServerClient();

  if (module === "sales") {
    const [customers, products, orders, deliveries] = await Promise.all([
      supabase.from("customers").select("id, name, credit_limit").order("name"),
      supabase.from("products").select("sku, name, sales_price").order("sku"),
      supabase.from("sales_orders").select("number, customer_id, status, total, order_date").order("created_at", { ascending: false }),
      supabase.from("delivery_notes").select("number, sales_order_number, delivered_at").order("delivered_at", { ascending: false }),
    ]);
    const error = customers.error ?? products.error ?? orders.error ?? deliveries.error;
    if (error) return <DataLoadError error={error.message} />;
    if (!customers.data || !products.data || !orders.data || !deliveries.data) {
      return <DataLoadError error="Database mengembalikan data Sales yang tidak lengkap." />;
    }
    const customerNames = new Map(customers.data.map((item) => [item.id, item.name]));
    const orderOptions = orders.data
      .filter((item) => ["Sales Order", "Partial Delivery"].includes(item.status))
      .map((item) => option(item.number, `${item.number} · ${item.status}`));
    return (
      <div className="page-stack">
        <PageTitle module={module} /><MessageBanner message={message} />
        <Panel title="Buat Sales Order">
          <Form action={createSalesOrderAction} submitLabel="Simpan Sales Order">
            <Select label="Pelanggan" name="customer_id" options={customers.data.map((item) => option(item.id, `${item.id} · ${item.name} · limit ${money(item.credit_limit)}`))} />
            <Select label="Produk" name="sku" options={products.data.map((item) => option(item.sku, `${item.sku} · ${item.name} · ${money(item.sales_price)}`))} />
            <NumberInput label="Kuantitas" name="quantity" />
            <NumberInput label="Diskon (%) · maksimal 5%" min={0} name="discount_percent" step={0.01} defaultValue={0} />
            <TextInput label="Lead sumber (opsional)" name="source_lead_number" required={false} />
          </Form>
        </Panel>
        <Panel title="Pengiriman dari Sales Order">
          <Form action={deliverSalesOrderAction} submitLabel="Posting pengiriman">
            <Select label="Sales Order" name="sales_order_number" options={orderOptions} />
            <NumberInput label="Kuantitas terkirim" name="quantity" />
          </Form>
        </Panel>
        <Panel title="Sales Order">
          <DataTable headers={["Nomor", "Pelanggan", "Tanggal", "Status", "Total"]} rows={orders.data.map((item) => [
            item.number, `${item.customer_id} · ${customerNames.get(item.customer_id) ?? "—"}`, item.order_date, item.status, money(item.total),
          ])} />
        </Panel>
        <Panel title="Delivery">
          <DataTable headers={["Nomor", "Sales Order", "Dibuat"]} rows={deliveries.data.map((item) => [item.number, item.sales_order_number, new Date(item.delivered_at).toLocaleString("id-ID")])} />
        </Panel>
      </div>
    );
  }

  if (module === "crm") {
    const [customers, products, leads] = await Promise.all([
      supabase.from("customers").select("id, name").order("name"),
      supabase.from("products").select("sku, name, sales_price").order("sku"),
      supabase.from("leads").select("number, customer_id, sku, quantity, stage, expected_revenue, probability_percent, lost_reason").order("created_at", { ascending: false }),
    ]);
    const error = customers.error ?? products.error ?? leads.error;
    if (error) return <DataLoadError error={error.message} />;
    if (!customers.data || !products.data || !leads.data) {
      return <DataLoadError error="Database mengembalikan data CRM yang tidak lengkap." />;
    }
    const customerNames = new Map(customers.data.map((item) => [item.id, item.name]));
    const productNames = new Map(products.data.map((item) => [item.sku, item.name]));
    const leadOptions = leads.data.map((item) => option(item.number, `${item.number} · ${item.stage}`));
    return (
      <div className="page-stack">
        <PageTitle module={module} /><MessageBanner message={message} />
        <Panel title="Buat Lead">
          <Form action={createLeadAction} submitLabel="Simpan Lead">
            <Select label="Pelanggan" name="customer_id" options={customers.data.map((item) => option(item.id, `${item.id} · ${item.name}`))} />
            <Select label="Produk" name="sku" options={products.data.map((item) => option(item.sku, `${item.sku} · ${item.name}`))} />
            <NumberInput label="Kuantitas" name="quantity" />
            <NumberInput label="Probabilitas (%)" min={0} name="probability" step={1} defaultValue={0} />
          </Form>
        </Panel>
        <Panel title="Perbarui tahap">
          <Form action={updateLeadStageAction} submitLabel="Simpan tahap" idempotent={false}>
            <Select label="Lead" name="lead_number" options={leadOptions} />
            <Select label="Tahap" name="stage" options={["New", "Qualified", "Proposition", "Won", "Lost"].map((stage) => option(stage, stage))} />
            <TextInput label="Alasan Lost (wajib saat Lost)" name="lost_reason" required={false} />
          </Form>
        </Panel>
        <Panel title="Pipeline Lead">
          <DataTable headers={["Nomor", "Pelanggan", "Produk", "Qty", "Tahap", "Revenue", "Probabilitas", "Alasan Lost"]} rows={leads.data.map((item) => [
            item.number, `${item.customer_id} · ${customerNames.get(item.customer_id) ?? "—"}`,
            `${item.sku} · ${productNames.get(item.sku) ?? "—"}`, item.quantity, item.stage,
            money(item.expected_revenue), `${item.probability_percent}%`, item.lost_reason ?? "—",
          ])} />
        </Panel>
      </div>
    );
  }

  if (module === "purchase") {
    const [vendors, prices, products, orders, receipts] = await Promise.all([
      supabase.from("vendors").select("id, name").order("name"),
      supabase.from("vendor_pricelist").select("vendor_id, sku, minimum_quantity, purchase_price").order("sku"),
      supabase.from("products").select("sku, name").order("sku"),
      supabase.from("purchase_orders").select("number, vendor_id, status, total").order("created_at", { ascending: false }),
      supabase.from("goods_receipts").select("number, purchase_order_number, received_at").order("received_at", { ascending: false }),
    ]);
    const error = vendors.error ?? prices.error ?? products.error ?? orders.error ?? receipts.error;
    if (error) return <DataLoadError error={error.message} />;
    if (!vendors.data || !prices.data || !products.data || !orders.data || !receipts.data) {
      return <DataLoadError error="Database mengembalikan data Purchase yang tidak lengkap." />;
    }
    const vendorNames = new Map(vendors.data.map((item) => [item.id, item.name]));
    const productNames = new Map(products.data.map((item) => [item.sku, item.name]));
    return (
      <div className="page-stack">
        <PageTitle module={module} /><MessageBanner message={message} />
        <Panel title="Buat Purchase Order">
          <Form action={createPurchaseOrderAction} submitLabel="Simpan Purchase Order">
            <Select label="Pemasok" name="vendor_id" options={vendors.data.map((item) => option(item.id, `${item.id} · ${item.name}`))} />
            <Select label="Produk pada daftar harga" name="sku" options={prices.data.map((item) => option(item.sku, `${item.vendor_id} · ${item.sku} · minimum ${item.minimum_quantity} · ${money(item.purchase_price)}`))} />
            <NumberInput label="Kuantitas" name="quantity" />
          </Form>
        </Panel>
        <Panel title="Penerimaan barang">
          <Form action={receivePurchaseOrderAction} submitLabel="Posting penerimaan">
            <Select label="Purchase Order" name="purchase_order_number" options={orders.data.filter((item) => ["Purchase Order", "Partial Receipt"].includes(item.status)).map((item) => option(item.number, `${item.number} · ${item.status}`))} />
            <NumberInput label="Diterima baik" name="accepted_quantity" min={0} defaultValue={0} />
            <NumberInput label="Ditolak" name="rejected_quantity" min={0} defaultValue={0} />
          </Form>
        </Panel>
        <Panel title="Purchase Order">
          <DataTable headers={["Nomor", "Pemasok", "Status", "Total"]} rows={orders.data.map((item) => [
            item.number, `${item.vendor_id} · ${vendorNames.get(item.vendor_id) ?? "—"}`, item.status, money(item.total),
          ])} />
        </Panel>
        <Panel title="Goods Receipt">
          <DataTable headers={["Nomor", "Purchase Order", "Diterima"]} rows={receipts.data.map((item) => [item.number, item.purchase_order_number, new Date(item.received_at).toLocaleString("id-ID")])} />
          <p className="muted-copy">Produk referensi: {products.data.map((item) => `${item.sku} ${productNames.get(item.sku) ?? ""}`).join(" · ")}</p>
        </Panel>
      </div>
    );
  }

  if (module === "accounting") {
    const [dashboard, journals, accounts, lines] = await Promise.all([
      supabase.rpc("get_owner_dashboard"),
      supabase.from("journal_entries").select("id, number, entry_date, source_type, source_reference, memo, status").order("entry_date", { ascending: false }).limit(50),
      supabase.from("chart_of_accounts").select("code, name").order("code"),
      supabase.from("journal_lines").select("journal_entry_id, account_code, debit, credit"),
    ]);
    const error = dashboard.error ?? journals.error ?? accounts.error ?? lines.error;
    if (error) return <DataLoadError error={error.message} />;
    const totals = dashboard.data;
    if (!totals || !journals.data || !accounts.data || !lines.data) {
      return <DataLoadError error="Database mengembalikan laporan Accounting yang tidak lengkap." />;
    }
    const accountNames = new Map(accounts.data.map((item) => [item.code, item.name]));
    const linesByJournal = new Map<string, string[]>();
    for (const line of lines.data) {
      const current = linesByJournal.get(line.journal_entry_id) ?? [];
      current.push(`${line.account_code} ${accountNames.get(line.account_code) ?? ""}: D ${money(line.debit)} / K ${money(line.credit)}`);
      linesByJournal.set(line.journal_entry_id, current);
    }
    return (
      <div className="page-stack">
        <PageTitle module={module} /><MessageBanner message={message} />
        <section className="metric-grid">
          {[
            ["Piutang", totals.receivables], ["Utang", totals.payables],
            ["Kas", totals.cash], ["Bank", totals.bank],
            ["Nilai persediaan", totals.inventory_value], ["Unit On Hand", totals.on_hand],
          ].map(([label, amount]) => (
            <article className="metric-card" key={String(label)}>
              <span>{label}</span><strong>{label === "Unit On Hand" ? Number(amount).toLocaleString("id-ID") : money(Number(amount))}</strong>
            </article>
          ))}
        </section>
        <Panel title="Jurnal terposting">
          <DataTable headers={["Nomor", "Tanggal", "Sumber", "Memo", "Rincian debit/kredit"]} rows={journals.data.map((item) => [
            item.number, item.entry_date, `${item.source_type} · ${item.source_reference}`, item.memo,
            (linesByJournal.get(item.id) ?? []).join(" | "),
          ])} />
        </Panel>
        <p className="muted-copy">Jurnal dibaca saja dari alur transaksi; pencatatan manual belum dibuka.</p>
      </div>
    );
  }

  if (module === "invoicing") {
    const [invoices, customerPayments, orders, bills, vendorPayments, purchaseOrders] = await Promise.all([
      supabase.from("customer_invoices").select("number, customer_id, source_document, status, due_date, total, amount_paid, amount_credited").order("due_date"),
      supabase.from("customer_payments").select("number, invoice_number, amount, account_code, paid_at").order("paid_at", { ascending: false }),
      supabase.from("sales_orders").select("number, status").order("created_at", { ascending: false }),
      supabase.from("vendor_bills").select("number, vendor_id, source_document, status, due_date, total, amount_paid").order("due_date"),
      supabase.from("vendor_payments").select("number, bill_number, amount, account_code, paid_at").order("paid_at", { ascending: false }),
      supabase.from("purchase_orders").select("number, status").order("created_at", { ascending: false }),
    ]);
    const error = invoices.error ?? customerPayments.error ?? orders.error ?? bills.error ?? vendorPayments.error ?? purchaseOrders.error;
    if (error) return <DataLoadError error={error.message} />;
    if (!invoices.data || !customerPayments.data || !orders.data || !bills.data || !vendorPayments.data || !purchaseOrders.data) {
      return <DataLoadError error="Database mengembalikan data Invoicing yang tidak lengkap." />;
    }
    const openInvoices = invoices.data.filter((item) => item.total - item.amount_paid - item.amount_credited > 0);
    const openBills = bills.data.filter((item) => item.total - item.amount_paid > 0);
    return (
      <div className="page-stack">
        <PageTitle module={module} /><MessageBanner message={message} />
        <Panel title="Terbitkan invoice untuk delivery">
          <Form action={createInvoiceAction} submitLabel="Posting invoice">
            <Select label="Sales Order" name="sales_order_number" options={orders.data.filter((item) => ["Delivered", "Partial Delivery"].includes(item.status)).map((item) => option(item.number, `${item.number} · ${item.status}`))} />
          </Form>
        </Panel>
        <Panel title="Catat pembayaran pelanggan">
          <Form action={recordCustomerPaymentAction} submitLabel="Posting pembayaran">
            <Select label="Invoice" name="invoice_number" options={openInvoices.map((item) => option(item.number, `${item.number} · sisa ${money(item.total - item.amount_paid - item.amount_credited)}`))} />
            <NumberInput label="Jumlah pembayaran" name="amount" min={0.01} step={0.01} />
            <Select label="Akun penerimaan" name="account_code" options={[option("1101", "Kas"), option("1102", "Bank")]} />
          </Form>
        </Panel>
        <Panel title="Buat Vendor Bill dari barang diterima">
          <Form action={createVendorBillAction} submitLabel="Posting Vendor Bill">
            <Select label="Purchase Order" name="purchase_order_number" options={purchaseOrders.data.filter((item) => ["Received", "Partial Receipt"].includes(item.status)).map((item) => option(item.number, `${item.number} · ${item.status}`))} />
          </Form>
        </Panel>
        <Panel title="Bayar Vendor Bill">
          <Form action={recordVendorPaymentAction} submitLabel="Posting pembayaran vendor">
            <Select label="Vendor Bill" name="bill_number" options={openBills.map((item) => option(item.number, `${item.number} · sisa ${money(item.total - item.amount_paid)}`))} />
            <NumberInput label="Jumlah pembayaran" name="amount" min={0.01} step={0.01} />
            <Select label="Akun pembayaran" name="account_code" options={[option("1101", "Kas"), option("1102", "Bank")]} />
          </Form>
        </Panel>
        <Panel title="Piutang pelanggan">
          <DataTable headers={["Invoice", "Pelanggan", "Sumber", "Jatuh tempo", "Total", "Dibayar", "Dikreditkan", "Sisa"]} rows={invoices.data.map((item) => [
            item.number, item.customer_id, item.source_document ?? "—", item.due_date, money(item.total), money(item.amount_paid), money(item.amount_credited),
            money(item.total - item.amount_paid - item.amount_credited),
          ])} />
        </Panel>
        <Panel title="Utang pemasok">
          <DataTable headers={["Bill", "Pemasok", "Sumber", "Jatuh tempo", "Total", "Dibayar", "Sisa"]} rows={bills.data.map((item) => [
            item.number, item.vendor_id, item.source_document ?? "—", item.due_date, money(item.total), money(item.amount_paid), money(item.total - item.amount_paid),
          ])} />
        </Panel>
        <Panel title="Riwayat pembayaran">
          <DataTable headers={["Nomor", "Dokumen", "Jenis", "Jumlah", "Akun", "Waktu"]} rows={[
            ...customerPayments.data.map((item) => [item.number, item.invoice_number, "Pelanggan", money(item.amount), item.account_code, new Date(item.paid_at).toLocaleString("id-ID")]),
            ...vendorPayments.data.map((item) => [item.number, item.bill_number, "Pemasok", money(item.amount), item.account_code, new Date(item.paid_at).toLocaleString("id-ID")]),
          ]} />
        </Panel>
      </div>
    );
  }

  if (module === "pos") {
    const [configuration, sessions, products, customers, methods, receiptResult, holds, holdLines, receiptLines, tenders] = await Promise.all([
      supabase.from("pos_configuration").select("location_code, opening_cash").eq("id", "POS-TBT").single(),
      supabase.from("pos_sessions").select("number, cashier_label, status, opening_cash, expected_cash, counted_cash, cash_difference, variance_reason").order("opened_at", { ascending: false }),
      supabase.from("products").select("sku, name, sales_price").order("sku"),
      supabase.from("customers").select("id, name, credit_limit").order("id"),
      supabase.from("pos_payment_methods").select("id, name").order("id"),
      supabase.from("pos_receipts").select("number, session_number, sku, quantity, total, payment_method, customer_id, sold_at").order("sold_at", { ascending: false }),
      supabase.from("pos_holds").select("number, session_number, status, expires_at").order("created_at", { ascending: false }),
      supabase.from("pos_hold_lines").select("hold_number, sku, quantity, subtotal, tax_amount").order("sku"),
      supabase.from("pos_receipt_lines").select("receipt_number, sku, quantity, subtotal, tax_amount").order("sku"),
      supabase.from("pos_receipt_tenders").select("receipt_number, payment_method, amount"),
    ]);
    let receipts = receiptResult.data;
    let customerLinkMigrationPending = false;
    if (receiptResult.error?.message.includes("column pos_receipts.customer_id does not exist")) {
      customerLinkMigrationPending = true;
      const legacyReceiptResult = await supabase.from("pos_receipts")
        .select("number, session_number, sku, quantity, total, payment_method, sold_at")
        .order("sold_at", { ascending: false });
      if (legacyReceiptResult.error) return <DataLoadError error={legacyReceiptResult.error.message} />;
      receipts = legacyReceiptResult.data?.map((receipt) => ({ ...receipt, customer_id: null })) ?? null;
    } else if (receiptResult.error) {
      return <DataLoadError error={receiptResult.error.message} />;
    }
    const error = configuration.error ?? sessions.error ?? products.error ?? customers.error ?? methods.error ??
      holds.error ?? holdLines.error ?? receiptLines.error ?? tenders.error;
    if (error) return <DataLoadError error={error.message} />;
    if (!configuration.data || !sessions.data || !products.data || !customers.data || !methods.data || !receipts ||
        !holds.data || !holdLines.data || !receiptLines.data || !tenders.data) {
      return <DataLoadError error="Database mengembalikan data POS yang tidak lengkap." />;
    }
    const activeSession = sessions.data.find((item) => ["Open", "Pending Approval"].includes(item.status));
    const openHolds = holds.data.filter((item) => item.status === "Open");
    const holdTotals = new Map(holds.data.map((hold) => [
      hold.number,
      holdLines.data.filter((line) => line.hold_number === hold.number)
        .reduce((sum, line) => sum + line.subtotal + line.tax_amount, 0),
    ]));
    const receiptTenderLabels = new Map<string, string[]>();
    for (const tender of tenders.data) {
      const current = receiptTenderLabels.get(tender.receipt_number) ?? [];
      current.push(`${tender.payment_method} ${money(tender.amount)}`);
      receiptTenderLabels.set(tender.receipt_number, current);
    }
    return (
      <div className="page-stack">
        <PageTitle module={module} /><MessageBanner message={message} />
        {customerLinkMigrationPending ? (
          <section className="notice notice-warning" role="status">
            Skema database belum menerapkan migrasi POS pelanggan 005. Penjualan tanpa pelanggan tetap tersedia; untuk menautkan pelanggan pada struk, jalankan migrasi `202611050005_pos_customer_link.sql` setelah migrasi 004. Data historis tidak diubah.
          </section>
        ) : null}
        <Panel title="Buka sesi kasir">
          <Form action={openPosSessionAction} submitLabel="Buka sesi">
            <NumberInput label="Kas awal dari konfigurasi POS" name="opening_cash" min={0} step={0.01} defaultValue={configuration.data.opening_cash} />
          </Form>
        </Panel>
        <Panel title="Penjualan POS">
          <Form action={createPosSaleAction} submitLabel="Selesaikan penjualan">
            <Select label="Produk" name="sku" options={products.data.map((item) => option(item.sku, `${item.sku} · ${item.name} · ${money(item.sales_price)}`))} />
            <NumberInput label="Kuantitas" name="quantity" />
            <Select label="Metode pembayaran" name="payment_method" options={methods.data.map((item) => option(item.id, item.name))} />
            <Select label="Pelanggan (opsional)" name="customer_id" options={[option("", "Pembeli umum"), ...customers.data.map((item) => option(item.id, `${item.id} · ${item.name} · limit ${money(item.credit_limit)}`))]} required={false} />
            <p className="muted-copy">Penjualan POS langsung lunas dan tidak menambah piutang atau memakai batas kredit. Pilih pelanggan untuk mencatatnya pada struk.</p>
          </Form>
        </Panel>
        <Panel title="Hold pesanan POS">
          <Form action={createPosHoldAction} submitLabel="Simpan hold">
            <Select label="SKU baris 1" name="sku_1" options={products.data.map((item) => option(item.sku, `${item.sku} · ${item.name}`))} />
            <NumberInput label="Kuantitas baris 1" name="quantity_1" />
            <Select label="SKU baris 2 (opsional)" name="sku_2" options={[option("", "Tidak ada"), ...products.data.map((item) => option(item.sku, `${item.sku} · ${item.name}`))]} required={false} />
            <NumberInput label="Kuantitas baris 2 (opsional)" min={0} name="quantity_2" defaultValue={0} required={false} />
          </Form>
          <p className="muted-copy">Hold kedaluwarsa 10 menit setelah dibuat oleh server; stok dilepas saat dibayar, dibatalkan, atau kedaluwarsa.</p>
        </Panel>
        {openHolds.length > 0 ? (
          <>
            <Panel title="Selesaikan hold · tender lunas">
              <Form action={completePosHoldAction} submitLabel="Bayar dan buat satu struk">
                <Select label="Hold" name="hold_number" options={openHolds.map((item) => option(item.number, `${item.number} · total ${money(holdTotals.get(item.number) ?? 0)}`))} />
                <NumberInput label="Tender Cash" min={0} name="cash_amount" step={0.01} defaultValue={0} />
                <NumberInput label="Tender Bank" min={0} name="bank_amount" step={0.01} defaultValue={0} />
              </Form>
            </Panel>
            <Panel title="Batalkan hold">
              <Form action={cancelPosHoldAction} submitLabel="Batalkan dan lepas reservasi" idempotent={false}>
                <Select label="Hold aktif" name="hold_number" options={openHolds.map((item) => option(item.number, item.number))} />
              </Form>
            </Panel>
          </>
        ) : null}
        <Panel title="Pelepasan hold kedaluwarsa">
          <Form action={expirePosHoldsAction} submitLabel="Periksa dan lepas hold expired" idempotent={false}>
            <p className="muted-copy">Hold yang masa berlakunya lewat akan ditandai Expired dan reservasinya dilepas.</p>
          </Form>
        </Panel>
        {activeSession ? (
          <Panel title={`Tutup sesi ${activeSession.number}`}>
            <Form action={closePosSessionAction} submitLabel="Tutup sesi" idempotent={false}>
              <input name="session_number" type="hidden" value={activeSession.number} />
              <NumberInput label="Kas terhitung" name="counted_cash" min={0} step={0.01} />
              <TextInput label="Alasan selisih kas" name="variance_reason" required={false} />
            </Form>
          </Panel>
        ) : null}
        {sessions.data.filter((item) => item.status === "Pending Approval").map((item) => (
          <Panel key={item.number} title={`Persetujuan selisih ${item.number}`}>
            <p>Harapan {money(item.expected_cash ?? 0)} · Hitung {money(item.counted_cash ?? 0)} · Selisih {money(item.cash_difference ?? 0)} · {item.variance_reason}</p>
            <Form action={approvePosVarianceAction} submitLabel="Setujui dan tutup" idempotent={false}>
              <input name="session_number" type="hidden" value={item.number} />
            </Form>
          </Panel>
        ))}
        <Panel title="Sesi POS">
          <DataTable headers={["Sesi", "Kasir", "Status", "Kas awal", "Harapan", "Hitung", "Selisih"]} rows={sessions.data.map((item) => [
            item.number, item.cashier_label, item.status, money(item.opening_cash), money(item.expected_cash ?? item.opening_cash),
            item.counted_cash === null ? "—" : money(item.counted_cash), item.cash_difference === null ? "—" : money(item.cash_difference),
          ])} />
        </Panel>
        <Panel title="Hold dan baris pesanan">
          <DataTable headers={["Hold", "Sesi", "Status", "Kedaluwarsa", "Baris barang", "Total"]} rows={holds.data.map((item) => [
            item.number, item.session_number, item.status, new Date(item.expires_at).toLocaleString("id-ID"),
            holdLines.data.filter((line) => line.hold_number === item.number).map((line) => `${line.sku} × ${line.quantity}`).join(" · ") || "—",
            money(holdTotals.get(item.number) ?? 0),
          ])} />
        </Panel>
        <Panel title="Struk">
          <DataTable headers={["Nomor", "Sesi", "Pelanggan", "Baris", "Total", "Tender", "Waktu"]} rows={receipts.map((item) => [
            item.number, item.session_number,
            item.customer_id ? `${item.customer_id} · ${customers.data.find((customer) => customer.id === item.customer_id)?.name ?? "Pelanggan"}` : "Pembeli umum",
            receiptLines.data.filter((line) => line.receipt_number === item.number).map((line) => `${line.sku} × ${line.quantity}`).join(" · ") || `${item.sku} × ${item.quantity}`,
            money(item.total), receiptTenderLabels.get(item.number)?.join(" + ") ?? item.payment_method,
            new Date(item.sold_at).toLocaleString("id-ID"),
          ])} />
        </Panel>
      </div>
    );
  }

  const [invoices, lines, creditNotes] = await Promise.all([
    supabase.from("customer_invoices").select("number, customer_id, total, amount_paid, amount_credited, status").order("issue_date", { ascending: false }),
    supabase.from("customer_invoice_lines").select("invoice_number, sku, quantity").order("invoice_number"),
    supabase.from("credit_notes").select("number, invoice_number, subtotal, tax_amount, total, created_at").order("created_at", { ascending: false }),
  ]);
  const error = invoices.error ?? lines.error ?? creditNotes.error;
  if (error) return <DataLoadError error={error.message} />;
  if (!invoices.data || !lines.data || !creditNotes.data) {
    return <DataLoadError error="Database mengembalikan data retur yang tidak lengkap." />;
  }
  const returnableInvoices = invoices.data.filter((item) => item.status === "Posted" && item.total - item.amount_paid - item.amount_credited > 0);
  const invoiceLineOptions = lines.data
    .filter((line) => returnableInvoices.some((invoice) => invoice.number === line.invoice_number))
    .map((line) => option(`${line.invoice_number}|${line.sku}`, `${line.invoice_number} · ${line.sku} · max ${line.quantity}`));
  return (
    <div className="page-stack">
      <PageTitle module={module} /><MessageBanner message={message} />
      <Panel title="Buat Credit Note">
        <Form action={createCreditNoteAction} submitLabel="Posting Credit Note">
          <Select
            label="Invoice / SKU"
            name="invoice_sku"
            options={invoiceLineOptions}
          />
          <NumberInput label="Kuantitas retur" name="quantity" />
          <Select label="Kondisi barang" name="item_condition" options={[option("sealed", "Tersegel · stok kembali"), option("damaged", "Rusak · tidak masuk stok")]} />
        </Form>
        <p className="muted-copy">Retur dibatasi pada nilai piutang belum dibayar; refund tunai belum diaktifkan.</p>
      </Panel>
      <Panel title="Invoice terkait">
        <DataTable headers={["Invoice", "Pelanggan", "Status", "Total", "Dibayar", "Dikreditkan", "Sisa"]} rows={invoices.data.map((item) => [
          item.number, item.customer_id, item.status, money(item.total), money(item.amount_paid), money(item.amount_credited),
          money(item.total - item.amount_paid - item.amount_credited),
        ])} />
      </Panel>
      <Panel title="Credit Note">
        <DataTable headers={["Nomor", "Invoice", "Subtotal", "PBJT", "Total", "Dibuat"]} rows={creditNotes.data.map((item) => [
          item.number, item.invoice_number, money(item.subtotal), money(item.tax_amount), money(item.total), new Date(item.created_at).toLocaleString("id-ID"),
        ])} />
      </Panel>
    </div>
  );
}
