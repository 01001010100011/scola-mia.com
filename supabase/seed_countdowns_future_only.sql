-- Set only requested FUTURE countdowns (as of 2026-02-22)
-- No "end of event" rows, only start dates.
-- Featured main countdown = Fine della scuola (2026-06-08).

-- 1) Reset featured flag on all existing rows
update public.countdowns
set is_featured = false,
    updated_at = now();

-- 2) Remove countdowns not in the requested future list
-- (keeps DB clean and aligned with requested calendar)
delete from public.countdowns
where slug not in (
  'vacanze-pasqua-2026',
  'festa-lavoro-2026',
  'primo-giugno-2026',
  'festa-repubblica-2026',
  'termine-lezioni'
);

-- 3) Upsert requested future events only
insert into public.countdowns (slug, title, target_at, is_featured, active)
values
  ('vacanze-pasqua-2026',   'Vacanze di Pasqua',       '2026-04-02T00:00:00+02:00', false, true),
  ('festa-lavoro-2026',     'Festa del Lavoro',        '2026-05-01T00:00:00+02:00', false, true),
  ('primo-giugno-2026',     '1 giugno',                '2026-06-01T00:00:00+02:00', false, true),
  ('festa-repubblica-2026', 'Festa della Repubblica',  '2026-06-02T00:00:00+02:00', false, true),
  ('termine-lezioni',       'Fine della scuola',       '2026-06-08T00:00:00+02:00', true,  true)
on conflict (slug) do update
set title = excluded.title,
    target_at = excluded.target_at,
    is_featured = excluded.is_featured,
    active = excluded.active,
    updated_at = now();

-- 4) Safety: enforce single featured
with featured_rows as (
  select id,
         row_number() over (order by target_at asc, created_at asc) as rn
  from public.countdowns
  where is_featured = true and active = true
)
update public.countdowns c
set is_featured = false,
    updated_at = now()
from featured_rows f
where c.id = f.id
  and f.rn > 1;
