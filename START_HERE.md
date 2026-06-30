# Start Here

The deleted Mini Game branch is not needed. Its changes are already in `main`.

You do not need to run a squad importer, edit a CSV, create a service key, configure a cron job, or add GitHub Actions secrets.

## Do only these steps

### 1. Create one new branch

Create this branch from the latest `main`:

```text
profiles_best_xi
```

### 2. Upload the package

Extract the ZIP and copy every file and folder inside `world_cup_hub_profiles_best_xi_easy_update` into the repository root.

Keep the included folder paths. Replace files when GitHub reports duplicates.

Use this commit message:

```text
Add profiles, cloud saves and Best XI builder
```

### 3. Create Supabase

Create a Supabase project, open SQL Editor, paste the complete contents of:

```text
supabase/setup.sql
```

Press **Run** once.

### 4. Add two Vercel variables

Copy the Project URL and public anon key from Supabase Project Settings > API.

Add them in Vercel Project Settings > Environment Variables as:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Apply them to Preview and Production, then redeploy.

### 5. Test email login

Open:

```text
/profile
```

Email and password login now works. Google login is optional and requires the short external setup in `GOOGLE_LOGIN.md`.

## Automatic parts

Opening `/best-xi` automatically requests all World Cup squad players and managers. Tournament statistics are requested automatically and merged into player choices when the feed supplies them.

No additional data command is required.
