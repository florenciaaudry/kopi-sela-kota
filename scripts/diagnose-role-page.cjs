/* eslint-disable @typescript-eslint/no-require-imports -- Local diagnosis without printing credentials. */
const fs = require("node:fs");
const { createServerClient } = require("@supabase/ssr");
require("@next/env").loadEnvConfig(process.cwd());
async function main() {
  const account = JSON.parse(fs.readFileSync(".env.role-accounts.local", "utf8")).accounts.find((item) => item.role === (process.argv[2] || "sales"));
  const jar = new Map();
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [...jar].map(([name,value]) => ({name,value})), setAll: (items) => items.forEach(({name,value}) => jar.set(name,value)) } });
  const login = await client.auth.signInWithPassword({ email: account.email, password: account.password });
  if (login.error) throw new Error(login.error.message);
  for (const table of ["profiles", "journal_entries", "chart_of_accounts", "product_costs"]) {
    const read = await client.from(table).select(table === "profiles" ? "role" : "*").limit(1);
    console.log(JSON.stringify({table,error:read.error?.code,count:read.data?.length,profile:table === "profiles" ? read.data?.[0]?.role : undefined}));
  }
  for (const route of ["/sales", "/accounting"]) {
    const response = await fetch("http://127.0.0.1:3000" + route, {headers:{cookie:[...jar].map(([n,v])=>`${n}=${v}`).join("; ")},redirect:"manual"});
    const body = await response.text();
    const html = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, "");
    console.log(JSON.stringify({route,status:response.status,rawDenied:body.includes("Halaman tidak tersedia"),renderedDenied:html.includes("Halaman tidak tersedia"),notFoundDigest:body.includes("NEXT_HTTP_ERROR_FALLBACK;404"),noindex:/<meta[^>]+name="robots"[^>]+content="noindex"/i.test(html),headings:[...html.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi)].map((match)=>match[1].replace(/<[^>]+>/g,"")),error:html.includes("Data Supabase gagal dimuat")}));
  }
  await client.auth.signOut({scope:"local"});
}
main().catch((error)=>{console.error(error.message);process.exitCode=1;});
