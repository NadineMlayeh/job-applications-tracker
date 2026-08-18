-- ============================================================
-- JOB TRACKER SCHEMA
-- Run this in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. APPLICATIONS TABLE
-- Fixed "always there" columns + a flexible JSONB bucket for
-- everything else (location, source/application method, salary, tech_stack, etc.)
-- so users can add custom fields without schema migrations.
-- ------------------------------------------------------------
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Fixed core fields
  company text not null,
  position text not null,
  link text,
  date_applied date default current_date,
  status text not null default 'wishlist',
  -- allowed statuses: wishlist, applied, oa_test, interview, offer, rejected, withdrawn

  -- Flexible bucket: { "location": "...", "remote_type": "Remote", "source": "LinkedIn",
  --   "cv_version": "v3", "salary": "...", "tech_stack": [...],
  --   "experience_required": "...", "contact_person": "...",
  --   "interview_date": "...", "rejection_reason": "...",
  --   "follow_up_date": "...", "type": "job" | "pfe" }
  custom_fields jsonb not null default '{}'::jsonb,

  -- Raw text the user pasted (job post), kept for reference / re-extraction
  source_text text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_applications_user_id on applications(user_id);
create index if not exists idx_applications_status on applications(status);
create index if not exists idx_applications_custom_fields on applications using gin (custom_fields);

-- ------------------------------------------------------------
-- 2. FIELD DEFINITIONS TABLE
-- Per-user config of which fields exist, their type, order,
-- and visibility (mask/unmask). Powers the dynamic form/table.
-- ------------------------------------------------------------
create table if not exists field_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field_key text not null,        -- e.g. "location", "tech_stack"
  label text not null,            -- e.g. "Location"
  field_type text not null default 'text', -- text | date | select | multiselect | url | number
  options jsonb default '[]'::jsonb,       -- for select/multiselect
  is_visible boolean not null default true,
  is_custom boolean not null default false, -- false = built-in default field
  sort_order int not null default 0,
  created_at timestamptz not null default now(),

  unique (user_id, field_key)
);

-- ------------------------------------------------------------
-- 3. DOCUMENTS TABLE
-- Files attached per application (CV version, cover letter,
-- follow-up email, etc.) — actual files live in Supabase Storage,
-- this table just tracks metadata.
-- ------------------------------------------------------------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,   -- path inside the storage bucket
  doc_type text not null default 'other', -- cv | cover_letter | response | other
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_documents_application_id on documents(application_id);

-- ------------------------------------------------------------
-- 4. updated_at auto-touch trigger
-- ------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_applications_updated_at on applications;
create trigger trg_applications_updated_at
before update on applications
for each row execute procedure touch_updated_at();

-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- Each user only ever sees/edits their own rows.
-- ------------------------------------------------------------
alter table applications enable row level security;
alter table field_definitions enable row level security;
alter table documents enable row level security;

create policy "applications_select_own" on applications
  for select using (auth.uid() = user_id);
create policy "applications_insert_own" on applications
  for insert with check (auth.uid() = user_id);
create policy "applications_update_own" on applications
  for update using (auth.uid() = user_id);
create policy "applications_delete_own" on applications
  for delete using (auth.uid() = user_id);

create policy "field_definitions_all_own" on field_definitions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "documents_all_own" on documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. STORAGE BUCKET for attached files (create via dashboard too:
-- Storage > New bucket > "application-documents", private)
-- This just sets the policy once the bucket exists.
-- ------------------------------------------------------------
-- insert into storage.buckets (id, name, public) values ('application-documents', 'application-documents', false)
-- on conflict (id) do nothing;

-- create policy "documents_storage_own"
-- on storage.objects for all using (
--   bucket_id = 'application-documents' and auth.uid()::text = (storage.foldername(name))[1]
-- );

-- ------------------------------------------------------------
-- 7. SEED default field definitions for a new user
-- Call this (or replicate in app code) right after signup.
-- ------------------------------------------------------------
create or replace function seed_default_fields(p_user_id uuid)
returns void as $$
begin
  insert into field_definitions (user_id, field_key, label, field_type, options, is_visible, is_custom, sort_order)
  values
    (p_user_id, 'location', 'Location', 'text', '[]'::jsonb, true, false, 1),
    (p_user_id, 'remote_type', 'Type', 'select', '["Remote", "Hybrid", "Onsite"]'::jsonb, true, false, 2),
    (p_user_id, 'source', 'Application method', 'select', '["LinkedIn", "Company Website", "Referral", "Indeed", "Other"]'::jsonb, true, false, 3),
    (p_user_id, 'cv_version', 'CV Version', 'text', '[]'::jsonb, true, false, 4),
    (p_user_id, 'salary', 'Salary', 'text', '[]'::jsonb, true, false, 5),
    (p_user_id, 'tech_stack', 'Tech Stack', 'multiselect', '[]'::jsonb, true, false, 6),
    (p_user_id, 'experience_required', 'Experience Required', 'text', '[]'::jsonb, true, false, 7),
    (p_user_id, 'contact_person', 'Contact Person', 'text', '[]'::jsonb, true, false, 8),
    (p_user_id, 'interview_date', 'Interview Date', 'date', '[]'::jsonb, true, false, 9),
    (p_user_id, 'rejection_reason', 'Rejection Reason', 'text', '[]'::jsonb, true, false, 10),
    (p_user_id, 'follow_up_date', 'Follow-up Date', 'date', '[]'::jsonb, true, false, 11),
    (p_user_id, 'application_type', 'Application', 'select', '["Job", "PFE / Internship"]'::jsonb, true, false, 12)
  on conflict (user_id, field_key) do nothing;
end;
$$ language plpgsql security definer;
