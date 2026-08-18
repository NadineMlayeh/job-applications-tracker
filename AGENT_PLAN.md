# AGENT BUILD PLAN — Job Tracker

You are picking up a scaffolded Next.js project. Read this whole file before
writing any code. It explains the product, what's already built, and exactly
what's left to do, in order.

## 1. Product context (read this first)

The user is job/PFE-hunting and applying to many positions via LinkedIn and
other sources. Tracking applications in a notepad became unmanageable. This
app is their personal application tracker. It must feel like a genuinely
polished, modern product — not a bare CRUD app. Think Linear/Notion-level
UI/UX polish: smooth transitions, thoughtful empty states, a command palette,
and a "magical" AI auto-fill moment that feels delightful, not gimmicky.

Two view modes matter equally: a dense **table view** (like a spreadsheet,
for scanning/filtering) and a **Kanban view** (columns = status, drag cards
between them). The user should be able to toggle between them.

Core entities:
- **Application**: one row per job/PFE application. Has fixed fields
  (company, position, link, date_applied, status) plus an open-ended
  `custom_fields` JSONB bucket (location, source, salary, tech_stack,
  experience_required, contact_person, interview_date, rejection_reason,
  follow_up_date, application_type, and anything the user adds themselves).
- **FieldDefinition**: per-user config describing which fields exist, their
  type (text/date/select/multiselect/url/number), whether they're visible
  (the user can "mask"/hide a field without deleting its data), and sort
  order. The table/form must render dynamically from this list — never
  hardcode which extra fields appear.
- **ApplicationDocument**: files attached to a specific application (CV
  version used, cover letter, a saved copy of a response email, etc.),
  stored in Supabase Storage, metadata in the `documents` table.

The signature AI feature: user pastes the raw text of a LinkedIn (or any)
job posting into a textarea. It's sent to `/api/extract` (already built,
calls Gemini free tier with a strict JSON schema) which returns structured
fields. The UI should show a tasteful loading state, then animate the
extracted values into the form fields, clearly distinguishing "AI-filled"
values from ones the user still needs to fill in — and the user must always
be able to review/edit before saving (never auto-save AI output silently).

Everything must run on free tiers only (Supabase free, Gemini free, Vercel
free). Don't introduce paid services.

## 2. What's already built — do not redo this

- Full Next.js + TypeScript + Tailwind config, dark-mode-by-default design
  system (CSS variables in `src/app/globals.css`, palette in
  `tailwind.config.ts`).
- `supabase/schema.sql` — complete schema: `applications`,
  `field_definitions`, `documents` tables, RLS policies scoped to
  `auth.uid()`, an `updated_at` trigger, and a `seed_default_fields(user_id)`
  Postgres function to run right after a user's first signup.
- `src/lib/types.ts` — all shared TypeScript types/interfaces. Use these
  everywhere; extend, don't duplicate.
- `src/lib/fields.ts` — `DEFAULT_FIELDS` array mirroring the seed function,
  for client-side fallback rendering.
- `src/lib/supabase/client.ts` and `server.ts` — Supabase client factories
  for browser and server contexts respectively. Use these, don't create new
  Supabase client instances elsewhere.
- `src/app/api/extract/route.ts` — working Gemini extraction endpoint.
  POST `{ text: string }` → returns `ExtractedJobFields`. Already uses
  `responseSchema` for guaranteed-shape JSON output. Reuse this endpoint
  as-is; don't rewrite the extraction logic unless you're fixing a bug.
- `src/components/StatusBadge.tsx`, `src/components/ui/Button.tsx` — sample
  components establishing the visual language (rounded-xl/2xl, subtle
  borders, hsl(var(--...)) colors, animate-fadeIn on row entry). Match this
  style in every new component you write.
- `src/app/page.tsx` — dashboard page with a table rendering **mock data**
  matching the real `Application` type shape. This is the visual anchor —
  replace the mock data with real Supabase queries, keep the layout/style
  direction.

## 3. Build phases — do these in order

### Phase 1 — Auth
- Add Supabase email/password (or magic link) auth: `/login`, `/signup`
  pages, a middleware (`src/middleware.ts`) that refreshes the Supabase
  session and protects all routes except `/login` and `/signup`.
- On first successful signup, call the `seed_default_fields(user_id)`
  Postgres function (via an RPC call) so the user's field_definitions are
  populated immediately.
- Add a minimal top-right user menu (avatar/email + sign out).

### Phase 2 — Real data wiring
- Replace `MOCK_APPLICATIONS` in `src/app/page.tsx` with a real fetch:
  Server Component fetch via `src/lib/supabase/server.ts`, or a
  TanStack Query hook if you want client-side caching/refetching after
  mutations (recommended — install `@tanstack/react-query`, it's already in
  `package.json`, just needs a `QueryClientProvider` in a client wrapper).
- Build `src/lib/queries/applications.ts` (or similar) with functions:
  `listApplications`, `getApplication`, `createApplication`,
  `updateApplication`, `deleteApplication`, `listFieldDefinitions`,
  `upsertFieldDefinition`, `listDocuments`, `uploadDocument`,
  `deleteDocument`. Keep Supabase calls out of components — centralize here.

### Phase 3 — Dynamic form (add/edit application)
- Build `ApplicationFormModal` (or a dedicated `/applications/new` page +
  `/applications/[id]/edit`): renders the fixed fields (company, position,
  link, date_applied, status) plus every visible `FieldDefinition` for the
  user, in `sort_order`, using the right input per `field_type`.
- Status field should be a nice select/segmented control using
  `STATUS_ORDER`/`STATUS_LABELS` from `src/lib/types.ts`.
- Saving writes fixed fields to their columns and everything else into
  `custom_fields` JSONB keyed by `field_key`.

### Phase 4 — AI paste-to-fill flow
- In the form modal, add a "Paste job post" mode: a textarea for raw text
  (this is the primary path — do NOT attempt to scrape LinkedIn URLs
  server-side, LinkedIn is heavily JS-rendered and will not work reliably
  without a paid scraping service; pasted text is the deliberate design).
- On submit, POST to `/api/extract`, show a shimmer/skeleton loading state
  on the fields being filled (see `.shimmer-bg` utility in globals.css already
  defined for this), then populate the form fields from the response with a
  subtle highlight (e.g. a temporary accent-colored ring) marking which
  fields were AI-filled, distinct from empty ones. User can edit anything
  before saving. Handle the `{ error }` response shape gracefully (extraction
  can fail — never block manual form filling).
- Map `ExtractedJobFields` → form fields: `company`→company, `position`→
  position, `location`/`remote_type` (combine into a readable location
  string or keep remote_type as a separate custom field — your call, keep it
  clean), `tech_stack`→custom field, `experience_required`→custom field,
  `salary_range`→salary custom field, `contact_person`→custom field,
  `source`→source custom field.

### Phase 5 — Field management UI
- Build a "Manage fields" panel/page: list all `field_definitions` for the
  user, toggle `is_visible` (mask/unmask — never deletes data, just hides
  the column/input), add a new custom field (key, label, type, options if
  select/multiselect), delete a custom field (only allow deleting
  `is_custom: true` fields, not built-ins — masking is the right move for
  built-ins the user doesn't want).
- Table view and form should both re-render based on current visible fields.

### Phase 6 — File attachments
- Create the Supabase Storage bucket `application-documents` (private) —
  either via SQL (uncomment the relevant block in `supabase/schema.sql`) or
  instruct the user to create it manually in the dashboard, then apply the
  storage policy scoping access to `auth.uid()` folder prefix.
- Per application row, a paperclip icon + count (already stubbed in
  `page.tsx`) opens a small panel: upload a file (drag/drop + click),
  tag it with `doc_type` (cv/cover_letter/response/other), list existing
  files with download links, delete a file.
- Store files under a path like `{user_id}/{application_id}/{filename}` in
  the bucket so the storage RLS policy (folder-prefix based) works.

### Phase 7 — Kanban view
- Add a view toggle (table ↔ kanban) in the dashboard header.
- Kanban: one column per `STATUS_ORDER` value, cards showing
  company/position/date, drag-and-drop between columns updates `status` via
  `updateApplication`. A lightweight DnD lib (`@dnd-kit/core`) is fine to add.

### Phase 8 — Polish pass
- Empty states (no applications yet → friendly illustration/CTA).
- Command palette (Cmd+K) for "Add application", "Paste job post", jump to
  company search — a simple custom implementation is fine, no need for a
  heavy library.
- Basic stats header (total applied, response rate, interviews this month) —
  compute client-side from fetched applications, no new tables needed.
- Loading skeletons matching the `.shimmer-bg` style already defined.
- Responsive pass — table view can horizontally scroll or collapse to cards
  on small screens.

### Phase 9 — Deployment
- Push to GitHub, connect repo to Vercel, add the same env vars from
  `.env.local` into Vercel's project settings (Environment Variables).
- Double check `SUPABASE_SERVICE_ROLE_KEY` (if you end up needing it for any
  server-only operation) is never exposed with the `NEXT_PUBLIC_` prefix.

## 4. Conventions to follow throughout

- Centralize Supabase calls in `src/lib/queries/*`, never call Supabase
  directly from a component.
- Use the existing color system (`hsl(var(--...))` tokens) — don't
  introduce raw hex colors.
- Reuse `Button`, `StatusBadge` and match their styling conventions
  (rounded-xl/2xl, border + subtle background, `animate-fadeIn` on new
  list items) for every new component.
- Every mutation (create/update/delete) should optimistically or at least
  promptly refetch/invalidate the relevant query so the UI feels instant.
- Never silently overwrite user-entered data with AI output — AI-filled
  values populate empty fields and are always editable before save.
- Keep the AI extraction endpoint's behavior (strict JSON schema, treats
  unclear info as null rather than guessing) — this is intentional to avoid
  hallucinated job details.
