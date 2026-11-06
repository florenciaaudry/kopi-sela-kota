/* eslint-disable @typescript-eslint/no-require-imports -- Explicit, resumable integration rehearsal using local QA credentials. */
const fs=require("node:fs"),assert=require("node:assert/strict"),{createClient}=require("@supabase/supabase-js");
require("@next/env").loadEnvConfig(process.cwd());
const file="docs/video-rehearsal-results.json";
const live=process.argv.includes("--run-live-rehearsal");
const report=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):{prefix:"video-rehearsal-20261106-v1",references:{},scope:"Persistent non-production QA rehearsal; not clean PDF T-01-T-36 fixtures."};
const clients={};const ids={};
function save(){fs.writeFileSync(file,JSON.stringify(report,null,2));}
function check(name,value){assert.ok(value,name);report.checks.push({check:name,status:"PASS"});console.log("PASS "+name);}
async function query(promise){const {data,error}=await promise;if(error)throw Error(error.message);return data;}
async function call(role,name,args){return query(clients[role].rpc(name,args));}
async function step(key,role,name,args){const value=await call(role,name,{...args,p_idempotency_key:report.prefix+"-"+key});if(report.references[key])assert.equal(value,report.references[key]);report.references[key]=value;save();console.log("OK "+role+" "+name+" -> "+value);return value;}
async function dashboard(){const data=await call("owner","get_owner_dashboard",{});return Object.fromEntries(Object.entries(data).map(([k,v])=>[k,Number(v)]));}
async function main(){
 if(live&&report.completed_at){console.log("Existing rehearsal already completed: "+report.completed_at+". No transactions repeated; see "+file);return;}
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 assert.equal(new URL(url).hostname,"tswkkutgqayvxwzepqfs.supabase.co","Named QA project only");
 const accountFile=JSON.parse(fs.readFileSync(".env.role-accounts.local","utf8"));assert.equal(accountFile.project,new URL(url).hostname);
 report.checks=[];delete report.error;
 for(const account of accountFile.accounts){const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const login=await client.auth.signInWithPassword({email:account.email,password:account.password});if(login.error)throw Error("QA login "+account.role+": "+login.error.code);clients[account.role]=client;ids[account.role]=login.data.user.id;check("real login "+account.role,Boolean(login.data.user));}
 const products=await query(clients.owner.from("products").select("sku,sales_price").in("sku",["CBW-250","TEH-250"]));
 check("PDF unit sales prices",Number(products.find(p=>p.sku==="CBW-250")?.sales_price)===30000&&Number(products.find(p=>p.sku==="TEH-250")?.sales_price)===6000);
 const config=await query(clients.cashier.from("pos_configuration").select("opening_cash").eq("id","POS-TBT").single());
 const ownSessions=await query(clients.cashier.from("pos_sessions").select("number,status").eq("opened_by",ids.cashier).in("status",["Open","Pending Approval"]));
 if(!report.references.session&&ownSessions.length)throw Error("Cashier already has an unfinished session; leave it unchanged.");
 report.opening_cash=Number(config.opening_cash);
 if(!live){console.log("Preflight only. Posting requires explicit --run-live-rehearsal. Existing accounts, transactions and configuration unchanged.");return;}
 if(!report.before){report.before=await dashboard();report.started_at=new Date().toISOString();save();}
 const so=await step("sales","sales","create_sales_order",{p_customer_id:"C04",p_sku:"CBW-250",p_quantity:1,p_discount_percent:0,p_source_lead_number:null});
 const delivery=await step("delivery","warehouse","deliver_sales_order",{p_sales_order_number:so,p_quantity:1});
 const invoice=await step("invoice","finance","invoice_delivered_sales_order",{p_sales_order_number:so});
 const payment=await step("customer_payment","finance","record_customer_payment",{p_invoice_number:invoice,p_amount:33000,p_account_code:"1102"});
 let inv=await query(clients.finance.from("customer_invoices").select("total,amount_paid,amount_credited,source_document").eq("number",invoice).single());
 check("Sales invoice 33000 fully paid; source SO linked",Number(inv.total)===33000&&Number(inv.amount_paid)===33000&&Number(inv.amount_credited)===0&&inv.source_document.startsWith(so+":"));
 const po=await step("purchase","procurement","create_purchase_order",{p_vendor_id:"V01",p_sku:"CBW-250",p_quantity:1});
 const receipt=await step("goods_receipt","warehouse","receive_purchase_order",{p_purchase_order_number:po,p_accepted_quantity:1,p_rejected_quantity:0});
 const bill=await step("vendor_bill","finance","create_vendor_bill",{p_purchase_order_number:po});
 const vp=await step("vendor_payment","finance","record_vendor_payment",{p_bill_number:bill,p_amount:15000,p_account_code:"1102"});
 const vendorBill=await query(clients.finance.from("vendor_bills").select("total,amount_paid,source_document").eq("number",bill).single());
 check("Purchase bill 15000 fully paid; source PO linked",Number(vendorBill.total)===15000&&Number(vendorBill.amount_paid)===15000&&vendorBill.source_document.startsWith(po+":"));
 const session=await step("session","cashier","open_pos_session",{p_opening_cash:Number(config.opening_cash)});
 const hold=await step("hold","cashier","create_pos_hold",{p_lines:[{sku:"TEH-250",quantity:1}],p_expires_in_minutes:10});
 const mixed=await step("mixed","cashier","complete_pos_hold",{p_hold_number:hold,p_tenders:[{payment_method:"CASH",amount:3300},{payment_method:"BANK",amount:3300}]});
 const direct=await step("direct","cashier","create_pos_sale_for_customer",{p_sku:"TEH-250",p_quantity:1,p_payment_method:"BANK",p_customer_id:"C06"});
 const receipts=await query(clients.cashier.from("pos_receipts").select("number,total,tax_amount,customer_id").in("number",[mixed,direct]));
 check("POS two receipts each 6600 with PBJT 600",receipts.length===2&&receipts.every(r=>Number(r.total)===6600&&Number(r.tax_amount)===600));
 check("COD customer C06 linked to direct receipt",receipts.find(r=>r.number===direct)?.customer_id==="C06");
 const tenders=await query(clients.cashier.from("pos_receipt_tenders").select("receipt_number,payment_method,amount").in("receipt_number",[mixed,direct]));
 check("Mixed receipt has Cash 3300 and Bank 3300 only",tenders.filter(t=>t.receipt_number===mixed).length===2&&tenders.some(t=>t.receipt_number===mixed&&t.payment_method==="CASH"&&Number(t.amount)===3300)&&tenders.some(t=>t.receipt_number===mixed&&t.payment_method==="BANK"&&Number(t.amount)===3300));
 const holdData=await query(clients.cashier.from("pos_holds").select("status").eq("number",hold).single());check("Hold completed",holdData.status==="Completed");
 const sessionData=await query(clients.cashier.from("pos_sessions").select("status,expected_cash").eq("number",session).single());
 check("Only cash tender increases drawer",Number(sessionData.expected_cash)===Number(config.opening_cash)+3300);
 if(sessionData.status==="Open")await call("cashier","close_pos_session",{p_session_number:session,p_counted_cash:Number(sessionData.expected_cash),p_variance_reason:null});
 const closed=await query(clients.cashier.from("pos_sessions").select("status,cash_difference").eq("number",session).single());check("Cashier session closed with zero variance",closed.status==="Closed"&&Number(closed.cash_difference)===0);
 const businessRefs=[delivery,invoice,payment,receipt,bill,vp,mixed,direct];
 const journals=await query(clients.owner.from("journal_entries").select("id,source_reference,status").in("source_reference",businessRefs));
 check("Eight source documents each posted exactly once",journals.length===8&&new Set(journals.map(j=>j.source_reference)).size===8&&journals.every(j=>j.status==="posted"));
 const jl=await query(clients.owner.from("journal_lines").select("journal_entry_id,debit,credit").in("journal_entry_id",journals.map(j=>j.id)));
 check("All eight journals balanced",journals.every(j=>jl.filter(l=>l.journal_entry_id===j.id).reduce((sum,l)=>sum+Number(l.debit)-Number(l.credit),0)===0));
 const audits=await query(clients.owner.from("audit_events").select("actor_id,document_number").in("document_number",[so,delivery,invoice,payment,po,receipt,bill,vp,session,hold,direct]));
 const rolesForRefs=[[so,"sales"],[delivery,"warehouse"],[invoice,"finance"],[payment,"finance"],[po,"procurement"],[receipt,"warehouse"],[bill,"finance"],[vp,"finance"],[session,"cashier"],[hold,"cashier"],[direct,"cashier"]];
 check("Audit actors match actual operational roles",rolesForRefs.every(([ref,role])=>audits.some(a=>a.document_number===ref&&a.actor_id===ids[role])));
 report.after=await dashboard();const before=report.before,after=report.after;
 check("Company AR/AP unchanged after paid flows",after.receivables===before.receivables&&after.payables===before.payables);
 check("Bank delta 27900; Cash delta 3300",after.bank-before.bank===27900&&after.cash-before.cash===3300);
 check("Company stock minus 2; inventory value minus 4000",after.on_hand-before.on_hand===-2&&after.inventory_value-before.inventory_value===-4000);
 report.completed_at=new Date().toISOString();report.status="PASS";save();console.log("Rehearsal PASS. Documents persist; no seed/reset or historical corrections. Report: "+file);
}
main().catch(error=>{report.status="FAIL";report.error=error.message;save();console.error(error.message);process.exitCode=1;}).finally(async()=>{await Promise.allSettled(Object.values(clients).map(c=>c.auth.signOut({scope:"local"})));});
