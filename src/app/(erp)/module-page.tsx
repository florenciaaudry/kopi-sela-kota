import Link from "next/link";
import { moduleTitles, odooLabel } from "@/lib/erp-terminology";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import type { AppRole } from "@/lib/supabase/database.types";
import { WorkspaceViews, type WorkspaceSection } from "./workspace-views";
import { DataTable } from "./data-table";
import { PosCart } from "./pos-cart";
import { CrmPipeline } from "./crm-pipeline";
import { SubmitButton } from "./submit-button";
import { PurchaseOrderFields } from "./purchase-order-fields";
import { DeliveryOrderFields, type DeliverableSalesOrder } from "./delivery-order-fields";
import { SelectField } from "./select-field";
import { CurrencyInput } from "./currency-input";

import { requireRole } from "@/lib/auth";
import {
  formatRupiah,
} from "@/lib/format";
import { routeAccess } from "@/lib/roles";
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
type Message = { error?: string; success?: string; document?: string };

function PageTitle({ module }: { module: Module }) {
  const title = moduleTitles;
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">KOPI SELA KOTA / {module.toUpperCase()}</p>
        <h1>{title[module]}</h1>
        <p className="muted-copy">{({ sales: "Pantau pesanan pelanggan, lalu catat pengirimannya.", crm: "Ikuti peluang pelanggan dari kontak awal sampai berhasil.", purchase: "Kelola pesanan pemasok dan penerimaan barang.", accounting: "Telusuri pencatatan dan keseimbangan keuangan usaha.", invoicing: "Terbitkan tagihan dan catat pembayaran sesuai dokumen asal.", pos: "Buka sesi, layani pelanggan, lalu cocokkan kas saat tutup.", returns: "Periksa kondisi barang dan koreksi tagihan asal." })[module]}</p>
      </div>
      <span className="date-chip"><span className="connection-dot" aria-hidden="true" /> Data tersimpan online</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section-card demo-panel">
      <div className="section-heading"><h2>{odooLabel(title)}</h2></div>
      {children}
    </section>
  );
}

const actionLabels: Record<string, string> = {
  "Buat Sales Order": "New Sales Order", "Pengiriman dari Sales Order": "Validate Delivery",
  "Buat Lead": "New Lead", "Perbarui tahap": "Update Stage",
  "Buat Purchase Order": "New Purchase Order", "Penerimaan barang": "Validate Receipt",
  "Terbitkan invoice untuk delivery": "Create Invoice", "Catat pembayaran pelanggan": "Register Payment",
  "Buat Vendor Bill dari barang diterima": "Create Vendor Bill", "Bayar Vendor Bill": "Register Vendor Payment",
  "Buka sesi kasir": "Open Session", "Penjualan POS": "New POS Order",
  "Hold pesanan POS": "Hold Order", "Selesaikan hold · tender lunas": "Validate Payment",
  "Batalkan hold": "Cancel Hold", "Pelepasan hold kedaluwarsa": "Expire Holds",
  "Buat Credit Note": "Create Credit Note",
};

function ModuleWorkspace({ children, role }: { children: ReactNode; role: AppRole }) {
  const actions: WorkspaceSection[] = [];
  const views: WorkspaceSection[] = [];
  const intro: ReactNode[] = [];
  const add = (nodes: ReactNode) => Children.forEach(nodes, (node) => {
    if (!isValidElement<{ children?: ReactNode; title?: string }>(node)) { if (node) intro.push(node); return; }
    if (node.type === Fragment) { add(node.props.children); return; }
    if (node.type !== Panel) { intro.push(node); return; }
    const title = node.props.title ?? "Dokumen";
    const isAction = Boolean(actionLabels[title]) || title.startsWith("Tutup sesi ") || title.startsWith("Persetujuan selisih ");
    if (isAction) {
      let roles: AppRole[] = ["owner"];
      if (["Buat Sales Order", "Buat Lead", "Perbarui tahap"].includes(title)) roles = ["sales", "owner"];
      else if (["Pengiriman dari Sales Order", "Penerimaan barang"].includes(title)) roles = ["warehouse", "owner"];
      else if (title === "Buat Purchase Order") roles = ["procurement", "owner"];
      else if (["Terbitkan invoice untuk delivery", "Catat pembayaran pelanggan", "Buat Vendor Bill dari barang diterima", "Bayar Vendor Bill"].includes(title)) roles = ["finance", "owner"];
      else if (title === "Buat Credit Note") roles = ["finance", "owner"];
      else if (!title.startsWith("Persetujuan selisih ")) roles = ["cashier", "owner"];
      if (!roles.includes(role)) return;
    }
    const section = { id: `section-${views.length + actions.length}`, title: odooLabel(actionLabels[title] ?? title), content: node };
    (isAction ? actions : views).push(section);
  });
  add(children);
  return <div className="page-stack module-workspace">{Children.toArray(intro)}<nav className="document-smart-buttons" aria-label="Workflow Links">{["sales","owner"].includes(role)?<Link href="/quotations" className="secondary-button">Quotations</Link>:null}{["procurement","owner"].includes(role)?<Link href="/rfqs" className="secondary-button">Requests for Quotation</Link>:null}{["sales","procurement","finance","owner"].includes(role)?<Link href="/master-data" className="secondary-button">Master Data</Link>:null}{["warehouse","finance","owner"].includes(role)?<Link href="/inspections" className="secondary-button">Return Inspections</Link>:null}</nav><WorkspaceViews actions={actions} views={views} /></div>;
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
      <SubmitButton label={submitLabel} />
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
    <SelectField
      label={label}
      name={name}
      options={options}
      required={required}
    />
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
      <span>{odooLabel(label)}</span>
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
      <span>{odooLabel(label)}</span>
      <input name={name} required={required} type="text" />
    </label>
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

async function readServerClock() {
  return Date.now();
}

function money(value: number) {
  return formatRupiah(Number(value));
}

function dateLabel(value: string | null | undefined, includeTime = false) {
  if (!value) return "—";
  const options = {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  } satisfies Intl.DateTimeFormatOptions;
  const formatted = includeTime
    ? new Date(value).toLocaleString("id-ID", options)
    : new Date(value).toLocaleDateString("id-ID", options);
  return formatted + (includeTime ? " WIB" : "");
}

function option(value: string, label: string): Option {
  return { value, label };
}

function DataLoadError({ error }: { error: string }) {
  console.error("Module data load failed:", error);
  return (
    <section className="notice notice-error" role="alert">
      <strong>Data tidak dapat dimuat.</strong>
      <p>Coba muat ulang. Jika masalah berlanjut, hubungi administrator.</p>
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
  const profile = await requireRole([...routeAccess[`/${module}`]]);
  const supabase = await createSupabaseServerClient();
  const workflowProbe = await supabase.from("quotations").select("number").limit(0);
  const workflowsReady = !workflowProbe.error;

  if (module === "sales") {
    const [customers, products, orders, orderLines, deliveries, deliveryLines] = await Promise.all([
      supabase.from("customers").select("id, name, type, city, credit_limit, payment_terms_code").order("name"),
      supabase.from("products").select("sku, name, sales_price").order("sku"),
      supabase.from("sales_orders").select("number, customer_id, status, total, order_date").order("created_at", { ascending: false }),
      supabase.from("sales_order_lines").select("sales_order_number, sku, quantity"),
      supabase.from("delivery_notes").select("number, sales_order_number, delivered_at").order("delivered_at", { ascending: false }),
      supabase.from("delivery_note_lines").select("delivery_number, sku, quantity"),
    ]);
    const error = customers.error ?? products.error ?? orders.error ?? orderLines.error ?? deliveries.error ?? deliveryLines.error;
    if (error) return <DataLoadError error={error.message} />;
    if (!customers.data || !products.data || !orders.data || !orderLines.data || !deliveries.data || !deliveryLines.data) {
      return <DataLoadError error="Database mengembalikan data Sales yang tidak lengkap." />;
    }
    const customerNames = new Map(customers.data.map((item) => [item.id, item.name]));
    const productNames = new Map(products.data.map((item) => [item.sku, item.name]));
    const orderByDeliveryNumber = new Map(deliveries.data.map((item) => [item.number, item.sales_order_number]));
    const deliveredByOrder = new Map<string, number>();
    for (const line of deliveryLines.data) {
      const orderNumber = orderByDeliveryNumber.get(line.delivery_number);
      if (!orderNumber) continue;
      deliveredByOrder.set(orderNumber, (deliveredByOrder.get(orderNumber) ?? 0) + line.quantity);
    }
    const lineByOrder = new Map(orderLines.data.map((line) => [line.sales_order_number, line]));
    const deliverableOrders: DeliverableSalesOrder[] = orders.data
      .filter((item) => ["Sales Order", "Partial Delivery"].includes(item.status))
      .map((item) => {
        const line = lineByOrder.get(item.number);
        const orderedQuantity = line?.quantity ?? 1;
        const deliveredQuantity = deliveredByOrder.get(item.number) ?? 0;
        const remainingQuantity = Math.max(0, orderedQuantity - deliveredQuantity);
        const sku = line?.sku ?? "—";
        return {
          number: item.number,
          status: item.status,
          customerLabel: `${item.customer_id} · ${customerNames.get(item.customer_id) ?? "—"}`,
          sku,
          productName: productNames.get(sku) ?? sku,
          orderedQuantity,
          deliveredQuantity,
          remainingQuantity,
        };
      })
      .filter((item) => item.remainingQuantity > 0);
    return (
      <ModuleWorkspace role={profile.role}>
        <PageTitle module={module} /><MessageBanner message={message} />
        {workflowsReady ? <section className="section-card"><a className="button button-primary" href="/quotations">New Quotation</a><p>Mulai dari dokumen sumber; konfirmasi dan posting mengikuti status serta hak akses.</p></section> : <>
        <Panel title="Buat Sales Order">
          <Form action={createSalesOrderAction} submitLabel="Simpan Sales Order">
            <Select label="Pelanggan" name="customer_id" options={customers.data.map((item) => option(item.id, `${item.id} · ${item.name} · limit ${money(item.credit_limit)}`))} />
            <Select label="Produk" name="sku" options={products.data.map((item) => option(item.sku, `${item.sku} · ${item.name} · ${money(item.sales_price)}`))} />
            <NumberInput label="Kuantitas" name="quantity" />
            <NumberInput label="Diskon (%) · maksimal 5%" min={0} name="discount_percent" step={0.01} defaultValue={0} />
            <TextInput label="Lead sumber (opsional)" name="source_lead_number" required={false} />
          </Form>
        </Panel>
        </>}
        <Panel title="Pengiriman dari Sales Order">
          <Form action={deliverSalesOrderAction} submitLabel="Posting pengiriman">
            <DeliveryOrderFields orders={deliverableOrders} />
          </Form>
        </Panel>
        <Panel title="Sales Order">
          <DataTable key={message?.document ?? "all-orders"} initialQuery={message?.document?.slice(0,100) ?? ""} documents={{0:"sales",1:"customer"}} headers={["Nomor", "Pelanggan", "Tanggal", "Status", "Total"]} rows={orders.data.map((item) => [
            item.number, `${item.customer_id} · ${customerNames.get(item.customer_id) ?? "—"}`, item.order_date, item.status, money(item.total),
          ])} />
        </Panel>
        <Panel title="Delivery">
          <DataTable documents={{0:"delivery",1:"sales"}} headers={["Nomor", "Sales Order", "Dibuat"]} rows={deliveries.data.map((item) => [item.number, item.sales_order_number, new Date(item.delivered_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB"])} />
        </Panel>
        <Panel title="Customers">
          <DataTable documents={{0:"customer"}} headers={["Reference","Name","Customer Type","City","Credit Limit","Payment Terms"]} rows={customers.data.map(c=>[c.id,c.name,c.type,c.city,money(c.credit_limit),c.payment_terms_code])}/>
        </Panel>
      </ModuleWorkspace>
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
    const crmSummary = <section className="crm-summary" aria-label="CRM Summary">
      <article><span>Leads</span><strong>{leads.data.length}</strong><small>Seluruh peluang tercatat</small></article>
      <article><span>Open Opportunities</span><strong>{leads.data.filter(l => !["Won", "Lost"].includes(l.stage)).length}</strong><small>Perlu tindak lanjut</small></article>
      <article><span>Expected Revenue</span><strong>{money(leads.data.filter(l => l.stage !== "Lost").reduce((n,l) => n + Number(l.expected_revenue), 0))}</strong><small>Termasuk Won, tanpa Lost</small></article>
      <article><span>Weighted Revenue</span><strong>{money(leads.data.filter(l => !["Won", "Lost"].includes(l.stage)).reduce((n,l) => n + Math.round(Number(l.expected_revenue) * Number(l.probability_percent) / 100), 0))}</strong><small>Peluang terbuka × Probability</small></article>
    </section>;
    return (
      <ModuleWorkspace role={profile.role}>
        <PageTitle module={module} /><MessageBanner message={message} />
        {crmSummary}
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
        <Panel title="Daftar peluang">
          <DataTable documents={{0:"lead",1:"customer",2:"product"}} headers={["Reference", "Customer", "Product", "Quantity", "Stage", "Expected Revenue", "Probability", "Weighted Revenue", "Lost Reason"]} rows={leads.data.map((item) => [
            item.number, `${item.customer_id} · ${customerNames.get(item.customer_id) ?? "—"}`,
            `${item.sku} · ${productNames.get(item.sku) ?? "—"}`, item.quantity, item.stage,
            money(item.expected_revenue), `${item.probability_percent}%`, money(Math.round(Number(item.expected_revenue) * Number(item.probability_percent) / 100)), item.lost_reason ?? "—",
          ])} />
        </Panel>
        <Panel title="Pipeline peluang · Kanban">
          <CrmPipeline opportunities={leads.data.map((item) => ({
            number: item.number,
            customer: `${item.customer_id} · ${customerNames.get(item.customer_id) ?? "—"}`,
            product: `${item.sku} · ${productNames.get(item.sku) ?? "—"}`,
            quantity: item.quantity,
            stage: item.stage,
            revenue: Number(item.expected_revenue),
            probability: Number(item.probability_percent),
            lostReason: item.lost_reason,
          }))} />
        </Panel>
      </ModuleWorkspace>
    );
  }

  if (module === "purchase") {
    const [vendors, prices, products, orders, receipts, orderLines, receiptLines] = await Promise.all([
      supabase.from("vendors").select("id, name, city, payment_terms_code, tax_profile").order("name"),
      supabase.from("vendor_pricelist").select("vendor_id, sku, minimum_quantity, purchase_price").order("sku"),
      supabase.from("products").select("sku, name").order("sku"),
      supabase.from("purchase_orders").select("number, vendor_id, status, order_date, created_at, total").order("created_at", { ascending: false }),
      supabase.from("goods_receipts").select("number, purchase_order_number, received_at").order("received_at", { ascending: false }),
      supabase.from("purchase_order_lines").select("id, purchase_order_number, sku, quantity, received_quantity, rejected_quantity"),
      supabase.from("goods_receipt_lines").select("receipt_number, purchase_order_line_id, sku, accepted_quantity, rejected_quantity"),
    ]);
    const error = vendors.error ?? prices.error ?? products.error ?? orders.error ?? receipts.error ?? orderLines.error ?? receiptLines.error;
    if (error) return <DataLoadError error={error.message} />;
    if (!vendors.data || !prices.data || !products.data || !orders.data || !receipts.data || !orderLines.data || !receiptLines.data) {
      return <DataLoadError error="Database mengembalikan data Purchase yang tidak lengkap." />;
    }
    const vendorNames = new Map(vendors.data.map((item) => [item.id, item.name]));
    const productNames = new Map(products.data.map((item) => [item.sku, item.name]));
    const orderLineById = new Map(orderLines.data.map((item) => [item.id, item]));
    const orderLineTotals = new Map<string, { ordered: number; accepted: number; rejected: number }>();
    for (const line of orderLines.data) {
      const current = orderLineTotals.get(line.purchase_order_number) ?? { ordered: 0, accepted: 0, rejected: 0 };
      current.ordered += line.quantity;
      current.accepted += line.received_quantity;
      current.rejected += line.rejected_quantity;
      orderLineTotals.set(line.purchase_order_number, current);
    }
    const receiptAudit = profile.role === "owner" && receipts.data.length > 0
      ? await supabase.from("audit_events")
        .select("actor_label, action, document_number, details, occurred_at")
        .eq("document_type", "goods_receipt")
        .in("document_number", receipts.data.map((item) => item.number))
        .order("occurred_at", { ascending: false })
      : null;
    if (receiptAudit?.error) return <DataLoadError error={receiptAudit.error.message} />;
    const receiptLinesByNumber = new Map<string, string[]>();
    for (const line of receiptLines.data) {
      const orderLine = orderLineById.get(line.purchase_order_line_id);
      const productName = productNames.get(line.sku) ?? line.sku;
      const summary = `${line.sku} · ${productName}: ${line.accepted_quantity} diterima, ${line.rejected_quantity} ditolak`;
      const current = receiptLinesByNumber.get(line.receipt_number) ?? [];
      current.push(summary);
      receiptLinesByNumber.set(line.receipt_number, current);
      if (orderLine?.purchase_order_number !== receipts.data.find((receipt) => receipt.number === line.receipt_number)?.purchase_order_number) {
        return <DataLoadError error="Detail Goods Receipt tidak cocok dengan Purchase Order asal." />;
      }
    }
    return (
      <ModuleWorkspace role={profile.role}>
        <PageTitle module={module} /><MessageBanner message={message} />
        <section className="notice notice-info" aria-label="Panduan tugas Purchase">
          {profile.role === "procurement" ? <><strong>Untuk Procurement:</strong> buat Purchase Order dan pantau jumlah yang masih menunggu. Tanggal order dicatat otomatis; Warehouse mencatat hasil hitung fisik saat barang tiba.</> : null}
          {profile.role === "warehouse" ? <><strong>Untuk Warehouse:</strong> cocokkan nomor Purchase Order dengan barang fisik. Masukkan jumlah diterima baik dan ditolak sesuai hitungan; waktu penerimaan dicatat otomatis saat kamu posting.</> : null}
          {profile.role === "owner" ? <><strong>Untuk Owner:</strong> daftar menampilkan tanggal order, waktu penerimaan, serta jumlah diterima/ditolak. Bukti pelaku dan waktu posting tersedia pada Audit Penerimaan.</> : null}
        </section>
        {workflowsReady ? <section className="section-card"><a className="button button-primary" href="/rfqs">New RFQ</a><p>Mulai dari dokumen sumber; konfirmasi dan posting mengikuti status serta hak akses.</p></section> : <>
        <Panel title="Buat Purchase Order">
          <Form action={createPurchaseOrderAction} submitLabel="Simpan Purchase Order">
            <PurchaseOrderFields vendors={vendors.data} prices={prices.data} products={products.data} />
          </Form>
          <p className="muted-copy">Tanggal order mengikuti tanggal server saat Purchase Order disimpan; jangan isi tanggal perkiraan sebagai tanggal transaksi.</p>
        </Panel>
        </>}
        <Panel title="Penerimaan barang">
          <Form action={receivePurchaseOrderAction} submitLabel="Posting penerimaan">
            <Select label="Purchase Order" name="purchase_order_number" options={orders.data.filter((item) => ["Purchase Order", "Partial Receipt"].includes(item.status)).map((item) => {
              const totals = orderLineTotals.get(item.number) ?? { ordered: 0, accepted: 0, rejected: 0 };
              return option(item.number, `${item.number} · order ${dateLabel(item.order_date)} · sisa ${totals.ordered - totals.accepted - totals.rejected}`);
            })} />
            <NumberInput label="Diterima baik" name="accepted_quantity" min={0} defaultValue={0} />
            <NumberInput label="Ditolak" name="rejected_quantity" min={0} defaultValue={0} />
          </Form>
          <p className="muted-copy">Tanggal dan waktu aktual dicatat oleh server ketika penerimaan diposting. Penerimaan tidak boleh dicatat sebelum barang dihitung.</p>
        </Panel>
        <Panel title="Purchase Order">
          <DataTable documents={{0:"purchase",1:"vendor"}} headers={["Reference", "Vendor", "Order Date", "Status", "Ordered Quantity", "Accepted Quantity", "Rejected Quantity", "Remaining Quantity", "Total"]} rows={orders.data.map((item) => {
            const totals = orderLineTotals.get(item.number) ?? { ordered: 0, accepted: 0, rejected: 0 };
            return [
              item.number, `${item.vendor_id} · ${vendorNames.get(item.vendor_id) ?? "—"}`, dateLabel(item.order_date), item.status,
              totals.ordered, totals.accepted, totals.rejected, Math.max(0, totals.ordered - totals.accepted - totals.rejected), money(item.total),
            ];
          })} />
        </Panel>
        <Panel title="Goods Receipt">
          <DataTable documents={{0:"receipt",1:"purchase"}} headers={["Reference", "Purchase Order", "Order Date", "Received On (WIB)", "Received Quantities"]} rows={receipts.data.map((item) => [
            item.number, item.purchase_order_number,
            dateLabel(orders.data.find((order) => order.number === item.purchase_order_number)?.order_date),
            dateLabel(item.received_at, true),
            receiptLinesByNumber.get(item.number)?.join(" · ") ?? "Rincian penerimaan belum tersedia",
          ])} />
        </Panel>
        {profile.role === "owner" && receiptAudit?.data?.length ? <Panel title="Audit Penerimaan">
          <DataTable documents={{0:"receipt"}} headers={["Goods Receipt", "Action", "Recorded By", "Recorded On (WIB)", "Details"]} rows={receiptAudit.data.map((event) => {
            const details = event.details;
            return [
              event.document_number, event.action, event.actor_label, dateLabel(event.occurred_at, true),
              `PO ${String(details.purchase_order ?? "—")} · ${String(details.accepted ?? "—")} diterima · ${String(details.rejected ?? "—")} ditolak`,
            ];
          })} />
        </Panel> : null}
        <Panel title="Vendors">
          <DataTable documents={{0:"vendor"}} headers={["Reference","Name","City","Payment Terms","Tax Profile"]} rows={vendors.data.map(v=>[v.id,v.name,v.city,v.payment_terms_code,v.tax_profile])}/>
        </Panel>
      </ModuleWorkspace>
    );
  }

  if (module === "accounting") {
    const [dashboard, journals, accounts, lines] = await Promise.all([
      supabase.rpc("get_owner_dashboard"),
      supabase.from("journal_entries").select("id, number, entry_date, source_type, source_reference, idempotency_key, memo, status").order("entry_date", { ascending: false }).limit(50),
      supabase.from("chart_of_accounts").select("code, name").order("code"),
      supabase.from("journal_lines").select("journal_entry_id, account_code, debit, credit"),
    ]);
    const error = dashboard.error ?? journals.error ?? accounts.error ?? lines.error;
    if (error) return <DataLoadError error={error.message} />;
    const rawTotals = dashboard.data;
    if (!rawTotals || !journals.data || !accounts.data || !lines.data) {
      return <DataLoadError error="Database mengembalikan laporan Accounting yang tidak lengkap." />;
    }
    const totals = rawTotals;
    const reconciledLines = lines.data;
    const accountNames = new Map(accounts.data.map((item) => [item.code, item.name]));
    const linesByJournal = new Map<string, string[]>();
    for (const line of reconciledLines) {
      const current = linesByJournal.get(line.journal_entry_id) ?? [];
      current.push(`${line.account_code} ${accountNames.get(line.account_code) ?? ""}: D ${money(line.debit)} / K ${money(line.credit)}`);
      linesByJournal.set(line.journal_entry_id, current);
    }
    return (
      <ModuleWorkspace role={profile.role}>
        <PageTitle module={module} /><MessageBanner message={message} />
        <section className="metric-grid">
          {[
            ["Piutang", totals.receivables], ["Utang", totals.payables],
            ["Kas", totals.cash], ["Bank", totals.bank],
            ["Nilai persediaan", totals.inventory_value], ["Unit On Hand", totals.on_hand],
          ].map(([label, amount]) => (
            <article className="metric-card" key={String(label)}>
              <span>{odooLabel(label)}</span>{label === "Unit On Hand" ? profile.role==="owner" ? <Link className="record-link" href="/inventory"><strong>{Number(amount).toLocaleString("id-ID")}</strong></Link> : <strong>{Number(amount).toLocaleString("id-ID")}</strong> : <Link className="record-link" href={"/reporting?metric="+({Piutang:"receivable",Utang:"payable",Kas:"cash",Bank:"bank","Nilai persediaan":"inventory"} as Record<string,string>)[String(label)]+"#sources"}><strong>{money(Number(amount))}</strong></Link>}
            </article>
          ))}
        </section>
        <Panel title="Jurnal terposting">
          <DataTable documents={{0:"journal"}} headers={["Nomor", "Tanggal", "Sumber", "Memo", "Rincian debit/kredit"]} rows={journals.data.map((item) => [
            item.number, item.entry_date, `${item.source_type} · ${item.source_reference}`, item.memo,
            (linesByJournal.get(item.id) ?? []).join(" | "),
          ])} />
        </Panel>
        <p className="muted-copy">Jurnal dibaca saja dari alur transaksi; pencatatan manual belum dibuka.</p>
      </ModuleWorkspace>
    );
  }

  if (module === "invoicing") {
    const [invoices, customerPayments, orders, bills, vendorPayments, purchaseOrders, billingLines] = await Promise.all([
      supabase.from("customer_invoices").select("number, customer_id, source_document, status, due_date, total, amount_paid, amount_credited").order("due_date"),
      supabase.from("customer_payments").select("number, invoice_number, amount, account_code, paid_at").order("paid_at", { ascending: false }),
      supabase.from("sales_orders").select("number, status").order("created_at", { ascending: false }),
      supabase.from("vendor_bills").select("number, vendor_id, source_document, status, due_date, total, amount_paid").order("due_date"),
      supabase.from("vendor_payments").select("number, bill_number, amount, account_code, paid_at").order("paid_at", { ascending: false }),
      supabase.from("purchase_orders").select("number, status").order("created_at", { ascending: false }),
      supabase.from("purchase_order_lines").select("purchase_order_number,received_quantity,billed_quantity"),
    ]);
    const error = invoices.error ?? customerPayments.error ?? orders.error ?? bills.error ?? vendorPayments.error ?? purchaseOrders.error ?? billingLines.error;
    if (error) return <DataLoadError error={error.message} />;
    if (!invoices.data || !customerPayments.data || !orders.data || !bills.data || !vendorPayments.data || !purchaseOrders.data || !billingLines.data) {
      return <DataLoadError error="Database mengembalikan data Invoicing yang tidak lengkap." />;
    }
    const reconciledInvoices = invoices.data;
    const reconciledCustomerPayments = customerPayments.data;
    const openInvoices = reconciledInvoices.filter((item) => item.total - item.amount_paid - item.amount_credited > 0);
    const openBills = bills.data.filter((item) => item.total - item.amount_paid > 0);
    const billableNumbers = new Set(billingLines.data.filter(line => line.received_quantity > line.billed_quantity).map(line => line.purchase_order_number));
    const billableOrders = purchaseOrders.data.filter(order => billableNumbers.has(order.number));
    return (
      <ModuleWorkspace role={profile.role}>
        <PageTitle module={module} /><MessageBanner message={message} />
        <Panel title="Terbitkan invoice untuk delivery">
          <Form action={createInvoiceAction} submitLabel="Posting invoice">
            <Select label="Sales Order" name="sales_order_number" options={orders.data.filter((item) => ["Delivered", "Partial Delivery"].includes(item.status)).map((item) => option(item.number, `${item.number} · ${item.status}`))} />
          </Form>
        </Panel>
        <Panel title="Catat pembayaran pelanggan">
          <Form action={recordCustomerPaymentAction} submitLabel="Posting pembayaran">
            <Select label="Invoice" name="invoice_number" options={openInvoices.map((item) => option(item.number, `${item.number} · sisa ${money(item.total - item.amount_paid - item.amount_credited)}`))} />
            <CurrencyInput label="Jumlah pembayaran" name="amount" />
            <Select label="Akun penerimaan" name="account_code" options={[option("1101", "Cash"), option("1102", "Bank")]} />
          </Form>
        </Panel>
        <Panel title="Buat Vendor Bill dari barang diterima">
          {billableOrders.length ? <Form action={createVendorBillAction} submitLabel="Posting Vendor Bill">
            <Select label="Purchase Order" name="purchase_order_number" options={billableOrders.map((item) => option(item.number, `${item.number} · ${item.status}`))} />
            {workflowsReady ? <NumberInput label="Bill Quantity · harus sama dengan Accepted belum ditagih" name="bill_quantity" /> : null}
          </Form> : <p className="demo-empty">Tidak ada penerimaan baik yang belum ditagih. Periksa Goods Receipt sebelum membuat Vendor Bill.</p>}
        </Panel>
        <Panel title="Bayar Vendor Bill">
          <Form action={recordVendorPaymentAction} submitLabel="Posting pembayaran vendor">
            <Select label="Vendor Bill" name="bill_number" options={openBills.map((item) => option(item.number, `${item.number} · sisa ${money(item.total - item.amount_paid)}`))} />
            <CurrencyInput label="Jumlah pembayaran" name="amount" />
            <Select label="Akun pembayaran" name="account_code" options={[option("1101", "Cash"), option("1102", "Bank")]} />
          </Form>
        </Panel>
        <Panel title="Piutang pelanggan">
          <DataTable linkColumn={{index:0,prefix:"/documents/invoice/"}} documents={{0:"invoice",1:"customer",2:"sales"}} headers={["Invoice", "Pelanggan", "Sumber", "Jatuh tempo", "Total", "Dibayar", "Dikreditkan", "Sisa"]} rows={reconciledInvoices.map((item) => [
            item.number, item.customer_id, item.source_document?.split(":")[0] ?? "—", item.due_date, money(item.total), money(item.amount_paid), money(item.amount_credited),
            money(item.total - item.amount_paid - item.amount_credited),
          ])} />
        </Panel>
        <Panel title="Utang pemasok">
          <DataTable documents={{0:"bill",1:"vendor",2:"purchase"}} headers={["Bill", "Pemasok", "Sumber", "Jatuh tempo", "Total", "Dibayar", "Sisa"]} rows={bills.data.map((item) => [
            item.number, item.vendor_id, item.source_document?.split(":")[0] ?? "—", item.due_date, money(item.total), money(item.amount_paid), money(item.total - item.amount_paid),
          ])} />
        </Panel>
        <Panel title="Riwayat pembayaran">
          <DataTable documents={{0:"payment",1:"invoice"}} headers={["Reference", "Document", "Type", "Amount", "Account", "Date & Time"]} rows={[
            ...reconciledCustomerPayments.map((item) => [item.number, item.invoice_number, "Pelanggan", money(item.amount), item.account_code, new Date(item.paid_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB"]),
            ...vendorPayments.data.map((item) => [item.number, item.bill_number, "Pemasok", money(item.amount), item.account_code, new Date(item.paid_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB"]),
          ]} />
        </Panel>
      </ModuleWorkspace>
    );
  }

  if (module === "pos") {
    const [configuration, sessions, products, customers, methods, receiptResult, holds, holdLines, receiptLines, tenders] = await Promise.all([
      supabase.from("pos_configuration").select("location_code, opening_cash").eq("id", "POS-TBT").single(),
      supabase.from("pos_sessions").select("number, cashier_label, status, opening_cash, opened_at, closed_at, approved_by, expected_cash, counted_cash, cash_difference, variance_reason, opened_by").order("opened_at", { ascending: false }),
      supabase.from("products").select("sku, name, sales_price").order("sku"),
      supabase.from("customers").select("id, name, credit_limit").order("id"),
      supabase.from("pos_payment_methods").select("id, name").order("id"),
      supabase.from("pos_receipts").select("number, session_number, sku, quantity, total, payment_method, customer_id, sold_at, idempotency_key, hold_number, created_by").order("sold_at", { ascending: false }),
      supabase.from("pos_holds").select("number, session_number, status, expires_at, created_by, customer_id").order("created_at", { ascending: false }),
      supabase.from("pos_hold_lines").select("hold_number, sku, quantity, subtotal, tax_amount").order("sku"),
      supabase.from("pos_receipt_lines").select("receipt_number, sku, quantity, subtotal, tax_amount").order("sku"),
      supabase.from("pos_receipt_tenders").select("receipt_number, payment_method, amount"),
    ]);
    let receipts = receiptResult.data;
    let customerLinkMigrationPending = false;
    if (receiptResult.error?.message.includes("column pos_receipts.customer_id does not exist")) {
      customerLinkMigrationPending = true;
      const legacyReceiptResult = await supabase.from("pos_receipts")
        .select("number, session_number, sku, quantity, total, payment_method, sold_at, idempotency_key, hold_number, created_by")
        .order("sold_at", { ascending: false });
      if (legacyReceiptResult.error) return <DataLoadError error={legacyReceiptResult.error.message} />;
      receipts = legacyReceiptResult.data?.map((receipt) => ({ ...receipt, customer_id: null })) ?? null;
    } else if (receiptResult.error) {
      return <DataLoadError error={receiptResult.error.message} />;
    }
    if (sessions.error) return <DataLoadError error={sessions.error.message} />;
    const sessionRows = sessions.data;
    if (!sessionRows) return <DataLoadError error="Database mengembalikan daftar sesi POS kosong atau tidak lengkap." />;
    const approvalAudit = profile.role === "owner" && sessionRows.length > 0
      ? await supabase.from("audit_events")
        .select("actor_label, action, document_number, details, occurred_at")
        .eq("document_type", "pos_session")
        .in("document_number", sessionRows.map((item) => item.number))
        .order("occurred_at", { ascending: false })
      : null;
    const error = configuration.error ?? sessions.error ?? products.error ?? customers.error ?? methods.error ??
      holds.error ?? holdLines.error ?? receiptLines.error ?? tenders.error ?? approvalAudit?.error;
    if (error) return <DataLoadError error={error.message} />;
    if (!configuration.data || !sessions.data || !products.data || !customers.data || !methods.data || !receipts ||
        !holds.data || !holdLines.data || !receiptLines.data || !tenders.data) {
      return <DataLoadError error="Database mengembalikan data POS yang tidak lengkap." />;
    }
    const reconciledPos = {
      holds: holds.data.filter(item => profile.role === "owner" || item.created_by === profile.id),
      holdLines: holdLines.data,
      receipts: receipts.filter(item => profile.role === "owner" || item.created_by === profile.id),
      receiptLines: receiptLines.data,
      tenders: tenders.data,
      sessions: sessions.data,
    };
    const activeSession = reconciledPos.sessions.find((item) => item.opened_by === profile.id && ["Open", "Pending Approval"].includes(item.status));
    const openHolds = reconciledPos.holds.filter((item) => item.created_by === profile.id && item.status === "Open");
    const checkedAt = await readServerClock();
    const checkoutHolds = openHolds.filter(item => activeSession?.status === "Open" && item.session_number === activeSession.number && Date.parse(item.expires_at)>checkedAt);
    const holdTotals = new Map(reconciledPos.holds.map((hold) => [
      hold.number,
      holdLines.data.filter((line) => line.hold_number === hold.number)
        .reduce((sum, line) => sum + line.subtotal + line.tax_amount, 0),
    ]));
    const receiptTenderLabels = new Map<string, string[]>();
    for (const tender of reconciledPos.tenders) {
      const current = receiptTenderLabels.get(tender.receipt_number) ?? [];
      current.push(`${tender.payment_method} ${money(tender.amount)}`);
      receiptTenderLabels.set(tender.receipt_number, current);
    }
    const sessionEvents = new Map<string, { actor_label: string; action: string; document_number: string; details: Record<string, unknown>; occurred_at: string }[]>();
    for (const event of approvalAudit?.data ?? []) {
      const current = sessionEvents.get(event.document_number) ?? [];
      current.push(event);
      sessionEvents.set(event.document_number, current);
    }
    const approvalEvents = new Map<string, { actor_label: string; occurred_at: string }>();
    for (const [number, events] of sessionEvents) {
      const approved = events.find((event) => event.action === "approve_variance")
        ?? (reconciledPos.sessions.find((item) => item.number === number)?.approved_by
          ? events.find((event) => event.action === "close")
          : undefined);
      if (approved) approvalEvents.set(number, approved);
    }
    return (
      <ModuleWorkspace role={profile.role}>
        <PageTitle module={module} /><MessageBanner message={message} />
        <section className="notice notice-info" aria-label="Panduan tugas POS">
          {profile.role === "cashier" ? <>Saat tutup sesi, masukkan hasil hitung kas dan jelaskan setiap selisih. Jika perlu persetujuan Owner, sesi tetap berstatus menunggu sampai keputusan tercatat.</> : <>Sebelum menyetujui selisih kas, periksa alasan kasir dan angka harapan/hitungan. Setiap persetujuan menyimpan pelaku, waktu, dan nomor sesi pada Audit Trail.</>}
        </section>
        {customerLinkMigrationPending ? (
          <section className="notice notice-warning" role="status">
            Pencatatan pelanggan pada struk sedang tidak tersedia. Hubungi administrator untuk mengaktifkannya. Penjualan untuk pembeli umum tetap dapat dilakukan.
          </section>
        ) : null}
        {!activeSession ? <Panel title="Buka sesi kasir">
          <Form action={openPosSessionAction} submitLabel="Buka sesi">
            <CurrencyInput label="Opening Cash" name="opening_cash" allowZero defaultValue={configuration.data.opening_cash} />
          </Form>
        </Panel> : null}
        {activeSession?.status === "Pending Approval" ? <section className="notice notice-info">Sesi {activeSession.number} menunggu persetujuan Owner. Selesaikan persetujuan sebelum membuka sesi baru.</section> : !activeSession ? <section className="notice notice-info">Buka sesi kasir untuk mulai mencatat penjualan.</section> : null}
        {activeSession?.status === "Open" ? <><Panel title="Penjualan POS">
          <Form action={createPosSaleAction} submitLabel="Selesaikan penjualan">
            <Select label="Produk" name="sku" options={products.data.map((item) => option(item.sku, `${item.sku} · ${item.name} · ${money(item.sales_price)}`))} />
            <NumberInput label="Kuantitas" name="quantity" />
            <Select label="Metode pembayaran" name="payment_method" options={methods.data.filter(item => ["CASH", "BANK"].includes(item.id)).map((item) => option(item.id, item.name))} />
            <Select label="Pelanggan (opsional)" name="customer_id" options={[option("", "Pembeli umum"), ...customers.data.map((item) => option(item.id, `${item.id} · ${item.name} · limit ${money(item.credit_limit)}`))]} required={false} />
            <p className="muted-copy">Penjualan POS langsung lunas dan tidak menambah piutang atau memakai batas kredit. Pilih pelanggan untuk mencatatnya pada struk. Untuk Cash + Bank, gunakan Hold Order lalu Checkout Hold.</p>
          </Form>
        </Panel>
        <Panel title="Hold pesanan POS">
          <PosCart products={products.data} customers={customers.data} action={createPosHoldAction} transactionKey={crypto.randomUUID()} />
          <p className="muted-copy">Hold kedaluwarsa 10 menit setelah dibuat oleh server; stok dilepas saat dibayar, dibatalkan, atau kedaluwarsa.</p>
        </Panel></> : null}
        {checkoutHolds.length > 0 ? (
          <>
            <Panel title="Selesaikan hold · tender lunas">
              <Form action={completePosHoldAction} submitLabel="Bayar dan buat satu struk">
                <Select label="Hold" name="hold_number" options={checkoutHolds.map((item) => option(item.number, `${item.number} · ${customers.data.find(c => c.id === item.customer_id)?.name ?? "Pembeli umum"} · total ${money(holdTotals.get(item.number) ?? 0)}`))} />
                <CurrencyInput label="Tender Cash" allowZero name="cash_amount" defaultValue={0} />
                <CurrencyInput label="Tender Bank" allowZero name="bank_amount" defaultValue={0} />
              </Form>
            </Panel>
          </>
        ) : null}
        {openHolds.length > 0 ? <Panel title="Batalkan hold">
              <Form action={cancelPosHoldAction} submitLabel="Batalkan dan lepas reservasi" idempotent={false}>
                <Select label="Hold aktif" name="hold_number" options={openHolds.map((item) => option(item.number, item.number))} />
              </Form>
            </Panel> : null}
        <Panel title="Pelepasan hold kedaluwarsa">
          <Form action={expirePosHoldsAction} submitLabel="Periksa dan lepas hold expired" idempotent={false}>
            <p className="muted-copy">Hold yang masa berlakunya lewat akan ditandai Expired dan reservasinya dilepas.</p>
          </Form>
        </Panel>
        {activeSession?.status === "Open" ? (
          <Panel title={`Tutup sesi ${activeSession.number}`}>
            <Form action={closePosSessionAction} submitLabel="Tutup sesi" idempotent={false}>
              <input name="session_number" type="hidden" value={activeSession.number} />
              <p className="muted-copy">Expected Cash: {money(activeSession.expected_cash ?? activeSession.opening_cash)}. Masukkan hasil hitung kas fisik.</p>
              <CurrencyInput label="Counted Cash" name="counted_cash" allowZero />
              <TextInput label="Variance Reason" name="variance_reason" required={false} />
            </Form>
          </Panel>
        ) : null}
        {reconciledPos.sessions.filter((item) => item.status === "Pending Approval").map((item) => (
          <Panel key={item.number} title={`Persetujuan selisih ${item.number}`}>
            <p>Kasir {item.cashier_label} · permintaan dicatat {dateLabel(sessionEvents.get(item.number)?.find((event) => event.action === "close")?.occurred_at, true)} · Harapan {money(item.expected_cash ?? 0)} · Hitung {money(item.counted_cash ?? 0)} · Selisih {money(item.cash_difference ?? 0)}.</p>
            <p>Alasan kasir: {item.variance_reason || "Belum ada alasan tercatat."}</p>
            <Form action={approvePosVarianceAction} submitLabel="Setujui dan tutup" idempotent={false}>
              <input name="session_number" type="hidden" value={item.number} />
            </Form>
          </Panel>
        ))}
        <Panel title="Sesi POS">
          <DataTable documents={{0:"session"}} headers={["Session", "Cashier", "Status", "Opened On", "Closed On", "Opening Cash", "Expected Cash", "Counted Cash", "Cash Difference", "Variance Reason", "Approval"]} rows={reconciledPos.sessions.filter(item => profile.role === "owner" || item.opened_by === profile.id).map((item) => {
            const approval = approvalEvents.get(item.number);
            const approver = approval?.actor_label ?? (item.approved_by ? `Owner · ${item.approved_by}` : item.status === "Pending Approval" ? "Menunggu Owner" : item.cash_difference === 0 ? "Tidak perlu (selisih nol)" : "—");
            const approvalTime = approval ? dateLabel(approval.occurred_at, true) : item.approved_by ? dateLabel(item.closed_at, true) : "—";
            return [
              item.number, item.cashier_label, item.status, dateLabel(item.opened_at, true), dateLabel(item.closed_at, true),
              money(item.opening_cash), money(item.expected_cash ?? item.opening_cash),
              item.counted_cash === null ? "—" : money(item.counted_cash),
              item.cash_difference === null ? "—" : money(item.cash_difference),
              item.variance_reason ?? "—", item.approved_by ? `${approver} · ${approvalTime}` : approver,
            ];
          })} />
        </Panel>
        {profile.role === "owner" ? <Panel title="Bukti persetujuan selisih kas">
          <DataTable documents={{0:"session"}} headers={["Session", "Approval", "Approved By", "Approved On", "Cash Difference", "Variance Reason"]} rows={reconciledPos.sessions.filter((item) => item.approved_by).map((item) => {
            const approval = approvalEvents.get(item.number);
            return [
              item.number, approval ? "Disetujui" : "Data persetujuan belum ditemukan",
              approval?.actor_label ?? `Owner · ${item.approved_by}`,
              approval ? dateLabel(approval.occurred_at, true) : dateLabel(item.closed_at, true),
              item.cash_difference === null ? "—" : money(item.cash_difference), item.variance_reason ?? "—",
            ];
          })} />
        </Panel> : null}
        <Panel title="Hold dan baris pesanan">
          <DataTable documents={{0:"hold",2:"session"}} headers={["Order on Hold", "Customer", "Session", "Status", "Expires On", "Order Lines", "Total"]} rows={reconciledPos.holds.map((item) => [
            item.number, customers.data.find(c => c.id === item.customer_id)?.name ?? "Pembeli umum", item.session_number, item.status, new Date(item.expires_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB",
            holdLines.data.filter((line) => line.hold_number === item.number).map((line) => `${line.sku} × ${line.quantity}`).join(" · ") || "—",
            money(holdTotals.get(item.number) ?? 0),
          ])} />
        </Panel>
        <Panel title="Struk">
          <DataTable linkColumn={{ index: 0, prefix: "/pos/receipt/" }} documents={{1:"session",2:"customer"}} headers={["Reference", "Session", "Customer", "Order Lines", "Total", "Payments", "Sold On"]} rows={reconciledPos.receipts.map((item) => [
            item.number, item.session_number,
            item.customer_id ? `${item.customer_id} · ${customers.data.find((customer) => customer.id === item.customer_id)?.name ?? "Pelanggan"}` : "Pembeli umum",
            reconciledPos.receiptLines.filter((line) => line.receipt_number === item.number).map((line) => `${line.sku} × ${line.quantity}`).join(" · ") || `${item.sku} × ${item.quantity}`,
            money(item.total), receiptTenderLabels.get(item.number)?.join(" + ") ?? item.payment_method,
            new Date(item.sold_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB",
          ])} />
        </Panel>
      </ModuleWorkspace>
    );
  }

  if (profile.role === "warehouse") {
    const [deliveries, deliveryLines] = await Promise.all([
      supabase.from("delivery_notes").select("number, sales_order_number, delivered_at").order("delivered_at", { ascending: false }),
      supabase.from("delivery_note_lines").select("delivery_number, sku, quantity"),
    ]);
    const error = deliveries.error ?? deliveryLines.error;
    if (error) return <DataLoadError error={error.message} />;
    return <ModuleWorkspace role={profile.role}>
      <PageTitle module={module} />
      <section className="notice notice-info">Warehouse memeriksa barang terhadap pengiriman asal. Posting Credit Note dan penyesuaian piutang dilakukan oleh Finance atau Owner. Buka Return Inspections untuk mencatat kondisi barang dan menelusuri Return Move. Finance/Owner mem-posting Credit Note setelah inspeksi disetujui.</section>
      <Panel title="Referensi pengiriman untuk pemeriksaan retur">
        <DataTable documents={{0:"delivery",1:"sales"}} headers={["Delivery", "Sales Order", "Produk terkirim", "Waktu"]} rows={(deliveries.data ?? []).map((delivery) => [delivery.number, delivery.sales_order_number, (deliveryLines.data ?? []).filter((line) => line.delivery_number === delivery.number).map((line) => `${line.sku} × ${line.quantity}`).join(" · "), new Date(delivery.delivered_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB"])} />
      </Panel>
    </ModuleWorkspace>;
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
  const reconciledReturnInvoices = invoices.data;
  const returnableInvoices = reconciledReturnInvoices.filter((item) => item.status === "Posted" && item.total - item.amount_paid - item.amount_credited > 0);
  const invoiceLineOptions = lines.data
    .filter((line) => returnableInvoices.some((invoice) => invoice.number === line.invoice_number))
    .map((line) => option(`${line.invoice_number}|${line.sku}`, `${line.invoice_number} · ${line.sku} · max ${line.quantity}`));
  return (
    <ModuleWorkspace role={profile.role}>
      <PageTitle module={module} /><MessageBanner message={message} />
      {workflowsReady ? <section className="section-card"><a className="button button-primary" href="/inspections">Return Inspections</a><p>Mulai dari dokumen sumber; konfirmasi dan posting mengikuti status serta hak akses.</p></section> : <>
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
      </>}
      <Panel title="Invoice terkait">
        <DataTable documents={{0:"invoice",1:"customer"}} headers={["Invoice", "Pelanggan", "Status", "Total", "Dibayar", "Dikreditkan", "Sisa"]} rows={reconciledReturnInvoices.map((item) => [
          item.number, item.customer_id, item.status, money(item.total), money(item.amount_paid), money(item.amount_credited),
          money(item.total - item.amount_paid - item.amount_credited),
        ])} />
      </Panel>
      <Panel title="Credit Note">
        <DataTable documents={{0:"credit-note",1:"invoice"}} headers={["Nomor", "Invoice", "Subtotal", "PBJT", "Total", "Dibuat"]} rows={creditNotes.data.map((item) => [
          item.number, item.invoice_number, money(item.subtotal), money(item.tax_amount), money(item.total), new Date(item.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB",
        ])} />
      </Panel>
    </ModuleWorkspace>
  );
}
