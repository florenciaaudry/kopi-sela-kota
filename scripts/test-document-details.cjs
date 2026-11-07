/* eslint-disable @typescript-eslint/no-require-imports -- Read-only live document integration checks. */
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),Module=require('node:module');
const {createServerClient}=require('@supabase/ssr');
require('@next/env').loadEnvConfig(process.cwd());
const registry=new Module('document-navigation');registry._compile(ts.transpileModule(fs.readFileSync('src/lib/document-navigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'document-navigation.cjs');
const {documentDefinitions,documentHref}=registry.exports;
const base='http://127.0.0.1:3000';const results=[];
async function batch(items,run){for(let i=0;i<items.length;i+=4)await Promise.all(items.slice(i,i+4).map(run));}
const record=(label,pass)=>{results.push({check:label,status:pass?'PASS':'FAIL'});console.log((pass?'PASS ':'FAIL ')+label);};
const clean=h=>h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
const denied=(status,html)=>[403,404].includes(status)||html.includes('NEXT_HTTP_ERROR_FALLBACK;404');
async function session(account){const jar=new Map();const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:list=>list.forEach(c=>jar.set(c.name,c.value))}});const res=await client.auth.signInWithPassword({email:account.email,password:account.password});assert.ifError(res.error);return {client,cookie:[...jar].map(([name,value])=>name+'='+value).join('; ')};}
async function get(path,cookie){const res=await fetch(base+path,{headers:{Cookie:cookie},redirect:'manual',signal:AbortSignal.timeout(45000)});const raw=await res.text();return {status:res.status,raw,html:clean(raw)};}
async function main(){
 const stored=JSON.parse(fs.readFileSync('.env.role-accounts.local','utf8'));assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,stored.project);
 const owner=await session(stored.accounts.find(a=>a.role==='owner'));const references={};
 for(const [kind,def] of Object.entries(documentDefinitions)){
  const key=def.key??'number';const res=await owner.client.from(def.table).select(key).limit(1).maybeSingle();assert.ifError(res.error);if(!res.data){results.push({check:kind+' no existing sample',status:'NOT_TESTED'});console.log('NOT_TESTED '+kind+': no existing record; no test data inserted');continue;}
  references[kind]=String(res.data[key]);const page=await get(documentHref(kind,references[kind]),owner.cookie);
  record(kind+' actual record details',page.status===200&&!denied(page.status,page.raw)&&page.html.includes('<h1>'+references[kind]+'</h1>')&&!/Dokumen gagal dimuat|Bagian ini belum dapat dimuat/.test(page.html));
  if(kind==='journal')record('Journal has real debit/credit lines',page.html.includes('Journal Items')&&page.html.includes('Debit')&&page.html.includes('Credit'));
  if(kind==='customer')record('Customer credit exposure and terms',page.html.includes('Credit Exposure')&&page.html.includes('Credit Limit')&&page.html.includes('Payment Terms'));
 }
 const sourcePages=['/sales','/crm','/purchase','/inventory','/invoicing','/accounting','/pos','/returns'];
 const links=new Set();for(const route of sourcePages){const page=await get(route,owner.cookie);record(route+' document links rendered',page.status===200&&/class="record-link"/.test(page.html));for(const m of page.html.matchAll(/href="(\/documents\/[^"#?]+)"/g))links.add(m[1].replace(/&amp;/g,'&'));}
 await batch([...links],async link=>{const p=await get(link,owner.cookie);record('linked record '+link,p.status===200&&!denied(p.status,p.raw)&&!p.html.includes('Dokumen gagal dimuat'));});
 const expected={sales:['sales','delivery','lead','product','customer','vendor'],warehouse:['sales','delivery','purchase','receipt','transfer','product','customer','vendor'],procurement:['purchase','receipt','transfer','product','customer','vendor'],finance:['bill','payment','vendor-payment','credit-note','journal','product','customer','vendor'],cashier:['product','customer','vendor','hold','session']};
 for(const account of stored.accounts.filter(a=>a.role!=='owner')){
  const user=await session(account);
  await batch(Object.entries(references),async ([kind,reference])=>{
   const p=await get(documentHref(kind,reference),user.cookie);const ownPos=account.role==='cashier'&&['hold','session'].includes(kind);const allowed=expected[account.role].includes(kind);
   record(account.role+' '+kind+' role boundary',ownPos?denied(p.status,p.raw):allowed?p.status===200&&!denied(p.status,p.raw)&&!p.html.includes('Dokumen gagal dimuat'):denied(p.status,p.raw));
  });
  await user.client.auth.signOut({scope:'local'});
 }
 const missing=await get('/documents/sales/S999999999',owner.cookie);record('Unknown reference gives 404',denied(missing.status,missing.raw));
 const unknown=await get('/documents/not-a-document/S00001',owner.cookie);record('Unknown document type gives 404',denied(unknown.status,unknown.raw));
 const prototype=await get('/documents/constructor/S00001',owner.cookie);record('Prototype-like document type gives 404',denied(prototype.status,prototype.raw));
 const locked=await get('/documents/sales/S00008',owner.cookie);record('Invoiced order offers no second Delivery action',!locked.html.includes('<summary>Validate Delivery</summary>'));
 const customer=await get('/documents/customer/C02',owner.cookie);record('C02 shows NET7, 300000 limit and 220000 exposure',customer.html.includes('NET7')&&customer.html.includes('300.000')&&customer.html.includes('220.000'));
 await owner.client.auth.signOut({scope:'local'});
 const report={scope:'Read-only actual document pages, links, role boundaries and missing records. Not full PDF business fixtures; no transaction posted.',checked_at:new Date().toISOString(),references,results};fs.writeFileSync('docs/document-details-results.json',JSON.stringify(report,null,2));
 console.log('Results '+results.filter(r=>r.status==='PASS').length+' passed / '+results.filter(r=>r.status==='FAIL').length+' failed');if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
