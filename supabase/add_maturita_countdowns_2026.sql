-- Add Maturita 2026 countdowns (manual emoji, colored books).
-- Run in Supabase SQL Editor.
-- Note: the oral exam date is estimated (22 June 2026 08:30) and can be updated later from Admin.

insert into public.countdowns (slug, title, emoji, target_at, is_featured, active)
values
  ('maturita-prima-prova-2026',        'Prima prova scritta (Italiano)',           '📘', '2026-06-18T08:30:00+02:00', false, true),
  ('maturita-seconda-prova-2026',      'Seconda prova scritta (indirizzo)',         '📗', '2026-06-19T08:30:00+02:00', false, true),
  ('maturita-suppletiva-scritti-2026', 'Suppletiva (scritti)',                      '📙', '2026-07-01T08:30:00+02:00', false, true),
  ('maturita-orali-2026',              'Orali (tutti gli indirizzi) - stima inizio','📕', '2026-06-22T08:30:00+02:00', false, true)
on conflict (slug) do update
set title = excluded.title,
    emoji = excluded.emoji,
    target_at = excluded.target_at,
    active = excluded.active,
    updated_at = now();
