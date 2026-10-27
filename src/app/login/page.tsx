import { LoginForm } from "./login-form";
import { SetupNotice } from "@/components/setup-notice";
import { supabaseEnv } from "@/lib/supabase/env";

export const metadata = { title: "sign in · today" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="page flex min-h-dvh flex-col justify-center py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid size-20 place-items-center rounded-[1.75rem] bg-plum text-4xl" aria-hidden>
          🌸
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight">today</h1>
        <p className="mt-2 text-lg text-ink-soft">one calm list. that's the whole app.</p>
      </div>
      <div className="card p-6">
        {supabaseEnv() ? (
          <LoginForm linkError={error ? "that link didn't work. it may have expired, so ask for a new one." : undefined} />
        ) : (
          <SetupNotice />
        )}
      </div>
    </main>
  );
}
