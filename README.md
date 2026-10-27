# today

one calm checklist for today, built from your recurring routines. no times, no time blocks, no backlog.

next.js (app router) + typescript + tailwind · supabase (magic-link auth, postgres, row-level security on every table) · installable pwa · deploys to vercel.

## how it works

- **projects** have a name, color, emoji, optional link and optional helper (the assistant who handles it).
- **routines** belong to a project and repeat: every day, certain weekdays, once a week, once a month, or "someday / bonus".
- **today** is built the first time you open each day: every routine due today, plus one-offs you added for that date, plus any pinned task that isn't ticked yet. bonus items sit at the bottom and never count as unfinished.
- **from yesterday?** is a small closed tray, never mixed into today. it only offers the most recent day that left something unfinished (within a week); anything older quietly lapses. settings: ask (tray), auto (carry along), or never.
- **pinned tasks** ("until done") show every day until you tick them. fiona's website is seeded this way.
- **snooze** moves an item to tomorrow, **★** moves it to bonus. both have an undo.
- the **lookahead** widget tracks how far ahead the gwd drops are scheduled: mint at a month+, lilac at 3+ weeks, pink under 3 weeks, deeper red under a week (kind wording throughout).

keyboard (desktop): `n` new task · `space` check · `t` tomorrow · `b` bonus · `x` remove · `j`/`k` or arrows to move.

## setup

1. **create a supabase project.** in the sql editor (or `supabase db push`), apply `supabase/migrations/*.sql` in order.
2. **auth settings** (authentication → sign in / providers): turn **off** "allow new users to sign up" once you've signed in once (this is a one-person app; the app also refuses any email except `OWNER_EMAIL`).
   - url configuration → add your site url and your vercel preview pattern (e.g. `https://*-your-team.vercel.app/**`) and `http://localhost:3000/**` to the redirect allow-list.
   - email templates → magic link: add `{{ .Token }}` to the body (e.g. "or type this code: {{ .Token }}"). this lets you sign in from the installed phone app without leaving it (see below).
3. **env vars** (copy `.env.example` to `.env.local`, and add the same in vercel → settings → environment variables):

   | var | what |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | project url |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable (anon) key |
   | `OWNER_EMAIL` | the one email allowed to sign in |
   | `OWNER_NAME` | optional, for the greeting (default `allie`) |
   | `SUPABASE_SERVICE_ROLE_KEY` | server-only. needed for `npm run seed` and the assistant api, not for the app itself |
   | `TASKS_API_TOKEN` | server-only, 24+ random characters, for the assistant api (`openssl rand -hex 32`) |

   the app runs on the publishable key + row-level security. if the env vars are missing it shows a "connect a database" page instead of crashing.
4. **sign in once.** your account is seeded on first sign-in with the day-one projects, routines and one-offs (`src/seed/data.ts`).

## run locally

```bash
npm install
cp .env.example .env.local   # fill it in
npm run dev                  # http://localhost:3000
npm test                     # unit tests + migration/rls tests (in-process postgres)
npm run typecheck
npm run seed                 # optional: seed/reset an account (see scripts/seed.ts, --force to add anyway)
```

## add a routine

projects → tap a project → **add a routine** → pick how often. it appears on today's list straight away if it's due today, and on the right days from then on. pause, edit or remove it from the same page. to change the day-one seed for new accounts, edit `src/seed/data.ts`.

## put it on your phone

iphone: safari → share → add to home screen. android: chrome → install app. **tip:** a magic link opened from your mail app signs in *safari*, not the installed app (they don't share storage). use the 6-digit code from the same email and you stay inside the app.

## assistant api

an assistant can add a one-off task with a bearer token:

```bash
curl -X POST https://<your-app>/api/tasks \
  -H "Authorization: Bearer $TASKS_API_TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"approve the tuesday post","project":"Kate Francis socials"}'
```

body: `title` (required), `project` (name or id), `date` (`yyyy-mm-dd`, default today), `bonus` (bool). the token is compared in constant time, never logged or echoed, and the endpoint refuses to run if it's unset or shorter than 24 characters. unknown project names return the list of valid ones.

## design

palette: cream (#fff6f1) page, deep plum (#3a0f36) for ink and dark surfaces, raspberry (#b8135f) for actions, with candy pink, mint, lilac and butter as soft supporting colors; every project gets its own color, shown as a tint. headings are bricolage grotesque (chunky, a little cheeky, and the heading font already chosen for alliefern.com) and body text is dm sans (friendly and very readable on a phone), both self-hosted. all contrast pairs are checked with `node scripts/contrast.mjs` (wcag aa). two-tone focus rings show on both light and dark surfaces, and nothing depends on hover.

## assumptions and todos

see `ASSUMPTIONS.md`.
