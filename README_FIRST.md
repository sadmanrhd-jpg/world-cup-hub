# Fan26 Profile and Best XI Update

This package is prepared for the current `main` branch, where the Mini Game is already merged. The deleted Mini Game feature branch is not needed.

## What is automatic

- All 48 World Cup squad lists are fetched automatically from the public 2026 World Cup squad page.
- Tournament player statistics are fetched automatically from ESPN match summaries.
- Missing defensive or goalkeeper values can be corrected later in `api/player-stat-overrides.ts`.
- No service-role key, squad-import command, CSV import, cron job or GitHub secret is required.
- The Best XI builder still works for guests. Login is required only for cloud saving.

## What you must do

Only these external setup steps cannot be placed inside source files:

1. Create a free Supabase project.
2. Run the single SQL file at `supabase/setup.sql`.
3. Add two public Supabase environment variables to Vercel.
4. Enable Google login in Supabase if you want the Google button to work.

Continue with `QUICK_SETUP.md`.
