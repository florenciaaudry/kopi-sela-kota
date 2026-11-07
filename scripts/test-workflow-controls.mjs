import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createFixture,ids} from './create-isolated-db.mjs';
const db=await createFixture();
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const rpc=(name,args=[])=>{const a=[...args];if(!name.startsWith('_')&&a.length&&typeof a.at(-1)==='string')a[a.length-1]='regression-key-'+a.at(-1);return scalar(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')})`,a);};
const actor=role=>db.query("select set_config('request.jwt.claim.sub',$1,true)",[ids[role]]);
async function reject(run,pattern){await db.exec('savepoint denial');let error;try{await run();}catch(e){error=e;}await db.exec('rollback to savepoint denial;release savepoint denial');assert.ok(error,'Expected rejection');if(pattern)assert.match(error.message,pattern);}
const results=[];
async function test(name,run){await db.exec('begin');try{await run();results.push({name,status:'PASS'});console.log('PASS '+name);}catch(e){results.push({name,status:'FAIL',error:e.message});console.log('FAIL '+name+': '+e.message);}finally{await db.exec('rollback');}}
const cust={name:'Fixture Customer',type:'Perusahaan',city:'Jakarta',credit_limit:0,payment_terms_code:'COD'};
const product={name:'Fixture Product',size:'125 ml',color:'Original',sales_price:12000,standard_cost:6000,default_vendor_id:'V01'};
await test('Master CRUD creates, edits and deletes unused Customer/Vendor/Product',async()=>{
 await actor('owner');for(const[k,id,data]of[['customer','ZZC',cust],['vendor','ZZV',{name:'Fixture Vendor',city:'Jakarta',payment_terms_code:'NET7',tax_profile:'BUY0'}],['product','ZZP',product]]){
 assert.equal(await rpc('manage_master',[k,'create',id,JSON.stringify(data),'new-'+id]),id);
 assert.equal(await rpc('manage_master',[k,'update',id,JSON.stringify({...data,name:data.name+' Edited'}),'edit-'+id]),id);
 assert.equal(await rpc('manage_master',[k,'delete',id,'{}','delete-'+id]),id);
 }
});
await test('Master duplicate/replay/history guards and Sales credit boundary',async()=>{
 await actor('owner');await rpc('manage_master',['customer','create','ZZC',JSON.stringify(cust),'same-master']);await rpc('manage_master',['customer','create','ZZC',JSON.stringify(cust),'same-master']);
 await reject(()=>rpc('manage_master',['customer','create','ZZC',JSON.stringify(cust),'duplicate-master']),/duplikasi/);
 await reject(()=>rpc('manage_master',['customer','delete','C01','{}','delete-history']),/dipakai/);
 await actor('sales');await reject(()=>rpc('manage_master',['customer','create','ZZS',JSON.stringify({...cust,credit_limit:1000}),'sales-credit']),/Finance atau Owner/);
 await actor('cashier');await reject(()=>rpc('manage_master',['customer','create','ZZX',JSON.stringify(cust),'cashier-master']),/akses|role|izin/i);
});
await test('Quotation stale approval invalidated; snapshot price retained on confirm',async()=>{
 await actor('sales');const q=await rpc('save_quotation',[null,'C03','CBW-250',2,6,null,null,'q-new']);
 await reject(()=>rpc('approve_quotation_discount',[q,1,'sales-approve']),/akses|role|izin/i);
 await actor('owner');await rpc('approve_quotation_discount',[q,1,'owner-approve']);await actor('sales');await rpc('save_quotation',[q,'C03','CBW-250',3,6,null,1,'q-edit']);
 await reject(()=>rpc('confirm_quotation',[q,'q-stale-confirm']),/persetujuan|approval/i);
 await actor('owner');await rpc('approve_quotation_discount',[q,2,'owner-approve2']);await db.exec("update public.products set sales_price=99000 where sku='CBW-250'");await actor('sales');const so=await rpc('confirm_quotation',[q,'q-confirm']);assert.equal(Number(await scalar('select unit_price from public.sales_order_lines where sales_order_number=$1',[so])),30000);
});
await test('RFQ cancellation prevents confirmation and Vendor Price does not rewrite PO',async()=>{
 await actor('procurement');const rfq=await rpc('save_rfq',[null,'V01','CBW-250',20,null,'r-new']);await rpc('change_draft_status',['rfq',rfq,'Cancelled','r-cancel']);await reject(()=>rpc('confirm_rfq',[rfq,'r-invalid-confirm']),/terkunci|status|Cancelled|tidak aktif/i);
 const q2=await rpc('save_rfq',[null,'V01','CBW-250',20,null,'r-new2']);const po=await rpc('confirm_rfq',[q2,'r-confirm2']);await rpc('save_vendor_price',['V01','CBW-250',1,20000,'BUY0','price-update']);assert.equal(Number(await scalar('select unit_price from public.purchase_order_lines where purchase_order_number=$1',[po])),15000);await reject(()=>rpc('save_vendor_price',['V01','CBW-250',1,20000,'BUY10','invalid-tax']),/tidak valid/);
});
await test('Log Notes persist once with actor; invalid payload and master deletion blocked',async()=>{
 await actor('sales');const n=await rpc('add_document_note',['sales','S00001','Fixture note','note-once']);assert.equal(await rpc('add_document_note',['sales','S00001','Fixture note','note-once']),n);
 assert.equal(Number(await scalar("select count(*) from public.document_notes where document_reference='S00001'")),1);
 await reject(()=>rpc('add_document_note',['sales','S00001','Changed','note-once']),/berbeda|Replay|replay/);
 await reject(()=>rpc('add_document_note',['sales','S00001',' ','blank-note']),/2000|wajib|kosong|valid/i);
 await reject(()=>rpc('add_document_note',['sales','S00001','x'.repeat(2001),'long-note']),/2000/);
 await reject(()=>rpc('add_document_note',['sales','MISSING','Missing','missing-note']),/akses|ditemukan|dokumen/i);
 await actor('owner');await rpc('manage_master',['customer','create','ZZC',JSON.stringify(cust),'note-master']);await rpc('add_document_note',['customer','ZZC','Preserve history','master-note']);await reject(()=>rpc('manage_master',['customer','delete','ZZC','{}','delete-noted-master']),/Log Notes/);
});
await test('Notes RLS, immutable rows and private workflow RPCs denied',async()=>{
 await actor('finance');await rpc('add_document_note',['invoice','OPEN-AR-C02','Finance only','private-note']);await actor('cashier');await db.exec('set local role authenticated');assert.equal(Number(await scalar('select count(*) from public.document_notes')),0);
 await reject(()=>db.exec("update public.document_notes set body='tampered'"),/permission denied/);
 await reject(()=>rpc('_workflow_record',['bad-key','master','{}','bad']),/permission denied/);await db.exec('reset role');
});
await db.close();await fs.writeFile('docs/workflow-controls-results.json',JSON.stringify({generatedAt:new Date().toISOString(),scope:'Isolated PostgreSQL; production migrations; test auth identities; no shared database changes. Not a browser/production deployment test.',results},null,2)+'\n');console.log(`RESULT ${results.filter(x=>x.status==='PASS').length}/${results.length}`);if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
