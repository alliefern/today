import { NextResponse, type NextRequest } from "next/server";
import { seedIfNew } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

/** magic-link landing: swap the one-time code for a session, then go home */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  if (code) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      await seedIfNew(db);
      return NextResponse.redirect(`${origin}/`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
