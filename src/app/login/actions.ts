"use server";

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
