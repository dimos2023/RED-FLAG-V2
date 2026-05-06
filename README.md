# Red-Flag

Professional fraud reporting UI: intro curtain, ToS-gated registration, individual/company verification flows, private evidence vault concept, gated search with paid evidence requests.

## Run locally

1. Install [Node.js](https://nodejs.org/) (includes `npm`).
2. In this folder:

```bash
npm install
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000).

Without Supabase env vars, the app runs in **demo mode** (local profile + simulated OTP `123456` for individuals).

## Supabase

1. **Env:** Create `.env.local` in the project root and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (JWT `eyJ…` from **Project Settings → API**), and `SUPABASE_SERVICE_ROLE_KEY` for `/api/search`. The browser client reads the public vars at build/runtime.

2. **Email / password:** In the Supabase dashboard go to **Authentication → Providers → Email**, enable **Email**, and configure **Confirm email** as you prefer. Add **Redirect URLs** under **Authentication → URL Configuration**, including `http://localhost:3000/auth/callback` (and your production URL). The app sends `emailRedirectTo` to `/auth/callback` after sign-up.

3. **Storage (fraud evidence):** In **SQL Editor**, run `supabase/migrations/20260504120000_fraud_evidence_bucket.sql`. That creates the private bucket **`fraud-evidence`** (PDF + images, 50 MB limit) and RLS so each user can only access objects under `{user_id}/...`. The app uploads national ID files there after individual verification.

4. **Tables (optional):** Use `supabase/schema.sql` as a starting point for `profiles`, `reports`, and `evidence_objects`.

5. **Admin review queue:** Run `supabase/migrations/20260505100000_admin_report_review.sql` then `20260505100500_reports_owner_update_pending.sql`. Add yourself as an admin (replace UUID) in the SQL editor:

```sql
insert into public.app_admins (user_id) values ('YOUR-AUTH-USER-ID')
on conflict (user_id) do nothing;
```

Then open **Admin → Report queue** at `/admin/requests` (link appears in the header when your user is in `app_admins`).

This repo includes **Next.js middleware** (`src/middleware.ts`) to refresh the Supabase session cookie on each request.

## Stack

Next.js 15 (App Router), Tailwind CSS v4, Framer Motion, Supabase client helpers.
