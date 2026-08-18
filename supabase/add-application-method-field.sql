-- Run this once for existing users/projects.
-- It makes "Application method" a built-in field backed by field_key = "source",
-- so existing values such as LinkedIn keep working.

insert into field_definitions (
  user_id,
  field_key,
  label,
  field_type,
  options,
  is_visible,
  is_custom,
  sort_order
)
select
  id,
  'source',
  'Application method',
  'select',
  '["LinkedIn", "Company Website", "Referral", "Indeed", "Other"]'::jsonb,
  true,
  false,
  3
from auth.users
on conflict (user_id, field_key) do update
set
  label = excluded.label,
  field_type = excluded.field_type,
  options = excluded.options,
  is_visible = true,
  is_custom = false,
  sort_order = excluded.sort_order;
