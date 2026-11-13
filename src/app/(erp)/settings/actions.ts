"use server";
import { requireRole } from "@/lib/auth";
import { createUserAdminClient } from "@/lib/user-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/database.types";
import { roleLabels } from "@/lib/roles";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
const text=(f:FormData,k:string)=>String(f.get(k)??"").trim();
function fail(message:string):never{redirect("/settings?error="+encodeURIComponent(message));}
export async function manageUserAction(f:FormData){
 await requireRole(["owner"]);
 const role=text(f,"role"),name=text(f,"full_name"),key=text(f,"idempotency_key"),op=text(f,"operation");
 if(!Object.hasOwn(roleLabels,role)||!name||name.length>150||key.length<8)fail("Name dan Role wajib diisi dengan benar.");
 if(f.get("confirm_access")!=="yes")fail("Konfirmasi perubahan akses terlebih dahulu.");
 const c=await createSupabaseServerClient();const ready=await c.rpc("list_app_users");if(ready.error)fail("User Management belum diaktifkan. Hubungi administrator.");let id=text(f,"user_id");
 if(op==="create"){
  const email=text(f,"email").toLowerCase(),password=String(f.get("password")??"");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||password.length>128)fail("Email harus valid dan password minimal 12 karakter.");
  const admin=await createUserAdminClient();if(!admin)fail("Pembuatan akun belum diaktifkan. Hubungi administrator.");
  const made=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name}});
  if(made.error||!made.data.user)fail("Akun belum dapat dibuat. Pastikan email belum terdaftar dan password memenuhi ketentuan.");
  id=made.data.user.id;
  const saved=await c.rpc("manage_user_profile",{p_user_id:id,p_full_name:name,p_role:role as AppRole,p_expected_role:null,p_expected_name:null,p_idempotency_key:key});
  if(saved.error){const cleanup=await admin.auth.admin.deleteUser(id);if(cleanup.error)fail("Profil belum tersimpan. Minta administrator memeriksa akun baru sebelum mencoba lagi.");fail(saved.error.message);}
 }else if(op==="update"){
  if(!Object.hasOwn(roleLabels,text(f,"expected_role")))fail("Role awal tidak valid. Muat ulang halaman.");
  const result=await c.rpc("manage_user_profile",{p_user_id:id,p_full_name:name,p_role:role as AppRole,p_expected_role:text(f,"expected_role")as AppRole,p_expected_name:text(f,"expected_name"),p_idempotency_key:key});if(result.error)fail(result.error.message);
 }else fail("Tindakan tidak tersedia.");
 revalidatePath("/","layout");redirect("/settings?success="+encodeURIComponent("User dan akses berhasil disimpan."));
}
