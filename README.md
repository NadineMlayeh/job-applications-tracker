# Job Tracker — AI-assisted application tracker

Track every job and PFE (internship) application in one place, with AI-powered
auto-fill from pasted job postings, fully custom fields, and per-application
file attachments.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Auth + Storage) — free tier
- Gemini API (`gemini-2.0-flash`) for AI field extraction — free tier
- Deploys to Vercel — free tier

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys, see below
npm run dev
```

## Getting your free API keys (do this before running)

1. **Supabase** — https://supabase.com → New project (free tier) →
   Settings → API → copy `Project URL` and `anon public` key into
   `.env.local`. Then open the SQL Editor and run `supabase/schema.sql`.
2. **Gemini** — https://aistudio.google.com/apikey → Create API key →
   paste into `GEMINI_API_KEY` in `.env.local`.
3. (Optional fallback) **Groq** — https://console.groq.com/keys → free key
   for a Llama-based fallback if you ever want model redundancy.

## Folder structure

```
src/
  app/
    page.tsx              — dashboard table view (scaffolded)
    api/extract/route.ts  — AI extraction endpoint (working)
  components/              — UI components
  lib/
    types.ts               — shared TypeScript types
    fields.ts               — default field definitions
    supabase/               — client + server Supabase instances
supabase/
  schema.sql               — full DB schema, run this in Supabase SQL editor
AGENT_PLAN.md               — hand this to your AI agent to finish the build
```
