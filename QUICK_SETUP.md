# Quick Setup

## 1. Create a clean branch

The Mini Game branch can stay deleted because its changes are already in `main`.

On GitHub:

1. Open the repository.
2. Switch to `main`.
3. Confirm the Mini Game exists on the deployed site.
4. Create a branch named:

```text
profiles_best_xi
```

## 2. Upload the package

Extract this ZIP. Upload every file and folder inside it into the repository root while keeping the same paths.

When GitHub asks about duplicate files, replace the existing versions.

Use one commit message:

```text
Add user profiles and World Cup Best XI builder
```

## 3. Install the new dependencies

If you work locally, run:

```bash
npm install
```

If you only use GitHub and Vercel, commit `package.json`. Vercel installs the dependencies during deployment.

## 4. Create Supabase

1. Create a free project at Supabase.
2. Open **SQL Editor**.
3. Open `supabase/setup.sql` from this package.
4. Copy the entire file into SQL Editor.
5. Press **Run** once.

That one file creates every required table, trigger, function and security policy.

## 5. Add only two Vercel variables

In Supabase, open **Project Settings > API** and copy:

- Project URL
- Public anon key

In Vercel, open **Project > Settings > Environment Variables** and add:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Add them to Preview and Production, then redeploy.

Do not add a service-role key. This package does not need one.

## 6. Enable email login

In Supabase, open **Authentication > Providers > Email** and keep Email enabled.

For the easiest testing, you may temporarily turn off email confirmation under Authentication settings. Turn it back on before public launch if you want verified email accounts.

## 7. Enable Google login

Open `GOOGLE_LOGIN.md` and follow its short setup. Email/password login works even before Google is enabled.

## 8. Test these pages

```text
/profile
/best-xi
/prediction
/mini-game
```

The squad database and player stats require no import step. They are loaded automatically when the Best XI page opens.
