/* eslint-disable @typescript-eslint/no-require-imports -- Local native-form integration tests. */
const fs=require('node:fs'),assert=require('node:assert/strict'),http=require('node:http');
const base='http://127.0.0.1:3000';
const names=JSON.parse(fs.readFileSync('src/lib/scenario-identities.json','utf8'));
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
async function submit(role){
 const html=await(await fetch(base+'/login')).text();
 const form=html.match(/<form[^>]*class="test-account-grid"[\s\S]*?<\/form>/)?.[0];assert.ok(form,'Six-account form missing');
 const data=new FormData();for(const input of form.matchAll(/<input\b[^>]*>/g)){
  const a=Object.fromEntries([...input[0].matchAll(/([\w$:.+-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));if(a.name)data.append(a.name,a.value??'');
 }
 data.append('role',role);
 const res=await fetch(base+'/login',{method:'POST',body:data,redirect:'manual',headers:{Origin:base}});
 if(res.status!==303){const body=await res.text();assert.fail('Quick login '+role+' failed with HTTP '+res.status+'; message='+(/Profil akun uji tidak sesuai/.test(body)?'profile mismatch':/Login akun uji hanya/.test(body)?'local guard':/Akun uji belum dapat/.test(body)?'auth failure':'unexpected response'));}
 const cookie=res.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');assert.ok(cookie);
 const page=await fetch(base+'/',{headers:{Cookie:cookie}});const content=await page.text();assert.ok(content.includes(names[role]),'Wrong identity for '+role);assert.ok(!content.includes('test-account-grid'),'Login did not leave form');
 const nav=content.match(/<nav[^>]*aria-label="Aplikasi"[^>]*>[\s\S]*?<\/nav>/)?.[0];assert.ok(nav,'Apps switcher missing');assert.ok(!content.includes('<aside'),'Old sidebar still rendered');
 const expected={owner:['sales','crm','purchase','inventory','accounting','invoicing','pos'],sales:['sales','crm'],warehouse:['sales','purchase','inventory'],procurement:['purchase','inventory'],finance:['accounting','invoicing'],cashier:['pos']}[role];
 for(const app of ['sales','crm','purchase','inventory','accounting','invoicing','pos'])assert.equal(nav.includes('href="/'+app+'"'),expected.includes(app),'Wrong Apps menu for '+role+'/'+app);
 console.log('PASS quick login '+role+': actual sign-in, expected profile and correct Apps menu; sidebar removed');
 return {role,status:'PASS'};
}
async function main(){
 const results=[];for(const role of ['owner','sales','warehouse','procurement','finance','cashier'])results.push(await submit(role));
 const html=await(await fetch(base+'/login')).text();const stored=JSON.parse(fs.readFileSync('.env.role-accounts.local','utf8'));
 for(const a of stored.accounts)assert.ok(!html.includes(a.password),'Password leaked to HTML');
 assert.equal((html.match(/class="test-account-card"/g)??[]).length,6);
 const remoteHtml=await new Promise((resolve,reject)=>{http.get(base+'/login',{headers:{Host:'example.invalid'}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve(body));}).on('error',reject);});assert.ok(!remoteHtml.includes('Demo Login Accounts'),'Quick login exposed for remote hostname');
 console.log('PASS six cards, no passwords in HTML; external hostname has no quick login. No business transactions posted.');
 fs.writeFileSync('docs/quick-login-results.json',JSON.stringify({scope:'Development localhost native-form sign-in for six QA accounts, expected profile, role-scoped Apps switcher and no sidebar; no business mutations.',results,passwords_in_html:false,external_hostname_quick_login:false,verified_at:new Date().toISOString()},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
