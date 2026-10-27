/** the publishable key is the new name for the anon key; either works */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export function ownerEmail(): string | null {
  const e = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return e || null;
}
