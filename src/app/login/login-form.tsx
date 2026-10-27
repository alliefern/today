"use client";

import { useActionState } from "react";
import { sendLink, verifyCode, type LoginState } from "./actions";

const initial: LoginState = { step: "email" };

export function LoginForm({ linkError }: { linkError?: string }) {
  const [sent, sendAction, sending] = useActionState(sendLink, initial);
  const [checked, verifyAction, verifying] = useActionState(verifyCode, initial);
  const email = sent.email ?? "";

  if (sent.step === "code") {
    return (
      <form action={verifyAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <p role="status" className="text-base">
          {sent.message}
        </p>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">6-digit code</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={10}
            required
            className="field text-center text-2xl tracking-[0.4em]"
          />
        </label>
        {checked.error && (
          <p role="alert" className="text-sm font-semibold text-berry">
            {checked.error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={verifying}>
          {verifying ? "checking…" : "let me in"}
        </button>
        <p className="text-sm text-ink-soft">
          the link in the email works too. if you installed this on your phone, the code keeps you inside the app.
        </p>
      </form>
    );
  }

  return (
    <form action={sendAction} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">your email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={sent.email}
          placeholder="you@example.com"
          className="field"
        />
      </label>
      {(sent.error || linkError) && (
        <p role="alert" className="text-sm font-semibold text-berry">
          {sent.error ?? linkError}
        </p>
      )}
      <button className="btn-primary w-full" disabled={sending}>
        {sending ? "sending…" : "send me a magic link"}
      </button>
    </form>
  );
}
