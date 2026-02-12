# Voice-First Workout Logging (MVP)

Minimal workout logging app built with:

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres)

## Features

- `/members`: list members + add member
- `/sessions/new`: create a session, select member, plan **5-8** exercises with typeahead
- `/sessions/[id]`: run the session and tap **Record result** per exercise (voice first with manual fallback)
- `/history`: browse past sessions and inspect details

## Data Model

- `members(id, name)`
- `exercises(id, name, is_custom, created_at)`
- `sessions(id, member_id, date, notes)`
- `session_planned_exercises(id, session_id, exercise_id, order_index)`
- `set_results(id, session_id, exercise_id, set_number, reps, weight, unit)`

Migration is in:

`supabase/migrations/20260212000000_voice_first_workout_logging.sql`

## Local Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create environment file**

   ```bash
   cp .env.example .env.local
   ```

   Fill in:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Create DB schema in Supabase**

   Use one of:

   - Supabase SQL Editor (paste migration SQL and run), or
   - Supabase CLI migration flow.

4. **Enable Auth**

   In Supabase dashboard:

   - Go to **Authentication → Providers → Email**
   - Enable Email provider (OTP / magic link)

5. **Run app**

   ```bash
   npm run dev
   ```

6. Open:

   - `http://localhost:3000/auth` to sign in
   - then use `/members`, `/sessions/new`, `/history`

## Notes

- Voice input uses the browser Speech Recognition API when available.
- If voice capture is unavailable, recording falls back to manual prompts.
