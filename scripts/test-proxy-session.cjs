/* eslint-disable @typescript-eslint/no-require-imports -- Local regression harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const { AuthSessionMissingError } = require('@supabase/supabase-js');
process.env.NEXT_PUBLIC_SUPABASE_URL='https://fixture.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='fixture-public-key';
let result, updates=[];
const target=new Module('proxy-session-test');
const realRequire=require;
target.require=id=>{
 if(id==='@supabase/ssr')return {createServerClient:(_url,_key,options)=>({auth:{getUser:async()=>{if(updates.length)options.cookies.setAll(updates);return result;}}})};
 if(id==='@/lib/runtime-mode')return {isDemoMode:()=>false,hasPartialSupabaseConfig:()=>false,hasSupabaseConfig:()=>true};
 return realRequire(id);
};
target._compile(ts.transpileModule(fs.readFileSync('src/proxy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'proxy-session.cjs');
async function main(){
 result={data:{user:null},error:new AuthSessionMissingError()};
 let response=await target.exports.proxy(new NextRequest('https://erp.example/accounting'));
 assert.equal(response.headers.get('location'),'https://erp.example/login');
 response=await target.exports.proxy(new NextRequest('https://erp.example/login'));
 assert.equal(response.status,200);
 result={data:{user:null},error:new Error('Expired refresh token')};
 updates=[{name:'sb-fixture-auth-token',value:'',options:{path:'/',maxAge:0}}];
 response=await target.exports.proxy(new NextRequest('https://erp.example/sales'));
 assert.equal(response.headers.get('location'),'https://erp.example/login?session=expired');
 assert.equal(response.cookies.get('sb-fixture-auth-token').maxAge,0);
 result={data:{user:{id:'fixture-user'}},error:null};
 updates=[{name:'sb-fixture-auth-token',value:'refreshed-fixture-value',options:{path:'/',httpOnly:true,sameSite:'lax'}}];
 response=await target.exports.proxy(new NextRequest('https://erp.example/login'));
 assert.equal(response.headers.get('location'),'https://erp.example/');
 assert.equal(response.cookies.get('sb-fixture-auth-token').value,'refreshed-fixture-value');
 assert.equal(response.cookies.get('sb-fixture-auth-token').httpOnly,true);
 console.log('PASS proxy: fresh visitor has no expired banner; actual session error redirects; cleared and refreshed cookies survive redirects; anonymous login remains accessible.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
