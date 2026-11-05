export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function hasPartialSupabaseConfig(): boolean {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return hasUrl !== hasKey;
}

export function isDemoMode(): boolean {
  return process.env.NODE_ENV !== "production" &&
    !hasSupabaseConfig() &&
    !hasPartialSupabaseConfig();
}
