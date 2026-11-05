"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(`Tidak dapat mengakhiri sesi: ${error.message}`);
  }
  redirect("/login");
}
