import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import type { AppRole } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getCurrentProfile = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(`Sesi pengguna tidak dapat diverifikasi: ${userError.message}`);
  }
  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Profil pengguna gagal dimuat: ${profileError.message}`);
  }

  return profile;
});

export async function requireRole(allowedRoles: AppRole[]) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  if (!allowedRoles.includes(profile.role)) {
    notFound();
  }
  return profile;
}
