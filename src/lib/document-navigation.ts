import type { AppRole, Database } from "./supabase/database.types";
type TableName = keyof Database["public"]["Tables"];
export type Column = { key: string; label: string; format?: "money" | "date" | "time"; document?: string };
type Definition = { table: TableName; key?: string; title: string; back: string; roles: AppRole[]; fields: Column[]; lines?: { table: TableName; foreign: string; fields: Column[] } };
const all: AppRole[] = ["sales","warehouse","procurement","finance","cashier","owner"];
const finance: AppRole[] = ["finance","owner"];
const c = (key:string,label:string,format?:Column["format"],document?:string):Column => ({key,label,format,document});
const monetary=[c("subtotal","Untaxed Amount","money"),c("tax_total","PBJT","money"),c("total","Total","money")];
const saleLines={table:"sales_order_lines" as const,foreign:"sales_order_number",fields:[c("sku","Product",undefined,"product"),c("quantity","Ordered Quantity"),c("unit_price","Unit Price","money"),c("discount_percent","Discount (%)"),c("subtotal","Untaxed Amount","money"),c("tax_amount","PBJT","money")]};
const purchaseLines={table:"purchase_order_lines" as const,foreign:"purchase_order_number",fields:[c("sku","Product",undefined,"product"),c("quantity","Ordered Quantity"),c("received_quantity","Accepted Quantity"),c("rejected_quantity","Rejected Quantity"),c("billed_quantity","Billed Quantity"),c("unit_price","Unit Price","money")]};
export const documentDefinitions = {
 sales:{table:"sales_orders",title:"Sales Order",back:"/sales",roles:["sales","warehouse","owner"],fields:[c("customer_id","Customer",undefined,"customer"),c("order_date","Order Date","date"),c("location_code","Location"),c("source_lead_number","Source Opportunity",undefined,"lead"),c("discount_percent","Discount (%)"),...monetary],lines:saleLines},
 delivery:{table:"delivery_notes",title:"Delivery",back:"/sales",roles:["sales","warehouse","owner"],fields:[c("sales_order_number","Sales Order",undefined,"sales"),c("delivered_at","Delivered On","time")],lines:{table:"delivery_note_lines",foreign:"delivery_number",fields:[c("sku","Product",undefined,"product"),c("quantity","Done Quantity")]}},
 purchase:{table:"purchase_orders",title:"Purchase Order",back:"/purchase",roles:["procurement","warehouse","owner"],fields:[c("vendor_id","Vendor",undefined,"vendor"),c("order_date","Order Date","date"),c("destination_code","Destination"),c("total","Total","money")],lines:purchaseLines},
 receipt:{table:"goods_receipts",title:"Goods Receipt",back:"/purchase",roles:["procurement","warehouse","owner"],fields:[c("purchase_order_number","Purchase Order",undefined,"purchase"),c("received_at","Received On","time")],lines:{table:"goods_receipt_lines",foreign:"receipt_number",fields:[c("sku","Product",undefined,"product"),c("accepted_quantity","Accepted Quantity"),c("rejected_quantity","Rejected Quantity")]}},
 bill:{table:"vendor_bills",title:"Vendor Bill",back:"/invoicing",roles:finance,fields:[c("vendor_id","Vendor",undefined,"vendor"),c("source_document","Source Document",undefined,"purchase"),c("issue_date","Bill Date","date"),c("due_date","Due Date","date"),...monetary,c("amount_paid","Paid","money")],lines:{table:"vendor_bill_lines",foreign:"bill_number",fields:[c("sku","Product",undefined,"product"),c("quantity","Billed Quantity"),c("unit_price","Unit Price","money"),c("subtotal","Untaxed Amount","money")]}},
 payment:{table:"customer_payments",title:"Customer Payment",back:"/invoicing",roles:finance,fields:[c("invoice_number","Customer Invoice",undefined,"invoice"),c("amount","Amount","money"),c("account_code","Payment Journal"),c("paid_at","Paid On","time")]},
 "vendor-payment":{table:"vendor_payments",title:"Vendor Payment",back:"/invoicing",roles:finance,fields:[c("bill_number","Vendor Bill",undefined,"bill"),c("amount","Amount","money"),c("account_code","Payment Journal"),c("paid_at","Paid On","time")]},
 "credit-note":{table:"credit_notes",title:"Credit Note",back:"/returns",roles:finance,fields:[c("invoice_number","Customer Invoice",undefined,"invoice"),c("subtotal","Untaxed Amount","money"),c("tax_amount","PBJT","money"),c("total","Total","money"),c("created_at","Created On","time")],lines:{table:"credit_note_lines",foreign:"credit_note_number",fields:[c("sku","Product",undefined,"product"),c("quantity","Returned Quantity"),c("item_condition","Condition"),c("subtotal","Untaxed Amount","money"),c("tax_amount","PBJT","money")]}},
 transfer:{table:"inventory_transfers",title:"Internal Transfer",back:"/inventory",roles:["warehouse","procurement","owner"],fields:[c("sku","Product",undefined,"product"),c("source_location","Source Location"),c("destination_location","Destination Location"),c("quantity","Quantity"),c("transferred_at","Transferred On","time")]},
 journal:{table:"journal_entries",title:"Journal Entry",back:"/accounting",roles:finance,fields:[c("entry_date","Date","date"),c("memo","Memo"),c("source_type","Source Type"),c("source_reference","Source Document",undefined,"source")],lines:{table:"journal_lines",foreign:"journal_entry_id",fields:[c("account_code","Account"),c("debit","Debit","money"),c("credit","Credit","money")]}},
 lead:{table:"leads",title:"Opportunity",back:"/crm",roles:["sales","owner"],fields:[c("customer_id","Customer",undefined,"customer"),c("sku","Product",undefined,"product"),c("quantity","Quantity"),c("stage","Stage"),c("expected_revenue","Expected Revenue","money"),c("probability_percent","Probability (%)"),c("lost_reason","Lost Reason")]},
 product:{table:"products",key:"sku",title:"Product",back:"/",roles:all,fields:[c("name","Product Name"),c("size","Size"),c("color","Variant"),c("unit","Unit of Measure"),c("sales_price","Sales Price","money"),c("default_vendor_id","Default Vendor",undefined,"vendor")]},
 customer:{table:"customers",key:"id",title:"Customer",back:"/",roles:all,fields:[c("name","Name"),c("type","Customer Type"),c("city","City"),c("credit_limit","Credit Limit","money"),c("payment_terms_code","Payment Terms")]},
 vendor:{table:"vendors",key:"id",title:"Vendor",back:"/",roles:all,fields:[c("name","Name"),c("city","City"),c("payment_terms_code","Payment Terms"),c("tax_profile","Tax Profile")]},
 hold:{table:"pos_holds",title:"Order on Hold",back:"/pos",roles:["cashier","owner"],fields:[c("session_number","POS Session",undefined,"session"),c("customer_id","Customer",undefined,"customer"),c("created_at","Created On","time"),c("expires_at","Hold Until","time")],lines:{table:"pos_hold_lines",foreign:"hold_number",fields:[c("sku","Product",undefined,"product"),c("quantity","Quantity"),c("unit_price","Unit Price","money"),c("subtotal","Untaxed Amount","money"),c("tax_amount","PBJT","money")]}},
 session:{table:"pos_sessions",title:"POS Session",back:"/pos",roles:["cashier","owner"],fields:[c("cashier_label","Cashier"),c("opened_at","Opened On","time"),c("closed_at","Closed On","time"),c("opening_cash","Opening Cash","money"),c("expected_cash","Expected Cash","money"),c("counted_cash","Counted Cash","money"),c("cash_difference","Cash Difference","money"),c("variance_reason","Variance Reason")]},
} satisfies Record<string,Definition>;
export type DocumentKind = keyof typeof documentDefinitions | "invoice" | "pos-receipt";
export function knownDocumentKind(value:string):value is DocumentKind { return Object.hasOwn(documentDefinitions,value) || value === "invoice" || value === "pos-receipt"; }
export function canOpenDocument(kind:string,role:AppRole) {
 if(kind === "invoice") return finance.includes(role);
 if(kind === "pos-receipt") return ["cashier","owner"].includes(role);
 return Object.hasOwn(documentDefinitions,kind) && (documentDefinitions[kind as keyof typeof documentDefinitions].roles as AppRole[]).includes(role);
}
export function sourceDocumentKind(type:string):DocumentKind|undefined {
 return ({sales_order:"sales",delivery:"delivery",goods_receipt:"receipt",customer_invoice:"invoice",customer_payment:"payment",vendor_bill:"bill",vendor_payment:"vendor-payment",credit_note:"credit-note",pos_sale:"pos-receipt",pos_receipt:"pos-receipt",inventory_transfer:"transfer",sales_invoice:"invoice",pos_hold:"hold",pos_session:"session",purchase_order:"purchase",lead:"lead",product:"product",customer:"customer",vendor:"vendor"} as Record<string,DocumentKind>)[type];
}
export function documentHref(kind:DocumentKind,reference:string) {
 const clean=reference.split(" · ")[0].split(":")[0];
 return (kind === "pos-receipt" ? "/pos/receipt/" : "/documents/"+kind+"/")+encodeURIComponent(clean).replace(/%2F/gi,"~");
}

export function resolveDocumentLink(kind:DocumentKind,reference:string,role:AppRole) {
 const clean=reference.split(" · ")[0].split(":")[0];
 const target=kind==="payment"&&clean.startsWith("VP")?"vendor-payment":kind==="invoice"&&clean.startsWith("BILL")?"bill":kind;
 const patterns:Partial<Record<DocumentKind,RegExp>>={customer:/^C[0-9]+$/,vendor:/^V[0-9]+$/,sales:/^S[0-9]+$/,purchase:/^PO[0-9]+$/,invoice:/^(INV[0-9]+|OPEN-AR-[A-Z0-9-]+)$/,bill:/^(BILL[0-9]+|OPEN-AP-[A-Z0-9-]+)$/,product:/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/};
 if(!clean||clean==="—"||(patterns[target]&&!patterns[target]?.test(clean))||!canOpenDocument(target,role))return null;
 return documentHref(target,clean);
}
