/* eslint-disable @typescript-eslint/no-require-imports -- Read-only verification of the actual browser Hold checkout. */
const fs=require("node:fs"),assert=require("node:assert/strict"),{createClient}=require("@supabase/supabase-js");
require("@next/env").loadEnvConfig(process.cwd());
const query=async p=>{const {data,error}=await p;if(error)throw Error(error.message);return data;};
async function main(){
 const accounts=JSON.parse(fs.readFileSync(".env.role-accounts.local","utf8"));assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,accounts.project);
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const account=accounts.accounts.find(a=>a.role==="owner");const login=await client.auth.signInWithPassword({email:account.email,password:account.password});if(login.error)throw Error(login.error.code);
 try{
  const hold=await query(client.from("pos_holds").select("number,status,customer_id,created_by,session_number").eq("number","HOLD/00017").single());
  assert.equal(hold.status,"Completed");assert.equal(hold.customer_id,"C06");assert.equal(hold.created_by,account.id);
  const receipt=await query(client.from("pos_receipts").select("number,hold_number,customer_id,session_number,created_by,total,tax_amount,subtotal").eq("hold_number",hold.number).single());
  assert.equal(receipt.number,"POSR00022");assert.equal(receipt.customer_id,"C06");assert.equal(receipt.session_number,hold.session_number);assert.equal(receipt.created_by,account.id);assert.equal(Number(receipt.total),6600);assert.equal(Number(receipt.tax_amount),600);assert.equal(Number(receipt.subtotal),6000);
  const tenders=await query(client.from("pos_receipt_tenders").select("payment_method,amount").eq("receipt_number",receipt.number));assert.equal(tenders.length,2);for(const method of ["CASH","BANK"])assert.equal(Number(tenders.find(t=>t.payment_method===method)?.amount),3300);
  const items=await query(client.from("pos_receipt_lines").select("sku,quantity,subtotal,tax_amount").eq("receipt_number",receipt.number));assert.equal(items.length,1);assert.equal(items[0].sku,"TEH-250");assert.equal(Number(items[0].quantity),1);
  const reservations=await query(client.from("inventory_reservations").select("status,quantity").eq("source_type","pos_hold").eq("source_reference",hold.number));assert.equal(reservations.length,1);assert.equal(reservations[0].status,"consumed");
  const journal=await query(client.from("journal_entries").select("id,status").eq("source_reference",receipt.number).single());assert.equal(journal.status,"posted");
  const lines=await query(client.from("journal_lines").select("account_code,debit,credit").eq("journal_entry_id",journal.id));const deltas={};for(const l of lines)deltas[l.account_code]=(deltas[l.account_code]??0)+Number(l.debit)-Number(l.credit);
  assert.equal(Object.values(deltas).reduce((a,b)=>a+b,0),0);assert.equal(deltas["1101"],3300);assert.equal(deltas["1102"],3300);assert.equal(deltas["1301"],-2000);assert.equal(deltas["5101"],2000);assert.equal(deltas["4101"],-6000);assert.equal(deltas["2102"],-600);assert.equal(deltas["1201"]??0,0);
  const snapshot=await query(client.rpc("get_owner_dashboard",{}));
  const report={status:"PASS",scope:"Actual Owner browser Hold with Customer C06, full mixed tender, receipt and single balanced journal; not all PDF POS fixtures.",references:{hold:hold.number,receipt:receipt.number,session:hold.session_number},tenders,source_account_deltas:deltas,snapshot,verified_at:new Date().toISOString()};
  fs.writeFileSync("docs/video-hold-browser-results.json",JSON.stringify(report,null,2));
  console.log("PASS: HOLD/00017 -> POSR00022; C06 retained; Cash/Bank 3300 each, PBJT 600; reservation consumed; one balanced journal; AR unchanged by this sale.");
 }finally{await client.auth.signOut({scope:"local"});}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
