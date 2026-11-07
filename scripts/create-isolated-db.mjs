import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';
export const ids=Object.fromEntries(['sales','warehouse','procurement','finance','cashier','owner'].map((role,i)=>[role,`00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`]));
export async function createFixture({through=999}={}){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;
 create schema cron;create table cron.job(jobid bigint generated always as identity primary key,jobname text unique,schedule text,command text,active boolean default true);
 create function cron.schedule(n text,s text,c text) returns bigint language plpgsql as $$declare result bigint;begin insert into cron.job(jobname,schedule,command) values(n,s,c) on conflict(jobname)do update set schedule=s,command=c returning jobid into result;return result;end;$$;`);
 for(const [role,id]of Object.entries(ids))await db.query('insert into auth.users values($1,$2)',[id,`fixture-${role}@example.test`]);
 const files=(await fs.readdir('supabase/migrations')).filter(n=>n.endsWith('.sql')).sort();
 for(const file of files){if(Number(file.split('_')[0].slice(-3))>through)continue;let text=await fs.readFile('supabase/migrations/'+file,'utf8');text=text.replace('create extension if not exists pg_cron;','-- Isolated-engine adapter: cron registration only; real background scheduling is not simulated.');try{await db.exec(text);}catch(e){throw new Error('Migration '+file+': '+e.message,{cause:e});}}
 for(const [role,id]of Object.entries(ids))await db.query('insert into public.profiles(id,full_name,role)values($1,$2,$3)',[id,'Fixture '+role,role]);
 await db.exec(await fs.readFile('supabase/seed.sql','utf8'));
 return db;
}
if(process.argv.includes('--smoke')){
 const db=await createFixture();try{await db.exec('begin');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[ids.sales]);const q=await db.query("select public.save_quotation(null,'C03','CBW-250',10,6,null,null,'fixture-quote-6percent') as number");const number=q.rows[0].number;await db.query("select set_config('request.jwt.claim.sub',$1,true)",[ids.owner]);await db.query('select public.approve_quotation_discount($1,1,$2)',[number,'fixture-owner-approval']);const so=await db.query('select public.confirm_quotation($1,$2) as number',[number,'fixture-quote-confirm']);console.log('PASS isolated SQL: schema loaded; Q 6% approved and confirmed '+so.rows[0].number);await db.exec('rollback');}finally{await db.close();}
}
