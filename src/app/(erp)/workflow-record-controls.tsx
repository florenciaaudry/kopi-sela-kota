import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { documentHref, type DocumentKind } from "@/lib/document-navigation";
import { DraftFields } from "./draft-fields";
import { SubmitButton } from "./submit-button";
import { workflowAction } from "./workflow-actions";
import type { ReactNode } from "react";
function WorkflowForm({kind,row,operation,label,children}:{kind:string;row:Record<string,unknown>;operation:string;label:string;children?:ReactNode}){
 return <form action={workflowAction} className="demo-form workflow-command"><input type="hidden" name="kind" value={kind}/><input type="hidden" name="number" value={String(row.number)}/><input type="hidden" name="revision" value={Number(row.revision??0)}/><input type="hidden" name="operation" value={operation}/><input type="hidden" name="return_to" value={documentHref(kind as DocumentKind,String(row.number))}/><input type="hidden" name="idempotency_key" value={crypto.randomUUID()}/>{children}<SubmitButton label={label}/></form>;
}
export async function WorkflowRecordControls({kind,row}:{kind:string;row:Record<string,unknown>}){
 const p=await requireRole(["sales","warehouse","procurement","finance","cashier","owner"]);
 if(kind==="lead"&&["Qualified","Proposition","Won"].includes(String(row.stage))&&["sales","owner"].includes(p.role))return <Link className="primary-button" href={"/quotations?lead="+encodeURIComponent(String(row.number))}>Create Quotation</Link>;
 if(kind==="return-inspection")return row.status==="Approved"&&["finance","owner"].includes(p.role)?<section className="section-card"><h2>Post Credit Note</h2><p>Inspection dan Return Stock Move sudah dicatat Warehouse. Posting ini mengoreksi nilai invoice tanpa menerima stok dua kali.</p><WorkflowForm kind={kind} row={row} operation="post" label="Post Credit Note"/></section>:null;
 if(kind!=="quotation"&&kind!=="rfq")return null;
 if(["Confirmed","Cancelled"].includes(String(row.status)))return <p className="notice notice-info">Dokumen {String(row.status)} terkunci. Harga dan kuantitas dokumen asal tetap dipertahankan.</p>;
 const c=await createSupabaseServerClient();const [customers,products,vendors,prices]=await Promise.all([c.from("customers").select("id,name"),c.from("products").select("sku,name,sales_price"),c.from("vendors").select("id,name"),kind==="rfq"?c.from("vendor_pricelist").select("vendor_id,sku,purchase_price,minimum_quantity"):Promise.resolve({data:[],error:null})]);
 if(customers.error||products.error||vendors.error||prices.error)return <p role="alert">Data untuk perubahan draft belum tersedia.</p>;
 const approvalNeeded=kind==="quotation"&&Number(row.discount_percent)>5&&(!row.approved_by||row.approved_revision!==row.revision);
 return <section className="section-card"><h2>Actions</h2>{approvalNeeded?<p className="notice notice-warning">Menunggu persetujuan Owner untuk Discount {String(row.discount_percent)}%. Konfirmasi belum diizinkan.</p>:null}<div className="workflow-actions">
 {approvalNeeded&&p.role==="owner"?<WorkflowForm kind={kind} row={row} operation="approve" label="Approve Discount"/>:null}
 {!approvalNeeded?<><WorkflowForm kind={kind} row={row} operation="confirm" label={kind==="quotation"?"Confirm Sales Order":"Confirm Purchase Order"}/>{row.status!=="Sent"?<WorkflowForm kind={kind} row={row} operation="Sent" label={kind==="quotation"?"Mark Quotation Sent":"Mark RFQ Sent"}/>:null}</>:null}
 <WorkflowForm kind={kind} row={row} operation="Cancelled" label="Cancel Draft"/></div>
 <details className="document-action-form"><summary>Edit Draft</summary><WorkflowForm kind={kind} row={row} operation="save" label="Save Draft"><DraftFields kind={kind} customers={customers.data??[]} products={products.data??[]} vendors={vendors.data??[]} prices={prices.data??[]} initial={row}/><p>Perubahan draft memakai harga katalog saat disimpan dan membatalkan approval versi sebelumnya.</p></WorkflowForm></details></section>;
}
