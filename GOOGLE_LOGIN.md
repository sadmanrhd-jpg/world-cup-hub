# Google Login Setup

Google requires its own Client ID and Client Secret. These values cannot be safely generated or included in source code.

## Google Cloud

1. Open Google Cloud Console.
2. Create or select a project.
3. Open **APIs & Services > OAuth consent screen** and complete the basic app details.
4. Open **Credentials > Create credentials > OAuth client ID**.
5. Choose **Web application**.
6. Add your deployed website under **Authorized JavaScript origins**.
7. Add this Supabase callback under **Authorized redirect URIs**:

```text
https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
```

8. Copy the Client ID and Client Secret.

## Supabase

1. Open **Authentication > Providers > Google**.
2. Enable Google.
3. Paste the Client ID and Client Secret.
4. Save.
5. Open **Authentication > URL Configuration**.
6. Set the Site URL to your production Vercel URL.
7. Add your Vercel Preview URL pattern or exact Preview URL to Redirect URLs while testing.

No source-code change is required afterward.
