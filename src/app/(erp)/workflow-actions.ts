"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { documentHref, knownDocumentKind } from "@/lib/document-navigation";
import type { Json } from "@/lib/supabase/database.types";
import { parseRupiahInput } from "@/lib/format";
const text=(f:FormData,k:string)=>String(f.get(k)??"").trim();
function number(f:FormData,k:string){const n=Number(text(f,k));if(!Number.isFinite(n))throw Error(k+" tidak valid");return n;}
function money(f:FormData,k:string,allowZero=false){const n=parseRupiahInput(text(f,k),{allowZero});if(n===null)throw Error(k+" tidak valid");return n;}
function safeReturn(f:FormData,fallback:string){const p=text(f,"return_to");return /^\/(quotations|rfqs|master-data|inspections)(\?[^#]*)?$/.test(p)||/^\/documents\/[a-z-]+\/[-A-Za-z0-9~%]+$/.test(p)?p:fallback;}
function message(path:string,error:string):never{redirect(path+(path.includes("?")?"&":"?")+"error="+encodeURIComponent(error));}
export async function workflowAction(f:FormData){
 const op=text(f,"operation"),kind=text(f,"kind"),ref=text(f,"number"),key=text(f,"idempotency_key");
 const back=safeReturn(f,kind==="rfq"?"/rfqs":kind==="return-inspection"?"/inspections":"/quotations");
 if(kind==="quotation")await requireRole(["sales","owner"]);else if(kind==="rfq")await requireRole(["procurement","owner"]);else if(kind==="return-inspection")await requireRole(["warehouse","finance","owner"]);else message(back,"Jenis dokumen tidak valid.");
 const c=await createSupabaseServerClient();let result:{data:string|null;error:{message:string}|null};
 try {
  if(op==="save"&&kind==="quotation")result=await c.rpc("save_quotation",{p_number:ref||null,p_customer_id:text(f,"customer_id"),p_sku:text(f,"sku"),p_quantity:number(f,"quantity"),p_discount_percent:number(f,"discount_percent"),p_source_lead_number:text(f,"source_lead_number")||null,p_expected_revision:ref?number(f,"revision"):null,p_idempotency_key:key});
  else if(op==="save"&&kind==="rfq")result=await c.rpc("save_rfq",{p_number:ref||null,p_vendor_id:text(f,"vendor_id"),p_sku:text(f,"sku"),p_quantity:number(f,"quantity"),p_expected_revision:ref?number(f,"revision"):null,p_idempotency_key:key});
  else if(op==="approve"&&kind==="quotation")result=await c.rpc("approve_quotation_discount",{p_number:ref,p_revision:number(f,"revision"),p_idempotency_key:key});
  else if(op==="confirm"&&kind==="quotation")result=await c.rpc("confirm_quotation",{p_number:ref,p_idempotency_key:key});
  else if(op==="confirm"&&kind==="rfq")result=await c.rpc("confirm_rfq",{p_number:ref,p_idempotency_key:key});
  else if(["Sent","Cancelled"].includes(op)&&["quotation","rfq"].includes(kind))result=await c.rpc("change_draft_status",{p_kind:kind,p_number:ref,p_status:op,p_idempotency_key:key});
  else if(op==="inspect"&&kind==="return-inspection"){const [invoice,sku]=text(f,"invoice_sku").split("|");result=await c.rpc("inspect_customer_return",{p_invoice_number:invoice,p_sku:sku,p_quantity:number(f,"quantity"),p_item_condition:text(f,"item_condition"),p_idempotency_key:key});}
  else if(op==="post"&&kind==="return-inspection")result=await c.rpc("post_return_inspection",{p_number:ref,p_idempotency_key:key});
  else throw Error("Tindakan tidak tersedia.");
 }catch(e){message(back,e instanceof Error?e.message:"Data tidak valid.");}
 if(result.error||!result.data)message(back,result.error?.message??"Dokumen belum tersimpan.");
 revalidatePath("/", "layout");
 const target=op==="confirm"?(kind==="quotation"?"sales":"purchase"):op==="post"?"credit-note":kind;
 if(!knownDocumentKind(target))message(back,"Referensi dokumen tidak valid.");
 redirect(documentHref(target,result.data));
}
export async function masterAction(f:FormData){
 const kind=text(f,"kind"),op=text(f,"operation"),id=text(f,"reference");const back=safeReturn(f,"/master-data");
 if(kind==="customer")await requireRole(["sales","finance","owner"]);else if(kind==="vendor"||kind==="vendor-price")await requireRole(["procurement","owner"]);else if(kind==="product")await requireRole(["owner"]);else message(back,"Jenis master tidak valid.");
 if(op==="delete"&&f.get("confirm_delete")!=="yes")message(back,"Konfirmasi penghapusan master yang belum dipakai diperlukan.");
 const c=await createSupabaseServerClient();let result:{data:string|null;error:{message:string}|null};
 try {
  if(kind==="vendor-price")result=await c.rpc("save_vendor_price",{p_vendor_id:text(f,"vendor_id"),p_sku:text(f,"sku"),p_minimum_quantity:number(f,"minimum_quantity"),p_purchase_price:money(f,"purchase_price"),p_purchase_tax:text(f,"purchase_tax"),p_idempotency_key:text(f,"idempotency_key")});
  else {
   const data:Record<string,Json>=op==="delete"?{}:{name:text(f,"name"),city:text(f,"city"),type:text(f,"customer_type"),credit_limit:kind==="customer"?money(f,"credit_limit",true):0,payment_terms_code:text(f,"payment_terms_code"),tax_profile:text(f,"tax_profile"),size:text(f,"size"),color:text(f,"color"),default_vendor_id:text(f,"default_vendor_id"),sales_price:kind==="product"?money(f,"sales_price",true):0,standard_cost:kind==="product"?money(f,"standard_cost",true):0};
   result=await c.rpc("manage_master",{p_kind:kind,p_operation:op,p_id:id,p_data:op==="delete"?{}:data,p_idempotency_key:text(f,"idempotency_key")});
  }
 }catch(e){message(back,e instanceof Error?e.message:"Data master tidak valid.");}
 if(result.error||!result.data)message(back,result.error?.message??"Master belum tersimpan.");
 revalidatePath("/","layout");if(kind==="vendor-price"||op==="delete")redirect("/master-data?success="+encodeURIComponent("Perubahan master tersimpan."));
 redirect(documentHref(kind as "customer"|"vendor"|"product",result.data));
}
export type NoteState={error?:string;success?:string};
export async function addNoteAction(_previous:NoteState,f:FormData):Promise<NoteState>{
 await requireRole(["sales","warehouse","procurement","finance","cashier","owner"]);const kind=text(f,"kind"),ref=text(f,"reference");
 if(!knownDocumentKind(kind))return {error:"Jenis dokumen tidak valid."};
 const c=await createSupabaseServerClient();const result=await c.rpc("add_document_note",{p_kind:kind,p_reference:ref,p_body:text(f,"body"),p_idempotency_key:text(f,"idempotency_key")});
 if(result.error)return {error:result.error.message};revalidatePath(documentHref(kind,ref));return {success:"Log Note tersimpan."};
}
