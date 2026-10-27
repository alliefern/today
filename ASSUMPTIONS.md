# assumptions and todos

## assumed
- **carry-over default is "ask"**, week starts on **monday**, time zone **Europe/London** (changeable in settings).
- **"today" flips at midnight in your time zone.** there are no times anywhere in the app. the "9am" in the seeded routine is your own wording, left as written.
- **fiona's website** is seeded as a pinned one-off in its own project ("Fiona's website", 🌷): shows every day from the day it was seeded until you tick it. ticking it counts for the day you ticked it.
- **helpers**: threadbot (Threads) and KF Manager (Kate Francis socials) come from your brief. "blog assistant" on the alliefern.com blog is from the routine wording. coffee & claude has none; add one on its project page.
- **project placement**: "post the teaser for Monday's premium drop" lives under GWD weekly premium drops; the nov 1 batch and the sunday scheduling routine live under GWD daily prompt drops. "Girls Who Design promo" has no routines yet.
- **weekly = one weekday**; "certain days" = several. monthly on the 31st lands on the last day of shorter months.
- bonus routines show on the bonus list every day; completing one only counts for that day.
- single light theme (no dark mode).
- unfinished items older than a week lapse quietly from the tray (they stay in the database).
- accounts are single-user by convention: the app only sends a magic link to `OWNER_EMAIL`. also disable sign-ups in supabase so nobody can create a second account with the public key (they'd only ever see their own empty data, but still).

## todo / not built
- **3pm uk email or push digest**: not built. vercel cron runs in utc, so it needs two schedules plus a guard for daylight saving. a pure "render today as text" function is the natural seam.
- **google calendar export** (one all-day event per day): not built.
- **editing an existing one-off task's wording**: not built (you can remove and re-add; routines are editable).
- **reordering projects/routines**: order is creation order.
- **the assistant api has no rate limit** (the token is the only gate).
- **end-to-end tests were run against a stand-in backend** (real postgres via pglite plus a small supabase-shaped http shim), not real supabase/postgrest, because the sandbox couldn't run either. first run against real supabase may surface small differences. the migrations and rls policies themselves are tested against real postgres.
- **icons** are generated from `public/icons/icon.svg` with `scripts/make-icons.mjs` (needs playwright installed separately).
