"use server";

import { readLocalTestAccounts } from "@/lib/local-test-accounts";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignInState = {
  error?: string;
};

export async function signInAction(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue.trim() : "";
  const password =
    typeof passwordValue === "string" ? passwordValue : "";

  if (!email || !email.includes("@") || !password) {
    return { error: "Masukkan email dan password yang valid." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email atau password tidak cocok. Silakan coba lagi." };
  }

  redirect("/");
}


export async function signInTestAccountAction(_previous: SignInState, form: FormData): Promise<SignInState> {
  const accounts = await readLocalTestAccounts(true);
  const account = accounts.find(item => item.role === form.get("role"));
  if (!account) return { error: "Login akun uji hanya tersedia pada preview lokal yang telah disiapkan." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: account.email, password: account.password });
  if (error) return { error: "Akun uji belum dapat masuk. Gunakan login biasa atau periksa akun uji." };
  const profile = await supabase.from("profiles").select("id,role").eq("id", data.user.id).single();
  if (profile.error || profile.data?.role !== account.role || profile.data.id !== account.id) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Profil akun uji tidak sesuai. Hubungi administrator." };
  }
  redirect("/");
}
