import "server-only";
import { readFile } from "node:fs/promises";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

// This module is imported only after Owner authorization; no key crosses the server boundary.
export async function createUserAdminClient(){
 let secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret&&process.env.NODE_ENV==="development"){
  const h=await headers();const host=h.get("host");
  if(!host)return null;
  try{if(!["localhost","127.0.0.1","[::1]"].includes(new URL("http://"+host).hostname))return null;const origin=h.get("origin");if(origin&&new URL(origin).host!==host)return null;if(h.get("x-forwarded-host")&&h.get("x-forwarded-host")!==host)return null;
   const content=await readFile(".env.role-admin.local","utf8");secret=content.match(/^\s*SUPABASE_(?:SECRET_KEY|SERVICE_ROLE_KEY)\s*=\s*(.*?)\s*$/m)?.[1]?.replace(/^(["'])(.*)\1$/,"$2").trim();
  }catch{return null;}
 }
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!secret||!url)return null;
 return createClient<Database>(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
}
