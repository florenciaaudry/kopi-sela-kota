import { MasterRecordControls } from "../../../master-controls";
import { DocumentNotes } from "../../../document-notes";
import { WorkflowRecordControls } from "../../../workflow-record-controls";
import { WorkflowNotice, type WorkflowMessage } from "../../../workflow-workspace";
import Link from "next/link";
import type { ReactNode } from "react";
import { CurrencyInput } from "../../../currency-input";
import { SubmitButton } from "../../../submit-button";
import { deliverSalesOrderAction, receivePurchaseOrderAction, createInvoiceAction, createVendorBillAction, recordVendorPaymentAction, updateLeadStageAction, completePosHoldAction, cancelPosHoldAction, closePosSessionAction, approvePosVarianceAction } from "../../../module-actions";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { documentDefinitions, canOpenDocument, documentHref, sourceDocumentKind, type DocumentKind, type Column } from "@/lib/document-navigation";
import type { AppRole, Database } from "@/lib/supabase/database.types";
import { formatRupiah } from "@/lib/format";
import { DataTable } from "../../../data-table";
type Row=Record<string,unknown>;
type Table=keyof Database["public"]["Tables"];
const value=(row:Row,key:string)=>row[key]===null||row[key]===undefined ? "—" : String(row[key]);
function formatted(row:Row,col:Column) {
 const raw=row[col.key];if(raw===null||raw===undefined)return "—";
 if(col.format==="money")return formatRupiah(Number(raw));
 if(col.format==="time")return new Date(String(raw)).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})+" WIB";
 if(col.format==="date")return String(raw);
 if(col.key==="account_code")return raw==="1101"?"1101 · Cash":raw==="1102"?"1102 · Bank":String(raw);
 if(col.key==="source_document")return String(raw).split(":")[0];
 return String(raw);
}
async function readClock(){return Date.now();}
function ActionForm({title,action,fields,children,idempotent=true}:{title:string;action:(form:FormData)=>Promise<void>;fields:Record<string,string>;children?:ReactNode;idempotent?:boolean}) {
 return <details className="document-action-form"><summary>{title}</summary><form action={action} className="demo-form">
  {Object.entries(fields).map(([name,value])=><input type="hidden" name={name} value={value} key={name}/>)}
  {idempotent?<input type="hidden" name="idempotency_key" value={crypto.randomUUID()}/>:null}
  {children}<SubmitButton label={title}/>
 </form></details>;
}
export default async function BusinessDocument({params,searchParams}:{params:Promise<{kind:string;number:string}>;searchParams:Promise<WorkflowMessage>}) {
 const {kind,number:rawNumber}=await params;
 let number:string;try {number=decodeURIComponent(rawNumber).replaceAll("~","/");}catch{notFound();}
 if(!Object.hasOwn(documentDefinitions,kind)||number.length>100||!/^[-A-Za-z0-9/]+$/.test(number))notFound();
 const definition=documentDefinitions[kind as keyof typeof documentDefinitions];
 const profile=await requireRole([...(definition.roles as AppRole[])]);
 const client=await createSupabaseServerClient();
 const field="key" in definition?definition.key:"number";
 const head=await client.from(definition.table).select("*").eq(field,number).maybeSingle();
 if(head.error)return <section className="notice notice-error" role="alert"><h1>{definition.title}</h1><p>Dokumen gagal dimuat. Muat ulang untuk mencoba lagi.</p></section>;
 if(!head.data)notFound();const row=head.data as unknown as Row;
 if(kind==="session"&&row.expected_cash===null)row.expected_cash=row.opening_cash;
 if(profile.role==="cashier"&&((kind==="session"&&row.opened_by!==profile.id)||(kind==="hold"&&row.created_by!==profile.id)))notFound();
 const message=await searchParams;
 const now=await readClock();
 const actions:ReactNode[]=[];
 const sections:{title:string;fields:Column[];rows:Row[];kind?:DocumentKind;error?:boolean}[]=[];
 async function related(title:string,table:Table,foreign:string,match:string,fields:Column[],target?:DocumentKind) {
  if(target&&!canOpenDocument(target,profile.role))return;
  const result=await client.from(table).select("*").eq(foreign,match).limit(501);
  sections.push({title,fields,rows:(result.data??[]) as unknown as Row[],kind:target,error:Boolean(result.error)});
 }
 if("lines" in definition)await related(kind==="journal"?"Journal Items":"Order Lines",definition.lines.table,definition.lines.foreign,kind==="journal"?String(row.id):number,definition.lines.fields);
 if(kind==="return-inspection")await related("Return Stock Moves","return_stock_moves","inspection_number",number,[{key:"number",label:"Reference"},{key:"restock_quantity",label:"Restocked Quantity"},{key:"rejected_quantity",label:"Rejected Quantity"},{key:"stock_value",label:"Stock Value",format:"money"}],"return-move");
 if(kind==="sales") {
  await related("Deliveries","delivery_notes","sales_order_number",number,[{key:"number",label:"Reference"},{key:"delivered_at",label:"Delivered On",format:"time"}],"delivery");
  if(canOpenDocument("invoice",profile.role)) {
   const invoices=await client.from("customer_invoices").select("number,source_document,total,amount_paid,amount_credited,status").or("source_document.eq."+number+",source_document.like."+number+":%");
   sections.push({title:"Customer Invoices",fields:[{key:"number",label:"Reference"},{key:"status",label:"Status"},{key:"total",label:"Total",format:"money"},{key:"amount_paid",label:"Paid",format:"money"}],rows:(invoices.data??[]) as unknown as Row[],kind:"invoice",error:Boolean(invoices.error)});
  }
 }
 if(kind==="sales") {
  const lineSection=sections.find(s=>s.title==="Order Lines");
  const ids=(lineSection?.rows??[]).map(l=>String(l.id));
  if(lineSection&&!lineSection.error&&ids.length){
   const [deliveries,invoices]=await Promise.all([
    client.from("delivery_note_lines").select("sales_order_line_id,quantity").in("sales_order_line_id",ids),
    ["sales","owner"].includes(profile.role)?client.from("customer_invoice_lines").select("sales_order_line_id,quantity").in("sales_order_line_id",ids):Promise.resolve(null),
   ]);
   if(deliveries.error||invoices?.error)lineSection.error=true;
   else {
    lineSection.fields=[...lineSection.fields,{key:"delivered_quantity",label:"Delivered Quantity"},{key:"remaining_quantity",label:"Remaining Quantity"},...(invoices?[{key:"invoiced_quantity",label:"Invoiced Quantity"}]:[])];
    lineSection.rows=lineSection.rows.map(l=>{const delivered=(deliveries.data??[]).filter(d=>d.sales_order_line_id===l.id).reduce((n,d)=>n+d.quantity,0);return {...l,delivered_quantity:delivered,remaining_quantity:Number(l.quantity)-delivered,invoiced_quantity:invoices?(invoices.data??[]).filter(i=>i.sales_order_line_id===l.id).reduce((n,i)=>n+i.quantity,0):undefined};});
   }
  }
 }
 if(kind==="purchase") {
  await related("Receipts","goods_receipts","purchase_order_number",number,[{key:"number",label:"Reference"},{key:"received_at",label:"Received On",format:"time"}],"receipt");
  if(canOpenDocument("bill",profile.role)) {
   const bills=await client.from("vendor_bills").select("number,total,amount_paid,status").or("source_document.eq."+number+",source_document.like."+number+":%");
   sections.push({title:"Vendor Bills",fields:[{key:"number",label:"Reference"},{key:"status",label:"Status"},{key:"total",label:"Total",format:"money"},{key:"amount_paid",label:"Paid",format:"money"}],rows:(bills.data??[]) as unknown as Row[],kind:"bill",error:Boolean(bills.error)});
  }
 }
 if(kind==="purchase") {
  const lineSection=sections.find(s=>s.title==="Order Lines");
  if(lineSection&&!lineSection.error){lineSection.fields=[...lineSection.fields,{key:"remaining_quantity",label:"Remaining Quantity"}];lineSection.rows=lineSection.rows.map(l=>({...l,remaining_quantity:Number(l.quantity)-Number(l.received_quantity)-Number(l.rejected_quantity)}));}
 }
 if(kind==="bill")await related("Payments","vendor_payments","bill_number",number,[{key:"number",label:"Reference"},{key:"amount",label:"Amount",format:"money"},{key:"paid_at",label:"Paid On",format:"time"}],"vendor-payment");
 if(kind==="lead")await related("Sales Orders","sales_orders","source_lead_number",number,[{key:"number",label:"Reference"},{key:"status",label:"Status"},{key:"total",label:"Total",format:"money"}],"sales");
 if(kind==="session")await related("Receipts","pos_receipts","session_number",number,[{key:"number",label:"Reference"},{key:"total",label:"Total",format:"money"},{key:"sold_at",label:"Sold On",format:"time"}],"pos-receipt");
 if(kind==="hold") {
  const lineSection=sections.find(s=>s.title==="Order Lines");
  if(lineSection&&!lineSection.error){const active=row.status==="Open"&&new Date(String(row.expires_at)).getTime()>now;lineSection.fields=[...lineSection.fields,{key:"reserved_quantity",label:"Reserved Quantity"}];lineSection.rows=lineSection.rows.map(l=>({...l,reserved_quantity:active?Number(l.quantity):0}));}
 }
 if(kind==="hold")await related("Receipt","pos_receipts","hold_number",number,[{key:"number",label:"Reference"},{key:"total",label:"Total",format:"money"}],"pos-receipt");
 if(kind==="customer") {
  await related("Sales Orders","sales_orders","customer_id",number,[{key:"number",label:"Reference"},{key:"status",label:"Status"},{key:"total",label:"Total",format:"money"}],"sales");
  await related("Customer Invoices","customer_invoices","customer_id",number,[{key:"number",label:"Reference"},{key:"total",label:"Total",format:"money"},{key:"amount_paid",label:"Paid",format:"money"}],"invoice");
 }
 if(kind==="vendor")await related("Purchase Orders","purchase_orders","vendor_id",number,[{key:"number",label:"Reference"},{key:"status",label:"Status"},{key:"total",label:"Total",format:"money"}],"purchase");
 if(kind==="customer"&&["sales","finance","owner"].includes(profile.role)) {
  const [invoices,orders]=await Promise.all([
   client.from("customer_invoices").select("source_document,status,total,amount_paid,amount_credited").eq("customer_id",number).limit(1001),
   client.from("sales_orders").select("number,status,total").eq("customer_id",number).limit(1001),
  ]);
  if(invoices.error||orders.error||(invoices.data?.length??0)>1000||(orders.data?.length??0)>1000)sections.push({title:"Credit Exposure",fields:[],rows:[],error:true});
  else {
   const posted=(invoices.data??[]).filter(i=>i.status==="Posted");
   const receivable=posted.reduce((n,i)=>n+Number(i.total)-Number(i.amount_paid)-Number(i.amount_credited),0);
   const commitments=(orders.data??[]).filter(o=>["Sales Order","Partial Delivery","Delivered","Invoiced"].includes(o.status)).reduce((n,o)=>n+Math.max(0,Number(o.total)-posted.filter(i=>i.source_document?.split(":")[0]===o.number).reduce((a,i)=>a+Number(i.total),0)),0);
   sections.push({title:"Credit Exposure",fields:[{key:"receivable",label:"Unpaid Invoices",format:"money"},{key:"commitments",label:"Uninvoiced Sales Commitments",format:"money"},{key:"exposure",label:"Total Exposure",format:"money"},{key:"limit",label:"Credit Limit",format:"money"},{key:"remaining",label:"Remaining Credit",format:"money"}],rows:[{receivable,commitments,exposure:receivable+commitments,limit:row.credit_limit,remaining:Number(row.credit_limit)-receivable-commitments}]});
  }
 }
 if(kind==="product"&&["warehouse","procurement","owner"].includes(profile.role)) {
  const stock=await client.from("inventory_availability").select("location_code,on_hand,reserved,available").eq("sku",number);
  sections.push({title:"Stock Availability",fields:[{key:"location_code",label:"Location"},{key:"on_hand",label:"On Hand"},{key:"reserved",label:"Reserved"},{key:"available",label:"Available"}],rows:(stock.data??[]) as unknown as Row[],error:Boolean(stock.error)});
 }
 if(["finance","owner"].includes(profile.role)&&kind!=="journal")await related("Journal Entries","journal_entries","source_reference",number,[{key:"number",label:"Reference"},{key:"entry_date",label:"Date"},{key:"memo",label:"Memo"},{key:"status",label:"Status"}],"journal");
 if(kind==="sales"&&["Sales Order","Partial Delivery","Delivered"].includes(String(row.status))) {
  const ordered=sections.find(s=>s.title==="Order Lines");
  const deliveryNumbers=sections.find(s=>s.title==="Deliveries")?.rows.map(d=>String(d.number))??[];
  const delivered=deliveryNumbers.length?await client.from("delivery_note_lines").select("quantity").in("delivery_number",deliveryNumbers):null;
  const totalOrdered=(ordered?.rows??[]).reduce((n,l)=>n+Number(l.quantity),0);
  const totalDelivered=(delivered?.data??[]).reduce((n,l)=>n+l.quantity,0);
  const remaining=totalOrdered-totalDelivered;
  if(!ordered?.error&&!delivered?.error&&remaining>0&&["warehouse","owner"].includes(profile.role))actions.push(<ActionForm key="delivery" title="Validate Delivery" action={deliverSalesOrderAction} fields={{sales_order_number:number}}><label className="demo-field"><span>Done Quantity · Remaining {remaining}</span><input name="quantity" type="number" min={1} max={remaining} step={1} defaultValue={remaining} required/></label></ActionForm>);
  if(profile.role==="owner"&&totalDelivered>0){
   const inv=sections.find(s=>s.title==="Customer Invoices");const ids=inv?.rows.map(i=>String(i.number))??[];
   const invoiced=ids.length?await client.from("customer_invoice_lines").select("quantity").in("invoice_number",ids):null;
   if(!inv?.error&&!invoiced?.error&&totalDelivered>(invoiced?.data??[]).reduce((n,l)=>n+l.quantity,0))actions.push(<ActionForm key="invoice" title="Create Invoice" action={createInvoiceAction} fields={{sales_order_number:number}}><p>Hanya kuantitas terkirim yang belum ditagih akan dibuatkan invoice.</p></ActionForm>);
  }
 }
 if(kind==="purchase") {
  const lines=sections.find(s=>s.title==="Order Lines");const quantities=lines?.rows??[];
  const remaining=quantities.reduce((n,l)=>n+Number(l.quantity)-Number(l.received_quantity)-Number(l.rejected_quantity),0);
  const unbilled=quantities.reduce((n,l)=>n+Number(l.received_quantity)-Number(l.billed_quantity),0);
  if(!lines?.error&&remaining>0&&["warehouse","owner"].includes(profile.role))actions.push(<ActionForm key="receipt" title="Validate Receipt" action={receivePurchaseOrderAction} fields={{purchase_order_number:number}}><label className="demo-field"><span>Accepted Quantity · Remaining {remaining}</span><input name="accepted_quantity" type="number" min={0} max={remaining} step={1} defaultValue={remaining} required/></label><label className="demo-field"><span>Rejected Quantity</span><input name="rejected_quantity" type="number" min={0} max={remaining} step={1} defaultValue={0} required/></label></ActionForm>);
  if(!lines?.error&&unbilled>0&&profile.role==="owner")actions.push(<ActionForm key="bill" title="Create Vendor Bill" action={createVendorBillAction} fields={{purchase_order_number:number}}><p>{unbilled} unit diterima baik belum ditagih. Barang ditolak tidak masuk Vendor Bill.</p></ActionForm>);
 }
 if(kind==="bill"&&Number(row.total)>Number(row.amount_paid))actions.push(<ActionForm key="payment" title="Register Payment" action={recordVendorPaymentAction} fields={{bill_number:number}}><CurrencyInput label="Amount" name="amount" defaultValue={Number(row.total)-Number(row.amount_paid)}/><label className="demo-field"><span>Payment Journal</span><select name="account_code" required><option value="1102">Bank</option><option value="1101">Cash</option></select></label></ActionForm>);
 if(kind==="lead")actions.push(<ActionForm key="stage" title="Update Stage" action={updateLeadStageAction} fields={{lead_number:number}} idempotent={false}><label className="demo-field"><span>Stage</span><select name="stage" defaultValue={String(row.stage)} required>{["New","Qualified","Proposition","Won","Lost"].map(v=><option key={v}>{v}</option>)}</select></label><label className="demo-field"><span>Lost Reason · wajib untuk Lost</span><input name="lost_reason" defaultValue={row.lost_reason?String(row.lost_reason):""}/></label></ActionForm>);
 if(kind==="hold"&&row.status==="Open"&&row.created_by===profile.id&&new Date(String(row.expires_at)).getTime()>now) {
  const session=await client.from("pos_sessions").select("status,opened_by").eq("number",String(row.session_number)).maybeSingle();
  const lines=sections.find(s=>s.title==="Order Lines");
  if(!session.error&&session.data?.status==="Open"&&session.data.opened_by===profile.id&&!lines?.error){const total=(lines?.rows??[]).reduce((n,l)=>n+Number(l.subtotal)+Number(l.tax_amount),0);actions.push(<ActionForm key="checkout" title="Validate Payment" action={completePosHoldAction} fields={{hold_number:number}}><p>Total {formatRupiah(total)}. Cash + Bank harus sama dengan total.</p><CurrencyInput label="Tender Cash" name="cash_amount" allowZero defaultValue={0}/><CurrencyInput label="Tender Bank" name="bank_amount" allowZero defaultValue={total}/></ActionForm>);}
  actions.push(<ActionForm key="cancel" title="Cancel Hold" action={cancelPosHoldAction} fields={{hold_number:number}} idempotent={false}><p>Pesanan dibatalkan dan reservasi dilepas; tidak membuat penjualan.</p></ActionForm>);
 }
 if(kind==="session"&&row.status==="Open"&&row.opened_by===profile.id)actions.push(<ActionForm key="close" title="Close Session" action={closePosSessionAction} fields={{session_number:number}} idempotent={false}><CurrencyInput label="Counted Cash" name="counted_cash" allowZero defaultValue={Number(row.expected_cash??row.opening_cash)}/><label className="demo-field"><span>Variance Reason · wajib jika ada selisih</span><input name="variance_reason"/></label></ActionForm>);
 if(kind==="session"&&row.status==="Pending Approval"&&profile.role==="owner")actions.push(<ActionForm key="approve" title="Approve Cash Difference" action={approvePosVarianceAction} fields={{session_number:number}} idempotent={false}><p>Setujui selisih setelah memeriksa Expected Cash, Counted Cash dan alasan kasir.</p></ActionForm>);
 const history=profile.role==="owner" ? await client.from("audit_events").select("actor_label,action,occurred_at").eq("document_number",number).order("occurred_at",{ascending:false}).limit(100) : null;
 const status=row.status??row.stage;
 return <div className="page-stack module-workspace">
  <div className="page-heading"><div><p className="eyebrow">{definition.title}</p><h1>{number}</h1><p>{definition.title}</p>{status?<span className="demo-status">{String(status)}</span>:null}</div><Link className="secondary-button" href={definition.back}>← {definition.back === "/" ? "Apps" : definition.title+" / List"}</Link></div>
  <WorkflowNotice message={message}/><WorkflowRecordControls kind={kind} row={row}/><MasterRecordControls kind={kind} row={row}/>
  {actions.length?<section className="section-card document-actions-panel" aria-label="Document Actions"><h2>Actions</h2>{actions}</section>:null}
  <nav className="document-smart-buttons" aria-label="Related Documents">{sections.map((s,i)=>({s,i})).filter(({s})=>s.kind).map(({s,i})=><a className="secondary-button" key={i} href={"#related-"+i}>{s.title}{!s.error ? ` (${s.rows.length>500?"500+":s.rows.length})`:""}</a>)}</nav>
  <section className="section-card"><h2>Details</h2><dl className="receipt-meta">{definition.fields.map(col=>{
   let target=col.document;if(target==="source")target=sourceDocumentKind(String(row.source_type));
   const raw=value(row,col.key);const label=formatted(row,col);const href=target&&target!=="source"&&canOpenDocument(target,profile.role)&&raw!=="—" ? documentHref(target as DocumentKind,raw):null;
   return <div key={col.key}><dt>{col.label}</dt><dd>{href?<Link className="record-link" href={href}>{label}</Link>:label}</dd></div>;
  })}{kind==="bill"?<div><dt>Amount Due</dt><dd>{formatRupiah(Number(row.total)-Number(row.amount_paid))}</dd></div>:null}</dl></section>
  {sections.map((section,index)=><section id={"related-"+index} className="section-card" key={index}><h2>{section.title}</h2>{section.error?<p role="alert" className="form-error">Bagian ini belum dapat dimuat. Coba muat ulang.</p>:<><DataTable documents={Object.fromEntries(section.fields.flatMap((col,i)=>col.document?[[i,col.document as DocumentKind]]:section.kind&&i===0?[[i,section.kind]]:[]))} headers={section.fields.map(f=>f.label)} rows={section.rows.slice(0,500).map(item=>section.fields.map(col=>formatted(item,col)))}/>{section.rows.length>500?<p>500 data pertama ditampilkan. Gunakan daftar modul untuk menelusuri lebih lanjut.</p>:null}</>}</section>)}
  {history?<section className="section-card"><h2>Audit / History</h2>{history.error?<p role="alert">Riwayat belum dapat dimuat.</p>:<DataTable headers={["User","Action","Date & Time (WIB)"]} rows={(history.data??[]).map(e=>[e.actor_label,e.action,new Date(e.occurred_at).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})])}/>}</section>:null}
 <DocumentNotes kind={kind} reference={number}/>
 </div>;
}
