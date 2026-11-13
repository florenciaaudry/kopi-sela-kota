"use client";
import { useState } from "react";
import { fulfillLinesAction } from "./workflow-actions";
import { ReturnContextField } from "./contextual-back-link";
import { SubmitButton } from "./submit-button";
import { documentHref } from "@/lib/document-navigation";
export type FulfillmentLine={sku:string;remaining:number};
export function MultiFulfillment({kind,reference,lines,transactionKey}:{kind:"sales"|"purchase";reference:string;lines:FulfillmentLine[];transactionKey:string}){
 const [rows,setRows]=useState(lines.map(l=>({...l,quantity:l.remaining,accepted_quantity:l.remaining,rejected_quantity:0})));
 const receipt=kind==="purchase";
 const payload=rows.filter(l=>receipt?l.accepted_quantity+l.rejected_quantity>0:l.quantity>0).map(l=>receipt?{sku:l.sku,accepted_quantity:l.accepted_quantity,rejected_quantity:l.rejected_quantity}:{sku:l.sku,quantity:l.quantity});
 const patch=(index:number,data:Partial<typeof rows[number]>)=>setRows(all=>all.map((l,i)=>i===index?{...l,...data}:l));
 return <section className="section-card"><details className="document-action-form"><summary>{receipt?"Validate Receipt":"Validate Delivery"}</summary><form data-unsaved-guard action={fulfillLinesAction} className="demo-form"><ReturnContextField/><input type="hidden" name="kind" value={kind}/><input type="hidden" name="reference" value={reference}/><input type="hidden" name="return_to" value={documentHref(kind,reference)}/><input type="hidden" name="idempotency_key" value={transactionKey}/><input type="hidden" name="order_lines" value={JSON.stringify(payload)}/>
 <div className="order-line-editor table-scroll"><table><thead><tr><th>Product</th><th>Remaining Quantity</th><th>{receipt?"Accepted Quantity":"Done Quantity"}</th>{receipt?<th>Rejected Quantity</th>:null}</tr></thead><tbody>{rows.map((l,i)=><tr key={l.sku}><td>{l.sku}</td><td>{l.remaining}</td><td><input aria-label={(receipt?"Accepted ":"Done ")+l.sku} type="number" min={0} max={l.remaining-(receipt?l.rejected_quantity:0)} step={1} required value={Number.isNaN(receipt?l.accepted_quantity:l.quantity)?"":receipt?l.accepted_quantity:l.quantity} onChange={e=>patch(i,receipt?{accepted_quantity:e.target.valueAsNumber}:{quantity:e.target.valueAsNumber})}/></td>{receipt?<td><input aria-label={"Rejected "+l.sku} type="number" min={0} max={l.remaining-l.accepted_quantity} step={1} required value={Number.isNaN(l.rejected_quantity)?"":l.rejected_quantity} onChange={e=>patch(i,{rejected_quantity:e.target.valueAsNumber})}/></td>:null}</tr>)}</tbody></table></div><p className="muted-copy">Isi jumlah aktual per Product. Gunakan 0 untuk baris yang belum diproses.</p><SubmitButton label={receipt?"Validate Receipt":"Validate Delivery"}/></form></details></section>;
}
