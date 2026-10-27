export function SetupNotice() {
  return (
    <div role="status" className="space-y-3">
      <h2 className="text-2xl font-bold">almost there</h2>
      <p>
        the app is running, but it isn't connected to a database yet. add these environment variables, then redeploy:
      </p>
      <ul className="list-inside list-disc space-y-1 font-mono text-sm">
        <li>NEXT_PUBLIC_SUPABASE_URL</li>
        <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
        <li>OWNER_EMAIL</li>
      </ul>
      <p className="text-sm text-ink-soft">the readme walks through it in about five minutes.</p>
    </div>
  );
}
