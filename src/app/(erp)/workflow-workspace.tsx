import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";
import { DataTable } from "./data-table";
import { DraftFields } from "./draft-fields";
import { SubmitButton } from "./submit-button";
import { workflowAction } from "./workflow-actions";
export type WorkflowMessage={error?:string;success?:string;lead?:string};
export function WorkflowNotice({message}:{message?:WorkflowMessage}){return message?.error?<p className="notice notice-error" role="alert">{message.error}</p>:message?.success?<p className="notice notice-info" role="status">{message.success}</p>:null;}
export function WorkflowPending(){return <section className="notice notice-warning"><h2>Workflow belum diaktifkan</h2><p>Konfigurasi workflow baru belum tersedia pada database ini. Data dan transaksi sebelumnya tetap dapat dibuka.</p></section>;}
export async function WorkflowWorkspace({kind,message}:{kind:"quotation"|"rfq";message?:WorkflowMessage}){
 await requireRole(kind==="quotation"?["sales","owner"]:["procurement","owner"]);const c=await createSupabaseServerClient();
 const [docs,customers,products,vendors,prices]=await Promise.all([kind==="quotation"?c.from("quotations").select("number,status,customer_id,total,revision,created_at").order("created_at",{ascending:false}):c.from("rfqs").select("number,status,vendor_id,total,revision,created_at").order("created_at",{ascending:false}),c.from("customers").select("id,name").order("id"),c.from("products").select("sku,name,sales_price").order("sku"),c.from("vendors").select("id,name").order("id"),kind==="rfq"?c.from("vendor_pricelist").select("vendor_id,sku,purchase_price,minimum_quantity"):Promise.resolve({data:[],error:null})]);
 if(docs.error?.code==="42P01"||docs.error?.code==="PGRST205")return <WorkflowPending/>;
 if(docs.error||customers.error||products.error||vendors.error||prices.error)return <p role="alert">Data workflow belum dapat dimuat. Coba muat ulang.</p>;
 let initial:Record<string,unknown>={};if(kind==="quotation"&&message?.lead){const l=await c.from("leads").select("number,customer_id,sku,quantity").eq("number",message.lead).maybeSingle();if(l.data)initial={...l.data,source_lead_number:l.data.number};}
 const title=kind==="quotation"?"Quotations":"Requests for Quotation";
 return <div className="page-stack module-workspace"><div className="page-heading"><div><h1>{title}</h1><p>{kind==="quotation"?"Siapkan penawaran, minta approval bila perlu, lalu konfirmasi menjadi Sales Order.":"Siapkan permintaan harga pemasok, lalu konfirmasi menjadi Purchase Order."}</p></div><Link className="secondary-button" href={kind==="quotation"?"/sales":"/purchase"}>← {kind==="quotation"?"Sales":"Purchase"}</Link></div><WorkflowNotice message={message}/>
 <section className="section-card"><details className="document-action-form" open={Boolean(message?.lead)}><summary>{kind==="quotation"?"New Quotation":"New RFQ"}</summary><form action={workflowAction} className="demo-form"><input type="hidden" name="operation" value="save"/><input type="hidden" name="kind" value={kind}/><input type="hidden" name="idempotency_key" value={crypto.randomUUID()}/><DraftFields kind={kind} customers={customers.data??[]} products={products.data??[]} vendors={vendors.data??[]} prices={prices.data??[]} initial={initial}/><SubmitButton label="Save Draft"/></form></details></section>
 <section className="section-card"><h2>{title}</h2><DataTable documents={{0:kind}} headers={["Reference",kind==="quotation"?"Customer":"Vendor","Status","Total","Revision"]} rows={(docs.data??[]).map(d=>[d.number,"customer_id" in d?String(d.customer_id):"vendor_id" in d?String(d.vendor_id):"—",d.status,formatRupiah(Number(d.total)),d.revision])}/></section></div>;
}
