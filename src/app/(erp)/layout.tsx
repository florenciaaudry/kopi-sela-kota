import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/runtime-mode";
import { signOutAction } from "./actions";
import { WorkspaceShell } from "./workspace-shell";

export const dynamic = "force-dynamic";

export default async function ErpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (isDemoMode()) return <WorkspaceShell fullName="Pengguna Demo" role="owner" demo>{children}</WorkspaceShell>;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <main className="full-page-message">
        <h1>Profil tidak dapat dimuat</h1>
        <p role="alert">{profileError.message}</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="full-page-message">
        <h1>Akses belum diberikan</h1>
        <p>
          Akun berhasil masuk, tetapi belum memiliki role aplikasi. Minta
          administrator menetapkan role melalui Supabase.
        </p>
        <form action={signOutAction}>
          <button className="secondary-button" type="submit">
            Keluar
          </button>
        </form>
      </main>
    );
  }

  return <WorkspaceShell fullName={profile.full_name} role={profile.role as AppRole}>{children}</WorkspaceShell>;
}
