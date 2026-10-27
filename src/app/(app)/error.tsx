"use client";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mt-6 space-y-3 p-6" role="alert">
      <h1 className="text-3xl font-extrabold">oops, that one's on me</h1>
      <p>something went wrong loading this page. nothing was lost.</p>
      <p className="rounded-xl bg-blush p-3 font-mono text-sm">{error.message.toLowerCase()}</p>
      <p className="text-sm text-ink-soft">
        if this is a brand new setup, the database migrations may not have been applied yet. the readme has the steps.
      </p>
      <button onClick={reset} className="btn-primary">
        try again
      </button>
    </div>
  );
}
