/* eslint-disable @typescript-eslint/no-require-imports -- Read-only checks for the Cashier browser rehearsal. */
const fs=require("node:fs"),assert=require("node:assert/strict"),{createClient}=require("@supabase/supabase-js");
require("@next/env").loadEnvConfig(process.cwd());
const query=async promise=>{const {data,error}=await promise;if(error)throw Error(error.message);return data;};
async function main(){
 const accounts=JSON.parse(fs.readFileSync(".env.role-accounts.local","utf8"));assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,accounts.project);
 const owner=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const account=accounts.accounts.find(a=>a.role==="owner");const login=await owner.auth.signInWithPassword({email:account.email,password:account.password});if(login.error)throw Error(login.error.code);
 try {
  const cashier=accounts.accounts.find(a=>a.role==="cashier");
  const session=await query(owner.from("pos_sessions").select("opened_by,status,opening_cash,expected_cash,counted_cash,cash_difference").eq("number","POS/00005").single());
  assert.equal(session.opened_by,cashier.id);assert.equal(session.status,"Closed");assert.equal(Number(session.opening_cash),100000);assert.equal(Number(session.expected_cash ?? session.opening_cash),100000);assert.equal(Number(session.counted_cash),100000);assert.equal(Number(session.cash_difference),0);
  const receipt=await query(owner.from("pos_receipts").select("session_number,created_by,customer_id,quantity,subtotal,tax_amount,total").eq("number","POSR00012").single());
  assert.equal(receipt.session_number,"POS/00005");assert.equal(receipt.created_by,cashier.id);assert.equal(receipt.customer_id,"C06");assert.equal(Number(receipt.quantity),1);assert.equal(Number(receipt.subtotal),6000);assert.equal(Number(receipt.tax_amount),600);assert.equal(Number(receipt.total),6600);
  const tenders=await query(owner.from("pos_receipt_tenders").select("payment_method,amount").eq("receipt_number","POSR00012"));assert.equal(tenders.length,1);assert.equal(tenders[0].payment_method,"BANK");assert.equal(Number(tenders[0].amount),6600);
  const journal=await query(owner.from("journal_entries").select("id,status").eq("source_reference","POSR00012").single());assert.equal(journal.status,"posted");
  const lines=await query(owner.from("journal_lines").select("account_code,debit,credit").eq("journal_entry_id",journal.id));const deltas={};for(const line of lines)deltas[line.account_code]=(deltas[line.account_code]??0)+Number(line.debit)-Number(line.credit);
  assert.equal(Object.values(deltas).reduce((a,b)=>a+b,0),0);assert.equal(deltas["1102"],6600);assert.equal(deltas["1101"]??0,0);assert.equal(deltas["1301"],-2000);assert.equal(deltas["5101"],2000);assert.equal(deltas["4101"],-6000);assert.equal(deltas["2102"],-600);
  const sessionJournals=await query(owner.from("journal_entries").select("id").eq("source_reference","POS/00005"));assert.equal(sessionJournals.length,0,"Open/Close must not repost a sale or add opening cash to company cash");
  const events=await query(owner.from("audit_events").select("actor_id,action,document_number").in("document_number",["POS/00005","POSR00012"]));for(const action of ["open","sell","close"])assert.ok(events.some(e=>e.actor_id===cashier.id&&e.action===action));
  const snapshot=await query(owner.rpc("get_owner_dashboard",{}));const file="docs/video-pos-browser-results.json";const existing=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):null;
  const before=existing?.before??JSON.parse(fs.readFileSync("docs/video-browser-results.json","utf8")).snapshot;
  if(!existing){assert.equal(Number(snapshot.cash),Number(before.cash));assert.equal(Number(snapshot.bank)-Number(before.bank),6600);assert.equal(Number(snapshot.on_hand)-Number(before.on_hand),-1);assert.equal(Number(snapshot.inventory_value)-Number(before.inventory_value),-2000);}
  const report=existing??{status:"PASS",scope:"Cashier real browser login, open session, direct BANK sale C06, close at zero variance; independently checked against source records and ledger. Not all POS fixture cases.",references:{session:"POS/00005",receipt:"POSR00012"},before,after:snapshot,source_account_deltas:deltas};report.verified_at=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(report,null,2));
  console.log("PASS: real Cashier UI sale, C06, Bank 6600, PBJT 600, balanced journal; own session Closed, zero variance; opening/closing did not increase company Cash or repost sales.");
 }finally{await owner.auth.signOut({scope:"local"});}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
