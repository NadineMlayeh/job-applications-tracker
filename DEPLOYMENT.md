# Deploy Job Tracker For Free

This app deploys cleanly on the free tiers:

- Vercel: hosts the Next.js app, server components, middleware, and `/api/extract`
- Supabase: Postgres Auth, database, and private file storage
- Google AI Studio: Gemini API key for extraction

## 1. Prepare Supabase

You already created the project, ran `supabase/schema.sql`, created the private
`application-documents` bucket, and added local `.env.local`.

Before production, also run these SQL files in Supabase SQL Editor if you have
not already:

```sql
-- Copy/paste the contents of these files, not the file names:
supabase/storage-policies.sql
supabase/add-remote-type-field.sql
supabase/add-application-method-field.sql
```

## 2. Push To GitHub

This folder is not currently a git repository. From `job-tracker`:

```bash
git init
git add .
git commit -m "Initial job tracker deployment"
```

Create an empty GitHub repo, then connect it:

```bash
git remote add origin https://github.com/YOUR_USERNAME/job-tracker.git
git branch -M main
git push -u origin main
```

## 3. Import In Vercel

In Vercel:

1. Add New Project
2. Import the GitHub `job-tracker` repo
3. Framework Preset: Next.js
4. Root Directory: leave as project root
5. Build Command: `npm run build`
6. Install Command: `npm ci`
7. Output Directory: leave empty/default

Vercel does not need a Dockerfile for this app. It detects Next.js and runs the
Next build directly.

## 4. Add Vercel Environment Variables

Project Settings > Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.6-flash
```

Add them to Production, Preview, and Development if you want every Vercel
deployment type to work.

Never add `SUPABASE_SERVICE_ROLE_KEY` unless you introduce a server-only feature
that truly needs it.

## 5. Configure Supabase Auth URLs

After the first Vercel deploy, copy your production URL, for example:

```text
https://job-tracker-yourname.vercel.app
```

In Supabase Dashboard > Authentication > URL Configuration:

- Site URL: your production Vercel URL
- Redirect URLs:
  - `http://localhost:3000/**`
  - `https://job-tracker-yourname.vercel.app/**`
  - optionally, Vercel previews: `https://*-YOUR_VERCEL_SLUG.vercel.app/**`

## 6. Redeploy

After environment variables or Supabase URL settings change, redeploy from
Vercel. Environment variable changes only affect new deployments.

## 7. Smoke Test

On the production URL:

1. Sign up or sign in
2. Add an application manually
3. Paste a job post and run AI extraction
4. Upload a file to an application
5. Switch table/Kanban views
