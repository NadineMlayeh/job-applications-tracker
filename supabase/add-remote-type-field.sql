-- Run this once for existing users/projects that were created before the
-- built-in "Type" field existed.

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
  'remote_type',
  'Type',
  'select',
  '["Remote", "Hybrid", "Onsite"]'::jsonb,
  true,
  false,
  2
from auth.users
on conflict (user_id, field_key) do update
set
  label = excluded.label,
  field_type = excluded.field_type,
  options = excluded.options,
  is_visible = true,
  is_custom = false,
  sort_order = excluded.sort_order;
