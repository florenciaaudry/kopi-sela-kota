import { UserManagement,type ManagedUser } from "./user-management";
import { createUserAdminClient } from "@/lib/user-admin";
import { WorkflowNotice,type WorkflowMessage } from "../workflow-workspace";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applicationAccess, roleLabels, routeAccess } from "@/lib/roles";
import type { AppRole } from "@/lib/supabase/database.types";
import { DataTable } from "../data-table";

export const metadata = { title: "Users & Permissions" };

export default async function SettingsPage({searchParams}:{searchParams:Promise<WorkflowMessage>}) {
  const profile=await requireRole(["owner"]);
  const client = await createSupabaseServerClient();
  const { data: users, error } = await client.from("profiles").select("full_name,role,created_at").order("role").order("full_name");
  if (error) {
    console.error("Users list failed", error.code);
    return <section className="notice notice-error" role="alert"><h1>Users &amp; Permissions</h1><p>Daftar pengguna tidak dapat dimuat. Coba muat ulang atau hubungi administrator.</p></section>;
  }
  const managed=await client.rpc("list_app_users");const ready=!managed.error;
  if(managed.error&&!["PGRST202","42883"].includes(managed.error.code))return <p role="alert">User Management belum dapat dimuat. Coba muat ulang.</p>;
  const managedUsers=ready?(managed.data??[])as unknown as ManagedUser[]:[];
  const canCreate=ready&&Boolean(await createUserAdminClient());
  return <div className="page-stack module-workspace">
    <div className="page-heading"><div><p className="eyebrow">SETTINGS</p><h1>Users &amp; Permissions</h1><p className="muted-copy">Periksa pengguna dan akses aplikasi sesuai tugasnya.</p></div><Link className="secondary-button" href="/audit">Audit Log</Link></div>
    <WorkflowNotice message={await searchParams}/>{ready?<UserManagement users={managedUsers} currentUser={profile.id} canCreate={canCreate}/>:null}{!ready?<section className="section-card"><div className="section-heading"><h2>Users</h2></div><DataTable headers={["Name", "Role", "Created On"]} rows={(users ?? []).map(user => [user.full_name, roleLabels[user.role], new Date(user.created_at).toLocaleDateString("id-ID", {timeZone:"Asia/Jakarta"})])} /><p className="muted-copy">Halaman ini menampilkan akun yang sudah memiliki akses. {ready?"Gunakan Manage Users untuk memperbarui Name dan Role. Password pengguna tidak ditampilkan.":"Perubahan akses belum diaktifkan oleh administrator."}</p></section>:null}
    <section className="section-card"><div className="section-heading"><h2>Application Access</h2></div><DataTable headers={["Role", "Applications", "Returns", "Reporting", "Settings & Audit Log"]} rows={(Object.keys(roleLabels) as AppRole[]).map(role => [roleLabels[role], applicationAccess.filter(app => app.roles.includes(role)).map(app => app.name).join(", "), routeAccess["/returns"].some(allowed => allowed === role) ? "Diizinkan" : "Tidak diizinkan", ["finance","owner"].includes(role) ? "Diizinkan" : "Tidak diizinkan", role === "owner" ? "Diizinkan" : "Tidak diizinkan"])} /><p className="muted-copy">Akses aplikasi berbeda dari hak melakukan tindakan. Contoh: Warehouse dapat membaca Sales untuk pengiriman, tetapi tidak dapat membuat Sales Order atau mem-posting Customer Invoice.</p></section>
  </div>;
}
