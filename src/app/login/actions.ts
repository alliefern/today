"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { seedIfNew } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { ownerEmail, supabaseEnv } from "@/lib/supabase/env";

export interface LoginState {
  step: "email" | "code";
  email?: string;
  message?: string;
  error?: string;
}

const NOT_YOU = "this app is just for one person, and that email isn't them.";

function guard(email: string): string | null {
  if (!supabaseEnv()) return "the database isn't connected yet. see the readme.";
  const owner = ownerEmail();
  if (!owner) return "OWNER_EMAIL isn't set, so nobody can sign in yet. see the readme.";
  if (email !== owner) return NOT_YOU;
  return null;
}

export async function sendLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return { step: "email", error: "type your email first" };
  const blocked = guard(email);
  if (blocked) return { step: "email", email, error: blocked };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");

  const db = await createClient();
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${proto}://${host}/auth/callback`, shouldCreateUser: true },
  });
  if (error) return { step: "email", email, error: error.message.toLowerCase() };
  return { step: "code", email, message: "check your inbox. tap the link, or type the 6-digit code here." };
}

export async function verifyCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const token = String(form.get("code") ?? "").replace(/\s+/g, "");
  const blocked = guard(email);
  if (blocked) return { step: "email", email, error: blocked };
  if (!/^\d{6,8}$/.test(token)) return { step: "code", email, error: "that should be the 6-digit code from the email" };

  const db = await createClient();
  const { error } = await db.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { step: "code", email, error: "that code didn't work. it may have expired, so ask for a fresh one." };
  await seedIfNew(db);
  redirect("/");
}
