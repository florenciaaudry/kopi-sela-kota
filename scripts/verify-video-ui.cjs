/* eslint-disable @typescript-eslint/no-require-imports -- Read-only verification of recorded UI transactions. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const root=process.cwd();
process.chdir(root);
const {createClient}=require(root+'/node_modules/@supabase/supabase-js');
require(root+'/node_modules/@next/env').loadEnvConfig(root);
const query=async promise=>{const {data,error}=await promise;if(error)throw Error(error.message);return data;};
async function main(){
 const accounts=JSON.parse(fs.readFileSync('.env.role-accounts.local','utf8'));assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,accounts.project);const account=accounts.accounts.find(a=>a.role==='owner');
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const auth=await client.auth.signInWithPassword({email:account.email,password:account.password});if(auth.error)throw Error(auth.error.code);
 try{
  const invoice=await query(client.from('customer_invoices').select('total,amount_paid,amount_credited,source_document').eq('number','INV00015').single());
  const bill=await query(client.from('vendor_bills').select('total,amount_paid,source_document').eq('number','BILL00005').single());
  assert.equal(Number(invoice.total),33000);assert.equal(Number(invoice.amount_paid),33000);assert.equal(Number(invoice.amount_credited),0);assert.ok(invoice.source_document.startsWith('S00008:'));
  assert.equal(Number(bill.total),15000);assert.equal(Number(bill.amount_paid),15000);assert.ok(bill.source_document.startsWith('PO00004:'));
  const refs=['DN00008','INV00015','CP00016','GR00003','BILL00005','VP00006'];
  const journals=await query(client.from('journal_entries').select('id,source_reference,status').in('source_reference',refs));
  assert.equal(journals.length,6);assert.equal(new Set(journals.map(j=>j.source_reference)).size,6);
  const lines=await query(client.from('journal_lines').select('journal_entry_id,account_code,debit,credit').in('journal_entry_id',journals.map(j=>j.id)));
  assert.ok(journals.every(j=>j.status==='posted'&&lines.filter(l=>l.journal_entry_id===j.id).reduce((sum,l)=>sum+Number(l.debit)-Number(l.credit),0)===0));
  const after=await query(client.rpc('get_owner_dashboard',{}));
  const deltas={};for(const line of lines)deltas[line.account_code]=(deltas[line.account_code]??0)+Number(line.debit)-Number(line.credit);
  assert.equal(deltas['1102'],18000);for(const code of ['1201','2101','1301','2103'])assert.equal(deltas[code]??0,0,code);assert.equal(deltas['1101']??0,0);
  const deliveryLines=await query(client.from('delivery_note_lines').select('sku,quantity').eq('delivery_number','DN00008'));
  const receiptLines=await query(client.from('goods_receipt_lines').select('sku,accepted_quantity,rejected_quantity').eq('receipt_number','GR00003'));
  assert.equal(deliveryLines.length,1);assert.equal(receiptLines.length,1);assert.equal(deliveryLines[0].sku,receiptLines[0].sku);assert.equal(Number(deliveryLines[0].quantity),Number(receiptLines[0].accepted_quantity));assert.equal(Number(receiptLines[0].rejected_quantity),0);
  const report={status:'PASS',checked_at:new Date().toISOString(),scope:'Actual Owner browser submissions for full Sales/Purchase qty 1, independently reconciled read-only against database; separate from six-role RPC rehearsal and PDF fixtures.',references:{sales:'S00008',delivery:'DN00008',invoice:'INV00015',customer_payment:'CP00016',purchase:'PO00004',goods_receipt:'GR00003',vendor_bill:'BILL00005',vendor_payment:'VP00006'},invoice_total:33000,invoice_due:0,bill_total:15000,bill_due:0,balanced_journals:6,bank_delta:18000,company_stock_and_value_unchanged:true,source_account_deltas:deltas,snapshot:after};
  fs.writeFileSync('docs/video-browser-results.json',JSON.stringify(report,null,2));console.log('PASS: actual Sales/Purchase UI submissions fully paid; six balanced journals; bank +18000; company stock, inventory value, Cash, AR/AP reconciled.');
 }finally{await client.auth.signOut({scope:'local'});}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
