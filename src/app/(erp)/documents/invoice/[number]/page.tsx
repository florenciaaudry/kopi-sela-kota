import Link from "next/link";
import { CurrencyInput } from "../../../currency-input";
import { SubmitButton } from "../../../submit-button";
import { recordCustomerPaymentAction } from "../../../module-actions";
import { documentHref } from "@/lib/document-navigation";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";
import { DataTable } from "../../../data-table";
export const metadata={title:"Customer Invoice"};
export default async function InvoiceDocument({params}:{params:Promise<{number:string}>}) {
 const profile=await requireRole(["finance","owner"]);const {number}=await params;
 const client=await createSupabaseServerClient();const [head,lines,payments,credits]=await Promise.all([
  client.from("customer_invoices").select("number,customer_id,source_document,status,issue_date,due_date,subtotal,tax_total,total,amount_paid,amount_credited,is_opening_balance").eq("number",number).maybeSingle(),
  client.from("customer_invoice_lines").select("sku,quantity,unit_price,discount_percent,subtotal,tax_amount").eq("invoice_number",number).order("sku"),
  client.from("customer_payments").select("number,amount,account_code,paid_at").eq("invoice_number",number).order("paid_at"),
  client.from("credit_notes").select("number,total,created_at").eq("invoice_number",number).order("created_at"),
 ]);
 if(head.error||lines.error||payments.error||credits.error)return <section className="notice notice-error" role="alert"><h1>Customer Invoice</h1><p>Dokumen tidak dapat dimuat. Coba muat ulang atau hubungi administrator.</p></section>;
 if(!head.data)notFound();const invoice=head.data;
 const customer=await client.from("customers").select("name").eq("id",invoice.customer_id).maybeSingle();
 const sourceOrder=invoice.source_document?.split(":")[0];
 return <div className="page-stack module-workspace"><div className="page-heading"><div><p className="eyebrow">CUSTOMER INVOICE</p><h1>{invoice.number}</h1><span className="demo-status">{invoice.status}</span></div><Link className="secondary-button" href="/reporting">Reporting</Link><Link className="secondary-button" href="/invoicing">Invoicing</Link></div>
 {Number(invoice.total)-Number(invoice.amount_paid)-Number(invoice.amount_credited)>0?<section className="section-card"><h2>Register Payment</h2><form action={recordCustomerPaymentAction} className="demo-form"><input type="hidden" name="invoice_number" value={invoice.number}/><input type="hidden" name="idempotency_key" value={crypto.randomUUID()}/><CurrencyInput label="Amount" name="amount" defaultValue={Number(invoice.total)-Number(invoice.amount_paid)-Number(invoice.amount_credited)}/><label className="demo-field"><span>Payment Journal</span><select name="account_code" required><option value="1102">Bank</option><option value="1101">Cash</option></select></label><SubmitButton label="Register Payment"/></form></section>:null}
 <section className="section-card"><dl className="receipt-meta"><div><dt>Customer</dt><dd><Link className="record-link" href={documentHref("customer",invoice.customer_id)}>{invoice.customer_id} · {customer.data?.name ?? ""}</Link></dd></div><div><dt>Source Document</dt><dd>{sourceOrder ? profile.role==="owner" ? <Link className="text-button" href={documentHref("sales",sourceOrder)}>{sourceOrder}</Link> : sourceOrder : "Opening Balance"}</dd></div><div><dt>Invoice Date</dt><dd>{invoice.issue_date??"Opening Balance"}</dd></div><div><dt>Due Date</dt><dd>{invoice.due_date}</dd></div></dl><DataTable documents={{0:"product"}} headers={["SKU","Quantity","Unit Price","Discount (%)","Untaxed Amount","PBJT"]} rows={(lines.data??[]).map(line=>[line.sku,line.quantity,formatRupiah(Number(line.unit_price)),line.discount_percent,formatRupiah(Number(line.subtotal)),formatRupiah(Number(line.tax_amount))])}/><dl className="receipt-totals">{[["Untaxed Amount",invoice.subtotal],["PBJT",invoice.tax_total],["Total",invoice.total],["Paid",invoice.amount_paid],["Credit Notes",invoice.amount_credited],["Amount Due",Number(invoice.total)-Number(invoice.amount_paid)-Number(invoice.amount_credited)]].map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{formatRupiah(Number(value))}</dd></div>)}</dl></section>
 <section className="section-card"><h2>Payments</h2><DataTable documents={{0:"payment"}} headers={["Reference","Amount","Payment Journal","Date & Time (WIB)"]} rows={(payments.data??[]).map(payment=>[payment.number,formatRupiah(Number(payment.amount)),payment.account_code==="1101"?"Cash":payment.account_code==="1102"?"Bank":payment.account_code,new Date(payment.paid_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})])}/></section>
 <section className="section-card"><h2>Credit Notes</h2><DataTable documents={{0:"credit-note"}} headers={["Reference","Total","Date & Time (WIB)"]} rows={(credits.data??[]).map(credit=>[credit.number,formatRupiah(Number(credit.total)),new Date(credit.created_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})])}/></section></div>;
}
